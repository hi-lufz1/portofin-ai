'use client';

import { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, ChevronRight, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Crypto icon mapping
const cryptoIcons: Record<string, string> = {
  bitcoin: '₿',
  ethereum: 'Ξ',
  solana: 'S',
  cardano: '₳',
  polkadot: '●',
  ripple: '✕',
};

function getAssetIcon(ticker: string, type: string) {
  if (type === 'crypto') {
    return cryptoIcons[ticker.toLowerCase()] || ticker.charAt(0).toUpperCase();
  }
  return ticker.substring(0, 2);
}

function getAssetColor(ticker: string, type: string): string {
  if (type === 'crypto') {
    const colors: Record<string, string> = {
      bitcoin: '#F7931A',
      btc: '#F7931A',
      ethereum: '#1D4ED8',
      eth: '#1D4ED8',
      solana: '#0F172A',
      sol: '#0F172A',
      cardano: '#0033AD',
      polkadot: '#E6007A',
      ripple: '#23292F',
    };
    return colors[ticker.toLowerCase()] || '#1D4ED8';
  }
  const stockColors: Record<string, string> = {
    BBCA: '#003D79',
    BBRI: '#00529C',
    BMRI: '#003366',
    BBNI: '#F15A22',
    TLKM: '#E31937',
    ASII: '#003399',
    GOTO: '#00AA13',
    BUKA: '#E31C5F',
    ANTM: '#1A5276',
  };
  return stockColors[ticker] || '#475569';
}

export default function HoldingsTable() {
  const { holdings, loading } = usePortfolio();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'crypto' | 'stock'>('all');

  const filtered = filter === 'all'
    ? holdings
    : holdings.filter((h) => h.type === filter);

  const sorted = [...filtered].sort((a, b) => b.current_value - a.current_value);

  const handleRowClick = (holdingId: string) => {
    router.push(`/dashboard/asset/${holdingId}`);
  };

  return (
    <div className="holdings-section" id="holdings-section">
      <div className="holdings-header">
        <h2 className="section-title">{t('holdings.title')}</h2>
        <div className="holdings-filters">
          <button
            type="button"
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            id="filter-all"
          >
            {t('holdings.all')}
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'crypto' ? 'active' : ''}`}
            onClick={() => setFilter('crypto')}
            id="filter-crypto"
          >
            {t('holdings.crypto')}
          </button>
          <button
            type="button"
            className={`filter-chip ${filter === 'stock' ? 'active' : ''}`}
            onClick={() => setFilter('stock')}
            id="filter-stock"
          >
            {t('holdings.stocks')}
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="holdings-table-wrap has-mobile-cards">
        <table className="holdings-table" id="holdings-table">
          <thead>
            <tr>
              <th>{t('holdings.asset')}</th>
              <th className="text-right">{t('holdings.price')}</th>
              <th className="text-right">{t('holdings.qty')}</th>
              <th className="text-right">{t('holdings.value')}</th>
              <th className="text-right">{t('holdings.pl')}</th>
              <th className="text-right">{t('holdings.change24h')}</th>
              <th className="text-right" style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && holdings.length === 0 ? (
              <tr>
                <td colSpan={7} className="holdings-loading">
                  <div className="loading-pulse" style={{ height: 20 }} />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="holdings-empty">
                  <div className="holdings-empty-state">
                    <div className="holdings-empty-icon">
                      <Briefcase size={22} />
                    </div>
                    <span className="holdings-empty-title">{t('holdings.emptyTitle')}</span>
                    <p className="holdings-empty-desc">{t('holdings.empty')}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((holding) => {
                const isPLPositive = holding.profit_loss >= 0;
                const isDayPositive = (holding.price_change_24h ?? 0) >= 0;

                return (
                  <tr
                    key={holding.id}
                    className="holding-row clickable"
                    id={`holding-${holding.ticker}`}
                    onClick={() => handleRowClick(holding.id)}
                  >
                    <td>
                      <div className="asset-info">
                        <div
                          className="asset-icon"
                          style={{ backgroundColor: getAssetColor(holding.ticker, holding.type) }}
                        >
                          {getAssetIcon(holding.ticker, holding.type)}
                        </div>
                        <div className="asset-name-wrap">
                          <span className="asset-name">{holding.name}</span>
                          <span className="asset-ticker">
                            {holding.type === 'stock' ? holding.ticker : holding.ticker.toUpperCase()}
                            <span className={`asset-type-badge ${holding.type === 'crypto' ? 'crypto' : 'stock'}`}>
                              {holding.type === 'crypto' ? 'Crypto' : 'IDX'}
                            </span>
                            {holding.type === 'crypto' && holding.buy_price_currency && (
                              <span
                                className={`asset-cur-badge ${
                                  holding.buy_price_currency === 'USD' ? 'usd' : ''
                                }`}
                              >
                                {holding.buy_price_currency}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right tabular">
                      {formatCurrency(holding.current_price)}
                    </td>
                    <td className="text-right tabular">
                      <span className="holding-qty">
                        {holding.type === 'crypto'
                          ? holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })
                          : holding.quantity.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="text-right tabular font-medium">
                      {formatCurrency(holding.current_value)}
                    </td>
                    <td className="text-right">
                      <div className={`pl-cell ${isPLPositive ? 'positive' : 'negative'}`}>
                        <span className="pl-amount">
                          {isPLPositive ? '+' : ''}
                          {formatCurrency(holding.profit_loss)}
                        </span>
                        <span className="pl-pct">
                          {isPLPositive ? '+' : ''}
                          {holding.profit_loss_pct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={`change-badge ${isDayPositive ? 'positive' : 'negative'}`}>
                        {isDayPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isDayPositive ? '+' : ''}
                        {(holding.price_change_24h ?? 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="holding-chevron">
                        <ChevronRight size={16} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (<= 768px) */}
      <div className="holdings-mobile-list" id="holdings-mobile-list">
        {loading && holdings.length === 0 ? (
          <div className="holdings-empty">
            <div className="loading-pulse" style={{ height: 20 }} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="holdings-empty">
            <div className="holdings-empty-state">
              <div className="holdings-empty-icon">
                <Briefcase size={22} />
              </div>
              <span className="holdings-empty-title">{t('holdings.emptyTitle')}</span>
              <p className="holdings-empty-desc">{t('holdings.empty')}</p>
            </div>
          </div>
        ) : (
          sorted.map((holding) => {
            const isPLPositive = holding.profit_loss >= 0;
            const isDayPositive = (holding.price_change_24h ?? 0) >= 0;

            return (
              <div
                key={`mobile-${holding.id}`}
                className="holding-mobile-card"
                onClick={() => handleRowClick(holding.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(holding.id);
                  }
                }}
              >
                <div className="holding-mobile-top">
                  <div className="asset-info">
                    <div
                      className="asset-icon"
                      style={{ backgroundColor: getAssetColor(holding.ticker, holding.type) }}
                    >
                      {getAssetIcon(holding.ticker, holding.type)}
                    </div>
                    <div className="asset-name-wrap">
                      <span className="asset-name">{holding.name}</span>
                      <span className="asset-ticker">
                        {holding.type === 'stock' ? holding.ticker : holding.ticker.toUpperCase()}
                        <span className={`asset-type-badge ${holding.type === 'crypto' ? 'crypto' : 'stock'}`}>
                          {holding.type === 'crypto' ? 'Crypto' : 'IDX'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="holding-mobile-right">
                    <span className="holding-mobile-val">
                      {formatCurrency(holding.current_value)}
                    </span>
                    <div className={`pl-cell ${isPLPositive ? 'positive' : 'negative'}`}>
                      <span className="pl-pct">
                        {isPLPositive ? '+' : ''}
                        {holding.profit_loss_pct.toFixed(2)}% ({isPLPositive ? '+' : ''}
                        {formatCurrency(holding.profit_loss)})
                      </span>
                    </div>
                  </div>
                </div>
                <div className="holding-mobile-meta">
                  <span>
                    {holding.type === 'crypto'
                      ? holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })
                      : holding.quantity.toLocaleString('id-ID')}{' '}
                    @ {formatCurrency(holding.current_price)}
                  </span>
                  <span className={`change-badge ${isDayPositive ? 'positive' : 'negative'}`}>
                    {isDayPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isDayPositive ? '+' : ''}
                    {(holding.price_change_24h ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
