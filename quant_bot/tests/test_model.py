import pytest
import pandas as pd
import numpy as np
from app.data.fetcher import MarketDataFetcher
from app.features.engineer import FeatureEngineer
from app.models.model import QuantModel
from app.models.validation import WalkForwardValidator
from app.models.backtest import StrategyBacktester

def test_quant_model_training_and_inference():
    df = MarketDataFetcher.generate_synthetic_ohlcv("BBAS3.SA", days=300)
    X, y, latest_row = FeatureEngineer.prepare_dataset(df)

    model = QuantModel()
    model.train(X, y)
    assert model.is_trained

    # Predição de probabilidades
    probs = model.predict_probability(X)
    assert len(probs) == len(X)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()

    # Sinal e Confiança
    signal, conf = model.get_signal(0.65)
    assert signal == "BUY"
    assert conf == 0.65

    signal_sell, conf_sell = model.get_signal(0.35)
    assert signal_sell == "SELL"
    assert conf_sell == 0.65

    # Feature Importance
    importances = model.get_feature_importances(top_n=5)
    assert len(importances) == 5
    assert all("feature" in item and "importance" in item for item in importances)
    assert importances[0]["importance"] >= importances[-1]["importance"]

def test_walk_forward_validator():
    df = MarketDataFetcher.generate_synthetic_ohlcv("WEGE3.SA", days=400)
    X, y, _ = FeatureEngineer.prepare_dataset(df)

    validator = WalkForwardValidator(min_train_size=150, test_size=40, n_splits=3)
    results = validator.validate(X, y)

    assert results["n_folds_evaluated"] > 0
    assert "mean_accuracy" in results
    assert "mean_roc_auc" in results
    assert len(results["folds"]) == results["n_folds_evaluated"]

def test_strategy_backtester():
    df = MarketDataFetcher.generate_synthetic_ohlcv("RENT3.SA", days=250)
    # Sinais alternados sintéticos
    signals = pd.Series(np.random.choice([0, 1], size=len(df)), index=df.index)

    backtest = StrategyBacktester.run_backtest(df, signals, initial_capital=50000.0)

    assert backtest["initial_capital"] == 50000.0
    assert "strategy_return_pct" in backtest
    assert "baseline_return_pct" in backtest
    assert "strategy_sharpe" in backtest
    assert "strategy_max_drawdown_pct" in backtest
    assert backtest["total_trades"] >= 1
