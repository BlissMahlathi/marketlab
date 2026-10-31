-- MarketLab Core Schema v1.0
PRAGMA foreign_keys = ON;

-- 1. DATA PROVIDERS
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    provider_type TEXT NOT NULL, -- e.g. 'csv', 'dukascopy', 'databento', 'ccxt'
    base_url TEXT,
    config_json TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. INSTRUMENTS
CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    name TEXT,
    asset_class TEXT NOT NULL, -- 'forex', 'crypto', 'stocks', 'futures', 'indices'
    exchange TEXT DEFAULT 'GENERIC',
    provider_symbol TEXT,
    base_currency TEXT,
    quote_currency TEXT,
    tick_size REAL DEFAULT 0.00001,
    lot_size REAL DEFAULT 100000.0,
    contract_multiplier REAL DEFAULT 1.0,
    price_precision INTEGER DEFAULT 5,
    timezone TEXT DEFAULT 'UTC',
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, exchange)
);

-- 3. HISTORICAL DATASETS
CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL,
    provider_id INTEGER,
    dataset_name TEXT NOT NULL,
    data_type TEXT NOT NULL, -- 'candle' or 'tick'
    timeframe TEXT NOT NULL, -- '1m', '5m', '15m', '1h', '4h', '1d', 'tick'
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    timestamp_unit TEXT DEFAULT 's',
    price_basis TEXT DEFAULT 'mid', -- 'bid', 'ask', 'mid', 'trade'
    licence_info TEXT,
    status TEXT DEFAULT 'ready',
    FOREIGN KEY(instrument_id) REFERENCES instruments(id) ON DELETE CASCADE,
    FOREIGN KEY(provider_id) REFERENCES providers(id)
);

-- 4. PHYSICAL DATA FILES
CREATE TABLE IF NOT EXISTS data_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_format TEXT NOT NULL, -- 'parquet' or 'csv'
    record_count INTEGER DEFAULT 0,
    file_size_bytes INTEGER DEFAULT 0,
    checksum TEXT,
    start_time TEXT,
    end_time TEXT,
    FOREIGN KEY(dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

-- 5. WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    default_instrument_id INTEGER,
    settings_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(default_instrument_id) REFERENCES instruments(id)
);

-- 6. CHART LAYOUTS
CREATE TABLE IF NOT EXISTS chart_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    instrument_id INTEGER NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '15m',
    chart_type TEXT DEFAULT 'candlestick',
    settings_json TEXT DEFAULT '{}',
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(instrument_id) REFERENCES instruments(id)
);

-- 7. DRAWING OBJECTS
CREATE TABLE IF NOT EXISTS drawing_objects (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    chart_layout_id INTEGER,
    instrument_id INTEGER NOT NULL,
    object_type TEXT NOT NULL, -- 'trendline', 'horizontal_line', 'rectangle', 'position_long', 'position_short', 'bos', 'choch', 'fvg'
    anchor_data_json TEXT NOT NULL, -- Time & price coordinates
    style_json TEXT DEFAULT '{}',
    locked INTEGER DEFAULT 0,
    visible INTEGER DEFAULT 1,
    layer_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(chart_layout_id) REFERENCES chart_layouts(id),
    FOREIGN KEY(instrument_id) REFERENCES instruments(id)
);

-- 8. REPLAY SESSIONS
CREATE TABLE IF NOT EXISTS replay_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    dataset_id INTEGER,
    replay_mode TEXT NOT NULL DEFAULT 'candle', -- 'candle' or 'tick'
    timeframe TEXT NOT NULL DEFAULT '15m',
    start_time TEXT NOT NULL,
    cursor_time TEXT NOT NULL,
    cursor_index INTEGER DEFAULT 0,
    speed REAL DEFAULT 1.0,
    status TEXT DEFAULT 'ready', -- 'ready', 'playing', 'paused', 'completed'
    state_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(instrument_id) REFERENCES instruments(id),
    FOREIGN KEY(dataset_id) REFERENCES datasets(id)
);

-- 9. REPLAY EVENT LOG
CREATE TABLE IF NOT EXISTS replay_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    replay_session_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_time TEXT NOT NULL,
    event_payload_json TEXT,
    FOREIGN KEY(replay_session_id) REFERENCES replay_sessions(id) ON DELETE CASCADE
);

-- 10. SIMULATED TRADES
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    replay_session_id INTEGER,
    direction TEXT NOT NULL, -- 'buy' or 'sell'
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    entry_price REAL NOT NULL,
    exit_price REAL,
    stop_loss REAL,
    take_profit REAL,
    quantity REAL NOT NULL DEFAULT 1.0,
    risk_amount REAL,
    pnl REAL DEFAULT 0.0,
    pnl_percentage REAL DEFAULT 0.0,
    status TEXT DEFAULT 'open', -- 'open', 'closed', 'cancelled'
    exit_reason TEXT, -- 'tp', 'sl', 'manual', 'market_close'
    result_json TEXT DEFAULT '{}',
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(instrument_id) REFERENCES instruments(id),
    FOREIGN KEY(replay_session_id) REFERENCES replay_sessions(id)
);

-- 11. JOURNAL
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    replay_session_id INTEGER,
    trade_id INTEGER,
    title TEXT,
    content TEXT NOT NULL,
    entry_type TEXT DEFAULT 'note', -- 'trade_note', 'daily_plan', 'mistake_review'
    event_time TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(replay_session_id) REFERENCES replay_sessions(id),
    FOREIGN KEY(trade_id) REFERENCES trades(id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_datasets_instrument ON datasets(instrument_id);
CREATE INDEX IF NOT EXISTS idx_replay_session_time ON replay_events(replay_session_id, event_time);
CREATE INDEX IF NOT EXISTS idx_trades_workspace ON trades(workspace_id);
CREATE INDEX IF NOT EXISTS idx_drawings_workspace ON drawing_objects(workspace_id);
