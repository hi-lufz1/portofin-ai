'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { translations, type Language } from '@/lib/translations';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('id');

  const toggleLanguage = useCallback(() => {
    setLang((prev) => (prev === 'id' ? 'en' : 'id'));
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let text = translations[key]?.[lang] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
