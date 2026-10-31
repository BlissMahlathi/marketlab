import React from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  StepBack, 
  RotateCcw, 
  Clock, 
  Activity, 
  ShieldAlert 
} from 'lucide-react';
import { ReplaySessionState } from '../../types/market';

interface ReplayControllerProps {
  session: ReplaySessionState | null;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
}

export const ReplayController: React.FC<ReplayControllerProps> = ({
  session,
  isPlaying,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onReset,
  onSpeedChange,
  onSeek,
}) => {
  if (!session) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-500 py-1">
        <Activity className="w-3.5 h-3.5 animate-pulse text-amber-500" />
        Initializing Historical Replay Engine...
      </div>
    );
  }

  const formatTimestamp = (unixSeconds: number) => {
    if (!unixSeconds) return '--:--:--';
    const date = new Date(unixSeconds * 1000);
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const progressPct = session.total_bars > 0 
    ? ((session.cursor_index / (session.total_bars - 1)) * 100).toFixed(1)
    : '0';

  return (
    <div className="flex items-center justify-between w-full bg-[#131722] border-t border-[#2a2e39] px-4 py-2 select-none">
      {/* Playback action controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          title="Reset to Replay Start"
          className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onStepBackward}
          title="Step Backward (Previous Bar)"
          className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
        >
          <StepBack className="w-4 h-4" />
        </button>

        <button
          onClick={onPlayToggle}
          title={isPlaying ? 'Pause Replay' : 'Start Replay'}
          className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium text-xs transition-colors shadow-sm ${
            isPlaying 
              ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>REPLAY</span>
            </>
          )}
        </button>

        <button
          onClick={onStepForward}
          title="Step Forward (Reveal Next Bar)"
          className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
        >
          <StepForward className="w-4 h-4" />
        </button>

        {/* Speed presets */}
        <div className="flex items-center ml-2 bg-[#1e222d] border border-[#2a2e39] rounded px-1.5 py-0.5 text-xs text-[#787b86]">
          <span className="mr-1 text-[10px] uppercase font-bold text-neutral-400">Speed</span>
          {[0.5, 1.0, 2.0, 5.0].map((spd) => (
            <button
              key={spd}
              onClick={() => onSpeedChange(spd)}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                session.speed === spd
                  ? 'bg-blue-600 text-white font-bold'
                  : 'hover:text-[#d1d4dc]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Timeline scrubber slider */}
      <div className="flex-1 max-w-md mx-6 flex items-center gap-3">
        <span className="text-[11px] font-mono text-[#787b86]">
          {session.cursor_index + 1} / {session.total_bars}
        </span>
        <input
          type="range"
          min={10}
          max={session.total_bars - 1}
          value={session.cursor_index}
          onChange={(e) => onSeek(parseInt(e.target.value, 10))}
          className="w-full accent-blue-500 h-1 bg-[#2a2e39] rounded appearance-none cursor-pointer"
        />
        <span className="text-[11px] font-mono text-blue-400 w-10 text-right">
          {progressPct}%
        </span>
      </div>

      {/* Historical Simulation Clock & Status */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-emerald-400">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{formatTimestamp(session.current_time)}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-neutral-400" title="Strict no-lookahead mode active">
          <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">No-Lookahead Protected</span>
        </div>
      </div>
    </div>
  );
};
