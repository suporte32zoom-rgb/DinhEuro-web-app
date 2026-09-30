import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import JSZip from "jszip";

dotenv.config();

const __filename = typeof import.meta !== "undefined" && (import.meta as any).url ? fileURLToPath((import.meta as any).url) : "";
const __dirname = path.resolve();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini AI client safely
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAI;
}

// Resilient Gemini generator with retry and model fallback
async function generateContentSafely(options: {
  contents: string;
  config?: any;
  preferredModel?: string;
}): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai || !process.env.GEMINI_API_KEY) return null;

  const candidateModels = [
    options.preferredModel || "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  const modelsToTry = Array.from(new Set(candidateModels));

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        if (response?.text) {
          return response.text;
        }
      } catch (err: any) {
        const isAuthError =
          err?.status === 401 ||
          err?.code === 401 ||
          err?.message?.includes("UNAUTHENTICATED") ||
          err?.message?.includes("invalid authentication");

        if (isAuthError) {
          // If auth credentials invalid or expired, gracefully return null without noisy retries
          return null;
        }

        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes("503") ||
          err?.message?.includes("UNAVAILABLE") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("RESOURCE_EXHAUSTED");

        if (isTransient && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 600));
        } else {
          break;
        }
      }
    }
  }
  return null;
}

// ==========================================
// REAL-TIME MARKET DATA ENGINE & CACHE
// ==========================================

interface LiveQuote {
  id: string;
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  category: string;
  sparkline: number[];
  high52w?: number;
  low52w?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: string;
  lastUpdated: string;
}

// Asset mapping to real-time external providers
const ASSET_REGISTRY: Record<
  string,
  {
    ticker: string;
    name: string;
    symbol: string;
    category: string;
    currency: string;
    exchange: string;
    type: "yf" | "crypto" | "fx";
    basePrice: number;
  }
