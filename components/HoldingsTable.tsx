'use client';

import { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
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
    return cryptoIcons[ticker] || ticker.charAt(0).toUpperCase();
  }
  return ticker.substring(0, 2);
}

function getAssetColor(ticker: string, type: string): string {
  if (type === 'crypto') {
    const colors: Record<string, string> = {
      bitcoin: '#F7931A',
      ethereum: '#627EEA',
      solana: '#9945FF',
      cardano: '#0033AD',
      polkadot: '#E6007A',
      ripple: '#23292F',
    };
    return colors[ticker] || '#6366f1';
  }
  const stockColors: Record<string, string> = {
    BBCA: '#003D79', BBRI: '#00529C', BMRI: '#003366', BBNI: '#F15A22',
    TLKM: '#E31937', ASII: '#003399', GOTO: '#00AA13', BUKA: '#E31C5F', ANTM: '#1A5276',
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
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            id="filter-all"
          >
            {t('holdings.all')}
          </button>
          <button
            className={`filter-chip ${filter === 'crypto' ? 'active' : ''}`}
            onClick={() => setFilter('crypto')}
            id="filter-crypto"
          >
            {t('holdings.crypto')}
          </button>
          <button
            className={`filter-chip ${filter === 'stock' ? 'active' : ''}`}
            onClick={() => setFilter('stock')}
            id="filter-stock"
          >
            {t('holdings.stocks')}
          </button>
        </div>
      </div>

      <div className="holdings-table-wrap">
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
            {loading ? (
              <tr>
                <td colSpan={7} className="holdings-loading">
                  <div className="loading-pulse" />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="holdings-empty">
                  No holdings found. Add your first asset!
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
                            <span className="asset-type-badge">{holding.type === 'crypto' ? 'Crypto' : 'IDX'}</span>
                            {holding.type === 'crypto' && holding.buy_price_currency && (
                              <span className={`asset-cur-badge ${holding.buy_price_currency === 'USD' ? 'usd' : ''}`}>
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
                          {isPLPositive ? '+' : ''}{formatCurrency(holding.profit_loss)}
                        </span>
                        <span className="pl-pct">
                          {isPLPositive ? '+' : ''}{holding.profit_loss_pct.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={`change-badge ${isDayPositive ? 'positive' : 'negative'}`}>
                        {isDayPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {isDayPositive ? '+' : ''}{(holding.price_change_24h ?? 0).toFixed(2)}%
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
    </div>
  );
}
