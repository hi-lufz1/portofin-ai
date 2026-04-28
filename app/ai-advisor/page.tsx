'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  PieChart,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  Target,
  Zap,
} from 'lucide-react';

import AIChat from '@/components/AIChat';
import AIScenario from '@/components/AIScenario';
import PortfolioNarrative from '@/components/PortfolioNarrative';
import AIInvestorPersona from '@/components/AIInvestorPersona';

interface AnalysisData {
  riskScore: number; // 0-100
  riskLabel: string;
  diversificationScore: number; // 0-100
  diversificationLabel: string;
  performanceSummary: string;
  topPerformer: { name: string; pct: string } | null;
  worstPerformer: { name: string; pct: string } | null;
  insights: Array<{
    icon: string;
    title: string;
    body: string;
    type: 'positive' | 'warning' | 'neutral';
  }>;
  recommendations: string[];
  portfolioNarrative: string;
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
  lines.push(`Daily Change: ${formatCurrency(summary.daily_change)} (${summary.daily_change_pct.toFixed(2)}%)`);
  lines.push(`Crypto: ${formatCurrency(summary.crypto_value)}, Stocks: ${formatCurrency(summary.stock_value)}`);
  lines.push(`Number of holdings: ${holdings.length}`);
  lines.push('');
  lines.push('Holdings:');
  holdings.forEach((h) => {
    const pct = summary.total_value > 0 ? ((h.current_value / summary.total_value) * 100).toFixed(1) : '0';
    lines.push(
      `- ${h.name} (${h.ticker}, ${h.type}): Qty ${h.quantity}, ` +
      `Value: ${formatCurrency(h.current_value)}, ` +
      `P/L: ${formatCurrency(h.profit_loss)} (${h.profit_loss_pct.toFixed(2)}%), ` +
      `Weight: ${pct}%, 24h Change: ${(h.price_change_24h ?? 0).toFixed(2)}%`
    );
  });

  return lines.join('\n');
}

