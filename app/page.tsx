'use client';

import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/contexts/PortfolioContext';

/* ==========================================================================
   MATHEMATICAL & GEOMETRIC UTILITIES (PORTOFIN LEDGER ENGINE)
   ========================================================================== */

function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

function smoothstep(min: number, max: number, val: number): number {
  const x = clamp((val - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

function createPrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 1831565813) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrapAngle(rad: number): number {
  const twoPi = Math.PI * 2;
  let res = (((rad + Math.PI) % twoPi) + twoPi) % twoPi - Math.PI;
  if (res === -Math.PI) res = Math.PI;
  return res;
}

function calcFieldDensity(
  mode: 'hero' | 'band',
  normX: number,
  normY: number,
  aspect: number
): [number, number] {
  if (mode === 'band') {
    const fadeY = smoothstep(0, 0.14, normY) * smoothstep(0, 0.14, 1 - normY);
    const fadeX = 0.25 + 0.75 * smoothstep(0.1, 0.8, normX);
    return [0.55 * fadeY * fadeX, 0];
  }
  const topFade = (0.3 + 0.7 * smoothstep(0.02, 0.48, normY)) * (1 - smoothstep(0.5, 0.74, normY));
  const botFade = smoothstep(0.54, 0.72, normY) * (1 - smoothstep(0.8, 0.985, normY));
  const dx = (normX - 0.5) * aspect;
  const dy = (normY - 0.47) * 1.25;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radialMask = 0.1 + 0.9 * smoothstep(0.1, 0.4, dist);
  return [topFade * radialMask, botFade * radialMask * 0.9];
}

function drawGlyphOnCanvas(
  ctx: CanvasRenderingContext2D,
  glyph: 'arrow' | 'ring' | 'plus' | 'dot',
  size: number
) {
  const arm = size * 0.31;
  const half = size / 2;
  ctx.beginPath();
  if (glyph === 'plus') {
    ctx.moveTo(half - arm, half);
    ctx.lineTo(half + arm, half);
    ctx.moveTo(half, half - arm);
    ctx.lineTo(half, half + arm);
    ctx.stroke();
  } else if (glyph === 'ring') {
    ctx.arc(half, half, arm * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  } else if (glyph === 'dot') {
    ctx.arc(half, half, arm * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Arrow financial uptick glyph
    ctx.moveTo(half - arm, half + arm);
    ctx.lineTo(half + arm, half - arm);
    ctx.moveTo(half - arm * 0.15, half - arm);
    ctx.lineTo(half + arm, half - arm);
    ctx.lineTo(half + arm, half + arm * 0.15);
    ctx.stroke();
  }
}

/* ==========================================================================
   INTERACTIVE CANVAS FIELD (HERO & BAND)
   ========================================================================== */

interface CanvasFieldProps {
  mode: 'hero' | 'band';
  glyph?: 'arrow' | 'ring' | 'plus' | 'dot';
  lightColor: string;
  darkColor: string;
  cell?: number;
}

function InteractiveCanvasField({
  mode,
  glyph = 'arrow',
  lightColor,
  darkColor,
  cell = 14,
}: CanvasFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const parent = container?.parentElement;
    if (!container || !canvas || !parent) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let totalPoints = 0;
    let posX = new Float32Array(0);
    let posY = new Float32Array(0);
    let densityLight = new Float32Array(0);
    let densityDark = new Float32Array(0);
    let randomNoise = new Float32Array(0);
    let currentAngle = new Float32Array(0);
    let currentScale = new Float32Array(0);
    let lightSprite: HTMLCanvasElement | null = null;
    let darkSprite: HTMLCanvasElement | null = null;

    const pointer = { x: 0, y: 0, active: false };
    const ripples: Array<{ x: number; y: number; t0: number }> = [];
    let rafId = 0;
    let isVisible = true;
    const halfCell = cell / 2;

    const renderSprite = (color: string): HTMLCanvasElement => {
      const offscreen = document.createElement('canvas');
      const spriteSize = Math.ceil(cell * dpr * 2);
      offscreen.width = spriteSize;
      offscreen.height = spriteSize;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.scale(spriteSize / cell, spriteSize / cell);
        offCtx.strokeStyle = color;
        offCtx.fillStyle = color;
        offCtx.lineWidth = Math.max(1.1, cell * 0.11);
        offCtx.lineCap = 'square';
        offCtx.lineJoin = 'miter';
        drawGlyphOnCanvas(offCtx, glyph, cell);
      }
      return offscreen;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      const cols = Math.ceil(width / cell) + 1;
      const rows = Math.ceil(height / cell) + 1;
      totalPoints = cols * rows;

      posX = new Float32Array(totalPoints);
      posY = new Float32Array(totalPoints);
      densityLight = new Float32Array(totalPoints);
      densityDark = new Float32Array(totalPoints);
      randomNoise = new Float32Array(totalPoints);
      currentAngle = new Float32Array(totalPoints);
      currentScale = new Float32Array(totalPoints).fill(1);

      const offsetX = (width - (cols - 1) * cell) / 2;
      const offsetY = (height - (rows - 1) * cell) / 2;
      const prng = createPrng(cols * 977 + rows);

      for (let r = 0, idx = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, idx++) {
          const px = offsetX + c * cell;
          const py = offsetY + r * cell;
          const [lD, dD] = calcFieldDensity(mode, px / width, py / height, width / height);
          posX[idx] = px;
          posY[idx] = py;
          densityLight[idx] = lD;
          densityDark[idx] = dD;
          randomNoise[idx] = 0.5 + 0.5 * prng();
        }
      }
      lightSprite = renderSprite(lightColor);
      darkSprite = renderSprite(darkColor);
    };

    const render = (time: number): boolean => {
      if (!lightSprite || !darkSprite) return false;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pointerRadius = 150;
      const radiusSq = pointerRadius * pointerRadius;

      for (let i = ripples.length - 1; i >= 0; i--) {
        if (time - ripples[i].t0 > 1900) ripples.splice(i, 1);
      }

      let hasActiveDynamics = ripples.length > 0;

      for (let i = 0; i < totalPoints; i++) {
        const dL = densityLight[i];
        const dD = densityDark[i];
        if (dL + dD < 0.012) continue;

        const px = posX[i];
        const py = posY[i];
        let targetAngle = 0;
        let targetScale = 1;
        let boostAlpha = 0;

        if (pointer.active) {
          const dx = px - pointer.x;
          const dy = py - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq) {
            let proximity = 1 - Math.sqrt(distSq) / pointerRadius;
            proximity = proximity * proximity * (3 - 2 * proximity);
            targetAngle = wrapAngle(Math.atan2(dy, dx) + Math.PI / 4) * proximity;
            targetScale = 1 + 0.75 * proximity;
            boostAlpha = 0.55 * proximity;
          }
        }

        for (const rip of ripples) {
          const elapsed = time - rip.t0;
          const dx = px - rip.x;
          const dy = py - rip.y;
          const distWave = Math.abs(Math.sqrt(dx * dx + dy * dy) - elapsed * 0.62);
          if (distWave < 56) {
            const waveFactor = (1 - distWave / 56) * (1 - elapsed / 1900);
            targetScale += 0.9 * waveFactor;
            boostAlpha += 0.7 * waveFactor;
            targetAngle += wrapAngle(Math.atan2(dy, dx) + Math.PI / 4) * waveFactor * 0.6;
          }
        }

        currentAngle[i] += (targetAngle - currentAngle[i]) * 0.12;
        currentScale[i] += (targetScale - currentScale[i]) * 0.16;

        if (
          Math.abs(currentAngle[i] - targetAngle) > 0.004 ||
          Math.abs(currentScale[i] - targetScale) > 0.004
        ) {
          hasActiveDynamics = true;
        }

        const waveOscillation = 0.8 + 0.2 * Math.sin((px + py * 0.8) * 0.011 - time * 0.0012);
        const noiseAlpha = randomNoise[i] * waveOscillation;
        const totalDensity = dL + dD;
        const alphaL = clamp(dL * noiseAlpha + boostAlpha * (dL / totalDensity) * 0.7, 0, 1);
        const alphaD = clamp(dD * noiseAlpha + boostAlpha * (dD / totalDensity) * 0.7, 0, 1);
        const ang = currentAngle[i];
        const sc = currentScale[i];

        if (Math.abs(ang) < 0.003 && Math.abs(sc - 1) < 0.003) {
          ctx.setTransform(dpr, 0, 0, dpr, dpr * px, dpr * py);
        } else {
          const cosA = Math.cos(ang) * sc * dpr;
          const sinA = Math.sin(ang) * sc * dpr;
          ctx.setTransform(cosA, sinA, -sinA, cosA, dpr * px, dpr * py);
        }

        if (alphaL > 0.01) {
          ctx.globalAlpha = alphaL;
          ctx.drawImage(lightSprite, -halfCell, -halfCell, cell, cell);
        }
        if (alphaD > 0.01) {
          ctx.globalAlpha = alphaD;
          ctx.drawImage(darkSprite, -halfCell, -halfCell, cell, cell);
        }
      }
      ctx.globalAlpha = 1;
      return hasActiveDynamics;
    };

    const loop = (t: number) => {
      rafId = 0;
      render(t);
      if (isVisible) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const kick = () => {
      if (!rafId && isVisible) {
        rafId = requestAnimationFrame(loop);
      }
    };

    resize();
    render(performance.now());

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          resize();
          render(performance.now());
        })
      : null;
    ro?.observe(container);

    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          isVisible = entries.some((e) => e.isIntersecting);
          if (isVisible) {
            kick();
          } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
          }
        })
      : null;
    io?.observe(container);

    const getLocalPos = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = getLocalPos(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('a, button, input, select, textarea, label')) return;
      const p = getLocalPos(e);
      ripples.push({ x: p.x, y: p.y, t0: performance.now() });
      if (ripples.length > 4) ripples.shift();
    };

    parent.addEventListener('pointermove', handlePointerMove);
    parent.addEventListener('pointerleave', handlePointerLeave);
    parent.addEventListener('pointerdown', handlePointerDown);

    const initTimer = mode === 'hero'
      ? setTimeout(() => {
          ripples.push({ x: width / 2, y: height * 0.47, t0: performance.now() });
        }, 350)
      : 0;

    kick();

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(initTimer);
      ro?.disconnect();
      io?.disconnect();
      parent.removeEventListener('pointermove', handlePointerMove);
      parent.removeEventListener('pointerleave', handlePointerLeave);
      parent.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [mode, glyph, lightColor, darkColor, cell]);

  return (
    <div ref={containerRef} className="ows-field" aria-hidden="true">
      <canvas ref={canvasRef} className="ows-canvas" />
    </div>
  );
}

