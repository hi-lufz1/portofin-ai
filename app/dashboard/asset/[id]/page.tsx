'use client';

import { useParams, useRouter } from 'next/navigation';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  ArrowDownCircle,
  Pencil,
  Trash2,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Layers,
  Loader2,
} from 'lucide-react';
import HoldingActionModal, { type HoldingAction } from '@/components/HoldingActionModal';

// Crypto icon mapping
const cryptoIcons: Record<string, string> = {
  bitcoin: '₿', ethereum: 'Ξ', solana: 'S', cardano: '₳', polkadot: '●', ripple: '✕',
};

function getAssetIcon(ticker: string, type: string) {
  if (type === 'crypto') return cryptoIcons[ticker] || ticker.charAt(0).toUpperCase();
  return ticker.substring(0, 2);
}

function getAssetColor(ticker: string, type: string): string {
  if (type === 'crypto') {
    const colors: Record<string, string> = {
      bitcoin: '#F7931A', ethereum: '#627EEA', solana: '#9945FF',
      cardano: '#0033AD', polkadot: '#E6007A', ripple: '#23292F',
    };
    return colors[ticker] || '#6366f1';
  }
  const stockColors: Record<string, string> = {
    BBCA: '#003D79', BBRI: '#00529C', BMRI: '#003366', BBNI: '#F15A22',
    TLKM: '#E31937', ASII: '#003399', GOTO: '#00AA13', BUKA: '#E31C5F', ANTM: '#1A5276',
  };
  return stockColors[ticker] || '#475569';
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { holdings, transactions, loading } = usePortfolio();
  const { formatCurrency, exchangeRate } = useCurrency();
  const { t } = useLanguage();

  const [actionType, setActionType] = useState<HoldingAction>(null);

  const holdingId = params.id as string;
  const holding = holdings.find((h) => h.id === holdingId);

  // Filter & sort transactions for this asset (newest first)
  const assetTransactions = useMemo(() => {
    const filtered = transactions.filter((tx) =>
      tx.holding_id === holdingId ||
      (tx.ticker === holding?.ticker && tx.type === holding?.type && !tx.holding_id)
    );
    return [...filtered].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [transactions, holdingId, holding?.ticker, holding?.type]);

  // Calculate realized P/L from sell transactions
  const realizedPL = useMemo(() => {
    if (!holding) return 0;
    return assetTransactions
      .filter((tx) => tx.action === 'sell')
      .reduce((sum, tx) => {
        // Realized = (sell_price - avg_buy_price) × quantity
        const profit = (tx.price - holding.avg_buy_price) * tx.quantity;
        return sum + profit;
      }, 0);
  }, [assetTransactions, holding]);

  if (loading && !holding) {
    return (
      <div className="page-content" id="asset-detail-page">
        <div className="detail-loading">
          <Loader2 size={32} className="spin" />
          <span>{t('general.loading')}</span>
        </div>
      </div>
    );
  }

  if (!holding) {
    // Try to find matching transactions to redirect to asset history
    const matchingTx = transactions.find((tx) => tx.holding_id === holdingId);

    return (
      <div className="page-content" id="asset-detail-page">
        <div className="detail-not-found">
          <p>{t('detail.notFound')}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.5 }}>
            {t('detail.notFoundHint')}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard')} className="btn-secondary">
              <ArrowLeft size={16} />
              {t('detail.backToDashboard')}
            </button>
            {matchingTx && (
              <button
                onClick={() => router.push(`/transactions/asset/${encodeURIComponent(matchingTx.ticker)}/${matchingTx.type}`)}
                className="btn-primary"
              >
                {t('detail.viewHistory')}
              </button>
            )}
            {!matchingTx && (
              <button onClick={() => router.push('/transactions')} className="btn-primary">
                {t('history.backToTransactions')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const floatingPL = holding.profit_loss;
  const floatingPLPct = holding.profit_loss_pct;
  const totalPL = floatingPL + realizedPL;
  const isTotalPLPositive = totalPL >= 0;
  const isFloatingPositive = floatingPL >= 0;
  const isRealizedPositive = realizedPL >= 0;
  const isDayPositive = (holding.price_change_24h ?? 0) >= 0;
  const isStock = holding.type === 'stock';
  const qtyDisplay = isStock
    ? `${(holding.quantity / 100).toLocaleString()} lot (${holding.quantity.toLocaleString()} ${t('action.shares')})`
    : holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 });

  return (
    <div className="page-content" id="asset-detail-page">
      {/* Back Navigation */}
      <button
        onClick={() => router.push('/dashboard')}
        className="detail-back-btn"
        id="detail-back-btn"
      >
        <ArrowLeft size={18} />
        <span>{t('detail.backToDashboard')}</span>
      </button>

      {/* Hero Section */}
      <div className="detail-hero" id="detail-hero">
        <div className="detail-hero-left">
          <div
            className="detail-asset-icon"
            style={{ backgroundColor: getAssetColor(holding.ticker, holding.type) }}
          >
            {getAssetIcon(holding.ticker, holding.type)}
          </div>
          <div className="detail-hero-info">
            <h1 className="detail-asset-name">{holding.name}</h1>
            <div className="detail-asset-meta">
              <span className="detail-ticker">
                {isStock ? holding.ticker : holding.ticker.toUpperCase()}
              </span>
              <span className="detail-type-badge">
                {holding.type === 'crypto' ? 'Crypto' : 'IDX'}
              </span>
              {holding.type === 'crypto' && holding.buy_price_currency && (
                <span className={`detail-cur-badge ${holding.buy_price_currency === 'USD' ? 'usd' : ''}`}>
                  {holding.buy_price_currency}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="detail-hero-right">
          <div className="detail-current-price">
            <span className="detail-price-label">{t('detail.currentPrice')}</span>
            <span className="detail-price-value">{formatCurrency(holding.current_price)}</span>
          </div>
          <span className={`change-badge ${isDayPositive ? 'positive' : 'negative'}`}>
            {isDayPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isDayPositive ? '+' : ''}{(holding.price_change_24h ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Stats Grid — 5 cards */}
      <div className="detail-stats-grid" id="detail-stats">
        {/* Total Value */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('detail.totalValue')}</span>
            <div className="detail-stat-icon-wrap">
              <DollarSign size={16} />
            </div>
          </div>
          <span className="detail-stat-value">{formatCurrency(holding.current_value)}</span>
          <span className="detail-stat-sub">
            {t('detail.avgPrice')}: {formatCurrency(
              holding.buy_price_currency === 'USD'
                ? holding.avg_buy_price * exchangeRate
                : holding.avg_buy_price
            )}
          </span>
        </div>

        {/* Holdings */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('detail.quantity')}</span>
            <div className="detail-stat-icon-wrap">
              <Layers size={16} />
            </div>
          </div>
          <span className="detail-stat-value small">{qtyDisplay}</span>
          <span className="detail-stat-sub">
            {t('detail.totalInvested')}: {formatCurrency(holding.total_invested)}
          </span>
        </div>

        {/* Floating P/L (Unrealized) */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('detail.floatingPL')}</span>
            <div className={`detail-stat-icon-wrap ${isFloatingPositive ? 'positive' : 'negative'}`}>
              {isFloatingPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          </div>
          <span className={`detail-stat-value ${isFloatingPositive ? 'positive' : 'negative'}`}>
            {isFloatingPositive ? '+' : ''}{formatCurrency(floatingPL)}
          </span>
          <span className={`detail-stat-sub ${isFloatingPositive ? 'positive' : 'negative'}`}>
            {isFloatingPositive ? '+' : ''}{floatingPLPct.toFixed(2)}% · {t('detail.unrealized')}
          </span>
        </div>

        {/* Realized P/L */}
        <div className="detail-stat-card">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('detail.realizedPL')}</span>
            <div className={`detail-stat-icon-wrap ${isRealizedPositive ? 'positive' : 'negative'}`}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className={`detail-stat-value ${realizedPL === 0 ? '' : isRealizedPositive ? 'positive' : 'negative'}`}>
            {realizedPL === 0 ? formatCurrency(0) : `${isRealizedPositive ? '+' : ''}${formatCurrency(realizedPL)}`}
          </span>
          <span className="detail-stat-sub">
            {assetTransactions.filter(tx => tx.action === 'sell').length} {t('detail.sellTx')}
          </span>
        </div>

        {/* Total P/L */}
        <div className="detail-stat-card highlight">
          <div className="detail-stat-header">
            <span className="detail-stat-label">{t('detail.totalPL')}</span>
            <div className={`detail-stat-icon-wrap ${isTotalPLPositive ? 'positive' : 'negative'}`}>
              <BarChart3 size={16} />
            </div>
          </div>
          <span className={`detail-stat-value ${isTotalPLPositive ? 'positive' : 'negative'}`}>
            {isTotalPLPositive ? '+' : ''}{formatCurrency(totalPL)}
          </span>
          <span className="detail-stat-sub">
            {t('detail.floatingShort')} + {t('detail.realizedShort')}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="detail-actions-section" id="detail-actions">
        <h2 className="section-title">{t('detail.manageAsset')}</h2>
        <div className="detail-action-buttons">
          <button
            className="detail-action-btn sell"
            onClick={() => setActionType('sell')}
            id="detail-sell-btn"
          >
            <ArrowDownCircle size={18} />
            <span>{t('action.sell')}</span>
          </button>
          <button
            className="detail-action-btn edit"
            onClick={() => setActionType('edit')}
            id="detail-edit-btn"
          >
            <Pencil size={18} />
            <span>{t('action.edit')}</span>
          </button>
          <button
            className="detail-action-btn delete"
            onClick={() => setActionType('delete')}
            id="detail-delete-btn"
          >
            <Trash2 size={18} />
            <span>{t('action.delete')}</span>
          </button>
        </div>
      </div>

      {/* Transaction History for this Asset */}
      <div className="detail-transactions-section" id="detail-transactions">
        <h2 className="section-title">{t('detail.transactionHistory')}</h2>
        <div className="detail-tx-card">
          {assetTransactions.length === 0 ? (
            <div className="detail-tx-empty">{t('detail.noTransactions')}</div>
          ) : (
            <div className="detail-tx-list">
              {assetTransactions.map((tx) => {
                // Calculate P/L for sell transactions
                const isSell = tx.action === 'sell';
                const txPL = isSell ? (tx.price - holding.avg_buy_price) * tx.quantity : null;
                const isTxPLPositive = txPL !== null && txPL >= 0;

                return (
                  <div key={tx.id} className="detail-tx-item">
                    <div className="detail-tx-left">
                      <span className={`tx-action-badge ${tx.action}`}>
                        {tx.action === 'buy' ? t('tx.buy') : t('tx.sell')}
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

      {/* Action Modal */}
      <HoldingActionModal
        holding={holding}
        action={actionType}
        onClose={() => setActionType(null)}
        onSuccess={(completedAction) => {
          if (completedAction === 'delete') {
            router.push('/dashboard');
          }
        }}
      />
    </div>
  );
}
