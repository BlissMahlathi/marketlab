import datetime
import random
import csv
import json
import os

def generate_sample_candles(symbol="EURUSD", days=30, timeframe_minutes=15, start_price=1.0850):
    os.makedirs("data/candles", exist_ok=True)
    os.makedirs("data/raw", exist_ok=True)
    
    # Start 30 days ago
    start_date = datetime.datetime(2025, 1, 1, 0, 0, tzinfo=datetime.timezone.utc)
    total_candles = int(days * 24 * (60 / timeframe_minutes))
    
    current_time = start_date
    current_price = start_price
    
    candles = []
    
    # Forex realistic random walk with trend & volatility cycles
    for i in range(total_candles):
        # Skip weekend for forex (Saturday=5, Sunday=6)
        # In Forex, markets close Friday 22:00 UTC and reopen Sunday 22:00 UTC
        if current_time.weekday() == 5 or (current_time.weekday() == 6 and current_time.hour < 22):
            current_time += datetime.timedelta(minutes=timeframe_minutes)
            continue
            
        hour = current_time.hour
        # Higher volatility in London (8-16 UTC) and NY (13-21 UTC) overlap
        if 8 <= hour <= 17:
            volatility = 0.00035
        else:
            volatility = 0.00015
            
        open_price = current_price
        delta = random.gauss(0, volatility)
        close_price = max(1.0200, open_price + delta)
        
        high_extra = abs(random.gauss(0, volatility * 0.7))
        low_extra = abs(random.gauss(0, volatility * 0.7))
        
        high_price = max(open_price, close_price) + high_extra
        low_price = min(open_price, close_price) - low_extra
        volume = int(random.lognormvariate(5.5, 0.6))
        
        ts_iso = current_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        ts_unix = int(current_time.timestamp())
        
        candles.append({
            "instrument": symbol,
            "timestamp": ts_iso,
            "time": ts_unix,
            "timeframe": f"{timeframe_minutes}m",
            "open": round(open_price, 5),
            "high": round(high_price, 5),
            "low": round(low_price, 5),
            "close": round(close_price, 5),
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
        
    print(f"Generated {len(candles)} candles saved to {csv_path} and {json_path}")
    return len(candles)

if __name__ == "__main__":
    generate_sample_candles("EURUSD", days=30, timeframe_minutes=15, start_price=1.0850)
    generate_sample_candles("GBPUSD", days=30, timeframe_minutes=15, start_price=1.2720)
    generate_sample_candles("BTCUSDT", days=30, timeframe_minutes=15, start_price=94500.0)
