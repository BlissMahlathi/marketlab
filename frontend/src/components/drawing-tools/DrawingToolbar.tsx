import React from 'react';
import { 
  MousePointer, 
  TrendingUp, 
  Minus, 
  Square, 
  ArrowUpRight, 
  ArrowDownRight, 
  GitBranch, 
  Layers, 
  Trash2 
} from 'lucide-react';
import { DrawingToolType } from '../../types/market';

interface DrawingToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  drawingCount: number;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeTool,
  onSelectTool,
  onClearDrawings,
  drawingCount,
}) => {
  const tools: { id: DrawingToolType; label: string; icon: React.ReactNode; group: string }[] = [
    { id: 'cursor', label: 'Cursor (Pan & Inspect)', icon: <MousePointer className="w-4 h-4" />, group: 'navigation' },
    { id: 'trendline', label: 'Trendline', icon: <TrendingUp className="w-4 h-4" />, group: 'lines' },
    { id: 'horizontal_line', label: 'Horizontal Line / S&R', icon: <Minus className="w-4 h-4" />, group: 'lines' },
    { id: 'rectangle', label: 'Supply / Demand Zone (Box)', icon: <Square className="w-4 h-4" />, group: 'shapes' },
    { id: 'position_long', label: 'Long Position Risk/Reward', icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />, group: 'trading' },
    { id: 'position_short', label: 'Short Position Risk/Reward', icon: <ArrowDownRight className="w-4 h-4 text-rose-400" />, group: 'trading' },
    { id: 'bos', label: 'Break of Structure (BOS)', icon: <GitBranch className="w-4 h-4 text-blue-400" />, group: 'structure' },
    { id: 'choch', label: 'Change of Character (CHoCH)', icon: <GitBranch className="w-4 h-4 text-purple-400 rotate-180" />, group: 'structure' },
    { id: 'fvg', label: 'Fair Value Gap (FVG)', icon: <Layers className="w-4 h-4 text-amber-400" />, group: 'structure' },
  ];

  return (
    <div className="flex flex-col items-center w-12 bg-[#131722] border-r border-[#2a2e39] py-3 gap-1 z-10 select-none">
      {tools.map((item) => {
        const isActive = activeTool === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTool(item.id)}
            title={item.label}
            className={`w-9 h-9 flex items-center justify-center rounded transition-all duration-150 ${
              isActive
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]'
            }`}
          >
            {item.icon}
          </button>
        );
      })}

      <div className="my-2 w-6 border-b border-[#2a2e39]" />

      {/* Clear/Delete drawings button */}
      <button
        onClick={onClearDrawings}
        disabled={drawingCount === 0}
        title={`Clear Drawings (${drawingCount})`}
        className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
          drawingCount > 0 
            ? 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300' 
            : 'text-neutral-600 cursor-not-allowed'
        }`}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {drawingCount > 0 && (
        <span className="text-[9px] font-mono font-bold text-neutral-400">
          {drawingCount}
        </span>
      )}
    </div>
  );
};
