export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Instrument {
  id: number;
  symbol: string;
  name: string;
  asset_class: 'forex' | 'crypto' | 'stocks' | 'futures' | 'indices';
  exchange: string;
  tick_size: number;
  lot_size: number;
  price_precision: number;
}

export interface ReplaySessionState {
  session_id: string;
  symbol: string;
  timeframe: string;
  cursor_index: number;
  current_time: number;
  total_bars: number;
  status: 'ready' | 'playing' | 'paused' | 'completed';
  speed: number;
  latest_candle?: Candle;
}

export type DrawingToolType = 
  | 'cursor'
  | 'trendline'
  | 'horizontal_line'
  | 'rectangle'
  | 'position_long'
  | 'position_short'
  | 'bos'
  | 'choch'
  | 'fvg';

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface DrawingObject {
  id: string;
  tool: DrawingToolType;
  points: DrawingPoint[];
  color?: string;
  text?: string;
  isComplete: boolean;
}

export interface Trade {
  id: number;
  workspace_id: number;
  instrument_id: number;
  direction: 'buy' | 'sell';
  entry_time: string;
  exit_time?: string;
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  quantity: number;
  pnl: number;
  pnl_percentage: number;
  status: 'open' | 'closed' | 'cancelled';
  exit_reason?: string;
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  entry_type: string;
  created_at: string;
}
