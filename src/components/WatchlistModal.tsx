import React from "react";
import { Asset } from "../types/finance";
import { Sparkline } from "./Sparkline";
import { X, Bookmark, Trash2, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistAssets: Asset[];
  onRemoveFromWatchlist: (asset: Asset) => void;
  onSelectAsset: (asset: Asset) => void;
}

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  isOpen,
  onClose,
  watchlistAssets,
  onRemoveFromWatchlist,
  onSelectAsset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        id="modal-watchlist"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] flex items-center justify-between bg-[#0e1117]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e3b341]/20 text-[#e3b341] flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e6edf3]">
                Minha Lista de Observação
              </h3>
              <p className="text-xs text-[#8b949e]">
                {watchlistAssets.length} ativos favoritados para acompanhamento contínuo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#30363d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Watchlist Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {watchlistAssets.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b949e] space-y-2">
              <Bookmark className="w-8 h-8 mx-auto text-[#30363d]" />
              <p className="font-semibold text-[#e6edf3]">Sua lista está vazia</p>
              <p className="text-[11px]">
                Navegue pelos ativos e clique em &ldquo;+ Adicionar à lista&rdquo; para fixar aqui.
              </p>
            </div>
          ) : (
            watchlistAssets.map((asset) => {
              const isPositive = asset.changePercent >= 0;
              return (
                <div
                  key={asset.id}
                  className="p-3.5 rounded-xl bg-[#0e1117] border border-[#30363d] hover:border-[#58a6ff]/60 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      onSelectAsset(asset);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#e6edf3] group-hover:text-[#58a6ff]">
                        {asset.ticker}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                        {asset.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] truncate">{asset.name}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:block">
                      <Sparkline
                        data={asset.sparkline}
                        isPositive={isPositive}
                        width={75}
                        height={24}
                      />
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {asset.currency} {asset.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-semibold flex items-center justify-end gap-0.5 ${
                          isPositive ? "text-[#00c853]" : "text-[#ff5252]"
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>
                          {isPositive ? "+" : ""}
                          {asset.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveFromWatchlist(asset)}
                      className="p-2 text-[#8b949e] hover:text-[#ff5252] hover:bg-[#30363d]/50 rounded-lg transition-colors"
                      title="Remover da lista"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#30363d] bg-[#0e1117] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#21262d] text-[#e6edf3] hover:text-white border border-[#30363d] text-xs font-semibold"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
