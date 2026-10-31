import os
import zipfile
import io
from pathlib import Path
from typing import Dict, Any, Optional
import requests
import pandas as pd

from app.market_data.normalization.validator import DataValidator

BINANCE_PUBLIC_DATA_URL = "https://data.binance.vision/data/spot"

class BinanceArchiveAdapter:
    """
    Downloads monthly or daily ZIP archives from data.binance.vision for:
    - klines (monthly or daily)
    - aggTrades (monthly or daily)
    - trades (monthly or daily)
    Preserves raw zip files in raw/binance/ and extracts/validates into lake/ partitioned Parquet.
    """

    def __init__(self, raw_dir: Path, lake_dir: Path, quarantine_dir: Path):
        self.raw_dir = raw_dir / "binance"
        self.lake_dir = lake_dir
        self.quarantine_dir = quarantine_dir / "binance"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.quarantine_dir.mkdir(parents=True, exist_ok=True)

    def download_klines(
        self,
        symbol: str,
        interval: str = "1m",
        year: int = 2024,
        month: int = 1,
        cadence: str = "monthly"
    ) -> Dict[str, Any]:
        """
        Download and ingest monthly or daily klines ZIP from data.binance.vision.
        File name pattern: {SYMBOL}-{INTERVAL}-{YEAR}-{MONTH:02d}.zip
        """
        clean_sym = symbol.replace("/", "").replace("-", "").upper()
        file_prefix = f"{clean_sym}-{interval}-{year}-{month:02d}"
        zip_name = f"{file_prefix}.zip"
        csv_name = f"{file_prefix}.csv"

        url = f"{BINANCE_PUBLIC_DATA_URL}/{cadence}/klines/{clean_sym}/{interval}/{zip_name}"

        raw_folder = self.raw_dir / "klines" / clean_sym / interval
        raw_folder.mkdir(parents=True, exist_ok=True)
        raw_zip_path = raw_folder / zip_name

        zip_bytes = b""
        if raw_zip_path.exists():
            zip_bytes = raw_zip_path.read_bytes()
        else:
            try:
                resp = requests.get(url, timeout=30)
                if resp.status_code == 200:
                    zip_bytes = resp.content
                    raw_zip_path.write_bytes(zip_bytes)
                else:
                    return {"status": "not_found", "url": url, "code": resp.status_code}
            except Exception as e:
                return {"status": "download_failed", "error": str(e)}

        # Extract and parse CSV from zip in memory
        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                target_name = [n for n in zf.namelist() if n.endswith(".csv")][0]
                with zf.open(target_name) as f:
                    # Binance kline columns:
                    # open_time, open, high, low, close, volume, close_time, quote_asset_volume, number_of_trades, ...
                    cols = [
                        "open_time", "open", "high", "low", "close", "volume",
                        "close_time", "quote_volume", "trade_count",
                        "taker_buy_base", "taker_buy_quote", "ignore"
                    ]
                    df = pd.read_csv(f, names=cols, header=None)
        except Exception as e:
            return {"status": "unzip_failed", "error": str(e)}

        # Format timestamps (support microsecond timestamps from Jan 2025 onwards)
        # If open_time is > 10^14, it's in microseconds, otherwise milliseconds
        first_time = df["open_time"].iloc[0]
        if first_time > 10**14:
            df["timestamp"] = pd.to_datetime(df["open_time"], unit="us", utc=True)
        else:
            df["timestamp"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)

        df["symbol"] = clean_sym
        df["provider"] = "binance"
        df["timeframe"] = interval
        df["open"] = df["open"].astype(float)
        df["high"] = df["high"].astype(float)
        df["low"] = df["low"].astype(float)
        df["close"] = df["close"].astype(float)
        df["volume"] = df["volume"].astype(float)
        df["trade_count"] = df["trade_count"].astype(int)
        df["price_basis"] = "trade"
        df["generation_method"] = "provider"

        # Validate
        valid_df, quarantined_df = DataValidator.validate_candles(df)

        # Write to Lake: lake/candles/provider=binance/market=spot/symbol=BTCUSDT/timeframe=1m/year=2024/month=01/
        lake_partition = (
            self.lake_dir / "candles" / "provider=binance" / "market=spot" /
            f"symbol={clean_sym}" / f"timeframe={interval}" / f"year={year}" / f"month={month:02d}"
        )
        lake_partition.mkdir(parents=True, exist_ok=True)
        lake_file = lake_partition / f"candles_{file_prefix}.parquet"

        if not valid_df.empty:
            valid_df.to_parquet(lake_file, index=False, compression="zstd")

        return {
            "status": "success",
            "symbol": clean_sym,
            "interval": interval,
            "year": year,
            "month": month,
            "total_candles": len(valid_df),
            "output_path": str(lake_file)
        }
