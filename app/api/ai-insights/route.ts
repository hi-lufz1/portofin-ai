import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { portfolioContext, lang } = await req.json();

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 503 }
      );
    }

    const langInstruction = lang === 'id'
      ? 'Respond in Indonesian (Bahasa Indonesia).'
      : 'Respond in English.';

    const systemPrompt = `You are Portofin AI, a portfolio analysis engine. Given portfolio data, generate exactly 3 concise insights as a JSON array.

Each insight must have:
- "icon": one emoji (📊, 📈, ⚠️, 💡, 🎯, 🔄, 📉, 🏆, 💰, 🔍)
- "title": short title (max 6 words)
- "body": 1-2 sentence insight (max 40 words)
- "type": "positive", "warning", or "neutral"

${langInstruction}

Analyze: diversification, risk concentration, performance trends, and opportunities.
Output ONLY valid JSON array, no markdown, no extra text.`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://portofin.vercel.app',
        'X-Title': 'Portofin AI Insights',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Portfolio data:\n${portfolioContext}` },
        ],
        max_tokens: 600,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '[]';

    // Clean potential markdown wrapping
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const insights = JSON.parse(content);
      return NextResponse.json({ insights });
    } catch {
      return NextResponse.json({ insights: [] });
    }
  } catch (error) {
    console.error('AI Insights error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
