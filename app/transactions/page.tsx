'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatQuantity } from '@/lib/currency';
import { Transaction } from '@/types';
import {
  ArrowUpRight, ArrowDownLeft, Clock,
  TrendingUp, TrendingDown, DollarSign, Activity,
  Search, ChevronRight,
} from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const { transactions, holdings, loading } = usePortfolio();
  const { currency, exchangeRate } = useCurrency();
  const { lang, t } = useLanguage();
  const [filterAction, setFilterAction] = useState<'all' | 'buy' | 'sell'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toDisplay = (val: number, txCur: string): number => {
    if (txCur === currency) return val;
    return currency === 'USD' ? val / exchangeRate : val * exchangeRate;
  };

  // Track which assets are still held
  const activeTickersMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of holdings) {
      map.set(`${h.ticker}_${h.asset_type}`, h.id);
    }
    return map;
  }, [holdings]);

  // Filter by action AND search query
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterAction !== 'all' && tx.action !== filterAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return tx.ticker.toLowerCase().includes(q) || tx.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, filterAction, searchQuery]);

  // Calculate realized P/L summary from all sell transactions
  const plSummary = useMemo(() => {
    const sellTxs = transactions.filter(t => t.action === 'sell');
    const buyTxs = transactions.filter(t => t.action === 'buy');

    let totalRealizedPl = 0;
    let totalSellRevenue = 0;
    let totalBuySpent = 0;
    let winCount = 0;
    let lossCount = 0;

    for (const tx of sellTxs) {
      const pl = tx.realized_pl != null ? toDisplay(Number(tx.realized_pl), tx.currency) : 0;
      totalRealizedPl += pl;
      totalSellRevenue += toDisplay(Number(tx.total), tx.currency);
      if (pl > 0) winCount++;
      else if (pl < 0) lossCount++;
    }

    for (const tx of buyTxs) {
      totalBuySpent += toDisplay(Number(tx.total), tx.currency);
    }

    return {
      totalRealizedPl,
      totalSellRevenue,
      totalBuySpent,
      sellCount: sellTxs.length,
      buyCount: buyTxs.length,
      winCount,
      lossCount,
      winRate: sellTxs.length > 0 ? (winCount / sellTxs.length) * 100 : 0,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, currency, exchangeRate]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRowClick = (tx: Transaction) => {
    router.push(`/transactions/asset/${encodeURIComponent(tx.ticker)}/${tx.asset_type}`);
  };

  const isPlPositive = plSummary.totalRealizedPl >= 0;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('tx.title')}</h1>
          <p className="page-subtitle">{t('tx.subtitle')}</p>
        </div>
      </div>

      {/* Realized P/L Summary Cards */}
      <div className="tx-summary-grid">
        <div className="tx-summary-card highlight">
          <div className="tx-summary-icon-wrap" style={{
            background: plSummary.sellCount === 0
              ? 'var(--surface-dim)'
              : isPlPositive ? 'var(--green-bg)' : 'var(--red-bg)',
            color: plSummary.sellCount === 0
              ? 'var(--text-secondary)'
              : isPlPositive ? 'var(--green-text)' : 'var(--red)',
          }}>
            {isPlPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
          <div className="tx-summary-info">
            <span className="tx-summary-label">{t('tx.realizedPL')}</span>
            <span className={`tx-summary-value ${plSummary.sellCount > 0 ? (isPlPositive ? 'positive' : 'negative') : ''}`}>
              {plSummary.sellCount > 0
                ? `${isPlPositive ? '+' : ''}${formatCurrency(plSummary.totalRealizedPl, currency)}`
                : formatCurrency(0, currency)
              }
            </span>
            {plSummary.sellCount > 0 && (
              <span className="tx-summary-sub">
                {plSummary.winCount}W / {plSummary.lossCount}L ({plSummary.winRate.toFixed(0)}% win)
              </span>
            )}
          </div>
        </div>

        <div className="tx-summary-card">
          <div className="tx-summary-icon-wrap" style={{ background: 'var(--green-bg)', color: 'var(--green-text)' }}>
            <ArrowDownLeft size={18} />
          </div>
          <div className="tx-summary-info">
            <span className="tx-summary-label">{t('tx.totalBuy')}</span>
            <span className="tx-summary-value">{formatCurrency(plSummary.totalBuySpent, currency)}</span>
            <span className="tx-summary-sub">{plSummary.buyCount} {t('tx.transactions')}</span>
          </div>
        </div>

        <div className="tx-summary-card">
          <div className="tx-summary-icon-wrap" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
            <DollarSign size={18} />
          </div>
          <div className="tx-summary-info">
            <span className="tx-summary-label">{t('tx.totalSell')}</span>
            <span className="tx-summary-value">{formatCurrency(plSummary.totalSellRevenue, currency)}</span>
            <span className="tx-summary-sub">{plSummary.sellCount} {t('tx.transactions')}</span>
          </div>
        </div>

        <div className="tx-summary-card">
          <div className="tx-summary-icon-wrap">
            <Activity size={18} />
          </div>
          <div className="tx-summary-info">
            <span className="tx-summary-label">{t('tx.totalActivity')}</span>
            <span className="tx-summary-value">{transactions.length}</span>
            <span className="tx-summary-sub">{plSummary.buyCount} {t('tx.buy').toLowerCase()}, {plSummary.sellCount} {t('tx.sell').toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="tx-toolbar">
        <div className="tx-search-wrap">
          <Search size={15} className="tx-search-icon" />
          <input
            type="text"
            className="tx-search-input"
            placeholder={t('tx.searchPlaceholder')}
            aria-label={t('tx.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="tx-filter-chips">
          {(['all', 'buy', 'sell'] as const).map(act => (
            <button
              key={act}
              type="button"
              className={`filter-chip ${filterAction === act ? 'active' : ''}`}
              onClick={() => setFilterAction(act)}
            >
              {act === 'all'
                ? `${t('holdings.all')} (${transactions.length})`
                : act === 'buy'
                  ? `${t('tx.buy')} (${plSummary.buyCount})`
                  : `${t('tx.sell')} (${plSummary.sellCount})`
              }
            </button>
          ))}
        </div>
      </div>

      <div className="transactions-card">
        {loading ? (
          <div className="transactions-empty">
            <div className="loading-pulse">{t('tx.loading')}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="transactions-empty">
            <Clock size={32} strokeWidth={1.2} />
            <p>{searchQuery ? t('tx.noResults') : t('tx.empty')}</p>
          </div>
        ) : (
          <>
            <div className="transactions-table-wrap has-mobile-cards">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>{t('tx.colDate')}</th>
                    <th>{t('tx.colAsset')}</th>
                    <th>{t('tx.colType')}</th>
                    <th className="th-right">{t('tx.colQty')}</th>
                    <th className="th-right">{t('tx.colPrice')}</th>
                    <th className="th-right">{t('tx.colTotal')}</th>
                    <th className="th-right">{t('tx.colPL')}</th>
                    <th className="th-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx: Transaction) => {
                    const isBuy = tx.action === 'buy';
                    const hasRealizedPl = !isBuy && tx.realized_pl != null;
                    const realizedPlDisplay = hasRealizedPl ? toDisplay(Number(tx.realized_pl!), tx.currency) : 0;
                    const isTxPlPositive = realizedPlDisplay >= 0;
                    const avgCostDisplay = !isBuy && tx.avg_cost_at_sell != null
                      ? toDisplay(Number(tx.avg_cost_at_sell), tx.currency)
                      : null;
                    const realizedPct = avgCostDisplay && avgCostDisplay > 0
                      ? ((toDisplay(Number(tx.price), tx.currency) - avgCostDisplay) / avgCostDisplay) * 100
                      : null;
                    const isStillHeld = activeTickersMap.has(`${tx.ticker}_${tx.asset_type}`);

                    return (
                      <tr
                        key={tx.id}
                        className="tx-row clickable"
                        onClick={() => handleRowClick(tx)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(tx);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`${tx.name} (${tx.ticker}) - ${isBuy ? t('tx.buy') : t('tx.sell')}`}
                      >
                        <td className="tx-date">{formatDate(tx.created_at)}</td>
                        <td>
                          <div className="tx-asset">
                            <span className="tx-asset-name">{tx.name}</span>
                            <span className="tx-asset-ticker-row">
                              <span className="tx-asset-ticker">{tx.ticker}</span>
                              {!isStillHeld && (
                                <span className="tx-sold-badge">{t('tx.soldOut')}</span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`tx-action-badge ${isBuy ? 'buy' : 'sell'}`}>
                            {isBuy ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {isBuy ? t('tx.buy') : t('tx.sell')}
                          </span>
                        </td>
                        <td className="td-right td-mono">
                          {formatQuantity(Number(tx.quantity), tx.asset_type)}
                        </td>
                        <td className="td-right td-mono">
                          {formatCurrency(toDisplay(Number(tx.price), tx.currency), currency)}
                        </td>
                        <td className="td-right td-mono td-bold">
                          {formatCurrency(toDisplay(Number(tx.total), tx.currency), currency)}
                        </td>
                        <td className="td-right">
                          {hasRealizedPl ? (
                            <div className={`pl-cell ${isTxPlPositive ? 'positive' : 'negative'}`}>
                              <span className="pl-amount">
                                {isTxPlPositive ? '+' : ''}{formatCurrency(realizedPlDisplay, currency)}
                              </span>
                              {realizedPct != null && (
                                <span className="pl-pct">
                                  {realizedPct >= 0 ? '+' : ''}{realizedPct.toFixed(2)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="tx-pl-badge neutral">-</span>
                          )}
                        </td>
                        <td className="td-actions">
                          <span className="tx-row-chevron">
                            <ChevronRight size={15} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Reflow (<= 768px): preserves all 7 transaction columns without hiding data */}
            <div className="tx-mobile-list">
              {filtered.map((tx: Transaction) => {
                const isBuy = tx.action === 'buy';
                const hasRealizedPl = !isBuy && tx.realized_pl != null;
                const realizedPlDisplay = hasRealizedPl ? toDisplay(Number(tx.realized_pl!), tx.currency) : 0;
                const isTxPlPositive = realizedPlDisplay >= 0;
                const avgCostDisplay = !isBuy && tx.avg_cost_at_sell != null
                  ? toDisplay(Number(tx.avg_cost_at_sell), tx.currency)
                  : null;
                const realizedPct = avgCostDisplay && avgCostDisplay > 0
                  ? ((toDisplay(Number(tx.price), tx.currency) - avgCostDisplay) / avgCostDisplay) * 100
                  : null;
                const isStillHeld = activeTickersMap.has(`${tx.ticker}_${tx.asset_type}`);

                return (
                  <div
                    key={tx.id}
                    className="tx-mobile-card"
                    onClick={() => handleRowClick(tx)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(tx);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`${tx.name} (${tx.ticker})`}
                  >
                    <div className="tx-mobile-top">
                      <div className="tx-asset">
                        <span className="tx-asset-name">{tx.name}</span>
                        <span className="tx-asset-ticker-row">
                          <span className="tx-asset-ticker">{tx.ticker}</span>
                          {!isStillHeld && (
                            <span className="tx-sold-badge">{t('tx.soldOut')}</span>
                          )}
                          <span className="tx-date" style={{ fontSize: '11px' }}>
                            • {formatDate(tx.created_at)}
                          </span>
                        </span>
                      </div>

                      <span className={`tx-action-badge ${isBuy ? 'buy' : 'sell'}`}>
                        {isBuy ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {isBuy ? t('tx.buy') : t('tx.sell')}
                      </span>
                    </div>

                    <div className="tx-mobile-grid">
                      <div className="holding-mobile-metric">
                        <span className="holding-mobile-label">{t('tx.colQty')} @ {t('tx.colPrice')}</span>
                        <span className="holding-mobile-num">
                          {formatQuantity(Number(tx.quantity), tx.asset_type)} @ {formatCurrency(toDisplay(Number(tx.price), tx.currency), currency)}
                        </span>
                      </div>

                      <div className="holding-mobile-metric">
                        <span className="holding-mobile-label">{t('tx.colTotal')}</span>
                        <span className="holding-mobile-val" style={{ fontSize: '13px' }}>
                          {formatCurrency(toDisplay(Number(tx.total), tx.currency), currency)}
                        </span>
                      </div>

                      <div className="holding-mobile-metric align-right">
                        <span className="holding-mobile-label">{t('tx.colPL')}</span>
                        {hasRealizedPl ? (
                          <span className="pl-amount" style={{ color: isTxPlPositive ? 'var(--green-text)' : 'var(--red)', fontSize: '12px' }}>
                            {isTxPlPositive ? '+' : ''}{formatCurrency(realizedPlDisplay, currency)}
                            {realizedPct != null ? ` (${realizedPct >= 0 ? '+' : ''}${realizedPct.toFixed(1)}%)` : ''}
                          </span>
                        ) : (
                          <span className="tx-pl-badge neutral">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
