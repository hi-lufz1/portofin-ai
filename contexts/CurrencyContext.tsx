'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getExchangeRate } from '@/lib/prices';
import type { Currency } from '@/types';

interface CurrencyContextType {
  currency: Currency;
  toggleCurrency: () => void;
  exchangeRate: number;
  formatCurrency: (amount: number) => string;
  convertToDisplay: (amountInIDR: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [exchangeRate, setExchangeRate] = useState<number>(16000);

  useEffect(() => {
    getExchangeRate().then(setExchangeRate);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => (prev === 'IDR' ? 'USD' : 'IDR'));
  }, []);

  const convertToDisplay = useCallback(
    (amountInIDR: number) => {
      if (currency === 'USD') {
        return amountInIDR / exchangeRate;
      }
      return amountInIDR;
    },
    [currency, exchangeRate]
  );

  const formatCurrency = useCallback(
    (amount: number) => {
      const displayAmount = convertToDisplay(amount);
      if (currency === 'IDR') {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(displayAmount);
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(displayAmount);
    },
    [currency, convertToDisplay]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, toggleCurrency, exchangeRate, formatCurrency, convertToDisplay }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
