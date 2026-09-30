import React, { useState, useMemo, useEffect } from "react";
import {
  ChartPeriod,
  ChartDisplayType,
  HistoricalPoint,
  ChartAnnotation,
} from "../types/finance";
import { fetchLiveChart } from "../services/marketDataService";
import {
  Layers,
  BarChart2,
  TrendingUp,
  Info,
  Calendar,
  SlidersHorizontal,
  Loader2,
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
  const [livePointsMap, setLivePointsMap] = useState<Partial<Record<ChartPeriod, HistoricalPoint[]>>>({});
  const [isLoadingChart, setIsLoadingChart] = useState(false);

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

  const points = useMemo(() => {
    if (livePointsMap[period] && livePointsMap[period]!.length > 0) {
      return livePointsMap[period]!;
    }
    return historicalData[period] || [];
  }, [livePointsMap, historicalData, period]);

  const activeAnnotations = useMemo(() => {
    return annotations[period] || [];
  }, [annotations, period]);

  // Calculate high, low, first, last
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

  // SMA 5-points calculation
  const smaPoints = useMemo(() => {
    if (!showSMA || points.length < 5) return [];
    const sma: { x: number; y: number }[] = [];
    const windowSize = 5;
    for (let i = windowSize - 1; i < points.length; i++) {
      const slice = points.slice(i - windowSize + 1, i + 1);
      const avg = slice.reduce((acc, p) => acc + p.price, 0) / windowSize;
      sma.push({ x: i, y: avg });
    }
    return sma;
  }, [points, showSMA]);

  // Chart dimensions & scaling
  const chartWidth = 800;
  const chartHeight = 360;
  const padding = { top: 24, right: 60, bottom: 40, left: 16 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const priceRange = maxPrice - minPrice || 1;

  const getX = (idx: number) => {
    return padding.left + (idx / Math.max(points.length - 1, 1)) * graphWidth;
  };

  const getY = (price: number) => {
    return padding.top + graphHeight - ((price - minPrice) / priceRange) * graphHeight;
  };

  const chartColor = isPeriodPositive ? "#00c853" : "#ff5252";

  // Build SVG Path
  const linePath = useMemo(() => {
    if (points.length < 2) return "";
    return points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${getX(idx).toFixed(1)} ${getY(p.price).toFixed(1)}`)
      .join(" ");
  }, [points, minPrice, maxPrice]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return "";
    const firstX = getX(0);
    const lastX = getX(points.length - 1);
    const bottomY = padding.top + graphHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, points]);

  // Benchmark Path
  const benchmarkPath = useMemo(() => {
    if (!showBenchmark || points.length < 2) return "";
    const bPrices = points.map((p) => p.benchmarkPrice || 100);
    const bMin = Math.min(...bPrices);
    const bMax = Math.max(...bPrices);
    const bRange = bMax - bMin || 1;

    return points
      .map((p, idx) => {
        const val = p.benchmarkPrice || 100;
        const y = padding.top + graphHeight - ((val - bMin) / bRange) * graphHeight;
        return `${idx === 0 ? "M" : "L"} ${getX(idx).toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, showBenchmark]);

  // Max Volume for bar sizing
  const maxVolume = useMemo(() => {
    if (!points.length) return 1;
    return Math.max(...points.map((p) => p.volume || 0), 1);
  }, [points]);

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
    <div className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-6 shadow-xl relative">
      {/* Top Controls: Period Selection & Active Point Callout */}
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

          <div className="flex items-center gap-2 text-xs text-[#8b949e] mt-1 font-mono">
            <span>Data: {activePoint?.date || "Hoje"}</span>
            {activePoint?.time && <span>• {activePoint.time}</span>}
            {activePoint?.volume && (
              <span>• Vol: {(activePoint.volume / 1000).toFixed(0)}k</span>
            )}
            {isLoadingChart && (
              <span className="text-[#58a6ff] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Carregando cotações históricas...
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
        <div className="flex items-center gap-2">
          {/* Chart Style: Area / Line / Candle */}
          <div className="flex items-center bg-[#0e1117] rounded-lg p-0.5 border border-[#30363d]">
            <button
              onClick={() => setDisplayType("area")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                displayType === "area" ? "bg-[#21262d] text-[#58a6ff]" : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              Área
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
              Candles
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
            <span>MMA (5)</span>
          </button>

          <button
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              showBenchmark
                ? "bg-[#58a6ff]/15 border-[#58a6ff] text-[#58a6ff]"
                : "bg-[#0e1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <span>Benchmark (Ibov/S&P)</span>
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
              showVolume
                ? "bg-[#238636]/15 border-[#238636] text-[#7ee787]"
                : "bg-[#0e1117] border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <span>Volume</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span>Mín: {formatPrice(minPrice)}</span>
          <span className="text-[#30363d]">|</span>
          <span>Máx: {formatPrice(maxPrice)}</span>
        </div>
      </div>

      {/* Main SVG Interactive Canvas */}
      <div className="w-full h-[320px] sm:h-[360px] relative my-2 select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
              <stop offset="85%" stopColor={chartColor} stopOpacity="0.02" />
              <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
            </linearGradient>

            {/* Candle Green Gradient */}
            <linearGradient id="candleGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c853" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#009624" stopOpacity="0.9" />
            </linearGradient>

            {/* Candle Red Gradient */}
            <linearGradient id="candleRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5252" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d50000" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + graphHeight * ratio;
            const priceVal = maxPrice - ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#21262d"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - padding.right + 8}
                  y={y + 4}
                  fill="#8b949e"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatPrice(priceVal)}
                </text>
              </g>
            );
          })}

          {/* Volume Sub-chart Bars */}
          {showVolume &&
            points.map((p, idx) => {
              const x = getX(idx);
              const barHeight = ((p.volume || 0) / maxVolume) * (graphHeight * 0.25);
              const y = padding.top + graphHeight - barHeight;
              const isUp = (p.close || p.price) >= (p.open || p.price);
              return (
                <rect
                  key={`vol-${idx}`}
                  x={x - 2}
                  y={y}
                  width="4"
                  height={Math.max(barHeight, 2)}
                  fill={isUp ? "#00c853" : "#ff5252"}
                  opacity="0.18"
                />
              );
            })}

          {/* Area Render */}
          {displayType === "area" && areaPath && (
            <path d={areaPath} fill="url(#areaGradient)" />
          )}

          {/* Line Render */}
          {(displayType === "line" || displayType === "area") && linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={chartColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Candlestick Render */}
          {displayType === "candle" &&
            points.map((p, idx) => {
              const x = getX(idx);
              const o = p.open || p.price;
              const c = p.close || p.price;
              const h = p.high || Math.max(o, c);
              const l = p.low || Math.min(o, c);

              const yHigh = getY(h);
              const yLow = getY(l);
              const yOpen = getY(o);
              const yClose = getY(c);

              const topBody = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);
              const isBullish = c >= o;

              return (
                <g key={`candle-${idx}`}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={isBullish ? "#00c853" : "#ff5252"}
                    strokeWidth="1.2"
                  />
                  {/* Body */}
                  <rect
                    x={x - 3}
                    y={topBody}
                    width="6"
                    height={bodyHeight}
                    fill={isBullish ? "url(#candleGreen)" : "url(#candleRed)"}
                    stroke={isBullish ? "#00c853" : "#ff5252"}
                    strokeWidth="0.8"
                    rx="1"
                  />
                </g>
              );
            })}

          {/* Benchmark Comparative Line */}
          {showBenchmark && benchmarkPath && (
            <path
              d={benchmarkPath}
              fill="none"
              stroke="#58a6ff"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}

          {/* Moving Average SMA Line */}
          {showSMA && smaPoints.length > 1 && (
            <path
              d={smaPoints
                .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.x).toFixed(1)} ${getY(pt.y).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke="#d2a8ff"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          )}

          {/* Event Annotations */}
          {activeAnnotations.map((ann, aIdx) => {
            const y = getY(ann.price);
            return (
              <g key={`ann-${aIdx}`}>
                <circle cx={chartWidth - padding.right - 20} cy={y} r="4" fill="#e3b341" />
                <text
                  x={chartWidth - padding.right - 30}
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

          {/* Invisible interactive hover bars */}
          {points.map((p, idx) => {
            const x = getX(idx);
            return (
              <rect
                key={`hover-${idx}`}
                x={x - graphWidth / (points.length * 2)}
                y={padding.top}
                width={graphWidth / points.length}
                height={graphHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredPoint(p)}
              />
            );
          })}

          {/* Hover Crosshair & Point Dot */}
          {hoveredPoint && (
            <g>
              {(() => {
                const idx = points.findIndex((p) => p === hoveredPoint);
                if (idx === -1) return null;
                const hx = getX(idx);
                const hy = getY(hoveredPoint.price);
                return (
                  <>
                    <line
                      x1={hx}
                      y1={padding.top}
                      x2={hx}
                      y2={padding.top + graphHeight}
                      stroke="#8b949e"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={padding.left}
                      y1={hy}
                      x2={chartWidth - padding.right}
                      y2={hy}
                      stroke="#8b949e"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <circle cx={hx} cy={hy} r="5" fill={chartColor} stroke="#ffffff" strokeWidth="2" />
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