// Local fallback analysis when AI is unavailable
function computeLocalAnalysis(
  holdings: ReturnType<typeof usePortfolio>['holdings'],
  summary: ReturnType<typeof usePortfolio>['summary'],
  lang: string,
): AnalysisData {
  const holdingCount = holdings.length;
  const cryptoCount = holdings.filter(h => h.type === 'crypto').length;
  const stockCount = holdings.filter(h => h.type === 'stock').length;

  // Risk: concentration-based
  const weights = holdings.map(h => summary.total_value > 0 ? h.current_value / summary.total_value : 0);
  const maxWeight = Math.max(...weights, 0);
  const hhi = weights.reduce((s, w) => s + w * w, 0); // Herfindahl Index
  const riskScore = Math.min(100, Math.round(hhi * 100 * 1.5 + (maxWeight > 0.5 ? 20 : 0)));
  
  // Diversification
  const hasMultiType = cryptoCount > 0 && stockCount > 0;
  const divScore = Math.min(100, Math.round(
    (holdingCount >= 5 ? 30 : holdingCount * 6) +
    (hasMultiType ? 30 : 0) +
    ((1 - hhi) * 40)
  ));

  // Performance
  const sorted = [...holdings].sort((a, b) => b.profit_loss_pct - a.profit_loss_pct);
  const topPerformer = sorted.length > 0 ? { name: sorted[0].ticker, pct: `${sorted[0].profit_loss_pct >= 0 ? '+' : ''}${sorted[0].profit_loss_pct.toFixed(2)}%` } : null;
  const worstPerformer = sorted.length > 1 ? { name: sorted[sorted.length - 1].ticker, pct: `${sorted[sorted.length - 1].profit_loss_pct >= 0 ? '+' : ''}${sorted[sorted.length - 1].profit_loss_pct.toFixed(2)}%` } : null;

  const isID = lang === 'id';

  // Insights
  const insights: AnalysisData['insights'] = [];
  
  if (maxWeight > 0.5) {
    const heaviest = holdings.find(h => summary.total_value > 0 && h.current_value / summary.total_value === maxWeight);
    insights.push({
      icon: '⚠️',
      title: isID ? 'Konsentrasi Tinggi' : 'High Concentration',
      body: isID
        ? `${heaviest?.ticker || 'Satu aset'} menguasai ${(maxWeight * 100).toFixed(0)}% portofolio. Pertimbangkan diversifikasi.`
        : `${heaviest?.ticker || 'One asset'} makes up ${(maxWeight * 100).toFixed(0)}% of your portfolio. Consider diversifying.`,
      type: 'warning',
    });
  }

  if (!hasMultiType) {
    insights.push({
      icon: '🔄',
      title: isID ? 'Diversifikasi Tipe Aset' : 'Asset Type Diversification',
      body: isID
        ? `Portofolio kamu hanya berisi ${cryptoCount > 0 ? 'crypto' : 'saham'}. Pertimbangkan menambah ${cryptoCount > 0 ? 'saham' : 'crypto'}.`
        : `Your portfolio only contains ${cryptoCount > 0 ? 'crypto' : 'stocks'}. Consider adding ${cryptoCount > 0 ? 'stocks' : 'crypto'}.`,
      type: 'neutral',
    });
  }

  if (summary.total_pl_pct > 5) {
    insights.push({
      icon: '📈',
      title: isID ? 'Performa Positif' : 'Positive Performance',
      body: isID
        ? `Portofolio naik ${summary.total_pl_pct.toFixed(2)}%. Pertahankan dan review berkala.`
        : `Portfolio up ${summary.total_pl_pct.toFixed(2)}%. Keep it up and review regularly.`,
      type: 'positive',
    });
  } else if (summary.total_pl_pct < -5) {
    insights.push({
      icon: '📉',
      title: isID ? 'Performa Negatif' : 'Negative Performance',
      body: isID
        ? `Portofolio turun ${Math.abs(summary.total_pl_pct).toFixed(2)}%. Evaluasi strategi dan pertimbangkan DCA.`
        : `Portfolio down ${Math.abs(summary.total_pl_pct).toFixed(2)}%. Evaluate strategy and consider DCA.`,
      type: 'warning',
    });
  }

  if (holdingCount <= 2) {
    insights.push({
      icon: '💡',
      title: isID ? 'Tambah Diversifikasi' : 'Add More Assets',
      body: isID
        ? `Hanya ${holdingCount} aset. Idealnya 5-10 aset untuk diversifikasi optimal.`
        : `Only ${holdingCount} assets. Ideally 5-10 assets for optimal diversification.`,
      type: 'neutral',
    });
  }

  // Ensure at least 3 insights
  while (insights.length < 3) {
    if (hasMultiType && !insights.find(i => i.icon === '🏆')) {
      insights.push({
        icon: '🏆',
        title: isID ? 'Multi-Aset' : 'Multi-Asset',
        body: isID
          ? `Bagus! Kamu punya ${cryptoCount} crypto dan ${stockCount} saham. Komposisi yang seimbang.`
          : `Great! You have ${cryptoCount} crypto and ${stockCount} stocks. Balanced composition.`,
        type: 'positive',
      });
    } else {
      insights.push({
        icon: '🎯',
        title: isID ? 'Tetap Konsisten' : 'Stay Consistent',
        body: isID
          ? 'Investasi rutin dan review berkala adalah kunci sukses jangka panjang.'
          : 'Regular investing and periodic reviews are key to long-term success.',
        type: 'positive',
      });
      break;
    }
  }

  return {
    riskScore,
    riskLabel: riskScore < 30 ? (isID ? 'Rendah' : 'Low')
      : riskScore < 60 ? (isID ? 'Sedang' : 'Medium')
      : (isID ? 'Tinggi' : 'High'),
    diversificationScore: divScore,
    diversificationLabel: divScore > 70 ? (isID ? 'Baik' : 'Good')
      : divScore > 40 ? (isID ? 'Cukup' : 'Fair')
      : (isID ? 'Kurang' : 'Poor'),
    performanceSummary: isID
      ? `Portofolio senilai total dengan ${holdingCount} aset. Return keseluruhan ${summary.total_pl_pct >= 0 ? '+' : ''}${summary.total_pl_pct.toFixed(2)}%.`
      : `Portfolio with ${holdingCount} assets. Overall return ${summary.total_pl_pct >= 0 ? '+' : ''}${summary.total_pl_pct.toFixed(2)}%.`,
    topPerformer,
    worstPerformer,
    insights: insights.slice(0, 4),
    recommendations: [],
    portfolioNarrative: '',
  };
}

