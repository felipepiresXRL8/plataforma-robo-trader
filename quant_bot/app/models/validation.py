import numpy as np
import pandas as pd
from typing import Dict, List, Any
from sklearn.metrics import roc_auc_score, accuracy_score, log_loss
from .model import QuantModel
from ..config import settings

class WalkForwardValidator:
    """
    Validação Walk-Forward (Rolling/Expanding Window) para séries temporais financeiras.
    Evita vazamento de dados (Lookahead Bias / Data Leakage) treinando estritamente
    no passado e avaliando em janelas out-of-sample sequenciais.
    """

    def __init__(
        self,
        min_train_size: int = settings.min_train_size,
        test_size: int = settings.test_size,
        n_splits: int = settings.n_splits
    ):
        self.min_train_size = min_train_size
        self.test_size = test_size
        self.n_splits = n_splits

    def validate(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        n_samples = len(X)
        required_samples = self.min_train_size + (self.n_splits * self.test_size)

        # Ajusta parâmetros caso a amostra histórica seja menor
        if n_samples < required_samples:
            effective_test_size = max(20, (n_samples - self.min_train_size) // self.n_splits)
            test_size = effective_test_size if effective_test_size > 0 else 20
        else:
            test_size = self.test_size

        fold_metrics: List[Dict[str, Any]] = []
        all_y_true = []
        all_y_pred_prob = []

        for fold in range(self.n_splits):
            train_end = n_samples - ((self.n_splits - fold) * test_size)
            test_end = train_end + test_size

            if train_end < 60 or test_end > n_samples:
                continue

            X_train = X.iloc[:train_end]
            y_train = y.iloc[:train_end]
            X_test = X.iloc[train_end:test_end]
            y_test = y.iloc[train_end:test_end]

            # Treina modelo isolado no passado estrito da janela
            model = QuantModel()
            model.train(X_train, y_train)

            probs = model.predict_probability(X_test)
            preds = (probs >= 0.5).astype(int)

            acc = accuracy_score(y_test, preds)
            auc = roc_auc_score(y_test, probs) if len(np.unique(y_test)) > 1 else 0.5

            fold_metrics.append({
                "fold": fold + 1,
                "train_samples": len(X_train),
                "test_samples": len(X_test),
                "accuracy": round(float(acc), 4),
                "roc_auc": round(float(auc), 4),
            })

            all_y_true.extend(y_test.tolist())
            all_y_pred_prob.extend(probs.tolist())

        mean_acc = np.mean([f["accuracy"] for f in fold_metrics]) if fold_metrics else 0.5
        mean_auc = np.mean([f["roc_auc"] for f in fold_metrics]) if fold_metrics else 0.5

        return {
            "validation_type": "Walk-Forward (Rolling Window)",
            "n_folds_evaluated": len(fold_metrics),
            "mean_accuracy": round(float(mean_acc), 4),
            "mean_roc_auc": round(float(mean_auc), 4),
            "folds": fold_metrics,
        }
