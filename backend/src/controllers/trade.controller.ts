import { Request, Response, NextFunction } from 'express';
import { TradeService } from '../services/trade.service';

export class TradeController {
  private tradeService: TradeService;

  constructor(tradeService: TradeService) {
    this.tradeService = tradeService;
  }

  public executeTrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ticker, signal_id, action, price, quantity } = req.body;
      const trade = await this.tradeService.executeTrade({
        ticker,
        signal_id,
        action,
        price,
        quantity,
      });
      res.status(201).json({ data: trade });
    } catch (error) {
      next(error);
    }
  };

  public getTrades = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const ticker = req.query.ticker as string | undefined;

      const trades = ticker
        ? await this.tradeService.getTradesByTicker(ticker, limit)
        : await this.tradeService.getTrades(limit, offset);

      res.json({ data: trades });
    } catch (error) {
      next(error);
    }
  };

  public getPortfolio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await this.tradeService.getPortfolioSummary();
      res.json({ data: summary });
    } catch (error) {
      next(error);
    }
  };
}
