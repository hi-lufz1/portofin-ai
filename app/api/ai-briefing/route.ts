import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface BriefingRequest {
  portfolioContext: string;
  lang: string;
}

interface Briefing {
  headline: string;
  summary: string;
  topRisks: Array<{ icon: string; title: string; description: string }>;
  topOpportunities: Array<{ icon: string; title: string; description: string }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    estimatedImpact: string;
  }>;
  predictions: Array<{
    timeframe: string;
    prediction: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  nextSteps: string[];
  disclaimer: string;
}

export async function POST(req: NextRequest) {
  try {
    const { portfolioContext, lang } = await req.json() as BriefingRequest;

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 503 }
      );
    }

    const langInstruction = lang === 'id'
      ? 'Respond in Indonesian (Bahasa Indonesia) using natural, conversational tone.'
      : 'Respond in English using natural, conversational tone.';

    // CRITICAL: Comprehensive disclaimer in system prompt
    const systemPrompt = `⚠️ CRITICAL DISCLAIMER: You are an AI analysis tool, NOT a licensed financial advisor. Your analysis is educational only.

You MUST include these exact points in your response:
- This is NOT professional investment advice
- Investor must conduct independent research
- Past performance ≠ future results
- Cryptocurrency and stocks have high volatility/risk
- Investor should consult licensed financial advisor before trading
- AI can make errors - verify analysis independently
- All recommendations are based on historical data only

---

You are Portofin AI Analyst, a portfolio analysis engine for Indonesian investors. Generate a comprehensive portfolio briefing based on ACTUAL portfolio data provided.

IMPORTANT RULES:
1. Be conservative - prefer "consider" over "should" or "must"
2. Always qualify statements with confidence levels
3. Never guarantee outcomes or specific prices
4. Emphasize risk alongside opportunities
5. Acknowledge limitations of AI analysis
6. For any controversial/aggressive recommendations, add extra disclaimer

Generate portfolio briefing with these sections:

1. HEADLINE: Punchy summary of portfolio situation (max 10 words)
2. SUMMARY: 2-3 sentence overview, include risk acknowledgment
3. TOP RISKS: 3 specific risks with emoji icons - be thorough here
4. TOP OPPORTUNITIES: 2-3 opportunities with cautionary notes
5. RECOMMENDATIONS: 3-5 actions with priority levels
   - Clear action
   - Why (reasoning)
   - Expected impact with confidence caveat
6. PREDICTIONS: 2-3 forecasts (24h, 7d, 30d) with confidence & uncertainty
7. NEXT STEPS: 2-3 monitoring items
8. DISCLAIMER: Explicit statement this is AI analysis, not advice

${langInstruction}

Format ONLY as valid JSON:
{
  "headline": "string",
  "summary": "string",
  "topRisks": [{"icon": "emoji", "title": "string", "description": "string - INCLUDE RISK WARNINGS"}],
  "topOpportunities": [{"icon": "emoji", "title": "string", "description": "string - INCLUDE CAVEATS"}],
  "recommendations": [{"priority": "high|medium|low", "action": "string", "reasoning": "string", "estimatedImpact": "string - with caveats"}],
  "predictions": [{"timeframe": "string", "prediction": "string", "confidence": "high|medium|low", "uncertainty": "string"}],
  "nextSteps": ["string"],
  "disclaimer": "Explicit AI analysis disclaimer"
}

CRITICAL: Reference SPECIFIC portfolio data provided. Be specific about percentages, tickers, values.
CRITICAL: Every recommendation must acknowledge it's based on historical data only.
CRITICAL: Emphasize investor responsibility for independent verification.`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://portofin-opal.vercel.app',
        'X-Title': 'Portofin AI Briefing',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate briefing for this portfolio:\n\n${portfolioContext}\n\nRemember: Educational analysis only, not financial advice.` },
        ],
        max_tokens: 2500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'AI configuration error - check API key' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Clean markdown wrapping
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const briefing = JSON.parse(cleanedContent) as Briefing;

      // Ensure disclaimer is present
      if (!briefing.disclaimer) {
        briefing.disclaimer = lang === 'id'
          ? '⚠️ DISCLAIMER: Ini adalah analisis AI untuk tujuan edukasi saja, BUKAN saran investasi profesional. Lakukan riset independen sebelum membuat keputusan. Performa masa lalu bukan jaminan hasil masa depan. Konsultasi dengan penasihat keuangan berlisensi sebelum bertransaksi.'
          : '⚠️ DISCLAIMER: This is AI analysis for educational purposes only, NOT professional investment advice. Conduct independent research before making decisions. Past performance does not guarantee future results. Consult a licensed financial advisor before trading.';
      }

      return NextResponse.json({ briefing });
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', cleanedContent);
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('AI Briefing error:', error);
    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}
