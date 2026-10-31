import React from 'react';
import { 
  BarChart2, 
  RotateCcw, 
  TrendingUp, 
  ChevronDown, 
  Search, 
  Eye, 
  Play, 
  Layers, 
  Sliders, 
  Check, 
  Maximize2,
  Calendar,
  RefreshCw
} from 'lucide-react';
import type { Candle } from '../../types/market';

interface TopBarProps {
  symbol: string;
  onSelectSymbol: (symbol: string) => void;
  timeframe: string;
  onSelectTimeframe: (tf: string) => void;
  latestCandle: Candle | null;
  hoveredCandle: Candle | null;
  isReplayActive: boolean;
  onToggleReplay: () => void;
  onOpenReplayDatePicker?: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

const AVAILABLE_INSTRUMENTS = [
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'Crypto', exchange: 'BINANCE' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', category: 'Crypto', exchange: 'BINANCE' },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar', category: 'Crypto', exchange: 'BINANCE' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'Stocks', exchange: 'NASDAQ' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'Stocks', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'Stocks', exchange: 'NASDAQ' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'Forex', exchange: 'FX' },
  { symbol: 'GBP/USD', name: 'British Pound / USD', category: 'Forex', exchange: 'FX' },
  { symbol: 'SPX', name: 'S&P 500 Index', category: 'Indices', exchange: 'CBOE' },
  { symbol: 'GOLD', name: 'Gold Futures', category: 'Commodities', exchange: 'COMEX' },
];

const TIMEFRAMES = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

export const TopBar: React.FC<TopBarProps> = ({
  symbol,
  onSelectSymbol,
  timeframe,
  onSelectTimeframe,
  latestCandle,
  hoveredCandle,
  isReplayActive,
  onToggleReplay,
  onOpenReplayDatePicker,
  onRefreshData,
  isRefreshing = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const activeCandle = hoveredCandle || latestCandle;

  // Calculate change stats
  const priceChange = activeCandle ? activeCandle.close - activeCandle.open : 0;
  const pctChange = activeCandle && activeCandle.open > 0 ? (priceChange / activeCandle.open) * 100 : 0;
  const isPositive = priceChange >= 0;

  const currentInst = AVAILABLE_INSTRUMENTS.find(i => i.symbol === symbol) || {
    symbol,
    name: symbol,
    category: 'Market',
    exchange: 'GLOBAL'
  };

  const filteredInstruments = AVAILABLE_INSTRUMENTS.filter(i => 
    i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="h-13 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-3 text-sm select-none z-30">
      {/* LEFT SECTION: Logo, Instrument Selector, Timeframe Chips */}
      <div className="flex items-center gap-2">
        {/* Brand / Logo inspired by Simvestrix & TradingView */}
        <div className="flex items-center gap-2 pr-3 border-r border-[#2a2e39]">
          <div className="w-7 h-7 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-md flex items-center justify-center font-bold text-white shadow-md text-xs">
            ML
          </div>
          <span className="font-extrabold tracking-tight text-white text-base hidden sm:inline">
            Market<span className="text-blue-500">Lab</span>
          </span>
        </div>

        {/* Instrument Search & Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#1e222d] hover:bg-[#2a2e39] text-white font-semibold transition border border-transparent hover:border-[#363a45]"
          >
            <span className="text-white font-bold">{symbol}</span>
            <span className="text-[10px] text-gray-400 font-normal px-1 bg-[#131722] rounded border border-gray-700 uppercase">
              {currentInst.exchange}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-11 w-72 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-[#2a2e39] flex items-center gap-2 bg-[#181b24]">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-gray-500"
                  autoFocus
                />
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#2a2e39]/50">
                {filteredInstruments.map((inst) => (
                  <button
                    key={inst.symbol}
                    onClick={() => {
                      onSelectSymbol(inst.symbol);
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#262b3d] transition ${
                      inst.symbol === symbol ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-gray-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-1.5">
                        {inst.symbol}
                        <span className="text-[9px] px-1 bg-[#131722] text-gray-400 rounded">
                          {inst.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[170px]">{inst.name}</div>
                    </div>
                    {inst.symbol === symbol && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Refresh Live Real Data */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Fetch Fresh Real Data (Yahoo Finance / Binance)"
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#2a2e39] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        )}

        {/* Timeframe Chips */}
        <div className="flex items-center gap-1 bg-[#181b24] p-0.5 rounded border border-[#2a2e39]">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => onSelectTimeframe(tf.id)}
              className={`px-2 py-1 text-xs rounded transition-all font-medium ${
                timeframe === tf.id
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2e39]'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* OHLCV readout preview */}
        {activeCandle && (
          <div className="hidden lg:flex items-center gap-2 pl-2 text-xs font-mono text-gray-400">
            <span>O <span className="text-white">{activeCandle.open.toFixed(2)}</span></span>
            <span>H <span className="text-emerald-400">{activeCandle.high.toFixed(2)}</span></span>
            <span>L <span className="text-rose-400">{activeCandle.low.toFixed(2)}</span></span>
            <span>C <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(2)}</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
              isPositive ? 'bg-emerald-950/70 text-emerald-400' : 'bg-rose-950/70 text-rose-400'
            }`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{pctChange.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Mode Switchers (Watch / Paper / Live / Replay) */}
      <div className="flex items-center gap-2">
        {/* Replay Button with date popover option */}
        <div className="flex items-center bg-[#1e222d] rounded border border-[#2a2e39] p-0.5">
          <button
            onClick={onToggleReplay}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
              isReplayActive
                ? 'bg-amber-500 text-black shadow-md animate-pulse'
                : 'text-gray-300 hover:text-white hover:bg-[#2a2e39]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay</span>
          </button>
          {onOpenReplayDatePicker && (
            <button
              onClick={onOpenReplayDatePicker}
              title="Select Replay Date & Time"
              className="px-2 py-1 text-gray-400 hover:text-white hover:bg-[#2a2e39] rounded transition"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Simvestrix Mode Chips: Paper vs Live */}
        <div className="flex items-center gap-1 bg-[#181b24] p-0.5 rounded border border-[#2a2e39]">
          <span className="px-2.5 py-1 text-xs rounded bg-blue-600/30 text-blue-400 border border-blue-500/40 font-semibold">
            Paper
          </span>
          <span className="px-2.5 py-1 text-xs rounded text-gray-500 font-medium cursor-not-allowed">
            Live
          </span>
        </div>
      </div>
    </header>
  );
};
