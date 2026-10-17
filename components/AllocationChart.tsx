'use client';

import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/currency';
import { PieChart } from 'lucide-react';

export default function AllocationChart() {
  const { summary, holdings, loading } = usePortfolio();
  const { currency } = useCurrency();
  const { t } = useLanguage();

  const total = summary.total_value;
  const stockPct = total > 0 ? (summary.stock_value / total) * 100 : 0;
  const cryptoPct = total > 0 ? (summary.crypto_value / total) * 100 : 0;

  // Top 5 holdings by value
  const topHoldings = [...holdings]
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 5);

  if (loading && holdings.length === 0) {
    return (
      <div className="allocation-card">
        <h2 className="section-title">{t('allocation.title')}</h2>
        <div className="allocation-empty loading-pulse">{t('allocation.loading')}</div>
      </div>
    );
  }

  return (
    <div className="allocation-card">
      <h2 className="section-title">{t('allocation.title')}</h2>

      {total === 0 ? (
        <div className="allocation-empty">
          <PieChart size={32} strokeWidth={1.2} />
          <p>{t('allocation.empty')}</p>
        </div>
      ) : (
        <>
          {/* Donut Chart via SVG */}
          <div className="donut-wrap">
            <svg viewBox="0 0 120 120" className="donut-svg">
              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border)" strokeWidth="14" />
              {stockPct > 0 && (
                <circle
                  cx="60" cy="60" r="48"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="14"
                  strokeDasharray={`${(stockPct / 100) * 301.59} 301.59`}
                  strokeDashoffset="0"
                  transform="rotate(-90 60 60)"
                  className="donut-segment"
                />
              )}
              {cryptoPct > 0 && (
                <circle
                  cx="60" cy="60" r="48"
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth="14"
                  strokeDasharray={`${(cryptoPct / 100) * 301.59} 301.59`}
                  strokeDashoffset={`${-((stockPct / 100) * 301.59)}`}
                  transform="rotate(-90 60 60)"
                  className="donut-segment"
                />
              )}
            </svg>
            <div className="donut-center">
              <span className="donut-center-label">{t('allocation.total')}</span>
              <span className="donut-center-value">{formatCurrency(total, currency)}</span>
            </div>
          </div>

          {/* Type Legend */}
          <div className="allocation-legend">
            <div className="legend-item">
              <div className="legend-left">
                <span className="legend-dot" style={{ background: '#0F172A' }} />
                <span className="legend-label">{t('allocation.stocks')}</span>
              </div>
              <div className="legend-right">
                <span className="legend-pct">{stockPct.toFixed(1)}%</span>
                <span className="legend-value">{formatCurrency(summary.stock_value, currency)}</span>
              </div>
            </div>
            <div className="legend-item">
              <div className="legend-left">
                <span className="legend-dot" style={{ background: '#1D4ED8' }} />
                <span className="legend-label">{t('allocation.crypto')}</span>
              </div>
              <div className="legend-right">
                <span className="legend-pct">{cryptoPct.toFixed(1)}%</span>
                <span className="legend-value">{formatCurrency(summary.crypto_value, currency)}</span>
              </div>
            </div>
          </div>

          {/* Per-Asset Breakdown */}
          {topHoldings.length > 0 && (
            <div className="allocation-bars">
              <span className="allocation-bars-title">{t('allocation.perAsset')}</span>
              {topHoldings.map(h => (
                <div key={h.id} className="allocation-bar-item">
                  <div className="allocation-bar-header">
                    <span className="allocation-bar-name">{h.ticker}</span>
                    <span className="allocation-bar-pct">{h.allocation_pct.toFixed(1)}%</span>
                  </div>
                  <div className="allocation-bar-track">
                    <div
                      className="allocation-bar-fill"
                      style={{
                        width: `${Math.max(h.allocation_pct, 2)}%`,
                        background: h.asset_type === 'stock' ? '#0F172A' : '#1D4ED8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
