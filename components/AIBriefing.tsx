'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Clock,
  RefreshCw,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface Risk {
  icon: string;
  title: string;
  description: string;
}

interface Opportunity {
  icon: string;
  title: string;
  description: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reasoning: string;
  estimatedImpact: string;
}

interface Prediction {
  timeframe: string;
  prediction: string;
  confidence: 'high' | 'medium' | 'low';
}

interface Briefing {
  headline: string;
  summary: string;
  topRisks: Risk[];
  topOpportunities: Opportunity[];
  recommendations: Recommendation[];
  predictions: Prediction[];
  nextSteps: string[];
  disclaimer: string;
}

function buildPortfolioContext(
  holdings: ReturnType<typeof usePortfolio>['holdings'],
  summary: ReturnType<typeof usePortfolio>['summary'],
  formatCurrency: ReturnType<typeof useCurrency>['formatCurrency'],
) {
  if (holdings.length === 0) return '';

  const lines: string[] = [];
  lines.push(`Portfolio Overview:`);
  lines.push(`Total Value: ${formatCurrency(summary.total_value)}`);
  lines.push(`Total P/L: ${formatCurrency(summary.total_pl)} (${summary.total_pl_pct.toFixed(2)}%)`);
  lines.push(`Daily Change: ${formatCurrency(summary.daily_change)} (${summary.daily_change_pct.toFixed(2)}%)`);
  lines.push(`\nAsset Breakdown:`);
  lines.push(`Crypto Value: ${formatCurrency(summary.crypto_value)}`);
  lines.push(`Stock Value: ${formatCurrency(summary.stock_value)}`);
  lines.push(`\nTop Holdings:`);
  
  holdings
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 5)
    .forEach((h) => {
      const pct = summary.total_value > 0 ? ((h.current_value / summary.total_value) * 100).toFixed(1) : '0';
      lines.push(
        `${h.ticker} (${h.type}): ${pct}% portfolio, ` +
        `Value ${formatCurrency(h.current_value)}, ` +
        `P/L ${h.profit_loss_pct.toFixed(2)}%`
      );
    });

  return lines.join('\n');
}

