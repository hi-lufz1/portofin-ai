import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api-security';

const IDS_REGEX = /^[a-z0-9,-]{1,500}$/i;
const ALLOWED_VS_CURRENCIES = new Set(['idr', 'usd']);

/**
 * Proxy endpoint for CoinGecko API to avoid CORS issues.
 * Usage: /api/crypto-price?ids=ethereum,bitcoin&vs_currencies=idr,usd
 */
export async function GET(request: NextRequest) {
  const rateLimitRes = enforceRateLimit(request, 'crypto-price', 60, 60_000);
  if (rateLimitRes) return rateLimitRes;

  const rawIds = request.nextUrl.searchParams.get('ids')?.trim() || '';
  const rawVs = request.nextUrl.searchParams.get('vs_currencies') || 'idr,usd';
  const rawInclude24h = request.nextUrl.searchParams.get('include_24hr_change') || 'true';

  if (!rawIds || !IDS_REGEX.test(rawIds)) {
    return NextResponse.json({ error: 'Invalid or missing ids parameter' }, { status: 400 });
  }

  const idList = rawIds
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50);

  if (idList.length === 0) {
    return NextResponse.json({ error: 'Invalid ids parameter' }, { status: 400 });
  }

  const vsCurrencies = rawVs
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((c) => ALLOWED_VS_CURRENCIES.has(c));

  const safeVs = vsCurrencies.length > 0 ? vsCurrencies.join(',') : 'idr,usd';
  const safeInclude24h = rawInclude24h === 'false' ? 'false' : 'true';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const params = new URLSearchParams({
      ids: idList.join(','),
      vs_currencies: safeVs,
      include_24hr_change: safeInclude24h,
      include_market_cap: 'true',
      include_24hr_vol: 'true',
    });

    const url = `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Upstream crypto price service returned an error' },
        { status: res.status === 429 ? 429 : 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Crypto price proxy error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch crypto price' },
      { status: 502 }
    );
  }
}
