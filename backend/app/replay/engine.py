from typing import List, Dict, Any, Optional
import time

class ReplaySession:
    """
    Deterministic Replay State Machine with strict No-Lookahead Protection.
    Controls historical clock, visible bars, trade evaluations, and cursor advancing.
    """
    def __init__(self, session_id: str, symbol: str, timeframe: str, all_candles: List[Dict[str, Any]], start_index: int = 100):
        self.session_id = session_id
        self.symbol = symbol
        self.timeframe = timeframe
        self._all_candles = all_candles # Full historical dataset strictly isolated in backend
        self.total_bars = len(all_candles)
        
        # Cursor points to the current visible bar index (inclusive)
        self.cursor_index = min(max(start_index, 10), self.total_bars - 1)
        self.status = "ready" # 'ready', 'playing', 'paused', 'completed'
        self.speed = 1.0 # bars per interval
        self.created_at = time.time()
        
    @property
    def current_time(self) -> int:
        if 0 <= self.cursor_index < self.total_bars:
            return self._all_candles[self.cursor_index]["time"]
        return 0

    def visible_candles(self) -> List[Dict[str, Any]]:
        """
        NO-LOOKAHEAD ENFORCEMENT:
        Returns strictly candles up to current cursor_index. Future candles are never exposed.
        """
        return self._all_candles[: self.cursor_index + 1]

    def latest_candle(self) -> Optional[Dict[str, Any]]:
        if 0 <= self.cursor_index < self.total_bars:
            return self._all_candles[self.cursor_index]
        return None

    def step_forward(self, count: int = 1) -> Optional[Dict[str, Any]]:
        """Advances historical clock by count bars, revealing the next bar."""
        if self.cursor_index + count < self.total_bars:
            self.cursor_index += count
            if self.cursor_index == self.total_bars - 1:
                self.status = "completed"
            return self.latest_candle()
        else:
            self.cursor_index = self.total_bars - 1
            self.status = "completed"
            return None

    def step_backward(self, count: int = 1) -> Optional[Dict[str, Any]]:
        """Steps back historical clock, restoring past market state."""
        if self.cursor_index - count >= 10:
            self.cursor_index -= count
            if self.status == "completed":
                self.status = "paused"
            return self.latest_candle()
        else:
            self.cursor_index = 10
            return self.latest_candle()

    def seek_to_index(self, index: int) -> Optional[Dict[str, Any]]:
        self.cursor_index = min(max(index, 10), self.total_bars - 1)
        return self.latest_candle()

    def seek_to_time(self, timestamp: int) -> Optional[Dict[str, Any]]:
        for i, candle in enumerate(self._all_candles):
            if candle["time"] >= timestamp:
                self.cursor_index = max(10, i)
                return self.latest_candle()
        self.cursor_index = self.total_bars - 1
        return self.latest_candle()

    def reset(self, start_index: int = 100):
        self.cursor_index = min(max(start_index, 10), self.total_bars - 1)
        self.status = "ready"
        return self.latest_candle()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "symbol": self.symbol,
            "timeframe": self.timeframe,
            "cursor_index": self.cursor_index,
            "current_time": self.current_time,
            "total_bars": self.total_bars,
            "status": self.status,
            "speed": self.speed,
            "latest_candle": self.latest_candle()
        }

# Global registry of active in-memory replay sessions
replay_sessions: Dict[str, ReplaySession] = {}

def get_or_create_replay_session(session_id: str, symbol: str, timeframe: str, all_candles: List[Dict[str, Any]], start_index: int = 100) -> ReplaySession:
    if session_id not in replay_sessions:
        replay_sessions[session_id] = ReplaySession(session_id, symbol, timeframe, all_candles, start_index)
    return replay_sessions[session_id]
