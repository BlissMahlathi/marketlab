"""
CSV Importer for historical market data.
Provides a simple function that reads a CSV file containing OHLCV columns
and returns a list of tuples compatible with the data service.
"""

import csv
from datetime import datetime
from typing import List, Tuple

def import_csv(path: str) -> List[Tuple[datetime, float, float, float, float, float]]:
    """Read a CSV file and return a list of OHLCV tuples.

    Expected columns (case‑insensitive):
        timestamp, open, high, low, close, volume
    The timestamp should be ISO‑8601 (e.g. ``2025-01-10T10:00:00``).
    ``volume`` is optional – missing values default to ``0``.
    """
    candles: List[Tuple[datetime, float, float, float, float, float]] = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ts = datetime.fromisoformat(row["timestamp"])
            open_ = float(row["open"])
            high = float(row["high"])
            low = float(row["low"])
            close = float(row["close"])
            volume = float(row.get("volume", 0))
            candles.append((ts, open_, high, low, close, volume))
    return candles
