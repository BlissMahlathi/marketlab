// src/services/tradingService.ts
/**
 * Simple wrapper around MarketLab backend trade API.
 * Adjust the `BASE_URL` if the backend runs on a different host/port.
 */
const BASE_URL = "http://127.0.0.1:8000/api";

export interface Trade {
  id: number;
  workspace_id: number;
  instrument_id: number;
  direction: "buy" | "sell";
  entry_time: string; // ISO‑8601
  entry_price: number;
  stop_loss?: number | null;
  take_profit?: number | null;
  quantity: number;
  risk_amount?: number | null;
  status: string;
  exit_price?: number | null;
  exit_time?: string | null;
  pnl?: number | null;
  pnl_percentage?: number | null;
}

export async function fetchTrades(workspaceId = 1): Promise<Trade[]> {
  const resp = await fetch(`${BASE_URL}/trades?workspace_id=${workspaceId}`);
  if (!resp.ok) {
    throw new Error(`Failed to fetch trades: ${resp.status}`);
  }
  return resp.json();
}

export async function createTrade(trade: Omit<Trade, "id" | "status" | "exit_price" | "exit_time" | "pnl" | "pnl_percentage">): Promise<{ status: string; trade_id: number }> {
  const resp = await fetch(`${BASE_URL}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trade),
  });
  if (!resp.ok) {
    throw new Error(`Failed to create trade: ${resp.status}`);
  }
  return resp.json();
}

export async function closeTrade(tradeId: number, exitPrice: number, exitTime: string, exitReason = "manual"): Promise<{ status: string; trade_id: number; pnl: number }> {
  const resp = await fetch(`${BASE_URL}/trades/${tradeId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exit_price: exitPrice, exit_time: exitTime, exit_reason: exitReason }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to close trade: ${resp.status}`);
  }
  return resp.json();
}
