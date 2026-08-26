import os
from pydantic import BaseModel

class QuantBotConfig(BaseModel):
    # API & Host
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Hiperparâmetros de Regularização do LightGBM (otimizados para conter overfitting em finanças)
    max_depth: int = 4
    num_leaves: int = 15
    learning_rate: float = 0.03
    n_estimators: int = 120
    min_child_samples: int = 20
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    reg_alpha: float = 0.1   # Regularização L1
    reg_lambda: float = 1.0  # Regularização L2
    random_state: int = 42

    # Thresholds de Decisão de Sinal
    buy_threshold: float = 0.54
    sell_threshold: float = 0.46

    # Validação Walk-Forward
    n_splits: int = 5
    min_train_size: int = 252  # ~1 ano de pregões para janela inicial de treino
    test_size: int = 63        # ~1 trimestre para teste out-of-sample por janela

    # Risk-Free Rate para cálculo de Sharpe Anualizado (CDI / Selic ~ 10.5% a.a.)
    risk_free_rate_annual: float = 0.105

    # Tickers padrão do Ibovespa
    default_tickers: list[str] = [
        "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
        "WEGE3.SA", "RENT3.SA", "ABEV3.SA", "MGLU3.SA", "B3SA3.SA",
        "PRIO3.SA", "RADL3.SA", "EQTL3.SA", "SUZB3.SA", "GGBR4.SA"
    ]

settings = QuantBotConfig()
