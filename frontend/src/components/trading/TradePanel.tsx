// src/components/trading/TradePanel.tsx
import React from "react";
import { TradeEntryForm } from "./TradeEntryForm";
import { TradeList } from "./TradeList";

/**
 * Combined panel for paper‑trade simulation.
 * Shows a form to add a trade and a list of existing trades.
 * In production you would add controls for closing trades, editing, etc.
 */
export const TradePanel: React.FC = () => {
  return (
    <div className="p-4 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-3 text-gray-100">Paper Trade Simulator</h2>
      <TradeEntryForm />
      <div className="mt-4">
        <TradeList />
      </div>
    </div>
  );
};
