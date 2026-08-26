import { TradeRepository } from '../repositories/trade.repository';
import { PriceRepository } from '../repositories/price.repository';
import { Trade, TradeAction } from '../types';

export interface ExecuteTradeInput {
  ticker: string;
  signal_id?: number;
  action: TradeAction;
  price: number;
  quantity: number;
}

export class TradeService {
  private tradeRepo: TradeRepository;
  private priceRepo: PriceRepository;

  constructor(tradeRepo: TradeRepository, priceRepo: PriceRepository) {
    this.tradeRepo = tradeRepo;
    this.priceRepo = priceRepo;
  }

  public async executeTrade(input: ExecuteTradeInput): Promise<Trade> {
    const formattedTicker = input.ticker.toUpperCase().trim();

    return this.tradeRepo.create({
      ticker: formattedTicker,
      signal_id: input.signal_id || null,
      action: input.action,
      price: input.price,
      quantity: input.quantity,
      status: 'FILLED',
    });
  }

  public async getTrades(limit = 50, offset = 0): Promise<Trade[]> {
    return this.tradeRepo.findAll(limit, offset);
  }

  public async getTradesByTicker(ticker: string, limit = 50): Promise<Trade[]> {
    return this.tradeRepo.findByTicker(ticker.toUpperCase().trim(), limit);
  }

  public async getPortfolioSummary(): Promise<{
    total_trades: number;
    total_buy_volume: number;
    total_sell_volume: number;
  }> {
    return this.tradeRepo.getPortfolioSummary();
  }
}
