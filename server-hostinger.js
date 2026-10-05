import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS & Strict no-cache middleware for all real-time financial API endpoints
app.use("/api", (_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control, Pragma, X-Requested-With");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

let genAI = null;
function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return genAI;
}

async function generateContentSafely(options) {
  const ai = getGeminiClient();
  if (!ai) return null;
  const candidateModels = [
    options.preferredModel || "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      if (response?.text) return response.text;
    } catch (err) {
      console.warn(`[Gemini Hostinger] Model ${model} warning:`, err?.message);
    }
  }
  return null;
}

// Market Quotes Engine (Hostinger Multi-Provider)
let quotesCache = { timestamp: 0, data: {} };

async function fetchAwesomeApiRates() {
  try {
    const timestamp = Date.now();
    const res = await fetch(`https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL,JPY-BRL,BTC-BRL,ETH-BRL,EUR-USD?t=${timestamp}`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json;
  } catch {
    return null;
  }
}

app.get("/api/market/quotes", async (req, res) => {
  try {
    const now = Date.now();
    if (quotesCache.timestamp > 0 && now - quotesCache.timestamp < 10000 && Object.keys(quotesCache.data).length > 0) {
      return res.json({ success: true, count: Object.keys(quotesCache.data).length, timestamp: new Date().toISOString(), quotes: quotesCache.data });
    }

    const fxData = await fetchAwesomeApiRates();
    const quotes = {};

    if (fxData) {
      if (fxData.USDBRL) {
        const bid = Number(fxData.USDBRL.bid || 5.1866);
        const pct = Number(fxData.USDBRL.pctChange || 0);
        quotes["usd-brl"] = { id: "usd-brl", ticker: "USD/BRL", name: "Dólar Comercial", price: bid, change: Number(fxData.USDBRL.varBid || 0), changePercent: pct, currency: "BRL", exchange: "FX", category: "Moedas", sparkline: [bid * 0.998, bid], lastUpdated: new Date().toISOString() };
      }
      if (fxData.EURBRL) {
        const bid = Number(fxData.EURBRL.bid || 5.9067);
        const pct = Number(fxData.EURBRL.pctChange || 0);
        quotes["eur-brl"] = { id: "eur-brl", ticker: "EUR/BRL", name: "Euro Comercial", price: bid, change: Number(fxData.EURBRL.varBid || 0), changePercent: pct, currency: "BRL", exchange: "FX", category: "Moedas", sparkline: [bid * 0.998, bid], lastUpdated: new Date().toISOString() };
      }
      if (fxData.GBPBRL) {
        const bid = Number(fxData.GBPBRL.bid || 6.9450);
        const pct = Number(fxData.GBPBRL.pctChange || 0);
        quotes["gbp-brl"] = { id: "gbp-brl", ticker: "GBP/BRL", name: "Libra Esterlina", price: bid, change: Number(fxData.GBPBRL.varBid || 0), changePercent: pct, currency: "BRL", exchange: "FX", category: "Moedas", sparkline: [bid * 0.998, bid], lastUpdated: new Date().toISOString() };
      }
      if (fxData.JPYBRL) {
        const bid = Number(fxData.JPYBRL.bid || 0.0345);
        const pct = Number(fxData.JPYBRL.pctChange || 0);
        quotes["jpy-brl"] = { id: "jpy-brl", ticker: "JPY/BRL", name: "Iene Japonês", price: bid, change: Number(fxData.JPYBRL.varBid || 0), changePercent: pct, currency: "BRL", exchange: "FX", category: "Moedas", sparkline: [bid * 0.998, bid], lastUpdated: new Date().toISOString() };
      }
      if (fxData.BTCBRL) {
        const bid = Number(fxData.BTCBRL.bid || 542800);
        const pct = Number(fxData.BTCBRL.pctChange || 0);
        quotes["bitcoin"] = { id: "bitcoin", ticker: "BTC/BRL", name: "Bitcoin", price: bid, change: Number(fxData.BTCBRL.varBid || 0), changePercent: pct, currency: "BRL", exchange: "Cripto", category: "Criptomoedas", sparkline: [bid * 0.995, bid], lastUpdated: new Date().toISOString() };
      }
      if (fxData.ETHBRL) {
        const bid = Number(fxData.ETHBRL.bid || 16450);
        const pct = Number(fxData.ETHBRL.pctChange || 0);
        quotes["ether"] = { id: "ether", ticker: "ETH/BRL", name: "Ether (Ethereum)", price: bid, change: Number(fxData.ETHBRL.varBid || 0), changePercent: pct, currency: "BRL", exchange: "Cripto", category: "Criptomoedas", sparkline: [bid * 0.995, bid], lastUpdated: new Date().toISOString() };
      }
    }

    quotesCache = { timestamp: Date.now(), data: quotes };
    res.json({ success: true, count: Object.keys(quotes).length, timestamp: new Date().toISOString(), quotes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: "production", service: "DinhEuro Hostinger Engine", timestamp: new Date().toISOString() });
});

// AI endpoints
app.post("/api/market-ai/summary", async (req, res) => {
  try {
    const { region, topic } = req.body;
    const prompt = `Você é o analista-chefe do portal DinhEuro.com. Sintetize o mercado de "${region || "Global"}" no tema "${topic || "Geral"}".`;
    const aiText = await generateContentSafely({ contents: prompt });
    res.json({
      success: true,
      region,
      topic,
      analysis: aiText || "Mercados globais operam com foco nas decisões de política monetária e balanços corporativos.",
      sources: ["DinhEuro Intelligence AI"],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post("/api/market-ai/asset-analysis", async (req, res) => {
  try {
    const { ticker, name, currentPrice, changePercent } = req.body;
    const prompt = `Faça um diagnóstico conciso para o ativo ${name} (${ticker}) com preço atual de ${currentPrice} (${changePercent}%).`;
    const aiText = await generateContentSafely({ contents: prompt });
    res.json({
      success: true,
      summary: aiText || `${name} (${ticker}) apresenta liquidez ativa no pregão.`,
      valuationStatus: (changePercent || 0) >= 0 ? "Momentum Positivo" : "Zona de Suporte",
      strengths: ["Liquidez diária relevante", "Acompanhamento institucional"],
      risks: ["Volatilidade de curto prazo", "Sensibilidade macroeconômica"],
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Static assets
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get("*", (_req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("DinhEuro Hostinger Production Ready.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DinhEuro Hostinger Server listening on port ${PORT}`);
});