export default function AIBriefing() {
  const { holdings, summary, loading: portfolioLoading } = usePortfolio();
  const { formatCurrency } = useCurrency();
  const { lang } = useLanguage();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generateBriefing = useCallback(async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const portfolioContext = buildPortfolioContext(holdings, summary, formatCurrency);
      const res = await fetch('/api/ai-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioContext, lang }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate briefing');
      }

      const data = await res.json();
      setBriefing(data.briefing);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Briefing error:', err);
      setError(lang === 'id' ? 'Gagal generate briefing' : 'Failed to generate briefing');
    } finally {
      setLoading(false);
    }
  }, [holdings, summary, formatCurrency, lang]);

  useEffect(() => {
    if (!portfolioLoading && holdings.length > 0 && !briefing) {
      generateBriefing();
    }
  }, [portfolioLoading, holdings.length, briefing, generateBriefing]);

  if (holdings.length === 0) {
    return null;
  }

  return (
    <div className="ai-briefing-container">
      {/* Header */}
      <div className="ai-briefing-header">
        <div className="ai-briefing-header-left">
          <Sparkles size={20} className="ai-briefing-icon" />
          <div>
            <h2 className="ai-briefing-title">{lang === 'id' ? 'Briefing Harian AI' : 'Daily AI Briefing'}</h2>
            {lastUpdated && (
              <p className="ai-briefing-timestamp">
                {lang === 'id' ? 'Diperbarui' : 'Updated'} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={generateBriefing}
          disabled={loading}
          className="ai-briefing-refresh"
          title={lang === 'id' ? 'Refresh briefing' : 'Refresh briefing'}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="ai-briefing-error">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {loading && !briefing && (
        <div className="ai-briefing-loading">
          <Loader2 size={20} className="spin" />
          <span>{lang === 'id' ? 'Menganalisis portofolio...' : 'Analyzing portfolio...'}</span>
        </div>
      )}

      {briefing && (
        <>
          {/* Headline & Summary */}
          <div className="ai-briefing-hero">
            <h3 className="ai-briefing-headline">{briefing.headline}</h3>
            <p className="ai-briefing-summary">{briefing.summary}</p>
          </div>

          {/* Risk & Opportunities Grid */}
          <div className="ai-briefing-grid">
            {/* Risks */}
            <div className="ai-briefing-section">
              <div className="ai-briefing-section-header">
                <AlertTriangle size={16} className="ai-briefing-section-icon warning" />
                <h4>{lang === 'id' ? 'Risiko Teratas' : 'Top Risks'}</h4>
              </div>
              <div className="ai-briefing-items">
                {briefing.topRisks.map((risk, idx) => (
                  <div key={idx} className="ai-briefing-item risk">
                    <span className="ai-briefing-item-icon">{risk.icon}</span>
                    <div className="ai-briefing-item-content">
                      <span className="ai-briefing-item-title">{risk.title}</span>
                      <span className="ai-briefing-item-desc">{risk.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            <div className="ai-briefing-section">
              <div className="ai-briefing-section-header">
                <TrendingUp size={16} className="ai-briefing-section-icon opportunity" />
                <h4>{lang === 'id' ? 'Peluang' : 'Opportunities'}</h4>
              </div>
              <div className="ai-briefing-items">
                {briefing.topOpportunities.map((opp, idx) => (
                  <div key={idx} className="ai-briefing-item opportunity">
                    <span className="ai-briefing-item-icon">{opp.icon}</span>
                    <div className="ai-briefing-item-content">
                      <span className="ai-briefing-item-title">{opp.title}</span>
                      <span className="ai-briefing-item-desc">{opp.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Predictions */}
          {briefing.predictions.length > 0 && (
            <div className="ai-briefing-section">
              <div className="ai-briefing-section-header">
                <Clock size={16} className="ai-briefing-section-icon" />
                <h4>{lang === 'id' ? 'Prediksi Jangka Pendek' : 'Short-term Predictions'}</h4>
              </div>
              <div className="ai-briefing-predictions">
                {briefing.predictions.map((pred, idx) => (
                  <div key={idx} className="ai-briefing-prediction">
                    <div className="ai-briefing-pred-header">
                      <span className="ai-briefing-pred-timeframe">{pred.timeframe}</span>
                      <span className={`ai-briefing-pred-confidence ${pred.confidence}`}>
                        {pred.confidence === 'high' ? '🎯' : pred.confidence === 'medium' ? '💭' : '❓'}{' '}
                        {pred.confidence}
                      </span>
                    </div>
                    <p className="ai-briefing-pred-text">{pred.prediction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {briefing.recommendations.length > 0 && (
            <div className="ai-briefing-section">
              <div className="ai-briefing-section-header">
                <Lightbulb size={16} className="ai-briefing-section-icon" />
                <h4>{lang === 'id' ? 'Rekomendasi Aksi' : 'Action Recommendations'}</h4>
              </div>
              <div className="ai-briefing-recommendations">
                {briefing.recommendations.map((rec, idx) => (
                  <div key={idx} className={`ai-briefing-recommendation ${rec.priority}`}>
                    <div className="ai-briefing-rec-priority">
                      {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}
                      <span>{rec.priority.toUpperCase()}</span>
                    </div>
                    <div className="ai-briefing-rec-content">
                      <h5 className="ai-briefing-rec-action">{rec.action}</h5>
                      <p className="ai-briefing-rec-reasoning">{rec.reasoning}</p>
                      <div className="ai-briefing-rec-impact">
                        <span className="ai-briefing-rec-impact-label">
                          {lang === 'id' ? 'Dampak Estimasi:' : 'Estimated Impact:'}
                        </span>
                        <span className="ai-briefing-rec-impact-value">{rec.estimatedImpact}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {briefing.nextSteps.length > 0 && (
            <div className="ai-briefing-section">
              <div className="ai-briefing-section-header">
                <ChevronRight size={16} className="ai-briefing-section-icon" />
                <h4>{lang === 'id' ? 'Pantau Hari Ini' : 'Monitor Today'}</h4>
              </div>
              <ul className="ai-briefing-next-steps">
                {briefing.nextSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="ai-briefing-disclaimer">
            <Lightbulb size={12} />
            <span>
              {lang === 'id'
                ? 'Briefing ini adalah analisis AI untuk referensi saja, bukan saran investasi profesional. Lakukan riset independen sebelum membuat keputusan.'
                : 'This briefing is AI-generated analysis for reference only, not professional investment advice. Conduct independent research before making decisions.'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
