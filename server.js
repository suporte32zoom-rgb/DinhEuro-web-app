import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import JSZip from "jszip";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Lazy-initialize Gemini AI client safely
let genAI = null;
function getGeminiClient() {
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
async function generateContentSafely(options) {
  const ai = getGeminiClient();
  if (!ai) return null;

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
      } catch (err) {
        const isTransient =
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes("503") ||
          err?.message?.includes("UNAVAILABLE") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("RESOURCE_EXHAUSTED");

        console.warn(`[Gemini Engine] Model ${model} attempt ${attempt} warning:`, err?.message || err);

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

const ASSET_REGISTRY = {
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

const quotesCache = {
  timestamp: 0,
  data: {},
};

async function fetchYahooQuote(symbol) {
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
    const closes = (quote?.close || []).filter((v) => typeof v === "number" && !isNaN(v));

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

async function fetchCoinGeckoCrypto() {
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

async function updateAllQuotes() {
  const now = Date.now();
  if (quotesCache.timestamp > 0 && now - quotesCache.timestamp < 10000 && Object.keys(quotesCache.data).length > 0) {
    return quotesCache.data;
  }

  const cryptoData = await fetchCoinGeckoCrypto();
  const entries = Object.entries(ASSET_REGISTRY);

  const chunkSize = 10;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async ([id, reg]) => {
        try {
          let price = reg.basePrice;
          let prevClose = reg.basePrice;
          let sparkline = [reg.basePrice * 0.99, reg.basePrice];
          let open = reg.basePrice;
          let high = reg.basePrice * 1.01;
          let low = reg.basePrice * 0.99;
          let high52 = reg.basePrice * 1.25;
          let low52 = reg.basePrice * 0.8;
          let volumeStr = "R$ 450 Mi";

          if (reg.type === "crypto" && cryptoData && cryptoData[id]) {
            const cInfo = cryptoData[id];
            price = cInfo.price;
            const pct = cInfo.change24h;
            prevClose = price / (1 + pct / 100);
            sparkline = [prevClose, (prevClose + price) / 2, price];
            high = Math.max(price, prevClose) * 1.02;
            low = Math.min(price, prevClose) * 0.98;
          } else {
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
        } catch (err) {
          console.warn(`Failed quote for ${id}:`, err?.message);
        }
      })
    );
  }

  quotesCache.timestamp = Date.now();
  return quotesCache.data;
}

// API: Live Quotes
app.get("/api/market/quotes", async (_req, res) => {
  try {
    const quotes = await updateAllQuotes();
    res.json({
      success: true,
      count: Object.keys(quotes).length,
      timestamp: new Date().toISOString(),
      quotes,
    });
  } catch (error) {
    console.error("Error in /api/market/quotes:", error);
    res.status(500).json({ success: false, error: "Falha ao obter cotações em tempo real." });
  }
});

// API: Historical Chart
app.get("/api/market/chart", async (req, res) => {
  try {
    const ticker = String(req.query.ticker || "IBOV").toUpperCase();
    const period = String(req.query.period || "1D").toUpperCase();

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

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];
    const volumes = quotes.volume || [];

    const points = [];
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
  } catch (error) {
    console.error("Error in /api/market/chart:", error);
    res.status(500).json({ success: false, error: "Erro ao processar gráfico histórico." });
  }
});

// Helper: Calculate relative time in Portuguese
function getRelativeTimePt(dateStr) {
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

// API: Real-time News Feed
let newsCache = { timestamp: 0, items: [] };

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

    const allNews = [];
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

            if (rawTitle.includes(" - ")) {
              const parts = rawTitle.split(" - ");
              if (parts.length > 1) {
                sourceName = parts.pop() || sourceName;
                rawTitle = parts.join(" - ");
              }
            }

            const tickers = [];
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
        } catch (e) {
          console.warn("RSS feed fetch error:", e?.message);
        }
      })
    );

    if (allNews.length > 0) {
      newsCache = { timestamp: Date.now(), items: allNews };
      return res.json({ success: true, count: allNews.length, news: allNews });
    }

    res.json({ success: true, count: 0, news: [] });
  } catch (error) {
    console.error("Error in /api/market/news:", error);
    res.status(500).json({ success: false, error: "Erro ao carregar notícias em tempo real." });
  }
});

// API: Live Market Movers
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
  } catch (error) {
    console.error("Error in /api/market/movers:", error);
    res.status(500).json({ success: false, error: "Falha ao calcular destaques de mercado." });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "DinhEuro Financial Real-time Engine", timestamp: new Date().toISOString() });
});

// Serve compiled static assets from dist
const distPath = path.join(__dirname, "dist");
const publicPath = path.join(__dirname, "public");

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback SPA routing
app.get("*", (_req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>DinhEuro Finanças • Servidor Node.js Hostinger</title>
          <style>
            body { background: #0e1117; color: #e6edf3; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #30363d; border-radius: 16px; padding: 32px; max-width: 480px; text-align: center; }
            h1 { color: #00c853; font-size: 24px; margin-bottom: 8px; }
            p { color: #8b949e; font-size: 14px; line-height: 1.6; }
            code { background: #21262d; color: #58a6ff; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>DinhEuro Server Online</h1>
            <p>O servidor Node.js da Hostinger está ativo!</p>
            <p>Execute <code>npm run build</code> para gerar a pasta <code>dist/</code> da aplicação frontend.</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DinhEuro Hostinger Node.js Server running on port ${PORT}`);
});
