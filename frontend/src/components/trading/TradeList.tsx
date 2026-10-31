// src/components/trading/TradeList.tsx
import React, { useEffect } from "react";
import { useTradeStore } from "../../stores/tradeStore";
import { Trade } from "../../services/tradingService";

export const TradeList: React.FC = () => {
  const { trades, loading, error, load } = useTradeStore();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="text-gray-400">Loading trades...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (trades.length === 0) return <div className="text-gray-500">No trades yet.</div>;

  return (
    <table className="w-full table-auto text-sm text-left text-gray-200">
      <thead className="bg-gray-800">
        <tr>
          <th className="px-2 py-1">ID</th>
          <th className="px-2 py-1">Direction</th>
          <th className="px-2 py-1">Entry Price</th>
          <th className="px-2 py-1">Qty</th>
          <th className="px-2 py-1">Status</th>
          <th className="px-2 py-1">PnL</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t: Trade) => (
          <tr key={t.id} className="border-b border-gray-700">
            <td className="px-2 py-1">{t.id}</td>
            <td className="px-2 py-1 capitalize">{t.direction}</td>
            <td className="px-2 py-1">{t.entry_price.toFixed(4)}</td>
            <td className="px-2 py-1">{t.quantity}</td>
            <td className="px-2 py-1">{t.status}</td>
            <td className="px-2 py-1">{t.pnl ? t.pnl.toFixed(2) : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
