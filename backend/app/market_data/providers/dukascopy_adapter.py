import os
import lzma
import struct
from datetime import datetime, date, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
import pandas as pd

from app.market_data.normalization.validator import DataValidator

DUKASCOPY_BASE_URL = "https://datafeed.dukascopy.com/datafeed"

# Typical point values: EUR/USD: 100000, USD/JPY: 1000, XAU/USD: 1000
DEFAULT_POINT_VALUES = {
    "EURUSD": 100000.0,
    "GBPUSD": 100000.0,
    "USDJPY": 1000.0,
    "AUDUSD": 100000.0,
    "USDCAD": 100000.0,
    "XAUUSD": 1000.0,
}

class DukascopyAdapter:
    """
    Downloads and decodes Dukascopy .bi5 (LZMA compressed) hourly tick archives.
    Each record in a .bi5 file has 20 bytes (big-endian):
      - uint32: time offset in milliseconds from the start of the hour
      - uint32: ask price (integer, divide by point_value)
      - uint32: bid price (integer, divide by point_value)
      - float32: ask volume
      - float32: bid volume
    """

    def __init__(self, raw_dir: Path, lake_dir: Path, quarantine_dir: Path):
        self.raw_dir = raw_dir / "dukascopy"
        self.lake_dir = lake_dir
        self.quarantine_dir = quarantine_dir / "dukascopy"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.quarantine_dir.mkdir(parents=True, exist_ok=True)

    def get_point_value(self, symbol: str) -> float:
        clean_sym = symbol.replace("/", "").replace("-", "").upper()
        return DEFAULT_POINT_VALUES.get(clean_sym, 100000.0)

    def decode_bi5_bytes(self, compressed_bytes: bytes, hour_start_ts: int, point_value: float) -> List[Dict[str, Any]]:
        """Decompress LZMA bi5 bytes and unpack 20-byte tick structs."""
        try:
            raw_data = lzma.decompress(compressed_bytes)
        except Exception:
            return []

        num_ticks = len(raw_data) // 20
        ticks = []
        for i in range(num_ticks):
            offset = i * 20
            # >IIIff = Big-endian: uint32 ms, uint32 ask, uint32 bid, float32 ask_vol, float32 bid_vol
            ms_offset, raw_ask, raw_bid, ask_vol, bid_vol = struct.unpack_from(">IIIff", raw_data, offset)
            
            # Timestamp in microseconds UTC
            ts_us = (hour_start_ts * 1000 + ms_offset) * 1000

            ticks.append({
                "timestamp": pd.to_datetime(ts_us, unit="us", utc=True),
                "bid": raw_bid / point_value,
                "ask": raw_ask / point_value,
                "bid_volume": round(bid_vol, 4),
                "ask_volume": round(ask_vol, 4),
                "sequence_id": i,
            })
        return ticks

    def download_and_ingest_day(
        self,
        symbol: str,
        target_date: date,
        point_value: Optional[float] = None
    ) -> Dict[str, Any]:
        clean_sym = symbol.replace("/", "").replace("-", "").upper()
        pv = point_value or self.get_point_value(clean_sym)
        year = target_date.year
        month = target_date.month - 1 # Dukascopy uses 0-indexed months (00 = Jan, 11 = Dec)
        day = target_date.day

        day_ticks: List[Dict[str, Any]] = []
        downloaded_hours = 0

        # Save raw bi5 files under raw/dukascopy/{symbol}/{YYYY}/{MM}/{DD}/
        raw_day_dir = self.raw_dir / clean_sym / f"{year}" / f"{month:02d}" / f"{day:02d}"
        raw_day_dir.mkdir(parents=True, exist_ok=True)

        for hour in range(24):
            # URL: /datafeed/{SYMBOL}/{YYYY}/{MM:02d}/{DD:02d}/{HH:02d}h_ticks.bi5
            url = f"{DUKASCOPY_BASE_URL}/{clean_sym}/{year}/{month:02d}/{day:02d}/{hour:02d}h_ticks.bi5"
            raw_file = raw_day_dir / f"{hour:02d}h_ticks.bi5"

            bi5_bytes = b""
            if raw_file.exists():
                bi5_bytes = raw_file.read_bytes()
            else:
                try:
                    resp = requests.get(url, timeout=10)
                    if resp.status_code == 200 and len(resp.content) > 0:
                        bi5_bytes = resp.content
                        raw_file.write_bytes(bi5_bytes)
                except Exception:
                    continue

            if bi5_bytes:
                # Unix epoch for this specific hour in UTC
                hour_dt = datetime(year, target_date.month, day, hour, 0, 0, tzinfo=timezone.utc)
                hour_start_ts = int(hour_dt.timestamp())
                ticks = self.decode_bi5_bytes(bi5_bytes, hour_start_ts, pv)
                if ticks:
                    day_ticks.extend(ticks)
                    downloaded_hours += 1

        if not day_ticks:
            return {"status": "no_data", "symbol": clean_sym, "date": str(target_date), "ticks": 0}

        df = pd.DataFrame(day_ticks)
        df["symbol"] = clean_sym
        df["provider"] = "dukascopy"

        # Validate
        valid_df, quarantined_df = DataValidator.validate_quote_ticks(df)

        # Write to Lake: lake/quotes/provider=dukascopy/symbol=EURUSD/year=2024/month=01/
        lake_partition = (
            self.lake_dir / "quotes" / "provider=dukascopy" / f"symbol={clean_sym}" /
            f"year={year}" / f"month={target_date.month:02d}"
        )
        lake_partition.mkdir(parents=True, exist_ok=True)
        lake_file = lake_partition / f"quotes_{target_date.strftime('%Y%m%d')}.parquet"

        if not valid_df.empty:
            valid_df.to_parquet(lake_file, index=False, compression="zstd")

        if not quarantined_df.empty:
            q_file = self.quarantine_dir / f"quarantine_{clean_sym}_{target_date.strftime('%Y%m%d')}.parquet"
            quarantined_df.to_parquet(q_file, index=False)

        return {
            "status": "success",
            "symbol": clean_sym,
            "date": str(target_date),
            "hours_downloaded": downloaded_hours,
            "valid_ticks": len(valid_df),
            "quarantined_ticks": len(quarantined_df),
            "output_path": str(lake_file),
        }
