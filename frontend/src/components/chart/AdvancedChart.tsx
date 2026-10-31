import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createChart, 
  CandlestickSeries,
  ColorType,
  Time
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import type { Candle, DrawingObject, DrawingToolType, DrawingPoint } from '../../types/market';

interface ChartProps {
  candles: Candle[];
  activeTool: DrawingToolType;
  drawings: DrawingObject[];
  onAddDrawing: (drawing: DrawingObject) => void;
  onCursorCrosshair?: (candle: Candle | null) => void;
}

export const AdvancedChart: React.FC<ChartProps> = ({
  candles,
  activeTool,
  drawings,
  onAddDrawing,
  onCursorCrosshair,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Drawing in progress state
  const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([]);

  // Initialize and update Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0e1117' },
        textColor: '#787b86',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        mode: 1, // Magnet / normal crosshair
        vertLine: { color: '#4c525e', width: 1, style: 3 },
        horzLine: { color: '#4c525e', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Crosshair listener for status bar / inspection
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !seriesRef.current) {
        onCursorCrosshair?.(null);
        return;
      }
      const data = param.seriesData.get(seriesRef.current) as CandlestickData<Time>;
      if (data) {
        onCursorCrosshair?.({
          time: Number(data.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart candlestick data when replay step or dataset changes
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const formattedData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(formattedData);
    // Automatically fit the chart view whenever new timeframe candles arrive
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // Convert mouse pixel coordinates to chart Time & Price
  const getCoordinatesFromEvent = useCallback((clientX: number, clientY: number): DrawingPoint | null => {
    if (!chartRef.current || !seriesRef.current || !chartContainerRef.current) return null;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const time = chartRef.current.timeScale().coordinateToTime(x);
    const price = seriesRef.current.coordinateToPrice(y);

    if (time === null || price === null) return null;
    return { time: Number(time), price };
  }, []);

  // Handle drawing tool clicks on the chart layer
  const handlePointClick = (clientX: number, clientY: number) => {
    if (activeTool === 'cursor') return;

    const coord = getCoordinatesFromEvent(clientX, clientY);
    if (!coord) return;

    if (activeTool === 'horizontal_line') {
      const newDrawing: DrawingObject = {
        id: `draw_${Date.now()}`,
        tool: 'horizontal_line',
        points: [coord],
        color: '#f59e0b',
        isComplete: true,
      };
      onAddDrawing(newDrawing);
      return;
    }

    if (currentPoints.length === 0) {
      setCurrentPoints([coord]);
    } else {
      const p1 = currentPoints[0];
      const p2 = coord;

      let color = '#3b82f6';
      if (activeTool === 'rectangle') color = '#10b981';
      if (activeTool === 'position_long') color = '#22c55e';
      if (activeTool === 'position_short') color = '#ef4444';
      if (activeTool === 'bos') color = '#38bdf8';
      if (activeTool === 'choch') color = '#c084fc';
      if (activeTool === 'fvg') color = '#f59e0b';

      const newDrawing: DrawingObject = {
        id: `draw_${Date.now()}`,
        tool: activeTool,
        points: [p1, p2],
        color,
        isComplete: true,
      };
      onAddDrawing(newDrawing);
      setCurrentPoints([]);
    }
  };

  // Convert Time & Price coordinate to viewport pixels
  const getPointPixel = (point: DrawingPoint) => {
    if (!chartRef.current || !seriesRef.current) return null;
    const x = chartRef.current.timeScale().timeToCoordinate(point.time as Time);
    const y = seriesRef.current.priceToCoordinate(point.price);
    if (x === null || y === null) return null;
    return { x, y };
  };

  // Trigger continuous re-render of overlay SVG as chart is zoomed or scrolled
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!chartRef.current) return;
    const handler = () => setTick((t) => (t + 1) % 1000);
    chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handler);
    return () => {
      chartRef.current?.timeScale().unsubscribeVisibleTimeRangeChange(handler);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* TradingView Lightweight Charts canvas */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
        onClick={(e) => handlePointClick(e.clientX, e.clientY)}
      />

      {/* Interactive SVG Drawing Overlay */}
      <svg 
        className={`absolute inset-0 w-full h-full pointer-events-none ${
          activeTool !== 'cursor' ? 'cursor-crosshair pointer-events-auto' : ''
        }`}
        onClick={(e) => handlePointClick(e.clientX, e.clientY)}
      >
        {/* Render Saved Drawings */}
        {drawings.map((draw) => {
          if (draw.tool === 'horizontal_line') {
            const p = getPointPixel(draw.points[0]);
            if (!p) return null;
            return (
              <g key={draw.id}>
                <line
                  x1={0}
                  y1={p.y}
                  x2="100%"
                  y2={p.y}
                  stroke={draw.color || '#f59e0b'}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x="10"
                  y={p.y - 4}
                  fill={draw.color || '#f59e0b'}
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {draw.points[0].price.toFixed(5)}
                </text>
              </g>
            );
          }

          if (draw.points.length >= 2) {
            const p1 = getPointPixel(draw.points[0]);
            const p2 = getPointPixel(draw.points[1]);
            if (!p1 || !p2) return null;

            if (draw.tool === 'trendline') {
              return (
                <g key={draw.id}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={draw.color || '#3b82f6'}
                    strokeWidth="2"
                  />
                  <circle cx={p1.x} cy={p1.y} r="3" fill={draw.color || '#3b82f6'} />
                  <circle cx={p2.x} cy={p2.y} r="3" fill={draw.color || '#3b82f6'} />
                </g>
              );
            }

            if (draw.tool === 'rectangle' || draw.tool === 'fvg') {
              const x = Math.min(p1.x, p2.x);
              const y = Math.min(p1.y, p2.y);
              const width = Math.abs(p2.x - p1.x);
              const height = Math.abs(p2.y - p1.y);

              return (
                <g key={draw.id}>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={draw.color ? `${draw.color}22` : '#10b98122'}
                    stroke={draw.color || '#10b981'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x + 4}
                    y={y + 14}
                    fill={draw.color || '#10b981'}
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {draw.tool === 'fvg' ? 'FVG ZONE' : 'SUPPLY/DEMAND'}
                  </text>
                </g>
              );
            }

            if (draw.tool === 'bos' || draw.tool === 'choch') {
              return (
                <g key={draw.id}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p1.y}
                    stroke={draw.color || '#38bdf8'}
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={(p1.x + p2.x) / 2 - 15}
                    y={p1.y - 4}
                    fill={draw.color || '#38bdf8'}
                    fontSize="10"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {draw.tool.toUpperCase()}
                  </text>
                </g>
              );
            }

            if (draw.tool === 'position_long' || draw.tool === 'position_short') {
              const isLong = draw.tool === 'position_long';
              const x = Math.min(p1.x, p2.x);
              const width = Math.max(80, Math.abs(p2.x - p1.x));
              const entryY = p1.y;
              const targetY = p2.y;
              const stopY = isLong ? entryY + Math.abs(targetY - entryY) * 0.5 : entryY - Math.abs(targetY - entryY) * 0.5;

              return (
                <g key={draw.id}>
                  {/* Profit Target Box */}
                  <rect
                    x={x}
                    y={Math.min(entryY, targetY)}
                    width={width}
                    height={Math.abs(targetY - entryY)}
                    fill="rgba(34, 197, 94, 0.2)"
                    stroke="#22c55e"
                    strokeWidth="1"
                  />
                  {/* Stop Loss Box */}
                  <rect
                    x={x}
                    y={Math.min(entryY, stopY)}
                    width={width}
                    height={Math.abs(stopY - entryY)}
                    fill="rgba(239, 68, 68, 0.2)"
                    stroke="#ef4444"
                    strokeWidth="1"
                  />
                  {/* Entry Line */}
                  <line x1={x} y1={entryY} x2={x + width} y2={entryY} stroke="#3b82f6" strokeWidth="2" />
                  <text x={x + 4} y={entryY - 4} fill="#ffffff" fontSize="10" fontWeight="bold">
                    {isLong ? 'LONG ENTRY' : 'SHORT ENTRY'} (1:2.0 R:R)
                  </text>
                </g>
              );
            }
          }
          return null;
        })}

        {/* Temporary point during multi-click tool creation */}
        {currentPoints.length === 1 && (() => {
          const p = getPointPixel(currentPoints[0]);
          return p ? (
            <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
          ) : null;
        })()}
      </svg>
    </div>
  );
};
