-- ====================================================================
-- PLATAFORMA DE TRADING - SCHEMA SQL (SQLite)
-- Suporte a integridade referencial, índices compostos e tipos tipados
-- ====================================================================

-- 1. Tabela de Ativos Cadastrados
CREATE TABLE IF NOT EXISTS assets (
    ticker TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    sector TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Preços Históricos (OHLCV)
CREATE TABLE IF NOT EXISTS historical_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticker) REFERENCES assets(ticker) ON DELETE CASCADE,
    UNIQUE(ticker, timestamp)
);

-- Índice composto para consultas rápidas de séries temporais ordenadas
CREATE INDEX IF NOT EXISTS idx_prices_ticker_timestamp 
ON historical_prices (ticker, timestamp DESC);

-- 3. Tabela de Sinais Gerados pelo Robô Estatístico
CREATE TABLE IF NOT EXISTS trade_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
    confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    strategy TEXT NOT NULL,
    features_json TEXT NOT NULL, -- JSON com indicadores calculados e feature importance
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticker) REFERENCES assets(ticker) ON DELETE CASCADE
);

-- Índice para recuperar rapidamente o último sinal gerado para um ativo
CREATE INDEX IF NOT EXISTS idx_signals_ticker_created 
ON trade_signals (ticker, created_at DESC);

-- 4. Tabela de Ordens / Trades Executados (Paper Trading ou Real)
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    signal_id INTEGER,
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
    price REAL NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL CHECK (status IN ('FILLED', 'CANCELLED', 'PENDING')) DEFAULT 'FILLED',
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticker) REFERENCES assets(ticker) ON DELETE CASCADE,
    FOREIGN KEY (signal_id) REFERENCES trade_signals(id) ON DELETE SET NULL
);

-- Índice para histórico de ordens por ativo
CREATE INDEX IF NOT EXISTS idx_trades_ticker_date 
ON trades (ticker, executed_at DESC);

-- 5. Tabela de Justificativas Geradas por IA (Google Gemini)
CREATE TABLE IF NOT EXISTS ai_justifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_id INTEGER NOT NULL UNIQUE,
    ticker TEXT NOT NULL,
    justification_text TEXT NOT NULL,
    model_used TEXT NOT NULL,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('BULLISH', 'BEARISH', 'NEUTRAL')),
    risk_factors TEXT NOT NULL, -- Array JSON com principais riscos
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (signal_id) REFERENCES trade_signals(id) ON DELETE CASCADE,
    FOREIGN KEY (ticker) REFERENCES assets(ticker) ON DELETE CASCADE
);

-- Índice para buscar justificativas por sinal e ativo
CREATE INDEX IF NOT EXISTS idx_justifications_signal 
ON ai_justifications (signal_id);
