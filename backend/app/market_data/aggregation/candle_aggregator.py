import pandas as pd
import numpy as np

class CandleAggregator:
    """
    Independent Candle Generation:
    Converts tick feeds into standard OHLCV bars.
    Supports Trade Ticks (price * qty) and Quote Ticks (midpoint, bid, or ask).
    """

    @staticmethod
    def build_trade_candles(
        ticks_df: pd.DataFrame, 
        timeframe: str = "1min",
        symbol: str = "UNKNOWN",
        provider: str = "aggregated"
    ) -> pd.DataFrame:
        """
        Aggregate trade ticks into OHLCV bars using trade price and volume.
        """
        if ticks_df.empty:
            return pd.DataFrame()

        df = ticks_df.copy()
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        df = df.sort_values("timestamp").set_index("timestamp")

        candles = df["price"].resample(timeframe, label="left", closed="left").ohlc()
        candles["volume"] = df["quantity"].resample(timeframe, label="left", closed="left").sum().fillna(0)
        candles["trade_count"] = df["price"].resample(timeframe, label="left", closed="left").count()
        candles["symbol"] = symbol
        candles["provider"] = provider
        candles["timeframe"] = timeframe
        candles["price_basis"] = "trade"
        candles["generation_method"] = "tick_aggregated"

        return candles.dropna(subset=["open"]).reset_index()

    @staticmethod
    def build_quote_candles(
        quotes_df: pd.DataFrame,
        timeframe: str = "1min",
        price_basis: str = "midpoint", # 'midpoint', 'bid', or 'ask'
        symbol: str = "UNKNOWN",
        provider: str = "aggregated"
    ) -> pd.DataFrame:
        """
        Aggregate bid/ask quotes into OHLCV bars based on midpoint, bid, or ask.
        Preserves quote volume as total quotes/ticks rather than fabricated trade volume.
        """
        if quotes_df.empty:
            return pd.DataFrame()

        df = quotes_df.copy()
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
        
        if price_basis == "midpoint":
            df["price"] = (df["bid"] + df["ask"]) / 2.0
        elif price_basis == "bid":
            df["price"] = df["bid"]
        else:
            df["price"] = df["ask"]

        df = df.sort_values("timestamp").set_index("timestamp")

        candles = df["price"].resample(timeframe, label="left", closed="left").ohlc()
        candles["volume"] = (df["bid_volume"] + df["ask_volume"]).resample(timeframe, label="left", closed="left").sum().fillna(0)
        candles["trade_count"] = df["price"].resample(timeframe, label="left", closed="left").count()
        candles["symbol"] = symbol
        candles["provider"] = provider
        candles["timeframe"] = timeframe
        candles["price_basis"] = price_basis
        candles["generation_method"] = "tick_aggregated"

        return candles.dropna(subset=["open"]).reset_index()
