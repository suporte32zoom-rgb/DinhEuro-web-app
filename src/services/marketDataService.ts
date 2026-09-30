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
 * Fetch real-time quotes for all markets
 */
export async function fetchLiveQuotes(): Promise<Record<string, LiveQuotePayload> | null> {
  try {
    const res = await fetch("/api/market/quotes");
    if (!res.ok) return null;
    const data: LiveMarketResponse = await res.json();
    if (data.success && data.quotes) {
      return data.quotes;
    }
    return null;
  } catch (error) {
    console.warn("[MarketDataService] Failed to fetch live quotes:", error);
    return null;
  }
}

/**
 * Fetch real historical candle/chart data for an asset & period
 */
export async function fetchLiveChart(
  ticker: string,
  period: ChartPeriod
): Promise<HistoricalPoint[] | null> {
  try {
    const res = await fetch(`/api/market/chart?ticker=${encodeURIComponent(ticker)}&period=${encodeURIComponent(period)}`);
    if (!res.ok) return null;
    const data: LiveChartResponse = await res.json();
    if (data.success && Array.isArray(data.points) && data.points.length > 0) {
      return data.points;
    }
    return null;
  } catch (error) {
    console.warn(`[MarketDataService] Failed chart for ${ticker} (${period}):`, error);
    return null;
  }
}

/**
 * Fetch real-time verified financial news
 */
export async function fetchLiveNews(): Promise<NewsItem[] | null> {
  try {
    const res = await fetch("/api/market/news");
    if (!res.ok) return null;
    const data: LiveNewsResponse = await res.json();
    if (data.success && Array.isArray(data.news) && data.news.length > 0) {
      return data.news;
    }
    return null;
  } catch (error) {
    console.warn("[MarketDataService] Failed to fetch live news:", error);
    return null;
  }
}

/**
 * Fetch dynamically computed top market movers (B3 / Global)
 */
export async function fetchLiveMovers(): Promise<LiveMoversResponse["movers"] | null> {
  try {
    const res = await fetch("/api/market/movers");
    if (!res.ok) return null;
    const data: LiveMoversResponse = await res.json();
    if (data.success && data.movers) {
      return data.movers;
    }
    return null;
  } catch (error) {
    console.warn("[MarketDataService] Failed to fetch live movers:", error);
    return null;
  }
}
