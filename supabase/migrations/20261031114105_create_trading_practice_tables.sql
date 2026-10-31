/*
# Create Trading Practice Tables

This migration creates the core tables for the MarketLab trading practice app.
Since the app has no sign-in screen, this is a single-tenant schema where
the anon-key frontend can read/write all data.

## New Tables

1. **trades** — Simulated/paper trades placed during practice sessions
   - id: auto-incrementing primary key
   - symbol: the instrument traded (e.g. BTC/USD)
   - direction: 'buy' or 'sell'
   - entry_price: price at trade open
   - entry_time: timestamp of entry
   - exit_price: price at trade close (nullable)
   - exit_time: timestamp of exit (nullable)
   - stop_loss: SL price level (nullable)
   - take_profit: TP price level (nullable)
   - quantity: lot size
   - pnl: profit/loss in currency on close
   - pnl_percentage: percentage P/L on close
   - status: 'open' or 'closed'
   - exit_reason: why the trade was closed (nullable)
   - created_at: record creation time

2. **journal_entries** — Trading journal notes and observations
   - id: auto-incrementing primary key
   - title: short title of the entry
   - content: full text of the observation/note
   - entry_type: category (trade_note, market_structure, mistake_review, rule_check)
   - symbol: instrument this note relates to (nullable)
   - replay_time: historical timestamp the note was made at (nullable)
   - trade_id: link to a specific trade (nullable, FK to trades)
   - created_at: record creation time

3. **drawings** — Chart drawing objects (trendlines, zones, etc.)
   - id: text primary key (UUID generated client-side)
   - symbol: instrument the drawing belongs to
   - object_type: type of drawing (trendline, rectangle, bos, etc.)
   - anchor_data: JSON array of {time, price} points
   - style_data: JSON object for color and style properties
   - created_at: record creation time

## Security
- RLS enabled on all tables.
- CRUD granted to `anon, authenticated` since this is a no-auth single-tenant app.
- Policies allow all CRUD for anon + authenticated (data is intentionally shared).
*/

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id bigserial PRIMARY KEY,
  symbol text NOT NULL DEFAULT 'BTC/USD',
  direction text NOT NULL CHECK (direction IN ('buy', 'sell')),
  entry_price double precision NOT NULL,
  entry_time timestamptz NOT NULL,
  exit_price double precision,
  exit_time timestamptz,
  stop_loss double precision,
  take_profit double precision,
  quantity double precision NOT NULL DEFAULT 1.0,
  pnl double precision DEFAULT 0,
  pnl_percentage double precision DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  exit_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON trades TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_trades" ON trades;
CREATE POLICY "anon_select_trades" ON trades FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trades" ON trades;
CREATE POLICY "anon_insert_trades" ON trades FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trades" ON trades;
CREATE POLICY "anon_update_trades" ON trades FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trades" ON trades;
CREATE POLICY "anon_delete_trades" ON trades FOR DELETE
  TO anon, authenticated USING (true);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id bigserial PRIMARY KEY,
  title text NOT NULL DEFAULT 'Untitled',
  content text NOT NULL DEFAULT '',
  entry_type text NOT NULL DEFAULT 'trade_note',
  symbol text,
  replay_time timestamptz,
  trade_id bigint REFERENCES trades(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_journal" ON journal_entries;
CREATE POLICY "anon_select_journal" ON journal_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_journal" ON journal_entries;
CREATE POLICY "anon_insert_journal" ON journal_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_journal" ON journal_entries;
CREATE POLICY "anon_update_journal" ON journal_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_journal" ON journal_entries;
CREATE POLICY "anon_delete_journal" ON journal_entries FOR DELETE
  TO anon, authenticated USING (true);

-- Drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id text PRIMARY KEY,
  symbol text NOT NULL,
  object_type text NOT NULL,
  anchor_data jsonb NOT NULL DEFAULT '[]',
  style_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON drawings TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_drawings" ON drawings;
CREATE POLICY "anon_select_drawings" ON drawings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_drawings" ON drawings;
CREATE POLICY "anon_insert_drawings" ON drawings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_drawings" ON drawings;
CREATE POLICY "anon_update_drawings" ON drawings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_drawings" ON drawings;
CREATE POLICY "anon_delete_drawings" ON drawings FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_symbol ON journal_entries(symbol);
CREATE INDEX IF NOT EXISTS idx_drawings_symbol ON drawings(symbol);
