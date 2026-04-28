import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for Yahoo Finance stock search.
 * Usage: /api/stock-search?q=CUAN
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&listsCount=0&quotesQueryId=tss_match_phrase_query`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    
    // Filter to only IDX stocks (.JK suffix) and map to our format
    const results = (data.quotes || [])
      .filter((q: { exchange?: string; symbol?: string; quoteType?: string }) => 
        q.symbol?.endsWith('.JK') || q.exchange === 'JKT'
      )
      .map((q: { symbol?: string; shortname?: string; longname?: string; exchange?: string }) => ({
        ticker: (q.symbol || '').replace('.JK', ''),
        name: q.shortname || q.longname || q.symbol || '',
        type: 'stock' as const,
        exchange: 'IDX',
      }))
      .slice(0, 10);

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('Stock search proxy error:', error);
    return NextResponse.json({ results: [] });
  }
}
