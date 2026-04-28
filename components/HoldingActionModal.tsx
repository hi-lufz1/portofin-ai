'use client';

import { useState, useEffect } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import type { EnrichedHolding } from '@/types';

export type HoldingAction = 'sell' | 'edit' | 'delete' | null;

interface HoldingActionModalProps {
  holding: EnrichedHolding | null;
  action: HoldingAction;
  onClose: () => void;
  onSuccess?: (action: HoldingAction) => void;
}

export default function HoldingActionModal({ holding, action, onClose, onSuccess }: HoldingActionModalProps) {
  const { sellHolding, editHolding, deleteHolding } = usePortfolio();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();

  // Sell state
  const [sellQty, setSellQty] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellNote, setSellNote] = useState('');

  // Edit state
  const [editQty, setEditQty] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (holding && action === 'sell') {
      setSellQty('');
      setSellPrice(String(Math.round(holding.current_price)));
      setSellNote('');
      setError('');
    } else if (holding && action === 'edit') {
      setEditQty(String(holding.type === 'stock' ? holding.quantity / 100 : holding.quantity));
      setEditAvgPrice(String(holding.avg_buy_price));
      setError('');
    }
  }, [holding, action]);

  if (!holding || !action) return null;

  const isStock = holding.type === 'stock';

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(sellQty);
    const actualQty = isStock ? qty * 100 : qty;
    const price = parseFloat(sellPrice);

    if (!qty || !price) return;
    if (actualQty > holding.quantity) {
      setError(t('action.sellExceed'));
      return;
    }

    setSubmitting(true);
    try {
      await sellHolding(holding.id, actualQty, price, sellNote || undefined);
      onClose();
      onSuccess?.('sell');
    } catch (err) {
      console.error('Sell failed:', err);
      setError(t('action.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(editQty);
    const actualQty = isStock ? qty * 100 : qty;
    const avgPrice = parseFloat(editAvgPrice);

    if (!qty || !avgPrice) return;

    setSubmitting(true);
    try {
      await editHolding(holding.id, {
        quantity: actualQty,
        avg_buy_price: avgPrice,
      });
      onClose();
      onSuccess?.('edit');
    } catch (err) {
      console.error('Edit failed:', err);
      setError(t('action.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await deleteHolding(holding.id);
      onClose();
      onSuccess?.('delete');
    } catch (err) {
      console.error('Delete failed:', err);
      setError(t('action.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const maxQtyDisplay = isStock ? holding.quantity / 100 : holding.quantity;

  return (
    <div className="modal-overlay" onClick={onClose} id="holding-action-modal-overlay">
      <div className="modal-content modal-compact" onClick={(e) => e.stopPropagation()} id="holding-action-modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {action === 'sell' && `${t('action.sell')} ${holding.name}`}
            {action === 'edit' && `${t('action.edit')} ${holding.name}`}
            {action === 'delete' && `${t('action.delete')} ${holding.name}`}
          </h2>
          <button onClick={onClose} className="modal-close-btn" id="action-modal-close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="action-error">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* ========== SELL FORM ========== */}
        {action === 'sell' && (
          <form onSubmit={handleSell} className="modal-form">
            <div className="modal-selected-asset">
              <div>
                <span className="selected-asset-name">{holding.name}</span>
                <span className="selected-asset-ticker">{holding.ticker.toUpperCase()}</span>
              </div>
              <div className="action-holding-info">
                <span className="action-holding-label">{t('action.owned')}</span>
                <span className="action-holding-value">
                  {isStock
                    ? `${(holding.quantity / 100).toLocaleString()} lot (${holding.quantity.toLocaleString()} lbr)`
                    : holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="sell-qty" className="form-label">
                {isStock ? t('action.sellLots') : t('action.sellAmount')}
              </label>
              <input
                id="sell-qty"
                type="number"
                step={isStock ? '1' : 'any'}
                min={isStock ? '1' : '0.000001'}
                max={maxQtyDisplay}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
                placeholder={isStock ? `Max: ${maxQtyDisplay}` : `Max: ${maxQtyDisplay}`}
                className="form-input"
                required
              />
              {isStock && sellQty && (
                <span className="form-hint">
                  {sellQty} lot = {parseInt(sellQty) * 100} {t('action.shares')}
                </span>
              )}
              <button
                type="button"
                className="btn-link"
                onClick={() => setSellQty(String(maxQtyDisplay))}
              >
                {t('action.sellAll')}
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="sell-price" className="form-label">
                {t('action.sellPrice')} {isStock && '(per lembar)'}
              </label>
              <input
                id="sell-price"
                type="number"
                step="any"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="form-input"
                required
              />
            </div>

            {sellQty && sellPrice && (
              <div className="form-total">
                <span className="form-total-label">{t('action.totalReceive')}</span>
                <span className="form-total-value">
                  {formatCurrency((isStock ? parseInt(sellQty) * 100 : parseFloat(sellQty)) * parseFloat(sellPrice))}
                </span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="sell-note" className="form-label">{t('modal.note')}</label>
              <input
                id="sell-note"
                type="text"
                value={sellNote}
                onChange={(e) => setSellNote(e.target.value)}
                placeholder={t('modal.notePlaceholder')}
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('modal.back')}
              </button>
              <button type="submit" disabled={submitting || !sellQty || !sellPrice} className="btn-danger" id="submit-sell">
                {submitting ? <Loader2 size={14} className="spin" /> : t('action.confirmSell')}
              </button>
            </div>
          </form>
        )}

        {/* ========== EDIT FORM ========== */}
        {action === 'edit' && (
          <form onSubmit={handleEdit} className="modal-form">
            <div className="form-group">
              <label htmlFor="edit-qty" className="form-label">
                {isStock ? t('modal.lots') : t('modal.amount')}
              </label>
              <input
                id="edit-qty"
                type="number"
                step={isStock ? '1' : 'any'}
                min={isStock ? '1' : '0.000001'}
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="form-input"
                required
              />
              {isStock && editQty && (
                <span className="form-hint">
                  {editQty} lot = {parseInt(editQty) * 100} {t('action.shares')}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="edit-price" className="form-label">
                {t('action.avgBuyPrice')}
              </label>
              <input
                id="edit-price"
                type="number"
                step="any"
                min="0"
                value={editAvgPrice}
                onChange={(e) => setEditAvgPrice(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('modal.back')}
              </button>
              <button type="submit" disabled={submitting || !editQty || !editAvgPrice} className="btn-primary" id="submit-edit">
                {submitting ? <Loader2 size={14} className="spin" /> : t('action.saveChanges')}
              </button>
            </div>
          </form>
        )}

        {/* ========== DELETE CONFIRM ========== */}
        {action === 'delete' && (
          <div className="modal-form">
            <div className="delete-warning">
              <AlertTriangle size={40} className="delete-warning-icon" />
              <p className="delete-warning-text">
                {t('action.deleteWarning', { name: holding.name })}
              </p>
              <div className="delete-warning-detail">
                <span>{isStock ? `${(holding.quantity / 100).toLocaleString()} lot` : holding.quantity.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
                <span>{formatCurrency(holding.current_value)}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-secondary">
                {t('modal.back')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="btn-danger"
                id="submit-delete"
              >
                {submitting ? <Loader2 size={14} className="spin" /> : t('action.confirmDelete')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
