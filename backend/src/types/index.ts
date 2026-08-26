import { z } from 'zod';

// ==========================================
// Entidades de Domínio (Domain Entities)
// ==========================================

export interface Asset {
  ticker: string;
  name: string;
  sector: string;
  created_at: string;
  updated_at: string;
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
  rsi_14?: number;
  sma_9?: number;
  sma_21?: number;
  ema_delta?: number;
  volatility_20?: number;
  volume_ratio?: number;
  close_price?: number;
  [key: string]: number | undefined;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface TradeSignal {
  id?: number;
  ticker: string;
  signal_type: SignalType;
  confidence: number;
  strategy: string;
  features: {
    indicators: IndicatorMetrics;
    top_features?: FeatureImportance[];
    raw?: Record<string, any>;
  };
  created_at: string;
}

export type TradeAction = 'BUY' | 'SELL';
export type TradeStatus = 'FILLED' | 'CANCELLED' | 'PENDING';

export interface Trade {
  id?: number;
  ticker: string;
  signal_id?: number | null;
  action: TradeAction;
  price: number;
  quantity: number;
  status: TradeStatus;
  executed_at: string;
}

export interface AIJustification {
  id?: number;
  signal_id: number;
  ticker: string;
  justification_text: string;
  model_used: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  risk_factors: string[];
  created_at: string;
}

// ==========================================
// DTOs & Respostas da API
// ==========================================

export interface AssetSummaryDTO {
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

export interface RobotAnalysisResponseDTO {
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

// ==========================================
// Schemas de Validação Zod
// ==========================================

export const TickerParamSchema = z.object({
  ticker: z.string().min(1).max(20).transform((val) => val.toUpperCase().trim()),
});

export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(90),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const CreateTradeSchema = z.object({
  ticker: z.string().min(1).max(20).transform((val) => val.toUpperCase().trim()),
  signal_id: z.number().int().positive().optional(),
  action: z.enum(['BUY', 'SELL']),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
});
