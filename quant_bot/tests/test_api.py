import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["engine"] == "LightGBM"

def test_analyze_ticker_endpoint():
    response = client.post("/api/analyze/PETR4.SA")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "PETR4.SA"
    assert data["signal"] in ["BUY", "SELL", "HOLD"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert "indicators" in data
    assert "rsi_14" in data["indicators"]
    assert len(data["top_features"]) > 0

def test_train_ticker_endpoint():
    response = client.post("/api/train/VALE3.SA")
    assert response.status_code == 200
    data = response.json()
    assert data["ticker"] == "VALE3.SA"
    assert "validation" in data
    assert "backtest" in data
    assert "mean_accuracy" in data["validation"]
