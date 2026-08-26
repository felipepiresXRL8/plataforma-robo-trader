import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { AppDatabase, DatabaseConnection } from './db/connection';
import { AssetRepository } from './repositories/asset.repository';
import { PriceRepository } from './repositories/price.repository';
import { SignalRepository } from './repositories/signal.repository';
import { TradeRepository } from './repositories/trade.repository';
import { JustificationRepository } from './repositories/justification.repository';
import { PythonBotClient } from './clients/python-bot.client';
import { GeminiService } from './services/gemini.service';
import { MarketService } from './services/market.service';
import { RobotService } from './services/robot.service';
import { TradeService } from './services/trade.service';
import { MarketController } from './controllers/market.controller';
import { RobotController } from './controllers/robot.controller';
import { TradeController } from './controllers/trade.controller';
import { validateRequest } from './middlewares/validate.middleware';
import { errorHandler } from './middlewares/error.middleware';
import { TickerParamSchema, HistoryQuerySchema, CreateTradeSchema } from './types';

export interface AppContext {
  app: Express;
  db: AppDatabase;
  services: {
    marketService: MarketService;
    robotService: RobotService;
    tradeService: TradeService;
    geminiService: GeminiService;
  };
  repositories: {
    assetRepo: AssetRepository;
    priceRepo: PriceRepository;
    signalRepo: SignalRepository;
    tradeRepo: TradeRepository;
    justificationRepo: JustificationRepository;
  };
}

export async function createApp(customDb?: AppDatabase): Promise<AppContext> {
  const app = express();

  // Middlewares essenciais
  app.use(cors());
  app.use(express.json());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // 1. Inicializa Conexão do Banco de Dados
  const db = customDb || (await DatabaseConnection.getInstance());

  // 2. Instanciação de Repositórios (Data Access Layer)
  const assetRepo = new AssetRepository(db);
  const priceRepo = new PriceRepository(db);
  const signalRepo = new SignalRepository(db);
  const tradeRepo = new TradeRepository(db);
  const justificationRepo = new JustificationRepository(db);

  // 3. Instanciação de Clientes Externos
  const pythonBotClient = new PythonBotClient();

  // 4. Instanciação de Serviços (Business Logic Layer)
  const geminiService = new GeminiService();
  const marketService = new MarketService(assetRepo, priceRepo);
  const robotService = new RobotService(
    signalRepo,
    justificationRepo,
    assetRepo,
    pythonBotClient,
    geminiService
  );
  const tradeService = new TradeService(tradeRepo, priceRepo);

  // 5. Instanciação de Controladores (Presentation / API Layer)
  const marketController = new MarketController(marketService);
  const robotController = new RobotController(robotService);
  const tradeController = new TradeController(tradeService);

  // ==========================================
  // Definição de Rotas REST
  // ==========================================

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'plataforma-robo-trader-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // Rotas de Mercado (Assets & Candlestick History)
  app.get('/api/market/assets', marketController.getAssets);
  app.get('/api/market/summary', marketController.getMarketSummaries);
  app.get(
    '/api/market/history/:ticker',
    validateRequest({ params: TickerParamSchema, query: HistoryQuerySchema }),
    marketController.getHistoricalPrices
  );

  // Rotas do Robô Quant & IA
  app.post(
    '/api/robot/analyze/:ticker',
    validateRequest({ params: TickerParamSchema }),
    robotController.analyzeTicker
  );
  app.get(
    '/api/robot/signals/:ticker/latest',
    validateRequest({ params: TickerParamSchema }),
    robotController.getLatestSignal
  );
  app.get('/api/robot/signals', robotController.getAllSignals);

  // Rotas de Execução de Trades
  app.post(
    '/api/trades',
    validateRequest({ body: CreateTradeSchema }),
    tradeController.executeTrade
  );
  app.get('/api/trades', tradeController.getTrades);
  app.get('/api/trades/portfolio', tradeController.getPortfolio);

  // Middleware Central de Erros
  app.use(errorHandler);

  return {
    app,
    db,
    services: {
      marketService,
      robotService,
      tradeService,
      geminiService,
    },
    repositories: {
      assetRepo,
      priceRepo,
      signalRepo,
      tradeRepo,
      justificationRepo,
    },
  };
}
