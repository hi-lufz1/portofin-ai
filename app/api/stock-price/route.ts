import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api-security';

const TICKER_REGEX = /^[A-Za-z0-9.^=-]{1,15}$/;

/**
 * Proxy endpoint for Yahoo Finance API to avoid CORS issues.
 * Usage: /api/stock-price?ticker=BBCA
 */
export async function GET(request: NextRequest) {
  const rateLimitRes = enforceRateLimit(request, 'stock-price', 120, 60_000);
  if (rateLimitRes) return rateLimitRes;

  const rawTicker = request.nextUrl.searchParams.get('ticker')?.trim() || '';

  if (!rawTicker || !TICKER_REGEX.test(rawTicker)) {
    return NextResponse.json({ error: 'Invalid or missing ticker parameter' }, { status: 400 });
  }

  const upperTicker = rawTicker.toUpperCase();
  const yahooTicker = upperTicker.includes('.JK') ? upperTicker : `${upperTicker}.JK`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=2d`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Upstream stock price service returned an error' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Stock price proxy error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to fetch stock price' },
      { status: 502 }
    );
  }
}
