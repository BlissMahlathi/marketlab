from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np

class DataValidator:
    """
    Validates tick and candle records before writing to the Lake.
    Isolates corrupt or anomalous data into quarantine.
    """

    @staticmethod
    def validate_quote_ticks(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Validate Quote Ticks (Bid / Ask):
        - Non-null timestamps
        - Positive bid and ask (> 0)
        - Non-crossed markets: ask >= bid
        - Volume >= 0
        Returns (valid_df, quarantined_df)
        """
        if df.empty:
            return df, pd.DataFrame()

        clean_df = df.copy()
        reasons = []

        # Check conditions
        cond_time = clean_df["timestamp"].notnull()
        cond_prices = (clean_df["bid"] > 0) & (clean_df["ask"] > 0)
        cond_uncrossed = clean_df["ask"] >= clean_df["bid"]
        cond_volumes = (clean_df["bid_volume"] >= 0) & (clean_df["ask_volume"] >= 0)

        valid_mask = cond_time & cond_prices & cond_uncrossed & cond_volumes
        valid_df = clean_df[valid_mask].copy()
        quarantined_df = clean_df[~valid_mask].copy()

        if not quarantined_df.empty:
            # Add quarantine diagnostics
            quarantined_df["quarantine_reason"] = np.where(
                ~cond_prices, "non_positive_price",
                np.where(~cond_uncrossed, "crossed_bid_ask",
                np.where(~cond_time, "null_timestamp", "invalid_volume"))
            )

        return valid_df, quarantined_df

    @staticmethod
    def validate_trade_ticks(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Validate Trade Ticks:
        - Non-null timestamps
        - Positive price and quantity (> 0)
        Returns (valid_df, quarantined_df)
        """
        if df.empty:
            return df, pd.DataFrame()

        clean_df = df.copy()
        cond_time = clean_df["timestamp"].notnull()
        cond_valid = (clean_df["price"] > 0) & (clean_df["quantity"] > 0)

        valid_mask = cond_time & cond_valid
        valid_df = clean_df[valid_mask].copy()
        quarantined_df = clean_df[~valid_mask].copy()

        if not quarantined_df.empty:
            quarantined_df["quarantine_reason"] = np.where(~cond_time, "null_timestamp", "invalid_price_or_qty")

        return valid_df, quarantined_df

    @staticmethod
    def validate_candles(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Validate OHLCV Candles:
        - high >= low
        - high >= max(open, close)
        - low <= min(open, close)
        - open, high, low, close > 0
        - volume >= 0
        Returns (valid_df, quarantined_df)
        """
        if df.empty:
            return df, pd.DataFrame()

        clean_df = df.copy()
        cond_prices = (clean_df["open"] > 0) & (clean_df["high"] > 0) & (clean_df["low"] > 0) & (clean_df["close"] > 0)
        cond_high_low = clean_df["high"] >= clean_df["low"]
        cond_high = (clean_df["high"] >= clean_df["open"]) & (clean_df["high"] >= clean_df["close"])
        cond_low = (clean_df["low"] <= clean_df["open"]) & (clean_df["low"] <= clean_df["close"])
        cond_vol = clean_df["volume"] >= 0

        valid_mask = cond_prices & cond_high_low & cond_high & cond_low & cond_vol
        valid_df = clean_df[valid_mask].copy()
        quarantined_df = clean_df[~valid_mask].copy()

        if not quarantined_df.empty:
            quarantined_df["quarantine_reason"] = "impossible_ohlc_relationship"

        return valid_df, quarantined_df
