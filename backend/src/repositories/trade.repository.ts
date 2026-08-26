import { AppDatabase } from '../db/connection';
import { Trade } from '../types';

export class TradeRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  public create(trade: Omit<Trade, 'id' | 'executed_at'>): Trade {
    const stmt = this.db.prepare(`
      INSERT INTO trades (ticker, signal_id, action, price, quantity, status)
      VALUES (@ticker, @signal_id, @action, @price, @quantity, @status)
    `);

    const result = stmt.run({
      '@ticker': trade.ticker,
      '@signal_id': trade.signal_id ?? null,
      '@action': trade.action,
      '@price': trade.price,
      '@quantity': trade.quantity,
      '@status': trade.status || 'FILLED',
    });

    const getCreated = this.db.prepare<Trade>(`
      SELECT id, ticker, signal_id, action, price, quantity, status, executed_at
      FROM trades
      WHERE id = ?
    `);

    const row = getCreated.get(result.lastInsertRowid);
    if (!row) {
      throw new Error(`Falha ao recuperar a ordem recém-executada com id ${result.lastInsertRowid}`);
    }

    return {
      id: Number(row.id),
      ticker: row.ticker,
      signal_id: row.signal_id ? Number(row.signal_id) : null,
      action: row.action,
      price: Number(row.price),
      quantity: Number(row.quantity),
      status: row.status,
      executed_at: row.executed_at,
    };
  }

  public findAll(limit = 50, offset = 0): Trade[] {
    const stmt = this.db.prepare<Trade>(`
      SELECT id, ticker, signal_id, action, price, quantity, status, executed_at
      FROM trades
      ORDER BY executed_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  public findByTicker(ticker: string, limit = 50): Trade[] {
    const stmt = this.db.prepare<Trade>(`
      SELECT id, ticker, signal_id, action, price, quantity, status, executed_at
      FROM trades
      WHERE ticker = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);
    return stmt.all(ticker, limit);
  }

  public getPortfolioSummary(): {
    total_trades: number;
    total_buy_volume: number;
    total_sell_volume: number;
  } {
    const stmt = this.db.prepare<any>(`
      SELECT 
        COUNT(*) as total_trades,
        COALESCE(SUM(CASE WHEN action = 'BUY' THEN price * quantity ELSE 0 END), 0) as total_buy_volume,
        COALESCE(SUM(CASE WHEN action = 'SELL' THEN price * quantity ELSE 0 END), 0) as total_sell_volume
      FROM trades
      WHERE status = 'FILLED'
    `);
    const res = stmt.get();
    return {
      total_trades: res ? Number(res.total_trades) : 0,
      total_buy_volume: res ? Number(res.total_buy_volume) : 0,
      total_sell_volume: res ? Number(res.total_sell_volume) : 0,
    };
  }
}
