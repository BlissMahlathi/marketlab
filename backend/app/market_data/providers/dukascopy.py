"""
Dukascopy data provider (stub implementation).
Provides methods required by BaseProvider but returns empty data.
Replace with real API calls when credentials are available.
"""

from datetime import datetime
from typing import List, Tuple
from .base import BaseProvider

class DukascopyProvider(BaseProvider):
    def fetch_historical(self, instrument: str, start: datetime, end: datetime, timeframe: str) -> List[Tuple[datetime, float, float, float, float, float]]:
        # TODO: implement actual HTTP calls to Dukascopy REST API.
        return []

    def fetch_realtime(self, instrument: str, timeframe: str):
        # TODO: implement websocket or polling for live data.
        raise NotImplementedError("Realtime Dukascopy provider not implemented yet.")

    def supported_timeframes(self) -> List[str]:
        return ["1m", "5m", "15m", "1h", "4h", "1d"]
