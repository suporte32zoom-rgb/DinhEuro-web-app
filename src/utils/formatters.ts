/**
 * DinhEuro Financial Formatters - Single Source of Truth Formatters
 * Formats stocks, indices, commodities, currencies and cryptos dynamically without hardcoded values
 */

const INDEX_IDS = new Set([
  "ibovespa",
  "igovernanca",
  "ibrx-brasil",
  "sp-latin-america",
  "sp-500",
  "nasdaq",
  "dow-jones",
  "russell-2000",
  "vix",
  "dax",
  "ftse-100",
  "cac-40",
  "ibex-35",
  "euro-stoxx-50",
  "nikkei-225",
  "sse-composite",
  "hang-seng",
  "bse-sensex",
  "nifty-50",
  "kospi",
]);

const INDEX_TICKERS = new Set([
  "IBOV",
  "IGCX",
  "IBRA",
  "S&P LATAM",
  ".SPLATA40",
  "S&P 500",
  "^GSPC",
  "NASDAQ",
  "^IXIC",
  "DOW JONES",
  ".DJI",
  "^DJI",
  "RUSSELL",
  "^RUT",
  "VIX",
  "^VIX",
  "DAX 40",
  "^GDAXI",
  "FTSE 100",
  "^FTSE",
  "CAC 40",
  "^FCHI",
  "IBEX 35",
  "^IBEX",
  "STOXX 50",
  "^STOXX50E",
  "NIKKEI 225",
  "^N225",
  "SSE COMP",
  "000001.SS",
  "HANG SENG",
  "^HSI",
  "SENSEX",
  "^BSESN",
  "NIFTY 50",
  "^NSEI",
  "KOSPI",
  "^KS11",
]);

export function isMarketIndex(id?: string, ticker?: string, name?: string): boolean {
  if (id && INDEX_IDS.has(id.toLowerCase())) return true;
  if (ticker && INDEX_TICKERS.has(ticker.toUpperCase())) return true;
  if (name && (name.toLowerCase().includes("índice") || name.toLowerCase().includes("index") || name.toLowerCase().includes("composite"))) return true;
  return false;
}

/**
 * Strict BRL currency formatting with exactly 2 decimal places (e.g. R$ -29.877,34 or R$ 14.500,00)
 */
export function formatCurrencyBRL(amount: number, showSign = false): string {
  if (typeof amount !== "number" || isNaN(amount)) return "R$ 0,00";

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (showSign) {
    if (isNegative) return `-R$ ${formatted}`;
    if (amount > 0) return `+R$ ${formatted}`;
    return `R$ ${formatted}`;
  }

  return isNegative ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

/**
 * Format Forex / Currency rate: 2 decimals in converter/summary, 4 decimals in technical quote
 */
export function formatForexRate(rate: number, precision: 2 | 4 = 2): string {
  if (typeof rate !== "number" || isNaN(rate)) return "--";
  return rate.toLocaleString("pt-BR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * Format Index Points in pt-BR standard (e.g. 136.452 pts)
 */
export function formatPoints(points: number): string {
  if (typeof points !== "number" || isNaN(points)) return "-- pts";
  const decimals = points < 100 ? 2 : 0;
  return `${points.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} pts`;
}

/**
 * Dynamic price formatter based on asset category & market conventions
 */
export function formatAssetDisplayPrice(
  price: number | undefined | null,
  currency: string = "BRL",
  id?: string,
  ticker?: string,
  name?: string,
  technicalDetail = false
): string {
  if (price === undefined || price === null || typeof price !== "number" || isNaN(price) || price === 0) {
    return "--";
  }

  // 1. Market Indices -> Points (pts)
  if (isMarketIndex(id, ticker, name)) {
    return formatPoints(price);
  }

  // 2. Forex / Currency pairs
  const isForex = ticker?.includes("/") || id?.includes("usd-brl") || id?.includes("eur-brl") || id?.includes("gbp-brl") || id?.includes("jpy-brl") || id?.includes("usd-eur");
  if (isForex) {
    const decimals = technicalDetail ? 4 : price < 1 ? 4 : 2;
    return `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }

  // 3. Cryptoassets
  if (ticker === "BTC" || id === "bitcoin") {
    return currency === "BRL"
      ? `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `US$ ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // 4. Standard Currencies
  if (currency === "BRL") {
    return `R$ ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === "USD") {
    return `US$ ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === "EUR") {
    return `€ ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === "GBP") {
    return `£ ${price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === "JPY") {
    return `¥ ${price.toLocaleString("ja-JP", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  return price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
