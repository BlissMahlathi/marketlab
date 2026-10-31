"""
Base provider interface for market data.
All providers must inherit from this class and implement the required methods.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Tuple, Any

class BaseProvider(ABC):
    """Abstract base class for market data providers."""

    @abstractmethod
    def fetch_historical(self, instrument: str, start: datetime, end: datetime, timeframe: str) -> List[Tuple[datetime, float, float, float, float, float]]:
        """Return a list of OHLCV tuples for the given instrument and time range.
        Each tuple is (timestamp, open, high, low, close, volume).
        """
        raise NotImplementedError

    @abstractmethod
    def fetch_realtime(self, instrument: str, timeframe: str) -> Any:
        """Return a generator or async iterator that yields live OHLCV data.
        Implementation can be poll‑based or use websockets.
        """
        raise NotImplementedError

    @abstractmethod
    def supported_timeframes(self) -> List[str]:
        """Return a list of timeframe strings the provider supports (e.g. ['1m','5m','15m','1h'])."""
        raise NotImplementedError
"