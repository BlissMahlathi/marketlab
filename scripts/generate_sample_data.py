import datetime
import random
import csv
import json
import math
import os

random.seed(42)

def generate_sample_candles(symbol="EURUSD", days=90, timeframe_minutes=15, start_price=1.0850):
    os.makedirs("data/candles", exist_ok=True)

    start_date = datetime.datetime(2025, 1, 1, 0, 0, tzinfo=datetime.timezone.utc)
    total_candles = int(days * 24 * (60 / timeframe_minutes))

    current_time = start_date
    current_price = start_price

    candles = []

    is_forex = symbol in ("EURUSD", "GBPUSD")
    is_crypto = symbol in ("BTCUSDT", "ETHUSDT", "SOLUSD")

    # Regime parameters: each regime lasts N candles, then switches
    regime_len = 0
    regime_type = "range"
    trend_strength = 0.0
    regime_counter = 0

    # Volatility clustering - percentage-based, scaled by price
    # Forex ~0.08% per 15m candle, Crypto ~0.25%, Stocks ~0.15%
    pct_vol = 0.0008 if is_forex else (0.0025 if is_crypto else 0.0015)
    base_vol = start_price * pct_vol
    vol_mult = 1.0
    vol_target = 1.0

    # Support/resistance levels for fake breakouts
    swing_high = start_price
    swing_low = start_price
    last_swing_time = 0

    for i in range(total_candles):
        # Skip weekend for forex
        if is_forex:
            if current_time.weekday() == 5 or (current_time.weekday() == 6 and current_time.hour < 22):
                current_time += datetime.timedelta(minutes=timeframe_minutes)
                continue

        hour = current_time.hour

        # Session-based volatility (London + NY overlap is most volatile)
        if 8 <= hour <= 12:
            session_vol = 1.5  # London open
        elif 13 <= hour <= 17:
            session_vol = 1.3  # NY + London overlap
        elif 18 <= hour <= 21:
            session_vol = 1.0  # NY afternoon
        else:
            session_vol = 0.5  # Asian session

        # Regime switching
        if regime_len <= 0:
            regime_counter += 1
            regime_type = random.choices(
                ["trend_up", "trend_down", "range", "breakout"],
                weights=[0.3, 0.3, 0.25, 0.15]
            )[0]
            regime_len = random.randint(40, 120)
            if regime_type == "trend_up":
                trend_strength = random.uniform(0.15, 0.4) * base_vol
            elif regime_type == "trend_down":
                trend_strength = -random.uniform(0.15, 0.4) * base_vol
            elif regime_type == "range":
                trend_strength = random.uniform(-0.05, 0.05) * base_vol
            elif regime_type == "breakout":
                trend_strength = random.choice([-1, 1]) * random.uniform(0.5, 1.0) * base_vol
                vol_target = 2.5

        regime_len -= 1

        # Volatility mean reversion
        vol_mult += (vol_target - vol_mult) * 0.05
        if regime_type != "breakout":
            vol_target = random.uniform(0.7, 1.3)

        # Price change calculation
        vol = base_vol * vol_mult * session_vol
        noise = random.gauss(0, vol)

        # Add trend drift
        drift = trend_strength

        # Add mean reversion in range regime
        if regime_type == "range":
            range_center = (swing_high + swing_low) / 2
            reversion = (range_center - current_price) * 0.005
            drift += reversion

        change = drift + noise
        open_price = current_price
        close_price = open_price + change

        # Candle wicks
        body = abs(close_price - open_price)
        wick_size = vol * random.uniform(0.3, 1.5)

        if close_price >= open_price:
            high_price = close_price + random.uniform(0, wick_size)
            low_price = open_price - random.uniform(0, wick_size)
        else:
            high_price = open_price + random.uniform(0, wick_size)
            low_price = close_price - random.uniform(0, wick_size)

        # Occasionally create long wick (rejection candle)
        if random.random() < 0.08:
            if close_price > open_price:
                low_price = low_price - wick_size * random.uniform(1.5, 3)
            else:
                high_price = high_price + wick_size * random.uniform(1.5, 3)

        # Ensure positive prices
        low_price = max(low_price, start_price * 0.3)

        # Volume
        base_volume = 200 if is_forex else 500
        volume = int(base_volume * session_vol * vol_mult * random.uniform(0.5, 2.0))

        # Update swing high/low
        if current_price > swing_high:
            swing_high = current_price
        if current_price < swing_low:
            swing_low = current_price
        if i - last_swing_time > 50:
            swing_high = max(swing_high, current_price * 1.001)
            swing_low = min(swing_low, current_price * 0.999)
            last_swing_time = i

        ts_iso = current_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        ts_unix = int(current_time.timestamp())

        candles.append({
            "instrument": symbol,
            "timestamp": ts_iso,
            "time": ts_unix,
            "timeframe": f"{timeframe_minutes}m",
            "open": round(open_price, 5 if is_forex else 2),
            "high": round(high_price, 5 if is_forex else 2),
            "low": round(low_price, 5 if is_forex else 2),
            "close": round(close_price, 5 if is_forex else 2),
            "volume": volume
        })

        current_price = close_price
        current_time += datetime.timedelta(minutes=timeframe_minutes)

    csv_path = f"data/candles/{symbol}_{timeframe_minutes}m.csv"
    json_path = f"data/candles/{symbol}_{timeframe_minutes}m.json"

    with open(csv_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["timestamp", "time", "open", "high", "low", "close", "volume"])
        writer.writeheader()
        for c in candles:
            writer.writerow({
                "timestamp": c["timestamp"],
                "time": c["time"],
                "open": c["open"],
                "high": c["high"],
                "low": c["low"],
                "close": c["close"],
                "volume": c["volume"]
            })

    with open(json_path, 'w') as f:
        json.dump(candles, f)

    print(f"Generated {len(candles)} candles for {symbol} saved to {json_path}")
    return len(candles)

if __name__ == "__main__":
    generate_sample_candles("EURUSD", days=90, timeframe_minutes=15, start_price=1.0850)
    generate_sample_candles("GBPUSD", days=90, timeframe_minutes=15, start_price=1.2720)
    generate_sample_candles("BTCUSDT", days=90, timeframe_minutes=15, start_price=94500.0)
    generate_sample_candles("ETHUSDT", days=90, timeframe_minutes=15, start_price=2240.0)
    generate_sample_candles("SOLUSD", days=90, timeframe_minutes=15, start_price=178.0)
    generate_sample_candles("NVDA", days=90, timeframe_minutes=15, start_price=204.0)
    generate_sample_candles("AAPL", days=90, timeframe_minutes=15, start_price=228.0)
    generate_sample_candles("TSLA", days=90, timeframe_minutes=15, start_price=342.0)
    generate_sample_candles("GOLD", days=90, timeframe_minutes=15, start_price=2748.0)
    generate_sample_candles("SPX", days=90, timeframe_minutes=15, start_price=5800.0)
