'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  CloudUpload,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Scale,
  TrendingUp,
  Layers,
  Calculator,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Lock,
  Activity,
} from 'lucide-react';

interface PreviewHolding {
  ticker: string;
  name: string;
  market: 'IDX' | 'CRYPTO';
  qtyLabel: string;
  priceIdr: number;
  valueIdr: number;
  plIdr: number;
  plPct: number;
  color: string;
}

const PREVIEW_HOLDINGS: PreviewHolding[] = [
  {
    ticker: 'BBCA',
    name: 'Bank Central Asia Tbk',
    market: 'IDX',
    qtyLabel: '50 Lot (5.000 lbr)',
    priceIdr: 9850,
    valueIdr: 49250000,
    plIdr: 4250000,
    plPct: 9.44,
    color: '#003D79',
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    market: 'CRYPTO',
    qtyLabel: '0.0420 BTC',
    priceIdr: 1120000000,
    valueIdr: 47040000,
    plIdr: 8400000,
    plPct: 21.74,
    color: '#F7931A',
  },
  {
    ticker: 'TLKM',
    name: 'Telkom Indonesia Tbk',
    market: 'IDX',
    qtyLabel: '100 Lot (10.000 lbr)',
    priceIdr: 3180,
    valueIdr: 31800000,
    plIdr: 2300000,
    plPct: 7.8,
    color: '#E31937',
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    market: 'CRYPTO',
    qtyLabel: '0.4500 ETH',
    priceIdr: 45600000,
    valueIdr: 20520000,
    plIdr: 2520000,
    plPct: 14.0,
    color: '#1D4ED8',
  },
];

