'use client';

import { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Search, Plus, Bitcoin, Landmark, Loader2 } from 'lucide-react';
import { searchCrypto, searchStocks } from '@/lib/prices';
import type { AddAssetFormData, AssetSearchResult, AssetType } from '@/types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddAssetModal({ isOpen, onClose }: AddAssetModalProps) {
  const { addHolding } = usePortfolio();
  const { formatCurrency, exchangeRate } = useCurrency();
  const { t } = useLanguage();
  const [step, setStep] = useState<'search' | 'form'>('search');
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceCurrency, setPriceCurrency] = useState<'IDR' | 'USD'>('IDR');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('search');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedAsset(null);
      setQuantity('');
      setBuyPrice('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setFetchingPrice(false);
      setPriceCurrency('IDR');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        if (assetType === 'crypto') {
          const results = await searchCrypto(searchQuery);
          setSearchResults(results);
        } else {
          const results = await searchStocks(searchQuery);
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, assetType]);

  // Fetch current price when asset is selected
  const fetchCurrentPrice = async (asset: AssetSearchResult, currency: 'IDR' | 'USD' = 'IDR') => {
    setFetchingPrice(true);
    try {
      if (asset.type === 'crypto' && asset.coingecko_id) {
        const vs = currency === 'USD' ? 'usd' : 'idr';
        const res = await fetch(
          `/api/crypto-price?ids=${asset.coingecko_id}&vs_currencies=${vs}`
        );
        const data = await res.json();
        const price = data[asset.coingecko_id]?.[vs];
        if (price) {
          setBuyPrice(currency === 'USD' ? String(price) : String(Math.round(price)));
        }
      } else {
        const res = await fetch(`/api/stock-price?ticker=${encodeURIComponent(asset.ticker)}`);
        if (res.ok) {
          const data = await res.json();
          const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price) setBuyPrice(String(Math.round(price)));
        }
      }
    } catch (err) {
      console.error('Failed to fetch current price:', err);
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSelectAsset = (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setStep('form');
    fetchCurrentPrice(asset);
  };

  // For stocks: 1 lot = 100 shares
  const getActualQuantity = (): number => {
    const qty = parseFloat(quantity) || 0;
    return assetType === 'stock' ? qty * 100 : qty;
  };

  const getTotalCost = (): number => {
    const price = parseFloat(buyPrice) || 0;
    return getActualQuantity() * price;
  };

  // Display total in IDR for reference (convert if USD)
  const getTotalCostIDR = (): number => {
    const total = getTotalCost();
    if (assetType === 'crypto' && priceCurrency === 'USD') {
      return total * exchangeRate;
    }
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !quantity || !buyPrice) return;

    setSubmitting(true);
    try {
      await addHolding({
        ticker: selectedAsset.ticker,
        name: selectedAsset.name,
        type: selectedAsset.type,
        quantity: getActualQuantity(),
        buy_price: parseFloat(buyPrice),
        buy_price_currency: assetType === 'crypto' ? priceCurrency : 'IDR',
        coingecko_id: selectedAsset.coingecko_id,
        note: note || undefined,
        date: date || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add holding:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} id="add-asset-modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} id="add-asset-modal">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {step === 'search' ? t('modal.addAsset') : `${t('modal.buy')} ${selectedAsset?.name}`}
          </h2>
          <button onClick={onClose} className="modal-close-btn" id="modal-close">
            <X size={18} />
          </button>
        </div>

        {step === 'search' ? (
          <>
            {/* Asset Type Toggle */}
            <div className="modal-type-toggle">
              <button
                className={`type-toggle-btn ${assetType === 'crypto' ? 'active' : ''}`}
                onClick={() => { setAssetType('crypto'); setSearchQuery(''); setSearchResults([]); }}
                id="type-crypto"
              >
                <Bitcoin size={16} />
                {t('modal.crypto')}
              </button>
              <button
                className={`type-toggle-btn ${assetType === 'stock' ? 'active' : ''}`}
                onClick={() => { setAssetType('stock'); setSearchQuery(''); setSearchResults([]); }}
                id="type-stock"
              >
                <Landmark size={16} />
                {t('modal.stocks')}
              </button>
            </div>

            {/* Search Input */}
            <div className="modal-search-wrap">
              <Search size={16} className="modal-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={assetType === 'crypto' ? t('modal.searchCrypto') : t('modal.searchStock')}
                className="modal-search-input"
                id="asset-search-input"
              />
            </div>

            {/* Search Results */}
            <div className="modal-search-results">
              {searching && (
                <div className="modal-searching">{t('modal.searching')}</div>
              )}
              {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="modal-no-results">{t('modal.noResults')}</div>
              )}
              {searchResults.map((result) => (
                <button
                  key={result.coingecko_id || result.ticker}
                  className="search-result-item"
                  onClick={() => handleSelectAsset(result)}
                  id={`result-${result.coingecko_id || result.ticker}`}
                >
                  <div className="search-result-info">
                    <span className="search-result-name">{result.name}</span>
                    <span className="search-result-ticker">
                      {result.ticker}
                      {result.exchange && <span className="search-result-exchange"> · {result.exchange}</span>}
                    </span>
                  </div>
                  <Plus size={16} className="search-result-add" />
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Buy Form */
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-selected-asset">
              <span className="selected-asset-name">{selectedAsset?.name}</span>
              <span className="selected-asset-ticker">
                {selectedAsset?.ticker.toUpperCase()}
                {selectedAsset?.exchange && ` · ${selectedAsset.exchange}`}
              </span>
            </div>

            {/* Quantity — Lot for stocks, Amount for crypto */}
            <div className="form-group">
              <label htmlFor="quantity" className="form-label">
                {assetType === 'stock' ? t('modal.lots') : t('modal.amount')}
              </label>
              <input
                id="quantity"
                type="number"
                step={assetType === 'crypto' ? 'any' : '1'}
                min={assetType === 'crypto' ? '0' : '1'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={assetType === 'crypto' ? '0.001' : '1'}
                className="form-input"
                required
              />
              {assetType === 'stock' && quantity && (
                <span className="form-hint">
                  {quantity} {t('modal.lotInfo', { n: String(parseInt(quantity) * 100) })}
                </span>
              )}
            </div>

            {/* Buy Price */}
            <div className="form-group">
              <label htmlFor="buy-price" className="form-label">
                {assetType === 'stock' ? t('modal.buyPrice') : t('modal.buyPriceCrypto')}
              </label>
              {assetType === 'crypto' && (
                <div className="price-currency-toggle">
                  <button
                    type="button"
                    className={`price-cur-btn ${priceCurrency === 'IDR' ? 'active' : ''}`}
                    onClick={() => { setPriceCurrency('IDR'); setBuyPrice(''); if (selectedAsset) fetchCurrentPrice(selectedAsset, 'IDR'); }}
                  >IDR</button>
                  <button
                    type="button"
                    className={`price-cur-btn ${priceCurrency === 'USD' ? 'active' : ''}`}
                    onClick={() => { setPriceCurrency('USD'); setBuyPrice(''); if (selectedAsset) fetchCurrentPrice(selectedAsset, 'USD'); }}
                  >USD</button>
                </div>
              )}
              <div className="form-input-wrap">
                <input
                  id="buy-price"
                  type="number"
                  step="any"
                  min="0"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder={fetchingPrice ? t('modal.fetchingPrice') : (priceCurrency === 'USD' && assetType === 'crypto' ? '$ 0' : 'Rp 0')}
                  className="form-input"
                  required
                  disabled={fetchingPrice}
                />
                {fetchingPrice && <Loader2 size={16} className="spin form-input-loader" />}
              </div>
              {buyPrice && !fetchingPrice && (
                <span className="form-hint form-hint-price">
                  {priceCurrency === 'USD' && assetType === 'crypto'
                    ? `≈ ${formatCurrency(parseFloat(buyPrice) * exchangeRate)}`
                    : `${t('modal.currentPrice')}: ${formatCurrency(parseFloat(buyPrice))}${assetType === 'stock' ? '/lembar' : ''}`
                  }
                </span>
              )}
            </div>

            {/* Total Cost */}
            {quantity && buyPrice && (
              <div className="form-total">
                <span className="form-total-label">{t('modal.totalCost')}</span>
                <span className="form-total-value">
                  {assetType === 'crypto' && priceCurrency === 'USD'
                    ? `$${getTotalCost().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : formatCurrency(getTotalCost())
                  }
                </span>
                {assetType === 'crypto' && priceCurrency === 'USD' && (
                  <span className="form-total-breakdown">
                    ≈ {formatCurrency(getTotalCostIDR())}
                  </span>
                )}
                {assetType === 'stock' && (
                  <span className="form-total-breakdown">
                    {quantity} lot × 100 × {formatCurrency(parseFloat(buyPrice))}
                  </span>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="tx-date" className="form-label">{t('modal.date')}</label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="note" className="form-label">{t('modal.note')}</label>
              <input
                id="note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('modal.notePlaceholder')}
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => { setStep('search'); setBuyPrice(''); }}
                className="btn-secondary"
              >
                {t('modal.back')}
              </button>
              <button
                type="submit"
                disabled={submitting || !quantity || !buyPrice}
                className="btn-primary"
                id="submit-buy"
              >
                {submitting ? t('modal.adding') : t('modal.addPosition')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
