'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Insight {
  icon: string;
  title: string;
  body: string;
  type: 'positive' | 'warning' | 'neutral';
}

function buildPortfolioContext(
  holdings: ReturnType<typeof usePortfolio>['holdings'],
  summary: ReturnType<typeof usePortfolio>['summary'],
  formatCurrency: ReturnType<typeof useCurrency>['formatCurrency'],
) {
  if (holdings.length === 0) return '';

  const lines: string[] = [];
  lines.push(`Total Value: ${formatCurrency(summary.total_value)}`);
  lines.push(`Total Invested: ${formatCurrency(summary.total_invested)}`);
  lines.push(`Total P/L: ${formatCurrency(summary.total_pl)} (${summary.total_pl_pct.toFixed(2)}%)`);
  lines.push(`Crypto: ${formatCurrency(summary.crypto_value)}, Stocks: ${formatCurrency(summary.stock_value)}`);
  lines.push('Holdings:');
  holdings.forEach((h) => {
    const pct = summary.total_value > 0 ? ((h.current_value / summary.total_value) * 100).toFixed(1) : '0';
    lines.push(`- ${h.name} (${h.ticker}, ${h.type}): Value ${formatCurrency(h.current_value)}, P/L ${h.profit_loss_pct.toFixed(2)}%, Weight ${pct}%`);
  });
  return lines.join('\n');
}

export default function AIInsightsCard() {
  const { holdings, summary, loading: portfolioLoading } = usePortfolio();
  const { formatCurrency } = useCurrency();
  const { t, lang } = useLanguage();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchInsights = useCallback(async () => {
    if (holdings.length === 0) return;
    setLoading(true);

    try {
      const portfolioContext = buildPortfolioContext(holdings, summary, formatCurrency);
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioContext, lang }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.insights) && data.insights.length > 0) {
          setInsights(data.insights);
        }
      }
    } catch (err) {
      console.warn('AI Insights fetch failed:', err);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [holdings, summary, formatCurrency, lang]);

  // Auto-fetch once when portfolio data is loaded
  useEffect(() => {
    if (!portfolioLoading && holdings.length > 0 && !fetched) {
      fetchInsights();
    }
  }, [portfolioLoading, holdings.length, fetched, fetchInsights]);

  // Don't render if no holdings
  if (holdings.length === 0) return null;

  return (
    <div className="ai-insights-card" id="ai-insights">
      <div className="ai-insights-header">
        <div className="ai-insights-title-wrap">
          <Sparkles size={16} className="ai-insights-icon" />
          <span className="section-title">{t('ai.insightsTitle')}</span>
          <span className="ai-badge">AI</span>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="btn-ghost ai-refresh-btn"
          title={t('ai.refresh')}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="ai-insights-body">
        {loading && insights.length === 0 ? (
          <div className="ai-insights-loading">
            <div className="ai-loading-shimmer" />
            <div className="ai-loading-shimmer short" />
            <div className="ai-loading-shimmer" />
          </div>
        ) : insights.length > 0 ? (
          <div className="ai-insights-list">
            {insights.map((insight, idx) => (
              <div key={idx} className={`ai-insight-item ${insight.type}`}>
                <span className="ai-insight-emoji">{insight.icon}</span>
                <div className="ai-insight-content">
                  <span className="ai-insight-title">{insight.title}</span>
                  <span className="ai-insight-body">{insight.body}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-insights-empty">
            <Sparkles size={20} />
            <span>{t('ai.insightsEmpty')}</span>
          </div>
        )}
      </div>

      <Link href="/ai-advisor" className="ai-insights-cta" id="ai-advisor-link">
        <Sparkles size={14} />
        <span>{t('ai.chatCta')}</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
