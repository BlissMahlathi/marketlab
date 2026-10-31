-- migrations/001_initial_schema.sql
-- Basic schema for MarketLab

CREATE TABLE IF NOT EXISTS instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT
);

CREATE TABLE IF NOT EXISTS drawing_objects (
    id TEXT PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    object_type TEXT NOT NULL,
    anchor_data_json TEXT NOT NULL,
    style_json TEXT DEFAULT '{}',
    layer_order INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    direction TEXT NOT NULL,
    entry_time TEXT NOT NULL,
    entry_price REAL NOT NULL,
    stop_loss REAL,
    take_profit REAL,
    quantity REAL NOT NULL,
    risk_amount REAL,
    status TEXT NOT NULL,
    exit_price REAL,
    exit_time TEXT,
    exit_reason TEXT,
    pnl REAL,
    pnl_percentage REAL,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    trade_id INTEGER,
    title TEXT NOT NULL,
    content TEXT,
    entry_type TEXT DEFAULT 'trade_note',
    event_time TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id)
);
