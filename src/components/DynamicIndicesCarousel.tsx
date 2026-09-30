import React, { useRef } from "react";
import { Asset, RegionalTab } from "../types/finance";
import { Sparkline } from "./Sparkline";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";

interface DynamicIndicesCarouselProps {
  assets: Asset[];
  activeTab: RegionalTab;
  onSelectAsset: (asset: Asset) => void;
}

export const DynamicIndicesCarousel: React.FC<DynamicIndicesCarouselProps> = ({
  assets,
  activeTab,
  onSelectAsset,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredAssets = assets.filter((a) => a.category === activeTab);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "BRL") {
      return price >= 1000
        ? `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `R$ ${price.toFixed(2)}`;
    }
    if (currency === "USD") {
      return price >= 1000
        ? `US$ ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `US$ ${price.toFixed(2)}`;
    }
    if (currency === "EUR") {
      return `€ ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === "GBP") {
      return `£ ${price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === "JPY") {
      return `¥ ${price.toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    }
    if (currency === "INR") {
      return `₹ ${price.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    }
    return `${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="w-full py-4 relative group">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Category Context */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-[#e6edf3] uppercase">
              Principais Índices & Ativos • {activeTab}
            </h2>
            <span className="text-xs text-[#8b949e]">({filteredAssets.length} monitorados)</span>
          </div>

          {/* Left / Right Scroll Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScroll("left")}
              aria-label="Rolar para a esquerda"
              className="p-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              aria-label="Rolar para a direita"
              className="p-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
        >
          {filteredAssets.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="snap-start shrink-0 w-[240px] sm:w-[260px] bg-[#161b22] border border-[#30363d]/80 rounded-xl p-3.5 flex flex-col justify-between h-[140px] animate-pulse shadow-md shadow-black/20"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-16 bg-[#21262d] rounded" />
                    <div className="h-3 w-12 bg-[#21262d] rounded" />
                  </div>
                  <div className="h-3 w-28 bg-[#21262d] rounded" />
                </div>
                <div className="flex justify-between items-end my-2">
                  <div className="h-6 w-24 bg-[#21262d] rounded" />
                  <div className="h-8 w-20 bg-[#21262d] rounded" />
                </div>
                <div className="h-4 w-20 bg-[#21262d] rounded pt-2 border-t border-[#30363d]/40" />
              </div>
            ))
          ) : (
            filteredAssets.map((asset) => {
            const isPositive = asset.changePercent >= 0;
            return (
              <div
                key={asset.id}
                id={`card-${asset.ticker.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                onClick={() => onSelectAsset(asset)}
                className="snap-start shrink-0 w-[240px] sm:w-[260px] bg-[#161b22] hover:bg-[#21262d] border border-[#30363d]/80 hover:border-[#58a6ff]/70 rounded-xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-black/20 group/card"
              >
                {/* Top Info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#e6edf3] group-hover/card:text-[#58a6ff] transition-colors truncate">
                      {asset.ticker}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0e1117] text-[#8b949e] border border-[#30363d] shrink-0 font-medium">
                      {asset.exchange.split("/")[0].trim()}
                    </span>
                  </div>
                  <h3 className="text-xs text-[#8b949e] truncate mt-0.5 font-medium" title={asset.name}>
                    {asset.name}
                  </h3>
                </div>

                {/* Mid: Price & Sparkline */}
                <div className="flex items-end justify-between gap-2 my-3">
                  <div>
                    <div className="text-base sm:text-lg font-bold text-[#e6edf3] font-mono tracking-tight">
                      {formatPrice(asset.price, asset.currency)}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Sparkline
                      data={asset.sparkline}
                      isPositive={isPositive}
                      width={90}
                      height={32}
                    />
                  </div>
                </div>

                {/* Bottom: Change Badge */}
                <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/40 text-xs">
                  <div
                    className={`flex items-center gap-1 font-semibold text-xs ${
                      isPositive ? "text-[#00c853]" : "text-[#ff5252]"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>
                      {isPositive ? "+" : ""}
                      {asset.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-[11px] text-[#8b949e] font-normal font-mono ml-0.5">
                      ({isPositive ? "+" : ""}
                      {asset.change > 100 ? asset.change.toFixed(1) : asset.change.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
};
