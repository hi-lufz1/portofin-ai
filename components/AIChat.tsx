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
    {
      id: 'm0',
      role: 'assistant',
      content:
        lang === 'id'
          ? 'Halo! Saya Asisten Diagnostik Portofin. Saya membantu membedah konsentrasi risiko, bobot aset, dan simulasi skenario portofoliomu secara objektif (bukan saran jual/beli). Apa yang ingin kamu evaluasi?'
          : 'Hello! I am the Portofin Diagnostic Copilot. I help evaluate your risk concentration, asset weights, and market scenarios objectively (non-advisory). What would you like to inspect?',
    },
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
    setMessages((prev) => [...prev, userMsg]);
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
      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();
    } catch {
      const errMsg: Msg = {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content:
          lang === 'id' ? 'Gagal terhubung ke layanan AI.' : 'Failed to reach AI service.',
      };
      setMessages((prev) => [...prev, errMsg]);
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
    {
      label:
        lang === 'id' ? 'Evaluasi konsentrasi risiko' : 'Evaluate risk concentration',
      prompt:
        lang === 'id'
          ? 'Berdasarkan bobot aset saya saat ini, aset mana yang menyumbang konsentrasi risiko terbesar dan bagaimana dampaknya terhadap diversifikasi?'
          : 'Based on my current asset weights, which holdings contribute the highest concentration risk and how does that affect diversification?',
    },
    {
      label:
        lang === 'id' ? 'Simulasi: Koreksi pasar 20%' : 'Simulate: 20% market drawdown',
      prompt:
        lang === 'id'
          ? 'Tolong simulasikan secara matematis apa yang terjadi pada total nilai portofolio saya jika aset berisiko tinggi terkoreksi 20%.'
          : 'Please mathematically simulate what happens to my total portfolio value if high-volatility assets drop by 20%.',
    },
    {
      label: lang === 'id' ? 'Korelasi antar kelas aset' : 'Asset-class correlation',
      prompt:
        lang === 'id'
          ? 'Bagaimana karakteristik korelasi antara porsi saham IDX dan crypto dalam portofolio saya saat ini?'
          : 'What are the correlation characteristics between the IDX stock and crypto portions of my current portfolio?',
    },
  ];

  return (
    <div className={styles.chatContainer} aria-live="polite">
      <div className={styles.header}>
        <strong>
          {lang === 'id' ? 'Asisten Diagnostik Portofolio' : 'Portfolio Diagnostic Copilot'}
        </strong>
        <span className={styles.badge}>
          {lang === 'id' ? 'Edukasi & Analitik' : 'Non-Advisory'}
        </span>
      </div>
      <div className={styles.messages} ref={listRef}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${styles.message} ${
              m.role === 'user' ? styles.user : styles.assistant
            }`}
          >
            <div className={styles.messageContent}>
              {m.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.presets}>
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className={styles.presetBtn}
            onClick={() => send(p.prompt)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            lang === 'id'
              ? 'Tanyakan metrik risiko atau simulasi skenario...'
              : 'Ask about risk metrics or scenario simulations...'
          }
        />
        <button type="submit" className={styles.sendBtn} disabled={loading}>
          {loading ? '...' : lang === 'id' ? 'Kirim' : 'Send'}
        </button>
      </form>
    </div>
  );
}
