import { AppDatabase } from '../db/connection';
import { Asset } from '../types';

export class AssetRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  public findAll(): Asset[] {
    const stmt = this.db.prepare<Asset>(`
      SELECT ticker, name, sector, created_at, updated_at
      FROM assets
      ORDER BY ticker ASC
    `);
    return stmt.all();
  }

  public findByTicker(ticker: string): Asset | null {
    const stmt = this.db.prepare<Asset>(`
      SELECT ticker, name, sector, created_at, updated_at
      FROM assets
      WHERE ticker = ?
    `);
    return stmt.get(ticker);
  }

  public upsert(asset: { ticker: string; name: string; sector: string }): Asset {
    const stmt = this.db.prepare(`
      INSERT INTO assets (ticker, name, sector)
      VALUES (@ticker, @name, @sector)
      ON CONFLICT(ticker) DO UPDATE SET
        name = excluded.name,
        sector = excluded.sector,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run({
      '@ticker': asset.ticker,
      '@name': asset.name,
      '@sector': asset.sector,
    });

    return this.findByTicker(asset.ticker)!;
  }

  public count(): number {
    const stmt = this.db.prepare<{ count: number }>('SELECT COUNT(*) as count FROM assets');
    const result = stmt.get();
    return result ? Number(result.count) : 0;
  }
}
