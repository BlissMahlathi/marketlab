"""
Historical and real-time market data service.
Fetches real data using Binance REST API (Crypto) and Yahoo Finance,
supports genuine multi-timeframe candle resamplers,
caches data to Parquet using DuckDB/PyArrow, and serves standard OHLCV candles.
"""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

import pandas as pd
import duckdb
import yfinance as yf
import requests

from app.core.database import query_all, query_one, execute_write

logger = logging.getLogger("market_data")

DATA_DIR = Path("data")
PARQUET_DIR = DATA_DIR / "parquet"
CANDLES_DIR = DATA_DIR / "candles"

PARQUET_DIR.mkdir(parents=True, exist_ok=True)
CANDLES_DIR.mkdir(parents=True, exist_ok=True)

# Common mappings for user symbols to provider symbols
YAHOO_MAP = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CAD": "CAD=X",
    "SPX": "^GSPC",
    "NDX": "^IXIC",
    "DJI": "^DJI",
    "GOLD": "GC=F",
    "OIL": "CL=F",
    "BTC/USD": "BTC-USD",
    "ETH/USD": "ETH-USD",
    "SOL/USD": "SOL-USD",
}

TIMEFRAME_MAP_YFINANCE = {
    "1m": ("1m", "7d"),
    "5m": ("5m", "60d"),
    "15m": ("15m", "60d"),
    "30m": ("30m", "60d"),
    "1h": ("60m", "730d"),
    "4h": ("1h", "730d"),
    "1d": ("1d", "max"),
    "1w": ("1wk", "max"),
}

BINANCE_INTERVAL_MAP = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
}

# Pandas resample string mappings
RESAMPLE_RULES = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "1d": "1D",
    "1w": "1W",
}

def clean_symbol(symbol: str) -> str:
    return symbol.replace("/", "").replace("-", "").upper()

def get_parquet_path(symbol: str, timeframe: str) -> Path:
    safe_sym = symbol.replace("/", "_").replace("^", "").replace("=", "")
    return PARQUET_DIR / f"{safe_sym}_{timeframe}.parquet"

def fetch_binance_crypto(symbol: str, timeframe: str = "15m", limit: int = 1000) -> List[Dict[str, Any]]:
    """Fetch genuine crypto klines from Binance public REST API without needing API keys."""
    binance_sym = symbol.replace("/", "").upper()
    if binance_sym.endswith("USD"):
        binance_sym = binance_sym + "T"
    
    interval = BINANCE_INTERVAL_MAP.get(timeframe, "15m")
    url = f"https://api.binance.com/api/v3/klines?symbol={binance_sym}&interval={interval}&limit={limit}"
    
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            logger.warning(f"Binance fetch failed ({resp.status_code}): {resp.text}")
            return []
        data = resp.json()
        candles = []
        for row in data:
            candles.append({
                "time": int(row[0] // 1000),
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": float(row[5]),
            })
        return candles
    except Exception as e:
        logger.error(f"Error fetching Binance data for {symbol}: {e}")
        return []

def fetch_yahoo_candles(symbol: str, timeframe: str = "15m") -> List[Dict[str, Any]]:
    """Fetch genuine historical candles from Yahoo Finance."""
    yf_symbol = YAHOO_MAP.get(symbol, symbol)
    interval, period = TIMEFRAME_MAP_YFINANCE.get(timeframe, ("15m", "60d"))
    
    try:
        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(interval=interval, period=period)
        if df.empty:
            logger.warning(f"No data returned from Yahoo Finance for {yf_symbol}")
            return []
            
        candles = []
        for idx, row in df.iterrows():
            ts = int(idx.timestamp())
            candles.append({
                "time": ts,
                "open": round(float(row["Open"]), 5),
                "high": round(float(row["High"]), 5),
                "low": round(float(row["Low"]), 5),
                "close": round(float(row["Close"]), 5),
                "volume": float(row.get("Volume", 0)),
            })
        return candles
    except Exception as e:
        logger.error(f"Error fetching Yahoo Finance data for {yf_symbol}: {e}")
        return []

def resample_candles(base_candles: List[Dict[str, Any]], target_timeframe: str) -> List[Dict[str, Any]]:
    """
    Downsamples finer candles (e.g. 15m or 1m) to target timeframes (e.g. 1h, 4h, 1d)
    using pandas OHLC resampler.
    """
    if not base_candles:
        return []
    rule = RESAMPLE_RULES.get(target_timeframe)
    if not rule:
        return base_candles

    df = pd.DataFrame(base_candles)
    df["dt"] = pd.to_datetime(df["time"], unit="s", utc=True)
    df = df.set_index("dt").sort_index()

    resampled_open = df["open"].resample(rule, label="left", closed="left").first()
    resampled_high = df["high"].resample(rule, label="left", closed="left").max()
    resampled_low = df["low"].resample(rule, label="left", closed="left").min()
    resampled_close = df["close"].resample(rule, label="left", closed="left").last()
    resampled_vol = df["volume"].resample(rule, label="left", closed="left").sum().fillna(0)

    res_df = pd.DataFrame({
        "open": resampled_open,
        "high": resampled_high,
        "low": resampled_low,
        "close": resampled_close,
        "volume": resampled_vol,
    }).dropna(subset=["open"]).reset_index()

    res_df["time"] = res_df["dt"].apply(lambda t: int(t.timestamp()))
    return res_df[["time", "open", "high", "low", "close", "volume"]].to_dict(orient="records")

def save_candles_to_parquet(candles: List[Dict[str, Any]], parquet_path: Path):
    if not candles:
        return
    df = pd.DataFrame(candles)
    df = df.drop_duplicates(subset=["time"]).sort_values("time").reset_index(drop=True)
    df.to_parquet(parquet_path, index=False)

def load_candles_from_parquet(parquet_path: Path) -> List[Dict[str, Any]]:
    if not parquet_path.exists():
        return []
    try:
        con = duckdb.connect()
        df = con.execute(f"SELECT time, open, high, low, close, volume FROM read_parquet('{parquet_path}') ORDER BY time ASC").df()
        con.close()
        return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"DuckDB read failed for {parquet_path}: {e}")
        return []

