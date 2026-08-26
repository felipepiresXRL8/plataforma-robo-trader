import { AssetRepository } from '../repositories/asset.repository';
import { PriceRepository } from '../repositories/price.repository';
import { Asset, AssetSummaryDTO, HistoricalPrice } from '../types';

export class MarketService {
  private assetRepo: AssetRepository;
  private priceRepo: PriceRepository;

  constructor(assetRepo: AssetRepository, priceRepo: PriceRepository) {
    this.assetRepo = assetRepo;
    this.priceRepo = priceRepo;
  }

  public async getAssetsList(): Promise<Asset[]> {
    return this.assetRepo.findAll();
  }

  public async getAssetSummaryList(): Promise<AssetSummaryDTO[]> {
    return this.priceRepo.getMarketSummaries();
  }

  public async getAssetByTicker(ticker: string): Promise<Asset | null> {
    return this.assetRepo.findByTicker(ticker);
  }

  public async getHistoricalPrices(
    ticker: string,
    limit = 90,
    startDate?: string,
    endDate?: string
  ): Promise<HistoricalPrice[]> {
    return this.priceRepo.findByTicker(ticker, limit, startDate, endDate);
  }
}