/* ==========================================================================
   GEOMETRIC SVG MARKS (ARROW, CONCENTRIC RINGS, PLUS LATTICE)
   ========================================================================== */

function BrandArrowGlyph() {
  return (
    <svg className="ows-svg" width="17" height="14" viewBox="0 0 17 14" aria-hidden="true">
      <path
        d="M1 13.2c4.6-.4 8.4-2.6 11-6.4L15.6 1M9.6 1.4h6v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GeometricMark({
  kind,
  uid,
  index,
}: {
  kind: 'arrow' | 'ring' | 'plus';
  uid: string;
  index: number;
}) {
  const gradId = `${uid}-mark-${index}`;
  const gradUrl = `url(#${gradId})`;

  return (
    <svg
      className="ows-svg ows-mark"
      data-kind={kind}
      width="76"
      height="76"
      viewBox="0 0 76 76"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--ows-icon-a)" />
          <stop offset="100%" stopColor="var(--ows-icon-b)" />
        </linearGradient>
      </defs>
      <g className="ows-mark-g">
        {kind === 'arrow' && (
          <path
            d="M22 6H70V54L57 41V27.5L17.2 67.3L8.7 58.8L48.5 19H35Z"
            fill={gradUrl}
          />
        )}
        {kind === 'ring' && (
          <circle
            cx="38"
            cy="38"
            r="25"
            fill="none"
            stroke={gradUrl}
            strokeWidth="15"
          />
        )}
        {kind === 'plus' && (
          <path
            d="M31 4H45V31H72V45H45V72H31V45H4V31H31Z"
            fill={gradUrl}
          />
        )}
      </g>
    </svg>
  );
}

