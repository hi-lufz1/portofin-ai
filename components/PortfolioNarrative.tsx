'use client';

import React, { useState } from 'react';
import styles from './PortfolioNarrative.module.css';

interface Narrative {
  narrative: string;
  bullets?: string[];
  actions?: string[];
  disclaimer?: string;
}

interface Props {
  portfolioContext?: string;
  lang?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function PortfolioNarrative({ portfolioContext = '', lang = 'en' }: Props) {
  const [data, setData] = useState<Narrative | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt =
        lang === 'id'
          ? 'Buat ringkasan diagnostik portofolio singkat (2-3 kalimat) yang merangkum distribusi bobot saat ini, konsentrasi risiko utama, dan evaluasi keseimbangan struktur portofolio (tanpa memberikan sinyal beli/jual). Berikan juga 3 bullet metrik utama dan 3 poin evaluasi risiko. Kembalikan hanya JSON dengan kunci: narrative, bullets, actions, disclaimer.'
          : 'Create a short diagnostic portfolio summary (2-3 sentences) covering current weight distribution, main concentration risks, and structural balance evaluation (without giving buy/sell signals). Also return 3 key metric bullets and 3 risk evaluation points. Respond with JSON only: narrative, bullets, actions, disclaimer.';

      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], portfolioContext }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'AI unavailable');
      } else {
        const content = json.content || '';
        try {
          const parsed = JSON.parse(
            content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          );
          const narrative = typeof parsed.narrative === 'string' ? parsed.narrative : content;
          const bullets = Array.isArray(parsed.bullets) ? parsed.bullets : [];
          const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
          const disclaimer = typeof parsed.disclaimer === 'string' ? parsed.disclaimer : '';
          setData({ narrative, bullets, actions, disclaimer });
        } catch {
          setData({ narrative: content, bullets: [], actions: [], disclaimer: '' });
        }
      }
    } catch {
      setError(
        lang === 'id' ? 'Gagal menghubungi layanan AI.' : 'Failed to reach AI service.'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!data) return;
    const text =
      data.narrative +
      '\n\n' +
      (data.bullets?.map((b, i) => `${i + 1}. ${b}`).join('\n') || '') +
      '\n\n' +
      (data.actions?.map((a, i) => `${i + 1}. ${a}`).join('\n') || '');
    try {
      await navigator.clipboard.writeText(text);
      alert(lang === 'id' ? 'Tersalin ke clipboard' : 'Copied to clipboard');
    } catch {
      // ignore
    }
  };

  const printContent = () => {
    if (!data) return;
    const html = `
      <html>
        <head>
          <title>Portfolio Diagnostic Narrative</title>
          <style>
            body { font-family: Inter, system-ui, -apple-system, sans-serif; padding: 24px; color: #0F172A; }
            h1 { font-size: 20px; }
            p { font-size: 14px; }
            ul, ol { margin-top: 8px; }
          </style>
        </head>
        <body>
          <h1>${lang === 'id' ? 'Ringkasan Diagnostik Portofolio' : 'Portfolio Diagnostic Summary'}</h1>
          <p>${escapeHtml(data.narrative)}</p>
          ${
            data.bullets && data.bullets.length
              ? `<h3>${lang === 'id' ? 'Sorotan Struktur' : 'Structural Highlights'}</h3><ul>${data.bullets
                  .map((b) => `<li>${escapeHtml(String(b))}</li>`)
                  .join('')}</ul>`
              : ''
          }
          ${
            data.actions && data.actions.length
              ? `<h3>${lang === 'id' ? 'Catatan Evaluasi Risiko' : 'Risk Evaluation Notes'}</h3><ol>${data.actions
                  .map((a) => `<li>${escapeHtml(String(a))}</li>`)
                  .join('')}</ol>`
              : ''
          }
          ${
            data.disclaimer
              ? `<p style="font-size:12px;color:#475569;margin-top:12px;">${escapeHtml(
                  data.disclaimer
                )}</p>`
              : ''
          }
        </body>
      </html>`;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <strong>
          {lang === 'id' ? 'Ringkasan Diagnostik Eksekutif' : 'Executive Diagnostic Summary'}
        </strong>
        <div>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={generate}
            disabled={loading}
          >
            {loading
              ? lang === 'id'
                ? 'Menyusun...'
                : 'Generating...'
              : lang === 'id'
                ? 'Buat Ringkasan'
                : 'Generate Summary'}
          </button>
        </div>
      </div>

      <div className={styles.body} aria-live="polite">
        {error && <div className={styles.error}>{error}</div>}
        {!data && !error && (
          <div className={styles.empty}>
            {lang === 'id'
              ? 'Klik Buat Ringkasan untuk menghasilkan evaluasi objektif atas distribusi bobot dan konsentrasi risiko portofoliomu.'
              : 'Click Generate Summary to produce an objective evaluation of your portfolio weight distribution and concentration risk.'}
          </div>
        )}
        {data && (
          <>
            <p className={styles.narrative}>{data.narrative}</p>
            {data.bullets && data.bullets.length > 0 && (
              <ul className={styles.bullets}>
                {data.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {data.actions && data.actions.length > 0 && (
              <div className={styles.actionsSection}>
                <strong>
                  {lang === 'id'
                    ? 'Poin Evaluasi Struktur (Edukasi)'
                    : 'Structural Evaluation Points (Educational)'}
                </strong>
                <ol>
                  {data.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className={styles.controls}>
              <button type="button" onClick={copyAll} className={styles.ctrlBtn}>
                {lang === 'id' ? 'Salin' : 'Copy'}
              </button>
              <button type="button" onClick={printContent} className={styles.ctrlBtn}>
                {lang === 'id' ? 'Cetak / PDF' : 'Print / PDF'}
              </button>
            </div>

            {data.disclaimer && <div className={styles.disclaimer}>{data.disclaimer}</div>}
          </>
        )}
      </div>
    </div>
  );
}
