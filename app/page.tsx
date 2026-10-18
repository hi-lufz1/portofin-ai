'use client';

import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/contexts/PortfolioContext';

/* ==========================================================================
   MATHEMATICAL & GEOMETRIC UTILITIES (ONWARD SUMMIT ENGINE)
   ========================================================================== */

function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

function smoothstep(min: number, max: number, val: number): number {
  const x = clamp((val - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function padZero(val: number): string {
  return val < 10 ? '0' + val : String(val);
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
    // Arrow glyph
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
  cell = 13,
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
        offCtx.lineWidth = Math.max(1.05, cell * 0.105);
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
   GEOMETRIC SVG MARKS (ARROW, RING, PLUS)
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
   ALGORITHMIC GENERATIVE DOT PORTRAITS (CORE ASSETS)
   ========================================================================== */

function generatePortraitPaths(
  seedStr: string,
  cols = 28,
  rows = 33,
  cellPitch = 220 / 28
): string[] {
  const prng = createPrng(hashString(seedStr));
  const cx = 0.5 + (prng() - 0.5) * 0.06;
  const cy = 0.37 + (prng() - 0.5) * 0.04;
  const rx = 0.145 + prng() * 0.03;
  const ry = 0.185 + prng() * 0.025;
  const variant = Math.floor(prng() * 3);
  const bottomK = 0.4 + prng() * 0.1;

  const lightDir = [(prng() < 0.5 ? 1 : -1) * 0.62, -0.5, 0.6];
  const lightLen = Math.hypot(lightDir[0], lightDir[1], lightDir[2]);

  const testSphere = (u: number, v: number, ox: number, oy: number, w: number, h: number) => {
    const nx = (u - ox) / w;
    const ny = (v - oy) / h;
    const rSq = nx * nx + ny * ny;
    const r = Math.sqrt(rSq);
    const z = Math.sqrt(Math.max(0, 1 - Math.min(1, r) ** 2));
    const lam = Math.max(0, (nx * lightDir[0] + ny * lightDir[1] + z * lightDir[2]) / lightLen);
    return { mask: 1 - smoothstep(0.9, 1.04, r), lam };
  };

  const layers = ['', '', '', ''];
  const formatNum = (n: number) => +n.toFixed(1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const v = (r + 0.5) / rows;
      const main = testSphere(u, v, cx, cy, rx, ry);
      const sub = variant === 2
        ? testSphere(u, v, cx, cy + 0.1, rx * 1.32, 0.33)
        : testSphere(u, v, cx, cy - ry * (variant ? 0.3 : 0.42), rx * (variant ? 1.22 : 1.06), ry * (variant ? 0.86 : 0.7));
      const body = testSphere(u, v, 0.5, 1.06, bottomK, 0.36);

      let val = 0;
      let mask = 0;
      if (main.mask > 0.02 && !(v < cy - ry * 0.45)) {
        mask = main.mask;
        val = 0.32 + 0.8 * main.lam;
      } else if (sub.mask > 0.02) {
        mask = sub.mask;
        val = 0.16 + 0.46 * sub.lam;
      }
      if (body.mask > mask) {
        mask = body.mask;
        val = 0.26 + 0.78 * body.lam;
      }

      const jitter = (prng() - 0.5) * 0.1;
      val = mask > 0.02
        ? clamp(val * (0.35 + 0.65 * mask) + jitter, 0.06, 1)
        : clamp(0.03 + 0.08 * (1 - v) + jitter * 0.4, 0, 0.14);

      const bucket = Math.min(3, Math.floor(val * 4));
      const radius = cellPitch * (0.3 + 0.62 * val);
      const px = formatNum((c + 0.5) * cellPitch);
      const py = formatNum((r + 0.5) * cellPitch);
      const rDot = formatNum(radius * 0.35);

      layers[bucket] += `M${px - rDot} ${py}a${rDot} ${rDot} 0 1 0 ${rDot * 2} 0a${rDot} ${rDot} 0 1 0 ${-rDot * 2} 0 `;
    }
  }

  return layers;
}

function GenerativePortrait({
  seed,
  uid,
  index,
}: {
  seed: string;
  uid: string;
  index: number;
}) {
  const layers = useMemo(() => generatePortraitPaths(seed), [seed]);
  const gradId = `${uid}-port-${index}`;

  return (
    <svg
      className="ows-svg ows-portrait-svg"
      viewBox="0 0 220 260"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--ows-deep)" />
          <stop offset="100%" stopColor="var(--ows-mid)" />
        </linearGradient>
      </defs>
      <rect width="220" height="260" fill={`url(#${gradId})`} />
      <g
        className="ows-portrait-g"
        fill="none"
        stroke="var(--ows-glyph-light)"
        strokeWidth="1.15"
        strokeLinecap="square"
      >
        {layers.map((pathStr, idx) => (
          <path
            key={idx}
            d={pathStr}
            className={`ows-pb${idx}`}
            style={{ opacity: [0.16, 0.42, 0.76, 1][idx] }}
          />
        ))}
      </g>
    </svg>
  );
}

/* ==========================================================================
   INTERACTIVE MAP COMPONENT (CUSTODY & LOCATION)
   ========================================================================== */

function InteractiveMap({ uid, name }: { uid: string; name: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const clipId = `${uid}-map-clip`;

  const streetLines = useMemo(() => {
    const lines = [];
    for (let i = -12; i <= 12; i++) {
      lines.push(
        <line
          key={`st-${i}`}
          x1={-400}
          y1={i * 30}
          x2={400}
          y2={i * 30}
          className="ows-map-st"
        />
      );
    }
    for (let j = -6; j <= 6; j++) {
      lines.push(
        <line
          key={`av-${j}`}
          x1={j * 78}
          y1={-400}
          x2={j * 78}
          y2={400}
          className="ows-map-av"
        />
      );
    }
    return lines;
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = mapRef.current;
    if (!el || e.pointerType === 'touch') return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * -14;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    el.style.setProperty('--ows-mx', `${nx.toFixed(1)}px`);
    el.style.setProperty('--ows-my', `${ny.toFixed(1)}px`);
  };

  const handlePointerLeave = () => {
    const el = mapRef.current;
    if (!el) return;
    el.style.setProperty('--ows-mx', '0px');
    el.style.setProperty('--ows-my', '0px');
  };

  return (
    <div
      ref={mapRef}
      className="ows-map"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <svg
        className="ows-svg ows-map-svg"
        viewBox="0 0 560 400"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Peta arsitektur kustodi: ${name}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect width="560" height="400" rx="12" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect width="560" height="400" fill="var(--ows-tint)" />
          <g className="ows-map-pan">
            <g transform="translate(300 210) rotate(-29)">
              {streetLines}
              <rect x="70" y="-310" width="156" height="210" className="ows-map-park" />
              <rect x="-170" y="60" width="64" height="48" className="ows-map-park" />
              <line x1="-400" y1="-260" x2="400" y2="190" className="ows-map-bway" />
            </g>
            <path
              d="M-20 -20H86C70 60 40 120 58 190C76 260 40 330 70 430H-20Z"
              className="ows-map-water"
            />
            <path
              d="M600 280C540 300 500 340 470 430H600Z"
              className="ows-map-water"
            />
          </g>
        </g>
      </svg>
      <div className="ows-pin" aria-hidden="true">
        <span className="ows-pin-pulse" />
        <span className="ows-pin-dot">
          <SmallArrow size={11} />
        </span>
      </div>
      <div className="ows-pin-label">{name}</div>
    </div>
  );
}

/* ==========================================================================
   DOMAIN DATA: INSTRUMENTS, PROFILES, ASSETS & FAQ
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
    category: 'Perbankan Konsumer',
    lots: 50,
    sharesOrUnits: 5000,
    avgBuyIdr: 9000,
    marketPriceIdr: 9850,
    description: 'Saham perbankan defensif kapitalisasi terbesar di Bursa Efek Indonesia. Satuan 100 lembar per lot terverifikasi tanpa pembulatan pecahan.',
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    market: 'CRYPTO',
    category: 'Aset Moneter Digital',
    sharesOrUnits: 0.042,
    avgBuyIdr: 920000000,
    marketPriceIdr: 1120000000,
    description: 'Penyimpan nilai desentralistik dengan presisi kalkulasi hingga 8 desimal (Satoshi). Terintegrasi dengan penilaian kurs rupiah real-time.',
  },
  {
    ticker: 'TLKM',
    name: 'Telkom Indonesia Tbk',
    market: 'IDX',
    category: 'Infrastruktur Telekomunikasi',
    lots: 100,
    sharesOrUnits: 10000,
    avgBuyIdr: 2950,
    marketPriceIdr: 3180,
    description: 'Infrastruktur telekomunikasi digital nasional dengan arus dividen tunai stabil dan volatilitas pasar moderat.',
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    market: 'CRYPTO',
    category: 'Komputasi Cerdas Terdesentralisasi',
    sharesOrUnits: 0.45,
    avgBuyIdr: 40000000,
    marketPriceIdr: 45600000,
    description: 'Protokol komputasi smart contract global dengan dukungan staking yield telemetry dan kalkulasi fraksional tanpa distorsi.',
  },
];

const INVESTOR_PROFILES = [
  {
    role: 'Investor Saham BEI',
    pitch: 'Anda fokus membangun akumulasi lot saham berfundamental prima di Bursa Efek Indonesia. Kelola dividen, pantau harga per lembar secara presisi, dan hindari distorsi pembulatan lot.',
  },
  {
    role: 'Trader Kripto',
    pitch: 'Anda bertransaksi dalam fraksi Satoshi dan Gwei hingga delapan angka di belakang koma. Dapatkan konversi nilai rupiah otomatis tanpa selisih floating point.',
  },
  {
    role: 'Hybrid Allocator',
    pitch: 'Portofolio Anda menggabungkan stabilitas dividen perbankan nasional dengan potensi pertumbuhan aset digital. Pantau rasio HHI agar risiko konsentrasi tetap terukur.',
  },
  {
    role: 'Penganut Privasi',
    pitch: 'Anda meyakini kunci pribadi Anda adalah aset Anda. Seluruh catatan transaksi tersimpan secara lokal di peramban tanpa kewajiban mendaftar dan tanpa pelacak eksternal.',
  },
];

const CORE_ASSETS = [
  {
    ticker: 'BBCA',
    name: 'Bank Central Asia',
    role: 'Jangkar Perbankan BEI',
    bio: 'Pondasi likuiditas dan stabilitas dividen di bursa domestik, dicatat dalam kelipatan 100 lembar per lot.',
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    role: 'Aset Moneter Digital',
    bio: 'Instrumen lindung nilai makro dengan suplai terbatas 21 juta koin dan presisi mutlak 8 angka desimal.',
  },
  {
    ticker: 'TLKM',
    name: 'Telkom Indonesia',
    role: 'Infrastruktur Telekomunikasi',
    bio: 'Emiten BUMN telekomunikasi dengan penetrasi data nasional dan histori pembayaran dividen konsisten.',
  },
  {
    ticker: 'ETH',
    name: 'Ethereum',
    role: 'Komputasi Terdesentralisasi',
    bio: 'Platform kontrak pintar universal yang menopang ekosistem tokenisasi dan keuangan terdesentralisasi dunia.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Apakah saya wajib membuat akun untuk menggunakan Portofin?',
    a: 'Tidak. Anda dapat langsung menggunakan mode Sandbox Tamu secara instan. Data disimpan di penyimpanan IndexedDB peramban lokal Anda tanpa login dan tanpa pengumpulan data pribadi.',
  },
  {
    q: 'Bagaimana Portofin menghitung saham Indonesia (BEI)?',
    a: 'Portofin mengikuti standar resmi PT Bursa Efek Indonesia (IDX) di mana 1 lot setara dengan tepat 100 lembar saham. Perhitungan modal dan keuntungan dilakukan pada level per lembar tanpa distorsi.',
  },
  {
    q: 'Bagaimana aset kripto dicatat tanpa pembulatan desimal?',
    a: 'Portofin menggunakan mesin kalkulasi fraksional hingga 8 desimal (Satoshi untuk Bitcoin dan Gwei untuk Ethereum), memastikan nilai portofolio Anda akurat hingga satuan terkecil.',
  },
  {
    q: 'Apa itu Indeks Herfindahl-Hirschman (HHI) pada portofolio?',
    a: 'Indeks HHI mengukur tingkat konsentrasi risiko portofolio Anda. Skor di bawah 1.500 menunjukkan diversifikasi sehat, 1.500 hingga 2.500 konsentrasi moderat, dan di atas 2.500 konsentrasi tinggi.',
  },
  {
    q: 'Apakah saya bisa mengekspor atau memindahkan data saya?',
    a: 'Ya. Anda memiliki kendali penuh untuk mengekspor seluruh buku besar portofolio dalam format JSON atau CSV standar kapan saja, atau menghubungkannya ke sinkronisasi Cloud aman.',
  },
];

/* ==========================================================================
   MAIN LANDING PAGE COMPONENT (PORTFOLIO LEDGER WITH ONWARD SUMMIT THEME)
   ========================================================================== */

export default function LandingPage() {
  const { lang, toggleLanguage } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const { guestAssetCount } = usePortfolio();

  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

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
  const [copiedPass, setCopiedPass] = useState<boolean>(false);

  // Countdown timer for next IDX market opening
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 14,
    minutes: 30,
    seconds: 0,
  });

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

  // Dynamic countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

    // Herfindahl-Hirschman Index
    const hhiDecimal = withWeights.reduce((acc, r) => acc + r.weight * r.weight, 0);
    const hhiPoints = Math.round(hhiDecimal * 10000);

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
      hhiPoints,
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

  const handleCopyPass = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('PTF-8842');
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

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
          <span className="ows-brand-word">Portofin</span>
          <BrandArrowGlyph />
        </Link>

        <div className="ows-nav-center">
          <div className="ows-when">
            <span>BEI & Kripto</span>
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
            <span>Coba Sandbox</span>
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
          lightColor="#dbe6ff"
          darkColor="#3a6be0"
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
              Buku Besar Keuangan Presisi Multi-Aset: Saham BEI & Kripto
            </span>
            <span className="ows-tag-line" style={{ '--i': 1 } as React.CSSProperties}>
              Kustodi Lokal Peramban. Privasi Mandiri Nir-Pelacak.
            </span>
          </p>

          <div className="ows-hero-actions">
            <Link href="/dashboard" className="ows-btn ows-btn--accent">
              <span>Buka Sandbox Tamu</span>
              <SmallArrow size={12} />
            </Link>
            <button
              type="button"
              className="ows-btn ows-btn--ghost-white"
              onClick={() => openAuthModal(user ? 'signin' : 'signup')}
            >
              <span>{user ? 'Kelola Akun Cloud' : 'Masuk Akun Cloud'}</span>
            </button>
          </div>

          {guestAssetCount > 0 && (
            <div className="ows-hero-resume">
              <span className="ows-live-dot" />
              <span>
                Sesi Tamu Terdeteksi: <strong>{guestAssetCount} aset</strong> tersimpan aman di peramban ini.
              </span>
              <Link href="/dashboard" className="ows-link" style={{ color: '#FFFFFF', textDecoration: 'underline' }}>
                Lanjutkan
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="ows-main">
        {/* Section 1: Capabilities (On what to expect) */}
        <section className="ows-sec ows-wrap" data-sec="expect">
          <span className="ows-kicker">Kapabilitas Sistem</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Rekayasa Buku Besar Berstandar Finansial
          </h2>
          <p className="ows-intro ows-rise">
            Dibangun untuk investor dan pengelola modal yang menolak kompromi akurasi. Menyatukan dinamika pasar modal Indonesia dengan likuiditas aset terdesentralisasi global.
          </p>

          <div className="ows-features">
            <article className="ows-feature ows-rise" style={{ '--d': '0ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <GeometricMark kind="arrow" uid={uid} index={0} />
              </div>
              <h3 className="ows-feature-title">Buku Besar Multi-Aset BEI & Kripto</h3>
              <p className="ows-feature-text">
                Saham Indonesia dicatat tepat dalam kelipatan 100 lembar per lot. Aset kripto dikalkulasi dalam presisi 8 desimal penuh tanpa distorsi pembulatan pecahan.
              </p>
            </article>

            <article className="ows-feature ows-rise" style={{ '--d': '90ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <GeometricMark kind="ring" uid={uid} index={1} />
              </div>
              <h3 className="ows-feature-title">Kustodi Lokal Mandiri (Zero-Cloud)</h3>
              <p className="ows-feature-text">
                Portofolio tersimpan di basis data IndexedDB peramban lokal Anda. Tidak ada kewajiban registrasi, tidak ada analitik pihak ketiga, dan tanpa pelacakan data pribadi.
              </p>
            </article>

            <article className="ows-feature ows-rise" style={{ '--d': '180ms' } as React.CSSProperties}>
              <div className="ows-feature-mark">
                <GeometricMark kind="plus" uid={uid} index={2} />
              </div>
              <h3 className="ows-feature-title">Telemetri Risiko Portofolio (HHI)</h3>
              <p className="ows-feature-text">
                Kalkulasi otomatis Indeks Herfindahl-Hirschman untuk mengukur konsentrasi modal secara matematis, dilengkapi simulasi pesanan beli dan jual seketika.
              </p>
            </article>
          </div>
        </section>

        {/* Section 2: Investor Profiles (On the guest list) */}
        <section
          className="ows-sec ows-wrap"
          data-sec="guests"
          onPointerEnter={() => setIsPaused(true)}
          onPointerLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <span className="ows-kicker">Untuk Siapa Portofin Dirancang</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Profil Pengelola Modal
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

        {/* Section 3: Live Ledger Console & Telemetry (On the trading floor / Agenda) */}
        <section className="ows-sec ows-wrap" data-sec="agenda">
          <div className="ows-sec-head">
            <div>
              <span className="ows-kicker">Telemetri Langsung</span>
              <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
                Buku Besar Posisi & Simulasi Lot
              </h2>
              <p className="ows-intro ows-rise">
                Pantau komposisi portofolio real-time, evaluasi keuntungan yang belum direalisasikan, dan uji dampak transaksi tambahan langsung pada skor risiko HHI.
              </p>
            </div>

            <div className="ows-saved ows-rise" data-on={extraBbcaLots > 0 ? '' : undefined}>
              <span>Status Simulasi:</span>
              <strong className="ows-saved-n">
                {extraBbcaLots > 0 ? `+${extraBbcaLots} Lot BBCA Aktif` : 'Posisi Riil'}
              </strong>
              <button
                type="button"
                className="ows-btn ows-btn--dark ows-btn--sm"
                onClick={() => setExtraBbcaLots((prev) => (prev > 0 ? 0 : 20))}
              >
                {extraBbcaLots > 0 ? 'Reset Simulasi' : 'Uji +20 Lot BBCA'}
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Strip */}
          <div className="ows-telemetry-strip ows-rise">
            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Total Nilai Buku</span>
              <span className="ows-telemetry-val">{formatMoney(computedLedger.totalValueIdr)}</span>
              <span className="ows-telemetry-sub">
                Modal: {formatMoney(computedLedger.totalCostIdr)}
              </span>
            </div>

            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Keuntungan Belum Realisasi</span>
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
              <span className="ows-telemetry-label">Konsentrasi Risiko (HHI)</span>
              <span className="ows-telemetry-val">{computedLedger.hhiPoints.toLocaleString()}</span>
              <span className="ows-telemetry-sub">
                {computedLedger.hhiPoints < 2500 ? 'Konsentrasi Sehat' : 'Konsentrasi Moderat'}
              </span>
            </div>

            <div className="ows-telemetry-col">
              <span className="ows-telemetry-label">Alokasi Saham vs Kripto</span>
              <span className="ows-telemetry-val">
                {computedLedger.idxPct.toFixed(0)}% / {computedLedger.cryptoPct.toFixed(0)}%
              </span>
              <span className="ows-telemetry-sub">
                BEI: {formatMoney(computedLedger.totalValueIdr * (computedLedger.idxPct / 100))}
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
                    <span>{filter === 'ALL' ? 'Semua Pasar' : filter === 'IDX' ? 'Saham BEI' : 'Kripto'}</span>
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

          {/* Agenda-style Expandable Positions Table */}
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
                          <strong>Harga Pasar Terkini:</strong> {formatMoney(row.marketPriceIdr)}
                        </div>
                        <div>
                          <strong>Bobot Portofolio:</strong> {row.weightPct.toFixed(1)}%
                        </div>
                      </div>
                      <Link href="/dashboard" className="ows-link">
                        <SmallArrow size={11} /> Kelola posisi ini di Dashboard
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Section 4: Core Assets (On stage) */}
        <section className="ows-sec ows-wrap" data-sec="speakers">
          <span className="ows-kicker">Alam Semesta Aset</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Pondasi Instrumen Terpilih
          </h2>
          <p className="ows-intro ows-rise">
            Setiap instrumen di Portofin diproses sesuai karakteristik teknis aslinya, tanpa konversi sembrono dan tanpa manipulasi saldo.
          </p>

          <ul className="ows-speakers">
            {CORE_ASSETS.map((asset, idx) => (
              <li
                key={asset.ticker}
                className="ows-speaker ows-rise"
                style={{ '--d': `${idx * 70}ms` } as React.CSSProperties}
                tabIndex={0}
              >
                <div className="ows-portrait">
                  <GenerativePortrait seed={asset.ticker} uid={uid} index={idx} />
                  <p className="ows-bio">{asset.bio}</p>
                </div>
                <p className="ows-speaker-name">{asset.name}</p>
                <p className="ows-speaker-role">{asset.role}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 5: Custody & Architecture (On location) */}
        <section className="ows-sec ows-wrap" data-sec="venue">
          <span className="ows-kicker">Keamanan & Kustodi</span>
          <h2 className="ows-h2 ows-rise" style={{ marginTop: '8px' }}>
            Infrastruktur Lokal Mandiri
          </h2>

          <div className="ows-venue ows-rise">
            <div className="ows-venue-info">
              <p className="ows-venue-name">Kedaulatan Data di Peramban Anda</p>
              <p className="ows-venue-addr">
                IndexedDB Local Storage · Web Crypto API AES-GCM
                <br />
                Klien Web Pribadi Tanpa Server Pusat
              </p>

              <ul className="ows-notes">
                <li>
                  <SmallArrow size={10} />
                  <span>Kustodi data tersimpan secara lokal dan aman di perangkat pengguna</span>
                </li>
                <li>
                  <SmallArrow size={10} />
                  <span>Tidak ada pelacakan identitas, analitik pihak ketiga, atau cookies pengintai</span>
                </li>
                <li>
                  <SmallArrow size={10} />
                  <span>Dukungan ekspor dan impor portofolio format terbuka (JSON/CSV)</span>
                </li>
                <li>
                  <SmallArrow size={10} />
                  <span>Opsi sinkronisasi multi-perangkat terenkripsi bila Anda membutuhkan</span>
                </li>
              </ul>

              <div className="ows-venue-actions">
                <Link href="/dashboard" className="ows-btn ows-btn--dark ows-btn--sm">
                  <span>Buka Ruang Kustodi</span>
                  <SmallArrow size={10} />
                </Link>
                <button
                  type="button"
                  className="ows-link"
                  onClick={() => openAuthModal('signup')}
                >
                  <SmallArrow size={10} />
                  <span>Aktifkan Sinkronisasi Terenkripsi</span>
                </button>
              </div>
            </div>

            <InteractiveMap uid={uid} name="Sentra Kustodi Lokal Peramban" />
          </div>
        </section>

        {/* Section 6: FAQ (On your mind) */}
        <section className="ows-sec ows-wrap" data-sec="faq">
          <span className="ows-kicker">Transparansi & Bantuan</span>
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

        {/* Section 7: Access Pass & Registration (The Authentic Ticket Band) */}
        <section className="ows-band" data-sec="register">
          <InteractiveCanvasField
            mode="band"
            glyph="arrow"
            lightColor="#dbe6ff"
            darkColor="#3a6be0"
            cell={15}
          />

          <div className="ows-wrap ows-band-grid">
            <div className="ows-band-copy">
              <span className="ows-kicker ows-kicker--light">Akses Langsung Tanpa Hambatan</span>
              <h2 className="ows-band-title">Mulai Buku Besar Anda</h2>
              <p className="ows-band-sub">
                Tidak perlu kartu kredit atau pendaftaran formulir rumit. Langsung buka sandbox lokal dan rasakan presisi manajemen aset yang sesungguhnya.
              </p>

              <div className="ows-count" aria-live="off">
                <span className="ows-count-label">Pasar Modal BEI Buka Dalam</span>
                <div className="ows-count-cells">
                  <span className="ows-count-cell">
                    <span className="ows-count-v">{padZero(countdown.hours)}</span>
                    <span className="ows-count-k">Jam</span>
                  </span>
                  <span className="ows-count-cell">
                    <span className="ows-count-v">{padZero(countdown.minutes)}</span>
                    <span className="ows-count-k">Menit</span>
                  </span>
                  <span className="ows-count-cell">
                    <span className="ows-count-v">{padZero(countdown.seconds)}</span>
                    <span className="ows-count-k">Detik</span>
                  </span>
                </div>
              </div>

              <div className="ows-seats">
                <div className="ows-seats-top">
                  <span>
                    <strong>100%</strong> Kedaulatan Data Lokal
                  </span>
                  <span>Peramban Mandiri</span>
                </div>
                <div className="ows-meter" role="meter" aria-label="Status Kustodi" aria-valuenow={100}>
                  <i style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Authentic Physical-Digital Ticket */}
            <div className="ows-card" ref={ticketRef}>
              <div className="ows-ticket" role="status">
                <div className="ows-ticket-top">
                  <span className="ows-kicker">Tiket Akses Portofin</span>
                  <p className="ows-ticket-name">Tiket Tamu Mandiri</p>
                  <p className="ows-ticket-meta">
                    Kustodi IndexedDB · Tanpa Registrasi · Presisi BEI & Kripto
                  </p>
                </div>

                <div className="ows-ticket-perf" aria-hidden="true" />

                <div className="ows-ticket-bot">
                  <div>
                    <span className="ows-ticket-label">Kode Akses Lokal</span>
                    <span className="ows-ticket-code">PTF-8842</span>
                  </div>

                  <div className="ows-ticket-perks">
                    <div className="ows-ticket-perk">
                      <SmallArrow size={10} />
                      <span>Kalkulasi lot saham otomatis (100 lembar)</span>
                    </div>
                    <div className="ows-ticket-perk">
                      <SmallArrow size={10} />
                      <span>Presisi kripto 8 desimal tanpa distorsi floating point</span>
                    </div>
                    <div className="ows-ticket-perk">
                      <SmallArrow size={10} />
                      <span>Telemetri risiko konsentrasi Indeks HHI real-time</span>
                    </div>
                  </div>

                  <div className="ows-ticket-actions">
                    <Link
                      href="/dashboard"
                      className="ows-btn ows-btn--accent ows-btn--wide"
                      style={{ height: '46px' }}
                    >
                      <span>Buka Sandbox Tamu Sekarang</span>
                      <SmallArrow size={12} />
                    </Link>
                    <button
                      type="button"
                      className="ows-link"
                      onClick={handleCopyPass}
                    >
                      {copiedPass ? 'Kode Tersalin!' : 'Salin Kode Tiket'}
                    </button>
                  </div>
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
            <span className="ows-brand-word">Portofin</span>
            <BrandArrowGlyph />
          </div>

          <nav className="ows-foot-links" aria-label="Footer Navigation">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/dashboard/analytics">Analisis</Link>
            <Link href="/dashboard/settings">Pengaturan</Link>
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              style={{ color: 'var(--ows-muted)', cursor: 'pointer' }}
            >
              Masuk Cloud
            </button>
          </nav>

          <p className="ows-foot-note">
            © 2026 Portofin Ledger. Buku besar keuangan presisi multi-aset untuk saham BEI dan aset digital. Bebas biaya dan bersumber terbuka.
          </p>
        </div>

        <div className="ows-foot-word" aria-hidden="true">
          PORTOFIN
        </div>
      </footer>
    </div>
  );
}
