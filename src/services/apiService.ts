/**
 * DinhEuro.com - Centralized Resilient Financial API Service
 * Arquitetura Multi-API com padrão Try/Catch, timeout de 5 segundos e persistência em localStorage.
 * 
 * Fontes:
 * - AwesomeAPI: Câmbio e Criptomoedas em tempo real (100% público, sem chave, CORS liberado)
 * - BRAPI: Cotações de Ações da B3 e Índice Ibovespa (^BVSP)
 * - Endpoints DinhEuro Server com fallback inteligente para Hostinger / GitHub Pages
 */

import { LiveQuotePayload } from "./marketDataService";
import { ALL_ASSETS } from "../data/mockMarketData";
import { Asset } from "../types/finance";

const TIMEOUT_MS = 5000;
const CACHE_KEY_QUOTES = "dinheuro_live_quotes_cache";
const CACHE_KEY_TIMESTAMP = "dinheuro_quotes_timestamp";

/**
 * Utilitário de requisição segura com Timeout de 5s e controle de Abort
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = TIMEOUT_MS
): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        ...options?.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[ApiService] HTTP ${res.status} para ${url}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.warn(`[ApiService] Requisição excedeu timeout de ${timeoutMs}ms para: ${url}`);
    } else {
      console.warn(`[ApiService] Falha de conexão com ${url}:`, error?.message);
    }
    return null;
  }
}

/**
 * 1. AwesomeAPI: Cotações de Câmbio e Criptomoedas em Tempo Real (CORS liberado e sem chave)
 */
