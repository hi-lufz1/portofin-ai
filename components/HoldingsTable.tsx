'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatPercent, formatQuantity } from '@/lib/currency';
import { HoldingWithMarketData } from '@/types';
import { ArrowUpDown, TrendingUp, TrendingDown, ChevronRight, Sparkles } from 'lucide-react';

type SortKey = 'name' | 'current_value' | 'unrealized_pl_pct' | 'change_24h_pct' | 'allocation_pct';

interface Props {
  onAddClick: () => void;
}

export default function HoldingsTable({ onAddClick }: Props) {
  const router = useRouter();
  const { holdings, loading, seedSamplePortfolio } = usePortfolio();
  const { isGuest } = useAuth();
  const { currency } = useCurrency();
  const { t } = useLanguage();
  const [sortKey, setSortKey] = useState<SortKey>('current_value');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'stock' | 'crypto'>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = holdings.filter(h => filterType === 'all' || h.asset_type === filterType);

  const sorted = [...filtered].sort((a, b) => {
    const mul = sortAsc ? 1 : -1;
    if (sortKey === 'name') return mul * a.name.localeCompare(b.name);
    return mul * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  if (loading && holdings.length === 0) {
    return (
      <div className="holdings-card">
        <div className="holdings-header">
          <h2 className="section-title">{t('holdings.title')}</h2>
        </div>
        <div className="holdings-empty">
          <div className="loading-pulse">{t('holdings.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="holdings-card">
      <div className="holdings-header">
        <div className="holdings-title-row">
          <h2 className="section-title">{t('holdings.title')}</h2>
          <span className="holdings-count">{holdings.length} {t('holdings.assets')}</span>
        </div>
        <div className="holdings-filters">
          {(['all', 'stock', 'crypto'] as const).map(type => (
            <button
              key={type}
              type="button"
              className={`filter-chip ${filterType === type ? 'active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? t('holdings.all') : type === 'stock' ? t('holdings.stocks') : t('holdings.crypto')}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="holdings-empty">
          <p className="empty-text">{t('holdings.empty')}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={onAddClick}>
              {t('holdings.addFirst')}
            </button>
            {isGuest && (
              <button
                type="button"
                className="save-cloud-btn-secondary"
                onClick={() => seedSamplePortfolio()}
              >
                <Sparkles size={14} />
                <span>{t('guest.loadSample')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="holdings-table-wrap has-mobile-cards">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="th-sortable">
                    <span>{t('holdings.colAsset')}</span>
                    <ArrowUpDown size={13} />
                  </th>
                  <th className="th-right">{t('holdings.colPrice')}</th>
                  <th className="th-right">{t('holdings.colHoldings')}</th>
                  <th onClick={() => handleSort('current_value')} className="th-sortable th-right">
                    <span>{t('holdings.colValue')}</span>
                    <ArrowUpDown size={13} />
                  </th>
                  <th onClick={() => handleSort('unrealized_pl_pct')} className="th-sortable th-right">
                    <span>{t('holdings.colPL')}</span>
                    <ArrowUpDown size={13} />
                  </th>
                  <th onClick={() => handleSort('change_24h_pct')} className="th-sortable th-right">
                    <span>{t('holdings.col24h')}</span>
                    <ArrowUpDown size={13} />
                  </th>
                  <th className="th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h: HoldingWithMarketData) => {
                  const isPlPos = h.unrealized_pl >= 0;
                  const is24hPos = h.change_24h_pct >= 0;
                  const goDetail = () => router.push(`/dashboard/asset/${h.id}`);

                  return (
                    <tr
                      key={h.id}
                      className="holding-row clickable"
                      onClick={goDetail}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          goDetail();
                        }
                      }}
                      tabIndex={0}
                      role="link"
                      aria-label={`${h.name} (${h.ticker})`}
                    >
                      <td className="td-asset">
                        <div className="asset-info">
                          <div className="asset-icon" style={{ background: getAssetColor(h.ticker) }}>
                            {h.ticker.slice(0, 2)}
                          </div>
                          <div className="asset-name-wrap">
                            <span className="asset-name">{h.name}</span>
                            <span className="asset-ticker">
                              {h.ticker}
                              <span className="asset-type-badge">
                                {h.asset_type === 'stock' ? 'IDX' : 'Crypto'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="td-right td-mono">
                        {formatCurrency(h.current_price, currency)}
                      </td>

                      <td className="td-right td-mono">
                        <div className="holding-qty-cell">
                          {h.asset_type === 'stock' ? (
                            <>
                              <span className="holding-qty">{Math.floor(h.quantity / 100).toLocaleString('id-ID')} lot</span>
                              <span className="holding-avg">({h.quantity.toLocaleString('id-ID')} lbr) {t('holdings.avg')} {formatCurrency(h.avg_buy_price, currency)}</span>
                            </>
                          ) : (
                            <>
                              <span className="holding-qty">{formatQuantity(h.quantity, h.asset_type)}</span>
                              <span className="holding-avg">{t('holdings.avg')} {formatCurrency(h.avg_buy_price, currency)}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="td-right td-mono td-bold">
                        {formatCurrency(h.current_value, currency)}
                      </td>

                      <td className="td-right">
                        <div className={`pl-cell ${isPlPos ? 'positive' : 'negative'}`}>
                          <span className="pl-amount">{formatCurrency(h.unrealized_pl, currency)}</span>
                          <span className="pl-pct">{formatPercent(h.unrealized_pl_pct)}</span>
                        </div>
                      </td>

                      <td className="td-right">
                        <span className={`change-badge ${is24hPos ? 'positive' : 'negative'}`}>
                          {is24hPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {formatPercent(h.change_24h_pct)}
                        </span>
                      </td>

                      <td className="td-actions">
                        <span className="holding-chevron">
                          <ChevronRight size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Reflow (<= 768px): preserves all 6 columns with zero hidden data */}
          <div className="holdings-mobile-list">
            {sorted.map((h: HoldingWithMarketData) => {
              const isPlPos = h.unrealized_pl >= 0;
              const is24hPos = h.change_24h_pct >= 0;
              const goDetail = () => router.push(`/dashboard/asset/${h.id}`);

              return (
                <div
                  key={h.id}
                  className="holding-mobile-card"
                  onClick={goDetail}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goDetail();
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`${h.name} (${h.ticker})`}
                >
                  <div className="holding-mobile-top">
                    <div className="asset-info">
                      <div className="asset-icon" style={{ background: getAssetColor(h.ticker) }}>
                        {h.ticker.slice(0, 2)}
                      </div>
                      <div className="asset-name-wrap">
                        <span className="asset-name">{h.name}</span>
                        <span className="asset-ticker">
                          {h.ticker}
                          <span className="asset-type-badge">
                            {h.asset_type === 'stock' ? 'IDX' : 'Crypto'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="holding-mobile-value-col">
                      <span className="holding-mobile-val">{formatCurrency(h.current_value, currency)}</span>
                      <span className={`change-badge ${is24hPos ? 'positive' : 'negative'}`}>
                        {is24hPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {formatPercent(h.change_24h_pct)}
                      </span>
                    </div>
                  </div>

                  <div className="holding-mobile-grid">
                    <div className="holding-mobile-metric">
                      <span className="holding-mobile-label">{t('holdings.colHoldings')}</span>
                      <span className="holding-mobile-num">
                        {h.asset_type === 'stock'
                          ? `${Math.floor(h.quantity / 100).toLocaleString('id-ID')} lot`
                          : formatQuantity(h.quantity, h.asset_type)}
                      </span>
                    </div>

                    <div className="holding-mobile-metric">
                      <span className="holding-mobile-label">{t('holdings.colPrice')}</span>
                      <span className="holding-mobile-num">{formatCurrency(h.current_price, currency)}</span>
                    </div>

                    <div className="holding-mobile-metric align-right">
                      <span className="holding-mobile-label">{t('holdings.colPL')}</span>
                      <span className={`pl-amount ${isPlPos ? 'positive' : 'negative'}`} style={{ color: isPlPos ? 'var(--green-text)' : 'var(--red)' }}>
                        {formatCurrency(h.unrealized_pl, currency)} ({formatPercent(h.unrealized_pl_pct)})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function getAssetColor(ticker: string): string {
  const colors: Record<string, string> = {
    BTC: '#D97706', ETH: '#1D4ED8', SOL: '#0F766E', BNB: '#B45309',
    XRP: '#1E293B', ADA: '#1E40AF', DOGE: '#A16207', DOT: '#BE185D',
    BBCA: '#1E3A8A', BBRI: '#1E40AF', TLKM: '#B91C1C', ASII: '#15803D',
    BMRI: '#0369A1', UNVR: '#0284C7', GOTO: '#166534', BREN: '#0F766E',
  };
  if (colors[ticker]) return colors[ticker];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 55%, 36%)`;
}
