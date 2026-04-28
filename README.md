# Portofin — AI-Powered Portfolio Tracker 🚀

<div align="center">
  <img src="public/logo.png" width="80" alt="Portofin Logo" />
  <h3>Smart portfolio tracking with AI-powered insights</h3>
  <p>Track Indonesian stocks (IDX) & cryptocurrency with real-time prices, AI analysis, and intelligent portfolio management.</p>
</div>

## 🌟 Features

### AI Integration (Core Feature)
- **AI Advisor Hub** — A dedicated command center (`/ai-advisor`) for intelligent analysis, keeping the main dashboard fast and focused purely on raw data tracking.
- **Portfolio Narrative** — An executive summary that tells the story of your portfolio's performance.
- **AI Briefing** — A deep-dive analytical report highlighting Top Risks, Opportunities, Predictions, and Action Recommendations.
- **AI Investor Persona** — A psychological behavioral profile generated from your actual investment patterns to uncover your implicit biases.
- **Interactive Chat & Rebalance Simulator** — Run custom “what-if” scenarios (e.g., "Simulate inflation effects") and use allocation sliders to get instant rebalancing feedback.
- **Lightning Fast & Resilient** — Powered by OpenAI's `gpt-4o-mini` via OpenRouter to ensure 100% uptime and instant insights.

### Portfolio Management
- **Multi-Portfolio Support** — Create and manage multiple portfolios
- **IDX Stocks & Crypto** — Track both Indonesian stocks and cryptocurrencies
- **Real-time Prices** — Live prices from Yahoo Finance (stocks) and CoinGecko (crypto)
- **Multi-currency** — View in IDR or USD with automatic conversion
- **Transaction History** — Full buy/sell transaction tracking with P/L
- **Asset Detail Pages** — Deep dive into individual holdings

### UI/UX
- **Bilingual (ID/EN)** — Full Indonesian and English support
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Modern Design** — Clean, minimal interface with smooth animations
- **Google OAuth** — One-click sign in with Google

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Vanilla CSS with design tokens |
| **Backend** | Supabase (Auth, Database) |
| **AI** | OpenRouter API (OpenAI GPT-4o Mini) |
| **Price Data** | CoinGecko API, Yahoo Finance |
| **Deployment** | Vercel |

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/portofin.git
   cd portofin/portofin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## 🎨 Branding

- **Primary Colors**: Navy (#0F172A), Emerald (#22C55E), Indigo (#6366F1)
- **Typography**: Inter (Google Fonts)
- **Design**: Minimal, clean, professional fintech aesthetic
- **AI Accent**: Indigo gradient for AI-related elements

## 📁 Project Structure

```
portofin/
├── app/
│   ├── ai-advisor/       # AI Advisor Command Center
│   ├── api/
│   │   ├── ai-advisor/   # AI chat & narrative API
│   │   ├── ai-briefing/  # AI briefing API
│   │   ├── ai-persona/   # AI investor persona API
│   │   ├── crypto-price/  # Crypto price proxy
│   │   ├── stock-price/   # Stock price proxy
│   │   └── stock-search/  # Stock search proxy
│   ├── dashboard/        # Main dashboard
│   ├── login/            # Auth pages
│   └── transactions/     # Transaction history
├── components/           # Reusable components
├── contexts/             # React contexts (Auth, Portfolio, etc.)
├── lib/                  # Utilities (prices, translations)
├── types/                # TypeScript types
└── public/               # Static assets (logo, etc.)
```

## 📜 License

Built by Latif Fauzi
