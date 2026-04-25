'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function PortfolioSummaryCards() {
  const { summary, loading } = usePortfolio();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  const isPositivePL = summary.total_pl >= 0;
  const isPositiveDaily = summary.daily_change >= 0;

  return (
    <div className="summary-grid" id="portfolio-summary">
      {/* Total Value */}
      <div className="summary-card primary" id="total-value-card">
        <div className="summary-card-header">
          <span className="summary-label">{t('summary.totalValue')}</span>
          <div className="summary-icon-wrap">
            <Wallet size={18} />
          </div>
        </div>
        <div className="summary-value-row">
          <span className="summary-value">{loading ? '---' : formatCurrency(summary.total_value)}</span>
        </div>
        <div className="summary-sub">
          <span className={`summary-change ${isPositivePL ? 'positive' : 'negative'}`}>
            {isPositivePL ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {isPositivePL ? '+' : ''}{summary.total_pl_pct.toFixed(2)}%
          </span>
          <span className="summary-sub-text">{t('summary.allTime')}</span>
        </div>
      </div>

      {/* Total P/L */}
      <div className="summary-card" id="total-pl-card">
        <div className="summary-card-header">
          <span className="summary-label">{t('summary.totalPL')}</span>
          <div className={`summary-icon-wrap ${isPositivePL ? 'positive' : 'negative'}`}>
            {isPositivePL ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
        <div className="summary-value-row">
          <span className={`summary-value ${isPositivePL ? 'positive' : 'negative'}`}>
            {loading ? '---' : `${isPositivePL ? '+' : ''}${formatCurrency(summary.total_pl)}`}
          </span>
        </div>
        <div className="summary-sub">
          <span className={`summary-badge ${isPositivePL ? 'positive' : 'negative'}`}>
            {isPositivePL ? '+' : ''}{summary.total_pl_pct.toFixed(2)}%
          </span>
          <span className="summary-sub-text">{t('summary.fromInvested')}</span>
        </div>
      </div>

      {/* Daily Change */}
      <div className="summary-card" id="daily-change-card">
        <div className="summary-card-header">
          <span className="summary-label">{t('summary.dailyChange')}</span>
          <div className={`summary-icon-wrap ${isPositiveDaily ? 'positive' : 'negative'}`}>
            <BarChart3 size={18} />
          </div>
        </div>
        <div className="summary-value-row">
          <span className={`summary-value ${isPositiveDaily ? 'positive' : 'negative'}`}>
            {loading ? '---' : `${isPositiveDaily ? '+' : ''}${formatCurrency(summary.daily_change)}`}
          </span>
        </div>
        <div className="summary-sub">
          <span className={`summary-badge ${isPositiveDaily ? 'positive' : 'negative'}`}>
            {isPositiveDaily ? '+' : ''}{summary.daily_change_pct.toFixed(2)}%
          </span>
          <span className="summary-sub-text">{t('summary.last24h')}</span>
        </div>
      </div>
    </div>
  );
}
