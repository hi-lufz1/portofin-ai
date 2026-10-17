'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import {
  CloudUpload,
  Database,
  Layers,
  Scale,
  RotateCcw,
  Plus,
} from 'lucide-react';

interface LedgerRow {
  ticker: string;
  name: string;
  market: 'IDX' | 'CRYPTO';
  lots?: number;
  sharesOrUnits: number;
  avgBuyIdr: number;
  marketPriceIdr: number;
}

const BASE_LEDGER_ROWS: LedgerRow[] = [
  {
    ticker: 'BBCA',
    name: 'Bank Central Asia Tbk',
    market: 'IDX',
    lots: 50,
    sharesOrUnits: 5000,
    avgBuyIdr: 9000,
    marketPriceIdr: 9850,
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    market: 'CRYPTO',
    sharesOrUnits: 0.042,
    avgBuyIdr: 920000000,
    marketPriceIdr: 1120000000,
  },
  {
    ticker: 'TLKM',
    name: 'Telkom Indonesia Tbk',
    market: 'IDX',
    lots: 100,
    sharesOrUnits: 10000,
    avgBuyIdr: 2950,
    marketPriceIdr: 3180,
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    market: 'CRYPTO',
    sharesOrUnits: 0.45,
    avgBuyIdr: 40000000,
    marketPriceIdr: 45600000,
  },
];

