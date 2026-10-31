#!/bin/bash
set -e

echo "=========================================="
echo "    Starting MarketLab Services"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Initialize SQLite Database if missing
if [ ! -f "marketlab.db" ]; then
    echo "[1/4] Initializing SQLite database marketlab.db..."
    python3 scripts/generate_sample_data.py
    python3 -c "
import sqlite3
con = sqlite3.connect('marketlab.db')
with open('migrations/001_initial_schema.sql', 'r') as f:
    con.executescript(f.read())
con.commit()
con.close()
"
fi

# 2. Check sample candles

# Ensure no stray Vite ports are occupying the range 3000‑3422
if [ -f "$(dirname "${BASH_SOURCE[0]}")/kill_ports.sh" ]; then
  echo "[0/4] Cleaning up occupied ports..."
  bash "$(dirname "${BASH_SOURCE[0]}")/kill_ports.sh"
fi
if [ ! -f "data/candles/EURUSD_15m.csv" ]; then
    echo "[2/4] Generating sample Forex & Crypto historical candles..."
    python3 scripts/generate_sample_data.py
fi

# 3. Start Backend FastAPI Server (Port 8000)
echo "[3/4] Launching FastAPI Backend on http://127.0.0.1:8000..."
./backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend running with PID $BACKEND_PID"

# 4. Start Frontend Vite Terminal (Port 5173 or 3000)
echo "[4/4] Launching Frontend Trading Terminal..."
cd frontend
npx vite --host 0.0.0.0 --port 3000
