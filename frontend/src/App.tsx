import React, { useState, useEffect, useMemo } from 'react';
import { AdvancedChart } from './components/chart/AdvancedChart';
import { DrawingToolbar } from './components/drawing-tools/DrawingToolbar';
import { ReplayController } from './components/replay/ReplayController';
import { TopBar } from './components/navigation/TopBar';
import { WatchlistSidebar } from './components/panels/WatchlistSidebar';
import { ReplayDatePickerModal } from './components/replay/ReplayDatePickerModal';
import { TradeSimulatorPanel } from './components/panels/TradeSimulatorPanel';
import { JournalPanel } from './components/panels/JournalPanel';
import type { Candle, DrawingObject, DrawingToolType, Instrument, Trade, JournalEntry, ReplaySessionState } from './types/market';

export const App: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('BTC/USD');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingToolType>('cursor');
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [cursorCandle, setCursorCandle] = useState<Candle | null>(null);

  // Replay Mode
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [replayIndex, setReplayIndex] = useState<number>(100);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);

  // Trades & Journal
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // Panels
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(true);
  const [bottomTab, setBottomTab] = useState<'replay' | 'trade' | 'journal'>('replay');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fetch real candles whenever symbol or timeframe changes
  const loadCandles = async (forceRefresh = false) => {
    setIsRefreshing(true);
    try {
      const resp = await fetch(`/api/instruments/${encodeURIComponent(symbol)}/candles?timeframe=${timeframe}&refresh=${forceRefresh}`);
      if (resp.ok) {
        const data = await resp.json();
        const loaded: Candle[] = data.candles || [];
        setCandles(loaded);
        if (loaded.length > 0) {
          setReplayIndex(Math.min(150, Math.floor(loaded.length * 0.7)));
        }
      }
    } catch (err) {
      console.error('Failed to load candles:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCandles(false);
  }, [symbol, timeframe]);

  // Load trades and journal
  useEffect(() => {
    fetch('/api/trades?workspace_id=1')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setOpenTrades(d); })
      .catch(console.error);

    fetch('/api/journal?workspace_id=1')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setJournalEntries(d); })
      .catch(console.error);
  }, []);

  // Load saved drawings for the active instrument
  useEffect(() => {
    fetch('/api/drawings?workspace_id=1&instrument_id=1')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const parsed = data.map(d => ({
            id: d.id,
            tool: d.object_type,
            points: JSON.parse(d.anchor_data_json || '[]'),
            color: d.style_json ? JSON.parse(d.style_json).color : undefined,
            isComplete: true
          }));
          setDrawings(parsed);
        }
      })
      .catch(console.error);
  }, [symbol]);

  // Handle adding drawings with SQLite persistence
  const handleAddDrawing = async (drawing: DrawingObject) => {
    setDrawings(prev => [...prev, drawing]);
    try {
      await fetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: drawing.id,
          workspace_id: 1,
          instrument_id: 1,
          object_type: drawing.tool,
          anchor_data_json: JSON.stringify(drawing.points),
          style_json: JSON.stringify({ color: drawing.color })
        })
      });
    } catch (err) {
      console.error('Failed to persist drawing:', err);
    }
  };

  const handleClearDrawings = async () => {
    for (const d of drawings) {
      fetch(`/api/drawings/${d.id}`, { method: 'DELETE' }).catch(console.error);
    }
    setDrawings([]);
  };

  // Replay playback loop
  useEffect(() => {
    if (!isReplayMode || !isReplayPlaying) return;
    const intervalTime = Math.max(100, Math.floor(1000 / replaySpeed));
    const timer = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= candles.length) {
          setIsReplayPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isReplayMode, isReplayPlaying, replaySpeed, candles.length]);

  const visibleCandles = isReplayMode ? candles.slice(0, replayIndex) : candles;
  const latestVisibleCandle = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1] : null;

  // Jump replay to a timestamp
  const handleJumpToTimestamp = (targetTs: number) => {
    const idx = candles.findIndex(c => c.time >= targetTs);
    if (idx !== -1) {
      setReplayIndex(Math.max(10, idx));
      setIsReplayMode(true);
    }
  };

  // Replay session state representation for controller
  const replaySessionState: ReplaySessionState = useMemo(() => ({
    session_id: 'local_session',
    symbol,
    timeframe,
    cursor_index: replayIndex,
    current_time: latestVisibleCandle ? latestVisibleCandle.time : 0,
    total_bars: candles.length,
    status: isReplayPlaying ? 'playing' : 'paused',
    speed: replaySpeed,
    latest_candle: latestVisibleCandle || undefined,
  }), [symbol, timeframe, replayIndex, candles.length, isReplayPlaying, replaySpeed, latestVisibleCandle]);

  const activeInstrument: Instrument = useMemo(() => ({
    id: 1,
    symbol,
    name: symbol,
    asset_class: 'crypto',
    exchange: 'BINANCE',
    tick_size: 0.01,
    lot_size: 1,
    price_precision: 2,
  }), [symbol]);

  const handleExecuteTrade = async (tradeParams: {
    direction: 'buy' | 'sell';
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    if (!latestVisibleCandle) return;
    const body = {
      workspace_id: 1,
      instrument_id: 1,
      direction: tradeParams.direction,
      entry_time: new Date(latestVisibleCandle.time * 1000).toISOString(),
      entry_price: latestVisibleCandle.close,
      stop_loss: tradeParams.stopLoss,
      take_profit: tradeParams.takeProfit,
      quantity: tradeParams.quantity,
    };
    try {
      const resp = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (resp.ok) {
        const trResp = await fetch('/api/trades?workspace_id=1');
        const updated = await trResp.json();
        setOpenTrades(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseTrade = async (tradeId: number) => {
    if (!latestVisibleCandle) return;
    try {
      await fetch(`/api/trades/${tradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exit_price: latestVisibleCandle.close,
          exit_time: new Date(latestVisibleCandle.time * 1000).toISOString(),
          exit_reason: 'manual'
        })
      });
      const trResp = await fetch('/api/trades?workspace_id=1');
      const updated = await trResp.json();
      setOpenTrades(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddJournalEntry = async (entry: { title: string; content: string; entry_type: string }) => {
    try {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: 1,
          title: entry.title,
          content: entry.content,
          entry_type: entry.entry_type,
          event_time: latestVisibleCandle ? new Date(latestVisibleCandle.time * 1000).toISOString() : new Date().toISOString()
        })
      });
      const res = await fetch('/api/journal?workspace_id=1');
      const updated = await res.json();
      setJournalEntries(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e1117] text-gray-200 overflow-hidden font-sans">
      {/* 1. Simvestrix/TradingView Top Bar */}
      <TopBar
        symbol={symbol}
        onSelectSymbol={setSymbol}
        timeframe={timeframe}
        onSelectTimeframe={setTimeframe}
        latestCandle={latestVisibleCandle}
        hoveredCandle={cursorCandle}
        isReplayActive={isReplayMode}
        onToggleReplay={() => {
          setIsReplayMode(!isReplayMode);
          if (!isReplayMode) setBottomTab('replay');
        }}
        onOpenReplayDatePicker={() => setIsDatePickerOpen(true)}
        onRefreshData={() => loadCandles(true)}
        isRefreshing={isRefreshing}
      />

      {/* 2. Main Workspace: Drawing Toolbar + Chart + Watchlist Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Vertical Drawing Toolbar */}
        <DrawingToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onClearDrawings={handleClearDrawings}
          drawingCount={drawings.length}
        />

        {/* Center Candlestick Chart Area */}
        <main className="flex-1 relative flex flex-col min-w-0 bg-[#0e1117]">
          <div className="flex-1 relative">
            <AdvancedChart
              candles={visibleCandles}
              activeTool={activeTool}
              drawings={drawings}
              onAddDrawing={handleAddDrawing}
              onCursorCrosshair={setCursorCandle}
            />

            {/* Replay Watermark Indicator */}
            {isReplayMode && (
              <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2 bg-[#1e222d]/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-amber-500/30">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                  REPLAY ACTIVE ({visibleCandles.length}/{candles.length} CANDLES)
                </span>
              </div>
            )}
          </div>

          {/* Bottom Tabs Switcher (Replay / Paper Trading / Journal) */}
          <div className="h-8 bg-[#131722] border-t border-[#2a2e39] flex items-center justify-between px-3 text-xs select-none">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBottomTab('replay')}
                className={`px-3 py-1 rounded transition font-medium ${
                  bottomTab === 'replay' ? 'bg-[#1e222d] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Replay Controller
              </button>
              <button
                onClick={() => setBottomTab('trade')}
                className={`px-3 py-1 rounded transition font-medium ${
                  bottomTab === 'trade' ? 'bg-[#1e222d] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Paper Trading
              </button>
              <button
                onClick={() => setBottomTab('journal')}
                className={`px-3 py-1 rounded transition font-medium ${
                  bottomTab === 'journal' ? 'bg-[#1e222d] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Journal
              </button>
            </div>
          </div>

          {/* Bottom Panel Drawer Content */}
          <div className="h-44 bg-[#131722] border-t border-[#2a2e39] overflow-hidden">
            {bottomTab === 'replay' && (
              <ReplayController
                session={replaySessionState}
                isPlaying={isReplayPlaying}
                onPlayToggle={() => setIsReplayPlaying(!isReplayPlaying)}
                onStepForward={() => setReplayIndex(prev => Math.min(candles.length, prev + 1))}
                onStepBackward={() => setReplayIndex(prev => Math.max(1, prev - 1))}
                onSeek={(idx) => setReplayIndex(idx)}
                onReset={() => {
                  setReplayIndex(50);
                  setIsReplayPlaying(false);
                }}
                onSpeedChange={setReplaySpeed}
              />
            )}
            {bottomTab === 'trade' && (
              <div className="p-3 h-full overflow-y-auto">
                <TradeSimulatorPanel
                  instrument={activeInstrument}
                  currentPrice={latestVisibleCandle ? latestVisibleCandle.close : 0}
                  openTrades={openTrades}
                  onExecuteTrade={handleExecuteTrade}
                  onCloseTrade={handleCloseTrade}
                />
              </div>
            )}
            {bottomTab === 'journal' && (
              <div className="p-3 h-full overflow-y-auto">
                <JournalPanel
                  entries={journalEntries}
                  onAddEntry={handleAddJournalEntry}
                  currentReplayTime={latestVisibleCandle ? latestVisibleCandle.time : undefined}
                />
              </div>
            )}
          </div>
        </main>

        {/* Right Watchlist Sidebar (inspired by Image 1, 2, 3) */}
        <WatchlistSidebar
          currentSymbol={symbol}
          onSelectSymbol={(sym) => {
            setSymbol(sym);
          }}
          isOpen={isWatchlistOpen}
          onToggle={() => setIsWatchlistOpen(!isWatchlistOpen)}
        />
      </div>

      {/* Date & Time Picker Modal for Replay Jump (Image 4) */}
      <ReplayDatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={handleJumpToTimestamp}
        firstAvailableDate={candles.length > 0 ? new Date(candles[0].time * 1000).toISOString().split('T')[0] : '2024-01-01'}
      />
    </div>
  );
};
export default App;
