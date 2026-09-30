import React, { useState, useMemo } from "react";
import { RegionalTab, Asset } from "../types/finance";
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

  // Dynamic live rates to BRL based on liveAssets feed
  const liveRatesToBRL = useMemo<Record<CurrencyType, number>>(() => {
    const usdBrlAsset = liveAssets.find(
      (a) => a.id === "usd-brl" || a.id === "usd" || a.ticker.includes("USD / BRL") || a.ticker.includes("USD/BRL")
    );
    const eurBrlAsset = liveAssets.find(
      (a) => a.id === "eur-brl" || a.id === "eur" || a.ticker.includes("EUR / BRL") || a.ticker.includes("EUR/BRL")
    );
    const gbpBrlAsset = liveAssets.find(
      (a) => a.id === "gbp-brl" || a.id === "gbp" || a.ticker.includes("GBP / BRL") || a.ticker.includes("GBP/BRL")
    );
    const jpyBrlAsset = liveAssets.find(
      (a) => a.id === "jpy-brl" || a.id === "jpy" || a.ticker.includes("JPY / BRL") || a.ticker.includes("JPY/BRL")
    );
    const btcAsset = liveAssets.find(
      (a) => a.id === "bitcoin" || a.id === "btc-brl" || a.ticker === "BTC" || a.ticker.startsWith("BTC")
    );
    const ethAsset = liveAssets.find(
      (a) => a.id === "ether" || a.id === "eth-brl" || a.ticker === "ETH" || a.ticker.startsWith("ETH")
    );
    const solAsset = liveAssets.find(
      (a) => a.id === "solana" || a.id === "sol-brl" || a.ticker === "SOL" || a.ticker.startsWith("SOL")
    );

    const usdPriceInBrl = usdBrlAsset?.price && usdBrlAsset.price > 0 ? usdBrlAsset.price : 5.1866;
    const eurPriceInBrl = eurBrlAsset?.price && eurBrlAsset.price > 0 ? eurBrlAsset.price : 5.9067;
    const gbpPriceInBrl = gbpBrlAsset?.price && gbpBrlAsset.price > 0 ? gbpBrlAsset.price : 6.9450;
    
    // Normalize JPY to 1 unit
    let jpyPriceInBrl = 0.0345;
    if (jpyBrlAsset?.price && jpyBrlAsset.price > 0) {
      jpyPriceInBrl = jpyBrlAsset.price > 1 ? jpyBrlAsset.price / 100 : jpyBrlAsset.price;
    }

    // Crypto in BRL
    let btcPriceInBrl = 542800;
    if (btcAsset?.price && btcAsset.price > 0) {
      btcPriceInBrl = btcAsset.currency === "USD" ? btcAsset.price * usdPriceInBrl : btcAsset.price;
    }

    let ethPriceInBrl = 16450;
    if (ethAsset?.price && ethAsset.price > 0) {
      ethPriceInBrl = ethAsset.currency === "USD" ? ethAsset.price * usdPriceInBrl : ethAsset.price;
    }

    let solPriceInBrl = 1145;
    if (solAsset?.price && solAsset.price > 0) {
      solPriceInBrl = solAsset.currency === "USD" ? solAsset.price * usdPriceInBrl : solAsset.price;
    }

    return {
      BRL: 1.0,
      USD: usdPriceInBrl,
      EUR: eurPriceInBrl,
      GBP: gbpPriceInBrl,
      JPY: jpyPriceInBrl,
      BTC: btcPriceInBrl,
      ETH: ethPriceInBrl,
      SOL: solPriceInBrl,
    };
  }, [liveAssets]);

  // Conversion Calculation with Live Rates
  const conversionResult = useMemo(() => {
    const numericAmount = parseFloat(converterAmount.replace(",", ".")) || 0;
    const fromRate = liveRatesToBRL[fromCurrency] || 1.0;
    const toRate = liveRatesToBRL[toCurrency] || 1.0;
    const unitRate = fromRate / toRate;

    if (numericAmount <= 0) {
      return { raw: 0, formatted: "0,00", unitRate };
    }

    const targetValue = numericAmount * unitRate;

    let formatted = "";
    if (toCurrency === "BTC" || toCurrency === "ETH" || toCurrency === "SOL") {
      formatted = targetValue < 0.001 ? targetValue.toFixed(8) : targetValue.toFixed(4);
    } else if (toCurrency === "USD" || toCurrency === "EUR" || toCurrency === "GBP") {
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
      formatted = targetValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return { raw: targetValue, formatted, unitRate };
  }, [converterAmount, fromCurrency, toCurrency, liveRatesToBRL]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  if (!isOpen) return null;

  const categories: { id: RegionalTab; label: string; icon: React.ReactNode }[] = [
    { id: "EUA", label: "EUA & Wall Street", icon: <Landmark className="w-4 h-4" /> },
    { id: "Europa", label: "Europa & Zona do Euro", icon: <Globe className="w-4 h-4" /> },
    { id: "Ásia", label: "Ásia & Mercados Emergentes", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "América Latina", label: "América Latina (B3)", icon: <Globe className="w-4 h-4" /> },
    { id: "Moedas", label: "Câmbio & Forex", icon: <DollarSign className="w-4 h-4" /> },
    { id: "Criptomoedas", label: "Criptoativos (24h)", icon: <Coins className="w-4 h-4" /> },
    { id: "Contratos futuros", label: "Contratos Futuros & Agro", icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-80 max-w-full bg-[#161b22] border-r border-[#30363d] h-full flex flex-col z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200"
        id="sidebar-drawer-panel"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between bg-[#0e1117]/60">
          <BrandLogo size="sm" showText={true} showSubtitle={false} />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Shortcuts */}
        <div className="p-4 border-b border-[#21262d] space-y-2">
          {/* PWA App Install Button */}
          {onOpenPwaModal && (
            <button
              id="sidebar-btn-pwa"
              onClick={() => {
                onClose();
                onOpenPwaModal();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#1f6feb]/15 via-[#10b981]/15 to-[#00c853]/15 hover:from-[#1f6feb]/25 hover:to-[#00c853]/25 border border-[#00c853]/40 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-lg bg-[#00c853]/20 text-[#00c853]">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span>{isPwaInstalled ? "Aplicativo PWA Instalado" : "Instalar App PWA DinhEuro"}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00c853]/20 text-[#00c853] text-[10px] font-mono">
                {isPwaInstalled ? "ATIVO" : "INSTALAR"}
              </span>
            </button>
          )}

          <button
            id="sidebar-btn-watchlist"
            onClick={() => {
              onClose();
              onOpenWatchlist();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#0e1117] hover:bg-[#21262d] border border-[#30363d] text-xs font-semibold text-[#e6edf3] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-4 h-4 text-[#e3b341]" />
              <span>Minhas Listas de Observação</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#e3b341]/20 text-[#e3b341] font-mono text-[10px]">
              {watchlistAssets.length}
            </span>
          </button>

          <button
            id="sidebar-btn-portfolio"
            onClick={() => {
              onClose();
              onOpenPortfolio();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-[#1f6feb]/20 to-[#238636]/20 hover:from-[#1f6feb]/30 hover:to-[#238636]/30 border border-[#1f6feb]/40 text-xs font-semibold text-[#e6edf3] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-[#58a6ff]" />
              <span>Criar / Gerenciar Portfólio</span>
            </div>
            <span className="text-[10px] text-[#58a6ff]">Novo</span>
          </button>
        </div>

        {/* Categories Section */}
        <div className="p-4 space-y-1">
          <h4 className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider px-2 mb-2">
            Mercados & Regiões
          </h4>
          {categories.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectTab(cat.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/40 font-bold"
                    : "text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]/50"
                }`}
              >
                <span className={isActive ? "text-[#58a6ff]" : "text-[#8b949e]"}>
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Currency Converter Utility Tool */}
        <div className="p-4 border-t border-[#21262d] space-y-3 bg-[#0d1117]/50" id="currency-converter-tool">
          <div
            onClick={() => setIsConverterOpen(!isConverterOpen)}
            className="flex items-center justify-between cursor-pointer group select-none"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-[#00c853]/15 text-[#00c853] border border-[#00c853]/30">
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors">
                Conversor de Moedas
              </h4>
            </div>
            <button className="text-[#8b949e] group-hover:text-[#e6edf3]">
              {isConverterOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          {isConverterOpen && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Amount Input */}
              <div>
                <label className="text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider block mb-1">
                  Valor a Converter
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-mono font-bold text-[#8b949e]">
                    {CURRENCY_INFO[fromCurrency].symbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={converterAmount}
                    onChange={(e) => setConverterAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
                  />
                </div>
              </div>

              {/* Currency Selector & Swap */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* From Selector */}
                <div>
                  <label className="text-[10px] text-[#8b949e] font-semibold block mb-1">De</label>
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value as CurrencyType)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-[#e6edf3] font-medium focus:outline-none focus:border-[#58a6ff] cursor-pointer"
                  >
                    <option value="USD">🇺🇸 USD (Dólar)</option>
                    <option value="BRL">🇧🇷 BRL (Real)</option>
                    <option value="EUR">🇪🇺 EUR (Euro)</option>
                    <option value="GBP">🇬🇧 GBP (Libra)</option>
                    <option value="JPY">🇯🇵 JPY (Iene)</option>
                    <option value="BTC">₿ BTC (Bitcoin)</option>
                    <option value="ETH">Ξ ETH (Ethereum)</option>
                    <option value="SOL">◎ SOL (Solana)</option>
                  </select>
                </div>

                {/* Swap Button */}
                <div className="flex flex-col items-center justify-end pt-4">
                  <button
                    onClick={handleSwapCurrencies}
                    title="Inverter Moedas"
                    className="p-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#58a6ff] hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* To Selector */}
                <div>
                  <label className="text-[10px] text-[#8b949e] font-semibold block mb-1">Para</label>
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value as CurrencyType)}
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-[#e6edf3] font-medium focus:outline-none focus:border-[#58a6ff] cursor-pointer"
                  >
                    <option value="BRL">🇧🇷 BRL (Real)</option>
                    <option value="USD">🇺🇸 USD (Dólar)</option>
                    <option value="EUR">🇪🇺 EUR (Euro)</option>
                    <option value="GBP">🇬🇧 GBP (Libra)</option>
                    <option value="JPY">🇯🇵 JPY (Iene)</option>
                    <option value="BTC">₿ BTC (Bitcoin)</option>
                    <option value="ETH">Ξ ETH (Ethereum)</option>
                    <option value="SOL">◎ SOL (Solana)</option>
                  </select>
                </div>
              </div>

              {/* Conversion Result Display */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-[#161b22] to-[#0e1117] border border-[#30363d] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8b949e] font-semibold uppercase tracking-wider">
                    Resultado em Tempo Real
                  </span>
                  <span className="text-[10px] text-[#00c853] font-mono font-medium">
                    1 {fromCurrency} = {conversionResult.unitRate < 0.001 ? conversionResult.unitRate.toFixed(8) : conversionResult.unitRate < 1 ? conversionResult.unitRate.toFixed(4) : conversionResult.unitRate > 1000 ? conversionResult.unitRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : conversionResult.unitRate.toFixed(4)} {toCurrency}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-mono font-bold text-[#00c853]">
                    {CURRENCY_INFO[toCurrency].symbol}
                  </span>
                  <span className="text-base font-bold font-mono text-white tracking-tight">
                    {conversionResult.formatted}
                  </span>
                  <span className="text-[11px] font-semibold text-[#8b949e]">
                    {toCurrency}
                  </span>
                </div>
                <div className="text-[10px] text-[#8b949e] pt-1.5 border-t border-[#21262d] flex justify-between items-center">
                  <span>
                    {converterAmount || "0"} {fromCurrency} =
                  </span>
                  <span className="text-[#58a6ff] font-mono font-semibold">
                    {CURRENCY_INFO[toCurrency].prefix} {conversionResult.formatted}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="text-[9px] uppercase font-semibold text-[#8b949e] tracking-wider block mb-1">
                  Valores Rápidos
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(fromCurrency === "BTC" || fromCurrency === "ETH" || fromCurrency === "SOL"
                    ? ["0.01", "0.1", "0.5", "1"]
                    : ["100", "500", "1000", "5000"]
                  ).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setConverterAmount(preset)}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-mono font-medium border transition-colors cursor-pointer text-center ${
                        converterAmount === preset
                          ? "bg-[#1f6feb]/20 border-[#58a6ff] text-[#58a6ff]"
                          : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#21262d]"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Rates Reference Note */}
              <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#21262d] text-[10px] text-[#8b949e] space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1 text-[#00c853] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse"></span>
                    Câmbio ao Vivo
                  </span>
                  <span className="text-[#8b949e] text-[9px] font-mono">Taxas Oficiais em Tempo Real</span>
                </div>
                {liveAssets.length === 0 ? (
                  <div className="space-y-2 py-1">
                    <div className="h-5 w-full bg-[#0e1117] rounded animate-pulse" />
                    <div className="h-3.5 w-3/4 bg-[#21262d] rounded animate-pulse" />
                    <div className="h-3.5 w-2/3 bg-[#21262d] rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between font-mono bg-[#0e1117] px-2 py-1 rounded border border-[#30363d]/50">
                      <span className="text-[#8b949e]">Par Selecionado (1 {fromCurrency}):</span>
                      <span className="text-[#00c853] font-bold">
                        {conversionResult.unitRate < 0.001 ? conversionResult.unitRate.toFixed(8) : conversionResult.unitRate < 1 ? conversionResult.unitRate.toFixed(4) : conversionResult.unitRate > 1000 ? conversionResult.unitRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : conversionResult.unitRate.toFixed(4)} {toCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between font-mono pt-0.5">
                      <span>1 USD =</span>
                      <span className="text-[#e6edf3]">R$ {liveRatesToBRL.USD.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>1 EUR =</span>
                      <span className="text-[#e6edf3]">R$ {liveRatesToBRL.EUR.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>1 GBP =</span>
                      <span className="text-[#e6edf3]">R$ {liveRatesToBRL.GBP.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>1 BTC =</span>
                      <span className="text-[#e6edf3]">R$ {liveRatesToBRL.BTC.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                    </div>
                  </>
                )}
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

        {/* Footer info */}
        <div className="mt-auto p-4 border-t border-[#21262d] bg-[#0e1117] text-[11px] text-[#8b949e] space-y-1">
          <div className="flex items-center gap-1.5 text-[#e6edf3] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>DinhEuro.com Financial Hub</span>
          </div>
          <p>Cotações em tempo real e IA generativa para investidores.</p>
        </div>
      </div>
    </div>
  );
};
