'use client';

import { useState } from 'react';
import { User, Loader2, Sparkles } from 'lucide-react';
import styles from './AIInvestorPersona.module.css';

interface PersonaData {
  personaTitle: string;
  icon: string;
  description: string;
  biases: Array<{ name: string; explanation: string }>;
}

interface Props {
  portfolioContext: string;
  lang: string;
}

export default function AIInvestorPersona({ portfolioContext, lang }: Props) {
  const [data, setData] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePersona = async () => {
    if (!portfolioContext) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioContext, lang }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        setError(json.error || 'Failed to generate persona');
      } else if (json.persona) {
        setData(json.persona);
      } else {
        setError('Invalid response format from AI');
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'id' ? 'Gagal menghubungi AI.' : 'Failed to reach AI service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <User size={18} className={styles.icon} />
          <span>{lang === 'id' ? 'Profil Investor AI' : 'AI Investor Profile'}</span>
        </div>
        <button 
          onClick={generatePersona} 
          className={styles.generateBtn}
          disabled={loading || !portfolioContext}
        >
          {loading ? <Loader2 size={14} className={styles.spin} /> : <Sparkles size={14} />}
          <span>{data ? (lang === 'id' ? 'Analisis Ulang' : 'Re-analyze') : (lang === 'id' ? 'Buat Profil' : 'Generate Profile')}</span>
        </button>
      </div>
      
      <div className={styles.body}>
        {error && <div className={styles.error}>{error}</div>}
        
        {!data && !loading && !error && (
          <div className={styles.empty}>
            {lang === 'id' 
              ? 'Klik tombol di atas untuk melihat persona investasimu berdasarkan data portofolio aktualmu.'
              : 'Click the button above to discover your investing persona based on your actual portfolio data.'}
          </div>
        )}

        {loading && !data && (
          <div className={styles.empty}>
            <Loader2 size={24} className={styles.spin} style={{ margin: '0 auto 12px', color: '#A855F7' }} />
            <p>{lang === 'id' ? 'AI sedang menganalisis pola investasimu...' : 'AI is analyzing your investment patterns...'}</p>
          </div>
        )}

        {data && (
          <>
            <div className={styles.personaCard}>
              <div className={styles.personaIcon}>{data.icon || '🧑‍💻'}</div>
              <h3 className={styles.personaTitle}>{data.personaTitle}</h3>
              <p className={styles.personaDesc}>{data.description}</p>
            </div>

            {data.biases && data.biases.length > 0 && (
              <div className={styles.biasesSection}>
                <h4 className={styles.biasesTitle}>{lang === 'id' ? 'Bias Perilaku yang Terdeteksi' : 'Detected Behavioral Biases'}</h4>
                <div className={styles.biasesGrid}>
                  {data.biases.map((bias, idx) => (
                    <div key={idx} className={styles.biasCard}>
                      <div className={styles.biasName}>{bias.name}</div>
                      <div className={styles.biasExp}>{bias.explanation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.disclaimer}>
              {lang === 'id' 
                ? '⚠️ Ini adalah analisis perilaku untuk hiburan dan refleksi diri. Bukan saran investasi finansial.' 
                : '⚠️ This is a behavioral analysis for entertainment and self-reflection. Not financial investment advice.'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
