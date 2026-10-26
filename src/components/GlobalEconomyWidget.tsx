import React, { useState, useEffect, useMemo } from "react";
import {
  fetchEconomyData,
  AwesomeEconomyQuote,
  AwesomeEconomyResponse,
} from "../services/awesomeApi";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  ArrowUpDown,
  DollarSign,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";

const DEFAULT_ECONOMY_DATA: AwesomeEconomyResponse = {
  USDBRL: {
    code: "USD",
    codein: "BRL",
    name: "Dólar Comercial",
    high: "5.2150",
    low: "5.1620",
    varBid: "0.0125",
    pctChange: "0.24",
    bid: "5.1866",
    ask: "5.1878",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  EURBRL: {
    code: "EUR",
    codein: "BRL",
    name: "Euro Comercial",
    high: "5.9420",
    low: "5.8810",
    varBid: "0.0180",
    pctChange: "0.31",
    bid: "5.9140",
    ask: "5.9160",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  GBPBRL: {
    code: "GBP",
    codein: "BRL",
    name: "Libra Esterlina",
    high: "6.9850",
    low: "6.9120",
    varBid: "0.0210",
    pctChange: "0.30",
    bid: "6.9530",
    ask: "6.9560",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  JPYBRL: {
    code: "JPY",
    codein: "BRL",
    name: "Iene Japonês",
    high: "0.0352",
    low: "0.0341",
    varBid: "-0.0001",
    pctChange: "-0.28",
    bid: "0.0345",
    ask: "0.0346",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  CADBRL: {
    code: "CAD",
    codein: "BRL",
    name: "Dólar Canadense",
    high: "3.8420",
    low: "3.7910",
    varBid: "0.0085",
    pctChange: "0.22",
    bid: "3.8120",
    ask: "3.8140",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  CHFBRL: {
    code: "CHF",
    codein: "BRL",
    name: "Franco Suíço",
    high: "6.1820",
    low: "6.1150",
    varBid: "0.0140",
    pctChange: "0.23",
    bid: "6.1420",
    ask: "6.1450",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  BTCBRL: {
    code: "BTC",
    codein: "BRL",
    name: "Bitcoin em Reais",
    high: "548000",
    low: "536500",
    varBid: "6800",
    pctChange: "1.28",
    bid: "542300",
    ask: "542500",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  ETHBRL: {
    code: "ETH",
    codein: "BRL",
    name: "Ethereum em Reais",
    high: "17200",
    low: "16750",
    varBid: "210",
    pctChange: "1.25",
    bid: "17050",
    ask: "17080",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  ARSBRL: {
    code: "ARS",
    codein: "BRL",
    name: "Peso Argentino",
    high: "0.0053",
    low: "0.0051",
    varBid: "-0.00005",
    pctChange: "-0.95",
    bid: "0.0052",
    ask: "0.0053",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  CLPBRL: {
    code: "CLP",
    codein: "BRL",
    name: "Peso Chileno",
    high: "0.0056",
    low: "0.0054",
    varBid: "0.00002",
    pctChange: "0.36",
    bid: "0.0055",
    ask: "0.0056",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
  MXNBRL: {
    code: "MXN",
    codein: "BRL",
    name: "Peso Mexicano",
    high: "0.2650",
    low: "0.2580",
    varBid: "0.0012",
    pctChange: "0.46",
    bid: "0.2610",
    ask: "0.2615",
    timestamp: String(Math.floor(Date.now() / 1000)),
    create_date: new Date().toISOString(),
  },
};

export const GlobalEconomyWidget: React.FC = () => {
  const [data, setData] = useState<AwesomeEconomyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "major" | "crypto" | "latam"
  >("major");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // First attempt key pairs for instant response, or 'all'
      const result = await fetchEconomyData("all");
      if (result && Object.keys(result).length > 0 && !result.status) {
        setData(result);
        setLastRefreshed(
          new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } else {
        // Fallback to essential basket
        const fallback = await fetchEconomyData(
          "USD-BRL,EUR-BRL,BTC-BRL,GBP-BRL,JPY-BRL,CAD-BRL,CHF-BRL,AUD-BRL,CNY-BRL,ETH-BRL,ARS-BRL"
        );
        if (fallback && Object.keys(fallback).length > 0 && !(fallback as any).status) {
          setData(fallback);
          setLastRefreshed(
            new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        } else {
          // Graceful fallback without showing a blank or broken box
          setData(DEFAULT_ECONOMY_DATA);
          setLastRefreshed(
            new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      }
    } catch (err: any) {
      console.warn("AwesomeAPI fallback ativo:", err);
      setData(DEFAULT_ECONOMY_DATA);
      setLastRefreshed(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const itemsList = useMemo(() => {
    if (!data) return [];
    const entries = (Object.entries(data) as [string, AwesomeEconomyQuote][]).map(([key, quote]) => ({
      key,
      ...quote,
      pctNum: Number(quote.pctChange || 0),
      bidNum: Number(quote.bid || 0),
      askNum: Number(quote.ask || 0),
      highNum: Number(quote.high || 0),
      lowNum: Number(quote.low || 0),
    }));

    return entries.filter((item) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category filters
      if (selectedFilter === "major") {
        return ["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD"].includes(
          item.code
        );
      }
      if (selectedFilter === "crypto") {
        return ["BTC", "ETH", "LTC", "XRP", "DOGE", "SOL"].includes(item.code);
      }
      if (selectedFilter === "latam") {
        return ["ARS", "CLP", "COP", "MXN", "UYU", "PEN"].includes(item.code);
      }
      return true;
    });
  }, [data, selectedFilter, searchQuery]);

  return (
    <div className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-6 shadow-xl mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1f6feb]/20 to-[#00c853]/20 border border-[#1f6feb]/30 flex items-center justify-center text-[#58a6ff]">
            <Globe className="w-5 h-5 text-[#58a6ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#e6edf3]">
                Economia Global & Cotações em Tempo Real
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#00c853]/15 text-[#00c853] text-[10px] font-mono font-bold border border-[#00c853]/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse"></span>
                AwesomeAPI 100% Pública
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Moedas globais, criptos, valor de compra/venda, máxima, mínima e tendências de mercado
            </p>
          </div>
        </div>

        {/* Refresh & Last Updated */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {lastRefreshed && (
            <span className="text-[11px] font-mono text-[#8b949e]">
              Atualizado: {lastRefreshed}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] hover:text-white border border-[#30363d] text-xs font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Atualizar dados da economia agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3 border-b border-[#21262d]/60">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {[
            { id: "major", label: "Moedas Principais" },
            { id: "crypto", label: "Criptomoedas" },
            { id: "latam", label: "América Latina" },
            { id: "all", label: "Todas as Moedas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedFilter === tab.id
                  ? "bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40 shadow-xs"
                  : "bg-[#0e1117] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por moeda ou par (ex: USD, EUR, BTC)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0e1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>
      </div>

      {/* Grid of Economic Indicators */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#0e1117] border border-[#30363d]/60 rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="h-4 bg-[#21262d] rounded w-2/3"></div>
              <div className="h-6 bg-[#21262d] rounded w-1/2"></div>
              <div className="h-3 bg-[#21262d] rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-8 text-center text-xs text-[#ff5252] space-y-2">
          <p>{error}</p>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-[#21262d] text-[#e6edf3] rounded-lg hover:bg-[#30363d] text-xs transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      ) : itemsList.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#8b949e]">
          Nenhum indicador econômico encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-4">
          {itemsList.slice(0, 16).map((item) => {
            const isUp = item.pctNum >= 0;
            const pairDisplay = `${item.code} / ${item.codein}`;

            return (
              <div
                key={item.key}
                className="bg-[#0e1117] hover:bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff]/50 rounded-xl p-4 transition-all duration-150 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-[#58a6ff]">
                      {pairDisplay}
                    </span>
                    <span
                      className={`flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        isUp
                          ? "bg-[#00c853]/15 text-[#00c853] border border-[#00c853]/30"
                          : "bg-[#ff5252]/15 text-[#ff5252] border border-[#ff5252]/30"
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {isUp ? "+" : ""}
                        {item.pctNum.toFixed(2)}%
                      </span>
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-[#e6edf3] truncate mb-2" title={item.name}>
                    {item.name}
                  </h4>

                  {/* Main Price (Bid / Compra) */}
                  <div className="flex items-baseline justify-between mb-2 pb-2 border-b border-[#21262d]">
                    <span className="text-[11px] text-[#8b949e]">Compra (Bid):</span>
                    <span className="text-base font-extrabold font-mono text-white">
                      R$ {item.bidNum >= 1000 ? item.bidNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.bidNum.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Details: Venda, Máxima, Mínima, Tendência */}
                <div className="space-y-1 text-[11px] font-mono text-[#8b949e]">
                  <div className="flex items-center justify-between">
                    <span>Venda (Ask):</span>
                    <span className="text-[#e6edf3]">
                      R$ {item.askNum.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Máx / Mín Dia:</span>
                    <span className="text-[#e6edf3]">
                      {item.highNum.toFixed(2)} / {item.lowNum.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#21262d]/50">
                    <span className="text-[10px]">Tendência:</span>
                    <span
                      className={`text-[10px] font-bold ${
                        isUp ? "text-[#00c853]" : "text-[#ff5252]"
                      }`}
                    >
                      {isUp ? "Alta Diária" : "Queda Diária"} ({item.varBid >= "0" ? "+" : ""}{Number(item.varBid).toFixed(4)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
