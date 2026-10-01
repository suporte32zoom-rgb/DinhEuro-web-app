import React, { useState, useEffect, useRef } from "react";
import { ALL_ASSETS } from "../data/mockMarketData";
import { Asset } from "../types/finance";
import { Search, X, TrendingUp, TrendingDown, ArrowRight, CornerDownLeft } from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
  liveAssets?: Asset[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  liveAssets = ALL_ASSETS,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Global keydown listeners (Escape to close, Ctrl+K or / to open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const pool = liveAssets && liveAssets.length > 0 ? liveAssets : ALL_ASSETS;

  const filteredAssets = query.trim()
    ? pool.filter(
        (a) =>
          a.ticker.toLowerCase().includes(query.toLowerCase()) ||
          a.name.toLowerCase().includes(query.toLowerCase()) ||
          a.category.toLowerCase().includes(query.toLowerCase())
      )
    : pool.slice(0, 8); // default suggestions

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        id="global-search-modal"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#30363d] flex items-center gap-3 bg-[#0e1117]/80">
          <Search className="w-5 h-5 text-[#58a6ff] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquise ações, ETFs, moedas e criptomoedas (ex: PETR4, S&P 500, BTC)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[#e6edf3] placeholder-[#8b949e] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-[#8b949e] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-mono bg-[#21262d] text-[#8b949e] hover:text-white rounded border border-[#30363d]"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-[#21262d]">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider flex items-center justify-between">
            <span>{query ? "Resultados Encontrados" : "Sugestões Populares do Mercado"}</span>
            <span>{filteredAssets.length} ativos</span>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b949e]">
              Nenhum ativo encontrado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isPositive = asset.changePercent >= 0;
              return (
                <div
                  key={asset.id}
                  onClick={() => {
                    onSelectAsset(asset);
                    onClose();
                  }}
                  className="p-3 hover:bg-[#21262d] rounded-xl cursor-pointer flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-xl bg-[#0e1117] border border-[#30363d] flex items-center justify-center font-mono font-bold text-xs text-[#58a6ff] group-hover:border-[#58a6ff] transition-colors shrink-0">
                      {asset.ticker.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
                          {asset.ticker}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0e1117] text-[#8b949e] border border-[#30363d]">
                          {asset.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#8b949e] truncate">{asset.name}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div>
                      <div className="text-xs sm:text-sm font-mono font-bold text-[#e6edf3]">
                        {asset.currency}{" "}
                        {asset.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-xs font-mono font-semibold flex items-center justify-end gap-0.5 ${
                          isPositive ? "text-[#00c853]" : "text-[#ff5252]"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {isPositive ? "+" : ""}
                          {asset.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#8b949e] group-hover:text-[#58a6ff] group-hover:translate-x-0.5 transition-all hidden sm:block" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Keyboard Helper */}
        <div className="p-3 border-t border-[#30363d] bg-[#0e1117]/90 text-[11px] text-[#8b949e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] rounded">↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" />
              <span>Selecionar</span>
            </span>
          </div>
          <span>DinhEuro Inteligência Financeira</span>
        </div>
      </div>
    </div>
  );
};
