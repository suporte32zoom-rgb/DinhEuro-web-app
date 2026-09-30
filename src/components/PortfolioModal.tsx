import React, { useState } from "react";
import { PortfolioPosition, Asset } from "../types/finance";
import { ALL_ASSETS } from "../data/mockMarketData";
import {
  Briefcase,
  X,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
} from "lucide-react";

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: PortfolioPosition[];
  onAddPosition: (position: Omit<PortfolioPosition, "id">) => void;
  onRemovePosition: (id: string) => void;
  onSelectAsset: (asset: Asset) => void;
  liveAssets?: Asset[];
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  positions,
  onAddPosition,
  onRemovePosition,
  onSelectAsset,
  liveAssets = ALL_ASSETS,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(ALL_ASSETS[0]?.id || "petr4");
  const [quantity, setQuantity] = useState("100");
  const [buyPrice, setBuyPrice] = useState(
    (ALL_ASSETS[0]?.price || 35).toString()
  );

  if (!isOpen) return null;

  const currentAvailableAssets = liveAssets.length > 0 ? liveAssets : ALL_ASSETS;

  // Calculate totals with live prices
  const enrichedPositions = positions.map((pos) => {
    const liveAsset = currentAvailableAssets.find((a) => a.id === pos.assetId || a.ticker.toUpperCase() === pos.ticker.toUpperCase());
    const curPrice = liveAsset ? liveAsset.price : pos.avgBuyPrice;
    const totalCost = pos.quantity * pos.avgBuyPrice;
    const currentValue = pos.quantity * curPrice;
    const profitLoss = currentValue - totalCost;
    const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

    return {
      ...pos,
      currentPrice: curPrice,
      totalCost,
      currentValue,
      profitLoss,
      profitLossPct,
      liveAsset,
    };
  });

  const totalPortfolioValue = enrichedPositions.reduce(
    (acc, p) => acc + p.currentValue,
    0
  );
  const totalPortfolioCost = enrichedPositions.reduce(
    (acc, p) => acc + p.totalCost,
    0
  );
  const totalPL = totalPortfolioValue - totalPortfolioCost;
  const totalPLPct = totalPortfolioCost > 0 ? (totalPL / totalPortfolioCost) * 100 : 0;

  const handleAssetChange = (assetId: string) => {
    setSelectedAssetId(assetId);
    const found = currentAvailableAssets.find((a) => a.id === assetId);
    if (found) {
      setBuyPrice(found.price.toString());
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = currentAvailableAssets.find((a) => a.id === selectedAssetId);
    if (!found) return;

    onAddPosition({
      assetId: found.id,
      ticker: found.ticker,
      name: found.name,
      quantity: Number(quantity),
      avgBuyPrice: Number(buyPrice),
      purchaseDate: new Date().toISOString().split("T")[0],
    });

    setShowAddForm(false);
    setQuantity("100");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#1f6feb]/20 text-[#58a6ff]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#e6edf3]">
                  Meu Portfólio de Investimentos
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00c853]/15 text-[#00c853] font-bold border border-[#00c853]/30">
                  AO VIVO
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">
                Gestão e acompanhamento de carteira avaliada com cotações em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portfolio Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#0e1117] border-b border-[#21262d]">
          <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d]">
            <span className="text-[11px] text-[#8b949e] font-medium">Patrimônio Atual</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              R$ {totalPortfolioValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d]">
            <span className="text-[11px] text-[#8b949e] font-medium">Custo Total Aplicado</span>
            <div className="text-lg font-bold font-mono text-[#8b949e] mt-1">
              R$ {totalPortfolioCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d]">
            <span className="text-[11px] text-[#8b949e] font-medium">Retorno Total (P&L)</span>
            <div
              className={`text-lg font-bold font-mono flex items-center gap-1 mt-1 ${
                totalPL >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
              }`}
            >
              {totalPL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {totalPL >= 0 ? "+" : ""}
                R$ {totalPL.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs">({totalPLPct >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Action button to add position */}
        <div className="p-4 bg-[#161b22] flex items-center justify-between border-b border-[#21262d]">
          <span className="text-xs font-semibold text-[#e6edf3]">
            Posições Abertas ({positions.length})
          </span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Ativo</span>
          </button>
        </div>

        {/* Add Position Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-[#0e1117] border-b border-[#30363d] space-y-3 animate-in slide-in-from-top-2 duration-150"
          >
            <h4 className="text-xs font-bold text-[#58a6ff] uppercase tracking-wide">
              Registrar Compra de Ativo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-[#8b949e] mb-1">Selecionar Ativo</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#e6edf3] p-2 rounded-xl focus:outline-none"
                >
                  {currentAvailableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.ticker} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[#8b949e] mb-1">Quantidade (Cotas/Ações)</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#e6edf3] p-2 rounded-xl focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8b949e] mb-1">Preço Médio de Compra (R$)</label>
                <input
                  type="number"
                  step="any"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#e6edf3] p-2 rounded-xl focus:outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#8b949e] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold"
              >
                Salvar Posição
              </button>
            </div>
          </form>
        )}

        {/* Positions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {enrichedPositions.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b949e] space-y-2">
              <p>Nenhuma posição registrada ainda.</p>
              <p className="text-[11px]">
                Clique em &ldquo;Adicionar Ativo&rdquo; para simular sua carteira com cotações em tempo real.
              </p>
            </div>
          ) : (
            enrichedPositions.map((pos) => {
              const isPosProfit = pos.profitLoss >= 0;
              return (
                <div
                  key={pos.id}
                  className="p-3.5 rounded-xl bg-[#0e1117] border border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      if (pos.liveAsset) {
                        onSelectAsset(pos.liveAsset);
                        onClose();
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#e6edf3] group-hover:text-[#58a6ff]">
                        {pos.ticker}
                      </span>
                      <span className="text-[11px] text-[#8b949e]">
                        {pos.quantity} cotas @ R$ {pos.avgBuyPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e]">{pos.name}</p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        R$ {pos.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-[11px] font-mono font-semibold ${
                          isPosProfit ? "text-[#00c853]" : "text-[#ff5252]"
                        }`}
                      >
                        {isPosProfit ? "+" : ""}
                        R$ {pos.profitLoss.toFixed(2)} ({isPosProfit ? "+" : ""}
                        {pos.profitLossPct.toFixed(2)}%)
                      </div>
                    </div>

                    <button
                      onClick={() => onRemovePosition(pos.id)}
                      className="p-2 text-[#8b949e] hover:text-[#ff5252] hover:bg-[#30363d]/50 rounded-lg transition-colors"
                      title="Excluir posição"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#30363d] bg-[#0e1117] flex items-center justify-between text-xs text-[#8b949e]">
          <span>Cotações sincronizadas em tempo real</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#21262d] text-[#e6edf3] hover:text-white border border-[#30363d]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
