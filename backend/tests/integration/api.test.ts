import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp, AppContext } from '../../src/app';
import { DatabaseConnection, AppDatabase } from '../../src/db/connection';

describe('Integration Tests - REST Endpoints (Supertest)', () => {
  let context: AppContext;
  let app: Express;
  let db: AppDatabase;

  beforeAll(async () => {
    db = await DatabaseConnection.createInMemory();
    context = await createApp(db);
    app = context.app;

    // Popula dados de teste
    context.repositories.assetRepo.upsert({ ticker: 'PETR4.SA', name: 'Petrobras PN', sector: 'Petróleo' });
    context.repositories.priceRepo.insertBatch([
      { ticker: 'PETR4.SA', timestamp: '2026-01-01', open: 35.0, high: 36.0, low: 34.5, close: 35.8, volume: 5000000 },
      { ticker: 'PETR4.SA', timestamp: '2026-01-02', open: 35.8, high: 37.0, low: 35.5, close: 36.9, volume: 6000000 },
    ]);
  });

  afterAll(() => {
    db.close();
  });

  describe('GET /health', () => {
    it('deve retornar status 200 e payload de health check', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/market/assets & /summary', () => {
    it('deve listar todos os ativos cadastrados', async () => {
      const res = await request(app).get('/api/market/assets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].ticker).toBe('PETR4.SA');
    });

    it('deve retornar o resumo de mercado com variações diárias calculadas', async () => {
      const res = await request(app).get('/api/market/summary');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const petr4 = res.body.data.find((item: any) => item.ticker === 'PETR4.SA');
      expect(petr4).toBeDefined();
      expect(petr4.current_price).toBe(36.9);
      expect(petr4.previous_close).toBe(35.8);
      expect(petr4.daily_change_pct).toBe(3.07);
    });

    it('deve retornar o histórico OHLCV para alimentar o gráfico', async () => {
      const res = await request(app).get('/api/market/history/PETR4.SA?limit=10');
      expect(res.status).toBe(200);
      expect(res.body.ticker).toBe('PETR4.SA');
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].open).toBe(35.0);
    });
  });

  describe('POST /api/robot/analyze/:ticker', () => {
    it('deve executar o robô quantitativo, gerar tese de IA e retornar payload estruturado', async () => {
      const res = await request(app).post('/api/robot/analyze/PETR4.SA');
      expect(res.status).toBe(200);
      expect(res.body.data.ticker).toBe('PETR4.SA');
      expect(res.body.data.signal).toBeDefined();
      expect(['BUY', 'SELL', 'HOLD']).toContain(res.body.data.signal.signal_type);
      expect(res.body.data.ai_justification).toBeDefined();
      expect(res.body.data.ai_justification.text.length).toBeGreaterThan(20);
    });

    it('deve consultar o último sinal gerado para o ativo', async () => {
      const res = await request(app).get('/api/robot/signals/PETR4.SA/latest');
      expect(res.status).toBe(200);
      expect(res.body.data.signal.ticker).toBe('PETR4.SA');
      expect(res.body.data.justification).toBeDefined();
    });
  });

  describe('POST /api/trades & GET /api/trades', () => {
    it('deve validar schema de ordem e persistir trade', async () => {
      const payload = {
        ticker: 'PETR4.SA',
        action: 'BUY',
        price: 36.9,
        quantity: 100,
      };

      const res = await request(app).post('/api/trades').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.ticker).toBe('PETR4.SA');
      expect(res.body.data.action).toBe('BUY');
      expect(res.body.data.price).toBe(36.9);
      expect(res.body.data.quantity).toBe(100);
    });

    it('deve rejeitar ordem com campos inválidos com status 400', async () => {
      const invalidPayload = {
        ticker: 'PETR4.SA',
        action: 'INVALID_ACTION',
        price: -10,
        quantity: 0,
      };

      const res = await request(app).post('/api/trades').send(invalidPayload);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Erro de validação de dados');
    });

    it('deve retornar o resumo do portfólio consolidado', async () => {
      const res = await request(app).get('/api/trades/portfolio');
      expect(res.status).toBe(200);
      expect(res.body.data.total_trades).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total_buy_volume).toBe(3690); // 36.9 * 100
    });
  });
});
