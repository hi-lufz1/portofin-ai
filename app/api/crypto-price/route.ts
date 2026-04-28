import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for CoinGecko API to avoid CORS issues.
 * Usage: /api/crypto-price?ids=ethereum,bitcoin&vs_currencies=idr,usd
 */
export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get('ids');
  const vs = request.nextUrl.searchParams.get('vs_currencies') || 'idr,usd';
  const include24h = request.nextUrl.searchParams.get('include_24hr_change') || 'true';

  if (!ids) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${vs}&include_24hr_change=${include24h}&include_market_cap=true&include_24hr_vol=true`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error(`Crypto price proxy error for ${ids}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto price' },
      { status: 502 }
    );
  }
}
