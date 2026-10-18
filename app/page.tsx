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
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HardDrive,
  Copy,
  Check,
  TrendingUp,
  Coins,
  Wallet,
  Compass,
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
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number>(0);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);

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

  // Investor roles for Role Selector Tabs
  const investorRoles = useMemo(
    () => [
      {
        id: 'idx-stocks',
        title: isID ? 'Investor Saham IDX' : 'IDX Equity Investor',
        tag: isID ? 'Standar BEI: 1 Lot = 100 Lembar' : 'IDX Standard: 1 Lot = 100 Shares',
        pitch: isID
          ? 'Mencatat akumulasi saham Bursa Efek Indonesia dalam standar kelipatan 100 lembar per lot. Hitung modal rata-rata tertimbang (average down atau up) secara akurat tanpa spreadsheet yang rentan rusak.'
          : 'Track Indonesian stock accumulation in standard 100-share Lots. Calculate weighted-average cost basis seamlessly without brittle spreadsheets.',
        specs: [
          isID ? 'Unit Standar: 1 Lot (100 Lembar)' : 'Standard Unit: 1 Lot (100 Shares)',
          isID ? 'Feed Harga: Yahoo Finance (.JK)' : 'Price Feed: Yahoo Finance (.JK)',
          isID ? 'Pencatatan Dividen & Realized P/L' : 'Dividends & Realized P/L Logging',
        ],
      },
      {
        id: 'crypto-hodler',
        title: isID ? 'Crypto HODLer' : 'Crypto HODLer',
        tag: isID ? 'Unit Desimal: Hingga 8 Digit' : 'Fractional Units: Up to 8 Decimals',
        pitch: isID
          ? 'Presisi tinggi hingga 8 digit desimal untuk Bitcoin, Ethereum, dan altcoin. Pantau valuasi gabungan dalam Rupiah (IDR) dan USD secara simultan dengan konversi kurs real-time.'
          : 'High precision up to 8 fractional decimals for Bitcoin, Ethereum, and altcoins. Monitor unified valuations in IDR and USD simultaneously with real-time FX conversion.',
        specs: [
          isID ? 'Presisi: 8 Digit Desimal Koin' : 'Precision: 8 Fractional Decimals',
          isID ? 'Feed Pasar: CoinGecko API' : 'Market Feed: CoinGecko API',
          isID ? 'Konversi Otomatis IDR & USD' : 'Automated IDR & USD Conversion',
        ],
      },
      {
        id: 'mutual-funds-cash',
        title: isID ? 'Reksa Dana & Cash' : 'Mutual Funds & Cash',
        tag: isID ? 'Likuiditas: Pasar Uang & Kas' : 'Liquidity: Money Market & Cash',
        pitch: isID
          ? 'Kelola alokasi instrumen pasar uang, surat berharga negara, dan cadangan kas likuid untuk memastikan daya beli (dry powder) tetap terukur seimbang di samping portofolio aset berisiko.'
          : 'Manage money market allocations, sovereign debt, and liquidity reserves to ensure dry powder remains accurately balanced alongside volatile holdings.',
        specs: [
          isID ? 'Alokasi Cadangan Likuiditas' : 'Liquidity Buffer Allocation',
          isID ? 'Monitoring Kas & Penyeimbang' : 'Cash & Balancing Reserve Tracker',
          isID ? 'Pelindung Drawdown Portofolio' : 'Portfolio Drawdown Guard',
        ],
      },
      {
        id: 'fire-seeker',
        title: isID ? 'FIRE Seeker' : 'FIRE Seeker',
        tag: isID ? 'Metodologi: Indeks HHI Objektif' : 'Methodology: Objective HHI Index',
        pitch: isID
          ? 'Kuantifikasi kesehatan diversifikasi portofolio jangka panjang menggunakan Herfindahl-Hirschman Index (HHI). Cegah ketergantungan modal berlebih pada satu emiten atau koin secara objektif.'
          : 'Measure long-term diversification health with the objective Herfindahl-Hirschman Index (HHI). Eliminate single-asset over-concentration before it threatens capital preservation.',
        specs: [
          isID ? 'Formula Matematis HHI = Σ (wᵢ)²' : 'Mathematical Formula HHI = Σ (wᵢ)²',
          isID ? 'Ambang Batas Diversifikasi 0,250' : 'Diversification Threshold 0.250',
          isID ? 'Prinsip Non-Advisory Murni (DYOR)' : 'Pure Non-Advisory Principle (DYOR)',
        ],
      },
    ],
    [isID]
  );

  const activeRole = investorRoles[selectedRoleIndex] || investorRoles[0];

  const handleCopyPassCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('PASS-PTFN-2026-X79K');
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="landing-page" id="landing-page">
      {/* 1. Floating Frosted Navbar */}
      <header className="landing-navbar" id="landing-navbar">
        <div className="landing-navbar-inner">
          <div className="landing-brand-group">
            <Link href="/" className="landing-brand">
              <div className="landing-brand-logo">
                <img
                  src="/logo.png"
                  alt="Portofin"
                  width={24}
                  height={24}
                  style={{ borderRadius: 6 }}
                />
              </div>
              <span className="landing-brand-name">Portofin</span>
            </Link>
            <span className="landing-brand-divider" aria-hidden="true" />
            <div className="landing-telemetry-pill">
              <span className="landing-live-dot" />
              <span>
                {isID
                  ? 'v2.4 Telemetri Aktif · BEI & Kripto'
                  : 'v2.4 Live Telemetry · IDX & Crypto'}
              </span>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="Landing Navigation">
            <a href="#konsol" className="landing-nav-link">
              {isID ? 'Konsol Buku Besar' : 'Ledger Console'}
            </a>
            <a href="#profil-investor" className="landing-nav-link">
              {isID ? 'Profil Investor' : 'Investor Roles'}
            </a>
            <a href="#arsitektur-fitur" className="landing-nav-link">
              {isID ? 'Arsitektur Fitur' : 'Platform Architecture'}
            </a>
            <a href="#spesifikasi" className="landing-nav-link">
              {isID ? 'Spesifikasi Pasar' : 'Specifications'}
            </a>
            <a href="#tiket-akses" className="landing-nav-link">
              {isID ? 'Pas Investor' : 'Investor Pass'}
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
                    ? 'Coba Sandbox'
                    : 'Start Sandbox'}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* 2. Grand Editorial Hero & Interactive Ledger Console */}
        <section className="landing-hero" id="konsol">
          <div className="landing-container">
            {/* Local Session Detection Banner when guestAssetCount > 0 */}
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
                    {isID
                      ? `Buka Dasbor (${guestAssetCount} Aset)`
                      : `Open Dashboard (${guestAssetCount})`}
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

            {/* Editorial Hero Header */}
            <div className="landing-hero-header">
              <div className="landing-hero-eyebrow">
                <span className="landing-eyebrow-dot" />
                <span>
                  {isID
                    ? 'BUKU BESAR KEUANGAN PRESISI · PASAR SAHAM BEI & KRIPTO'
                    : 'PRECISION FINANCIAL LEDGER · IDX EQUITIES & FRACTIONAL CRYPTO'}
                </span>
              </div>

              <h1 className="landing-hero-title">
                {isID
                  ? 'Satu Buku Besar Terpadu untuk Saham BEI dan Aset Kripto'
                  : 'One Unified Accounting Ledger for IDX Equities & Crypto'}
              </h1>

              <p className="landing-hero-subtitle">
                {isID
                  ? 'Precision Financial Ledger for Indonesian Investors & Modern Portfolio Tracking. Satukan pencatatan lot saham Bursa Efek Indonesia dan desimal kripto dengan kalkulasi modal rata-rata tertimbang, pemantauan kurs IDR dan USD live, serta diagnostik konsentrasi risiko matematis HHI.'
                  : 'Precision Financial Ledger for Indonesian Investors & Modern Portfolio Tracking. Unify Indonesian stock lot accounting and fractional crypto holdings with weighted-average cost basis, real-time IDR and USD feeds, and mathematical HHI risk analytics.'}
              </p>

              <div className="landing-hero-actions">
                <Link
                  href="/dashboard"
                  className="btn-primary landing-hero-btn-primary"
                  id="hero-cta-sandbox"
                >
                  <span>
                    {isID ? 'Coba Sandbox Mode Tamu' : 'Start in Guest Sandbox'}
                  </span>
                  <ArrowRight size={17} />
                </Link>

                <button
                  type="button"
                  onClick={() => openAuthModal()}
                  className="btn-secondary landing-hero-btn-cloud"
                  id="hero-cta-auth"
                >
                  <CloudUpload size={17} />
                  <span>
                    {isID ? 'Masuk / Simpan ke Cloud' : 'Sign In / Save to Cloud'}
                  </span>
                </button>
              </div>

              <div className="landing-hero-trust-strip" role="list">
                <div className="landing-trust-item" role="listitem">
                  <CheckCircle2 size={15} className="landing-trust-icon" />
                  <span>{isID ? 'Tanpa Registrasi Awal' : 'No Upfront Registration'}</span>
                </div>
                <div className="landing-trust-item" role="listitem">
                  <HardDrive size={15} className="landing-trust-icon" />
                  <span>
                    {isID
                      ? 'Penyimpanan Lokal di Browser'
                      : 'Stored in Your Browser (Local-First)'}
                  </span>
                </div>
                <div className="landing-trust-item" role="listitem">
                  <ShieldCheck size={15} className="landing-trust-icon" />
                  <span>{isID ? '100% Bebas Iklan & Pelacak' : '100% Ad & Tracker Free'}</span>
                </div>
                <div className="landing-trust-item" role="listitem">
                  <Scale size={15} className="landing-trust-icon" />
                  <span>{isID ? 'Kalkulasi Risiko HHI Objektif' : 'Objective HHI Math'}</span>
                </div>
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
                  <div className="landing-console-dots" aria-hidden="true">
                    <span className="landing-console-dot close" />
                    <span className="landing-console-dot minimize" />
                    <span className="landing-console-dot maximize" />
                  </div>
                  <div className="landing-console-badge">
                    <span className="landing-live-dot" />
                    <span className="landing-console-label">
                      {isID ? 'KONSOL BUKU BESAR INTERAKTIF' : 'INTERACTIVE LEDGER WORKSPACE'}
                    </span>
                  </div>
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
                        <span
                          className={`landing-hhi-status-badge ${
                            computedLedger.hhiPoints < 3000 ? 'diversified' : 'concentrated'
                          }`}
                        >
                          <span className="landing-hhi-status-dot" />
                          {computedLedger.hhiPoints < 3000
                            ? isID
                              ? 'TERDIVERSIFIKASI'
                              : 'DIVERSIFIED'
                            : isID
                              ? 'KONSENTRASI TINGGI'
                              : 'CONCENTRATED'}
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

        {/* 3. Role Selector Tabs (Onward Summit Style) */}
        <section className="landing-roles-section" id="profil-investor">
          <div className="landing-roles-container">
            <div className="landing-section-intro">
              <div className="landing-kicker">
                <Compass size={15} />
                <span>
                  {isID
                    ? 'PANDUAN PROFIL INVESTOR / 01'
                    : 'INVESTOR PROFILE PLAYBOOK / 01'}
                </span>
              </div>
              <h2 className="landing-section-title">
                {isID
                  ? 'Dirancang untuk Setiap Strategi Penempatan Modal'
                  : 'Engineered for Every Capital Allocation Strategy'}
              </h2>
              <p className="landing-section-desc">
                {isID
                  ? 'Pilih profil Anda untuk melihat bagaimana mesin buku besar Portofin mengakomodasi konvensi pasar dan kalkulasi posisi Anda secara native.'
                  : 'Select your profile to explore how Portofin natively handles your asset market conventions and position accounting.'}
              </p>
            </div>

            {/* Role selector chips */}
            <div className="landing-chips" role="tablist" aria-label="Investor Profiles">
              {investorRoles.map((role, idx) => {
                const isSelected = selectedRoleIndex === idx;
                return (
                  <button
                    key={role.id}
                    type="button"
                    role="tab"
                    id={`role-tab-${idx}`}
                    aria-selected={isSelected}
                    aria-controls={`role-panel-${idx}`}
                    tabIndex={isSelected ? 0 : -1}
                    className={`landing-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedRoleIndex(idx)}
                  >
                    <span>{role.title}</span>
                    {isSelected && <span className="landing-chip-bar" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {/* Active Pitch Card */}
            <div
              className="landing-pitch-card"
              role="tabpanel"
              id={`role-panel-${selectedRoleIndex}`}
              aria-labelledby={`role-tab-${selectedRoleIndex}`}
            >
              <div className="landing-pitch-header">
                <div className="landing-pitch-role-badge">
                  <span>{activeRole.title}</span>
                </div>
                <span className="landing-pitch-tag">{activeRole.tag}</span>
              </div>

              <p className="landing-pitch-text">{activeRole.pitch}</p>

              <div className="landing-pitch-footer">
                <div className="landing-pitch-specs">
                  {activeRole.specs.map((spec, sIdx) => (
                    <div key={sIdx} className="landing-pitch-spec-item">
                      <CheckCircle2 size={14} />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>

                <Link href="/dashboard" className="btn-secondary landing-custody-btn">
                  <span>{isID ? 'Coba di Dasbor' : 'Try in Dashboard'}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Feature Grid with Geometric SVG Marks (Onward Summit Style) */}
        <section className="landing-features-section" id="arsitektur-fitur">
          <div className="landing-container">
            <div className="landing-section-intro">
              <div className="landing-kicker">
                <Layers size={15} />
                <span>
                  {isID
                    ? 'ARSITEKTUR FITUR / 02'
                    : 'PLATFORM ARCHITECTURE / 02'}
                </span>
              </div>
              <h2 className="landing-section-title">
                {isID
                  ? 'Presisi Akuntansi Finansial Tanpa Kompromi'
                  : 'Uncompromising Financial Accounting Precision'}
              </h2>
              <p className="landing-section-desc">
                {isID
                  ? 'Arsitektur teknis modern yang dirancang untuk kecepatan, kepemilikan data lokal, dan kejernihan analisis risiko kuantitatif.'
                  : 'Modern technical architecture designed for speed, local data custody, and objective quantitative risk clarity.'}
              </p>
            </div>

            <div className="landing-features-grid">
              {/* Feature 1: Automated Tracking */}
              <article className="landing-feature-card">
                <div className="landing-feature-mark" aria-hidden="true">
                  <svg
                    className="landing-mark-svg"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                  >
                    <path
                      d="M7 21L21 7M21 7H10M21 7V18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="landing-feature-title">
                  {isID ? 'Valuasi Pasar Otomatis' : 'Automated Market Tracking'}
                </h3>
                <p className="landing-feature-desc">
                  {isID
                    ? 'Pembaruan harga saham BEI via Yahoo Finance (.JK) dan kripto via CoinGecko secara otomatis tanpa input manual berkala.'
                    : 'Automated price updates for IDX equities via Yahoo Finance (.JK) and crypto via CoinGecko without recurring manual friction.'}
                </p>
              </article>

              {/* Feature 2: Multi-Asset Telemetry */}
              <article className="landing-feature-card">
                <div className="landing-feature-mark" aria-hidden="true">
                  <svg
                    className="landing-mark-svg"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                  >
                    <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.2" />
                    <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="2.2" />
                  </svg>
                </div>
                <h3 className="landing-feature-title">
                  {isID ? 'Telemetri Multi-Aset Terpadu' : 'Multi-Asset Telemetry'}
                </h3>
                <p className="landing-feature-desc">
                  {isID
                    ? 'Menyatukan konvensi Lot saham 100 lembar dan unit desimal kripto dalam satu buku besar akuntansi IDR dan USD yang koheren.'
                    : 'Unifying 100-share stock lots and fractional crypto units into one cohesive accounting ledger in IDR and USD.'}
                </p>
              </article>

              {/* Feature 3: Asset Allocation Radar */}
              <article className="landing-feature-card">
                <div className="landing-feature-mark" aria-hidden="true">
                  <svg
                    className="landing-mark-svg"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                  >
                    <path
                      d="M14 4V24M4 14H24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="14" cy="14" r="7" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 3" />
                  </svg>
                </div>
                <h3 className="landing-feature-title">
                  {isID ? 'Radar Alokasi & Diagnostik HHI' : 'Asset Allocation Radar & HHI'}
                </h3>
                <p className="landing-feature-desc">
                  {isID
                    ? 'Kalkulasi matematis HHI mengkuantifikasi konsentrasi risiko portofolio secara objektif tanpa spekulasi atau saran finansial.'
                    : 'Mathematical HHI calculation quantifies portfolio risk concentration with 100% objective, non-advisory rigor.'}
                </p>
              </article>

              {/* Feature 4: Zero-Friction Guest Mode */}
              <article className="landing-feature-card">
                <div className="landing-feature-mark" aria-hidden="true">
                  <svg
                    className="landing-mark-svg"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                  >
                    <path
                      d="M6 8C6 6.89543 6.89543 6 8 6H20C21.1046 6 22 6.89543 22 8V20C22 21.1046 21.1046 22 20 22H8C6.89543 22 6 21.1046 6 20V8Z"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    />
                    <path d="M11 14L13.5 16.5L17.5 11.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="landing-feature-title">
                  {isID ? 'Mode Tamu Local-First' : 'Zero-Friction Local-First'}
                </h3>
                <p className="landing-feature-desc">
                  {isID
                    ? 'Mulai mencatat seketika di peramban Anda tanpa registrasi. Cadangkan ke PostgreSQL cloud kapan pun Anda siap.'
                    : 'Start logging instantly in your browser without registration. Sync to cloud PostgreSQL whenever you choose.'}
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* 5. Dual-Market Specification Table (Two-Column Asymmetric Layout) */}
        <section className="landing-section" id="spesifikasi">
          <div className="landing-container">
            <div className="landing-split-showcase">
              <div className="landing-split-info">
                <div className="landing-kicker">
                  <Layers size={15} />
                  <span>
                    {isID
                      ? 'KAPABILITAS 03 / SPESIFIKASI PASAR GANDA'
                      : 'CAPABILITY 03 / DUAL-MARKET SPECIFICATION'}
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

        {/* 6. Interactive Pass / Ticket Mockup (Onward Summit Style) */}
        <section className="landing-pass-section" id="tiket-akses">
          <div className="landing-container">
            <div className="landing-pass-grid">
              <div className="landing-pass-info">
                <div className="landing-kicker">
                  <ShieldCheck size={15} />
                  <span>
                    {isID
                      ? 'PAS INVESTOR / AKSES MANDIRI'
                      : 'INVESTOR PASS / SELF-SERVE ACCESS'}
                  </span>
                </div>
                <h2 className="landing-section-title">
                  {isID
                    ? 'Tiket Masuk Ruang Kerja Portofin Anda'
                    : 'Your Portofin Investor Workspace Pass'}
                </h2>
                <p className="landing-section-desc">
                  {isID
                    ? 'Dapatkan akses langsung ke seluruh perangkat pencatatan akuntansi portofolio, kalkulator konsentrasi risiko HHI, dan buku besar transaksi tanpa registrasi awal.'
                    : 'Get direct access to complete portfolio accounting tools, HHI risk concentration diagnostics, and transaction ledgers with zero upfront friction.'}
                </p>
                <div className="landing-hero-trust-strip" role="list">
                  <div className="landing-trust-item" role="listitem">
                    <CheckCircle2 size={15} className="landing-trust-icon" />
                    <span>{isID ? 'Akses Instan Mode Tamu' : 'Instant Guest Sandbox'}</span>
                  </div>
                  <div className="landing-trust-item" role="listitem">
                    <Database size={15} className="landing-trust-icon" />
                    <span>{isID ? 'Data Tersimpan Lokal di Browser' : 'Local Browser Custody'}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Pass / Ticket Component with Perforation Cutout Notches */}
              <div className="landing-ticket" role="region" aria-label="Portofin Investor Pass">
                <div className="landing-ticket-top">
                  <span className="landing-ticket-kicker">
                    <CheckCircle2 size={14} />
                    {isID ? 'PAS SANDBOX TERVERIFIKASI' : 'VERIFIED SANDBOX PASS'}
                  </span>
                  <h3 className="landing-ticket-title">
                    {isID ? 'Ruang Kerja Investor Portofin' : 'Portofin Investor Workspace'}
                  </h3>
                  <p className="landing-ticket-meta">
                    {isID
                      ? 'IDR & USD Multi-Currency · Local-First Storage · Non-Advisory Engine'
                      : 'IDR & USD Multi-Currency · Local-First Storage · Non-Advisory Engine'}
                  </p>
                </div>

                {/* Perforation line with circular notch cutouts */}
                <div className="landing-ticket-perf" aria-hidden="true" />

                <div className="landing-ticket-bot">
                  <div className="landing-ticket-id-strip">
                    <div>
                      <span className="landing-ticket-label">
                        {isID ? 'KODE AKSES PAS' : 'PASS IDENTIFIER'}
                      </span>
                      <span className="landing-ticket-code tabular">PASS-PTFN-2026-X79K</span>
                    </div>
                    <span className="landing-ticket-badge">
                      <span className="landing-live-dot" />
                      {isID ? 'AKTIF DI PERAMBAN' : 'BROWSER ACTIVE'}
                    </span>
                  </div>

                  <div className="landing-ticket-perks">
                    <div className="landing-ticket-perk">
                      <Check size={15} />
                      <span>
                        {isID
                          ? 'Pencatatan aset tanpa batas di browser Anda'
                          : 'Unlimited asset tracking stored directly in your browser'}
                      </span>
                    </div>
                    <div className="landing-ticket-perk">
                      <Check size={15} />
                      <span>
                        {isID
                          ? '100% Bebas iklan, pelacak, dan tanpa perlu email di awal'
                          : '100% Ad and tracker free, zero upfront email required'}
                      </span>
                    </div>
                    <div className="landing-ticket-perk">
                      <Check size={15} />
                      <span>
                        {isID
                          ? 'Sinkronisasi ke cloud PostgreSQL kapan pun Anda siap'
                          : 'Idempotent cloud PostgreSQL migration whenever you are ready'}
                      </span>
                    </div>
                  </div>

                  <div className="landing-ticket-actions">
                    <Link href="/dashboard" className="btn-primary landing-hero-btn-primary">
                      <span>{isID ? 'Buka Dasbor Tamu (Instan)' : 'Open Guest Dashboard'}</span>
                      <ArrowRight size={16} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => openAuthModal()}
                      className="btn-secondary landing-hero-btn-cloud"
                    >
                      <CloudUpload size={16} />
                      <span>{isID ? 'Hubungkan Cloud' : 'Connect Cloud'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPassCode}
                      className="btn-secondary"
                      title={isID ? 'Salin Kode Akses' : 'Copy Pass Code'}
                    >
                      {copiedPass ? <Check size={15} /> : <Copy size={15} />}
                      <span>{copiedPass ? (isID ? 'Tersalin' : 'Copied') : (isID ? 'Salin Kode' : 'Copy Code')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. Watermark Typography Footer (Onward Summit Style) */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="landing-brand-group">
              <div className="landing-brand-logo">
                <img
                  src="/logo.png"
                  alt="Portofin"
                  width={22}
                  height={22}
                  style={{ borderRadius: 5 }}
                />
              </div>
              <span className="landing-brand-name">Portofin</span>
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

            <div className="landing-footer-meta">
              <p className="landing-footer-copy">
                © 2026 Portofin.{' '}
                {isID
                  ? 'Buku besar pencatatan & diagnostik risiko portofolio saham BEI dan kripto.'
                  : 'IDX equity and crypto portfolio accounting ledger & risk diagnostics.'}
              </p>

              <div className="landing-footer-telemetry">
                <span className="landing-live-dot" />
                <span>
                  {isID
                    ? 'Local-First Ready · Kurs Acuan Rp 16.400 / USD · Non-Advisory'
                    : 'Local-First Ready · Reference FX IDR 16,400 / USD · Non-Advisory'}
                </span>
              </div>
            </div>
          </div>

          {/* Massive Editorial Typographic Watermark (Signature Onward Summit Technique) */}
          <div className="landing-footer-watermark" aria-hidden="true">
            PORTOFIN
          </div>
        </div>
      </footer>
    </div>
  );
}
