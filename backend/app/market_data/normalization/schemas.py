import pyarrow as pa

# 1. Quote Ticks Schema (Forex, CFDs, Metals - Bid/Ask quotes)
# Dukascopy, FXCM, manual quote feeds
QUOTE_TICK_SCHEMA = pa.schema([
    ("timestamp", pa.timestamp("us", tz="UTC")),
    ("symbol", pa.string()),
    ("provider", pa.string()),
    ("bid", pa.float64()),
    ("ask", pa.float64()),
    ("bid_volume", pa.float64()),
    ("ask_volume", pa.float64()),
    ("sequence_id", pa.int64()), # Provider sequence or event ID
])

# 2. Trade Ticks Schema (Crypto, Equities, Futures - Executed trades)
# Binance trades/aggTrades, Kraken time-and-sales
TRADE_TICK_SCHEMA = pa.schema([
    ("timestamp", pa.timestamp("us", tz="UTC")),
    ("symbol", pa.string()),
    ("provider", pa.string()),
    ("price", pa.float64()),
    ("quantity", pa.float64()),
    ("trade_id", pa.string()),
    ("is_buyer_maker", pa.bool_()), # True if buyer was maker (passive), False if aggressive buyer
])

# 3. Standard OHLCV Candles Schema (Native provider candles or aggregated from ticks)
CANDLE_SCHEMA = pa.schema([
    ("timestamp", pa.timestamp("us", tz="UTC")),
    ("symbol", pa.string()),
    ("provider", pa.string()),
    ("timeframe", pa.string()), # 1m, 5m, 15m, 1h, 4h, 1d
    ("open", pa.float64()),
    ("high", pa.float64()),
    ("low", pa.float64()),
    ("close", pa.float64()),
    ("volume", pa.float64()),
    ("trade_count", pa.int64()),
    ("price_basis", pa.string()), # 'trade', 'midpoint', 'bid', 'ask'
    ("generation_method", pa.string()), # 'provider', 'tick_aggregated'
])