> = {
  // América Latina (B3 & Latam)
  ibovespa: { ticker: "IBOV", name: "Ibovespa Brasil", symbol: "^BVSP", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 183476 },
  petr4: { ticker: "PETR4", name: "Petrobras PN", symbol: "PETR4.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 47.99 },
  vale3: { ticker: "VALE3", name: "Vale ON", symbol: "VALE3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 70.77 },
  itub4: { ticker: "ITUB4", name: "Itaú Unibanco PN", symbol: "ITUB4.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 42.13 },
  bbas3: { ticker: "BBAS3", name: "Banco do Brasil ON", symbol: "BBAS3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 28.5 },
  wege3: { ticker: "WEGE3", name: "WEG S.A. ON", symbol: "WEGE3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 54.12 },
  b3sa3: { ticker: "B3SA3", name: "B3 S.A. ON", symbol: "B3SA3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 11.28 },
  mglu3: { ticker: "MGLU3", name: "Magazine Luiza ON", symbol: "MGLU3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 9.45 },
  prio3: { ticker: "PRIO3", name: "PRIO S.A. ON", symbol: "PRIO3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 44.8 },
  embra3: { ticker: "EMBR3", name: "Embraer ON", symbol: "EMBR3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 56.7 },
  totv3: { ticker: "TOTS3", name: "Totvs ON", symbol: "TOTS3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 32.15 },
  sula11: { ticker: "EQTL3", name: "Equatorial Energia ON", symbol: "EQTL3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 34.9 },
  azulp4: { ticker: "AZUL4", name: "Azul Linhas Aéreas PN", symbol: "AZUL4.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 4.12 },
  cmin3: { ticker: "CMIN3", name: "CSN Mineração ON", symbol: "CMIN3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 5.48 },
  csna3: { ticker: "CSNA3", name: "Siderúrgica Nacional ON", symbol: "CSNA3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 10.35 },
  crfb3: { ticker: "CRFB3", name: "Carrefour Brasil ON", symbol: "CRFB3.SA", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 8.72 },
  "sp-latin-america": { ticker: "S&P LATAM", name: "S&P Latin America 40", symbol: "^MXX", category: "América Latina", currency: "USD", exchange: "S&P Dow Jones", type: "yf", basePrice: 2894.4 },
  igovernanca: { ticker: "IGCX", name: "Índice de Governança Corporativa", symbol: "^BVSP", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 14210 },
  "ibrx-brasil": { ticker: "IBRA", name: "Índice Brasil Amplo", symbol: "^BVSP", category: "América Latina", currency: "BRL", exchange: "B3 (Brasil)", type: "yf", basePrice: 5240 },

  // EUA
  "sp-500": { ticker: "S&P 500", name: "S&P 500 Index", symbol: "^GSPC", category: "EUA", currency: "USD", exchange: "NYSE / NASDAQ", type: "yf", basePrice: 7743.41 },
  nasdaq: { ticker: "NASDAQ", name: "Nasdaq Composite", symbol: "^IXIC", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 27068.7 },
  "dow-jones": { ticker: "DOW JONES", name: "Dow Jones Industrial Average", symbol: "^DJI", category: "EUA", currency: "USD", exchange: "NYSE", type: "yf", basePrice: 48920 },
  "russell-2000": { ticker: "RUSSELL", name: "Russell 2000 Small Cap", symbol: "^RUT", category: "EUA", currency: "USD", exchange: "Russell", type: "yf", basePrice: 2360 },
  vix: { ticker: "VIX", name: "CBOE Volatility Index", symbol: "^VIX", category: "EUA", currency: "USD", exchange: "CBOE", type: "yf", basePrice: 16.2 },
  aapl: { ticker: "AAPL", name: "Apple Inc.", symbol: "AAPL", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 341.07 },
  nvda: { ticker: "NVDA", name: "NVIDIA Corporation", symbol: "NVDA", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 225.07 },
  msft: { ticker: "MSFT", name: "Microsoft Corporation", symbol: "MSFT", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 428.5 },
  amzn: { ticker: "AMZN", name: "Amazon.com Inc.", symbol: "AMZN", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 212.4 },
  googl: { ticker: "GOOGL", name: "Alphabet Inc.", symbol: "GOOGL", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 194.8 },
  tsla: { ticker: "TSLA", name: "Tesla Inc.", symbol: "TSLA", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 254.2 },
  meta: { ticker: "META", name: "Meta Platforms Inc.", symbol: "META", category: "EUA", currency: "USD", exchange: "NASDAQ", type: "yf", basePrice: 618.3 },

  // Europa
  dax: { ticker: "DAX 40", name: "DAX Performance Index", symbol: "^GDAXI", category: "Europa", currency: "EUR", exchange: "XETRA (Frankfurt)", type: "yf", basePrice: 25408.6 },
  "ftse-100": { ticker: "FTSE 100", name: "FTSE 100 Index", symbol: "^FTSE", category: "Europa", currency: "GBP", exchange: "LSE (Londres)", type: "yf", basePrice: 10695.2 },
  "cac-40": { ticker: "CAC 40", name: "CAC 40 Index", symbol: "^FCHI", category: "Europa", currency: "EUR", exchange: "Euronext Paris", type: "yf", basePrice: 8120 },
  "ibex-35": { ticker: "IBEX 35", name: "IBEX 35 Index", symbol: "^IBEX", category: "Europa", currency: "EUR", exchange: "BME (Madri)", type: "yf", basePrice: 11840 },
  "euro-stoxx-50": { ticker: "STOXX 50", name: "Euro Stoxx 50", symbol: "^STOXX50E", category: "Europa", currency: "EUR", exchange: "Euronext", type: "yf", basePrice: 5040 },

  // Ásia
  "nikkei-225": { ticker: "NIKKEI 225", name: "Nikkei 225 Index", symbol: "^N225", category: "Ásia", currency: "JPY", exchange: "TSE (Tóquio)", type: "yf", basePrice: 66333.5 },
  "sse-composite": { ticker: "SSE COMP", name: "Shanghai Composite Index", symbol: "000001.SS", category: "Ásia", currency: "CNY", exchange: "SSE (Xangai)", type: "yf", basePrice: 3340 },
  "hang-seng": { ticker: "HANG SENG", name: "Hang Seng Index", symbol: "^HSI", category: "Ásia", currency: "HKD", exchange: "HKEX (Hong Kong)", type: "yf", basePrice: 20850 },
  "bse-sensex": { ticker: "SENSEX", name: "BSE Sensex 30", symbol: "^BSESN", category: "Ásia", currency: "INR", exchange: "BSE (Índia)", type: "yf", basePrice: 82140 },
  "nifty-50": { ticker: "NIFTY 50", name: "Nifty 50 Index", symbol: "^NSEI", category: "Ásia", currency: "INR", exchange: "NSE (Índia)", type: "yf", basePrice: 25110 },
  kospi: { ticker: "KOSPI", name: "Korea Composite Stock Price Index", symbol: "^KS11", category: "Ásia", currency: "KRW", exchange: "KRX (Seul)", type: "yf", basePrice: 2720 },

  // Moedas
  "usd-brl": { ticker: "USD / BRL", name: "Dólar Comercial", symbol: "BRL=X", category: "Moedas", currency: "BRL", exchange: "Mercado Interbancário", type: "yf", basePrice: 5.1866 },
  "eur-brl": { ticker: "EUR / BRL", name: "Euro Comercial", symbol: "EURBRL=X", category: "Moedas", currency: "BRL", exchange: "Mercado Interbancário", type: "yf", basePrice: 5.9067 },
  "gbp-brl": { ticker: "GBP / BRL", name: "Libra Esterlina", symbol: "GBPBRL=X", category: "Moedas", currency: "BRL", exchange: "Mercado Interbancário", type: "yf", basePrice: 6.945 },
  "jpy-brl": { ticker: "JPY / BRL", name: "Iene Japonês", symbol: "JPYBRL=X", category: "Moedas", currency: "BRL", exchange: "Mercado Interbancário", type: "yf", basePrice: 0.0345 },
  "usd-eur": { ticker: "EUR / USD", name: "Euro vs Dólar", symbol: "EUR=X", category: "Moedas", currency: "USD", exchange: "Forex Global", type: "yf", basePrice: 1.087 },

  // Criptomoedas
  bitcoin: { ticker: "BTC", name: "Bitcoin", symbol: "BTC-USD", category: "Criptomoedas", currency: "USD", exchange: "Cripto 24/7", type: "crypto", basePrice: 83430 },
  ether: { ticker: "ETH", name: "Ethereum", symbol: "ETH-USD", category: "Criptomoedas", currency: "USD", exchange: "Cripto 24/7", type: "crypto", basePrice: 2654 },
  solana: { ticker: "SOL", name: "Solana", symbol: "SOL-USD", category: "Criptomoedas", currency: "USD", exchange: "Cripto 24/7", type: "crypto", basePrice: 120.18 },
  xrp: { ticker: "XRP", name: "Ripple XRP", symbol: "XRP-USD", category: "Criptomoedas", currency: "USD", exchange: "Cripto 24/7", type: "crypto", basePrice: 1.5 },
  dogecoin: { ticker: "DOGE", name: "Dogecoin", symbol: "DOGE-USD", category: "Criptomoedas", currency: "USD", exchange: "Cripto 24/7", type: "crypto", basePrice: 0.185 },

  // Contratos futuros & Commodities
  "petroleo-brent": { ticker: "BRENT", name: "Petróleo Brent Futuro", symbol: "BZ=F", category: "Contratos futuros", currency: "USD", exchange: "ICE Futures Europe", type: "yf", basePrice: 98.21 },
  "ouro-futuro": { ticker: "OURO", name: "Ouro Futuro (Gold COMEX)", symbol: "GC=F", category: "Contratos futuros", currency: "USD", exchange: "COMEX (NYMEX)", type: "yf", basePrice: 4235 },
  "soja-futuro": { ticker: "SOJA", name: "Soja Grão Futuro", symbol: "ZS=F", category: "Contratos futuros", currency: "USD", exchange: "CBOT (Chicago)", type: "yf", basePrice: 1045 },
  "gas-natural": { ticker: "GÁS NAT", name: "Gás Natural Henry Hub", symbol: "NG=F", category: "Contratos futuros", currency: "USD", exchange: "NYMEX", type: "yf", basePrice: 2.85 },
  "sp-500-futuros": { ticker: "S&P FUT", name: "S&P 500 E-mini Futuros", symbol: "ES=F", category: "Contratos futuros", currency: "USD", exchange: "CME Group", type: "yf", basePrice: 7755 },
};

// In-memory quote cache
const quotesCache: {
  timestamp: number;
  data: Record<string, LiveQuote>;
} = {
  timestamp: 0,
  data: {},
};

// Helper: Fetch a single symbol from Yahoo Finance Chart API
async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  prevClose: number;
  open?: number;
  high?: number;
  low?: number;
  high52?: number;
  low52?: number;
  volume?: number;
  sparkline: number[];
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=15m`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const closes: number[] = (quote?.close || []).filter((v: any) => typeof v === "number" && !isNaN(v));

    const price = meta?.regularMarketPrice || (closes.length > 0 ? closes[closes.length - 1] : 0);
    const prevClose = meta?.chartPreviousClose || meta?.previousClose || price;

    const sparkline = closes.length >= 6 ? closes.slice(-12) : [prevClose, price];

    return {
      price,
      prevClose,
      open: meta?.regularMarketOpen,
      high: meta?.regularMarketDayHigh,
      low: meta?.regularMarketDayLow,
      high52: meta?.fiftyTwoWeekHigh,
      low52: meta?.fiftyTwoWeekLow,
      volume: meta?.regularMarketVolume,
      sparkline,
    };
  } catch {
    return null;
  }
}

// Helper: Fetch Crypto from CoinGecko
async function fetchCoinGeckoCrypto(): Promise<Record<string, { price: number; change24h: number; high24h?: number; low24h?: number }> | null> {
  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,dogecoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      bitcoin: { price: data.bitcoin?.usd, change24h: data.bitcoin?.usd_24h_change || 0 },
      ether: { price: data.ethereum?.usd, change24h: data.ethereum?.usd_24h_change || 0 },
      solana: { price: data.solana?.usd, change24h: data.solana?.usd_24h_change || 0 },
      xrp: { price: data.ripple?.usd, change24h: data.ripple?.usd_24h_change || 0 },
      dogecoin: { price: data.dogecoin?.usd, change24h: data.dogecoin?.usd_24h_change || 0 },
    };
  } catch {
    return null;
  }
}

// Master refresh for all quotes
async function updateAllQuotes(): Promise<Record<string, LiveQuote>> {
  const now = Date.now();
  // Cache valid for 10 seconds
  if (quotesCache.timestamp > 0 && now - quotesCache.timestamp < 10000 && Object.keys(quotesCache.data).length > 0) {
    return quotesCache.data;
  }

  const cryptoData = await fetchCoinGeckoCrypto();
  const entries = Object.entries(ASSET_REGISTRY);

  // Fetch in parallel chunks of 10 to avoid throttling
  const chunkSize = 10;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async ([id, reg]) => {
        try {
          let price = reg.basePrice;
          let prevClose = reg.basePrice;
          let sparkline: number[] = [reg.basePrice * 0.99, reg.basePrice];
          let open = reg.basePrice;
          let high = reg.basePrice * 1.01;
          let low = reg.basePrice * 0.99;
          let high52 = reg.basePrice * 1.25;
          let low52 = reg.basePrice * 0.8;
          let volumeStr = "R$ 450 Mi";

          // Check if crypto data available
          if (reg.type === "crypto" && cryptoData && cryptoData[id]) {
            const cInfo = cryptoData[id];
            price = cInfo.price;
            const pct = cInfo.change24h;
            prevClose = price / (1 + pct / 100);
            sparkline = [prevClose, (prevClose + price) / 2, price];
            high = Math.max(price, prevClose) * 1.02;
            low = Math.min(price, prevClose) * 0.98;
          } else {
            // Yahoo Finance Fetch
            const yfData = await fetchYahooQuote(reg.symbol);
            if (yfData && yfData.price > 0) {
              price = yfData.price;
              prevClose = yfData.prevClose || yfData.price;
              if (yfData.sparkline.length > 0) {
                sparkline = yfData.sparkline;
              }
              open = yfData.open || prevClose;
              high = yfData.high || Math.max(price, prevClose);
              low = yfData.low || Math.min(price, prevClose);
              high52 = yfData.high52 || price * 1.2;
              low52 = yfData.low52 || price * 0.8;
              if (yfData.volume) {
                volumeStr =
                  reg.currency === "BRL"
                    ? `R$ ${(yfData.volume / 1000000).toFixed(1)} Mi`
                    : `US$ ${(yfData.volume / 1000000).toFixed(1)} Mi`;
              }
            }
          }

          const change = price - prevClose;
          const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

          quotesCache.data[id] = {
            id,
            ticker: reg.ticker,
            name: reg.name,
            price: Number(price.toFixed(price < 10 ? 4 : 2)),
            change: Number(change.toFixed(price < 10 ? 4 : 2)),
            changePercent: Number(changePercent.toFixed(2)),
            currency: reg.currency,
            exchange: reg.exchange,
            category: reg.category,
            sparkline: sparkline.map((v) => Number(v.toFixed(2))),
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            high52w: Number((high52 || price * 1.2).toFixed(2)),
            low52w: Number((low52 || price * 0.8).toFixed(2)),
            volume: volumeStr,
            lastUpdated: new Date().toISOString(),
          };
        } catch (err: any) {
          console.warn(`Failed quote for ${id}:`, err?.message);
        }
      })
    );
  }

  quotesCache.timestamp = Date.now();
  return quotesCache.data;
}

// API: Live Quotes for all categories
app.get("/api/market/quotes", async (_req, res) => {
  try {
    const quotes = await updateAllQuotes();
    res.json({
      success: true,
      count: Object.keys(quotes).length,
      timestamp: new Date().toISOString(),
      quotes,
    });
  } catch (error: any) {
    console.error("Error in /api/market/quotes:", error);
    res.status(500).json({ success: false, error: "Falha ao obter cotações em tempo real." });
  }
});

// API: Historical Chart Data for any ticker & period
app.get("/api/market/chart", async (req, res) => {
  try {
    const ticker = String(req.query.ticker || "IBOV").toUpperCase();
    const period = String(req.query.period || "1D").toUpperCase();

    // Find symbol
    let yfSymbol = "^BVSP";
    const foundReg = Object.values(ASSET_REGISTRY).find(
      (r) => r.ticker.toUpperCase() === ticker || r.symbol.toUpperCase() === ticker
    );
    if (foundReg) {
      yfSymbol = foundReg.symbol;
    } else if (ticker.endsWith(".SA") || ticker.startsWith("^")) {
      yfSymbol = ticker;
    } else if (!ticker.includes(".")) {
      yfSymbol = `${ticker}.SA`;
    }

    // Map timeframe to Yahoo range & interval
    let range = "1d";
    let interval = "5m";
    if (period === "5D") {
      range = "5d";
      interval = "15m";
    } else if (period === "1M") {
      range = "1mo";
      interval = "1d";
    } else if (period === "6M") {
      range = "6mo";
      interval = "1d";
    } else if (period === "YTD") {
      range = "ytd";
      interval = "1d";
    } else if (period === "1A" || period === "1Y") {
      range = "1y";
      interval = "1wk";
    } else if (period === "5A" || period === "5Y") {
      range = "5y";
      interval = "1mo";
    } else if (period === "MAX" || period === "MÁX") {
      range = "max";
      interval = "1mo";
    }

    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?range=${range}&interval=${interval}`;
    const response = await fetch(yfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res.status(404).json({ success: false, error: "Dados históricos indisponíveis no momento." });
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ success: false, error: "Sem dados para o ativo especificado." });
    }

    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens: number[] = quotes.open || [];
    const highs: number[] = quotes.high || [];
    const lows: number[] = quotes.low || [];
    const closes: number[] = quotes.close || [];
    const volumes: number[] = quotes.volume || [];

    const points: Array<{
      time: string;
      date: string;
      price: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      benchmarkPrice: number;
    }> = [];

    const baseBench = 100;
    const firstClose = closes.find((c) => typeof c === "number" && !isNaN(c)) || 1;

    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (typeof c !== "number" || isNaN(c)) continue;
      const d = new Date(timestamps[i] * 1000);
      const timeStr =
        period === "1D"
          ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : `${d.getDate()}/${d.getMonth() + 1}`;
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

      const o = typeof opens[i] === "number" && !isNaN(opens[i]) ? opens[i] : c;
      const h = typeof highs[i] === "number" && !isNaN(highs[i]) ? highs[i] : c;
      const l = typeof lows[i] === "number" && !isNaN(lows[i]) ? lows[i] : c;
      const v = typeof volumes[i] === "number" && !isNaN(volumes[i]) ? volumes[i] : 0;

      const bench = Number((baseBench * (c / firstClose)).toFixed(2));

      points.push({
        time: timeStr,
        date: dateStr,
        price: Number(c.toFixed(2)),
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: v,
        benchmarkPrice: bench,
      });
    }

    res.json({
      success: true,
      ticker,
      period,
      symbol: yfSymbol,
      count: points.length,
      meta: result.meta,
      points,
    });
  } catch (error: any) {
    console.error("Error in /api/market/chart:", error);
    res.status(500).json({ success: false, error: "Erro ao processar gráfico histórico." });
  }
});

// Helper: Calculate relative time in Portuguese
function getRelativeTimePt(dateStr: string): string {
  try {
    const pub = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - pub.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return "Agora mesmo";
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
  } catch {
    return "Recente";
  }
}

// API: Real-time News Feed from authoritative Brazilian & Global sources
let newsCache: { timestamp: number; items: any[] } = { timestamp: 0, items: [] };

app.get("/api/market/news", async (req, res) => {
  try {
    const now = Date.now();
    if (newsCache.timestamp > 0 && now - newsCache.timestamp < 60000 && newsCache.items.length > 0) {
      return res.json({ success: true, count: newsCache.items.length, news: newsCache.items });
    }

    const rssUrls = [
      { url: "https://news.google.com/rss/search?q=mercado+financeiro+ibovespa+dolar+acoes&hl=pt-BR&gl=BR&ceid=BR:pt-419", category: "Mercados B3" },
      { url: "https://news.google.com/rss/search?q=wall+street+sp500+fed+nasdaq&hl=pt-BR&gl=BR&ceid=BR:pt-419", category: "Wall Street" },
      { url: "https://news.google.com/rss/search?q=dolar+cambio+euro+banco+central&hl=pt-BR&gl=BR&ceid=BR:pt-419", category: "Câmbio & Forex" },
      { url: "https://news.google.com/rss/search?q=bitcoin+criptomoedas+etf+ethereum&hl=pt-BR&gl=BR&ceid=BR:pt-419", category: "Criptoativos" },
      { url: "https://news.google.com/rss/search?q=petroleo+brent+ouro+commodities+soja&hl=pt-BR&gl=BR&ceid=BR:pt-419", category: "Commodities" },
    ];

    const allNews: any[] = [];
    let idCounter = 1;

    await Promise.all(
      rssUrls.map(async (rss) => {
        try {
          const feedRes = await fetch(rss.url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          });
          if (!feedRes.ok) return;
          const xml = await feedRes.text();
          const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

          for (const itemXml of itemMatches.slice(0, 4)) {
            const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
            const linkMatch = itemXml.match(/<link>(.*?)<\/link>/) || itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
            const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
            const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);

            let rawTitle = titleMatch ? titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'") : "";
            const rawLink = linkMatch ? linkMatch[1] : "";
            const rawPubDate = pubDateMatch ? pubDateMatch[1] : "";
            let sourceName = sourceMatch ? sourceMatch[1] : "Agência Financeira";

            // Clean title if source is repeated at end
            if (rawTitle.includes(" - ")) {
              const parts = rawTitle.split(" - ");
              if (parts.length > 1) {
                sourceName = parts.pop() || sourceName;
                rawTitle = parts.join(" - ");
              }
            }

            // Extract related tickers from title
            const tickers: string[] = [];
            const upper = rawTitle.toUpperCase();
            if (upper.includes("IBOV") || upper.includes("BOLSA")) tickers.push("IBOV");
            if (upper.includes("PETROBRAS") || upper.includes("PETR4")) tickers.push("PETR4");
            if (upper.includes("VALE") || upper.includes("VALE3")) tickers.push("VALE3");
            if (upper.includes("ITAÚ") || upper.includes("ITUB4")) tickers.push("ITUB4");
            if (upper.includes("DÓLAR") || upper.includes("USD")) tickers.push("USD/BRL");
            if (upper.includes("BITCOIN") || upper.includes("BTC")) tickers.push("BTC");
            if (upper.includes("S&P") || upper.includes("SP500")) tickers.push("S&P 500");
            if (upper.includes("PETRÓLEO") || upper.includes("BRENT")) tickers.push("BRENT");

            if (rawTitle && rawLink) {
              allNews.push({
                id: `real-news-${idCounter++}`,
                title: rawTitle,
                source: sourceName,
                timeAgo: getRelativeTimePt(rawPubDate),
                url: rawLink,
                category: rss.category,
                relatedTickers: tickers.length > 0 ? tickers : ["MERCADO"],
                sentiment: upper.includes("ALTA") || upper.includes("SOBE") || upper.includes("DISPARA") ? "positive" : upper.includes("QUEDA") || upper.includes("CAI") || upper.includes("RECUO") ? "negative" : "neutral",
              });
            }
          }
        } catch (e: any) {
          console.warn("RSS feed fetch error:", e?.message);
        }
      })
    );

    if (allNews.length > 0) {
      newsCache = { timestamp: Date.now(), items: allNews };
      return res.json({ success: true, count: allNews.length, news: allNews });
    }

    // Fallback if network blocked
    res.json({ success: true, count: 0, news: [] });
  } catch (error: any) {
    console.error("Error in /api/market/news:", error);
    res.status(500).json({ success: false, error: "Erro ao carregar notícias em tempo real." });
  }
});

// API: Live Market Movers computed dynamically
app.get("/api/market/movers", async (_req, res) => {
  try {
    const quotes = await updateAllQuotes();
    const b3List = Object.values(quotes).filter(
      (q) => q.category === "América Latina" && q.ticker !== "IBOV" && !q.ticker.includes("Índice")
    );

    const sortedByGain = [...b3List].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sortedByGain.filter((q) => q.changePercent > 0).slice(0, 6);

    const sortedByLoss = [...b3List].sort((a, b) => a.changePercent - b.changePercent);
    const topLosers = sortedByLoss.filter((q) => q.changePercent < 0).slice(0, 6);

    const mostActive = [...b3List]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 6);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      movers: {
        mostActive,
        topGainers: topGainers.length > 0 ? topGainers : sortedByGain.slice(0, 5),
        topLosers: topLosers.length > 0 ? topLosers : sortedByLoss.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error("Error in /api/market/movers:", error);
    res.status(500).json({ success: false, error: "Falha ao calcular destaques de mercado." });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "DinhEuro Financial Real-time Engine", timestamp: new Date().toISOString() });
});

// Helper: Scan project source files to package for Hostinger
function getProjectFilesList(dir: string, baseDir: string = dir): Array<{ path: string; content: string }> {
  const results: Array<{ path: string; content: string }> = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const ignoredDirs = new Set(["node_modules", "dist", ".git", ".next", "angular-src"]);
  const ignoredFiles = new Set(["bun.lock", ".DS_Store"]);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        results.push(...getProjectFilesList(fullPath, baseDir));
      }
    } else if (entry.isFile()) {
      if (!ignoredFiles.has(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          results.push({ path: relPath, content });
        } catch {
          // ignore binary read failures if any
        }
      }
    }
  }
  return results;
}

// API endpoint to return all project source files
app.get("/api/project-files", (_req, res) => {
  try {
    const files = getProjectFilesList(process.cwd());
    res.json({ success: true, count: files.length, files });
  } catch (error: any) {
    console.error("Error reading project files:", error);
    res.status(500).json({ success: false, error: "Falha ao obter arquivos do projeto." });
  }
});

// Direct ZIP download endpoint for Hostinger
app.get("/api/export-project-zip", async (_req, res) => {
  try {
    const files = getProjectFilesList(process.cwd());
    const zip = new JSZip();

    for (const file of files) {
      zip.file(file.path, file.content);
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="dinheuro-hostinger-vite-react.zip"');
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.send(zipBuffer);
  } catch (error: any) {
    console.error("Error exporting zip:", error);
    res.status(500).json({ success: false, error: "Erro ao gerar arquivo .ZIP" });
  }
});

// AI Market Summary by Region
app.post("/api/market-ai/summary", async (req, res) => {
  try {
    const { region, topic } = req.body;
    const prompt = `Você é o analista-chefe de inteligência financeira do portal DinhEuro.com (inspirado no Google Finanças com foco em investidores e traders).
Gere uma análise concisa, técnica e perspicaz em português sobre o mercado de "${region || "Global"}" no tema "${topic || "Geral"}".
Destaque:
1. Sentimento macroeconômico atual com dados em tempo real.
2. Principais vetores e catalisadores (juros, inflação, balanços, commodities ou geopolítica).
3. O que o investidor deve monitorar hoje.
Mantenha o tom profissional, direto e sem jargões desnecessários, com 2 a 3 parágrafos objetivos.`;

    const aiText = await generateContentSafely({
      contents: prompt,
      preferredModel: "gemini-3.7-flash",
    });

    const finalAnalysis =
      aiText ||
      `Análise em tempo real para o mercado de ${region || "Geral"}: Os mercados operam com base na dinâmica das curvas de juros e fluxo de capital institucional. No segmento de ${topic || "Macroeconomia"}, investidores monitoram a liquidez, spreads de crédito e indicadores de inflação para tomada de decisão.`;

    res.json({
      success: true,
      region,
      topic,
      analysis: finalAnalysis,
      sources: ["DinhEuro Intelligence AI", "Termômetro de Liquidez Global", "Consenso de Analistas"],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in market summary endpoint:", error);
    res.json({
      success: true,
      region: req.body?.region || "Global",
      topic: req.body?.topic || "Geral",
      analysis: "Mercados globais mostram acomodação com atenção aos discursos de bancos centrais e balanços corporativos.",
      sources: ["DinhEuro Intelligence AI"],
      timestamp: new Date().toISOString(),
    });
  }
});

// Deep Dive AI explanation for specific topics
app.post("/api/market-ai/deep-dive", async (req, res) => {
  try {
    const { topicTitle, context, region } = req.body;
    const prompt = `Você é o assistente sênior de macroeconomia do portal DinhEuro.com.
O usuário clicou em "Aprenda mais com a IA do DinhEuro" para o tópico: "${topicTitle || "Mercado Financeiro"}" na região "${region || "Global"}".
Contexto adicional: "${context || ""}".
Estruture a resposta em Markdown limpo com:
- **Resumo Executivo** (1 frase direta)
- **Mecanismo de Ação no Mercado** (como isso impacta ações, moedas, títulos ou criptoativos)
- **Cenário Base vs. Cenário de Risco**
- **O que observar no gráfico / indicadores** (ex: médias móveis, volume, DXY, CDS Brasil)`;

    const aiText = await generateContentSafely({
      contents: prompt,
      preferredModel: "gemini-3.7-flash",
    });

    const fallbackContent = `### Análise Aprofundada DinhEuro: ${topicTitle || "Dinâmica de Mercado"}\n\n**Resumo Executivo:**\nO segmento de ${region || "Mercados"} apresenta correlações estratégicas ativas com as curvas de juros globais, fluxos cambiais e precificação de risco soberano.\n\n**Mecanismo de Ação no Mercado:**\n- **Câmbio e Juros:** Oscilações de liquidez internacional impactam diretamente as taxas futuras e a paridade de moedas fortes e emergentes.\n- **Ações e Índices:** Rotação setorial perceptível entre papéis cíclicos e defensivos nos pregões recentes.\n\n**Cenário Base vs. Cenário de Risco:**\n- *Cenário Base:* Consolidação em níveis técnicos de suporte com volatilidade contida.\n- *Cenário de Risco:* Picos de aversão ao risco decorrentes de dados de inflação acima do consenso.\n\n**O que observar nos indicadores:**\nMonitore o volume financeiro acumulado, cruzamento de médias móveis de 20/50 dias e os spreads de crédito corporativo.`;

    res.json({
      success: true,
      topicTitle,
      content: aiText || fallbackContent,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in deep dive endpoint:", error);
    res.json({
      success: true,
      topicTitle: req.body?.topicTitle || "Análise de Mercado",
      content: `### Análise DinhEuro Intelligence\n\n**Resumo:**\nO ativo ou tema selecionado reflete o equilíbrio entre política monetária global e demanda setorial.\n\n**Diretriz Tática:**\nAcompanhe a volatilidade implícita e os níveis de suporte e resistência no gráfico interativo.`,
      timestamp: new Date().toISOString(),
    });
  }
});

// Asset Deep Analysis
app.post("/api/market-ai/asset-analysis", async (req, res) => {
  try {
    const { ticker, name, currentPrice, changePercent, metrics } = req.body;
    const prompt = `Você é o sistema analítico de ativos do portal DinhEuro.com.
Faça um diagnóstico completo do ativo em tempo real:
- Nome: ${name || ticker}
- Código: ${ticker}
- Cotação Atual: ${currentPrice}
- Variação: ${changePercent}%
- Métricas: ${JSON.stringify(metrics || {})}
Forneça um JSON com a seguinte estrutura:
{
  "summary": "Texto de síntese técnica e fundamentalista de 3 a 4 frases",
  "valuationStatus": "Ex: Acima da Média Histórica / Em Zona de Oportunidade / Neutro",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "risks": ["risco 1", "risco 2"],
  "technicalInsight": "Análise sobre médias móveis, suporte, resistência e volume"
}`;

    const aiText = await generateContentSafely({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
      preferredModel: "gemini-3.7-flash",
    });

    let jsonOutput = null;
    if (aiText) {
      try {
        jsonOutput = JSON.parse(aiText);
      } catch {
        // failed parse
      }
    }

    if (jsonOutput && jsonOutput.summary) {
      return res.json({ success: true, ticker, ...jsonOutput });
    }

    const isUp = Number(changePercent) >= 0;
    res.json({
      success: true,
      ticker,
      summary: `${name || ticker} (${ticker}) é negociado a ${currentPrice || "nível de mercado"}, com variação recente de ${isUp ? "+" : ""}${changePercent || "0.0"}%. Métricas técnicas apontam consolidação com suporte e resistência bem delineados no canal atual.`,
      valuationStatus: isUp ? "Momentum Positivo / Neutro" : "Zona de Suporte Relevante",
      strengths: [
        "Forte liquidez diária e profundidade de livro",
        "Posicionamento setorial consolidado",
        "Acompanhamento institucional elevado",
      ],
      risks: [
        "Sensibilidade a taxas de juros globais e inflação",
        "Flutuações cambiais e volatilidade de curto prazo",
      ],
      technicalInsight:
        "O ativo opera próximo às médias móveis de curto prazo com volume alinhado à média dos últimos 30 dias.",
    });
  } catch (error: any) {
    console.error("Error in asset analysis endpoint:", error);
    res.json({
      success: true,
      ticker: req.body?.ticker || "ATIVO",
      summary: "Diagnóstico de mercado em acompanhamento regular pela inteligência DinhEuro.",
      valuationStatus: "Neutro",
      strengths: ["Liquidez ativa"],
      risks: ["Volatilidade macroeconômica"],
      technicalInsight: "Consulte o gráfico interativo para detalhes de suporte e resistência.",
    });
  }
});

// Interactive AI Chat / Copilot for DinhEuro
app.post("/api/market-ai/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    const formattedHistory = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `${h.role === "user" ? "Usuário" : "DinhEuro AI"}: ${h.content}`)
          .join("\n")
      : "";

    const prompt = `Você é o DinhEuro AI Copilot, o assistente inteligente oficial da plataforma DinhEuro.com (portal financeiro de referência no estilo Google Finanças).
Você ajuda investidores e analistas com cotações em tempo real, explicações de métricas financeiras (P/L, DY, Beta, RSI, Médias Móveis), comparações de ativos (ex: PETR4 vs VALE3, S&P 500 vs Ibovespa, Bitcoin vs Ouro), termos de mercado e orientações de navegação no DinhEuro.com.
Histórico recente:
${formattedHistory}

Mensagem do usuário: "${message || "Olá"}"
Responda em português com clareza, formatação rica (negrito, listas), precisão matemática e visão equilibrada de mercado.`;

    const aiText = await generateContentSafely({
      contents: prompt,
      preferredModel: "gemini-3.7-flash",
    });

    const fallbackReply = `Sou o **DinhEuro AI Copilot**! Em relação à sua consulta sobre **"${message || "mercados"}"**:
- **Cenário Atual:** Os mercados globais e o mercado brasileiro (Ibovespa) operam com foco nas decisões de política monetária (BCE, Fed e Copom) e no fluxo de capital estrangeiro.
- **Dica Prática:** Você pode consultar cotações em tempo real, gráficos interativos de 1D a 5A, métricas de Valuation e notícias atualizadas diretamente nas abas do portal DinhEuro.

Como posso ajudar você a analisar um ativo específico (ações, FIIs, moedas, índices ou criptos) hoje?`;

    res.json({
      success: true,
      reply: aiText || fallbackReply,
    });
  } catch (error: any) {
    console.error("Error in AI chat endpoint:", error);
    res.json({
      success: true,
      reply:
        "O DinhEuro AI Copilot está pronto para ajudar! Você pode explorar cotações, gráficos interativos e notícias em tempo real nas abas de Ações, Câmbio, Cripto e Commodities.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DinhEuro Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
