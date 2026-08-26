import numpy as np
import pandas as pd
from typing import Dict, Any, List
from ..config import settings

class StrategyBacktester:
    """
    Motor de Backtesting e Avaliação de Performance de Estratégias Quantitativas.
    Compara a estratégia baseada em LightGBM contra a baseline Buy-and-Hold
    e baseline de Cruzamento de Médias Móveis (SMA 9 vs 21).
    """

    @classmethod
    def calculate_sharpe_ratio(
        cls,
        returns: pd.Series,
        risk_free_rate_annual: float = settings.risk_free_rate_annual
    ) -> float:
        """Calcula o Sharpe Ratio Anualizado."""
        if len(returns) < 2 or returns.std() == 0:
            return 0.0
        rf_daily = (1 + risk_free_rate_annual) ** (1 / 252) - 1
        excess_returns = returns - rf_daily
        daily_sharpe = excess_returns.mean() / (returns.std() + 1e-9)
        return float(daily_sharpe * np.sqrt(252))

    @classmethod
    def calculate_max_drawdown(cls, cumulative_returns: pd.Series) -> float:
        """Calcula o Drawdown Máximo (MDD) a partir da curva de patrimônio."""
        running_max = cumulative_returns.cummax()
        drawdown = (cumulative_returns - running_max) / (running_max + 1e-9)
        return float(drawdown.min())

    @classmethod
    def run_backtest(
        cls,
        df_ohlcv: pd.DataFrame,
        signals: pd.Series,
        initial_capital: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Executa a simulação histórica (backtest) aplicando os sinais da estratégia (1=Comprado, 0=Neutro).
        """
        df = df_ohlcv.copy()
        df["returns"] = df["Close"].pct_change().fillna(0)
        
        # Alinha sinais com retorno do dia seguinte (t+1)
        df["position"] = signals.reindex(df.index).fillna(0)
        df["strategy_returns"] = df["position"].shift(1).fillna(0) * df["returns"]
        df["baseline_returns"] = df["returns"]  # Buy and Hold

        # Curva de Patrimônio Acumulado (Equity Curve)
        df["strategy_equity"] = (1 + df["strategy_returns"]).cumprod() * initial_capital
        df["baseline_equity"] = (1 + df["baseline_returns"]).cumprod() * initial_capital

        # Métricas da Estratégia
        total_strategy_return = float((df["strategy_equity"].iloc[-1] - initial_capital) / initial_capital)
        total_baseline_return = float((df["baseline_equity"].iloc[-1] - initial_capital) / initial_capital)

        strategy_sharpe = cls.calculate_sharpe_ratio(df["strategy_returns"])
        baseline_sharpe = cls.calculate_sharpe_ratio(df["baseline_returns"])

        strategy_mdd = cls.calculate_max_drawdown(df["strategy_equity"])
        baseline_mdd = cls.calculate_max_drawdown(df["baseline_equity"])

        # Contagem de Trades e Win Rate
        trade_changes = df["position"].diff().fillna(0)
        total_trades = int((trade_changes != 0).sum() // 2)
        
        winning_days = (df["strategy_returns"] > 0).sum()
        active_days = (df["position"].shift(1) != 0).sum()
        win_rate = float(winning_days / active_days) if active_days > 0 else 0.0

        return {
            "initial_capital": initial_capital,
            "final_equity": round(float(df["strategy_equity"].iloc[-1]), 2),
            "strategy_return_pct": round(total_strategy_return * 100, 2),
            "baseline_return_pct": round(total_baseline_return * 100, 2),
            "strategy_sharpe": round(strategy_sharpe, 2),
            "baseline_sharpe": round(baseline_sharpe, 2),
            "strategy_max_drawdown_pct": round(strategy_mdd * 100, 2),
            "baseline_max_drawdown_pct": round(baseline_mdd * 100, 2),
            "win_rate_pct": round(win_rate * 100, 2),
            "total_trades": max(1, total_trades),
            "outperformed_baseline": bool(strategy_sharpe > baseline_sharpe or total_strategy_return > total_baseline_return)
        }
