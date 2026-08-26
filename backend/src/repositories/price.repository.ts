import { AppDatabase } from '../db/connection';
import { HistoricalPrice, AssetSummaryDTO } from '../types';

export class PriceRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  public findByTicker(
    ticker: string,
    limit = 90,
    startDate?: string,
    endDate?: string
  ): HistoricalPrice[] {
    let query = `
      SELECT id, ticker, timestamp, open, high, low, close, volume
      FROM historical_prices
      WHERE ticker = ?
    `;
    const params: any[] = [ticker];

    if (startDate) {
      query += ` AND timestamp >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND timestamp <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY timestamp ASC LIMIT ?`;
    params.push(limit);

    const stmt = this.db.prepare<HistoricalPrice>(query);
    return stmt.all(...params);
  }

  public getLatestPrice(ticker: string): HistoricalPrice | null {
    const stmt = this.db.prepare<HistoricalPrice>(`
      SELECT id, ticker, timestamp, open, high, low, close, volume
      FROM historical_prices
      WHERE ticker = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    return stmt.get(ticker);
  }

  public insertBatch(prices: Omit<HistoricalPrice, 'id'>[]): number {
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO historical_prices (ticker, timestamp, open, high, low, close, volume)
      VALUES (@ticker, @timestamp, @open, @high, @low, @close, @volume)
    `);

    return this.db.transaction(() => {
      let count = 0;
      for (const item of prices) {
        insert.run({
          '@ticker': item.ticker,
          '@timestamp': item.timestamp,
          '@open': item.open,
          '@high': item.high,
          '@low': item.low,
          '@close': item.close,
          '@volume': item.volume,
        });
        count++;
      }
      return count;
    });
  }

  /**
   * Consulta SQL Analítica: Retorna todos os ativos com o preço mais recente,
   * preço anterior, variação nominal e variação percentual diária.
   * Utiliza Window Functions (ROW_NUMBER) para demonstrar SQL avançado.
   */
  public getMarketSummaries(): AssetSummaryDTO[] {
    const query = `
      WITH RankedPrices AS (
        SELECT 
          hp.ticker,
          hp.timestamp,
          hp.close,
          hp.volume,
          ROW_NUMBER() OVER (PARTITION BY hp.ticker ORDER BY hp.timestamp DESC) as rank
        FROM historical_prices hp
      ),
      LatestPrices AS (
        SELECT ticker, timestamp, close as current_price, volume
        FROM RankedPrices
        WHERE rank = 1
      ),
      PreviousPrices AS (
        SELECT ticker, close as previous_close
        FROM RankedPrices
        WHERE rank = 2
      )
      SELECT 
        a.ticker,
        a.name,
        a.sector,
        COALESCE(lp.current_price, 0.0) as current_price,
        COALESCE(pp.previous_close, lp.current_price, 0.0) as previous_close,
        ROUND(COALESCE(lp.current_price, 0.0) - COALESCE(pp.previous_close, lp.current_price, 0.0), 2) as daily_change,
        CASE 
          WHEN pp.previous_close IS NOT NULL AND pp.previous_close > 0 THEN
            ROUND(((lp.current_price - pp.previous_close) / pp.previous_close) * 100.0, 2)
          ELSE 0.0
        END as daily_change_pct,
        COALESCE(lp.volume, 0) as volume,
        COALESCE(lp.timestamp, datetime('now')) as last_updated
      FROM assets a
      LEFT JOIN LatestPrices lp ON a.ticker = lp.ticker
      LEFT JOIN PreviousPrices pp ON a.ticker = pp.ticker
      ORDER BY a.ticker ASC
    `;

    const stmt = this.db.prepare<AssetSummaryDTO>(query);
    return stmt.all();
  }
}
