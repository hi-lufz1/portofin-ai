'use client';

import React, { useState } from 'react';
import styles from './AIScenario.module.css';

interface Props {
  portfolioContext?: string;
  lang?: string;
}

export default function AIScenario({ portfolioContext = '', lang = 'en' }: Props) {
  const [crypto, setCrypto] = useState(30);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const simulate = async () => {
    setLoading(true);
    setResult(null);
    const stock = 100 - crypto;
    const prompt = lang === 'id'
      ? `Simulasikan rebalancing: ulang alokasikan portofolio menjadi Crypto ${crypto}% dan Stocks ${stock}%. Berikan ringkasan 3 poin: dampak utama, risiko, dan langkah eksekusi yang disarankan.`
      : `Simulate a rebalance: allocate the portfolio to Crypto ${crypto}% and Stocks ${stock}%. Provide a short 3-point summary: main impacts, risks, and suggested execution steps.`;
    try {
      const res = await fetch('/api/ai-advisor', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], portfolioContext }) });
      const data = await res.json();
      setResult(data.content || (lang === 'id' ? 'Tidak ada respons' : 'No response'));
    } catch (err) {
      setResult(lang === 'id' ? 'Gagal terhubung ke layanan AI.' : 'Failed to reach AI service.');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}><strong>{lang === 'id' ? 'Simulasi Rebalancing' : 'Rebalance Simulator'}</strong></div>
      <div className={styles.allocationControl}>
        <div className={styles.allocationLabels}>
          <div className={styles.allocLabel}>
            <span className={styles.allocName}>Crypto</span>
            <span className={styles.allocValue}>{crypto}%</span>
          </div>
          <div className={styles.allocLabel} style={{ textAlign: 'right' }}>
            <span className={styles.allocName}>Stocks</span>
            <span className={styles.allocValue}>{100 - crypto}%</span>
          </div>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="5" 
          value={crypto} 
          onChange={(e) => setCrypto(Number(e.target.value))} 
          className={styles.singleSlider}
          style={{ background: `linear-gradient(90deg, var(--indigo) ${crypto}%, var(--border) ${crypto}%)` }}
        />
      </div>
      <div className={styles.actions}>
        <button onClick={simulate} className={styles.simulateBtn} disabled={loading}>{loading ? (lang === 'id' ? 'Menyimulasikan...' : 'Simulating...') : (lang === 'id' ? 'Jalankan Simulasi' : 'Run Simulation')}</button>
      </div>
      {result && <div className={styles.resultBox}>{result}</div>}
    </div>
  );
}
