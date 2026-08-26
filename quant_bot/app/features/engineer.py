import pandas as pd
import numpy as np
from typing import Tuple, List, Dict, Any

class FeatureEngineer:
    """
    Pipeline desacoplado de Engenharia de Recursos (Feature Engineering) para Trading Quantitativo.
    Gera indicadores técnicos, osciladores, volatilidades e variáveis defasadas (lags)
    sem vazamento temporal (lookahead bias).
    """

    FEATURE_COLUMNS = [
        "rsi_14",
        "ema_ratio_9_21",
        "bb_percent_b",
        "bb_bandwidth",
        "volatility_20",
        "volume_ratio",
        "return_lag_1",
        "return_lag_2",
        "return_lag_3",
        "return_lag_5",
        "hl_spread_pct"
    ]

    @classmethod
    def calculate_rsi(cls, series: pd.Series, period: int = 14) -> pd.Series:
        """Calcula o RSI (Relative Strength Index) com suavização de Wilder."""
        delta = series.diff()
        gain = delta.clip(lower=0)
        loss = -delta.clip(upper=0)
        
        avg_gain = gain.ewm(alpha=1/period, adjust=False, min_periods=period).mean()
        avg_loss = loss.ewm(alpha=1/period, adjust=False, min_periods=period).mean()
        
        rs = avg_gain / (avg_loss + 1e-9)
        rsi = 100 - (100 / (1 + rs))
        return rsi

    @classmethod
    def extract_features(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calcula o conjunto completo de features técnicas sobre o DataFrame OHLCV.
        """
        data = df.copy()
        close = data["Close"]
        high = data["High"]
        low = data["Low"]
        volume = data["Volume"]

        # 1. Retornos e Lags
        returns = close.pct_change()
        data["return_lag_1"] = returns.shift(1)
        data["return_lag_2"] = returns.shift(2)
        data["return_lag_3"] = returns.shift(3)
        data["return_lag_5"] = returns.shift(5)

        # 2. RSI (14)
        data["rsi_14"] = cls.calculate_rsi(close, period=14)

        # 3. Médias Móveis Exponenciais (9 e 21) e Spread Relativo
        data["ema_9"] = close.ewm(span=9, adjust=False).mean()
        data["ema_21"] = close.ewm(span=21, adjust=False).mean()
        data["ema_ratio_9_21"] = (data["ema_9"] - data["ema_21"]) / data["ema_21"]

        # 4. Bandas de Bollinger (20 períodos, 2 desvios)
        sma_20 = close.rolling(window=20).mean()
        std_20 = close.rolling(window=20).std()
        upper_band = sma_20 + 2 * std_20
        lower_band = sma_20 - 2 * std_20
        
        data["bb_percent_b"] = (close - lower_band) / ((upper_band - lower_band) + 1e-9)
        data["bb_bandwidth"] = (upper_band - lower_band) / sma_20

        # 5. Volatilidade Realizada Anualizada (20 pregões)
        data["volatility_20"] = returns.rolling(window=20).std() * np.sqrt(252)

        # 6. Volume Ratio (Volume atual vs Média de 20 pregões)
        vol_sma_20 = volume.rolling(window=20).mean()
        data["volume_ratio"] = volume / (vol_sma_20 + 1e-9)

        # 7. Spread High-Low Percentual
        data["hl_spread_pct"] = (high - low) / close

        return data

    @classmethod
    def prepare_dataset(
        cls,
        df: pd.DataFrame,
        target_threshold: float = 0.001
    ) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
        """
        Prepara a matriz de treino X e vetor y, além de retornar a última linha para inferência em tempo real.
        y_t = 1 se o retorno do próximo candle (t+1) for superior a target_threshold, senão 0.
        """
        data = cls.extract_features(df)

        # Target forward: retorno do próximo dia (Close[t+1] - Close[t]) / Close[t]
        next_returns = data["Close"].pct_change().shift(-1)
        data["target"] = (next_returns > target_threshold).astype(int)

        # Linha mais recente (t = hoje), onde target é NaN (pois t+1 ainda não aconteceu)
        latest_row = data.iloc[[-1]].copy()

        # Dados históricos com target válido e sem NaNs nas features
        train_data = data.iloc[:-1].dropna(subset=cls.FEATURE_COLUMNS + ["target"]).copy()

        X = train_data[cls.FEATURE_COLUMNS]
        y = train_data["target"].astype(int)

        return X, y, latest_row

    @classmethod
    def get_latest_indicators(cls, latest_row: pd.DataFrame) -> Dict[str, Any]:
        """Extrai resumo numérico dos indicadores no último candle para o backend e Gemini."""
        row = latest_row.iloc[0]
        return {
            "close_price": round(float(row["Close"]), 2),
            "rsi_14": round(float(row["rsi_14"]), 2) if not pd.isna(row["rsi_14"]) else 50.0,
            "sma_9": round(float(row["ema_9"]), 2) if not pd.isna(row["ema_9"]) else round(float(row["Close"]), 2),
            "sma_21": round(float(row["ema_21"]), 2) if not pd.isna(row["ema_21"]) else round(float(row["Close"]), 2),
            "ema_delta": round(float(row["ema_ratio_9_21"] * 100), 2) if not pd.isna(row["ema_ratio_9_21"]) else 0.0,
            "volatility_20": round(float(row["volatility_20"]), 4) if not pd.isna(row["volatility_20"]) else 0.02,
            "volume_ratio": round(float(row["volume_ratio"]), 2) if not pd.isna(row["volume_ratio"]) else 1.0,
            "bb_percent_b": round(float(row["bb_percent_b"]), 2) if not pd.isna(row["bb_percent_b"]) else 0.5,
        }