function SmallArrow({ size = 12 }: { size?: number }) {
  return (
    <svg className="ows-svg" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <svg
      className="ows-svg ows-chev"
      data-open={open ? '' : undefined}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d="M2.5 4.5 6 8l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ==========================================================================
   INTERACTIVE PRIVACY SCHEMATIC (NATURAL, JARGON-FREE)
   ========================================================================== */

function InteractivePrivacySchematic() {
  return (
    <div className="ows-blueprint">
      <div className="ows-blueprint-grid" aria-hidden="true" />

      <div className="ows-blueprint-header">
        <span className="ows-blueprint-tag">Privat di Perangkat Anda</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#94A3B8' }}>
          Tanpa Database Publik
        </span>
      </div>

      <div className="ows-blueprint-body">
        <div className="ows-blueprint-node">
          <span className="ows-blueprint-node-title">1. Browser Anda</span>
          <span className="ows-blueprint-node-desc">
            Transaksi dan catatan aset disimpan di perangkat Anda sendiri. Anda memegang kendali penuh.
          </span>
        </div>

        <div className="ows-blueprint-node">
          <span className="ows-blueprint-node-title">2. Pembaruan Harga Pasar</span>
          <span className="ows-blueprint-node-desc">
            Harga saham BEI dan kripto dibaca otomatis untuk memperbarui nilai portofolio Anda.
          </span>
        </div>

        <div className="ows-blueprint-node">
          <span className="ows-blueprint-node-title">3. Server Eksternal</span>
          <span className="ows-blueprint-node-desc" style={{ color: '#F87171' }}>
            Nol pelacak iklan. Portofin tidak menjual data kekayaan Anda kepada pihak mana pun.
          </span>
        </div>
      </div>

      <div className="ows-blueprint-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span className="ows-live-dot" />
          Penyimpanan Privat Aktif di Browser Anda
        </span>
        <span style={{ color: '#94A3B8' }}>Bebas Dipakai Tanpa Login</span>
      </div>
    </div>
  );
}

/* ==========================================================================
   PORTOFIN DOMAIN DATA: POSITIONS, PROFILES, ASSET SPECIFICATIONS & FAQ
   ========================================================================== */

interface LedgerRow {
  ticker: string;
  name: string;
  market: 'IDX' | 'CRYPTO';
  category: string;
  lots?: number;
  sharesOrUnits: number;
  avgBuyIdr: number;
  marketPriceIdr: number;
  description: string;
}

const BASE_LEDGER: LedgerRow[] = [
  {
    ticker: 'BBCA',
    name: 'Bank Central Asia Tbk',
    market: 'IDX',
    category: 'Saham Perbankan',
    lots: 50,
    sharesOrUnits: 5000,
    avgBuyIdr: 9000,
    marketPriceIdr: 9850,
    description: 'Saham perbankan defensif di Bursa Efek Indonesia. Tercatat tepat dalam satuan 100 lembar per lot dengan perhitungan harga beli rata-rata otomatis.',
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    market: 'CRYPTO',
    category: 'Aset Kripto',
    sharesOrUnits: 0.042,
    avgBuyIdr: 920000000,
    marketPriceIdr: 1120000000,
    description: 'Aset digital dengan perhitungan presisi desimal dan konversi harga rupiah secara langsung.',
  },
  {
    ticker: 'TLKM',
    name: 'Telkom Indonesia Tbk',
    market: 'IDX',
    category: 'Saham Telekomunikasi',
    lots: 100,
    sharesOrUnits: 10000,
    avgBuyIdr: 2950,
    marketPriceIdr: 3180,
    description: 'Emiten infrastruktur telekomunikasi nasional dengan histori pembagian dividen tunai berkala.',
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    market: 'CRYPTO',
    category: 'Aset Kripto',
    sharesOrUnits: 0.45,
    avgBuyIdr: 40000000,
    marketPriceIdr: 45600000,
    description: 'Aset kripto smart contract dengan kalkulasi fraksional tanpa selisih pembulatan.',
  },
];

const INVESTOR_PROFILES = [
  {
    role: 'Investor Saham BEI',
    pitch: 'Bagi Anda yang rutin mengakumulasi lot saham dividen atau blue-chip di Bursa Efek Indonesia dan membutuhkan catatan harga beli rata-rata yang rapi.',
  },
  {
    role: 'Trader & Pemilik Kripto',
    pitch: 'Bagi Anda yang menyimpan Bitcoin, Ethereum, dan aset digital dengan pencatatan nilai rupiah otomatis tanpa pusing menghitung kurs manual.',
  },
  {
    role: 'Investor Multi-Aset',
    pitch: 'Bagi Anda yang membagi dana ke berbagai instrumen seperti saham, kripto, reksa dana, hingga kas deposito untuk menjaga kestabilan finansial.',
  },
  {
    role: 'Pengguna yang Menjaga Privasi',
    pitch: 'Bagi Anda yang menghendaki catatan kekayaan pribadi tersimpan di perangkat sendiri tanpa harus mendaftar atau khawatir data disalahgunakan.',
  },
];

const ASSET_CLASSES = [
  {
    title: 'Saham Bursa Efek Indonesia (IDX)',
    badge: '100 LEMBAR / LOT',
    badgeType: 'idx',
    desc: 'Perhitungan lot resmi bursa: 1 lot = 100 lembar. Update harga seluruh emiten BEI dan pantau histori dividen tunai.',
    specs: ['Satuan: Kelipatan 100 Lembar', 'Harga: Real-Time BEI', 'Mata Uang: IDR (Rupiah)'],
  },
  {
    title: 'Aset Kripto',
    badge: 'PRESISI HINGGA 8 DESIMAL',
    badgeType: 'crypto',
    desc: 'Catat Bitcoin, Ethereum, dan koin lainnya dalam fraksi satuan kecil dengan pembaruan harga pasar global dan konversi otomatis.',
    specs: ['Satuan: 8 Angka Desimal', 'Harga: Agregator Global', 'Mata Uang: USD & IDR'],
  },
  {
    title: 'Reksa Dana & Pasar Uang',
    badge: 'NILAI AKTIVA BERSIH',
    badgeType: 'cash',
    desc: 'Pantau Nilai Aktiva Bersih (NAB) harian dan imbal hasil pasar uang atau pendapatan tetap untuk likuiditas dana darurat.',
    specs: ['Satuan: Unit Penyertaan', 'Karakter: Bunga Majemuk', 'Mata Uang: IDR (Rupiah)'],
  },
  {
    title: 'Kas & Deposito',
    badge: 'DANA SIAGA',
    badgeType: 'cash',
    desc: 'Catat cadangan kas rupiah atau valuta asing yang siap dialokasikan ketika ada momentum investasi baru di pasar.',
    specs: ['Satuan: Valuta Rupiah & USD', 'Fungsi: Dana Siaga Belanja', 'Mata Uang: Multi-Currency'],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Apakah Portofin web app berbayar atau ada biaya langganan?',
    a: 'Tidak. Portofin 100% gratis digunakan dan bersumber terbuka (open source). Tidak ada biaya tersembunyi, tidak ada fitur berbayar yang dikunci, dan tidak ada iklan komersial.',
  },
  {
    q: 'Apakah saya wajib membuat akun untuk menggunakan Portofin?',
    a: 'Tidak. Anda bisa langsung membuka dasbor dalam Mode Tamu tanpa mendaftar. Data transaksi Anda akan tersimpan di browser Anda sendiri.',
  },
  {
    q: 'Bagaimana Portofin menghitung saham Indonesia (BEI)?',
    a: 'Portofin mengikuti aturan resmi Bursa Efek Indonesia di mana 1 lot setara dengan tepat 100 lembar saham. Perhitungan modal dan keuntungan dilakukan pada level harga per lembar.',
  },
  {
    q: 'Apakah data saya bisa diekspor atau dicadangkan?',
    a: 'Bisa. Anda dapat mengunduh seluruh data portofolio dalam file JSON atau CSV kapan saja, atau menghubungkannya ke akun cloud jika ingin diakses dari HP dan laptop sekaligus.',
  },
  {
    q: 'Apakah Portofin terhubung langsung dengan rekening bank atau akun sekuritas saya?',
    a: 'Tidak. Portofin adalah aplikasi pencatat mandiri. Anda memasukkan data transaksi sendiri, sehingga tidak pernah ada risiko peretasan atau akses tidak sah terhadap dana investasi Anda.',
  },
];

/* ==========================================================================
   MAIN PAGE: PORTOFIN PORTFOLIO LEDGER
   ========================================================================== */

export default function LandingPage() {
  const { lang, toggleLanguage } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const { guestAssetCount } = usePortfolio();

  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  // States
  const [navSolid, setNavSolid] = useState<boolean>(false);
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'IDX' | 'CRYPTO'>('ALL');
  const [extraBbcaLots, setExtraBbcaLots] = useState<number>(0);
  const [openRowIndex, setOpenRowIndex] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
  const [activeProfileIndex, setActiveProfileIndex] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const isID = lang === 'id';
  const fxRate = 16400;

  // Sticky nav solid trigger
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (heroRef.current) {
            const rect = heroRef.current.getBoundingClientRect();
            setNavSolid(rect.bottom < 72);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-advance profiles every 7 seconds
  useEffect(() => {
    if (!autoAdvance || isPaused) return;
    const timer = setTimeout(() => {
      setActiveProfileIndex((prev) => (prev + 1) % INVESTOR_PROFILES.length);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeProfileIndex, autoAdvance, isPaused]);

  // Formatter
  const formatMoney = (idrAmount: number) => {
    if (currency === 'USD') {
      const usd = idrAmount / fxRate;
      return `$${usd.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `Rp ${Math.round(idrAmount).toLocaleString('id-ID')}`;
  };

  // Compute live ledger with simulation
  const computedLedger = useMemo(() => {
    const rows = BASE_LEDGER.map((row) => {
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

    const totalValueIdr = enriched.reduce((acc, r) => acc + r.marketValueIdr, 0);
    const totalCostIdr = enriched.reduce((acc, r) => acc + r.costBasisIdr, 0);
    const totalPlIdr = totalValueIdr - totalCostIdr;
    const totalPlPct = totalCostIdr > 0 ? (totalPlIdr / totalCostIdr) * 100 : 0;

    const withWeights = enriched.map((r) => {
      const weight = totalValueIdr > 0 ? r.marketValueIdr / totalValueIdr : 0;
      return {
        ...r,
        weight,
        weightPct: weight * 100,
      };
    });

    const idxValue = withWeights
      .filter((r) => r.market !== 'CRYPTO')
      .reduce((acc, r) => acc + r.marketValueIdr, 0);
    const cryptoValue = withWeights
      .filter((r) => r.market === 'CRYPTO')
      .reduce((acc, r) => acc + r.marketValueIdr, 0);
    const idxPct = totalValueIdr > 0 ? (idxValue / totalValueIdr) * 100 : 0;
    const cryptoPct = totalValueIdr > 0 ? (cryptoValue / totalValueIdr) * 100 : 0;

    return {
      rows: withWeights,
      totalValueIdr,
      totalCostIdr,
      totalPlIdr,
      totalPlPct,
      idxPct,
      cryptoPct,
    };
  }, [extraBbcaLots]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return computedLedger.rows.filter((r) => {
      if (marketFilter === 'ALL') return true;
      return r.market === marketFilter;
    });
  }, [computedLedger.rows, marketFilter]);

  const activeProfile = INVESTOR_PROFILES[activeProfileIndex];
  const profileWords = useMemo(() => activeProfile.pitch.split(/\s+/), [activeProfile]);

  return (
    <div ref={rootRef} className="ows-root">
      {/* Floating Top Navigation */}
      <header className="ows-nav" data-solid={navSolid ? '' : undefined}>
        <Link
          href="/"
          className="ows-brand"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <img src="/logo.png" alt="Portofin Logo" className="ows-brand-logo-img" />
          <span className="ows-brand-word">Portofin</span>
          <BrandArrowGlyph />
        </Link>

        <div className="ows-nav-center">
          <div className="ows-when">
            <span>Saham BEI & Kripto</span>
            <span className="ows-when-bar" aria-hidden="true" />
            <span>Presisi Multi-Aset</span>
            <span className="ows-when-cal">
              <SmallArrow size={11} />
            </span>
          </div>
          <button
            type="button"
            className="ows-chip"
            onClick={toggleLanguage}
            title="Ganti Bahasa (ID / EN)"
            style={{ height: '30px', padding: '0 10px', fontSize: '11px', fontWeight: 600 }}
          >
            {isID ? 'ID' : 'EN'}
          </button>
        </div>

        <div className="ows-nav-actions">
          {user ? (
            <Link href="/dashboard" className="ows-btn ows-btn--dark ows-btn--nav">
              <span>Portofolio</span>
            </Link>
          ) : (
            <button
              type="button"
              className="ows-btn ows-btn--dark ows-btn--nav"
              onClick={() => openAuthModal('signin')}
            >
              <span>Masuk</span>
            </button>
          )}
          <Link href="/dashboard" className="ows-btn ows-btn--accent ows-btn--nav">
            <span>Coba Sekarang</span>
            <span className="ows-btn-arrow">
              <SmallArrow size={10} />
            </span>
          </Link>
        </div>
      </header>

      {/* Immersive Hero Section */}
      <section ref={heroRef} className="ows-hero" aria-label="Portofin Portfolio Ledger">
        <div className="ows-hero-bg" aria-hidden="true" />
        <InteractiveCanvasField
          mode="hero"
          glyph="arrow"
          lightColor="#BFDBFE"
          darkColor="#1D4ED8"
          cell={14}
        />

        <div className="ows-hero-copy">
          <h1 className="ows-title" aria-label="PORTOFIN">
            {Array.from('PORTOFIN').map((char, idx) => (
              <span
                key={idx}
                className="ows-title-ch"
                style={{ '--i': idx } as React.CSSProperties}
                aria-hidden="true"
              >
                {char}
              </span>
            ))}
          </h1>

          <p className="ows-tagline">
            <span className="ows-tag-line" style={{ '--i': 0 } as React.CSSProperties}>
              Aplikasi Pelacak Portofolio Saham BEI & Kripto
            </span>
            <span className="ows-tag-line" style={{ '--i': 1 } as React.CSSProperties}>
              Catat transaksi, hitung laba rugi real-time, dan pantau alokasi aset Anda. Privat dan bisa langsung dipakai tanpa login.
            </span>
          </p>

          <div className="ows-hero-actions">
            <Link href="/dashboard" className="ows-btn ows-btn--accent">
              <span>Coba Mode Tamu (Tanpa Login)</span>
              <SmallArrow size={12} />
            </Link>
            <button
              type="button"
              className="ows-btn ows-btn--ghost-white"
              onClick={() => openAuthModal(user ? 'signin' : 'signup')}
            >
              <span>{user ? 'Kelola Akun Cloud' : 'Masuk ke Akun Cloud'}</span>
            </button>
          </div>

          {guestAssetCount > 0 && (
            <div className="ows-hero-resume">
              <span className="ows-live-dot" />
              <span>
                Sesi Anda aktif: <strong>{guestAssetCount} aset</strong> tersimpan di browser ini.
              </span>
              <Link href="/dashboard" className="ows-link" style={{ color: '#FFFFFF', textDecoration: 'underline' }}>
                Lanjutkan ke Dasbor
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="ows-main">
        {/* Section 1: Core Capabilities */}
        <section className="ows-sec ows-wrap" data-sec="expect">
          <span className="ows-kicker">Fitur Utama</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Pelacakan Portofolio yang Rapi dan Akurat
          </h2>
          <p className="ows-intro ows-rise">
            Dibuat untuk investor Indonesia yang ingin mengelola aset saham lokal dan kripto secara terpadu tanpa ribet dan tanpa kompromi privasi.
          </p>

          <div className="ows-features">
            <article className="ows-feature ows-rise" style={{ '--d': '0ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <GeometricMark kind="arrow" uid={uid} index={0} />
              </div>
              <h3 className="ows-feature-title">Pencatatan Lot Saham BEI yang Tepat</h3>
              <p className="ows-feature-text">
                Sesuai standar bursa: 1 lot = 100 lembar. Harga beli rata-rata dihitung otomatis setiap kali Anda menambah posisi saham baru.
              </p>
            </article>

            <article className="ows-feature ows-rise" style={{ '--d': '90ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <GeometricMark kind="ring" uid={uid} index={1} />
              </div>
              <h3 className="ows-feature-title">Pantau Alokasi & Keseimbangan Portofolio</h3>
              <p className="ows-feature-text">
                Lihat perbandingan porsi saham dan kripto, ketahui pembagian modal Anda, dan hindari risiko modal yang bertumpu pada satu aset saja.
              </p>
            </article>

            <article className="ows-feature ows-rise" style={{ '--d': '180ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <GeometricMark kind="plus" uid={uid} index={2} />
              </div>
              <h3 className="ows-feature-title">Privat & Bebas Digunakan Tanpa Syarat</h3>
              <p className="ows-feature-text">
                Langsung gunakan di browser Anda tanpa perlu mendaftar email atau kartu kredit. Data Anda tersimpan di perangkat Anda sendiri.
              </p>
            </article>
          </div>
        </section>

        {/* Section 2: Investor Profiles */}
        <section
          className="ows-sec ows-wrap"
          data-sec="guests"
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <span className="ows-kicker">Untuk Siapa Portofin Dibuat</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Disesuaikan dengan Kebutuhan Investasi Anda
          </h2>

          <div className="ows-chips ows-rise" role="tablist" aria-label="Profil Investor">
            {INVESTOR_PROFILES.map((prof, idx) => (
              <button
                key={prof.role}
                type="button"
                role="tab"
                aria-selected={idx === activeProfileIndex}
                className="ows-chip"
                data-auto={idx === activeProfileIndex && autoAdvance && !isPaused ? '' : undefined}
                onClick={() => {
                  setActiveProfileIndex(idx);
                  setAutoAdvance(false);
                }}
              >
                <span>{prof.role}</span>
                <span
                  key={`${idx}-${autoAdvance}`}
                  className="ows-chip-bar"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          <p className="ows-pitch ows-rise" aria-live="polite">
            <span key={activeProfileIndex} className="ows-pitch-in">
              {profileWords.map((word, wIdx) => (
                <span
                  key={wIdx}
                  className="ows-word"
                  style={{ '--i': wIdx } as React.CSSProperties}
                >
                  {word}{' '}
                </span>
              ))}
            </span>
          </p>
        </section>

        {/* Section 3: Live Ledger Simulation */}
        <section className="ows-sec ows-wrap" data-sec="agenda">
          <div className="ows-sec-head">
            <div>
              <span className="ows-kicker">Simulasi Portofolio Langsung</span>
              <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
                Buku Besar Posisi & Simulasi Beli
              </h2>
              <p className="ows-intro ows-rise">
                Lihat bagaimana Portofin menghitung keuntungan belum terealisasi dan mengalkulasi ulang nilai portofolio saat Anda menambah posisi baru.
              </p>
            </div>

            <div className="ows-saved ows-rise" data-on={extraBbcaLots > 0 ? '' : undefined}>
              <span>Status Simulasi:</span>
              <strong className="ows-saved-n">
                {extraBbcaLots > 0 ? `+${extraBbcaLots} Lot BBCA Ditambahkan` : 'Posisi Riil'}
              </strong>
              <button
                type="button"
                className="ows-btn ows-btn--dark ows-btn--sm"
                onClick={() => setExtraBbcaLots((prev) => (prev > 0 ? 0 : 20))}
              >
                {extraBbcaLots > 0 ? 'Reset Simulasi' : 'Coba Beli +20 Lot BBCA'}
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Strip */}
          <div className="ows-telemetry-strip ows-rise">
            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Total Nilai Portofolio</span>
              <span className="ows-telemetry-val">{formatMoney(computedLedger.totalValueIdr)}</span>
              <span className="ows-telemetry-sub">
                Modal: {formatMoney(computedLedger.totalCostIdr)}
              </span>
            </div>

            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Keuntungan / Kerugian (P/L)</span>
              <span className="ows-telemetry-val" style={{ color: computedLedger.totalPlIdr >= 0 ? '#34D399' : '#F87171' }}>
                {computedLedger.totalPlIdr >= 0 ? '+' : ''}
                {formatMoney(computedLedger.totalPlIdr)}
              </span>
              <span className="ows-telemetry-sub">
                {computedLedger.totalPlPct >= 0 ? '+' : ''}
                {computedLedger.totalPlPct.toFixed(2)}% dari modal
              </span>
            </div>

            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Keseimbangan Portofolio</span>
              <span className="ows-telemetry-val">Terdiversifikasi</span>
              <span className="ows-telemetry-sub">
                Modal terbagi ke 4 aset
              </span>
            </div>

            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Alokasi Saham vs Kripto</span>
              <span className="ows-telemetry-val">
                {computedLedger.idxPct.toFixed(0)}% / {computedLedger.cryptoPct.toFixed(0)}%
              </span>
              <span className="ows-telemetry-sub">
                Saham: {formatMoney(computedLedger.totalValueIdr * (computedLedger.idxPct / 100))}
              </span>
            </div>
          </div>

          {/* Filter Chips & Currency Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
            <div className="ows-chips ows-chips--filter" role="group" aria-label="Filter Pasar" style={{ margin: 0 }}>
              {(['ALL', 'IDX', 'CRYPTO'] as const).map((filter) => {
                const count = computedLedger.rows.filter((r) => filter === 'ALL' || r.market === filter).length;
                return (
                  <button
                    key={filter}
                    type="button"
                    className="ows-chip"
                    aria-pressed={marketFilter === filter}
                    onClick={() => setMarketFilter(filter)}
                  >
                    <span>{filter === 'ALL' ? 'Semua Aset' : filter === 'IDX' ? 'Saham BEI' : 'Kripto'}</span>
                    <span className="ows-chip-n">{count}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'inline-flex', gap: '4px', background: 'var(--ows-tint)', padding: '3px', borderRadius: '6px' }}>
              {(['IDR', 'USD'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  className="ows-chip"
                  aria-pressed={currency === cur}
                  onClick={() => setCurrency(cur)}
                  style={{ height: '26px', padding: '0 10px', fontSize: '11px', fontWeight: 600 }}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Expandable Positions Table */}
          <ol className="ows-agenda ows-rise">
            {filteredRows.map((row, idx) => {
              const isOpen = openRowIndex === idx;
              return (
                <li
                  key={row.ticker}
                  className="ows-row"
                  data-open={isOpen ? '' : undefined}
                  style={{ '--k': idx } as React.CSSProperties}
                >
                  <div className="ows-row-main">
                    <button
                      type="button"
                      className="ows-row-btn"
                      aria-expanded={isOpen}
                      onClick={() => setOpenRowIndex(isOpen ? -1 : idx)}
                    >
                      <span className="ows-row-time">
                        <span>{row.ticker}</span>
                        <span className="ows-row-end">{row.market}</span>
                      </span>

                      <span className="ows-row-body">
                        <span className="ows-row-title">{row.name}</span>
                        <span className="ows-row-who">{row.category}</span>
                      </span>

                      <span className="ows-row-quant">
                        <span className="ows-row-val">{formatMoney(row.marketValueIdr)}</span>
                        <span className={`ows-row-pnl ${row.plIdr >= 0 ? 'positive' : ''}`}>
                          {row.plIdr >= 0 ? '+' : ''}
                          {row.plPct.toFixed(2)}% ({formatMoney(row.plIdr)})
                        </span>
                      </span>

                      <span className="ows-tag">
                        {row.market === 'IDX' ? `${row.lots} Lot` : `${row.sharesOrUnits} Unit`}
                      </span>

                      <ChevronIcon open={isOpen} />
                    </button>
                  </div>

                  <div className="ows-row-more" role="region" aria-label={row.name}>
                    <div className="ows-row-inner">
                      <p>{row.description}</p>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', color: 'var(--ows-ink)' }}>
                        <div>
                          <strong>Harga Beli Rata-Rata:</strong> {formatMoney(row.avgBuyIdr)}
                        </div>
                        <div>
                          <strong>Harga Pasar Saat Ini:</strong> {formatMoney(row.marketPriceIdr)}
                        </div>
                        <div>
                          <strong>Porsi Portofolio:</strong> {row.weightPct.toFixed(1)}%
                        </div>
                      </div>
                      <Link href="/dashboard" className="ows-link">
                        <SmallArrow size={11} /> Buka dan kelola portofolio Anda di Dasbor
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Section 4: Supported Asset Classes */}
        <section className="ows-sec ows-wrap" data-sec="assets">
          <span className="ows-kicker">Instrumen Investasi</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Mendukung Berbagai Aset Pilihan Anda
          </h2>
          <p className="ows-intro ows-rise">
            Catat dan pantau seluruh instrumen keuangan Anda dalam satu dasbor yang rapi dan terorganisir.
          </p>

          <div className="ows-asset-grid">
            {ASSET_CLASSES.map((item, idx) => (
              <article key={idx} className="ows-asset-card ows-rise" style={{ '--d': `${idx * 70}ms` } as React.CSSProperties}>
                <div className="ows-asset-card-top">
                  <span className={`ows-asset-badge ${item.badgeType}`}>
                    {item.badge}
                  </span>
                </div>
                <h3 className="ows-asset-card-name">{item.title}</h3>
                <p className="ows-asset-card-desc">{item.desc}</p>
                <div className="ows-asset-spec-list">
                  {item.specs.map((spec, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SmallArrow size={9} />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Section 5: Privacy & Security */}
        <section className="ows-sec ows-wrap" data-sec="venue">
          <span className="ows-kicker">Privasi & Keamanan</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Kedaulatan Data Finansial Anda Terjaga Penuh
          </h2>

          <div className="ows-venue ows-rise">
            <div className="ows-venue-info">
              <p className="ows-venue-name">Data Anda adalah Hak Anda</p>
              <p className="ows-venue-addr">
                Portofin dirancang dengan prinsip bahwa informasi keuangan Anda tidak boleh diintip, dijual, atau disimpan di server publik kami.
              </p>

              <ul className="ows-notes">
                <li>
                  <SmallArrow size={10} />
                  <span>Data transaksi Anda disimpan privat langsung di browser Anda sendiri</span>
                </li>
                <li>
                  <SmallArrow size={10} />
                  <span>Bisa langsung dipakai tanpa login, tanpa nomor HP, dan tanpa email</span>
                </li>
                <li>
                  <SmallArrow size={10} />
                  <span>Bebas mengunduh file cadangan portofolio (JSON atau CSV) kapan saja</span>
                </li>
                <li>
                  <SmallArrow size={10} />
                  <span>Tersedia opsi sinkronisasi akun jika ingin membuka portofolio dari HP</span>
                </li>
              </ul>

              <div className="ows-venue-actions">
                <Link href="/dashboard" className="ows-btn ows-btn--dark ows-btn--sm">
                  <span>Buka Dasbor Portofin</span>
                  <SmallArrow size={10} />
                </Link>
                <button
                  type="button"
                  className="ows-link"
                  onClick={() => openAuthModal('signup')}
                >
                  <SmallArrow size={10} />
                  <span>Buat Akun untuk Akses Multi-Perangkat</span>
                </button>
              </div>
            </div>

            <InteractivePrivacySchematic />
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section className="ows-sec ows-wrap" data-sec="faq">
          <span className="ows-kicker">Bantuan & Informasi</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Pertanyaan yang Sering Diajukan
          </h2>

          <div className="ows-faq ows-rise">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="ows-faq-item" data-open={isOpen ? '' : undefined}>
                  <h3 className="ows-faq-h">
                    <button
                      type="button"
                      className="ows-faq-q"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                    >
                      <span>{item.q}</span>
                      <span className="ows-faq-icon" aria-hidden="true" />
                    </button>
                  </h3>
                  <div className="ows-faq-a" role="region">
                    <div className="ows-row-inner">
                      <p>{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 7: Quick Start CTA */}
        <section className="ows-band" data-sec="register">
          <InteractiveCanvasField
            mode="band"
            glyph="arrow"
            lightColor="#BFDBFE"
            darkColor="#1D4ED8"
            cell={15}
          />

          <div className="ows-wrap ows-band-grid">
            <div className="ows-band-copy">
              <span className="ows-kicker ows-kicker--light">Mulai Sekarang</span>
              <h2 className="ows-band-title">Kelola Portofolio Anda dengan Lebih Rapi</h2>
              <p className="ows-band-sub">
                Tanpa biaya, tanpa formulir panjang, dan tanpa kartu kredit. Anda bisa langsung mencoba dasbor Portofin dalam hitungan detik.
              </p>

              <div className="ows-count" aria-live="off">
                <span className="ows-count-label">Status Layanan & Pasar</span>
                <div className="ows-count-cells" style={{ marginTop: '12px' }}>
                  <div className="ows-count-cell" style={{ flex: 1, padding: '12px 14px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#93C5FD', fontFamily: 'var(--font-mono)' }}>Bursa Saham BEI</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>Data Pasar Terhubung</span>
                  </div>
                  <div className="ows-count-cell" style={{ flex: 1, padding: '12px 14px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#93C5FD', fontFamily: 'var(--font-mono)' }}>Aset Kripto Global</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#34D399', marginTop: '4px' }}>24/7 Real-Time</span>
                  </div>
                </div>
              </div>

              <div className="ows-seats">
                <div className="ows-seats-top">
                  <span>
                    <strong>100%</strong> Privat di Perangkat Anda
                  </span>
                  <span>Bebas Digunakan</span>
                </div>
                <div className="ows-meter" role="meter" aria-label="Status Privasi" aria-valuenow={100}>
                  <i style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Clean Quick-Start Card */}
            <div className="ows-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <span className="ows-kicker">Akses Cepat</span>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ows-ink)', marginTop: '6px', letterSpacing: '-0.02em' }}>
                    Mulai dengan Mode Tamu
                  </h3>
                  <p style={{ fontSize: '13.5px', color: 'var(--ows-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                    Langsung catat dan pantau aset Anda. Data akan tersimpan aman di browser Anda saat ini.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', background: 'var(--ows-tint)', borderRadius: '8px', fontSize: '13px', color: 'var(--ows-ink)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SmallArrow size={10} />
                    <span>Perhitungan otomatis 1 lot = 100 lembar saham BEI</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SmallArrow size={10} />
                    <span>Lacak keuntungan & kerugian (P/L) secara real-time</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SmallArrow size={10} />
                    <span>Konversi nilai rupiah dan dollar (IDR/USD) otomatis</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                  <Link
                    href="/dashboard"
                    className="ows-btn ows-btn--accent ows-btn--wide"
                    style={{ height: '46px' }}
                  >
                    <span>Buka Dasbor Portofolio Sekarang</span>
                    <SmallArrow size={12} />
                  </Link>

                  <button
                    type="button"
                    className="ows-link"
                    onClick={() => openAuthModal('signin')}
                    style={{ justifyContent: 'center', padding: '6px' }}
                  >
                    Sudah punya akun? Masuk di sini
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Signature Watermark Footer */}
      <footer className="ows-foot">
        <div className="ows-wrap ows-foot-grid">
          <div className="ows-brand ows-brand--foot">
            <img src="/logo.png" alt="Portofin Logo" className="ows-brand-logo-img" />
            <span className="ows-brand-word">Portofin</span>
            <BrandArrowGlyph />
          </div>

          <nav className="ows-foot-links" aria-label="Footer Navigation">
            <Link href="/dashboard">Portofolio</Link>
            <Link href="/ai-advisor">AI Advisor</Link>
            <Link href="/transactions">Riwayat Transaksi</Link>
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              style={{ color: 'var(--ows-muted)', cursor: 'pointer' }}
            >
              Masuk Cloud
            </button>
          </nav>

          <p className="ows-foot-note">
            © 2026 Portofin. Aplikasi pelacak portofolio saham BEI dan kripto untuk investor Indonesia. Bebas biaya dan bersumber terbuka.
          </p>
        </div>

        <div className="ows-foot-word" aria-hidden="true">
          PORTOFIN
        </div>
      </footer>
    </div>
  );
}
