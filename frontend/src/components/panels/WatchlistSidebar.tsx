import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Star,
  Plus
} from 'lucide-react';

interface WatchlistSidebarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const DEFAULT_WATCHLIST = [
  { symbol: 'BTC/USD', name: 'Bitcoin', price: 76894.00, change: +2.14, category: 'Crypto' },
  { symbol: 'ETH/USD', name: 'Ethereum', price: 2241.61, change: +1.85, category: 'Crypto' },
  { symbol: 'SOL/USD', name: 'Solana', price: 178.40, change: +4.22, category: 'Crypto' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 204.64, change: -1.45, category: 'Stocks' },
  { symbol: 'AAPL', name: 'Apple Inc', price: 228.30, change: +0.64, category: 'Stocks' },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 342.10, change: +3.12, category: 'Stocks' },
  { symbol: 'EUR/USD', name: 'Euro / USD', price: 1.08507, change: -0.09, category: 'Forex' },
  { symbol: 'GBP/USD', name: 'Pound / USD', price: 1.28420, change: +0.12, category: 'Forex' },
  { symbol: 'GOLD', name: 'Gold Spot', price: 2748.20, change: +0.45, category: 'Commodities' },
];

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  currentSymbol,
  onSelectSymbol,
  isOpen,
  onToggle,
}) => {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = DEFAULT_WATCHLIST.filter(item => {
    const matchesSearch = item.symbol.toLowerCase().includes(search.toLowerCase()) || 
                          item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filter === 'ALL' || item.category.toUpperCase() === filter.toUpperCase();
    return matchesSearch && matchesCat;
  });

  return (
    <aside className={`relative flex flex-col bg-[#131722] border-l border-[#2a2e39] transition-all duration-200 select-none ${
      isOpen ? 'w-64' : 'w-10'
    }`}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-3 w-6 h-6 bg-[#1e222d] border border-[#2a2e39] rounded-full flex items-center justify-center text-gray-400 hover:text-white shadow z-10"
      >
        {isOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {isOpen ? (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-[#2a2e39]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-200 tracking-wide uppercase">Watchlist</span>
              <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 bg-emerald-950/60 rounded font-semibold border border-emerald-900">
                LIVE FEED
              </span>
            </div>

            {/* Search */}
            <div className="flex items-center gap-1.5 bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-xs text-white">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter watchlist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full placeholder-gray-500"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold text-gray-400">
              {['ALL', 'CRYPTO', 'STOCKS', 'FOREX'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-2 py-0.5 rounded transition ${
                    filter === cat ? 'bg-blue-600 text-white' : 'hover:bg-[#1e222d] text-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#2a2e39]/40">
            {filtered.map((item) => {
              const isSelected = item.symbol === currentSymbol;
              const isPos = item.change >= 0;
              return (
                <button
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`w-full p-2.5 flex items-center justify-between text-left hover:bg-[#1e222d] transition ${
                    isSelected ? 'bg-blue-600/15 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      {item.symbol}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate max-w-[100px]">{item.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-gray-200">
                      {item.price > 10 ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : item.price.toFixed(5)}
                    </div>
                    <div className={`text-[10px] font-mono flex items-center justify-end gap-0.5 ${
                      isPos ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPos ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {isPos ? '+' : ''}{item.change.toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-4 gap-3 text-gray-400">
          <Star className="w-4 h-4 hover:text-amber-400 cursor-pointer" onClick={onToggle} />
        </div>
      )}
    </aside>
  );
};
