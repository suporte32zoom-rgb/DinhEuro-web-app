import React, { useState, useMemo, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  ChartPeriod,
  ChartDisplayType,
  HistoricalPoint,
  ChartAnnotation,
} from "../types/finance";
import { fetchLiveChart } from "../services/marketDataService";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  BarChart2,
  Calendar,
  Loader2,
  Maximize2,
} from "lucide-react";

interface InteractiveChartProps {
  historicalData: Record<ChartPeriod, HistoricalPoint[]>;
  annotations?: Record<string, ChartAnnotation[]>;
  currency: string;
  isPositiveOverall: boolean;
  assetTicker: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  historicalData,
  annotations = {},
  currency,
  isPositiveOverall,
  assetTicker,
}) => {
  const [period, setPeriod] = useState<ChartPeriod>("1D");
  const [displayType, setDisplayType] = useState<ChartDisplayType>("area");
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [showSMA, setShowSMA] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalPoint | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [livePointsMap, setLivePointsMap] = useState<Partial<Record<ChartPeriod, HistoricalPoint[]>>>({});
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const periods: ChartPeriod[] = ["1D", "5D", "1M", "6M", "YTD", "1A", "5A", "MÁX"];

  // Fetch real-time chart points for the selected period
  useEffect(() => {
    let isCancelled = false;
    async function loadChartData() {
      if (livePointsMap[period] && livePointsMap[period]!.length > 0) return;
      setIsLoadingChart(true);
      const data = await fetchLiveChart(assetTicker, period);
      if (!isCancelled && data && data.length > 0) {
        setLivePointsMap((prev) => ({ ...prev, [period]: data }));
      }
      if (!isCancelled) setIsLoadingChart(false);
    }
    loadChartData();
    return () => {
      isCancelled = true;
    };
  }, [assetTicker, period]);

  const points: HistoricalPoint[] = useMemo(() => {
    if (livePointsMap[period] && livePointsMap[period]!.length > 0) {
      return livePointsMap[period]!;
    }
    return historicalData[period] || [];
  }, [livePointsMap, historicalData, period]);

  const activeAnnotations = useMemo(() => {
    return annotations[period] || [];
  }, [annotations, period]);

  // Calculate range metrics
  const { minPrice, maxPrice, startPrice, endPrice, isPeriodPositive } = useMemo(() => {
    if (!points.length) {
      return { minPrice: 0, maxPrice: 100, startPrice: 0, endPrice: 0, isPeriodPositive: true };
    }
    const prices = points.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const start = points[0].price;
    const end = points[points.length - 1].price;
    return {
      minPrice: min,
      maxPrice: max,
      startPrice: start,
      endPrice: end,
      isPeriodPositive: end >= start,
    };
  }, [points]);

  // Dimensions
  const width = 840;
  const height = 380;
  const margin = { top: 28, right: 64, bottom: 44, left: 18 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // D3 Scales
  const { xScale, yScale, volumeScale, yTicks } = useMemo(() => {
    if (!points.length) {
      return {
        xScale: d3.scaleLinear().domain([0, 1]).range([margin.left, margin.left + innerWidth]),
        yScale: d3.scaleLinear().domain([0, 100]).range([margin.top + innerHeight, margin.top]),
        volumeScale: d3.scaleLinear().domain([0, 100]).range([0, 40]),
        yTicks: [],
      };
    }

    const paddingRatio = 0.04;
    const priceRange = maxPrice - minPrice || 1;
    const yDomain = [
      Math.max(0, minPrice - priceRange * paddingRatio),
      maxPrice + priceRange * paddingRatio,
    ];

    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([margin.left, margin.left + innerWidth]);

    const y = d3
      .scaleLinear()
      .domain(yDomain)
      .range([margin.top + innerHeight, margin.top]);

    const maxVol = d3.max(points, (d) => d.volume || 0) || 1;
    const vol = d3.scaleLinear().domain([0, maxVol]).range([0, innerHeight * 0.28]);

    const ticks = y.ticks(5);

    return { xScale: x, yScale: y, volumeScale: vol, yTicks: ticks };
  }, [points, minPrice, maxPrice, innerWidth, innerHeight, margin.left, margin.top]);

  // D3 Path Generators with smooth bezier curve (curveMonotoneX)
  const d3LinePath = useMemo(() => {
    if (points.length < 2) return "";
    const lineGen = d3
      .line<HistoricalPoint>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.price))
      .curve(d3.curveMonotoneX);

    return lineGen(points) || "";
  }, [points, xScale, yScale]);

  const d3AreaPath = useMemo(() => {
    if (points.length < 2) return "";
    const baselineY = margin.top + innerHeight;
    const areaGen = d3
      .area<HistoricalPoint>()
      .x((_, i) => xScale(i))
      .y0(baselineY)
      .y1((d) => yScale(d.price))
      .curve(d3.curveMonotoneX);

    return areaGen(points) || "";
  }, [points, xScale, yScale, margin.top, innerHeight]);

  // D3 SMA (Simple Moving Average 5-period)
  const d3SmaPath = useMemo(() => {
    if (!showSMA || points.length < 5) return "";
    const windowSize = 5;
    const smaData: { index: number; avg: number }[] = [];

    for (let i = windowSize - 1; i < points.length; i++) {
      const slice = points.slice(i - windowSize + 1, i + 1);
      const avg = d3.mean(slice, (d) => d.price) || 0;
      smaData.push({ index: i, avg });
    }

    const smaLineGen = d3
      .line<{ index: number; avg: number }>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.avg))
      .curve(d3.curveMonotoneX);

    return smaLineGen(smaData) || "";
  }, [points, showSMA, xScale, yScale]);

  // Benchmark Path using D3
  const d3BenchmarkPath = useMemo(() => {
    if (!showBenchmark || points.length < 2) return "";
    const bPrices = points.map((p) => p.benchmarkPrice || 100);
    const bMin = d3.min(bPrices) || 90;
    const bMax = d3.max(bPrices) || 110;
    const bRange = bMax - bMin || 1;

    const bScale = d3
      .scaleLinear()
      .domain([bMin - bRange * 0.05, bMax + bRange * 0.05])
      .range([margin.top + innerHeight, margin.top]);

    const bLineGen = d3
      .line<HistoricalPoint>()
      .x((_, i) => xScale(i))
      .y((d) => bScale(d.benchmarkPrice || 100))
      .curve(d3.curveMonotoneX);

    return bLineGen(points) || "";
  }, [points, showBenchmark, xScale, margin.top, innerHeight]);

  const chartColor = isPeriodPositive ? "#00c853" : "#ff5252";
  const glowFilterId = `d3-glow-${assetTicker.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const gradientId = `d3-area-grad-${assetTicker.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  // Interactive mouse / touch move handler with D3 Bisector
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!points.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    // Constrain within inner width
    const clampedX = Math.max(margin.left, Math.min(margin.left + innerWidth, svgX));
    const approxIndex = Math.round(
      ((clampedX - margin.left) / innerWidth) * (points.length - 1)
    );
    const clampedIndex = Math.max(0, Math.min(points.length - 1, approxIndex));
    const targetPoint = points[clampedIndex];

    if (targetPoint) {
      setHoveredPoint(targetPoint);
      setHoverPosition({
        x: xScale(clampedIndex),
        y: yScale(targetPoint.price),
      });
    }
  };

  const handlePointerLeave = () => {
    setHoveredPoint(null);
    setHoverPosition(null);
  };

  const formatPrice = (val: number) => {
    const symbol = currency === "BRL" ? "R$ " : currency === "USD" ? "US$ " : currency === "EUR" ? "€ " : "";
    return val >= 1000
      ? `${symbol}${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${symbol}${val.toFixed(2)}`;
  };

  const activePoint = hoveredPoint || (points.length > 0 ? points[points.length - 1] : null);
  const periodDiff = activePoint && startPrice ? activePoint.price - startPrice : endPrice - startPrice;
  const periodDiffPct = startPrice ? (periodDiff / startPrice) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-6 shadow-2xl relative transition-all"
    >
      {/* Top Header: Dynamic Price Display & Timeframe Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#21262d]">
        {/* Dynamic Price Display */}
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#e6edf3] tracking-tight">
              {activePoint ? formatPrice(activePoint.price) : "---"}
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-sm sm:text-base font-bold ${
                periodDiffPct >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
              }`}
            >
              <span>{periodDiffPct >= 0 ? "+" : ""}</span>
              <span>{formatPrice(periodDiff)}</span>
              <span>({periodDiffPct >= 0 ? "+" : ""}{periodDiffPct.toFixed(2)}%)</span>
              <span className="text-xs text-[#8b949e] font-normal ml-1">no período ({period})</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-[#8b949e] mt-1 font-mono flex-wrap">
            <span>Data: {activePoint?.date || "Hoje"}</span>
            {activePoint?.time && <span>• {activePoint.time}</span>}
            {activePoint?.volume && (
              <span>• Vol: {(activePoint.volume / 1000).toFixed(0)}k</span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-[#0e1117] text-[10px] text-[#58a6ff] border border-[#30363d]">
              D3 Engine v7
            </span>
            {isLoadingChart && (
              <span className="text-[#58a6ff] flex items-center gap-1 font-sans">
                <Loader2 className="w-3 h-3 animate-spin" /> Atualizando série histórica...
              </span>
            )}
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#0e1117] p-1 rounded-xl border border-[#30363d] overflow-x-auto scrollbar-none">
          {periods.map((p) => (
            <button
              key={p}
              id={`btn-period-${p.toLowerCase()}`}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                period === p
                  ? "bg-[#21262d] text-[#58a6ff] shadow-sm border border-[#58a6ff]/40"
                  : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Tools Bar */}
      <div className="flex items-center justify-between py-3 text-xs text-[#8b949e] flex-wrap gap-2 border-b border-[#21262d]/50">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Style: Area / Line / Candle */}
          <div className="flex items-center bg-[#0e1117] rounded-lg p-0.5 border border-[#30363d]">
            <button
              onClick={() => setDisplayType("area")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                displayType === "area" ? "bg-[#21262d] text-[#58a6ff]" : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Área D3
            </button>
            <button
              onClick={() => setDisplayType("line")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                displayType === "line" ? "bg-[#21262d] text-[#58a6ff]" : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Linha
            </button>
            <button
              onClick={() => setDisplayType("candle")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                displayType === "candle" ? "bg-[#21262d] text-[#58a6ff]" : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Candlesticks
            </button>
          </div>

          {/* Indicators Toggle */}
          <button
            onClick={() => setShowSMA(!showSMA)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              showSMA
                ? "bg-[#a371f7]/15 border-[#a371f7] text-[#d2a8ff]"
                : "bg-[#0e1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Média Móvel (5)</span>
          </button>

          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              showBenchmark
                ? "bg-[#58a6ff]/15 border-[#58a6ff] text-[#58a6ff]"
                : "bg-[#0e1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Benchmark Comparativo</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              showVolume
                ? "bg-[#238636]/15 border-[#238636] text-[#7ee787]"
                : "bg-[#0e1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Volume</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span>Mín: {formatPrice(minPrice)}</span>
          <span className="text-[#30363d]">|</span>
          <span>Máx: {formatPrice(maxPrice)}</span>
        </div>
      </div>

      {/* Main D3 Interactive SVG Canvas */}
      <div className="w-full h-[320px] sm:h-[380px] relative my-2 select-none touch-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            {/* D3 Gradient Fill */}
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.32" />
              <stop offset="65%" stopColor={chartColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
            </linearGradient>

            {/* D3 Glow Filter */}
            <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={chartColor} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* D3 Grid Lines & Y-axis labels */}
          {yTicks.map((val, idx) => {
            const y = yScale(val);
            return (
              <g key={`d3-grid-${idx}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + innerWidth}
                  y2={y}
                  stroke="#21262d"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={margin.left + innerWidth + 8}
                  y={y + 3.5}
                  fill="#8b949e"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatPrice(val)}
                </text>
              </g>
            );
          })}

          {/* X-axis baseline */}
          <line
            x1={margin.left}
            y1={margin.top + innerHeight}
            x2={margin.left + innerWidth}
            y2={margin.top + innerHeight}
            stroke="#30363d"
            strokeWidth="1"
          />

          {/* Volume Bars */}
          {showVolume &&
            points.map((p, idx) => {
              const x = xScale(idx);
              const barHeight = volumeScale(p.volume || 0);
              const y = margin.top + innerHeight - barHeight;
              const isUp = (p.close || p.price) >= (p.open || p.price);
              return (
                <rect
                  key={`d3-vol-${idx}`}
                  x={x - 2.5}
                  y={y}
                  width="5"
                  height={Math.max(barHeight, 2)}
                  fill={isUp ? "#00c853" : "#ff5252"}
                  opacity="0.22"
                  rx="1"
                />
              );
            })}

          {/* D3 Smooth Area Path */}
          {displayType === "area" && d3AreaPath && (
            <path d={d3AreaPath} fill={`url(#${gradientId})`} />
          )}

          {/* D3 Smooth Line Path */}
          {(displayType === "line" || displayType === "area") && d3LinePath && (
            <path
              d={d3LinePath}
              fill="none"
              stroke={chartColor}
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowFilterId})`}
            />
          )}

          {/* Candlestick Visualization */}
          {displayType === "candle" &&
            points.map((p, idx) => {
              const x = xScale(idx);
              const o = p.open || p.price;
              const c = p.close || p.price;
              const h = p.high || Math.max(o, c);
              const l = p.low || Math.min(o, c);

              const yHigh = yScale(h);
              const yLow = yScale(l);
              const yOpen = yScale(o);
              const yClose = yScale(c);

              const topBody = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2.5);
              const isBullish = c >= o;
              const candleColor = isBullish ? "#00c853" : "#ff5252";

              return (
                <g key={`d3-candle-${idx}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth="1.2"
                  />
                  {/* Candle Body */}
                  <rect
                    x={x - 3.5}
                    y={topBody}
                    width="7"
                    height={bodyHeight}
                    fill={isBullish ? "#00c853" : "#ff5252"}
                    fillOpacity="0.85"
                    stroke={candleColor}
                    strokeWidth="0.8"
                    rx="1.5"
                  />
                </g>
              );
            })}

          {/* D3 Moving Average Line */}
          {showSMA && d3SmaPath && (
            <path
              d={d3SmaPath}
              fill="none"
              stroke="#d2a8ff"
              strokeWidth="2"
              strokeDasharray="3 3"
              opacity="0.9"
            />
          )}

          {/* D3 Comparative Benchmark Line */}
          {showBenchmark && d3BenchmarkPath && (
            <path
              d={d3BenchmarkPath}
              fill="none"
              stroke="#58a6ff"
              strokeWidth="1.75"
              strokeDasharray="4 4"
              opacity="0.85"
            />
          )}

          {/* Event Annotations */}
          {activeAnnotations.map((ann, aIdx) => {
            const y = yScale(ann.price);
            return (
              <g key={`ann-${aIdx}`}>
                <circle cx={margin.left + innerWidth - 20} cy={y} r="4" fill="#e3b341" />
                <text
                  x={margin.left + innerWidth - 30}
                  y={y - 8}
                  fill="#e3b341"
                  fontSize="9"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {ann.label}
                </text>
              </g>
            );
          })}

          {/* Interactive D3 Crosshair & Indicator Point */}
          {hoveredPoint && hoverPosition && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={hoverPosition.x}
                y1={margin.top}
                x2={hoverPosition.x}
                y2={margin.top + innerHeight}
                stroke="#58a6ff"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              {/* Horizontal Crosshair Line */}
              <line
                x1={margin.left}
                y1={hoverPosition.y}
                x2={margin.left + innerWidth}
                y2={hoverPosition.y}
                stroke="#58a6ff"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.75"
              />

              {/* Glowing Point */}
              <circle
                cx={hoverPosition.x}
                cy={hoverPosition.y}
                r="7"
                fill={chartColor}
                stroke="#ffffff"
                strokeWidth="2.5"
                filter={`url(#${glowFilterId})`}
              />

              {/* Y-axis price badge */}
              <g transform={`translate(${margin.left + innerWidth + 2}, ${hoverPosition.y - 10})`}>
                <rect x="0" y="0" width="56" height="20" rx="4" fill="#1f6feb" />
                <text x="6" y="14" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {formatPrice(hoveredPoint.price).replace(/^[^\d]+/, "")}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating Scrubber HUD Tooltip */}
        {hoveredPoint && hoverPosition && (
          <div
            className="absolute pointer-events-none z-20 bg-[#0e1117]/95 border border-[#30363d] rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md text-xs font-mono transition-transform"
            style={{
              left: Math.min(
                Math.max(16, (hoverPosition.x / width) * 100),
                75
              ) + "%",
              top: "12px",
            }}
          >
            <div className="flex items-center justify-between gap-3 text-[11px] text-[#8b949e]">
              <span>{hoveredPoint.date}</span>
              {hoveredPoint.time && <span>{hoveredPoint.time}</span>}
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {formatPrice(hoveredPoint.price)}
            </div>
            {hoveredPoint.open !== undefined && (
              <div className="text-[10px] text-[#8b949e] flex gap-2 mt-1">
                <span>A: {hoveredPoint.open.toFixed(2)}</span>
                <span>F: {hoveredPoint.close?.toFixed(2) || hoveredPoint.price.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