def get_instrument_candles(symbol: str, timeframe: str = "15m", force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Primary accessor:
    1. Checks cached Parquet for the specific timeframe.
    2. If missing or forced, fetches live real data for this exact timeframe.
    3. If provider has no data for higher timeframe (e.g. 1h or 1d from CSV),
       resamples from the finest available base candles.
    """
    parquet_file = get_parquet_path(symbol, timeframe)
    
    if not force_refresh and parquet_file.exists():
        cached = load_candles_from_parquet(parquet_file)
        if cached and len(cached) > 10:
            return cached

    candles = []
    # 1. Try Crypto via Binance
    if any(crypto in symbol.upper() for crypto in ["BTC", "ETH", "SOL", "USDT", "DOGE", "XRP"]):
        candles = fetch_binance_crypto(symbol, timeframe)
    
    # 2. Try Yahoo Finance
    if not candles:
        candles = fetch_yahoo_candles(symbol, timeframe)

    # 3. If fetched, cache and return
    if candles:
        save_candles_to_parquet(candles, parquet_file)
        return candles

    # 4. Fallback: if exact timeframe CSV exists, load it
    clean_sym = symbol.replace("/", "").replace("=", "")
    exact_csv = CANDLES_DIR / f"{clean_sym}_{timeframe}.csv"
    if exact_csv.exists():
        try:
            df = pd.read_csv(exact_csv)
            candles = df.to_dict(orient="records")
            save_candles_to_parquet(candles, parquet_file)
            return candles
        except Exception:
            pass

    # 5. Fallback: Resample from base 15m or 1m CSV
    base_csv_candidates = [
        CANDLES_DIR / f"{clean_sym}_15m.csv",
        CANDLES_DIR / "EURUSD_15m.csv"
    ]
    for c_path in base_csv_candidates:
        if c_path.exists():
            try:
                base_df = pd.read_csv(c_path)
                base_candles = base_df.to_dict(orient="records")
                if timeframe != "15m":
                    resampled = resample_candles(base_candles, timeframe)
                    if resampled:
                        save_candles_to_parquet(resampled, parquet_file)
                        return resampled
                else:
                    return base_candles
            except Exception:
                pass

    return []
