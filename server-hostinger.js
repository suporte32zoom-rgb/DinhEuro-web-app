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

// Strict no-cache middleware for all real-time financial API endpoints
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
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

// Market Quotes Engine
const quotesCache = { timestamp: 0, data: {} };

app.get("/api/market/quotes", async (_req, res) => {
  try {
    const now = Date.now();
    if (quotesCache.timestamp > 0 && now - quotesCache.timestamp < 10000 && Object.keys(quotesCache.data).length > 0) {
      return res.json({ success: true, count: Object.keys(quotesCache.data).length, quotes: quotesCache.data });
    }
    // Forward quotes
    const response = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=1d&interval=15m", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await response.json();
    quotesCache.timestamp = Date.now();
    res.json({ success: true, timestamp: new Date().toISOString(), quotes: quotesCache.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: "production", service: "DinhEuro Hostinger Engine" });
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