export default function LandingPage() {
  const { lang, toggleLanguage } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const { guestAssetCount } = usePortfolio();

  const [consoleCurrency, setConsoleCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'IDX' | 'CRYPTO'>('ALL');
  const [extraBbcaLots, setExtraBbcaLots] = useState<number>(0);

  const isID = lang === 'id';
  const fxRate = 16400;

  const formatMoney = (idrAmount: number, compact = false) => {
    if (consoleCurrency === 'USD') {
      const usd = idrAmount / fxRate;
      return `$${usd.toLocaleString('en-US', {
        minimumFractionDigits: compact && usd >= 1000 ? 0 : 2,
        maximumFractionDigits: compact && usd >= 1000 ? 0 : 2,
      })}`;
    }
    return `Rp ${Math.round(idrAmount).toLocaleString('id-ID')}`;
  };

  // Compute live ledger positions including interactive lot simulation
  const computedLedger = useMemo(() => {
    const rows = BASE_LEDGER_ROWS.map((row) => {
      if (row.ticker === 'BBCA' && extraBbcaLots > 0) {
        const addedShares = extraBbcaLots * 100;
        const simBuyPrice = 9750;
        const prevCost = row.sharesOrUnits * row.avgBuyIdr;
        const newCost = prevCost + addedShares * simBuyPrice;
        const newShares = row.sharesOrUnits + addedShares;
        return {
          ...row,
          lots: (row.lots || 0) + extraBbcaLots,
          sharesOrUnits: newShares,
          avgBuyIdr: Math.round(newCost / newShares),
        };
      }
      return row;
    });

    const enriched = rows.map((r) => {
      const costBasisIdr = r.sharesOrUnits * r.avgBuyIdr;
      const marketValueIdr = r.sharesOrUnits * r.marketPriceIdr;
      const plIdr = marketValueIdr - costBasisIdr;
      const plPct = costBasisIdr > 0 ? (plIdr / costBasisIdr) * 100 : 0;
      return {
        ...r,
        costBasisIdr,
        marketValueIdr,
        plIdr,
        plPct,
      };
    });

    const portfolioValueIdr = enriched.reduce((acc, r) => acc + r.marketValueIdr, 0);
    const portfolioCostIdr = enriched.reduce((acc, r) => acc + r.costBasisIdr, 0);
    const portfolioPlIdr = portfolioValueIdr - portfolioCostIdr;
    const portfolioPlPct =
      portfolioCostIdr > 0 ? (portfolioPlIdr / portfolioCostIdr) * 100 : 0;

    const withWeights = enriched.map((r) => {
      const weight = portfolioValueIdr > 0 ? r.marketValueIdr / portfolioValueIdr : 0;
      return {
        ...r,
        weight,
        weightPct: weight * 100,
      };
    });

    // Herfindahl-Hirschman Index: sum of squared portfolio weights
    const hhiDecimal = withWeights.reduce((acc, r) => acc + r.weight * r.weight, 0);
    const hhiPoints = Math.round(hhiDecimal * 10000);
    const hhiScore100 = Math.round(hhiDecimal * 100);

    const idxValue = withWeights
      .filter((r) => r.market === 'IDX')
      .reduce((acc, r) => acc + r.marketValueIdr, 0);
    const cryptoValue = withWeights
      .filter((r) => r.market === 'CRYPTO')
      .reduce((acc, r) => acc + r.marketValueIdr, 0);

    const idxSharePct = portfolioValueIdr > 0 ? (idxValue / portfolioValueIdr) * 100 : 0;
    const cryptoSharePct =
      portfolioValueIdr > 0 ? (cryptoValue / portfolioValueIdr) * 100 : 0;

    const visibleRows =
      marketFilter === 'ALL'
        ? withWeights
        : withWeights.filter((r) => r.market === marketFilter);

    return {
      rows: visibleRows,
      allRowsCount: withWeights.length,
      portfolioValueIdr,
      portfolioCostIdr,
      portfolioPlIdr,
      portfolioPlPct,
      hhiDecimal,
      hhiPoints,
      hhiScore100,
      idxSharePct,
      cryptoSharePct,
    };
  }, [extraBbcaLots, marketFilter]);

  return (
    <div className="landing-page" id="landing-page">
      {/* Top Navigation Bar */}
      <header className="landing-navbar" id="landing-navbar">
        <div className="landing-navbar-inner">
          <div className="landing-brand-group">
            <Link href="/" className="landing-brand">
              <div className="landing-brand-logo">
                <img
                  src="/logo.png"
                  alt="Portofin"
                  width={22}
                  height={22}
                  style={{ borderRadius: 4 }}
                />
              </div>
              <span className="landing-brand-name">Portofin</span>
            </Link>
            <span className="landing-brand-divider" aria-hidden="true" />
            <span className="landing-brand-tag">
              {isID ? 'Buku Besar Saham BEI & Kripto' : 'IDX Equities & Crypto Ledger'}
            </span>
          </div>

          <nav className="landing-nav-links" aria-label="Landing Navigation">
            <a href="#konsol" className="landing-nav-link">
              {isID ? 'Konsol Buku Besar' : 'Ledger Console'}
            </a>
            <a href="#pasar-ganda" className="landing-nav-link">
              {isID ? 'Pasar Ganda' : 'Dual-Market'}
            </a>
            <a href="#kendali-lokal" className="landing-nav-link">
              {isID ? 'Arsitektur Local-First' : 'Local-First Storage'}
            </a>
            <a href="#diagnostik-hhi" className="landing-nav-link">
              {isID ? 'Metodologi HHI' : 'HHI Methodology'}
            </a>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              onClick={toggleLanguage}
              className="currency-toggle-btn small"
              id="landing-lang-toggle"
              title={isID ? 'Ganti Bahasa' : 'Switch Language'}
            >
              <span className={`currency-option ${lang === 'id' ? 'active' : ''}`}>ID</span>
              <span className={`currency-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
            </button>

            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="btn-secondary landing-nav-cloud-btn"
                id="landing-signin-btn"
              >
                <CloudUpload size={15} />
                <span>{isID ? 'Masuk / Simpan ke Cloud' : 'Sign In / Cloud Backup'}</span>
              </button>
            )}

            <Link
              href="/dashboard"
              className="btn-primary landing-nav-primary-btn"
              id="landing-nav-dashboard"
            >
              <span>
                {user
                  ? isID
                    ? 'Buka Dasbor'
                    : 'Open Dashboard'
                  : isID
                    ? 'Mulai di Mode Tamu'
                    : 'Start in Guest Mode'}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* Product-First Hero & Interactive Ledger Console */}
        <section className="landing-hero" id="konsol">
          <div className="landing-container">
            {/* Smart Local Session Detection Banner when guestAssetCount > 0 */}
            {guestAssetCount > 0 && !user && (
              <div className="landing-detected-banner" role="status">
                <div className="landing-detected-info">
                  <Database size={18} className="landing-detected-icon" />
                  <div>
                    <strong className="landing-detected-title">
                      {isID
                        ? `Terdeteksi ${guestAssetCount} aset tersimpan di perangkat ini.`
                        : `Detected ${guestAssetCount} assets stored on this device.`}
                    </strong>{' '}
                    <span className="landing-detected-sub">
                      {isID
                        ? 'Buka dasbor untuk melanjutkan pencatatan atau masuk untuk mencadangkan ke cloud.'
                        : 'Open the dashboard to continue or sign in to back up your local ledger to the cloud.'}
                    </span>
                  </div>
                </div>
                <div className="landing-detected-actions">
                  <Link href="/dashboard" className="btn-primary landing-detected-btn">
                    {isID ? `Buka Dasbor (${guestAssetCount} Aset)` : `Open Dashboard (${guestAssetCount})`}
                  </Link>
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="btn-secondary landing-detected-cloud-btn"
                  >
                    <CloudUpload size={15} />
                    <span>{isID ? 'Cadangkan ke Cloud' : 'Back Up to Cloud'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Asymmetric Editorial Header + Direct Actions */}
            <div className="landing-hero-header">
              <div className="landing-hero-copy">
                <h1 className="landing-hero-title">
                  {isID
                    ? 'Buku Besar Portofolio Saham BEI dan Aset Kripto dalam Satu Kanvas Akuntansi.'
                    : 'One Accounting Ledger for IDX Equities and Fractional Crypto Assets.'}
                </h1>
                <p className="landing-hero-subtitle">
                  {isID
                    ? 'Catat kepemilikan saham Indonesia dalam satuan Lot (100 lembar) berdampingan dengan aset kripto desimal. Hitung rata-rata harga beli tertimbang, konversi nilai IDR/USD secara langsung, dan ukur risiko konsentrasi portofolio dengan indeks matematis HHI.'
                    : 'Record Indonesian equities in standard Lots (100 shares) alongside fractional crypto holdings. Compute weighted-average cost basis, switch between IDR and USD instantaneously, and measure portfolio concentration via the mathematical HHI index.'}
                </p>
              </div>

              <div className="landing-hero-cta-panel">
                <div className="landing-hero-cta-buttons">
                  <Link
                    href="/dashboard"
                    className="btn-primary landing-hero-btn-primary"
                    id="hero-cta-sandbox"
                  >
                    <span>
                      {isID ? 'Mulai di Mode Tamu' : 'Start in Guest Mode'}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="btn-secondary landing-hero-btn-cloud"
                    id="hero-cta-auth"
                  >
                    <CloudUpload size={17} />
                    <span>
                      {isID ? 'Masuk / Cadangkan ke Cloud' : 'Sign In / Back Up to Cloud'}
                    </span>
                  </button>
                </div>
                <p className="landing-hero-cta-note">
                  {isID
                    ? 'Langsung berfungsi penuh di browser Anda tanpa registrasi awal. Sinkronkan ke akun cloud kapan saja.'
                    : 'Works immediately in your browser with zero upfront registration. Sync to a cloud account whenever you are ready.'}
                </p>
              </div>
            </div>

            {/* Interactive Ledger Console */}
            <div
              className="landing-console"
              role="region"
              aria-label={
                isID
                  ? 'Konsol Interaktif Buku Besar Portofolio'
                  : 'Interactive Portfolio Ledger Console'
              }
            >
              {/* Console Control Bar */}
              <div className="landing-console-toolbar">
                <div className="landing-console-toolbar-left">
                  <span className="landing-console-label">
                    {isID ? 'BUKU BESAR SIMULASI INTERAKTIF' : 'INTERACTIVE LEDGER WORKSPACE'}
                  </span>
                  <div className="landing-console-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={marketFilter === 'ALL'}
                      className={`landing-console-tab ${marketFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setMarketFilter('ALL')}
                    >
                      {isID ? 'Semua Instrumen (4)' : 'All Instruments (4)'}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={marketFilter === 'IDX'}
                      className={`landing-console-tab ${marketFilter === 'IDX' ? 'active' : ''}`}
                      onClick={() => setMarketFilter('IDX')}
                    >
                      {isID ? 'Saham BEI (2)' : 'IDX Equities (2)'}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={marketFilter === 'CRYPTO'}
                      className={`landing-console-tab ${marketFilter === 'CRYPTO' ? 'active' : ''}`}
                      onClick={() => setMarketFilter('CRYPTO')}
                    >
                      {isID ? 'Aset Kripto (2)' : 'Crypto Assets (2)'}
                    </button>
                  </div>
                </div>

                <div className="landing-console-toolbar-right">
                  {extraBbcaLots === 0 ? (
                    <button
                      type="button"
                      className="btn-secondary landing-sim-btn"
                      onClick={() => setExtraBbcaLots(20)}
                    >
                      <Plus size={14} />
                      <span>
                        {isID
                          ? 'Simulasi Beli +20 Lot BBCA'
                          : 'Simulate Buy +20 Lots BBCA'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary landing-sim-btn active"
                      onClick={() => setExtraBbcaLots(0)}
                    >
                      <RotateCcw size={14} />
                      <span>
                        {isID ? 'Reset Simulasi (+20 Lot BBCA)' : 'Reset Simulation (+20 Lots)'}
                      </span>
                    </button>
                  )}

                  <div className="landing-currency-switch" role="group" aria-label="Currency">
                    <button
                      type="button"
                      className={`landing-cur-opt ${consoleCurrency === 'IDR' ? 'active' : ''}`}
                      onClick={() => setConsoleCurrency('IDR')}
                    >
                      IDR
                    </button>
                    <button
                      type="button"
                      className={`landing-cur-opt ${consoleCurrency === 'USD' ? 'active' : ''}`}
                      onClick={() => setConsoleCurrency('USD')}
                    >
                      USD
                    </button>
                  </div>
                </div>
              </div>

              {/* Console Summary Strip (4 Accounting Metrics) */}
              <div className="landing-console-metrics">
                <div className="landing-console-metric">
                  <span className="landing-metric-label">
                    {isID ? 'NILAI BERSIH PORTOFOLIO' : 'NET PORTFOLIO VALUE'}
                  </span>
                  <span className="landing-metric-value">
                    {formatMoney(computedLedger.portfolioValueIdr)}
                  </span>
                  <span className="landing-metric-sub">
                    {isID
                      ? `Kurs acuan: Rp ${fxRate.toLocaleString('id-ID')} / USD`
                      : `Reference FX: IDR ${fxRate.toLocaleString('en-US')} / USD`}
                  </span>
                </div>

                <div className="landing-console-metric">
                  <span className="landing-metric-label">
                    {isID ? 'MODAL DIINVESTASIKAN (COST BASIS)' : 'INVESTED CAPITAL (COST BASIS)'}
                  </span>
                  <span className="landing-metric-value">
                    {formatMoney(computedLedger.portfolioCostIdr)}
                  </span>
                  <span className="landing-metric-sub">
                    {extraBbcaLots > 0
                      ? isID
                        ? 'Termasuk tambahan +20 Lot BBCA @ Rp 9.750'
                        : 'Includes +20 Lots BBCA @ IDR 9,750'
                      : isID
                        ? 'Akumulasi rata-rata harga beli tertimbang'
                        : 'Weighted-average purchase cost basis'}
                  </span>
                </div>

                <div className="landing-console-metric">
                  <span className="landing-metric-label">
                    {isID ? 'SELISIH BELUM TEREALISASI (P/L)' : 'UNREALIZED PROFIT / LOSS'}
                  </span>
                  <span className="landing-metric-value positive">
                    +{formatMoney(computedLedger.portfolioPlIdr)}
                  </span>
                  <span className="landing-metric-badge positive">
                    +{computedLedger.portfolioPlPct.toFixed(2)}%
                  </span>
                </div>

                <div className="landing-console-metric">
                  <span className="landing-metric-label">
                    {isID ? 'INDEKS KONSENTRASI HHI' : 'HHI CONCENTRATION INDEX'}
                  </span>
                  <span className="landing-metric-value">
                    {computedLedger.hhiPoints.toLocaleString('id-ID')}{' '}
                    <small className="landing-metric-unit">/ 10.000</small>
                  </span>
                  <span className="landing-metric-sub">
                    {computedLedger.hhiPoints < 3000
                      ? isID
                        ? 'Distribusi terdiversifikasi (< 3.000)'
                        : 'Diversified weight distribution (< 3,000)'
                      : isID
                        ? 'Konsentrasi moderat pada BBCA'
                        : 'Moderate concentration in BBCA'}
                  </span>
                </div>
              </div>

              {/* Console Main Workspace: Ledger Table + HHI Diagnostic Panel */}
              <div className="landing-console-body">
                <div className="landing-console-table-pane">
                  {/* Desktop / Tablet Accounting Table */}
                  <div className="landing-ledger-table-wrap">
                    <table className="landing-ledger-table">
                      <thead>
                        <tr>
                          <th>{isID ? 'INSTRUMEN' : 'INSTRUMENT'}</th>
                          <th className="text-right">
                            {isID ? 'KUANTITAS (LOT / UNIT)' : 'QUANTITY (LOTS / UNITS)'}
                          </th>
                          <th className="text-right">
                            {isID ? 'RATA-RATA BELI' : 'AVG BUY PRICE'}
                          </th>
                          <th className="text-right">
                            {isID ? 'HARGA PASAR' : 'MARKET PRICE'}
                          </th>
                          <th className="text-right">
                            {isID ? 'NILAI PASAR & BOBOT' : 'MARKET VALUE & WEIGHT'}
                          </th>
                          <th className="text-right">
                            {isID ? 'LABA / RUGI' : 'UNREALIZED P/L'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {computedLedger.rows.map((row) => (
                          <tr key={row.ticker}>
                            <td>
                              <div className="landing-cell-instrument">
                                <span
                                  className={`landing-market-tag ${
                                    row.market === 'IDX' ? 'idx' : 'crypto'
                                  }`}
                                >
                                  {row.market}
                                </span>
                                <div>
                                  <div className="landing-cell-ticker">{row.ticker}</div>
                                  <div className="landing-cell-name">{row.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-right tabular">
                              {row.market === 'IDX' ? (
                                <div className="landing-cell-stack">
                                  <span className="landing-cell-primary">
                                    {row.lots} Lot
                                  </span>
                                  <span className="landing-cell-secondary">
                                    {row.sharesOrUnits.toLocaleString('id-ID')}{' '}
                                    {isID ? 'lembar' : 'shares'}
                                  </span>
                                </div>
                              ) : (
                                <div className="landing-cell-stack">
                                  <span className="landing-cell-primary">
                                    {row.sharesOrUnits.toFixed(4)} {row.ticker}
                                  </span>
                                  <span className="landing-cell-secondary">
                                    {isID ? 'Unit desimal' : 'Fractional unit'}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="text-right tabular">
                              <span className="landing-cell-primary">
                                {formatMoney(row.avgBuyIdr)}
                              </span>
                            </td>
                            <td className="text-right tabular">
                              <span className="landing-cell-primary">
                                {formatMoney(row.marketPriceIdr)}
                              </span>
                            </td>
                            <td className="text-right tabular">
                              <div className="landing-cell-stack">
                                <span className="landing-cell-primary">
                                  {formatMoney(row.marketValueIdr)}
                                </span>
                                <span className="landing-cell-secondary">
                                  {row.weightPct.toFixed(1)}%{' '}
                                  {isID ? 'dari portofolio' : 'of portfolio'}
                                </span>
                              </div>
                            </td>
                            <td className="text-right tabular">
                              <div className="landing-cell-stack">
                                <span className="landing-cell-pl positive">
                                  +{formatMoney(row.plIdr)}
                                </span>
                                <span className="landing-cell-pl-pct positive">
                                  +{row.plPct.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Reflow Cards (<= 768px) */}
                  <div className="landing-ledger-mobile-cards">
                    {computedLedger.rows.map((row) => (
                      <div key={row.ticker} className="landing-mobile-pos-card">
                        <div className="landing-mobile-pos-top">
                          <div className="landing-cell-instrument">
                            <span
                              className={`landing-market-tag ${
                                row.market === 'IDX' ? 'idx' : 'crypto'
                              }`}
                            >
                              {row.market}
                            </span>
                            <div>
                              <div className="landing-cell-ticker">{row.ticker}</div>
                              <div className="landing-cell-name">{row.name}</div>
                            </div>
                          </div>
                          <div className="text-right tabular">
                            <div className="landing-cell-primary">
                              {formatMoney(row.marketValueIdr)}
                            </div>
                            <div className="landing-cell-pl-pct positive">
                              +{row.plPct.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className="landing-mobile-pos-grid tabular">
                          <div>
                            <span className="landing-mobile-pos-label">
                              {isID ? 'Kuantitas' : 'Quantity'}
                            </span>
                            <span className="landing-mobile-pos-val">
                              {row.market === 'IDX'
                                ? `${row.lots} Lot (${row.sharesOrUnits.toLocaleString('id-ID')} lbr)`
                                : `${row.sharesOrUnits.toFixed(4)} ${row.ticker}`}
                            </span>
                          </div>
                          <div>
                            <span className="landing-mobile-pos-label">
                              {isID ? 'Rata-rata Beli' : 'Avg Buy'}
                            </span>
                            <span className="landing-mobile-pos-val">
                              {formatMoney(row.avgBuyIdr, true)}
                            </span>
                          </div>
                          <div>
                            <span className="landing-mobile-pos-label">
                              {isID ? 'Bobot' : 'Weight'}
                            </span>
                            <span className="landing-mobile-pos-val">
                              {row.weightPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HHI Risk Concentration Side Panel */}
                <aside className="landing-console-side-pane">
                  <div className="landing-side-header">
                    <span className="landing-side-title">
                      {isID
                        ? 'Kalkulator Konsentrasi HHI'
                        : 'HHI Concentration Calculator'}
                    </span>
                    <span className="landing-side-tag">NON-ADVISORY</span>
                  </div>

                  <div className="landing-hhi-box">
                    <div className="landing-hhi-gauge-row">
                      <svg
                        viewBox="0 0 120 68"
                        className="landing-hhi-svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M 12 60 A 48 48 0 0 1 108 60"
                          fill="none"
                          stroke="var(--border)"
                          strokeWidth="10"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 12 60 A 48 48 0 0 1 108 60"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.min(
                            150,
                            Math.round((computedLedger.hhiScore100 / 100) * 150)
                          )} 150`}
                        />
                      </svg>
                      <div className="landing-hhi-numbers">
                        <span className="landing-hhi-main tabular">
                          HHI = {computedLedger.hhiDecimal.toFixed(3)}
                        </span>
                        <span className="landing-hhi-sub">
                          {isID
                            ? `Skor Rasio: ${computedLedger.hhiScore100} / 100`
                            : `Ratio Score: ${computedLedger.hhiScore100} / 100`}
                        </span>
                      </div>
                    </div>

                    <div className="landing-alloc-breakdown">
                      <div className="landing-alloc-row tabular">
                        <span>
                          {isID ? 'Saham BEI' : 'IDX Equities'} (
                          {computedLedger.idxSharePct.toFixed(1)}%)
                        </span>
                        <span>
                          {isID ? 'Kripto' : 'Crypto'} (
                          {computedLedger.cryptoSharePct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="landing-alloc-track">
                        <div
                          className="landing-alloc-fill idx"
                          style={{ width: `${computedLedger.idxSharePct}%` }}
                        />
                        <div
                          className="landing-alloc-fill crypto"
                          style={{ width: `${computedLedger.cryptoSharePct}%` }}
                        />
                      </div>
                    </div>

                    <p className="landing-hhi-desc">
                      {isID
                        ? 'Rumus HHI menjumlahkan kuadrat bobot tiap aset. Nilai mendekati 0,250 pada 4 aset menunjukkan alokasi modal yang merata tanpa dominasi tunggal.'
                        : 'The HHI formula sums the squared weights of each holding. A reading near 0.250 across 4 assets indicates balanced capital distribution without single-asset dominance.'}
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* SHOWCASE 1: Dual-Market Specification Table (Asymmetric Two-Column Layout) */}
        <section className="landing-section" id="pasar-ganda">
          <div className="landing-container">
            <div className="landing-split-showcase">
              <div className="landing-split-info">
                <div className="landing-kicker">
                  <Layers size={15} />
                  <span>
                    {isID
                      ? 'KAPABILITAS 01 / ARSITEKTUR PASAR GANDA'
                      : 'CAPABILITY 01 / DUAL-MARKET ARCHITECTURE'}
                  </span>
                </div>
                <h2 className="landing-section-title">
                  {isID
                    ? 'Satu Buku Besar untuk Dua Karakter Pasar'
                    : 'One Ledger Built for Two Distinct Market Conventions'}
                </h2>
                <p className="landing-section-desc">
                  {isID
                    ? 'Investor di Indonesia umumnya memiliki saham di Bursa Efek Indonesia sekaligus aset kripto global. Pencatatan di spreadsheet sering kali berantakan karena perbedaan satuan Lot (100 lembar) dan unit desimal kripto, serta perbedaan mata uang dasar IDR dan USD.'
                    : 'Indonesian investors frequently hold both IDX equities and global crypto assets. Spreadsheet tracking often breaks down due to conflicting lot multipliers (100 shares per lot) versus fractional coin precision, alongside mixed IDR and USD cost bases.'}
                </p>
                <p className="landing-section-desc">
                  {isID
                    ? 'Portofin menyatukan kedua konvensi tersebut secara native di tingkat mesin pencatatan transaksi.'
                    : 'Portofin unifies both conventions natively inside its transaction accounting engine.'}
                </p>
              </div>

              <div className="landing-spec-card">
                <div className="landing-spec-header">
                  <span>
                    {isID
                      ? 'SPESIFIKASI PENCATATAN INSTRUMEN'
                      : 'INSTRUMENT ACCOUNTING SPECIFICATION'}
                  </span>
                </div>
                <table className="landing-spec-table">
                  <thead>
                    <tr>
                      <th>{isID ? 'PARAMETER' : 'PARAMETER'}</th>
                      <th>{isID ? 'SAHAM BEI (IDX)' : 'IDX EQUITIES'}</th>
                      <th>{isID ? 'ASET KRIPTO' : 'CRYPTO ASSETS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="spec-param">
                        {isID ? 'Satuan Kuantitas' : 'Quantity Unit'}
                      </td>
                      <td className="tabular">1 Lot = 100 {isID ? 'Lembar' : 'Shares'}</td>
                      <td className="tabular">
                        {isID ? 'Desimal (hingga 8 digit)' : 'Fractional (up to 8 decimals)'}
                      </td>
                    </tr>
                    <tr>
                      <td className="spec-param">
                        {isID ? 'Mata Uang Input' : 'Input Currency'}
                      </td>
                      <td className="tabular">IDR (Rupiah)</td>
                      <td className="tabular">IDR {isID ? 'atau' : 'or'} USD</td>
                    </tr>
                    <tr>
                      <td className="spec-param">
                        {isID ? 'Metode Cost-Basis' : 'Cost-Basis Method'}
                      </td>
                      <td>Weighted Average / {isID ? 'Lembar' : 'Share'}</td>
                      <td>Weighted Average / Unit</td>
                    </tr>
                    <tr>
                      <td className="spec-param">
                        {isID ? 'Sumber Harga Live' : 'Live Price Feed'}
                      </td>
                      <td className="tabular">Yahoo Finance (.JK)</td>
                      <td className="tabular">CoinGecko Market API</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* SHOWCASE 2: Local-First Storage & Cloud Sync Architecture */}
        <section className="landing-section landing-section-alt" id="kendali-lokal">
          <div className="landing-container">
            <div className="landing-section-intro">
              <div className="landing-kicker">
                <Database size={15} />
                <span>
                  {isID
                    ? 'KAPABILITAS 02 / PENYIMPANAN LOCAL-FIRST & DEFERRED AUTH'
                    : 'CAPABILITY 02 / LOCAL-FIRST STORAGE & DEFERRED AUTH'}
                </span>
              </div>
              <h2 className="landing-section-title">
                {isID
                  ? 'Local-First: Kendali Penuh di Browser Anda'
                  : 'Local-First: Complete Custody in Your Browser'}
              </h2>
              <p className="landing-section-desc">
                {isID
                  ? 'Anda tidak perlu menyerahkan alamat email atau membuat kata sandi hanya untuk mencoba mencatat portofolio. Portofin memisahkan penyimpanan lokal dan pencadangan cloud secara transparan.'
                  : 'You should not have to hand over an email address or create a password just to test a portfolio tracker. Portofin cleanly separates local browser storage from optional cloud backup.'}
              </p>
            </div>

            <div className="landing-custody-grid">
              <div className="landing-custody-card">
                <div className="landing-custody-top">
                  <span className="landing-custody-mode">
                    {isID ? 'MODE 1: SANDBOX LOKAL (DEFAULT)' : 'MODE 1: LOCAL SANDBOX (DEFAULT)'}
                  </span>
                  <span className="landing-custody-storage tabular">
                    window.localStorage
                  </span>
                </div>
                <h3 className="landing-custody-title">
                  {isID
                    ? 'Akses Instan Tanpa Akun & Tanpa Kredensial Pialang'
                    : 'Instant Access with Zero Registration or Brokerage Keys'}
                </h3>
                <p className="landing-custody-body">
                  {isID
                    ? 'Seluruh portofolio, daftar kepemilikan aset, dan riwayat transaksi beli/jual disimpan langsung di browser perangkat Anda. Kami tidak pernah meminta akses login sekuritas, API key bursa, maupun seed phrase dompet kripto Anda.'
                    : 'All portfolios, asset holdings, and buy/sell transaction logs are stored directly in your browser. We never ask for brokerage credentials, exchange API keys, or crypto wallet seed phrases.'}
                </p>
                <div className="landing-custody-footer">
                  <Link href="/dashboard" className="btn-primary landing-custody-btn">
                    <span>
                      {isID ? 'Buka Ruang Kerja Mode Tamu' : 'Open Guest Workspace'}
                    </span>
                  </Link>
                </div>
              </div>

              <div className="landing-custody-card">
                <div className="landing-custody-top">
                  <span className="landing-custody-mode cloud">
                    {isID ? 'MODE 2: CADANGAN CLOUD (OPSIONAL)' : 'MODE 2: CLOUD BACKUP (OPTIONAL)'}
                  </span>
                  <span className="landing-custody-storage tabular">
                    Supabase PostgreSQL
                  </span>
                </div>
                <h3 className="landing-custody-title">
                  {isID
                    ? 'Migrasi Otomatis Saat Anda Siap Sinkronisasi Lintas Perangkat'
                    : 'Automatic Migration When You Want Multi-Device Sync'}
                </h3>
                <p className="landing-custody-body">
                  {isID
                    ? 'Kapan pun Anda ingin mengakses portofolio dari ponsel atau komputer lain, cukup klik tombol Simpan ke Cloud. Mesin sinkronisasi idempoten Portofin otomatis memindahkan seluruh aset lokal Anda ke database cloud tanpa duplikasi.'
                    : 'Whenever you want to access your ledger from another phone or computer, click Save to Cloud. Portofin automatically migrates your local holdings and transactions into your cloud account without duplication.'}
                </p>
                <div className="landing-custody-footer">
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="btn-secondary landing-custody-cloud-btn"
                  >
                    <CloudUpload size={16} />
                    <span>
                      {isID
                        ? 'Masuk / Cadangkan ke Cloud'
                        : 'Sign In / Back Up to Cloud'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SHOWCASE 3: Objective Risk Diagnostics (HHI) & Non-Advisory Ethics */}
        <section className="landing-section" id="diagnostik-hhi">
          <div className="landing-container">
            <div className="landing-section-intro">
              <div className="landing-kicker">
                <Scale size={15} />
                <span>
                  {isID
                    ? 'KAPABILITAS 03 / DIAGNOSTIK RISIKO OBJEKTIF & ETIKA NON-ADVISORY'
                    : 'CAPABILITY 03 / OBJECTIVE RISK DIAGNOSTICS & NON-ADVISORY ETHICS'}
                </span>
              </div>
              <h2 className="landing-section-title">
                {isID
                  ? 'Diagnostik Risiko Objektif (HHI), Bebas Spekulasi'
                  : 'Objective Risk Diagnostics (HHI), Zero Speculative Noise'}
              </h2>
              <p className="landing-section-desc">
                {isID
                  ? 'Keputusan penempatan modal menyangkut uang nyata dan tidak boleh diserahkan pada halusinasi model bahasa. Portofin membatasi fitur analitik secara ketat pada perhitungan matematika portofolio yang dapat diverifikasi.'
                  : 'Capital allocation involves real money and should never rely on language model speculation. Portofin restricts its analytics strictly to verifiable portfolio mathematics.'}
              </p>
            </div>

            <div className="landing-methodology-layout">
              <div className="landing-formula-list">
                <div className="landing-formula-item">
                  <div className="landing-formula-header">
                    <span className="landing-formula-title">
                      {isID
                        ? 'Indeks Konsentrasi Herfindahl-Hirschman (HHI)'
                        : 'Herfindahl-Hirschman Concentration Index (HHI)'}
                    </span>
                    <code className="landing-formula-code">HHI = Σ (wᵢ)²</code>
                  </div>
                  <p className="landing-formula-desc">
                    {isID
                      ? 'Mengukur tingkat ketergantungan portofolio pada satu aset. Jika satu saham atau koin menyumbang lebih dari 50% nilai total, indeks HHI akan memberikan peringatan konsentrasi eksposur secara matematis.'
                      : 'Measures portfolio dependency on individual positions. If a single stock or coin exceeds 50% of total net worth, the HHI index mathematically flags single-asset exposure risk.'}
                  </p>
                </div>

                <div className="landing-formula-item">
                  <div className="landing-formula-header">
                    <span className="landing-formula-title">
                      {isID
                        ? 'Harga Rata-Rata Tertimbang & Realized P/L'
                        : 'Weighted-Average Cost Basis & Realized P/L'}
                    </span>
                    <code className="landing-formula-code">
                      AvgCost = Σ(Qty × Price) / Σ(Qty)
                    </code>
                  </div>
                  <p className="landing-formula-desc">
                    {isID
                      ? 'Setiap transaksi beli baru memperbarui harga modal rata-rata secara presisi. Saat Anda mencatat penjualan sebagian atau seluruh posisi, Portofin memisahkan Laba/Rugi Terealisasi (Realized P/L) dari posisi mengambang (Floating P/L).'
                      : 'Every new buy order updates your weighted-average cost basis. When you log partial or full sales, Portofin cleanly separates Realized P/L from Floating Unrealized P/L.'}
                  </p>
                </div>
              </div>

              <div className="landing-guardrail-box" role="note">
                <div className="landing-guardrail-header">
                  <Scale size={18} />
                  <span>
                    {isID
                      ? 'Komitmen Etika Non-Advisory (DYOR)'
                      : 'Non-Advisory Ethical Commitment (DYOR)'}
                  </span>
                </div>
                <p className="landing-guardrail-text">
                  {isID
                    ? 'Portofin adalah perangkat lunak pencatatan akuntansi portofolio dan kalkulator konsentrasi risiko kuantitatif. Portofin bukan penasihat investasi berlisensi, perencana keuangan, atau pialang efek.'
                    : 'Portofin is a portfolio accounting ledger and quantitative risk concentration calculator. Portofin is not a licensed investment advisor, financial planner, or broker-dealer.'}
                </p>
                <p className="landing-guardrail-text">
                  {isID
                    ? 'Asisten analitik di dalam Portofin dirancang dengan pembatas ketat (guardrails) untuk tidak pernah memberikan perintah beli, jual, atau target harga spekulatif. Seluruh keputusan finansial berada sepenuhnya di tangan Anda (Do Your Own Research).'
                    : 'The analytics copilot inside Portofin is engineered with strict guardrails to never issue buy orders, sell signals, or speculative price targets. All financial decisions remain 100% your own responsibility (Do Your Own Research).'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Functional Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-left">
            <div className="landing-brand-group">
              <div className="landing-brand-logo">
                <img
                  src="/logo.png"
                  alt="Portofin"
                  width={18}
                  height={18}
                  style={{ borderRadius: 4 }}
                />
              </div>
              <span className="landing-brand-name">Portofin</span>
            </div>
            <p className="landing-footer-copy">
              © 2026 Portofin.{' '}
              {isID
                ? 'Buku besar pencatatan & diagnostik risiko portofolio saham BEI dan kripto.'
                : 'IDX equity and crypto portfolio accounting ledger & risk diagnostics.'}
            </p>
          </div>

          <nav className="landing-footer-links" aria-label="Footer Navigation">
            <Link href="/dashboard" className="landing-footer-link">
              {isID ? 'Dasbor Portofolio' : 'Portfolio Dashboard'}
            </Link>
            <Link href="/transactions" className="landing-footer-link">
              {isID ? 'Riwayat Transaksi' : 'Transaction Ledger'}
            </Link>
            <Link href="/ai-advisor" className="landing-footer-link">
              {isID ? 'Diagnostik Risiko' : 'Risk Diagnostics'}
            </Link>
            <Link href="/login" className="landing-footer-link">
              {isID ? 'Halaman Login' : 'Login Page'}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
