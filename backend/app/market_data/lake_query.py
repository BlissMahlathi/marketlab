import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import duckdb
import pandas as pd

class DuckDBLakeQuery:
    """
    DuckDB Lake Query Layer:
    Executes fast vectorised queries across partitioned Parquet files in lake/
    Supports:
    - Quote ticks range queries
    - Trade ticks range queries
    - Multi-timeframe candles queries
    - Dataset coverage & gap discovery
    """

    def __init__(self, lake_dir: Path):
        self.lake_dir = lake_dir

    def get_connection(self) -> duckdb.DuckDBPyConnection:
        con = duckdb.connect()
        # Enable hive partitioning
        con.execute("SET preserve_insertion_order=false;")
        return con

    def query_candles(
        self,
        symbol: str,
        timeframe: str = "1m",
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 5000
    ) -> List[Dict[str, Any]]:
        clean_sym = symbol.replace("/", "").replace("-", "").upper()
        # Search path pattern for candles
        candles_glob = str(self.lake_dir / "candles" / "**" / "*.parquet")
        
        con = self.get_connection()
        try:
            # Check if any candle files exist
            files = list((self.lake_dir / "candles").glob("**/*.parquet"))
            if not files:
                return []

            where_clauses = [f"symbol = '{clean_sym}'"]
            if timeframe:
                where_clauses.append(f"timeframe = '{timeframe}'")
            if start_time:
                where_clauses.append(f"timestamp >= '{start_time}'")
            if end_time:
                where_clauses.append(f"timestamp <= '{end_time}'")

            where_sql = " AND ".join(where_clauses)
            query = f"""
                SELECT 
                    epoch(timestamp) AS time,
                    open, high, low, close, volume, trade_count
                FROM read_parquet('{candles_glob}', hive_partitioning = true)
                WHERE {where_sql}
                ORDER BY timestamp ASC
                LIMIT {limit}
            """
            df = con.execute(query).df()
            return df.to_dict(orient="records")
        except Exception as e:
            return []
        finally:
            con.close()

    def query_quote_ticks(
        self,
        symbol: str,
        start_time: str,
        end_time: str,
        limit: int = 50000
    ) -> List[Dict[str, Any]]:
        clean_sym = symbol.replace("/", "").replace("-", "").upper()
        quotes_glob = str(self.lake_dir / "quotes" / "**" / "*.parquet")
        
        con = self.get_connection()
        try:
            files = list((self.lake_dir / "quotes").glob("**/*.parquet"))
            if not files:
                return []

            query = f"""
                SELECT 
                    epoch(timestamp) AS time,
                    bid, ask, bid_volume, ask_volume, sequence_id
                FROM read_parquet('{quotes_glob}', hive_partitioning = true)
                WHERE symbol = '{clean_sym}'
                  AND timestamp >= '{start_time}'
                  AND timestamp <= '{end_time}'
                ORDER BY timestamp ASC
                LIMIT {limit}
            """
            df = con.execute(query).df()
            return df.to_dict(orient="records")
        except Exception as e:
            return []
        finally:
            con.close()

    def get_dataset_coverage(self) -> List[Dict[str, Any]]:
        """Scans the lake and produces a comprehensive summary of coverage across providers & symbols."""
        con = self.get_connection()
        results = []
        try:
            # Candle coverage
            candle_files = list((self.lake_dir / "candles").glob("**/*.parquet"))
            if candle_files:
                c_glob = str(self.lake_dir / "candles" / "**" / "*.parquet")
                c_df = con.execute(f"""
                    SELECT 
                        provider, symbol, timeframe, 'candle' as data_type,
                        MIN(timestamp) as earliest, MAX(timestamp) as latest, COUNT(*) as count
                    FROM read_parquet('{c_glob}', hive_partitioning = true)
                    GROUP BY provider, symbol, timeframe
                """).df()
                results.extend(c_df.to_dict(orient="records"))

            # Quote coverage
            quote_files = list((self.lake_dir / "quotes").glob("**/*.parquet"))
            if quote_files:
                q_glob = str(self.lake_dir / "quotes" / "**" / "*.parquet")
                q_df = con.execute(f"""
                    SELECT 
                        provider, symbol, 'tick' as timeframe, 'quote_tick' as data_type,
                        MIN(timestamp) as earliest, MAX(timestamp) as latest, COUNT(*) as count
                    FROM read_parquet('{q_glob}', hive_partitioning = true)
                    GROUP BY provider, symbol
                """).df()
                results.extend(q_df.to_dict(orient="records"))
        except Exception as e:
            pass
        finally:
            con.close()
        return results
