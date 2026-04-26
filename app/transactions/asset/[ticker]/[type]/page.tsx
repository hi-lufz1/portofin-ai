'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  Banknote,
  BarChart3,
  CheckCircle2,
  Layers,
  ExternalLink,
  Loader2,
  PackageOpen,
} from 'lucide-react';

export default function AssetHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const { transactions, holdings, loading } = usePortfolio();
  const { formatCurrency, exchangeRate } = useCurrency();
  const { t } = useLanguage();

  const ticker = decodeURIComponent(params.ticker as string);
  const type = params.type as string; // 'crypto' or 'stock'

  // Find the matching holding (if it still exists)
  const activeHolding = holdings.find(
    (h) => h.ticker === ticker && h.type === type
  );

  // All transactions for this asset (across all holdings of same ticker+type)
  const assetTransactions = useMemo(() => {
    const filtered = transactions.filter(
      (tx) => tx.ticker === ticker && tx.type === type
    );
    return [...filtered].sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [transactions, ticker, type]);

  // Reconstruct asset info from transactions
  const assetInfo = useMemo(() => {
    if (activeHolding) {
      return {
        name: activeHolding.name,
        ticker: activeHolding.ticker,
        type: activeHolding.type,
        stillHeld: true,
        holdingId: activeHolding.id,
      };
    }
    // Reconstruct from transactions
    const firstTx = assetTransactions[assetTransactions.length - 1];
    if (!firstTx) return null;
    return {
      name: firstTx.name,
      ticker: firstTx.ticker,
      type: firstTx.type,
      stillHeld: false,
      holdingId: null,
    };
  }, [activeHolding, assetTransactions]);

  // Summary calculations
  const summary = useMemo(() => {
    const buys = assetTransactions.filter((tx) => tx.action === 'buy');
    const sells = assetTransactions.filter((tx) => tx.action === 'sell');

    const totalBuyQty = buys.reduce((s, tx) => s + tx.quantity, 0);
    const totalBuyCost = buys.reduce((s, tx) => {
      const totalIDR = tx.price_currency === 'USD' ? tx.total * exchangeRate : tx.total;
      return s + totalIDR;
    }, 0);
    const totalSellQty = sells.reduce((s, tx) => s + tx.quantity, 0);
    const totalSellRevenue = sells.reduce((s, tx) => {
      const totalIDR = tx.price_currency === 'USD' ? tx.total * exchangeRate : tx.total;
      return s + totalIDR;
    }, 0);

    const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;
    const avgSellPrice = totalSellQty > 0 ? totalSellRevenue / totalSellQty : 0;

    // Net realized P/L
    const realizedPL = sells.reduce((s, tx) => {
      return s + (tx.price - avgBuyPrice) * tx.quantity;
    }, 0);

    // Current holding qty (buy - sell)
    const netQty = totalBuyQty - totalSellQty;

    // First buy date
    const firstDate = buys.length > 0
      ? buys.reduce((oldest, tx) =>
          new Date(tx.date) < new Date(oldest.date) ? tx : oldest
        ).date
      : null;

    // Last activity date
    const lastDate = assetTransactions.length > 0 ? assetTransactions[0].date : null;

    return {
      totalBuyQty,
      totalBuyCost,
      totalSellQty,
      totalSellRevenue,
      avgBuyPrice,
      avgSellPrice,
      realizedPL,
      netQty,
      buyCount: buys.length,
      sellCount: sells.length,
      totalCount: assetTransactions.length,
      firstDate,
      lastDate,
    };
  }, [assetTransactions, exchangeRate]);

  const isStock = type === 'stock';

  // Loading state
  if (loading && assetTransactions.length === 0) {
    return (
      <div className="page-content" id="asset-history-page">
        <div className="detail-loading">
          <Loader2 size={32} className="spin" />
          <span>{t('general.loading')}</span>
        </div>
      </div>
    );
  }

  // No data found
  if (!assetInfo || assetTransactions.length === 0) {
    return (
      <div className="page-content" id="asset-history-page">
        <div className="detail-not-found">
          <PackageOpen size={48} strokeWidth={1.5} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p>{t('history.notFound')}</p>
          <button onClick={() => router.push('/transactions')} className="btn-primary">
            <ArrowLeft size={16} />
            {t('history.backToTransactions')}
          </button>
        </div>
      </div>
    );
  }

  const isRealizedPositive = summary.realizedPL >= 0;

  // Crypto icon mapping
  const cryptoIcons: Record<string, string> = {
    bitcoin: '₿', ethereum: 'Ξ', solana: 'S', cardano: '₳', polkadot: '●', ripple: '✕',
  };

  function getAssetIcon(t: string, tp: string) {
    if (tp === 'crypto') return cryptoIcons[t] || t.charAt(0).toUpperCase();
    return t.substring(0, 2);
  }

  function getAssetColor(t: string, tp: string): string {
    if (tp === 'crypto') {
      const colors: Record<string, string> = {
        bitcoin: '#F7931A', ethereum: '#627EEA', solana: '#9945FF',
        cardano: '#0033AD', polkadot: '#E6007A', ripple: '#23292F',
      };
      return colors[t] || '#6366f1';
    }
    const stockColors: Record<string, string> = {
      BBCA: '#003D79', BBRI: '#00529C', BMRI: '#003366', BBNI: '#F15A22',
      TLKM: '#E31937', ASII: '#003399', GOTO: '#00AA13', BUKA: '#E31C5F', ANTM: '#1A5276',
    };
    return stockColors[t] || '#475569';
  }

  const fmtQty = (qty: number) =>
    isStock
      ? `${(qty / 100).toLocaleString()} lot (${qty.toLocaleString()} ${t('action.shares')})`
      : qty.toLocaleString('en-US', { maximumFractionDigits: 6 });

  return (
    <div className="page-content" id="asset-history-page">
      {/* Back Navigation */}
      <button
        onClick={() => router.push('/transactions')}
        className="detail-back-btn"
        id="history-back-btn"
      >
        <ArrowLeft size={18} />
        <span>{t('history.backToTransactions')}</span>
      </button>

      {/* Hero Section */}
      <div className="detail-hero" id="history-hero">
        <div className="detail-hero-left">
          <div
            className="detail-asset-icon"
            style={{ backgroundColor: getAssetColor(assetInfo.ticker, assetInfo.type) }}
          >
            {getAssetIcon(assetInfo.ticker, assetInfo.type)}
          </div>
          <div className="detail-hero-info">
            <h1 className="detail-asset-name">{assetInfo.name}</h1>
            <div className="detail-asset-meta">
              <span className="detail-ticker">
                {isStock ? assetInfo.ticker : assetInfo.ticker.toUpperCase()}
              </span>
              <span className="detail-type-badge">
                {assetInfo.type === 'crypto' ? 'Crypto' : 'IDX'}
              </span>
              {assetInfo.stillHeld ? (
                <span className="history-status-badge active">{t('history.active')}</span>
              ) : (
                <span className="history-status-badge closed">{t('history.closed')}</span>
              )}
            </div>
          </div>
        </div>

        {assetInfo.stillHeld && activeHolding && (
          <div className="detail-hero-right">
            <button
              className="btn-secondary"
              onClick={() => router.push(`/dashboard/asset/${activeHolding.id}`)}
              id="go-to-detail-btn"
            >
              <ExternalLink size={14} />
              <span>{t('history.viewLiveDetail')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="history-stats-grid" id="history-stats">
        {/* Total Bought */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('history.totalBought')}</span>
            <div className="detail-stat-icon-wrap">
              <ShoppingCart size={16} />
            </div>
          </div>
          <span className="detail-stat-value">{formatCurrency(summary.totalBuyCost)}</span>
          <span className="detail-stat-sub">
            {fmtQty(summary.totalBuyQty)} · {summary.buyCount} {t('history.txCount')}
          </span>
        </div>

        {/* Total Sold */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('history.totalSold')}</span>
            <div className="detail-stat-icon-wrap">
              <Banknote size={16} />
            </div>
          </div>
          <span className="detail-stat-value">{formatCurrency(summary.totalSellRevenue)}</span>
          <span className="detail-stat-sub">
            {fmtQty(summary.totalSellQty)} · {summary.sellCount} {t('history.txCount')}
          </span>
        </div>

        {/* Net Position */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('history.netPosition')}</span>
            <div className="detail-stat-icon-wrap">
              <Layers size={16} />
            </div>
          </div>
          <span className="detail-stat-value small">
            {summary.netQty > 0 ? fmtQty(summary.netQty) : '0'}
          </span>
          <span className="detail-stat-sub">
            {t('history.avgBuy')}: {formatCurrency(summary.avgBuyPrice)}
          </span>
        </div>

        {/* Realized P/L */}
        <div className={`detail-stat-card ${summary.sellCount > 0 ? 'highlight' : ''}`}>
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('detail.realizedPL')}</span>
            <div className={`detail-stat-icon-wrap ${summary.sellCount === 0 ? '' : isRealizedPositive ? 'positive' : 'negative'}`}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className={`detail-stat-value ${summary.sellCount === 0 ? '' : isRealizedPositive ? 'positive' : 'negative'}`}>
            {summary.sellCount === 0
              ? '—'
              : `${isRealizedPositive ? '+' : ''}${formatCurrency(summary.realizedPL)}`}
          </span>
          <span className="detail-stat-sub">
            {summary.sellCount > 0 && summary.avgSellPrice > 0
              ? `${t('history.avgSell')}: ${formatCurrency(summary.avgSellPrice)}`
              : t('history.noSellYet')}
          </span>
        </div>
      </div>

      {/* Timeline info */}
      {summary.firstDate && (
        <div className="history-timeline" id="history-timeline">
          <div className="history-timeline-item">
            <span className="history-timeline-label">{t('history.firstBuy')}</span>
            <span className="history-timeline-value">
              {new Date(summary.firstDate).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          </div>
          <div className="history-timeline-divider" />
          <div className="history-timeline-item">
            <span className="history-timeline-label">{t('history.lastActivity')}</span>
            <span className="history-timeline-value">
              {summary.lastDate
                ? new Date(summary.lastDate).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          <div className="history-timeline-divider" />
          <div className="history-timeline-item">
            <span className="history-timeline-label">{t('history.totalTx')}</span>
            <span className="history-timeline-value">{summary.totalCount} {t('history.txCount')}</span>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="detail-transactions-section" id="history-transactions">
        <h2 className="section-title">{t('detail.transactionHistory')}</h2>
        <div className="detail-tx-card">
          {assetTransactions.length === 0 ? (
            <div className="detail-tx-empty">{t('detail.noTransactions')}</div>
          ) : (
            <div className="detail-tx-list">
              {assetTransactions.map((tx) => {
                const isSell = tx.action === 'sell';
                const txPL = isSell
                  ? (tx.price - summary.avgBuyPrice) * tx.quantity
                  : null;
                const isTxPLPositive = txPL !== null && txPL >= 0;

                return (
                  <div key={tx.id} className="detail-tx-item">
                    <div className="detail-tx-left">
                      <span className={`tx-action-badge ${tx.action}`}>
                        {tx.action === 'buy' ? (
                          <><ArrowDownRight size={12} /> {t('tx.buy')}</>
                        ) : (
                          <><ArrowUpRight size={12} /> {t('tx.sell')}</>
                        )}
                      </span>
                      <div className="detail-tx-info">
                        <span className="detail-tx-qty">
                          {isStock
                            ? `${(tx.quantity / 100).toLocaleString()} lot`
                            : tx.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                        </span>
                        <span className="detail-tx-price">
                          @ {formatCurrency(
                            tx.price_currency === 'USD'
                              ? tx.price * exchangeRate
                              : tx.price
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="detail-tx-right">
                      <span className="detail-tx-total">
                        {formatCurrency(
                          tx.price_currency === 'USD'
                            ? tx.total * exchangeRate
                            : tx.total
                        )}
                      </span>
                      {txPL !== null && (
                        <span className={`detail-tx-pl ${isTxPLPositive ? 'positive' : 'negative'}`}>
                          {isTxPLPositive ? '+' : ''}{formatCurrency(txPL)}
                        </span>
                      )}
                      <span className="detail-tx-date">
                        {new Date(tx.date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                      {tx.note && <span className="detail-tx-note">{tx.note}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