export default function LandingPage() {
  const { lang, toggleLanguage } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const [previewCurrency, setPreviewCurrency] = useState<'IDR' | 'USD'>('IDR');
  const isID = lang === 'id';

  const fxRate = 16400;
  const formatPreviewMoney = (idrAmount: number) => {
    if (previewCurrency === 'USD') {
      const usd = idrAmount / fxRate;
      return `$${usd.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `Rp ${Math.round(idrAmount).toLocaleString('id-ID')}`;
  };

  const totalPreviewValue = 148610000;
  const totalPreviewPl = 17470000;
  const dailyPreviewChange = 2640000;

  return (
    <div className="landing-page" id="landing-page">
      {/* Dedicated Landing Navbar */}
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
            <span className="landing-version-badge">v2.0 / Precision Ledger</span>
          </div>

          <nav className="landing-nav-links" aria-label="Landing Navigation">
            <a href="#fitur" className="landing-nav-link">
              {isID ? 'Fitur' : 'Features'}
            </a>
            <a href="#sandbox" className="landing-nav-link">
              {isID ? 'Sandbox Tamu' : 'Guest Sandbox'}
            </a>
            <a href="#etika-ai" className="landing-nav-link">
              {isID ? 'Etika AI' : 'AI Ethics'}
            </a>
            <a href="#faq" className="landing-nav-link">
              FAQ
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
                className="landing-signin-btn"
                id="landing-signin-btn"
              >
                {isID ? 'Masuk' : 'Sign In'}
              </button>
            )}

            <Link href="/dashboard" className="btn-primary landing-cta-sm" id="landing-nav-dashboard">
              <span>
                {user
                  ? isID
                    ? 'Buka Dasbor'
                    : 'Open Dashboard'
                  : isID
                    ? 'Buka Dasbor (Tamu)'
                    : 'Open Dashboard (Guest)'}
              </span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-container">
            <div className="landing-hero-eyebrow">
              <Activity size={14} />
              <span>IDX EQUITY &amp; CRYPTO PORTFOLIO LEDGER</span>
            </div>

            <h1 className="landing-hero-title">
              {isID
                ? 'Satu Dasbor Terpadu untuk Saham IDX & Crypto Kamu'
                : 'A Precision Ledger for Your IDX Stocks & Crypto Assets'}
            </h1>

            <p className="landing-hero-subtitle">
              {isID
                ? 'Lacak profit/loss real-time, evaluasi konsentrasi risiko secara objektif, dan mulai eksplorasi seketika dalam Sandbox Lokal tanpa perlu registrasi.'
                : 'Track real-time profit/loss, evaluate risk concentration objectively, and start exploring immediately in a Local Sandbox with zero registration required.'}
            </p>

            <div className="landing-hero-actions">
              <Link
                href="/dashboard"
                className="btn-primary landing-hero-primary"
                id="hero-cta-sandbox"
              >
                <span>
                  {isID
                    ? 'Coba Sandbox Tamu (Buka Dasbor)'
                    : 'Try Guest Sandbox (Open Dashboard)'}
                </span>
                <ArrowRight size={17} />
              </Link>

              <button
                type="button"
                onClick={() => openAuthModal()}
                className="landing-hero-secondary"
                id="hero-cta-auth"
              >
                <CloudUpload size={17} />
                <span>
                  {isID ? 'Masuk / Buat Akun Cloud' : 'Sign In / Create Cloud Account'}
                </span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="landing-trust-strip" role="list">
              <div className="landing-trust-item" role="listitem">
                <CheckCircle2 size={15} className="landing-trust-icon" />
                <span>{isID ? 'Tanpa Registrasi Awal' : 'No Upfront Registration'}</span>
              </div>
              <div className="landing-trust-item" role="listitem">
                <HardDrive size={15} className="landing-trust-icon" />
                <span>
                  {isID ? 'Data Tersimpan di Browser Anda' : 'Data Stored in Your Browser'}
                </span>
              </div>
              <div className="landing-trust-item" role="listitem">
                <ShieldCheck size={15} className="landing-trust-icon" />
                <span>{isID ? '100% Bebas Iklan & Pelacak' : '100% Ad-Free & Tracker-Free'}</span>
              </div>
              <div className="landing-trust-item" role="listitem">
                <Scale size={15} className="landing-trust-icon" />
                <span>
                  {isID
                    ? 'Kalkulasi Risiko Objektif Tanpa Nasihat Finansial Palsu'
                    : 'Objective Risk Math, Zero Speculative Advice'}
                </span>
              </div>
            </div>

            {/* Interactive Live Preview Mockup (Bento Grid LEDGER) */}
            <div className="landing-ledger-frame" aria-label="Interactive Portfolio Ledger Preview">
              <div className="landing-ledger-topbar">
                <div className="landing-ledger-topbar-left">
                  <span className="landing-ledger-dot" />
                  <span className="landing-ledger-title">
                    {isID
                      ? 'PRATINJAU INTERAKTIF BUKU BESAR PORTOFIN'
                      : 'INTERACTIVE PORTOFIN LEDGER PREVIEW'}
                  </span>
                </div>
                <div className="landing-ledger-topbar-right">
                  <span className="landing-ledger-hint">
                    {isID ? 'Uji konversi mata uang:' : 'Test currency toggle:'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewCurrency(previewCurrency === 'IDR' ? 'USD' : 'IDR')
                    }
                    className="currency-toggle-btn small"
                    aria-label="Toggle preview currency"
                  >
                    <span
                      className={`currency-option ${
                        previewCurrency === 'IDR' ? 'active' : ''
                      }`}
                    >
                      IDR
                    </span>
                    <span
                      className={`currency-option ${
                        previewCurrency === 'USD' ? 'active' : ''
                      }`}
                    >
                      USD
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary Strip inside Preview */}
              <div className="landing-preview-summary">
                <div className="landing-preview-metric">
                  <span className="landing-preview-label">
                    {isID ? 'TOTAL NILAI PORTOFOLIO' : 'TOTAL PORTFOLIO VALUE'}
                  </span>
                  <span className="landing-preview-value">
                    {formatPreviewMoney(totalPreviewValue)}
                  </span>
                  <span className="landing-preview-sub">
                    4 {isID ? 'posisi aktif (2 Saham IDX, 2 Crypto)' : 'active positions (2 IDX, 2 Crypto)'}
                  </span>
                </div>

                <div className="landing-preview-metric">
                  <span className="landing-preview-label">
                    {isID ? 'TOTAL LABA / RUGI' : 'TOTAL UNREALIZED P/L'}
                  </span>
                  <span className="landing-preview-value positive">
                    +{formatPreviewMoney(totalPreviewPl)}
                  </span>
                  <span className="landing-preview-badge positive">+13.32%</span>
                </div>

                <div className="landing-preview-metric">
                  <span className="landing-preview-label">
                    {isID ? 'PERUBAHAN 24 JAM' : '24H NET CHANGE'}
                  </span>
                  <span className="landing-preview-value positive">
                    +{formatPreviewMoney(dailyPreviewChange)}
                  </span>
                  <span className="landing-preview-badge positive">+1.81%</span>
                </div>
              </div>

              {/* Lower Bento Grid: Holdings Table + HHI Risk Gauge */}
              <div className="landing-preview-bento">
                {/* Holdings Preview Table */}
                <div className="landing-preview-table-card">
                  <div className="landing-preview-card-header">
                    <span className="landing-preview-card-title">
                      {isID ? 'Posisi Kepemilikan Aset' : 'Active Asset Holdings'}
                    </span>
                    <span className="landing-preview-card-tag">LIVE FEED SIMULATION</span>
                  </div>

                  <div className="landing-preview-rows">
                    {PREVIEW_HOLDINGS.map((item) => (
                      <div key={item.ticker} className="landing-preview-row">
                        <div className="landing-preview-asset">
                          <div
                            className="landing-preview-avatar"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.ticker.slice(0, 2)}
                          </div>
                          <div>
                            <div className="landing-preview-asset-top">
                              <span className="landing-preview-ticker">{item.ticker}</span>
                              <span className="landing-preview-market">{item.market}</span>
                            </div>
                            <span className="landing-preview-qty">{item.qtyLabel}</span>
                          </div>
                        </div>

                        <div className="landing-preview-price-col">
                          <span className="landing-preview-val">
                            {formatPreviewMoney(item.valueIdr)}
                          </span>
                          <span className="landing-preview-pl positive">
                            +{item.plPct.toFixed(2)}% (+{formatPreviewMoney(item.plIdr)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HHI Risk Gauge Card */}
                <div className="landing-preview-gauge-card">
                  <div className="landing-preview-card-header">
                    <span className="landing-preview-card-title">
                      {isID ? 'Diagnostik Risiko HHI' : 'HHI Risk Diagnostics'}
                    </span>
                    <span className="landing-preview-card-tag">NON-ADVISORY</span>
                  </div>

                  <div className="landing-gauge-wrap">
                    <svg viewBox="0 0 140 80" className="landing-gauge-svg">
                      <path
                        d="M 14 70 A 56 56 0 0 1 126 70"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="12"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 14 70 A 56 56 0 0 1 126 70"
                        fill="none"
                        stroke="var(--green-text)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray="66 176"
                      />
                    </svg>
                    <div className="landing-gauge-readout">
                      <span className="landing-gauge-score">28</span>
                      <span className="landing-gauge-status">
                        {isID ? 'Konsentrasi Seimbang' : 'Balanced Concentration'}
                      </span>
                    </div>
                  </div>

                  <div className="landing-alloc-split">
                    <div className="landing-alloc-labels">
                      <span>IDX Equities (54.5%)</span>
                      <span>Crypto (45.5%)</span>
                    </div>
                    <div className="landing-alloc-bar">
                      <div className="landing-alloc-seg idx" style={{ width: '54.5%' }} />
                      <div className="landing-alloc-seg crypto" style={{ width: '45.5%' }} />
                    </div>
                    <p className="landing-gauge-note">
                      {isID
                        ? 'Indeks Herfindahl-Hirschman (HHI = 0.278) mengukur distribusi bobot matematis antar aset tanpa bias spekulasi.'
                        : 'Herfindahl-Hirschman Index (HHI = 0.278) measures mathematical weight distribution across assets without speculative bias.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Core Value Pillars (Bento Grid) */}
        <section className="landing-section" id="fitur">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-kicker">
                {isID ? 'ARSITEKTUR & FITUR UTAMA' : 'CORE ARCHITECTURE & FEATURES'}
              </span>
              <h2 className="landing-section-title">
                {isID
                  ? 'Dirancang untuk Presisi Angka dan Ketenangan Pikiran'
                  : 'Engineered for Numerical Precision and Peace of Mind'}
              </h2>
              <p className="landing-section-desc">
                {isID
                  ? 'Tanpa grafik kosmetik yang membingungkan. Setiap komponen berfokus pada akurasi pencatatan modal, kejelasan laba/rugi, dan kontrol penuh atas data finansial Anda.'
                  : 'No confusing cosmetic charts. Every component focuses on capital accounting accuracy, profit/loss clarity, and complete ownership of your financial data.'}
              </p>
            </div>

            <div className="landing-pillars-grid">
              {/* Pillar 1 */}
              <article className="landing-pillar-card">
                <div className="landing-pillar-icon">
                  <Layers size={20} />
                </div>
                <span className="landing-pillar-tag">DUAL-MARKET ENGINE</span>
                <h3 className="landing-pillar-title">
                  {isID
                    ? '1. Dua Pasar Terintegrasi (Saham IDX & Crypto)'
                    : '1. Dual-Market Integration (IDX Stocks & Crypto)'}
                </h3>
                <p className="landing-pillar-body">
                  {isID
                    ? 'Mendukung satuan lot Bursa Efek Indonesia (1 lot = 100 lembar saham) sekaligus presisi desimal aset kripto hingga 8 angka di belakang koma, lengkap dengan konversi kurs otomatis IDR dan USD.'
                    : 'Supports Indonesia Stock Exchange lot conventions (1 lot = 100 shares) alongside fractional crypto precision, complete with automatic real-time IDR and USD exchange rate conversion.'}
                </p>
              </article>

              {/* Pillar 2 */}
              <article className="landing-pillar-card" id="sandbox">
                <div className="landing-pillar-icon">
                  <Lock size={20} />
                </div>
                <span className="landing-pillar-tag">LOCAL-FIRST &amp; DEFERRED AUTH</span>
                <h3 className="landing-pillar-title">
                  {isID
                    ? '2. Local-First Sandbox & Tanpa Paksaan Login'
                    : '2. Local-First Sandbox & Deferred Authentication'}
                </h3>
                <p className="landing-pillar-body">
                  {isID
                    ? 'Mulai kelola aset seketika di browser Anda tanpa formulir pendaftaran. Data portofolio tersimpan lokal di perangkat Anda, dan dapat dicadangkan secara otomatis ke akun Cloud kapan saja Anda inginkan.'
                    : 'Start managing assets immediately in your browser without registration walls. Your portfolio stays locally on your device and syncs seamlessly to the cloud whenever you choose to sign in.'}
                </p>
              </article>

              {/* Pillar 3 */}
              <article className="landing-pillar-card" id="etika-ai">
                <div className="landing-pillar-icon">
                  <Calculator size={20} />
                </div>
                <span className="landing-pillar-tag">OBJECTIVE RISK DIAGNOSTICS</span>
                <h3 className="landing-pillar-title">
                  {isID
                    ? '3. Diagnostik Risiko Kuantitatif (Bukan Nasihat Spekulatif)'
                    : '3. Quantitative Risk Diagnostics (Not Speculative Advice)'}
                </h3>
                <p className="landing-pillar-body">
                  {isID
                    ? 'Keputusan finansial membutuhkan kehati-hatian tinggi. Portofin memposisikan AI murni sebagai kalkulator konsentrasi risiko HHI, evaluator diversifikasi, dan simulator skenario koreksi pasar tanpa pernah memberi sinyal beli/jual.'
                    : 'Financial decisions demand strict caution. Portofin positions AI purely as an HHI concentration calculator, diversification evaluator, and market drawdown simulator without issuing buy/sell signals.'}
                </p>
              </article>

              {/* Pillar 4 */}
              <article className="landing-pillar-card">
                <div className="landing-pillar-icon">
                  <FileSpreadsheet size={20} />
                </div>
                <span className="landing-pillar-tag">PRECISION ACCOUNTING</span>
                <h3 className="landing-pillar-title">
                  {isID
                    ? '4. Pencatatan Transaksi & Cost-Basis Presisi'
                    : '4. Precision Transaction & Cost-Basis Ledger'}
                </h3>
                <p className="landing-pillar-body">
                  {isID
                    ? 'Perhitungan otomatis rata-rata harga beli tertimbang (weighted average cost) setiap kali Anda menambah posisi, pencatatan realized profit/loss saat menjual sebagian atau seluruh aset, serta riwayat transaksi per ticker.'
                    : 'Automatic weighted-average buy price calculation on every buy order, realized profit/loss tracking on partial or full exits, and complete historical audit trails per ticker.'}
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* 3-Step Workflow Section */}
        <section className="landing-section landing-section-alt">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-kicker">
                {isID ? 'ALUR PENGGUNAAN SEDERHANA' : 'FRICTIONLESS WORKFLOW'}
              </span>
              <h2 className="landing-section-title">
                {isID
                  ? 'Mulai dalam 10 Detik Tanpa Hambatan'
                  : 'Start in 10 Seconds with Zero Friction'}
              </h2>
            </div>

            <div className="landing-steps-grid">
              <div className="landing-step-card">
                <span className="landing-step-num">01</span>
                <h3 className="landing-step-title">
                  {isID
                    ? 'Buka Dasbor Langsung (0 Formulir Registrasi)'
                    : 'Open Dashboard Immediately (0 Registration Forms)'}
                </h3>
                <p className="landing-step-desc">
                  {isID
                    ? 'Klik tombol Buka Dasbor dan Anda langsung masuk ke ruang kerja penuh dalam Mode Sandbox Tamu tanpa diminta email atau kata sandi.'
                    : 'Click Open Dashboard to enter the full workspace in Guest Sandbox Mode without being asked for an email or password.'}
                </p>
              </div>

              <div className="landing-step-card">
                <span className="landing-step-num">02</span>
                <h3 className="landing-step-title">
                  {isID
                    ? 'Catat Aset atau Muat Portofolio Contoh'
                    : 'Log Your Assets or Load Sample Portfolio'}
                </h3>
                <p className="landing-step-desc">
                  {isID
                    ? 'Cari ticker saham IDX (seperti BBCA, BBRI, TLKM) atau kripto (BTC, ETH, SOL), atau klik tombol Muat Data Contoh untuk langsung menguji fitur.'
                    : 'Search any IDX stock ticker (BBCA, BBRI, TLKM) or crypto asset (BTC, ETH, SOL), or click Load Sample Data to test all features right away.'}
                </p>
              </div>

              <div className="landing-step-card">
                <span className="landing-step-num">03</span>
                <h3 className="landing-step-title">
                  {isID
                    ? 'Pantau Kinerja & Cadangkan ke Cloud Kapan Saja'
                    : 'Monitor Live Performance & Sync to Cloud Anytime'}
                </h3>
                <p className="landing-step-desc">
                  {isID
                    ? 'Evaluasi laba/rugi real-time serta metrik konsentrasi risiko. Jika Anda ingin mengaksesnya dari perangkat lain, cukup masuk untuk menyinkronkan otomatis.'
                    : 'Evaluate live P/L and risk concentration metrics. Whenever you want multi-device access, sign in to automatically migrate your local ledger to the cloud.'}
                </p>
              </div>
            </div>

            <div className="landing-steps-cta">
              <Link href="/dashboard" className="btn-primary landing-hero-primary">
                <span>
                  {isID
                    ? 'Masuk ke Dasbor Portofolio Sekarang'
                    : 'Enter Portfolio Dashboard Now'}
                </span>
                <ChevronRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="landing-section" id="faq">
          <div className="landing-container">
            <div className="landing-section-header">
              <span className="landing-section-kicker">FAQ</span>
              <h2 className="landing-section-title">
                {isID ? 'Pertanyaan yang Sering Diajukan' : 'Frequently Asked Questions'}
              </h2>
            </div>

            <div className="landing-faq-grid">
              <div className="landing-faq-card">
                <h3 className="landing-faq-q">
                  {isID
                    ? 'Apakah data portofolio saya aman saat menggunakan Mode Tamu?'
                    : 'Is my portfolio data safe when using Guest Mode?'}
                </h3>
                <p className="landing-faq-a">
                  {isID
                    ? 'Ya. Dalam Mode Tamu, seluruh data portofolio dan transaksi disimpan langsung di penyimpanan lokal browser perangkat Anda (localStorage). Saat Anda memutuskan membuat akun atau masuk, data tersebut otomatis dimigrasikan ke akun Cloud Anda tanpa ada yang hilang.'
                    : 'Yes. In Guest Mode, all portfolio holdings and transactions are stored locally in your browser (localStorage). When you decide to create an account or sign in, your local data is automatically migrated to your cloud account without losing a single entry.'}
                </p>
              </div>

              <div className="landing-faq-card">
                <h3 className="landing-faq-q">
                  {isID
                    ? 'Mengapa AI di Portofin tidak memberikan rekomendasi saham/koin untuk dibeli?'
                    : 'Why does Portofin AI refrain from recommending stocks or coins to buy?'}
                </h3>
                <p className="landing-faq-a">
                  {isID
                    ? 'Pengelolaan uang membutuhkan kehati-hatian tinggi dan tanggung jawab penuh. Model bahasa AI tidak boleh menggantikan riset mandiri atau penasihat keuangan berlisensi. Karena itu, Portofin AI dibatasi secara ketat sebagai kalkulator risiko kuantitatif (HHI, korelasi, dan simulasi bobot alokasi).'
                    : 'Managing capital requires strict caution and personal accountability. Language models should never replace independent research or licensed financial planners. Therefore, Portofin AI is strictly engineered as a quantitative risk calculator (HHI, correlation, and allocation weight simulation).'}
                </p>
              </div>

              <div className="landing-faq-card">
                <h3 className="landing-faq-q">
                  {isID
                    ? 'Bagaimana cara perhitungan lot saham IDX dan harga lintas mata uang?'
                    : 'How does Portofin handle IDX stock lots and cross-currency pricing?'}
                </h3>
                <p className="landing-faq-a">
                  {isID
                    ? 'Untuk saham Indonesia (IDX), Anda cukup memasukkan jumlah Lot dan Portofin otomatis mengalikan 1 Lot = 100 lembar saham. Untuk aset kripto, Anda dapat mencatat harga beli dalam IDR maupun USD dan mengalihkan mata uang tampilan kapan saja dengan kurs live.'
                    : 'For Indonesian equities (IDX), simply input the number of Lots and Portofin automatically calculates 1 Lot = 100 shares. For crypto assets, you can record buy prices in either IDR or USD and toggle display currencies anytime using live exchange rates.'}
                </p>
              </div>

              <div className="landing-faq-card">
                <h3 className="landing-faq-q">
                  {isID
                    ? 'Apakah Portofin meminta akses ke akun sekuritas atau dompet kripto saya?'
                    : 'Does Portofin ask for access to my brokerage account or crypto wallet?'}
                </h3>
                <p className="landing-faq-a">
                  {isID
                    ? 'Tidak pernah. Portofin adalah buku besar pencatatan dan analitik portofolio mandiri. Kami tidak pernah meminta kredensial sekuritas, seed phrase, atau private key dompet kripto Anda.'
                    : 'Never. Portofin is an independent portfolio ledger and analytics workspace. We never ask for brokerage credentials, seed phrases, or crypto wallet private keys.'}
                </p>
              </div>
            </div>

            {/* Regulatory & DYOR Transparency Banner */}
            <div className="landing-dyor-banner" role="note">
              <div className="landing-dyor-icon">
                <AlertTriangle size={20} />
              </div>
              <div className="landing-dyor-body">
                <h3 className="landing-dyor-title">
                  {isID
                    ? 'Pernyataan Transparansi & Batasan Etika (Bukan Penasihat Keuangan / DYOR)'
                    : 'Transparency & Ethical Guardrail Statement (Non-Advisory / DYOR)'}
                </h3>
                <p className="landing-dyor-text">
                  {isID
                    ? 'Portofin adalah perangkat lunak pencatatan portofolio, kalkulator metrik konsentrasi risiko (HHI), dan alat simulasi edukasi finansial. Portofin bukan manajer investasi, perencana keuangan bersertifikat, maupun pialang berjangka di bawah OJK/Bappebti. Seluruh informasi yang ditampilkan bersifat analitik dan edukatif, bukan ajakan atau anjuran untuk membeli, menahan, atau menjual instrumen efek maupun aset kripto apa pun. Selalu lakukan riset mandiri (Do Your Own Research) sebelum mengambil keputusan finansial.'
                    : 'Portofin is a portfolio accounting ledger, risk concentration calculator (HHI), and financial education simulation tool. Portofin is not a licensed investment manager, certified financial planner, or broker-dealer. All displayed information is strictly analytical and educational, and never constitutes a solicitation or recommendation to buy, hold, or sell any equity or crypto asset. Always conduct independent research (Do Your Own Research) before making financial decisions.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-left">
            <div className="landing-brand-group">
              <div className="landing-brand-logo">
                <img
                  src="/logo.png"
                  alt="Portofin"
                  width={20}
                  height={20}
                  style={{ borderRadius: 4 }}
                />
              </div>
              <span className="landing-brand-name">Portofin</span>
              <span className="landing-version-badge">Precision Financial Ledger</span>
            </div>
            <p className="landing-footer-copy">
              © 2026 Portofin. Built by Latif Fauzi.{' '}
              {isID
                ? 'Alat pencatatan & diagnostik risiko portofolio saham IDX dan kripto.'
                : 'IDX stock and cryptocurrency portfolio ledger & risk diagnostic tool.'}
            </p>
          </div>

          <div className="landing-footer-links">
            <Link href="/dashboard" className="landing-footer-link">
              {isID ? 'Dasbor Portofolio' : 'Portfolio Dashboard'}
            </Link>
            <Link href="/ai-advisor" className="landing-footer-link">
              {isID ? 'Diagnostik Risiko AI' : 'AI Risk Diagnostics'}
            </Link>
            <Link href="/transactions" className="landing-footer-link">
              {isID ? 'Buku Besar Transaksi' : 'Transaction Ledger'}
            </Link>
            <Link href="/login" className="landing-footer-link">
              {isID ? 'Halaman Login' : 'Login Page'}
            </Link>
            <a
              href="https://github.com/hi-lufz1/portofin"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-footer-link"
            >
              <span>GitHub</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
