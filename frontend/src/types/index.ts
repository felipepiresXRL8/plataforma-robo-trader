export interface AssetSummary {
  ticker: string;
  name: string;
  sector: string;
  current_price: number;
  previous_close: number;
  daily_change: number;
  daily_change_pct: number;
  volume: number;
  last_updated: string;
}

export interface HistoricalPrice {
  id?: number;
  ticker: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface IndicatorMetrics {
  close_price?: number;
  rsi_14?: number;
  sma_9?: number;
  sma_21?: number;
  ema_delta?: number;
  volatility_20?: number;
  volume_ratio?: number;
  bb_percent_b?: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface RobotAnalysisResult {
  ticker: string;
  signal: {
    id: number;
    signal_type: SignalType;
    confidence: number;
    strategy: string;
    indicators: IndicatorMetrics;
    top_features: FeatureImportance[];
    created_at: string;
  };
  ai_justification: {
    id: number;
    text: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    risk_factors: string[];
    model: string;
    created_at: string;
  };
}

export interface Trade {
  id?: number;
  ticker: string;
  signal_id?: number | null;
  action: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  status: string;
  executed_at: string;
}

export interface PortfolioSummary {
  total_trades: number;
  total_buy_volume: number;
  total_sell_volume: number;
}
