import axios from 'axios';
import { AssetSummary, HistoricalPrice, RobotAnalysisResult, Trade, PortfolioSummary } from '../types';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const marketApi = {
  getMarketSummary: async (): Promise<AssetSummary[]> => {
    const res = await client.get<{ data: AssetSummary[] }>('/market/summary');
    return res.data.data;
  },

  getHistoricalPrices: async (ticker: string, limit = 90): Promise<HistoricalPrice[]> => {
    const res = await client.get<{ data: HistoricalPrice[] }>(`/market/history/${ticker}?limit=${limit}`);
    return res.data.data;
  },
};

export const robotApi = {
  analyzeTicker: async (ticker: string): Promise<RobotAnalysisResult> => {
    const res = await client.post<{ data: RobotAnalysisResult }>(`/robot/analyze/${ticker}`);
    return res.data.data;
  },

  getLatestSignal: async (ticker: string): Promise<{ signal: any; justification: any }> => {
    const res = await client.get<{ data: { signal: any; justification: any } }>(`/robot/signals/${ticker}/latest`);
    return res.data.data;
  },
};

export const tradeApi = {
  executeTrade: async (trade: { ticker: string; signal_id?: number; action: 'BUY' | 'SELL'; price: number; quantity: number }): Promise<Trade> => {
    const res = await client.post<{ data: Trade }>('/trades', trade);
    return res.data.data;
  },

  getTrades: async (ticker?: string): Promise<Trade[]> => {
    const url = ticker ? `/trades?ticker=${ticker}` : '/trades';
    const res = await client.get<{ data: Trade[] }>(url);
    return res.data.data;
  },

  getPortfolio: async (): Promise<PortfolioSummary> => {
    const res = await client.get<{ data: PortfolioSummary }>('/trades/portfolio');
    return res.data.data;
  },
};
