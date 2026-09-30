import React, { useState, useEffect } from "react";
import { Asset } from "../types/finance";
import { BrandLogo } from "./BrandLogo";
import { formatAssetDisplayPrice, formatForexRate, formatPoints } from "../utils/formatters";
import {
  Search,
  Menu,
  Bookmark,
  Briefcase,
  Smartphone,
  Check,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenSidebar: () => void;
  onOpenPortfolio: () => void;
  onOpenWatchlist: () => void;
  onOpenPwaModal?: () => void;
  isPwaInstallable?: boolean;
  isPwaInstalled?: boolean;
  onSelectAsset: (asset: Asset) => void;
  onGoHome: () => void;
  watchlistCount: number;
  portfolioCount: number;
  // Live Data Props
  liveAssets?: Asset[];
  lastUpdatedTime?: string;
  isRefreshing?: boolean;
  onManualRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenSidebar,
  onOpenPortfolio,
  onOpenWatchlist,
  onOpenPwaModal,
  isPwaInstallable = false,
  isPwaInstalled = false,
  onSelectAsset,
  onGoHome,
  watchlistCount,
  portfolioCount,
  liveAssets = [],
  lastUpdatedTime,
  isRefreshing = false,
  onManualRefresh,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Find key benchmark tickers for top ticker bar
  const ibov = liveAssets.find((a) => a.id === "ibovespa" || a.ticker === "IBOV");
  const sp500 = liveAssets.find((a) => a.id === "sp-500" || a.ticker === "S&P 500");
  const usdBrl = liveAssets.find((a) => a.id === "usd-brl" || a.ticker.includes("USD / BRL"));
  const btc = liveAssets.find((a) => a.id === "bitcoin" || a.ticker === "BTC");
  const petr = liveAssets.find((a) => a.id === "petr4" || a.ticker === "PETR4");

  const renderTickerValue = (asset?: Asset, formatType: "points" | "forex" | "crypto" | "price" = "price") => {
    if (!asset || !asset.price || asset.price === 0) {
      return <span className="inline-block w-14 h-3.5 bg-[#21262d] animate-pulse rounded-md"></span>;
    }

    if (formatType === "points") {
      return formatPoints(asset.price);
    }
    if (formatType === "forex") {
      return `R$ ${formatForexRate(asset.price, 4)}`;
    }
    if (formatType === "crypto") {
      return `US$ ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatAssetDisplayPrice(asset.price, asset.currency, asset.id, asset.ticker, asset.name);
  };

  const renderTickerChange = (asset?: Asset) => {
    if (!asset || asset.changePercent === undefined || (!asset.price && asset.changePercent === 0)) {
      return <span className="inline-block w-10 h-3 bg-[#21262d] animate-pulse rounded-md ml-1"></span>;
    }
    const isPositive = asset.changePercent >= 0;
    return (
      <span className={`font-mono text-[11px] font-semibold ${isPositive ? "text-[#00c853]" : "text-[#ff5252]"}`}>
        {isPositive ? "+" : ""}
        {asset.changePercent.toFixed(2)}%
      </span>
    );
  };

  return (
    <header
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-[#0e1117]/95 backdrop-blur-md border-b border-[#30363d] shadow-lg shadow-black/40"
          : "bg-[#0e1117] border-b border-[#21262d]"
      }`}
    >
      {/* Top Ticker Micro-Bar with Real-Time Data & Safe Padding */}
      <div
        style={{
          padding: "12px 16px",
          gap: "12px",
          WebkitOverflowScrolling: "touch",
        }}
        className="w-full bg-[#161b22] border-b border-[#21262d] text-xs text-[#8b949e] flex items-center justify-between overflow-x-auto scrollbar-none"
      >
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 font-medium text-[#e6edf3] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#00c853] animate-pulse"></span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#00c853]">AO VIVO</span>
          </div>

          <span className="text-[#30363d]">|</span>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {/* IBOV - Formatted in Points (pts) */}
            <div
              onClick={() => ibov && onSelectAsset(ibov)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0 select-none min-h-[20px]"
              title="Ibovespa em tempo real (pts)"
            >
              <span className="text-[#8b949e] font-semibold text-[11px]">IBOV</span>
              <span className="text-[#e6edf3] font-mono text-[11px] font-bold">
                {renderTickerValue(ibov, "points")}
              </span>
              {renderTickerChange(ibov)}
            </div>

            {/* S&P 500 */}
            <div
              onClick={() => sp500 && onSelectAsset(sp500)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0 select-none min-h-[20px]"
              title="S&P 500 em tempo real (pts)"
            >
              <span className="text-[#8b949e] font-semibold text-[11px]">S&P 500</span>
              <span className="text-[#e6edf3] font-mono text-[11px] font-bold">
                {renderTickerValue(sp500, "points")}
              </span>
              {renderTickerChange(sp500)}
            </div>

            {/* USD/BRL */}
            <div
              onClick={() => usdBrl && onSelectAsset(usdBrl)}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0 select-none min-h-[20px]"
              title="Dólar Comercial em tempo real"
            >
              <span className="text-[#8b949e] font-semibold text-[11px]">USD/BRL</span>
              <span className="text-[#e6edf3] font-mono text-[11px] font-bold">
                {renderTickerValue(usdBrl, "forex")}
              </span>
              {renderTickerChange(usdBrl)}
            </div>

            {/* BTC */}
            <div
              onClick={() => btc && onSelectAsset(btc)}
              className="hidden sm:flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0 select-none min-h-[20px]"
              title="Bitcoin em tempo real"
            >
              <span className="text-[#8b949e] font-semibold text-[11px]">BTC</span>
              <span className="text-[#e6edf3] font-mono text-[11px] font-bold">
                {renderTickerValue(btc, "crypto")}
              </span>
              {renderTickerChange(btc)}
            </div>

            {/* PETR4 */}
            <div
              onClick={() => petr && onSelectAsset(petr)}
              className="hidden md:flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity shrink-0 select-none min-h-[20px]"
              title="Petrobras PN em tempo real"
            >
              <span className="text-[#8b949e] font-semibold text-[11px]">PETR4</span>
              <span className="text-[#e6edf3] font-mono text-[11px] font-bold">
                {renderTickerValue(petr, "price")}
              </span>
              {renderTickerChange(petr)}
            </div>
          </div>
        </div>

        {/* Right Info & Live Refresh Trigger */}
        <div className="flex items-center gap-3 text-[#8b949e] text-xs shrink-0 pl-4">
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-[#8b949e]" />
            <span>Atualizado: {lastUpdatedTime || "Em tempo real"}</span>
          </div>

          {onManualRefresh && (
            <button
              onClick={onManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] hover:text-white transition-colors cursor-pointer text-[11px] font-medium border border-[#30363d]"
              title="Atualizar cotações agora"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          )}

          <span className="text-[#30363d] hidden sm:inline">|</span>

          <span
            className="text-[#58a6ff] hover:underline cursor-pointer flex items-center gap-1 text-[11px] font-medium"
            onClick={onOpenPortfolio}
          >
            <Sparkles className="w-3 h-3 text-[#f0883e]" />
            <span>IA DinhEuro</span>
          </span>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div
        style={{
          padding: "12px 16px",
          gap: "12px",
        }}
        className="max-w-7xl mx-auto flex items-center justify-between flex-wrap sm:flex-nowrap"
      >
        {/* Left: Hamburger & Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            id="btn-toggle-sidebar"
            onClick={onOpenSidebar}
            aria-label="Abrir menu de navegação"
            className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors focus:outline-none focus:ring-2 focus:ring-[#58a6ff] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={onGoHome}
            className="cursor-pointer select-none group"
            id="brand-logo"
            title="DinhEuro - Início"
          >
            <BrandLogo size="md" showText={true} showSubtitle={true} />
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 min-w-[220px] max-w-2xl order-3 sm:order-2 w-full sm:w-auto">
          <div
            id="global-search-trigger"
            onClick={onOpenSearch}
            className="w-full bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff]/60 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-sm text-[#8b949e] cursor-pointer transition-all duration-150 shadow-inner group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Search className="w-4 h-4 text-[#8b949e] group-hover:text-[#58a6ff] transition-colors shrink-0" />
              <span className="truncate text-xs sm:text-sm text-[#8b949e] group-hover:text-[#e6edf3]">
                Pesquise ações da B3, ETFs, moedas, commodities e criptoativos em tempo real...
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <kbd className="px-2 py-0.5 text-[11px] font-mono bg-[#0e1117] text-[#8b949e] border border-[#30363d] rounded-md shadow-xs">
                Ctrl + K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 order-2 sm:order-3">
          {/* Watchlist Quick Button */}
          <button
            id="btn-header-watchlist"
            onClick={onOpenWatchlist}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#e6edf3] bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] transition-all cursor-pointer"
            title="Minha Lista de Observação"
          >
            <Bookmark className="w-4 h-4 text-[#e3b341]" />
            <span>Listas</span>
            {watchlistCount > 0 && (
              <span className="px-1.5 py-0.2 bg-[#e3b341]/20 text-[#e3b341] rounded-full text-[10px] font-bold">
                {watchlistCount}
              </span>
            )}
          </button>

          {/* Portfolio Quick Button */}
          <button
            id="btn-header-portfolio"
            onClick={onOpenPortfolio}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#1f6feb] to-[#238636] hover:brightness-110 border border-transparent shadow-sm transition-all cursor-pointer"
            title="Meu Portfólio em Tempo Real"
          >
            <Briefcase className="w-4 h-4" />
            <span className="hidden md:inline">Portfólio</span>
            {portfolioCount > 0 && (
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                {portfolioCount}
              </span>
            )}
          </button>

          {/* PWA App Install Button */}
          {onOpenPwaModal && (
            <button
              id="btn-install-pwa"
              onClick={onOpenPwaModal}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isPwaInstalled
                  ? "bg-[#00c853]/10 text-[#00c853] border-[#00c853]/30 hover:bg-[#00c853]/20"
                  : "bg-[#161b22] text-[#58a6ff] border-[#30363d] hover:border-[#58a6ff] hover:bg-[#21262d]"
              }`}
              title={
                isPwaInstalled
                  ? "PWA Instalado no dispositivo"
                  : "Instalar DinhEuro como App na Tela de Início"
              }
            >
              {isPwaInstalled ? (
                <>
                  <Check className="w-4 h-4 text-[#00c853]" />
                  <span className="hidden xl:inline text-[#00c853]">Instalado</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 text-[#58a6ff]" />
                  <span className="hidden md:inline">Instalar App</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
