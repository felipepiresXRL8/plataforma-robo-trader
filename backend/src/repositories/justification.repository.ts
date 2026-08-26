import { AppDatabase } from '../db/connection';
import { AIJustification } from '../types';

export class JustificationRepository {
  private db: AppDatabase;

  constructor(db: AppDatabase) {
    this.db = db;
  }

  public create(justification: Omit<AIJustification, 'id' | 'created_at'>): AIJustification {
    const stmt = this.db.prepare(`
      INSERT INTO ai_justifications (signal_id, ticker, justification_text, model_used, sentiment, risk_factors)
      VALUES (@signal_id, @ticker, @justification_text, @model_used, @sentiment, @risk_factors)
    `);

    const result = stmt.run({
      '@signal_id': justification.signal_id,
      '@ticker': justification.ticker,
      '@justification_text': justification.justification_text,
      '@model_used': justification.model_used,
      '@sentiment': justification.sentiment,
      '@risk_factors': JSON.stringify(justification.risk_factors || []),
    });

    const getCreated = this.db.prepare<any>(`
      SELECT id, signal_id, ticker, justification_text, model_used, sentiment, risk_factors, created_at
      FROM ai_justifications
      WHERE id = ?
    `);

    const row = getCreated.get(result.lastInsertRowid);
    if (!row) {
      throw new Error(`Falha ao recuperar a justificativa criada com id ${result.lastInsertRowid}`);
    }

    return {
      id: Number(row.id),
      signal_id: Number(row.signal_id),
      ticker: row.ticker,
      justification_text: row.justification_text,
      model_used: row.model_used,
      sentiment: row.sentiment,
      risk_factors: JSON.parse(row.risk_factors),
      created_at: row.created_at,
    };
  }

  public findBySignalId(signalId: number): AIJustification | null {
    const stmt = this.db.prepare<any>(`
      SELECT id, signal_id, ticker, justification_text, model_used, sentiment, risk_factors, created_at
      FROM ai_justifications
      WHERE signal_id = ?
    `);
    const row = stmt.get(signalId);
    if (!row) return null;

    return {
      id: Number(row.id),
      signal_id: Number(row.signal_id),
      ticker: row.ticker,
      justification_text: row.justification_text,
      model_used: row.model_used,
      sentiment: row.sentiment,
      risk_factors: JSON.parse(row.risk_factors),
      created_at: row.created_at,
    };
  }

  public findLatestByTicker(ticker: string): AIJustification | null {
    const stmt = this.db.prepare<any>(`
      SELECT id, signal_id, ticker, justification_text, model_used, sentiment, risk_factors, created_at
      FROM ai_justifications
      WHERE ticker = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(ticker);
    if (!row) return null;

    return {
      id: Number(row.id),
      signal_id: Number(row.signal_id),
      ticker: row.ticker,
      justification_text: row.justification_text,
      model_used: row.model_used,
      sentiment: row.sentiment,
      risk_factors: JSON.parse(row.risk_factors),
      created_at: row.created_at,
    };
  }
}
