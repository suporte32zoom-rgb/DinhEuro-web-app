import React from "react";
import { MarketMoverItem } from "../types/finance";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { formatCurrencyBRL } from "../utils/formatters";

interface MarketMoversGridProps {
  onSelectTicker: (ticker: string) => void;
  liveMovers?: {
    mostActive: MarketMoverItem[];
    topGainers: MarketMoverItem[];
    topLosers: MarketMoverItem[];
  } | null;
  isLoading?: boolean;
}

export const MarketMoversGrid: React.FC<MarketMoversGridProps> = ({ onSelectTicker, liveMovers, isLoading = false }) => {
  const activeItems = liveMovers?.mostActive || [];
  const gainersItems = liveMovers?.topGainers || [];
  const losersItems = liveMovers?.topLosers || [];

  const renderColumn = (
    title: string,
    subtitle: string,
    items: MarketMoverItem[],
    icon: React.ReactNode,
    type: "active" | "gainers" | "losers"
  ) => {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 flex flex-col justify-between shadow-md shadow-black/20">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#21262d] mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg ${
                  type === "gainers"
                    ? "bg-[#00c853]/15 text-[#00c853]"
                    : type === "losers"
                    ? "bg-[#ff5252]/15 text-[#ff5252]"
                    : "bg-[#58a6ff]/15 text-[#58a6ff]"
                }`}
              >
                {icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#e6edf3] tracking-tight">{title}</h3>
                <p className="text-[11px] text-[#8b949e]">{subtitle}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#00c853] bg-[#00c853]/10 px-2 py-0.5 rounded border border-[#00c853]/30 font-semibold">
              B3 AO VIVO
            </span>
          </div>

          {/* List of items or Skeletons */}
          {items.length === 0 ? (
            <div className="divide-y divide-[#21262d]/70">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="py-2.5 px-2 flex items-center justify-between animate-pulse">
                  <div className="space-y-1.5">
                    <div className="w-14 h-3.5 bg-[#21262d] rounded"></div>
                    <div className="w-24 h-2.5 bg-[#21262d] rounded"></div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="w-16 h-3.5 bg-[#21262d] rounded ml-auto"></div>
                    <div className="w-12 h-2.5 bg-[#21262d] rounded ml-auto"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[#21262d]/70">
              {items.map((item) => {
                const isPositive = item.changePercent >= 0;
                return (
                  <div
                    key={item.id || item.ticker}
                    onClick={() => onSelectTicker(item.ticker)}
                    className="py-2.5 px-2 rounded-xl hover:bg-[#21262d]/80 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
                          {item.ticker}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8b949e] truncate max-w-[140px]" title={item.name}>
                        {item.name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-semibold text-[#e6edf3]">
                        {formatCurrencyBRL(item.price)}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-bold flex items-center justify-end gap-0.5 ${
                          isPositive ? "text-[#00c853]" : "text-[#ff5252]"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 shrink-0" />
                        )}
                        <span>
                          {isPositive ? "+" : ""}
                          {item.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="w-full py-4" id="market-movers-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#e6edf3] tracking-tight">
              Destaques do Pregão B3 em Tempo Real
            </h2>
            <span className="text-xs text-[#8b949e]">
              (Maiores oscilações e liquidez negociada)
            </span>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-[#58a6ff]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Calculando fluxos...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderColumn(
            "Mais Negociadas",
            "Maior liquidez e volume financeiro",
            activeItems,
            <Activity className="w-4 h-4" />,
            "active"
          )}
          {renderColumn(
            "Maiores Altas",
            "Principais valorizações percentuais do dia",
            gainersItems,
            <TrendingUp className="w-4 h-4" />,
            "gainers"
          )}
          {renderColumn(
            "Maiores Baixas",
            "Maiores correções e desvalorizações do dia",
            losersItems,
            <TrendingDown className="w-4 h-4" />,
            "losers"
          )}
        </div>
      </div>
    </section>
  );
};
