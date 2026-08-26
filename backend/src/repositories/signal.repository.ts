import { AppDatabase } from '../db/connection';
import { TradeSignal } from '../types';

export class SignalRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  public create(signal: Omit<TradeSignal, 'id' | 'created_at'>): TradeSignal {
    const stmt = this.db.prepare(`
      INSERT INTO trade_signals (ticker, signal_type, confidence, strategy, features_json)
      VALUES (@ticker, @signal_type, @confidence, @strategy, @features_json)
    `);

    const result = stmt.run({
      '@ticker': signal.ticker,
      '@signal_type': signal.signal_type,
      '@confidence': signal.confidence,
      '@strategy': signal.strategy,
      '@features_json': JSON.stringify(signal.features),
    });

    const getCreated = this.db.prepare<any>(`
      SELECT id, ticker, signal_type, confidence, strategy, features_json, created_at
      FROM trade_signals
      WHERE id = ?
    `);

    const row = getCreated.get(result.lastInsertRowid);
    if (!row) {
      throw new Error(`Falha ao recuperar o sinal recém-criado com id ${result.lastInsertRowid}`);
    }

    return {
      id: Number(row.id),
      ticker: row.ticker,
      signal_type: row.signal_type,
      confidence: Number(row.confidence),
      strategy: row.strategy,
      features: JSON.parse(row.features_json),
      created_at: row.created_at,
    };
  }

  public findLatestByTicker(ticker: string): TradeSignal | null {
    const stmt = this.db.prepare<any>(`
      SELECT id, ticker, signal_type, confidence, strategy, features_json, created_at
      FROM trade_signals
      WHERE ticker = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(ticker);
    if (!row) return null;

    return {
      id: Number(row.id),
      ticker: row.ticker,
      signal_type: row.signal_type,
      confidence: Number(row.confidence),
      strategy: row.strategy,
      features: JSON.parse(row.features_json),
      created_at: row.created_at,
    };
  }

  public findAll(limit = 50, offset = 0): TradeSignal[] {
    const stmt = this.db.prepare<any>(`
      SELECT id, ticker, signal_type, confidence, strategy, features_json, created_at
      FROM trade_signals
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset);
    return rows.map((row) => ({
      id: Number(row.id),
      ticker: row.ticker,
      signal_type: row.signal_type,
      confidence: Number(row.confidence),
      strategy: row.strategy,
      features: JSON.parse(row.features_json),
      created_at: row.created_at,
    }));
  }
}
