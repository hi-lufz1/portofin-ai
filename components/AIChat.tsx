'use client';

import React, { useState, useRef } from 'react';
import styles from './AIChat.module.css';

interface Props {
  portfolioContext?: string;
  lang?: string;
}

type Msg = { id: string; role: 'user' | 'assistant' | 'system'; content: string };

export default function AIChat({ portfolioContext = '', lang = 'en' }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'm0', role: 'assistant', content: lang === 'id' ? 'Halo! Saya Portofin AI. Tanyakan sesuatu tentang portofoliomu — misal: "Apa risiko terbesar saya?"' : 'Hello! I am Portofin AI. Ask something about your portfolio — e.g. "What is my biggest risk?"' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { id: String(Date.now()), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: text }], portfolioContext }),
      });
      const data = await res.json();
      const aiContent = data.content || (lang === 'id' ? 'Tidak ada respons' : 'No response');
      const assistantMsg: Msg = { id: 'ai-' + Date.now(), role: 'assistant', content: aiContent };
      setMessages(prev => [...prev, assistantMsg]);
      scrollToBottom();
    } catch (err) {
      const errMsg: Msg = { id: 'err-' + Date.now(), role: 'assistant', content: lang === 'id' ? 'Gagal terhubung ke layanan AI.' : 'Failed to reach AI service.' };
      setMessages(prev => [...prev, errMsg]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) send(input.trim());
  };

  const presets = [
    { label: lang === 'id' ? 'Efek inflasi pada portofolio' : 'Inflation effect on portfolio', prompt: lang === 'id' ? 'Berdasarkan aset saya saat ini, bagaimana kemungkinan efek dari inflasi yang tinggi terhadap portofolio saya?' : 'Based on my current assets, what is the likely effect of high inflation on my portfolio?' },
    { label: lang === 'id' ? 'Simulasi: Bitcoin naik 20%' : 'Simulate: Bitcoin rises 20%', prompt: lang === 'id' ? 'Tolong simulasikan apa yang terjadi pada total nilai portofolio saya jika harga Bitcoin tiba-tiba naik 20%, asumsikan aset lain tetap.' : 'Please simulate what happens to my total portfolio value if Bitcoin suddenly rises 20%, assuming other assets stay the same.' },
    { label: lang === 'id' ? 'Korelasi antar aset' : 'Correlation between assets', prompt: lang === 'id' ? 'Apakah ada aset dalam portofolio saya yang memiliki korelasi terlalu kuat sehingga membahayakan diversifikasi?' : 'Are there any assets in my portfolio that are too strongly correlated, risking my diversification?' },
  ];

  return (
    <div className={styles.chatContainer} aria-live="polite">
      <div className={styles.header}>
        <strong>{lang === 'id' ? 'AI Advisor' : 'AI Advisor'}</strong>
        <span className={styles.badge}>AI</span>
      </div>
      <div className={styles.messages} ref={listRef}>
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.role === 'user' ? styles.user : styles.assistant}`}>
            <div className={styles.messageContent}>
              {m.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.presets}>
        {presets.map(p => (
          <button key={p.label} type="button" className={styles.presetBtn} onClick={() => send(p.prompt)}>
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input className={styles.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder={lang === 'id' ? 'Tanyakan sesuatu tentang portofolio Anda...' : 'Ask something about your portfolio...'} />
        <button type="submit" className={styles.sendBtn} disabled={loading}>{loading ? '…' : (lang === 'id' ? 'Kirim' : 'Send')}</button>
      </form>
    </div>
  );
}
