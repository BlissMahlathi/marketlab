# MarketLab — Personal Trading Research & Backtesting Terminal

A private, extensible web platform to study historical financial markets, replay price movements, analyse market structure, draw technical analysis objects, simulate trades, develop strategies, and measure trading performance.

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Chart Engine**: TradingView Lightweight Charts (v5) + Custom Coordinate-Anchored SVG Drawing Layer
- **Backend**: Python 3.12 + FastAPI + SQLite + Parquet/CSV Historical Ingestion
- **Replay Engine**: State Machine with strict **No-Lookahead Protection** (future bars remain completely inaccessible to calculations and charts until revealed)
- **Trade Simulator**: Paper trade execution with live pip calculation, Stop Loss, Take Profit, and Risk-to-Reward tracking.
- **Journal**: Integrated setup analysis, emotional notes, and market structure tracking.

---

## Directory Structure

```text
marketlab/
├── frontend/                     # React + TypeScript + Tailwind CSS UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── chart/           # AdvancedChart with Lightweight Charts v5
│   │   │   ├── drawing-tools/   # Left toolbar (Trendline, Box, Long/Short, BOS, CHoCH, FVG)
│   │   │   ├── replay/          # ReplayController dock (Play, Step, Speed, Time scrubber)
│   │   │   └── panels/          # Trade Simulator & Journal Docks
│   │   ├── types/               # Universal market data and session schemas
│   │   └── App.tsx              # Main Dark Trading Terminal View
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── core/                # Database engine & SQLite connection management
│   │   ├── market_data/         # Candle loaders, CSV/Parquet adapters
│   │   ├── replay/              # Deterministic Replay Engine
│   │   └── main.py              # REST API & WebSocket endpoints
├── data/
│   ├── candles/                 # Normalized historical candle data (EURUSD, GBPUSD, BTCUSDT)
│   ├── ticks/                   # High-resolution tick datasets
│   └── raw/                     # Original external provider downloads
├── migrations/
│   └── 001_initial_schema.sql   # Production SQLite schema for instruments, drawings, trades, journals
└── scripts/
    ├── generate_sample_data.py  # Realistic Forex/Crypto historical data generator
    └── start.sh                 # One-click startup script for both backend & frontend
```

---

## Quickstart

### 1. Launch MarketLab
To start both the FastAPI backend and React frontend:
```bash
./scripts/start.sh
```

- Frontend Terminal: [http://localhost:3000](http://localhost:3000) (or available Vite port)
- Backend REST API: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Interactive API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Key Features in Milestone 1 (MarketLab Core)

1. **Deterministic Replay Studio**:
   - Replay speed controls (`0.5x`, `1.0x`, `2.0x`, `5.0x`).
   - Step forward bar-by-bar, step backward, or jump using the timeline scrubber.
   - Simulation clock displaying exact historical timestamp in UTC.
   - Strict no-lookahead isolation.

2. **Technical Analysis & Drawing Engine**:
   - **Trendlines**: Multi-point lines anchored in time and price.
   - **Horizontal S&R**: Immediate level projection.
   - **Supply / Demand Boxes**: Translucent zone rectangles.
   - **Market Structure Markers**: BOS (Break of Structure) & CHoCH (Change of Character).
   - **FVG Zones**: Fair Value Gap boxes.
   - **Long / Short Position Overlays**: Visual Stop Loss, Entry, and Take Profit targets with live Risk:Reward ratio calculation.

3. **Simulated Execution & Journal**:
   - Market orders (BUY / SELL) with custom lots, Stop Loss, and Take Profit.
   - Live PnL updates and position close tracking.
   - Setup journal to record trade rationale, market bias, and post-trade reviews.
