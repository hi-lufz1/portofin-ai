'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TransactionTable() {
  const { transactions, holdings } = usePortfolio();
  const { formatCurrency, exchangeRate } = useCurrency();
  const { t } = useLanguage();
  const router = useRouter();

  /** Normalize a transaction amount to IDR so formatCurrency can handle the toggle */
  const toIDR = (amount: number, currency: string) =>
    currency === 'USD' ? amount * exchangeRate : amount;

  // Sort transactions newest first
  const sorted = useMemo(() =>
    [...transactions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [transactions]
  );

  const handleRowClick = (holdingId: string | null, ticker: string, type: string) => {
    // Try to find the holding by ID first
    if (holdingId) {
      const exists = holdings.find((h) => h.id === holdingId);
      if (exists) {
        router.push(`/dashboard/asset/${holdingId}`);
        return;
      }
    }
    // Fallback: find by ticker+type
    const match = holdings.find((h) => h.ticker === ticker && h.type === type);
    if (match) {
      router.push(`/dashboard/asset/${match.id}`);
    }
  };

  return (
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
              <th>{t('tx.note')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="transactions-empty">
                  {t('tx.empty')}
                </td>
              </tr>
            ) : (
              sorted.map((tx) => {
                // Check if the holding still exists (for clickability)
                const holdingExists = tx.holding_id
                  ? holdings.some((h) => h.id === tx.holding_id)
                  : holdings.some((h) => h.ticker === tx.ticker && h.type === tx.type);

                return (
                  <tr
                    key={tx.id}
                    className={`tx-row ${holdingExists ? 'clickable' : ''}`}
                    id={`tx-${tx.id}`}
                    onClick={() => holdingExists && handleRowClick(tx.holding_id, tx.ticker, tx.type)}
                  >
                    <td className="tabular tx-date">
                      {new Date(tx.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <div className="tx-asset-info">
                        <span className="tx-asset-name">{tx.name}</span>
                        <span className="tx-asset-ticker">{tx.ticker}</span>
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
                    <td className="tx-note">{tx.note || '—'}</td>
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
