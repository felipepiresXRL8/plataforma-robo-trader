import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseConnection, AppDatabase } from '../../src/db/connection';
import { AssetRepository } from '../../src/repositories/asset.repository';
import { PriceRepository } from '../../src/repositories/price.repository';
import { SignalRepository } from '../../src/repositories/signal.repository';
import { TradeRepository } from '../../src/repositories/trade.repository';
import { JustificationRepository } from '../../src/repositories/justification.repository';
import { PythonBotClient } from '../../src/clients/python-bot.client';
import { GeminiService } from '../../src/services/gemini.service';
import { MarketService } from '../../src/services/market.service';
import { RobotService } from '../../src/services/robot.service';
import { TradeService } from '../../src/services/trade.service';

describe('Unit Tests - Application Services', () => {
  let db: AppDatabase;
  let assetRepo: AssetRepository;
  let priceRepo: PriceRepository;
  let signalRepo: SignalRepository;
  let tradeRepo: TradeRepository;
  let justificationRepo: JustificationRepository;
  let pythonBotClient: PythonBotClient;
  let geminiService: GeminiService;
  let marketService: MarketService;
  let robotService: RobotService;
  let tradeService: TradeService;

  beforeEach(async () => {
    db = await DatabaseConnection.createInMemory();
    assetRepo = new AssetRepository(db);
    priceRepo = new PriceRepository(db);
    signalRepo = new SignalRepository(db);
    tradeRepo = new TradeRepository(db);
    justificationRepo = new JustificationRepository(db);

    pythonBotClient = new PythonBotClient();
    geminiService = new GeminiService('', 'gemini-2.5-flash');

    marketService = new MarketService(assetRepo, priceRepo);
    robotService = new RobotService(
      signalRepo,
      justificationRepo,
      assetRepo,
      pythonBotClient,
      geminiService
    );
    tradeService = new TradeService(tradeRepo, priceRepo);

    assetRepo.upsert({ ticker: 'PETR4.SA', name: 'Petrobras PN', sector: 'Petróleo' });
  });

  afterEach(() => {
    db.close();
  });

  describe('MarketService', () => {
    it('deve retornar lista de ativos cadastrados', async () => {
      const assets = await marketService.getAssetsList();
      expect(assets.length).toBe(1);
      expect(assets[0].ticker).toBe('PETR4.SA');
    });
  });

  describe('RobotService & Gemini Integration', () => {
    it('deve orquestrar execução quant, salvar sinal e gerar tese com dados numéricos reais', async () => {
      // Mock do cliente Python para retorno determinístico
      vi.spyOn(pythonBotClient, 'analyzeTicker').mockResolvedValue({
        ticker: 'PETR4.SA',
        signal: 'BUY',
        confidence: 0.85,
        strategy: 'LIGHTGBM_V1',
        indicators: {
          rsi_14: 34.2,
          sma_9: 38.5,
          sma_21: 37.1,
          ema_delta: 1.4,
          volatility_20: 0.021,
          volume_ratio: 1.45,
          close_price: 39.2,
        },
        top_features: [
          { feature: 'rsi_14', importance: 0.32 },
          { feature: 'volatility_20', importance: 0.28 },
        ],
      });

      const response = await robotService.analyzeAndGenerateJustification('PETR4.SA');

      expect(response.ticker).toBe('PETR4.SA');
      expect(response.signal.signal_type).toBe('BUY');
      expect(response.signal.confidence).toBe(0.85);
      expect(response.signal.indicators.rsi_14).toBe(34.2);
      expect(response.ai_justification).toBeDefined();
      expect(response.ai_justification.sentiment).toBe('BULLISH');
      expect(response.ai_justification.text).toContain('34.2'); // Valida que os números reais foram incorporados

      // Verifica persistência no SQLite
      const savedSignal = signalRepo.findLatestByTicker('PETR4.SA');
      expect(savedSignal).not.toBeNull();
      expect(savedSignal?.id).toBe(response.signal.id);
    });
  });

  describe('TradeService', () => {
    it('deve executar trade e retornar objeto de ordem preenchida', async () => {
      const trade = await tradeService.executeTrade({
        ticker: 'PETR4.SA',
        action: 'BUY',
        price: 38.5,
        quantity: 200,
      });

      expect(trade.id).toBeGreaterThan(0);
      expect(trade.ticker).toBe('PETR4.SA');
      expect(trade.action).toBe('BUY');
      expect(trade.price).toBe(38.5);
      expect(trade.quantity).toBe(200);
      expect(trade.status).toBe('FILLED');
    });
  });
});
