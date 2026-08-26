import { Request, Response, NextFunction } from 'express';
import { MarketService } from '../services/market.service';

export class MarketController {
  private marketService: MarketService;

  constructor(marketService: MarketService) {
    this.marketService = marketService;
  }

  public getAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const assets = await this.marketService.getAssetsList();
      res.json({ data: assets });
    } catch (error) {
      next(error);
    }
  };

  public getMarketSummaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summaries = await this.marketService.getAssetSummaryList();
      res.json({ data: summaries });
    } catch (error) {
      next(error);
    }
  };

  public getHistoricalPrices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticker = String(req.params.ticker);
      const limit = req.query.limit ? Number(req.query.limit) : 90;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const prices = await this.marketService.getHistoricalPrices(ticker, limit, startDate, endDate);
      res.json({
        ticker: ticker.toUpperCase(),
        count: prices.length,
        data: prices,
      });
    } catch (error) {
      next(error);
    }
  };
}
