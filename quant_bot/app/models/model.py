import lightgbm as lgb
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from ..config import settings
from ..features.engineer import FeatureEngineer

class QuantModel:
    """
    Modelo de Classificação Estatística baseado em Gradient Boosting (LightGBM).
    Regularizado com max_depth, num_leaves, reg_alpha (L1) e reg_lambda (L2).
    """

    def __init__(self, config=settings):
        self.config = config
        self.model = lgb.LGBMClassifier(
            max_depth=config.max_depth,
            num_leaves=config.num_leaves,
            learning_rate=config.learning_rate,
            n_estimators=config.n_estimators,
            min_child_samples=config.min_child_samples,
            subsample=config.subsample,
            colsample_bytree=config.colsample_bytree,
            reg_alpha=config.reg_alpha,
            reg_lambda=config.reg_lambda,
            random_state=config.random_state,
            verbosity=-1,
            force_col_wise=True
        )
        self.is_trained = False
        self.feature_names: List[str] = FeatureEngineer.FEATURE_COLUMNS

    def train(self, X: pd.DataFrame, y: pd.Series) -> None:
        """Treina o classificador LightGBM nos dados fornecidos."""
        self.model.fit(X[self.feature_names], y)
        self.is_trained = True

    def predict_probability(self, X: pd.DataFrame) -> np.ndarray:
        """Retorna a probabilidade P(alta) = P(y=1) para cada linha."""
        if not self.is_trained:
            raise ValueError("O modelo precisa ser treinado antes de gerar previsões.")
        probs = self.model.predict_proba(X[self.feature_names])
        return probs[:, 1]

    def get_signal(self, prob: float) -> Tuple[str, float]:
        """
        Determina o sinal (BUY, SELL, HOLD) com base nos limiares de probabilidade.
        """
        if prob >= self.config.buy_threshold:
            return "BUY", prob
        elif prob <= self.config.sell_threshold:
            return "SELL", 1.0 - prob
        else:
            confidence = max(prob, 1.0 - prob)
            return "HOLD", confidence

    def get_feature_importances(self, top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Extrai o Feature Importance nativo (Gain/Split) do LightGBM normalizado.
        """
        if not self.is_trained:
            return []

        importances = self.model.feature_importances_
        total = sum(importances) + 1e-9
        normalized = [round(float(imp / total), 4) for imp in importances]

        feature_imp_pairs = [
            {"feature": feat, "importance": imp}
            for feat, imp in zip(self.feature_names, normalized)
        ]
        
        # Ordena do mais importante para o menos importante
        feature_imp_pairs.sort(key=lambda x: x["importance"], reverse=True)
        return feature_imp_pairs[:top_n]
