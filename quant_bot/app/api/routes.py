from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

from ..data.fetcher import MarketDataFetcher
from ..features.engineer import FeatureEngineer
from ..models.model import QuantModel
from ..models.validation import WalkForwardValidator
from ..models.backtest import StrategyBacktester
from ..config import settings

router = APIRouter()

# ==========================================
# Pydantic Response Schemas
# ==========================================

class IndicatorMetricsDTO(BaseModel):
    close_price: float
    rsi_14: float
    sma_9: float
    sma_21: float
    ema_delta: float
    volatility_20: float
    volume_ratio: float
    bb_percent_b: float

class FeatureImportanceDTO(BaseModel):
    feature: str
    importance: float

class HistoricalMetricsDTO(BaseModel):
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    baseline_sharpe: float

class AnalysisResponseDTO(BaseModel):
    ticker: str
    signal: str
    confidence: float
    strategy: str
    indicators: IndicatorMetricsDTO
    top_features: List[FeatureImportanceDTO]
    historical_metrics: Optional[HistoricalMetricsDTO] = None

class TrainResponseDTO(BaseModel):
    ticker: str
    validation: Dict[str, Any]
    backtest: Dict[str, Any]
    top_features: List[FeatureImportanceDTO]

class AssetSummaryDTO(BaseModel):
    ticker: str
    current_price: float
    previous_close: float
    daily_change: float
    daily_change_pct: float
    volume: float

# ==========================================
# Endpoints
# ==========================================

@router.post("/api/analyze/{ticker}", response_model=AnalysisResponseDTO)
async def analyze_ticker(ticker: str):
    """
    Executa a análise preditiva completa para um ativo:
    1. Ingestão OHLCV
    2. Engenharia de Features
    3. Treinamento/Inferência LightGBM
    4. Extração de Feature Importance e Indicadores
    """
    try:
        normalized_ticker = MarketDataFetcher.normalize_ticker(ticker)
        df = MarketDataFetcher.fetch_ohlcv(normalized_ticker, period="2y")
        
        if df.empty or len(df) < 50:
            raise HTTPException(status_code=400, detail=f"Histórico insuficiente para {normalized_ticker}")

        # Extrai features e prepara dataset
        X, y, latest_row = FeatureEngineer.prepare_dataset(df)
        indicators = FeatureEngineer.get_latest_indicators(latest_row)

        # Treina o modelo LightGBM com regularização
        model = QuantModel()
        model.train(X, y)

        # Inferência para o próximo pregão usando as features do candle atual
        latest_X = latest_row[FeatureEngineer.FEATURE_COLUMNS]
        prob = float(model.predict_probability(latest_X)[0])
        signal, confidence = model.get_signal(prob)

        # Feature Importance nativo do modelo
        top_features = model.get_feature_importances(top_n=5)

        # Backtest rápido nos dados históricos
        historical_signals = pd.Series((model.predict_probability(X) >= 0.5).astype(int), index=X.index)
        backtest_res = StrategyBacktester.run_backtest(df.loc[X.index], historical_signals)

        return AnalysisResponseDTO(
            ticker=normalized_ticker,
            signal=signal,
            confidence=round(confidence, 2),
            strategy="LIGHTGBM_WALK_FORWARD_V1",
            indicators=IndicatorMetricsDTO(**indicators),
            top_features=[FeatureImportanceDTO(**f) for f in top_features],
            historical_metrics=HistoricalMetricsDTO(
                sharpe_ratio=backtest_res["strategy_sharpe"],
                max_drawdown=backtest_res["strategy_max_drawdown_pct"] / 100.0,
                win_rate=backtest_res["win_rate_pct"] / 100.0,
                baseline_sharpe=backtest_res["baseline_sharpe"],
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise quantitativa: {str(e)}")


@router.post("/api/train/{ticker}", response_model=TrainResponseDTO)
async def train_and_validate_ticker(ticker: str):
    """
    Executa o treinamento com Validação Walk-Forward (Rolling Window)
    e Backtest completo contra Baseline Buy-and-Hold.
    """
    try:
        normalized_ticker = MarketDataFetcher.normalize_ticker(ticker)
        df = MarketDataFetcher.fetch_ohlcv(normalized_ticker, period="3y")
        
        if df.empty or len(df) < 100:
            raise HTTPException(status_code=400, detail=f"Histórico insuficiente para treino de {normalized_ticker}")

        X, y, _ = FeatureEngineer.prepare_dataset(df)

        # Validação Walk-Forward
        validator = WalkForwardValidator()
        validation_res = validator.validate(X, y)

        # Treina modelo final e extrai feature importance
        model = QuantModel()
        model.train(X, y)
        top_features = model.get_feature_importances(top_n=8)

        # Backtest
        historical_signals = pd.Series((model.predict_probability(X) >= 0.5).astype(int), index=X.index)
        backtest_res = StrategyBacktester.run_backtest(df.loc[X.index], historical_signals)

        return TrainResponseDTO(
            ticker=normalized_ticker,
            validation=validation_res,
            backtest=backtest_res,
            top_features=[FeatureImportanceDTO(**f) for f in top_features]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no pipeline de validação: {str(e)}")


@router.get("/api/market/summary", response_model=List[AssetSummaryDTO])
async def get_market_summary():
    """Retorna preços atuais e variação do dia para a cesta Ibovespa."""
    results = []
    for ticker in settings.default_tickers[:10]:
        try:
            df = MarketDataFetcher.fetch_ohlcv(ticker, period="1mo")
            if len(df) >= 2:
                curr = float(df["Close"].iloc[-1])
                prev = float(df["Close"].iloc[-2])
                change = curr - prev
                pct = (change / prev) * 100
                vol = float(df["Volume"].iloc[-1])

                results.append(AssetSummaryDTO(
                    ticker=ticker,
                    current_price=round(curr, 2),
                    previous_close=round(prev, 2),
                    daily_change=round(change, 2),
                    daily_change_pct=round(pct, 2),
                    volume=vol
                ))
        except Exception:
            continue
    return results
