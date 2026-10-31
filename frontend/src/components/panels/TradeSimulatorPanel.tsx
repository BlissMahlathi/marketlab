import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  BarChart2, 
  Sliders 
} from 'lucide-react';
import { Instrument, Trade } from '../../types/market';

interface TradeSimulatorPanelProps {
  instrument: Instrument | null;
  currentPrice: number;
  openTrades: Trade[];
  onExecuteTrade: (trade: {
    direction: 'buy' | 'sell';
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
  onCloseTrade: (tradeId: number) => void;
}

export const TradeSimulatorPanel: React.FC<TradeSimulatorPanelProps> = ({
  instrument,
  currentPrice,
  openTrades,
  onExecuteTrade,
  onCloseTrade,
}) => {
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [lots, setLots] = useState<number>(1.0);
  const [slPips, setSlPips] = useState<number>(20);
  const [tpPips, setTpPips] = useState<number>(40);

  const pipSize = instrument?.tick_size ? instrument.tick_size * 10 : 0.0001;
  const calculatedSL = direction === 'buy' ? currentPrice - slPips * pipSize : currentPrice + slPips * pipSize;
  const calculatedTP = direction === 'buy' ? currentPrice + tpPips * pipSize : currentPrice - tpPips * pipSize;
  const riskReward = (tpPips / Math.max(1, slPips)).toFixed(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExecuteTrade({
      direction,
      quantity: lots,
      stopLoss: Number(calculatedSL.toFixed(5)),
      takeProfit: Number(calculatedTP.toFixed(5)),
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#131722] border-l border-[#2a2e39] text-[#d1d4dc] select-none text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2e39] bg-[#1e222d]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-neutral-300">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span>Simulated Execution</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
          Paper Only
        </span>
      </div>

      {/* Order Entry Form */}
      <form onSubmit={handleSubmit} className="p-3 border-b border-[#2a2e39] space-y-3">
        {/* Buy / Sell Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('buy')}
            className={`py-2 rounded font-bold flex items-center justify-center gap-1.5 transition-colors ${
              direction === 'buy'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>BUY / LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection('sell')}
            className={`py-2 rounded font-bold flex items-center justify-center gap-1.5 transition-colors ${
              direction === 'sell'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-[#1e222d] text-[#787b86] hover:text-white'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            <span>SELL / SHORT</span>
          </button>
        </div>

        {/* Current Execution Price */}
        <div className="flex justify-between items-center bg-[#1e222d] px-2.5 py-1.5 rounded border border-[#2a2e39]">
          <span className="text-[#787b86]">Market Price:</span>
          <span className="font-mono font-bold text-sm text-white">
            {currentPrice ? currentPrice.toFixed(instrument?.price_precision || 5) : '---'}
          </span>
        </div>

        {/* Lots sizing */}
        <div className="flex items-center justify-between">
          <label className="text-[#787b86]">Volume (Lots):</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            value={lots}
            onChange={(e) => setLots(parseFloat(e.target.value) || 0.1)}
            className="w-24 bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 font-mono text-right text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* SL & TP Pips */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[#787b86] text-[10px] block mb-1">Stop Loss (Pips)</label>
            <input
              type="number"
              value={slPips}
              onChange={(e) => setSlPips(parseInt(e.target.value, 10) || 5)}
              className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 font-mono text-white text-xs"
            />
          </div>
          <div>
            <label className="text-[#787b86] text-[10px] block mb-1">Take Profit (Pips)</label>
            <input
              type="number"
              value={tpPips}
              onChange={(e) => setTpPips(parseInt(e.target.value, 10) || 10)}
              className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 font-mono text-white text-xs"
            />
          </div>
        </div>

        {/* Risk / Reward Preview */}
        <div className="flex justify-between items-center text-[11px] text-[#787b86] px-1">
          <span>Target R:R Ratio</span>
          <span className="font-mono font-bold text-emerald-400">1 : {riskReward}</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-2 rounded font-bold uppercase tracking-wider text-xs shadow transition-colors ${
            direction === 'buy'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          Place {direction.toUpperCase()} Order
        </button>
      </form>

      {/* Active Position Summary */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#787b86] uppercase">Active Positions</span>
          <span className="text-[10px] bg-[#1e222d] px-1.5 py-0.5 rounded text-neutral-400 font-mono">
            {openTrades.length}
          </span>
        </div>

        {openTrades.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-[11px]">
            No open simulated positions.
          </div>
        ) : (
          <div className="space-y-2">
            {openTrades.map((t) => {
              const livePnl = currentPrice
                ? t.direction === 'buy'
                  ? (currentPrice - t.entry_price) * t.quantity * 100000
                  : (t.entry_price - currentPrice) * t.quantity * 100000
                : 0;

              return (
                <div
                  key={t.id}
                  className="bg-[#1e222d] border border-[#2a2e39] rounded p-2 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`font-bold uppercase text-[11px] px-1 rounded ${
                        t.direction === 'buy' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {t.direction} {t.quantity} Lots
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        livePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ${livePnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 text-[10px] text-neutral-400 font-mono">
                    <div>Entry: {t.entry_price.toFixed(5)}</div>
                    <div>SL: {t.stop_loss ? t.stop_loss.toFixed(5) : '--'}</div>
                    <div>TP: {t.take_profit ? t.take_profit.toFixed(5) : '--'}</div>
                    <div>Now: {currentPrice ? currentPrice.toFixed(5) : '--'}</div>
                  </div>

                  <button
                    onClick={() => onCloseTrade(t.id)}
                    className="w-full mt-1 py-1 rounded bg-[#2a2e39] hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold uppercase transition-colors"
                  >
                    Close Position
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
