import { PriceData } from '@/types';

// ============================================
// Price fetching utilities
// ============================================

// Cache for exchange rate
let cachedExchangeRate: { rate: number; timestamp: number } | null = null;
const EXCHANGE_RATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache for prices
const priceCache = new Map<string, { data: PriceData; timestamp: number }>();
const PRICE_CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Fetch IDR/USD exchange rate — tries multiple APIs with fallback
 */
export async function getExchangeRate(): Promise<number> {
  if (cachedExchangeRate && Date.now() - cachedExchangeRate.timestamp < EXCHANGE_RATE_CACHE_TTL) {
    return cachedExchangeRate.rate;
  }

  const FALLBACK_RATE = 16500;
  const apis = [
    {
      url: 'https://api.frankfurter.app/latest?from=USD&to=IDR',
      parse: (data: Record<string, unknown>) => (data.rates as Record<string, number>)?.IDR,
    },
    {
      url: 'https://open.er-api.com/v6/latest/USD',
      parse: (data: Record<string, unknown>) => (data.rates as Record<string, number>)?.IDR,
    },
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(api.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      const rate = api.parse(data);

      if (rate && rate > 0) {
        cachedExchangeRate = { rate, timestamp: Date.now() };
        return rate;
      }
    } catch {
      // Try next API
    }
  }

  console.warn('All exchange rate APIs failed, using fallback rate:', FALLBACK_RATE);
  cachedExchangeRate = { rate: FALLBACK_RATE, timestamp: Date.now() };
  return FALLBACK_RATE;
}

/**
 * Fetch crypto prices from CoinGecko API
 */
export async function getCryptoPrices(ids: string[]): Promise<Record<string, PriceData>> {
  if (ids.length === 0) return {};

  const result: Record<string, PriceData> = {};

  // Check cache first
  const uncachedIds: string[] = [];
  for (const id of ids) {
    const cached = priceCache.get(`crypto:${id}`);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
      result[id] = cached.data;
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) return result;

  try {
    const idsParam = uncachedIds.join(',');
    const res = await fetch(
      `/api/crypto-price?ids=${encodeURIComponent(idsParam)}&vs_currencies=idr,usd&include_24hr_change=true`
    );

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`Crypto price proxy returned ${res.status}:`, text);
      // Skip processing uncached ids to avoid corrupt data
      return result;
    }

    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      console.error('Crypto price proxy returned non-JSON response:', text);
      return result;
    }

    const data = await res.json();

    for (const id of uncachedIds) {
      if (data[id]) {
        const priceData: PriceData = {
          price_idr: data[id].idr ?? 0,
          price_usd: data[id].usd ?? 0,
          change_24h: data[id].idr_24h_change ?? 0,
          market_cap: data[id].idr_market_cap,
          volume_24h: data[id].idr_24h_vol,
        };
        result[id] = priceData;
        priceCache.set(`crypto:${id}`, { data: priceData, timestamp: Date.now() });
      }
    }
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
  }

  return result;
}

/**
 * Fetch IDX stock prices via local API proxy (avoids CORS)
 */
export async function getStockPrices(tickers: string[]): Promise<Record<string, PriceData>> {
  if (tickers.length === 0) return {};

  const result: Record<string, PriceData> = {};
  const exchangeRate = await getExchangeRate();

  for (const ticker of tickers) {
    const cached = priceCache.get(`stock:${ticker}`);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
      result[ticker] = cached.data;
      continue;
    }

    try {
      const res = await fetch(`/api/stock-price?ticker=${encodeURIComponent(ticker)}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`Stock price proxy returned ${res.status}:`, text);
        continue;
      }
      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        console.error('Stock price proxy returned non-JSON response:', text);
        continue;
      }

      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;

      if (meta) {
        const currentPrice = meta.regularMarketPrice ?? 0;
        const previousClose = meta.chartPreviousClose ?? currentPrice;
        const change = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

        const priceData: PriceData = {
          price_idr: currentPrice,
          price_usd: currentPrice / exchangeRate,
          change_24h: change,
        };
        result[ticker] = priceData;
        priceCache.set(`stock:${ticker}`, { data: priceData, timestamp: Date.now() });
      }
    } catch (error) {
      console.error(`Failed to fetch stock price for ${ticker}:`, error);
    }
  }

  return result;
}

/**
 * Search crypto by name/symbol using CoinGecko
 */
export async function searchCrypto(query: string) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    return (data.coins || []).slice(0, 10).map((coin: { id: string; name: string; symbol: string }) => ({
      ticker: coin.symbol.toUpperCase(),   // ETH, BTC, XAUT
      name: coin.name,
      type: 'crypto' as const,
      coingecko_id: coin.id,               // ethereum, bitcoin, tether-gold
    }));
  } catch (error) {
    console.error('Failed to search crypto:', error);
    return [];
  }
}

/**
 * Search IDX stocks dynamically via Yahoo Finance (proxied through API route)
 */
export async function searchStocks(query: string) {
  try {
    const res = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Failed to search stocks:', error);
    return [];
  }
}

