'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Holding,
  Transaction,
  EnrichedHolding,
  PortfolioSummary,
  AddAssetFormData,
  Portfolio,
  PriceData,
} from '@/types';
import { getCryptoPrices, getStockPrices, getExchangeRate } from '@/lib/prices';
import { useAuth } from './AuthContext';
import {
  DEFAULT_GUEST_PORTFOLIO_ID,
  getGuestPortfolios,
  getGuestActivePortfolioId,
  setGuestActivePortfolioId,
  getGuestHoldings,
  getGuestTransactions,
  createGuestPortfolio,
  updateGuestPortfolio,
  deleteGuestPortfolio,
  addGuestHolding,
  editGuestHolding,
  deleteGuestHolding,
  sellGuestHolding,
  seedGuestSampleData,
  hasGuestDataToSync,
  syncGuestDataToSupabase,
} from '@/lib/local-portfolio';

interface PortfolioContextType {
  // Portfolio management
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  setActivePortfolioId: (id: string | null) => void;
  createPortfolio: (name: string, description?: string) => Promise<void>;
  updatePortfolio: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  // Holdings & transactions (filtered by active portfolio)
  holdings: EnrichedHolding[];
  allHoldings: EnrichedHolding[];
  transactions: Transaction[];
  summary: PortfolioSummary;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addHolding: (data: AddAssetFormData) => Promise<void>;
  editHolding: (id: string, updates: { quantity?: number; avg_buy_price?: number }) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  sellHolding: (id: string, quantity: number, price: number, note?: string) => Promise<void>;
  // Guest Mode helpers
  isSyncingGuest: boolean;
  guestAssetCount: number;
  seedSamplePortfolio: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [allHoldings, setAllHoldings] = useState<EnrichedHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncingGuest, setIsSyncingGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading, isDemo } = useAuth();

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || null;

  // Filter holdings by active portfolio (null = show all)
  const holdings = activePortfolioId
    ? allHoldings.filter((h) => h.portfolio_id === activePortfolioId)
    : allHoldings;

  // Filter transactions by active portfolio
  const filteredTransactions = activePortfolioId
    ? transactions.filter((tx) => tx.portfolio_id === activePortfolioId)
    : transactions;

  const calculateSummary = useCallback((items: EnrichedHolding[]): PortfolioSummary => {
    const totalValue = items.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = items.reduce((sum, h) => sum + h.total_invested, 0);
    const totalPl = totalValue - totalInvested;
    const totalPlPct = totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0;

    const dailyChange = items.reduce((sum, h) => {
      const change24h = h.price_change_24h ?? 0;
      return sum + (h.current_value * change24h) / 100;
    }, 0);
    const dailyChangePct = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;

    const cryptoValue = items
      .filter((h) => h.type === 'crypto')
      .reduce((sum, h) => sum + h.current_value, 0);
    const stockValue = items
      .filter((h) => h.type === 'stock')
      .reduce((sum, h) => sum + h.current_value, 0);

    return {
      total_value: totalValue,
      total_invested: totalInvested,
      total_pl: totalPl,
      total_pl_pct: totalPlPct,
      daily_change: dailyChange,
      daily_change_pct: dailyChangePct,
      crypto_value: cryptoValue,
      stock_value: stockValue,
    };
  }, []);

  const summary = calculateSummary(holdings);

  const setActivePortfolioId = useCallback(
    (id: string | null) => {
      setActivePortfolioIdState(id);
      if (typeof window !== 'undefined') {
        if (user && !isDemo) {
          if (id) localStorage.setItem('portofin_active_portfolio', id);
          else localStorage.removeItem('portofin_active_portfolio');
        } else {
          setGuestActivePortfolioId(id);
        }
      }
    },
    [user, isDemo]
  );

  const enrichRawHoldings = useCallback(async (rawHoldings: Holding[]): Promise<EnrichedHolding[]> => {
    if (rawHoldings.length === 0) return [];

    const cryptoIds = [
      ...new Set(
        rawHoldings
          .filter((h) => h.type === 'crypto' && h.coingecko_id)
          .map((h) => h.coingecko_id!)
      ),
    ];
    const stockTickers = [
      ...new Set(rawHoldings.filter((h) => h.type === 'stock').map((h) => h.ticker)),
    ];

    let cryptoPrices: Record<string, PriceData> = {};
    let stockPrices: Record<string, PriceData> = {};
    let usdToIdr = 16500;

    try {
      usdToIdr = await getExchangeRate();
    } catch (e) {
      console.warn('Exchange rate fetch failed, using fallback:', e);
    }

    try {
      if (cryptoIds.length > 0) cryptoPrices = await getCryptoPrices(cryptoIds);
    } catch (e) {
      console.warn('Crypto price fetch failed:', e);
    }

    try {
      if (stockTickers.length > 0) stockPrices = await getStockPrices(stockTickers);
    } catch (e) {
      console.warn('Stock price fetch failed:', e);
    }

    return rawHoldings.map((h: Holding) => {
      const avgBuyPriceInIDR =
        h.buy_price_currency === 'USD' ? h.avg_buy_price * usdToIdr : h.avg_buy_price;
      let currentPrice = avgBuyPriceInIDR;
      let priceChange24h = 0;

      if (h.type === 'crypto' && h.coingecko_id && cryptoPrices[h.coingecko_id]) {
        const cp = cryptoPrices[h.coingecko_id];
        currentPrice = cp.price_idr;
        priceChange24h = cp.change_24h ?? 0;
      } else if (h.type === 'stock' && stockPrices[h.ticker]) {
        currentPrice = stockPrices[h.ticker].price_idr;
        priceChange24h = stockPrices[h.ticker].change_24h;
      }

      const currentValue = h.quantity * currentPrice;
      const totalInvested = h.quantity * avgBuyPriceInIDR;
      const profitLoss = currentValue - totalInvested;
      const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

      return {
        ...h,
        current_price: currentPrice,
        current_value: currentValue,
        total_invested: totalInvested,
        profit_loss: profitLoss,
        profit_loss_pct: profitLossPct,
        price_change_24h: priceChange24h,
      };
    });
  }, []);

  const refreshData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);

    try {
      // Guest Mode or Demo Mode (no authenticated Supabase user)
      if (!user || isDemo) {
        const gPortfolios = getGuestPortfolios();
        const gHoldings = getGuestHoldings();
        const gTransactions = getGuestTransactions();
        const gActiveId = getGuestActivePortfolioId();

        setPortfolios(gPortfolios);
        setActivePortfolioIdState((prev) =>
          prev && gPortfolios.some((p) => p.id === prev) ? prev : gActiveId
        );
        setTransactions(gTransactions);

        const enriched = await enrichRawHoldings(gHoldings);
        setAllHoldings(enriched);
        setLoading(false);
        return;
      }

      // Authenticated user: migrate any guest data first
      if (hasGuestDataToSync()) {
        setIsSyncingGuest(true);
        try {
          await syncGuestDataToSupabase(supabase, user.id);
        } catch (syncErr) {
          console.error('Guest data migration error:', syncErr);
        } finally {
          setIsSyncingGuest(false);
        }
      }

      // Fetch portfolios
      const { data: portfolioData } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      const fetchedPortfolios = portfolioData || [];
      setPortfolios(fetchedPortfolios);

      // Auto-create default portfolio if none exists
      if (fetchedPortfolios.length === 0) {
        const { data: newPortfolio } = await supabase
          .from('portfolios')
          .insert({ user_id: user.id, name: 'Portofolio Utama', is_default: true })
          .select()
          .single();

        if (newPortfolio) {
          setPortfolios([newPortfolio]);
          setActivePortfolioIdState(newPortfolio.id);

          await supabase
            .from('holdings')
            .update({ portfolio_id: newPortfolio.id })
            .eq('user_id', user.id)
            .is('portfolio_id', null);

          await supabase
            .from('transactions')
            .update({ portfolio_id: newPortfolio.id })
            .eq('user_id', user.id)
            .is('portfolio_id', null);
        }
      }

      // Restore active portfolio from localStorage
      if (!activePortfolioId && typeof window !== 'undefined') {
        const saved = localStorage.getItem('portofin_active_portfolio');
        if (saved && fetchedPortfolios.some((p) => p.id === saved)) {
          setActivePortfolioIdState(saved);
        } else if (fetchedPortfolios.length > 0) {
          setActivePortfolioIdState(null);
        }
      }

      // Fetch holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (holdingsError) throw holdingsError;

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (txError) throw txError;

      setTransactions(txData || []);

      const enriched = await enrichRawHoldings(holdingsData || []);
      setAllHoldings(enriched);
    } catch (err: unknown) {
      console.error('Failed to refresh portfolio:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, isDemo, activePortfolioId, enrichRawHoldings]);

  // Auto-refresh every 60s
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // --- Portfolio CRUD ---
  const createPortfolio = useCallback(
    async (name: string, description?: string) => {
      if (!user || isDemo) {
        const created = createGuestPortfolio(name, description);
        setPortfolios(getGuestPortfolios());
        setActivePortfolioId(created.id);
        return;
      }

      const { data: newPortfolio } = await supabase
        .from('portfolios')
        .insert({ user_id: user.id, name, description: description || null, is_default: false })
        .select()
        .single();

      if (newPortfolio) {
        setPortfolios((prev) => [...prev, newPortfolio]);
      }
    },
    [user, isDemo, setActivePortfolioId]
  );

  const updatePortfolio = useCallback(
    async (id: string, updates: { name?: string; description?: string }) => {
      if (!user || isDemo) {
        updateGuestPortfolio(id, updates);
        setPortfolios(getGuestPortfolios());
        return;
      }

      await supabase.from('portfolios').update(updates).eq('id', id);
      setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [user, isDemo]
  );

  const deletePortfolio = useCallback(
    async (id: string) => {
      const target = portfolios.find((p) => p.id === id);
      if (target?.is_default) throw new Error('Cannot delete default portfolio');

      if (!user || isDemo) {
        deleteGuestPortfolio(id);
        await refreshData();
        return;
      }

      await supabase.from('portfolios').delete().eq('id', id);
      setPortfolios((prev) => prev.filter((p) => p.id !== id));

      if (activePortfolioId === id) {
        setActivePortfolioId(null);
      }
      await refreshData();
    },
    [user, isDemo, portfolios, activePortfolioId, setActivePortfolioId, refreshData]
  );

  // --- Holding CRUD (portfolio-aware) ---
  const addHolding = useCallback(
    async (data: AddAssetFormData) => {
      const portfolioId =
        activePortfolioId ||
        portfolios.find((p) => p.is_default)?.id ||
        portfolios[0]?.id ||
        DEFAULT_GUEST_PORTFOLIO_ID;

      if (!user || isDemo) {
        addGuestHolding(portfolioId, data);
        await refreshData();
        return;
      }

      // Check if holding already exists with SAME currency in SAME portfolio
      const { data: existing } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker', data.ticker)
        .eq('buy_price_currency', data.buy_price_currency)
        .eq('portfolio_id', portfolioId)
        .single();

      let holdingId: string | null = null;

      if (existing) {
        const totalQty = existing.quantity + data.quantity;
        const totalCost = existing.quantity * existing.avg_buy_price + data.quantity * data.buy_price;
        const newAvgPrice = totalCost / totalQty;

        await supabase
          .from('holdings')
          .update({ quantity: totalQty, avg_buy_price: newAvgPrice })
          .eq('id', existing.id);
        holdingId = existing.id;
      } else {
        const { data: newHolding } = await supabase
          .from('holdings')
          .insert({
            user_id: user.id,
            portfolio_id: portfolioId,
            ticker: data.ticker,
            name: data.name,
            type: data.type,
            quantity: data.quantity,
            avg_buy_price: data.buy_price,
            buy_price_currency: data.buy_price_currency,
            coingecko_id: data.coingecko_id || null,
          })
          .select()
          .single();
        holdingId = newHolding?.id || null;
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        holding_id: holdingId,
        portfolio_id: portfolioId,
        ticker: data.ticker,
        name: data.name,
        type: data.type,
        action: 'buy',
        quantity: data.quantity,
        price: data.buy_price,
        price_currency: data.buy_price_currency,
        total: data.quantity * data.buy_price,
        note: data.note,
        date: data.date || new Date().toISOString().split('T')[0],
      });

      await refreshData();
    },
    [user, isDemo, refreshData, activePortfolioId, portfolios]
  );

  const editHolding = useCallback(
    async (id: string, updates: { quantity?: number; avg_buy_price?: number }) => {
      if (!user || isDemo) {
        editGuestHolding(id, updates);
        await refreshData();
        return;
      }

      await supabase.from('holdings').update(updates).eq('id', id);
      await refreshData();
    },
    [user, isDemo, refreshData]
  );

  const deleteHolding = useCallback(
    async (id: string) => {
      if (!user || isDemo) {
        deleteGuestHolding(id);
        await refreshData();
        return;
      }

      await supabase.from('holdings').delete().eq('id', id);
      await refreshData();
    },
    [user, isDemo, refreshData]
  );

  const sellHolding = useCallback(
    async (id: string, quantity: number, price: number, note?: string) => {
      if (!user || isDemo) {
        sellGuestHolding(id, quantity, price, note);
        await refreshData();
        return;
      }

      const { data: holding } = await supabase
        .from('holdings')
        .select('*')
        .eq('id', id)
        .single();

      if (!holding) throw new Error('Holding not found');

      // Record transaction FIRST (before deleting holding, to avoid FK violation)
      await supabase.from('transactions').insert({
        user_id: user.id,
        holding_id: id,
        portfolio_id: holding.portfolio_id,
        ticker: holding.ticker,
        name: holding.name,
        type: holding.type,
        action: 'sell',
        quantity,
        price,
        price_currency: holding.buy_price_currency || 'IDR',
        total: quantity * price,
        note,
        date: new Date().toISOString().split('T')[0],
      });

      const newQty = holding.quantity - quantity;
      if (newQty <= 0) {
        await supabase.from('holdings').delete().eq('id', id);
      } else {
        await supabase.from('holdings').update({ quantity: newQty }).eq('id', id);
      }

      await refreshData();
    },
    [user, isDemo, refreshData]
  );

  const seedSamplePortfolio = useCallback(async () => {
    if (user && !isDemo) return;
    const targetId =
      activePortfolioId ||
      portfolios.find((p) => p.is_default)?.id ||
      portfolios[0]?.id ||
      DEFAULT_GUEST_PORTFOLIO_ID;
    seedGuestSampleData(targetId);
    await refreshData();
  }, [user, isDemo, activePortfolioId, portfolios, refreshData]);

  const guestAssetCount = !user || isDemo ? allHoldings.length : 0;

  return (
    <PortfolioContext.Provider
      value={{
        portfolios,
        activePortfolio,
        setActivePortfolioId,
        createPortfolio,
        updatePortfolio,
        deletePortfolio,
        holdings,
        allHoldings,
        transactions: filteredTransactions,
        summary,
        loading,
        error,
        refreshData,
        addHolding,
        editHolding,
        deleteHolding,
        sellHolding,
        isSyncingGuest,
        guestAssetCount,
        seedSamplePortfolio,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
