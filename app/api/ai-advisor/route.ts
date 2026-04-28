import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are Portofin AI Advisor, an intelligent financial portfolio assistant for Indonesian investors. You analyze stock (IDX) and cryptocurrency portfolios.

Your capabilities:
1. **Portfolio Analysis**: Evaluate asset allocation, diversification, and risk exposure
2. **Investment Insights**: Provide data-driven observations about portfolio performance
3. **Market Context**: Discuss trends relevant to held assets
4. **Risk Assessment**: Identify concentration risks and suggest improvements
5. **Strategy Suggestions**: Offer general investment strategy considerations

Guidelines:
- Respond in the same language as the user (Indonesian or English)
- Be concise but thorough — use bullet points and structured formatting
- Always include disclaimers that this is not financial advice
- Reference specific portfolio data when available
- Use IDR formatting for Indonesian stocks, USD for crypto
- Be encouraging but honest about risks
- Use emojis sparingly for readability (📊 📈 ⚠️ 💡)

You are embedded in Portofin, a portfolio tracker for IDX stocks and crypto. The user's portfolio data will be provided as context.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, portfolioContext } = await req.json();

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI Advisor not configured. Please set OPENROUTER_API_KEY in environment variables.' },
        { status: 503 }
      );
    }

    // Build context-aware system message
    let systemMessage = SYSTEM_PROMPT;
    if (portfolioContext) {
      systemMessage += `\n\n--- USER'S CURRENT PORTFOLIO DATA ---\n${portfolioContext}\n--- END PORTFOLIO DATA ---`;
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://portofin.vercel.app',
        'X-Title': 'Portofin AI Advisor',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages,
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', response.status, errorData);
      
      // Return more helpful error messages
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY environment variable.' },
          { status: 401 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'OpenRouter API rate limit exceeded. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response from AI.';

    return NextResponse.json({ content });
  } catch (error) {
    console.error('AI Advisor error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request.' },
      { status: 500 }
    );
  }
}