export default function AIPortfolioPage() {
  const { holdings, summary, loading: portfolioLoading } = usePortfolio();
  const { formatCurrency } = useCurrency();
  const { t, lang } = useLanguage();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasInitialized = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (holdings.length === 0) return;
    setLoading(true);

    // Always compute local analysis first
    const local = computeLocalAnalysis(holdings, summary, lang);
    setAnalysis(local);

    // Try AI-enhanced analysis
    try {
      const portfolioContext = buildPortfolioContext(holdings, summary, formatCurrency);
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioContext,
          lang,
          mode: 'full', // Request full analysis
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.insights) && data.insights.length > 0) {
          setAnalysis(prev => prev ? { ...prev, insights: data.insights } : prev);
          setAiAvailable(true);
        }
      } else {
        setAiAvailable(false);
      }
    } catch {
      setAiAvailable(false);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, [holdings, summary, formatCurrency, lang]);

  // Auto-run on portfolio load
  useEffect(() => {
    if (!portfolioLoading && holdings.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      runAnalysis();
    }
  }, [portfolioLoading, holdings.length, runAnalysis]);

  const getRiskColor = (score: number) => {
    if (score < 30) return 'var(--green)';
    if (score < 60) return '#F59E0B';
    return 'var(--red)';
  };

  const getDivColor = (score: number) => {
    if (score > 70) return 'var(--green)';
    if (score > 40) return '#F59E0B';
    return 'var(--red)';
  };

  const portfolioContext = buildPortfolioContext(holdings, summary, formatCurrency);

  if (portfolioLoading || holdings.length === 0) {
    return (
      <div className="page-content" id="ai-page">
        <div className="page-header">
          <div>
            <h1 className="page-title ai-page-title">
              <Sparkles size={24} />
              {t('ai.title')}
            </h1>
            <p className="page-subtitle">{t('ai.subtitle')}</p>
          </div>
        </div>
        <div className="ai-empty-portfolio">
          <div className="ai-empty-portfolio-icon">
            <BarChart3 size={40} />
          </div>
          <h3>{lang === 'id' ? 'Belum ada data portofolio' : 'No portfolio data yet'}</h3>
          <p>{lang === 'id' ? 'Tambahkan aset ke portofolio untuk mendapatkan analisis AI.' : 'Add assets to your portfolio to get AI analysis.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content" id="ai-page">
      <div className="page-header">
        <div>
          <h1 className="page-title ai-page-title">
            <Sparkles size={24} />
            {t('ai.title')}
          </h1>
          <p className="page-subtitle">{t('ai.subtitle')}</p>
        </div>
        <div className="page-actions">
          {lastUpdated && (
            <span className="ai-last-updated">
              {lang === 'id' ? 'Diperbarui' : 'Updated'} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={runAnalysis} className="btn-primary ai-analyze-btn" disabled={loading} id="run-analysis-btn">
            {loading ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
            <span>{loading ? (lang === 'id' ? 'Menganalisis...' : 'Analyzing...') : (lang === 'id' ? 'Analisis Ulang' : 'Re-analyze')}</span>
          </button>
        </div>
      </div>

      {!aiAvailable && (
        <div className="ai-offline-banner">
          <AlertTriangle size={16} />
          <span>{lang === 'id' ? 'AI offline — menampilkan analisis lokal' : 'AI offline — showing local analysis'}</span>
        </div>
      )}

      {analysis && (
        <>
          {/* Score Cards Row */}
          <div className="ai-scores-grid">
            {/* Risk Score */}
            <div className="ai-score-card">
              <div className="ai-score-header">
                <div className="ai-score-label-row">
                  <ShieldCheck size={18} />
                  <span>{lang === 'id' ? 'SKOR RISIKO' : 'RISK SCORE'}</span>
                </div>
              </div>
              <div className="ai-score-gauge">
                <svg viewBox="0 0 120 70" className="ai-gauge-svg">
                  <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
                  <path
                    d="M 10 65 A 50 50 0 0 1 110 65"
                    fill="none"
                    stroke={getRiskColor(analysis.riskScore)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${analysis.riskScore * 1.57} 157`}
                    className="ai-gauge-fill"
                  />
                </svg>
                <div className="ai-gauge-value">
                  <span className="ai-gauge-number" style={{ color: getRiskColor(analysis.riskScore) }}>
                    {analysis.riskScore}
                  </span>
                  <span className="ai-gauge-label">{analysis.riskLabel}</span>
                </div>
              </div>
            </div>

            {/* Diversification Score */}
            <div className="ai-score-card">
              <div className="ai-score-header">
                <div className="ai-score-label-row">
                  <PieChart size={18} />
                  <span>{lang === 'id' ? 'DIVERSIFIKASI' : 'DIVERSIFICATION'}</span>
                </div>
              </div>
              <div className="ai-score-gauge">
                <svg viewBox="0 0 120 70" className="ai-gauge-svg">
                  <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="var(--border)" strokeWidth="10" strokeLinecap="round" />
                  <path
                    d="M 10 65 A 50 50 0 0 1 110 65"
                    fill="none"
                    stroke={getDivColor(analysis.diversificationScore)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${analysis.diversificationScore * 1.57} 157`}
                    className="ai-gauge-fill"
                  />
                </svg>
                <div className="ai-gauge-value">
                  <span className="ai-gauge-number" style={{ color: getDivColor(analysis.diversificationScore) }}>
                    {analysis.diversificationScore}
                  </span>
                  <span className="ai-gauge-label">{analysis.diversificationLabel}</span>
                </div>
              </div>
            </div>

            {/* Top Performer */}
            <div className="ai-score-card ai-perf-card">
              <div className="ai-score-header">
                <div className="ai-score-label-row">
                  <TrendingUp size={18} />
                  <span>{lang === 'id' ? 'ASET TERBAIK' : 'TOP PERFORMER'}</span>
                </div>
              </div>
              {analysis.topPerformer ? (
                <div className="ai-perf-display">
                  <span className="ai-perf-ticker">{analysis.topPerformer.name}</span>
                  <span className="ai-perf-pct positive">{analysis.topPerformer.pct}</span>
                </div>
              ) : (
                <span className="ai-perf-na">—</span>
              )}
            </div>

            {/* Worst Performer */}
            <div className="ai-score-card ai-perf-card">
              <div className="ai-score-header">
                <div className="ai-score-label-row">
                  <Target size={18} />
                  <span>{lang === 'id' ? 'PERLU PERHATIAN' : 'NEEDS ATTENTION'}</span>
                </div>
              </div>
              {analysis.worstPerformer ? (
                <div className="ai-perf-display">
                  <span className="ai-perf-ticker">{analysis.worstPerformer.name}</span>
                  <span className={`ai-perf-pct ${parseFloat(analysis.worstPerformer.pct) >= 0 ? 'positive' : 'negative'}`}>
                    {analysis.worstPerformer.pct}
                  </span>
                </div>
              ) : (
                <span className="ai-perf-na">—</span>
              )}
            </div>
          </div>

          {/* AI Investor Persona */}
          <AIInvestorPersona portfolioContext={portfolioContext} lang={lang} />

          {/* AI Insights */}
          <div className="ai-section">
            <div className="ai-section-header">
              <Sparkles size={18} className="ai-section-icon" />
              <h2 className="ai-section-title">
                {lang === 'id' ? 'AI Insights' : 'AI Insights'}
              </h2>
              <span className="ai-badge">AI</span>
            </div>
            <div className="ai-insights-grid">
              {analysis.insights.map((insight, idx) => (
                <div key={idx} className={`ai-insight-card ${insight.type}`}>
                  <span className="ai-insight-card-emoji">{insight.icon}</span>
                  <div className="ai-insight-card-content">
                    <h4 className="ai-insight-card-title">{insight.title}</h4>
                    <p className="ai-insight-card-body">{insight.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Composition Visual */}
          <div className="ai-section">
            <div className="ai-section-header">
              <BarChart3 size={18} className="ai-section-icon" />
              <h2 className="ai-section-title">
                {lang === 'id' ? 'Komposisi Portofolio' : 'Portfolio Composition'}
              </h2>
            </div>
            <div className="ai-composition">
              {holdings
                .sort((a, b) => b.current_value - a.current_value)
                .map((h) => {
                  const weight = summary.total_value > 0 ? (h.current_value / summary.total_value) * 100 : 0;
                  return (
                    <div key={h.id} className="ai-comp-item">
                      <div className="ai-comp-info">
                        <span className="ai-comp-name">{h.ticker}</span>
                        <span className="ai-comp-type">{h.type === 'crypto' ? 'Crypto' : 'Stock'}</span>
                      </div>
                      <div className="ai-comp-bar-wrap">
                        <div
                          className="ai-comp-bar-fill"
                          style={{
                            width: `${weight}%`,
                            background: h.type === 'crypto'
                              ? 'linear-gradient(90deg, var(--indigo), #818CF8)'
                              : 'linear-gradient(90deg, var(--primary), #334155)',
                          }}
                        />
                      </div>
                      <div className="ai-comp-values">
                        <span className="ai-comp-weight">{weight.toFixed(1)}%</span>
                        <span className={`ai-comp-pl ${h.profit_loss_pct >= 0 ? 'positive' : 'negative'}`}>
                          {h.profit_loss_pct >= 0 ? '+' : ''}{h.profit_loss_pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Portfolio Narrative */}
          <div className="ai-section">
            <div className="ai-section-header">
              <Sparkles size={18} className="ai-section-icon" />
              <h2 className="ai-section-title">{lang === 'id' ? 'Narasi Portofolio' : 'Portfolio Narrative'}</h2>
            </div>
            <PortfolioNarrative portfolioContext={portfolioContext} lang={lang} />
          </div>

          {/* Chat & Scenario */}
          <div className="ai-section">
            <div className="ai-section-header">
              <Sparkles size={18} className="ai-section-icon" />
              <h2 className="ai-section-title">{lang === 'id' ? 'Berbicara dengan AI' : 'Talk to AI Advisor'}</h2>
            </div>
            <div className="ai-chat-grid" style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <AIChat portfolioContext={portfolioContext} lang={lang} />
              <AIScenario portfolioContext={portfolioContext} lang={lang} />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="ai-disclaimer-box">
            <Lightbulb size={14} />
            <span>{t('ai.disclaimer')}</span>
          </div>
        </>
      )}
    </div>
  );
}
