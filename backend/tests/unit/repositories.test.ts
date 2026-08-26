import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection, AppDatabase } from '../../src/db/connection';
import { AssetRepository } from '../../src/repositories/asset.repository';
import { PriceRepository } from '../../src/repositories/price.repository';
import { SignalRepository } from '../../src/repositories/signal.repository';
import { TradeRepository } from '../../src/repositories/trade.repository';
import { JustificationRepository } from '../../src/repositories/justification.repository';

describe('Unit Tests - SQLite Repositories (Layered Data Access)', () => {
  let db: AppDatabase;
  let assetRepo: AssetRepository;
  let priceRepo: PriceRepository;
  let signalRepo: SignalRepository;
  let tradeRepo: TradeRepository;
  let justificationRepo: JustificationRepository;

  beforeEach(async () => {
    // Cria banco em memória isolado para cada teste
    db = await DatabaseConnection.createInMemory();
    assetRepo = new AssetRepository(db);
    priceRepo = new PriceRepository(db);
    signalRepo = new SignalRepository(db);
    tradeRepo = new TradeRepository(db);
    justificationRepo = new JustificationRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('AssetRepository', () => {
    it('deve inserir e buscar um ativo por ticker', () => {
      assetRepo.upsert({ ticker: 'PETR4.SA', name: 'Petrobras PN', sector: 'Petróleo' });
      const asset = assetRepo.findByTicker('PETR4.SA');

      expect(asset).not.toBeNull();
      expect(asset?.ticker).toBe('PETR4.SA');
      expect(asset?.name).toBe('Petrobras PN');
      expect(asset?.sector).toBe('Petróleo');
    });

    it('deve listar todos os ativos cadastrados em ordem alfabética', () => {
      assetRepo.upsert({ ticker: 'VALE3.SA', name: 'Vale ON', sector: 'Mineração' });
      assetRepo.upsert({ ticker: 'BBAS3.SA', name: 'Banco do Brasil', sector: 'Financeiro' });

      const all = assetRepo.findAll();
      expect(all.length).toBe(2);
      expect(all[0].ticker).toBe('BBAS3.SA');
      expect(all[1].ticker).toBe('VALE3.SA');
    });
  });

  describe('PriceRepository', () => {
    beforeEach(() => {
      assetRepo.upsert({ ticker: 'PETR4.SA', name: 'Petrobras PN', sector: 'Petróleo' });
    });

    it('deve inserir e consultar lote de candles históricos', () => {
      const prices = [
        { ticker: 'PETR4.SA', timestamp: '2026-01-01', open: 30, high: 32, low: 29.5, close: 31.5, volume: 100000 },
        { ticker: 'PETR4.SA', timestamp: '2026-01-02', open: 31.5, high: 33, low: 31, close: 32.8, volume: 150000 },
      ];

      const inserted = priceRepo.insertBatch(prices);
      expect(inserted).toBe(2);

      const history = priceRepo.findByTicker('PETR4.SA');
      expect(history.length).toBe(2);
      expect(history[0].close).toBe(31.5);
      expect(history[1].close).toBe(32.8);
    });

    it('deve calcular corretamente a variação percentual diária via query analítica (Window Function)', () => {
      priceRepo.insertBatch([
        { ticker: 'PETR4.SA', timestamp: '2026-01-01', open: 30, high: 32, low: 29.5, close: 30.0, volume: 100000 },
        { ticker: 'PETR4.SA', timestamp: '2026-01-02', open: 30, high: 34, low: 30, close: 33.0, volume: 150000 },
      ]);

      const summaries = priceRepo.getMarketSummaries();
      expect(summaries.length).toBe(1);
      const petr4Summary = summaries.find((s) => s.ticker === 'PETR4.SA');

      expect(petr4Summary).toBeDefined();
      expect(petr4Summary?.current_price).toBe(33.0);
      expect(petr4Summary?.previous_close).toBe(30.0);
      expect(petr4Summary?.daily_change).toBe(3.0);
      expect(petr4Summary?.daily_change_pct).toBe(10.0); // (33 - 30) / 30 * 100 = 10%
    });
  });

  describe('SignalRepository & JustificationRepository', () => {
    beforeEach(() => {
      assetRepo.upsert({ ticker: 'WEGE3.SA', name: 'WEG ON', sector: 'Industrial' });
    });

    it('deve persistir um sinal de trading com features em JSON e recuperar por ticker', () => {
      const signal = signalRepo.create({
        ticker: 'WEGE3.SA',
        signal_type: 'BUY',
        confidence: 0.78,
        strategy: 'LIGHTGBM_V1',
        features: {
          indicators: { rsi_14: 38.5, sma_9: 50.2, sma_21: 49.1 },
          top_features: [{ feature: 'rsi_14', importance: 0.35 }],
        },
      });

      expect(signal.id).toBeGreaterThan(0);
      expect(signal.signal_type).toBe('BUY');
      expect(signal.confidence).toBe(0.78);
      expect(signal.features.indicators.rsi_14).toBe(38.5);

      const latest = signalRepo.findLatestByTicker('WEGE3.SA');
      expect(latest?.id).toBe(signal.id);
    });

    it('deve persistir uma justificativa gerada por IA associada ao sinal', () => {
      const signal = signalRepo.create({
        ticker: 'WEGE3.SA',
        signal_type: 'BUY',
        confidence: 0.82,
        strategy: 'LIGHTGBM_V1',
        features: { indicators: { rsi_14: 35.0 } },
      });

      const justification = justificationRepo.create({
        signal_id: signal.id!,
        ticker: 'WEGE3.SA',
        justification_text: 'Tese técnica fundamentada no RSI em 35.0.',
        model_used: 'gemini-2.5-flash',
        sentiment: 'BULLISH',
        risk_factors: ['Volatilidade do setor'],
      });

      expect(justification.id).toBeGreaterThan(0);
      expect(justification.sentiment).toBe('BULLISH');
      expect(justification.risk_factors).toContain('Volatilidade do setor');

      const found = justificationRepo.findBySignalId(signal.id!);
      expect(found?.justification_text).toBe('Tese técnica fundamentada no RSI em 35.0.');
    });
  });

  describe('TradeRepository', () => {
    beforeEach(() => {
      assetRepo.upsert({ ticker: 'ITUB4.SA', name: 'Itaú PN', sector: 'Financeiro' });
    });

    it('deve registrar ordem e agregar volume total no portfólio', () => {
      tradeRepo.create({
        ticker: 'ITUB4.SA',
        action: 'BUY',
        price: 35.0,
        quantity: 100,
        status: 'FILLED',
      });

      tradeRepo.create({
        ticker: 'ITUB4.SA',
        action: 'SELL',
        price: 38.0,
        quantity: 50,
        status: 'FILLED',
      });

      const summary = tradeRepo.getPortfolioSummary();
      expect(summary.total_trades).toBe(2);
      expect(summary.total_buy_volume).toBe(3500.0); // 35 * 100
      expect(summary.total_sell_volume).toBe(1900.0); // 38 * 50
    });
  });
});
