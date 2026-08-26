import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * Interface unificada e amigável para manipulação de SQLite via sql.js (WebAssembly)
 */
export interface PreparedStatement<T = any> {
  all(...params: any[]): T[];
  get(...params: any[]): T | null;
  run(params?: Record<string, any> | any[]): { changes: number; lastInsertRowid: number };
}

export class AppDatabase {
  private db: SqlJsDatabase;
  private dbPath?: string;

  constructor(db: SqlJsDatabase, dbPath?: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  public getRawDb(): SqlJsDatabase {
    return this.db;
  }

  public exec(sql: string): void {
    this.db.exec(sql);
    this.persist();
  }

  public prepare<T = any>(sql: string): PreparedStatement<T> {
    const db = this.db;
    const persist = this.persist.bind(this);

    return {
      all: (...params: any[]): T[] => {
        const stmt = db.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params);
          }
          const results: T[] = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject() as T);
          }
          return results;
        } finally {
          stmt.free();
        }
      },

      get: (...params: any[]): T | null => {
        const stmt = db.prepare(sql);
        try {
          if (params.length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            return stmt.getAsObject() as T;
          }
          return null;
        } finally {
          stmt.free();
        }
      },

      run: (params?: Record<string, any> | any[]): { changes: number; lastInsertRowid: number } => {
        const stmt = db.prepare(sql);
        try {
          if (params) {
            if (Array.isArray(params)) {
              stmt.bind(params);
            } else {
              // Converte objeto com @key ou key para bind do sql.js
              const boundParams: Record<string, any> = {};
              for (const [key, val] of Object.entries(params)) {
                const paramKey = key.startsWith('@') || key.startsWith(':') || key.startsWith('$') ? key : `@${key}`;
                boundParams[paramKey] = val;
              }
              stmt.bind(boundParams);
            }
          }
          stmt.step();
          const changes = db.getRowsModified();
          // Obtém o last_insert_rowid()
          const rowIdResult = db.exec('SELECT last_insert_rowid() as id');
          const lastInsertRowid =
            rowIdResult.length > 0 && rowIdResult[0].values.length > 0
              ? Number(rowIdResult[0].values[0][0])
              : 0;

          persist();
          return { changes, lastInsertRowid };
        } finally {
          stmt.free();
        }
      },
    };
  }

  public transaction<R>(fn: () => R): R {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      this.persist();
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  public persist(): void {
    if (this.dbPath && this.dbPath !== ':memory:') {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  public close(): void {
    this.persist();
    this.db.close();
  }
}

export class DatabaseConnection {
  private static instance: AppDatabase | null = null;
  private static SQL: any = null;

  public static async getSqlEngine(): Promise<any> {
    if (!DatabaseConnection.SQL) {
      DatabaseConnection.SQL = await initSqlJs();
    }
    return DatabaseConnection.SQL;
  }

  public static async getInstance(customPath?: string): Promise<AppDatabase> {
    if (!DatabaseConnection.instance) {
      const SQL = await DatabaseConnection.getSqlEngine();
      const dbPath = customPath || config.databasePath;

      let db: SqlJsDatabase;
      if (dbPath !== ':memory:' && fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }

      const appDb = new AppDatabase(db, dbPath);

      // Carrega e executa schema
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        appDb.exec(schema);
      }

      DatabaseConnection.instance = appDb;
    }

    return DatabaseConnection.instance;
  }

  public static async createInMemory(): Promise<AppDatabase> {
    const SQL = await DatabaseConnection.getSqlEngine();
    const db = new SQL.Database();
    const appDb = new AppDatabase(db, ':memory:');

    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      appDb.exec(schema);
    }

    return appDb;
  }

  public static close(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.close();
      DatabaseConnection.instance = null;
    }
  }
}
