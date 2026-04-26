'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  ShoppingCart, Banknote, BarChart3, Search, ChevronRight,
} from 'lucide-react';
import type { Transaction } from '@/types';

type FilterAction = 'all' | 'buy' | 'sell';

/**
 * Calculate realized P/L for a sell transaction using average cost basis
 * from all buy transactions of the same ticker before (or at) the sell date.
 */
function calcSellPL(sell: Transaction, allTx: Transaction[]): number {
  const buys = allTx.filter(
    (tx) => tx.action === 'buy' && tx.ticker === sell.ticker && tx.type === sell.type
  );
  if (buys.length === 0) return 0;

  const totalBuyQty = buys.reduce((s, b) => s + b.quantity, 0);
  const totalBuyCost = buys.reduce((s, b) => s + b.total, 0);
  const avgCost = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

  return (sell.price - avgCost) * sell.quantity;
}

export default function TransactionsPage() {
  const { transactions, holdings } = usePortfolio();
  const { formatCurrency, exchangeRate } = useCurrency();
  const { t } = useLanguage();
  const router = useRouter();

  /** Normalize a USD amount to IDR so formatCurrency can handle the toggle */
  const toIDR = (amount: number, currency: string): number =>
    currency === 'USD' ? amount * exchangeRate : amount;

  const [filterAction, setFilterAction] = useState<FilterAction>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply filters and search
  const filtered = useMemo(() => {
    let result = [...transactions];

    // Filter by action type
    if (filterAction !== 'all') {
      result = result.filter((tx) => tx.action === filterAction);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (tx) =>
          tx.name.toLowerCase().includes(q) ||
          tx.ticker.toLowerCase().includes(q) ||
          (tx.note && tx.note.toLowerCase().includes(q))
      );
    }

    return result;
  }, [transactions, filterAction, searchQuery]);

  // Sort newest first
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [filtered]
  );

  // Summary calculations (always from full transactions, not filtered)
  // Convert all amounts to IDR for consistent summing
  const summary = useMemo(() => {
    const buyTxs = transactions.filter((tx) => tx.action === 'buy');
    const sellTxs = transactions.filter((tx) => tx.action === 'sell');

    const totalBuy = buyTxs.reduce((s, tx) => s + toIDR(tx.total, tx.price_currency), 0);
    const totalSell = sellTxs.reduce((s, tx) => s + toIDR(tx.total, tx.price_currency), 0);
    const totalRealizedPL = sellTxs.reduce(
      (s, tx) => s + calcSellPL(tx, transactions), 0
    );

    // Unique assets traded (including ones no longer held)
    const uniqueAssets = new Set(transactions.map((tx) => `${tx.ticker}:${tx.type}`));

    return { totalBuy, totalSell, totalRealizedPL, uniqueAssets: uniqueAssets.size, txCount: transactions.length };
  }, [transactions, exchangeRate]);

  // Navigate to asset history page (always works, even for sold assets)
  const handleRowClick = (tx: Transaction) => {
    // First try navigating to active holding detail
    const activeHolding = tx.holding_id
      ? holdings.find((h) => h.id === tx.holding_id)
      : holdings.find((h) => h.ticker === tx.ticker && h.type === tx.type);

    if (activeHolding) {
      router.push(`/dashboard/asset/${activeHolding.id}`);
    } else {
      // Navigate to asset history page (works for sold/deleted assets)
      router.push(`/transactions/asset/${encodeURIComponent(tx.ticker)}/${tx.type}`);
    }
  };

  const isRealizedPositive = summary.totalRealizedPL >= 0;

  return (
    <div className="page-content" id="transactions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('tx.title')}</h1>
          <p className="page-subtitle">{t('tx.subtitle')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <div className="tx-summary-grid" id="tx-summary">
          <div className={`tx-summary-card ${isRealizedPositive ? 'positive' : 'negative'}`}>
            <div className="tx-summary-icon-wrap">
              {isRealizedPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
            <div className="tx-summary-info">
              <span className="tx-summary-label">{t('tx.realizedPL')}</span>
              <span className={`tx-summary-value ${isRealizedPositive ? 'positive' : 'negative'}`}>
                {isRealizedPositive ? '+' : ''}{formatCurrency(summary.totalRealizedPL)}
              </span>
            </div>
          </div>

          <div className="tx-summary-card">
            <div className="tx-summary-icon-wrap buy">
              <ShoppingCart size={18} />
            </div>
            <div className="tx-summary-info">
              <span className="tx-summary-label">{t('tx.totalBuy')}</span>
              <span className="tx-summary-value">{formatCurrency(summary.totalBuy)}</span>
            </div>
          </div>

          <div className="tx-summary-card">
            <div className="tx-summary-icon-wrap sell">
              <Banknote size={18} />
            </div>
            <div className="tx-summary-info">
              <span className="tx-summary-label">{t('tx.totalSell')}</span>
              <span className="tx-summary-value">{formatCurrency(summary.totalSell)}</span>
            </div>
          </div>

          <div className="tx-summary-card">
            <div className="tx-summary-icon-wrap neutral">
              <BarChart3 size={18} />
            </div>
            <div className="tx-summary-info">
              <span className="tx-summary-label">{t('tx.totalTx')}</span>
              <span className="tx-summary-value">{summary.txCount} <span className="tx-summary-sub">({summary.uniqueAssets} {t('tx.assets')})</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Filters */}
      <div className="tx-toolbar" id="tx-toolbar">
        <div className="tx-search-wrap">
          <Search size={16} className="tx-search-icon" />
          <input
            type="text"
            className="tx-search-input"
            placeholder={t('tx.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="tx-search-input"
          />
        </div>
        <div className="tx-filter-chips">
          {(['all', 'buy', 'sell'] as FilterAction[]).map((action) => (
            <button
              key={action}
              className={`filter-chip ${filterAction === action ? 'active' : ''}`}
              onClick={() => setFilterAction(action)}
              id={`tx-filter-${action}`}
            >
              {action === 'all' ? t('holdings.all') : action === 'buy' ? t('tx.buy') : t('tx.sell')}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="transactions-section" id="transactions-section">
        <div className="transactions-table-wrap">
          <table className="transactions-table" id="transactions-table">
            <thead>
              <tr>
                <th>{t('tx.date')}</th>
                <th>{t('tx.asset')}</th>
                <th>{t('tx.type')}</th>
                <th className="text-right">{t('tx.qty')}</th>
                <th className="text-right">{t('tx.price')}</th>
                <th className="text-right">{t('tx.total')}</th>
                <th className="text-right">{t('tx.pl')}</th>
                <th className="text-right hide-mobile" style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="transactions-empty">
                    {searchQuery.trim() || filterAction !== 'all'
                      ? t('tx.noResults')
                      : t('tx.empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((tx) => {
                  // Check if the holding still exists
                  const holdingExists = tx.holding_id
                    ? holdings.some((h) => h.id === tx.holding_id)
                    : holdings.some((h) => h.ticker === tx.ticker && h.type === tx.type);

                  // Calculate P/L for sell transactions
                  let pl: number | null = null;
                  if (tx.action === 'sell') {
                    pl = calcSellPL(tx, transactions);
                  }
                  const plPositive = pl !== null && pl >= 0;

                  return (
                    <tr
                      key={tx.id}
                      className="tx-row clickable"
                      id={`tx-${tx.id}`}
                      onClick={() => handleRowClick(tx)}
                    >
                      <td className="tabular tx-date">
                        {new Date(tx.date).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td>
                        <div className="tx-asset-info">
                          <span className="tx-asset-name">{tx.name}</span>
                          <div className="tx-asset-ticker-row">
                            <span className="tx-asset-ticker">{tx.ticker}</span>
                            {!holdingExists && (
                              <span className="tx-sold-badge">{t('tx.soldOut')}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`tx-action-badge ${tx.action}`}>
                          {tx.action === 'buy' ? (
                            <><ArrowDownRight size={12} /> {t('tx.buy')}</>
                          ) : (
                            <><ArrowUpRight size={12} /> {t('tx.sell')}</>
                          )}
                        </span>
                      </td>
                      <td className="text-right tabular">
                        {tx.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="text-right tabular">
                        {formatCurrency(toIDR(tx.price, tx.price_currency))}
                      </td>
                      <td className="text-right tabular font-medium">
                        {formatCurrency(toIDR(tx.total, tx.price_currency))}
                      </td>
                      <td className="text-right tabular">
                        {pl !== null ? (
                          <span className={`tx-pl-badge ${plPositive ? 'positive' : 'negative'}`}>
                            {plPositive ? '+' : ''}{formatCurrency(pl)}
                          </span>
                        ) : (
                          <span className="tx-pl-badge neutral">—</span>
                        )}
                      </td>
                      <td className="text-right hide-mobile">
                        <ChevronRight size={16} className="tx-row-chevron" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
