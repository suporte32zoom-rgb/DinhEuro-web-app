import React, { useState, useMemo } from "react";
import { RegionalTab, Asset } from "../types/finance";
import { formatForexRate, formatCurrencyBRL } from "../utils/formatters";
import {
  X,
  Bookmark,
  Briefcase,
  Globe,
  DollarSign,
  Coins,
  FileSpreadsheet,
  TrendingUp,
  Landmark,
  Sparkles,
  Calculator,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Check,
  Loader2,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

type CurrencyType = "BRL" | "USD" | "EUR" | "GBP" | "JPY" | "BTC" | "ETH" | "SOL";

const CURRENCY_INFO: Record<
  CurrencyType,
  { label: string; symbol: string; prefix: string; icon: string }
> = {
  BRL: { label: "Real (BRL)", symbol: "R$", prefix: "R$", icon: "🇧🇷" },
  USD: { label: "Dólar (USD)", symbol: "$", prefix: "US$", icon: "🇺🇸" },
  EUR: { label: "Euro (EUR)", symbol: "€", prefix: "€", icon: "🇪🇺" },
  GBP: { label: "Libra (GBP)", symbol: "£", prefix: "£", icon: "🇬🇧" },
  JPY: { label: "Iene (JPY)", symbol: "¥", prefix: "¥", icon: "🇯🇵" },
  BTC: { label: "Bitcoin (BTC)", symbol: "₿", prefix: "₿", icon: "₿" },
  ETH: { label: "Ethereum (ETH)", symbol: "Ξ", prefix: "Ξ", icon: "💎" },
  SOL: { label: "Solana (SOL)", symbol: "◎", prefix: "◎", icon: "☀️" },
};

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: RegionalTab;
  onSelectTab: (tab: RegionalTab) => void;
  onOpenPortfolio: () => void;
  onOpenWatchlist: () => void;
  onOpenPwaModal?: () => void;
  isPwaInstalled?: boolean;
  watchlistAssets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  liveAssets?: Asset[];
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenPortfolio,
  onOpenWatchlist,
  onOpenPwaModal,
  isPwaInstalled = false,
  watchlistAssets,
  onSelectAsset,
  liveAssets = [],
}) => {
  // Currency Converter State
  const [converterAmount, setConverterAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<CurrencyType>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyType>("BRL");
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(true);

  // Dynamic live rates strictly extracted from liveAssets (Single Source of Truth)
  const liveRatesToBRL = useMemo<Record<CurrencyType, number | null>>(() => {
    const usdBrlAsset = liveAssets.find((a) => a.id === "usd-brl" || a.ticker.includes("USD / BRL"));
    const eurBrlAsset = liveAssets.find((a) => a.id === "eur-brl" || a.ticker.includes("EUR / BRL"));
    const gbpBrlAsset = liveAssets.find((a) => a.id === "gbp-brl" || a.ticker.includes("GBP / BRL"));
    const jpyBrlAsset = liveAssets.find((a) => a.id === "jpy-brl" || a.ticker.includes("JPY / BRL"));
    const btcAsset = liveAssets.find((a) => a.id === "bitcoin" || a.ticker === "BTC");
    const ethAsset = liveAssets.find((a) => a.id === "ether" || a.ticker === "ETH");
    const solAsset = liveAssets.find((a) => a.id === "solana" || a.ticker === "SOL");

    const usdPriceInBrl = usdBrlAsset?.price && usdBrlAsset.price > 0 ? usdBrlAsset.price : null;
    const eurPriceInBrl = eurBrlAsset?.price && eurBrlAsset.price > 0 ? eurBrlAsset.price : null;
    const gbpPriceInBrl = gbpBrlAsset?.price && gbpBrlAsset.price > 0 ? gbpBrlAsset.price : null;
    const jpyPriceInBrl = jpyBrlAsset?.price && jpyBrlAsset.price > 0 ? jpyBrlAsset.price : null;
    const btcPriceInUsd = btcAsset?.price && btcAsset.price > 0 ? btcAsset.price : null;
    const ethPriceInUsd = ethAsset?.price && ethAsset.price > 0 ? ethAsset.price : null;
    const solPriceInUsd = solAsset?.price && solAsset.price > 0 ? solAsset.price : null;

    return {
      BRL: 1.0,
      USD: usdPriceInBrl,
      EUR: eurPriceInBrl,
      GBP: gbpPriceInBrl,
      JPY: jpyPriceInBrl,
      BTC: btcPriceInUsd && usdPriceInBrl ? btcPriceInUsd * usdPriceInBrl : null,
      ETH: ethPriceInUsd && usdPriceInBrl ? ethPriceInUsd * usdPriceInBrl : null,
      SOL: solPriceInUsd && usdPriceInBrl ? solPriceInUsd * usdPriceInBrl : null,
    };
  }, [liveAssets]);

  // Conversion Calculation strictly from dynamic live rates
  const conversionResult = useMemo(() => {
    const numericAmount = parseFloat(converterAmount.replace(",", ".")) || 0;
    if (numericAmount <= 0) return { raw: 0, formatted: "0,00" };

    const fromRate = liveRatesToBRL[fromCurrency];
    const toRate = liveRatesToBRL[toCurrency];

    if (!fromRate || !toRate) {
      return { raw: 0, formatted: "Carregando cotação..." };
    }

    const amountInBRL = numericAmount * fromRate;
    const targetValue = amountInBRL / toRate;

    let formatted = "";
    if (toCurrency === "BTC" || toCurrency === "ETH" || toCurrency === "SOL") {
      formatted = targetValue < 0.001 ? targetValue.toFixed(8) : targetValue.toFixed(4);
    } else if (toCurrency === "USD" || toCurrency === "EUR" || toCurrency === "GBP") {
      // 2 decimal places in converter for major currencies
      formatted = targetValue.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (toCurrency === "JPY") {
      formatted = targetValue.toLocaleString("ja-JP", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    } else {
      // BRL with 2 decimal places
      formatted = targetValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return { raw: targetValue, formatted };
  }, [converterAmount, fromCurrency, toCurrency, liveRatesToBRL]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const navCategories: Array<{ id: RegionalTab; label: string; icon: any }> = [
    { id: "América Latina", label: "América Latina (B3)", icon: Landmark },
    { id: "EUA", label: "EUA (Wall Street)", icon: Globe },
    { id: "Europa", label: "Europa", icon: Globe },
    { id: "Ásia", label: "Ásia & Pacífico", icon: Globe },
    { id: "Moedas", label: "Moedas & Câmbio", icon: DollarSign },
    { id: "Criptomoedas", label: "Criptoativos 24/7", icon: Coins },
    { id: "Contratos futuros", label: "Contratos Futuros & Commodities", icon: FileSpreadsheet },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-[#0e1117] border-r border-[#30363d] h-full flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
        <div className="p-4 sm:p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
            <BrandLogo size="md" showText={true} showSubtitle={false} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions Panel */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="drawer-btn-portfolio"
              onClick={() => {
                onOpenPortfolio();
                onClose();
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-left transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-lg bg-[#1f6feb]/15 text-[#58a6ff] group-hover:scale-105 transition-transform">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-[#e6edf3]">Portfólio</span>
                <span className="block text-[10px] text-[#8b949e]">Minha Carteira</span>
              </div>
            </button>

            <button
              id="drawer-btn-watchlist"
              onClick={() => {
                onOpenWatchlist();
                onClose();
              }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-left transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-lg bg-[#e3b341]/15 text-[#e3b341] group-hover:scale-105 transition-transform">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-semibold text-[#e6edf3]">Listas</span>
                <span className="block text-[10px] text-[#8b949e]">Monitoramento</span>
              </div>
            </button>
          </div>

          {/* Navigation Categories */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider px-2 mb-2">
              Mercados Globais
            </h4>
            {navCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectTab(cat.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/40 shadow-xs"
                      : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#58a6ff]" : "text-[#8b949e]"}`} />
                    <span>{cat.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]"></span>}
                </button>
              );
            })}
          </div>

          {/* Dynamic Real-Time Currency Converter Accordion */}
          <div className="border border-[#30363d] rounded-2xl bg-[#0e1117] overflow-hidden">
            <button
              onClick={() => setIsConverterOpen(!isConverterOpen)}
              className="w-full p-3 bg-[#161b22] flex items-center justify-between text-xs font-semibold text-[#e6edf3] cursor-pointer hover:bg-[#21262d] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#58a6ff]" />
                <span>Conversor de Moedas & Cripto</span>
              </div>
              {isConverterOpen ? (
                <ChevronUp className="w-4 h-4 text-[#8b949e]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#8b949e]" />
              )}
            </button>

            {isConverterOpen && (
              <div className="p-3.5 space-y-3 bg-[#0e1117]/80 animate-in fade-in duration-150">
                {/* Amount Input */}
                <div>
                  <label className="block text-[11px] text-[#8b949e] mb-1">Valor a converter</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={converterAmount}
                      onChange={(e) => setConverterAmount(e.target.value)}
                      placeholder="100"
                      className="w-full bg-[#161b22] border border-[#30363d] focus:border-[#58a6ff] text-sm text-[#e6edf3] font-mono px-3 py-2 rounded-xl focus:outline-none transition-colors"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#8b949e] font-mono">
                      {fromCurrency}
                    </span>
                  </div>
                </div>

                {/* Currency Pickers with Swap */}
                <div className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-[#8b949e] mb-1">De</label>
                    <select
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value as CurrencyType)}
                      className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#e6edf3] p-2 rounded-xl focus:outline-none"
                    >
                      {(Object.keys(CURRENCY_INFO) as CurrencyType[]).map((c) => (
                        <option key={c} value={c}>
                          {CURRENCY_INFO[c].icon} {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1 flex justify-center pt-4">
                    <button
                      onClick={handleSwapCurrencies}
                      className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                      title="Inverter Moedas"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-[#8b949e] mb-1">Para</label>
                    <select
                      value={toCurrency}
                      onChange={(e) => setToCurrency(e.target.value as CurrencyType)}
                      className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#e6edf3] p-2 rounded-xl focus:outline-none"
                    >
                      {(Object.keys(CURRENCY_INFO) as CurrencyType[]).map((c) => (
                        <option key={c} value={c}>
                          {CURRENCY_INFO[c].icon} {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conversion Output Box */}
                <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d] space-y-1">
                  <span className="text-[10px] text-[#8b949e] block">Resultado em Tempo Real:</span>
                  <div className="text-base sm:text-lg font-bold font-mono text-[#00c853] truncate">
                    {CURRENCY_INFO[toCurrency].prefix} {conversionResult.formatted}
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1.5 pt-1">
                  {["100", "500", "1.000", "5.000"].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setConverterAmount(preset.replace(".", ""))}
                      className={`flex-1 py-1 text-[10px] font-mono rounded-lg border transition-colors cursor-pointer ${
                        converterAmount === preset.replace(".", "")
                          ? "bg-[#1f6feb]/20 border-[#58a6ff] text-[#58a6ff]"
                          : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Live Rates Reference Note */}
                <div className="p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[10px] text-[#8b949e] space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1 text-[#00c853]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse"></span>
                      Câmbio ao Vivo
                    </span>
                    <span className="text-[#8b949e] text-[9px]">Interbancário / Forex</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>1 USD =</span>
                    <span className="text-[#e6edf3]">
                      {liveRatesToBRL.USD ? `R$ ${formatForexRate(liveRatesToBRL.USD, 2)}` : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>1 EUR =</span>
                    <span className="text-[#e6edf3]">
                      {liveRatesToBRL.EUR ? `R$ ${formatForexRate(liveRatesToBRL.EUR, 2)}` : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>1 BTC =</span>
                    <span className="text-[#00c853] font-bold">
                      {liveRatesToBRL.BTC ? formatCurrencyBRL(liveRatesToBRL.BTC) : "--"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Watchlist preview in drawer */}
          {watchlistAssets.length > 0 && (
            <div className="p-4 border-t border-[#21262d] space-y-2">
              <h4 className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider px-1">
                Ativos Salvos
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {watchlistAssets.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => {
                      onSelectAsset(w);
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-[#0e1117] hover:bg-[#21262d] border border-[#30363d] cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <span className="font-mono font-bold text-[#e6edf3]">{w.ticker}</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        w.changePercent >= 0 ? "text-[#00c853]" : "text-[#ff5252]"
                      }`}
                    >
                      {w.changePercent >= 0 ? "+" : ""}
                      {w.changePercent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
