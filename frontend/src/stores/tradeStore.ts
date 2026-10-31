import { useState, useEffect, useCallback } from "react";
import { Trade, createTrade, fetchTrades, closeTrade } from "../services/tradingService";

export function useTradeStore() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (workspaceId = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrades(workspaceId);
      setTrades(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (trade: Omit<Trade, "id" | "status" | "exit_price" | "exit_time" | "pnl" | "pnl_percentage">) => {
    setLoading(true);
    try {
      await createTrade(trade);
      await load(trade.workspace_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [load]);

  const close = useCallback(async (tradeId: number, exitPrice: number, exitTime: string) => {
    setLoading(true);
    try {
      await closeTrade(tradeId, exitPrice, exitTime);
      await load(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { trades, loading, error, load, add, close };
}
