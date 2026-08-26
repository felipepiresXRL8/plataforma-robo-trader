import pytest
import pandas as pd
import numpy as np
from app.data.fetcher import MarketDataFetcher
from app.features.engineer import FeatureEngineer

def test_market_data_fetcher_synthetic_generation():
    df = MarketDataFetcher.generate_synthetic_ohlcv("PETR4.SA", days=200)
    assert len(df) == 200
    assert all(col in df.columns for col in ["Open", "High", "Low", "Close", "Volume"])
    assert (df["High"] >= df["Low"]).all()
    assert (df["Volume"] > 0).all()

def test_feature_engineering_indicators_calculation():
    df = MarketDataFetcher.generate_synthetic_ohlcv("VALE3.SA", days=250)
    features_df = FeatureEngineer.extract_features(df)

    for col in FeatureEngineer.FEATURE_COLUMNS:
        assert col in features_df.columns, f"Feature {col} não encontrada"

    # Validação do RSI
    rsi = features_df["rsi_14"].dropna()
    assert (rsi >= 0).all() and (rsi <= 100).all(), "RSI fora dos limites [0, 100]"

    # Validação das Bandas de Bollinger
    bb_b = features_df["bb_percent_b"].dropna()
    assert len(bb_b) > 0

    # Validação de Volatilidade
    vol = features_df["volatility_20"].dropna()
    assert (vol >= 0).all(), "Volatilidade não pode ser negativa"

def test_prepare_dataset_prevents_lookahead_bias():
    df = MarketDataFetcher.generate_synthetic_ohlcv("ITUB4.SA", days=300)
    X, y, latest_row = FeatureEngineer.prepare_dataset(df)

    # X e y devem ter o mesmo tamanho e não conter NaNs
    assert len(X) == len(y)
    assert not X.isna().any().any()
    assert not y.isna().any()

    # O target deve ser estritamente binário (0 ou 1)
    assert set(np.unique(y)).issubset({0, 1})

    # A linha mais recente deve ter as features calculadas mas ser excluída do treino
    assert len(latest_row) == 1
    for feat in FeatureEngineer.FEATURE_COLUMNS:
        assert feat in latest_row.columns
