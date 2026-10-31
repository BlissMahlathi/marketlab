import os
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
from datetime import datetime, timezone

from app.market_data.normalization.validator import DataValidator

class GenericCSVImporter:
    """
    Ingests arbitrary external CSV tick or candle files, normalises timestamps to UTC,
    validates data, writes partitioned Parquet, and logs a manifest with SHA-256.
    """

    def __init__(self, lake_dir: Path, manifests_dir: Path, quarantine_dir: Path):
        self.lake_dir = lake_dir
        self.manifests_dir = manifests_dir
        self.quarantine_dir = quarantine_dir
        self.lake_dir.mkdir(parents=True, exist_ok=True)
        self.manifests_dir.mkdir(parents=True, exist_ok=True)
        self.quarantine_dir.mkdir(parents=True, exist_ok=True)

    def import_csv(
        self,
        file_path: Path,
        provider: str = "manual",
        market: str = "forex", # forex, crypto, stocks
        symbol: str = "EURUSD",
        dataset_type: str = "quotes", # 'quotes', 'trades', or 'candles'
        timeframe: Optional[str] = None, # 1m, 15m (if candles)
        timestamp_col: str = "timestamp",
        timestamp_unit: Optional[str] = None, # 'ms', 's', or ISO string if None
    ) -> Dict[str, Any]:
        if not file_path.exists():
            return {"status": "error", "message": f"File {file_path} not found"}

        # Calculate file SHA-256 hash
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        file_hash = sha256.hexdigest()

        # Read CSV
        df = pd.read_csv(file_path)
        if timestamp_col not in df.columns:
            return {"status": "error", "message": f"Column {timestamp_col} not found in CSV"}

        # Parse timestamp to UTC
        if timestamp_unit:
            df["timestamp"] = pd.to_datetime(df[timestamp_col], unit=timestamp_unit, utc=True)
        else:
            df["timestamp"] = pd.to_datetime(df[timestamp_col], utc=True)

        clean_sym = symbol.replace("/", "").replace("-", "").upper()
        df["symbol"] = clean_sym
        df["provider"] = provider

        # Route validation and lake output according to dataset type
        if dataset_type == "quotes":
            valid_df, quarantined_df = DataValidator.validate_quote_ticks(df)
            lake_partition = self.lake_dir / "quotes" / f"provider={provider}" / f"symbol={clean_sym}"
        elif dataset_type == "trades":
            valid_df, quarantined_df = DataValidator.validate_trade_ticks(df)
            lake_partition = self.lake_dir / "trades" / f"provider={provider}" / f"symbol={clean_sym}"
        else:
            df["timeframe"] = timeframe or "1m"
            df["price_basis"] = "trade"
            df["generation_method"] = "external_import"
            valid_df, quarantined_df = DataValidator.validate_candles(df)
            lake_partition = self.lake_dir / "candles" / f"provider={provider}" / f"symbol={clean_sym}" / f"timeframe={timeframe or '1m'}"

        lake_partition.mkdir(parents=True, exist_ok=True)
        output_filename = f"import_{clean_sym}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.parquet"
        output_path = lake_partition / output_filename

        if not valid_df.empty:
            valid_df.to_parquet(output_path, index=False, compression="zstd")

        # Create Manifest
        manifest = {
            "source_file": str(file_path),
            "sha256": file_hash,
            "provider": provider,
            "market": market,
            "symbol": clean_sym,
            "dataset_type": dataset_type,
            "valid_rows": len(valid_df),
            "quarantined_rows": len(quarantined_df),
            "earliest_timestamp": str(valid_df["timestamp"].min()) if not valid_df.empty else None,
            "latest_timestamp": str(valid_df["timestamp"].max()) if not valid_df.empty else None,
            "lake_file": str(output_path),
            "imported_at": datetime.now(timezone.utc).isoformat()
        }

        manifest_file = self.manifests_dir / f"manifest_{clean_sym}_{file_hash[:10]}.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))

        return {
            "status": "success",
            "manifest": manifest,
            "output_path": str(output_path)
        }
