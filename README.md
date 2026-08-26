# Plataforma de Trading + Robô Quant + Agente de IA

Sistema completo de análise quantitativa, execução de estratégias de trading e geração de teses de investimento com IA generativa para ativos da B3.

## Arquitetura do Sistema

- **Backend:** Node.js + TypeScript + Express com Arquitetura em Camadas (Layered/Clean Architecture) e persistência SQL pura em SQLite.
- **Robô Quant:** Microserviço Python (FastAPI) com pipeline de Feature Engineering (RSI, EMAs, Volatilidade, Lags) e modelo de Machine Learning (LightGBM) treinado via Walk-Forward Validation.
- **Camada de IA:** Integração com a API do Google Gemini gerando justificativas técnicas fundamentadas em métricas quantitativas reais.
- **Frontend:** Single Page Application em React + TypeScript + Tailwind CSS + TradingView Lightweight Charts estilo home broker.

## Módulos

- `/backend`: API REST, orquestração, regras de negócio e camada de acesso a dados SQL.
- `/quant_bot`: Ingestão de dados de mercado (yfinance), feature engineering, treinamento do modelo e backtesting.
- `/frontend`: Interface visual para visualização de ativos, gráficos e execução de análises.
