import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface PersonaRequest {
  portfolioContext: string;
  lang: string;
}

export async function POST(req: NextRequest) {
  try {
    const { portfolioContext, lang } = await req.json() as PersonaRequest;

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 503 }
      );
    }

    const langInstruction = lang === 'id'
      ? 'Respond in Indonesian (Bahasa Indonesia).'
      : 'Respond in English.';

    const systemPrompt = `You are an expert behavioral finance psychologist. Your job is to analyze the user's investment portfolio and assign them a fun, highly personalized "Investor Persona" based on their asset allocation, diversification, and apparent risk tolerance.

CRITICAL RULE: DO NOT GIVE FINANCIAL ADVICE. DO NOT RECOMMEND BUYING, SELLING, OR HOLDING SPECIFIC ASSETS. Your analysis must be strictly behavioral and descriptive.

Generate a JSON response with the following structure:
{
  "personaTitle": "A catchy, fun title for their investor archetype (e.g., 'The Crypto Degen', 'The Conservative Banker', 'The Tech Maximalist', 'The Balanced Strategist')",
  "icon": "A single emoji representing this persona",
  "description": "A 2-3 sentence humorous but insightful description of their investing personality based on the data.",
  "biases": [
    {
      "name": "Name of a behavioral bias observed (e.g., 'Home Country Bias', 'High-Risk Appetite', 'Concentration Risk', 'Diversification Lover')",
      "explanation": "1-2 sentences explaining why they have this bias based on their portfolio."
    }
  ]
}

${langInstruction}
Ensure the 'biases' array contains exactly 2 or 3 items. Output ONLY valid JSON, no markdown formatting.`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://portofin.vercel.app',
        'X-Title': 'Portofin AI Persona',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze my portfolio and generate my persona:\n\n${portfolioContext}` },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // Clean potential markdown wrapping
    const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const persona = JSON.parse(cleanedContent);
      return NextResponse.json({ persona });
    } catch (err) {
      console.error('Failed to parse persona:', err, cleanedContent);
      return NextResponse.json({ error: 'Invalid response format' }, { status: 502 });
    }
  } catch (error) {
    console.error('AI Persona error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
