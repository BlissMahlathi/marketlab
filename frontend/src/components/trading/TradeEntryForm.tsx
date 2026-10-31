import React, { useState } from "react";
import { useTradeStore } from "../../stores/tradeStore";

export const TradeEntryForm: React.FC = () => {
  const { add } = useTradeStore();
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;
    await add({
      workspace_id: 1,
      instrument_id: 1,
      direction,
      entry_time: new Date().toISOString(),
      entry_price: parseFloat(price),
      quantity: parseFloat(quantity),
    });
    setPrice("");
    setQuantity("1");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as any)}
          className="p-1 bg-gray-800 text-gray-100 rounded"
        >
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input
          type="number"
          step="any"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="p-1 w-24 bg-gray-800 text-gray-100 rounded"
          required
        />
        <input
          type="number"
          step="any"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="p-1 w-20 bg-gray-800 text-gray-100 rounded"
          required
        />
        <button
          type="submit"
          className="px-2 py-1 bg-blue-600 text-white rounded"
        >
          Add
        </button>
      </div>
    </form>
  );
};