export async function fetchAwesomeAPICurrencies(): Promise<Record<string, { price: number; changePct: number; high: number; low: number }> | null> {
  const url = `https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL,GBP-BRL,JPY-BRL,ETH-BRL?t=${Date.now()}`;
  const data = await safeFetch<any>(url, { method: "GET" }, 4500);

  if (!data || typeof data !== "object") return null;

  const result: Record<string, { price: number; changePct: number; high: number; low: number }> = {};

  const mapPair = (key: string, targetId: string) => {
    const item = data[key];
    if (item && item.bid) {
      const price = Number(item.bid);
      const changePct = Number(item.pctChange || 0);
      const high = Number(item.high || price * 1.01);
      const low = Number(item.low || price * 0.99);
      if (price > 0) {
        result[targetId] = { price, changePct, high, low };
      }
    }
  };

  mapPair("USDBRL", "usd-brl");
  mapPair("EURBRL", "eur-brl");
  mapPair("GBPBRL", "gbp-brl");
  mapPair("JPYBRL", "jpy-brl");
  mapPair("BTCBRL", "btc-brl");
  mapPair("ETHBRL", "eth-brl");

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * 2. BRAPI: Cotações de Ações da B3 e Índice Ibovespa
 */
export async function fetchBrapiStocks(): Promise<Record<string, { price: number; changePct: number; high: number; low: number; volume?: string }> | null> {
  const tickers = "%5EBVSP,PETR4,VALE3,ITUB4,BBAS3,B3SA3,MGLU3,WEGE3,PRIO3,EMBR3,EQTL3";
  const url = `https://brapi.dev/api/quote/${tickers}`;

  const data = await safeFetch<any>(url, { method: "GET" }, 4500);

  if (!data || !Array.isArray(data.results)) return null;

  const result: Record<string, { price: number; changePct: number; high: number; low: number; volume?: string }> = {};

  for (const item of data.results) {
    if (!item || !item.symbol) continue;
    const symbol = item.symbol.toUpperCase();
    const price = Number(item.regularMarketPrice || 0);
    const changePct = Number(item.regularMarketChangePercent || 0);
    const high = Number(item.regularMarketDayHigh || price * 1.01);
    const low = Number(item.regularMarketDayLow || price * 0.99);

    if (price > 0) {
      let id = item.symbol.toLowerCase();
      if (symbol === "^BVSP" || symbol === "%5EBVSP") id = "ibovespa";

      result[id] = {
        price,
        changePct,
        high,
        low,
        volume: item.regularMarketVolume ? String(item.regularMarketVolume) : undefined,
      };
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * 3. Recupera o último estado salvo em localStorage para renderização instantânea sem tela cinza
 */
export function getStoredQuotes(): Record<string, LiveQuotePayload> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_QUOTES);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Salva as cotações em localStorage
 */
export function persistQuotes(quotes: Record<string, LiveQuotePayload>) {
  try {
    localStorage.setItem(CACHE_KEY_QUOTES, JSON.stringify(quotes));
    localStorage.setItem(CACHE_KEY_TIMESTAMP, new Date().toISOString());
  } catch (e) {
    console.error("[ApiService] Falha ao salvar em localStorage:", e);
  }
}

/**
 * 4. Pipeline Mestre de Cotações:
 * Consulta primeiro o servidor `/api/market/quotes`. Se falhar (ex: Hostinger estático),
 * consulta AwesomeAPI e BRAPI diretamente do navegador, mesclando com o estado local.
 */
export async function getResilientMarketQuotes(): Promise<Record<string, LiveQuotePayload>> {
  let quotes: Record<string, LiveQuotePayload> = {};

  // A. Tenta primeiro a API do backend local (/api/market/quotes)
  const serverData = await safeFetch<{ success: boolean; quotes: Record<string, LiveQuotePayload> }>(
    `/api/market/quotes?t=${Date.now()}`,
    { method: "GET" },
    4000
  );

  if (serverData?.success && serverData.quotes && Object.keys(serverData.quotes).length > 0) {
    quotes = serverData.quotes;
    persistQuotes(quotes);
    return quotes;
  }

  // B. Se o backend não responder (ex: Deploy estático Hostinger), faz fallback para AwesomeAPI e BRAPI direto no cliente
  const [awesomeQuotes, brapiQuotes] = await Promise.all([
    fetchAwesomeAPICurrencies(),
    fetchBrapiStocks(),
  ]);

  // Carrega base salva ou default
  const stored = getStoredQuotes();
  if (stored && Object.keys(stored).length > 0) {
    quotes = { ...stored };
  } else {
    // Inicializa a partir de ALL_ASSETS
    for (const a of ALL_ASSETS) {
      quotes[a.id] = {
        id: a.id,
        ticker: a.ticker,
        name: a.name,
        price: a.price,
        change: a.change,
        changePercent: a.changePercent,
        currency: a.currency,
        exchange: a.exchange,
        category: a.category,
        sparkline: a.sparkline,
        high52w: a.metrics.high52w,
        low52w: a.metrics.low52w,
        open: a.metrics.open,
        high: a.metrics.high,
        low: a.metrics.low,
        volume: a.metrics.volume,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  // Mescla dados do AwesomeAPI
  if (awesomeQuotes) {
    for (const [id, q] of Object.entries(awesomeQuotes)) {
      if (quotes[id]) {
        const prevPrice = quotes[id].price;
        const change = q.price - (q.price / (1 + q.changePct / 100));
        quotes[id] = {
          ...quotes[id],
          price: q.price,
          change: Number(change.toFixed(4)),
          changePercent: q.changePct,
          high: q.high,
          low: q.low,
          lastUpdated: new Date().toISOString(),
        };
      }
    }
  }

  // Mescla dados do BRAPI
  if (brapiQuotes) {
    for (const [id, q] of Object.entries(brapiQuotes)) {
      if (quotes[id]) {
        const change = q.price - (q.price / (1 + q.changePct / 100));
        quotes[id] = {
          ...quotes[id],
          price: q.price,
          change: Number(change.toFixed(2)),
          changePercent: q.changePct,
          high: q.high,
          low: q.low,
          volume: q.volume || quotes[id].volume,
          lastUpdated: new Date().toISOString(),
        };
      }
    }
  }

  persistQuotes(quotes);
  return quotes;
}
