import { Asset, ChartPeriod, HistoricalPoint, MarketMoverItem, NewsItem, RegionalTab } from "../types/finance";

export interface LiveQuotePayload {
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

export interface LiveMarketResponse {
  success: boolean;
  count: number;
  timestamp: string;
  quotes: Record<string, LiveQuotePayload>;
}

export interface LiveMoversResponse {
  success: boolean;
  timestamp: string;
  movers: {
    mostActive: MarketMoverItem[];
    topGainers: MarketMoverItem[];
    topLosers: MarketMoverItem[];
  };
}

export interface LiveNewsResponse {
  success: boolean;
  count: number;
  news: NewsItem[];
}

export interface LiveChartResponse {
  success: boolean;
  ticker: string;
  period: ChartPeriod;
  count: number;
  points: HistoricalPoint[];
}

/**
 * Resolves the API Base URL dynamically (supports dev, local server, and Hostinger HTTPS production)
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/$/, "");
  }
  return "";
}

/**
 * Resilient fetch wrapper with CORS support, timeout controller, and automatic background retries
 */
async function fetchWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 2,
  backoffMs = 500
): Promise<T | null> {
  const baseUrl = getApiBaseUrl();
  const timestamp = Date.now();
  const separator = endpoint.includes("?") ? "&" : "?";
  const fullUrl = `${baseUrl}${endpoint}${separator}t=${timestamp}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        cache: "no-store",
        mode: "cors",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Accept: "application/json",
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[MarketAPI] HTTP ${res.status} on ${endpoint} (tentativa ${attempt + 1}/${retries + 1})`);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
          continue;
        }
        return null;
      }

      const data = await res.json();
      return data as T;
    } catch (err: any) {
      console.warn(
        `[MarketAPI] Falha de conexão/CORS em ${endpoint}: ${err?.message || "Erro de rede"} (tentativa ${attempt + 1}/${retries + 1})`
      );

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
      }
    }
  }

  return null;
}

/**
 * Fetch real-time quotes for all markets with automatic retry and CORS resilience
 */
export async function fetchLiveQuotes(): Promise<Record<string, LiveQuotePayload> | null> {
  const data = await fetchWithRetry<LiveMarketResponse>("/api/market/quotes", {}, 2, 400);
  if (data && data.success && data.quotes) {
    return data.quotes;
  }
  return null;
}

/**
 * Fetch real historical candle/chart data for an asset & period
 */
export async function fetchLiveChart(
  ticker: string,
  period: ChartPeriod
): Promise<HistoricalPoint[] | null> {
  const data = await fetchWithRetry<LiveChartResponse>(
    `/api/market/chart?ticker=${encodeURIComponent(ticker)}&period=${encodeURIComponent(period)}`,
    {},
    2,
    500
  );
  if (data && data.success && Array.isArray(data.points) && data.points.length > 0) {
    return data.points;
  }
  return null;
}

/**
 * Fetch real-time verified financial news
 */
export async function fetchLiveNews(): Promise<NewsItem[] | null> {
  const data = await fetchWithRetry<LiveNewsResponse>("/api/market/news", {}, 2, 400);
  if (data && data.success && Array.isArray(data.news) && data.news.length > 0) {
    return data.news;
  }
  return null;
}

/**
 * Fetch dynamically computed top market movers (B3 / Global)
 */
export async function fetchLiveMovers(): Promise<LiveMoversResponse["movers"] | null> {
  const data = await fetchWithRetry<LiveMoversResponse>("/api/market/movers", {}, 2, 400);
  if (data && data.success && data.movers) {
    return data.movers;
  }
  return null;
}
