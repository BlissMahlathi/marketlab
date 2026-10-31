from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import uuid

from app.core.database import query_all, query_one, execute_write
from app.market_data.data_service import get_instrument_candles, PARQUET_DIR
from app.replay.engine import get_or_create_replay_session, replay_sessions

app = FastAPI(title="MarketLab API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- INSTRUMENTS & WATCHLIST -----------------
@app.get("/api/instruments")
def list_instruments():
    return query_all("SELECT * FROM instruments ORDER BY id ASC")

@app.get("/api/instruments/{symbol:path}/candles")
def get_candles(symbol: str, timeframe: str = "15m", refresh: bool = False):
    candles = get_instrument_candles(symbol, timeframe, force_refresh=refresh)
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "count": len(candles),
        "candles": candles
    }

# ----------------- REPLAY CONTROL -----------------
class ReplayInitRequest(BaseModel):
    session_id: Optional[str] = None
    symbol: str = "EUR/USD"
    timeframe: str = "15m"
    start_index: int = 150

class ReplayActionRequest(BaseModel):
    action: str # 'step_forward', 'step_backward', 'seek', 'reset', 'set_speed', 'set_status'
    param: Optional[Any] = None

@app.post("/api/replay/init")
def init_replay(req: ReplayInitRequest):
    sess_id = req.session_id or f"sess_{uuid.uuid4().hex[:8]}"
    candles = get_instrument_candles(req.symbol, req.timeframe)
    if not candles:
        raise HTTPException(status_code=404, detail="No historical data found for instrument")
        
    session = get_or_create_replay_session(sess_id, req.symbol, req.timeframe, candles, req.start_index)
    return {
        "session": session.to_dict(),
        "visible_candles": session.visible_candles()
    }

@app.post("/api/replay/{session_id}/action")
def replay_action(session_id: str, action_data: ReplayActionRequest):
    if session_id not in replay_sessions:
        raise HTTPException(status_code=404, detail="Replay session not found")
    
    session = replay_sessions[session_id]
    action = action_data.action
    param = action_data.param

    revealed_candle = None
    if action == "step_forward":
        count = int(param) if param else 1
        revealed_candle = session.step_forward(count)
    elif action == "step_backward":
        count = int(param) if param else 1
        revealed_candle = session.step_backward(count)
    elif action == "seek":
        revealed_candle = session.seek_to_index(int(param))
    elif action == "reset":
        start_idx = int(param) if param else 100
        revealed_candle = session.reset(start_idx)
    elif action == "set_speed":
        session.speed = float(param)
    elif action == "set_status":
        session.status = str(param)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action {action}")

    return {
        "session": session.to_dict(),
        "revealed_candle": revealed_candle,
        "visible_count": len(session.visible_candles())
    }

# ----------------- DRAWINGS (PERSISTENCE) -----------------
class DrawingCreate(BaseModel):
    id: str
    workspace_id: int = 1
    instrument_id: int = 1
    object_type: str
    anchor_data_json: str
    style_json: Optional[str] = "{}"

@app.get("/api/drawings")
def get_drawings(workspace_id: int = 1, instrument_id: int = 1):
    return query_all(
        "SELECT * FROM drawing_objects WHERE workspace_id = ? AND instrument_id = ? ORDER BY layer_order ASC",
        (workspace_id, instrument_id)
    )

@app.post("/api/drawings")
def save_drawing(d: DrawingCreate):
    execute_write(
        """INSERT OR REPLACE INTO drawing_objects 
           (id, workspace_id, instrument_id, object_type, anchor_data_json, style_json, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)""",
        (d.id, d.workspace_id, d.instrument_id, d.object_type, d.anchor_data_json, d.style_json or "{}")
    )
    return {"status": "ok", "id": d.id}

@app.delete("/api/drawings/{drawing_id}")
def delete_drawing(drawing_id: str):
    execute_write("DELETE FROM drawing_objects WHERE id = ?", (drawing_id,))
    return {"status": "ok", "deleted_id": drawing_id}

# ----------------- SIMULATED TRADING -----------------
class TradeCreate(BaseModel):
    workspace_id: int = 1
    instrument_id: int = 1
    replay_session_id: Optional[str] = None
    direction: str # 'buy' or 'sell'
    entry_time: str
    entry_price: float
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    quantity: float = 1.0
    risk_amount: Optional[float] = None

@app.get("/api/trades")
def get_trades(workspace_id: int = 1):
    return query_all("SELECT * FROM trades WHERE workspace_id = ? ORDER BY id DESC", (workspace_id,))

@app.post("/api/trades")
def create_trade(t: TradeCreate):
    trade_id = execute_write(
        """INSERT INTO trades (workspace_id, instrument_id, direction, entry_time, entry_price, stop_loss, take_profit, quantity, risk_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')""",
        (t.workspace_id, t.instrument_id, t.direction, t.entry_time, t.entry_price, t.stop_loss, t.take_profit, t.quantity, t.risk_amount)
    )
    return {"status": "ok", "trade_id": trade_id}

@app.post("/api/trades/{trade_id}/close")
def close_trade(trade_id: int, exit_data: Dict[str, Any] = Body(...)):
    exit_price = exit_data.get("exit_price")
    exit_time = exit_data.get("exit_time")
    exit_reason = exit_data.get("exit_reason", "manual")
    
    trade = query_one("SELECT * FROM trades WHERE id = ?", (trade_id,))
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
        
    pnl = 0.0
    pnl_percentage = 0.0
    if exit_price:
        if trade["direction"] == "buy":
            pnl = (exit_price - trade["entry_price"]) * trade["quantity"] * 100000.0
            pnl_percentage = ((exit_price - trade["entry_price"]) / trade["entry_price"]) * 100.0
        else:
            pnl = (trade["entry_price"] - exit_price) * trade["quantity"] * 100000.0
            pnl_percentage = ((trade["entry_price"] - exit_price) / trade["entry_price"]) * 100.0
            
    execute_write(
        """UPDATE trades SET exit_price = ?, exit_time = ?, exit_reason = ?, pnl = ?, pnl_percentage = ?, status = 'closed'
           WHERE id = ?""",
        (exit_price, exit_time, exit_reason, round(pnl, 2), round(pnl_percentage, 2), trade_id)
    )
    return {"status": "ok", "trade_id": trade_id, "pnl": round(pnl, 2)}

# ----------------- JOURNAL -----------------
class JournalCreate(BaseModel):
    workspace_id: int = 1
    trade_id: Optional[int] = None
    title: str
    content: str
    entry_type: str = "trade_note"
    event_time: Optional[str] = None

@app.get("/api/journal")
def get_journal(workspace_id: int = 1):
    return query_all("SELECT * FROM journal_entries WHERE workspace_id = ? ORDER BY id DESC", (workspace_id,))

@app.post("/api/journal")
def create_journal_entry(j: JournalCreate):
    entry_id = execute_write(
        """INSERT INTO journal_entries (workspace_id, trade_id, title, content, entry_type, event_time)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (j.workspace_id, j.trade_id, j.title, j.content, j.entry_type, j.event_time)
    )
    return {"status": "ok", "journal_id": entry_id}
