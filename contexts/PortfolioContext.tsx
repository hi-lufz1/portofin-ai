'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Holding, Transaction, EnrichedHolding, PortfolioSummary, AddAssetFormData, Portfolio, PriceData } from '@/types';
import { getCryptoPrices, getStockPrices, getExchangeRate } from '@/lib/prices';

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
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [allHoldings, setAllHoldings] = useState<EnrichedHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || null;

  // Filter holdings by active portfolio (null = show all)
  const holdings = activePortfolioId
    ? allHoldings.filter((h) => h.portfolio_id === activePortfolioId)
    : allHoldings;

  // Filter transactions by active portfolio
  const filteredTransactions = activePortfolioId
    ? transactions.filter((tx) => tx.portfolio_id === activePortfolioId)
    : transactions;

  const calculateSummary = useCallback((holdings: EnrichedHolding[]): PortfolioSummary => {
    const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.total_invested, 0);
    const totalPl = totalValue - totalInvested;
    const totalPlPct = totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0;

    const dailyChange = holdings.reduce((sum, h) => {
      const change24h = h.price_change_24h ?? 0;
      return sum + (h.current_value * change24h) / 100;
    }, 0);
    const dailyChangePct = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;

    const cryptoValue = holdings
      .filter((h) => h.type === 'crypto')
      .reduce((sum, h) => sum + h.current_value, 0);
    const stockValue = holdings
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

  const setActivePortfolioId = useCallback((id: string | null) => {
    setActivePortfolioIdState(id);
    // Persist selection
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('portofin_active_portfolio', id);
      else localStorage.removeItem('portofin_active_portfolio');
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
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

          // Link any orphan holdings to this portfolio
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
          // Default to first (default) portfolio
          setActivePortfolioIdState(null); // null = show all
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

      // Enrich holdings with live prices
      const rawHoldings = holdingsData || [];
      const cryptoIds = [...new Set(
        rawHoldings.filter(h => h.type === 'crypto' && h.coingecko_id).map(h => h.coingecko_id!)
      )];
      const stockTickers = [...new Set(
        rawHoldings.filter(h => h.type === 'stock').map(h => h.ticker)
      )];

      let cryptoPrices: Record<string, PriceData> = {};
      let stockPrices: Record<string, PriceData> = {};
      let usdToIdr = 16500; // fallback

      try {
        usdToIdr = await getExchangeRate();
      } catch (e) { console.warn('Exchange rate fetch failed, using fallback:', e); }

      try {
        if (cryptoIds.length > 0) cryptoPrices = await getCryptoPrices(cryptoIds);
      } catch (e) { console.warn('Crypto price fetch failed:', e); }

      try {
        if (stockTickers.length > 0) stockPrices = await getStockPrices(stockTickers);
      } catch (e) { console.warn('Stock price fetch failed:', e); }

      const enriched: EnrichedHolding[] = rawHoldings.map((h: Holding) => {
        let currentPrice = 0;
        let priceChange24h = 0;

        if (h.type === 'crypto' && h.coingecko_id && cryptoPrices[h.coingecko_id]) {
          const cp = cryptoPrices[h.coingecko_id];
          currentPrice = cp.price_idr;
          priceChange24h = cp.change_24h ?? 0;
        } else if (h.type === 'stock' && stockPrices[h.ticker]) {
          currentPrice = stockPrices[h.ticker].price_idr;
          priceChange24h = stockPrices[h.ticker].change_24h;
        }

        // Convert avg_buy_price to IDR if it was stored in USD
        const avgBuyPriceInIDR = h.buy_price_currency === 'USD'
          ? h.avg_buy_price * usdToIdr
          : h.avg_buy_price;

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

      setAllHoldings(enriched);
    } catch (err: unknown) {
      console.error('Failed to refresh portfolio:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // --- Portfolio CRUD ---
  const createPortfolio = useCallback(async (name: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: newPortfolio } = await supabase
      .from('portfolios')
      .insert({ user_id: user.id, name, description: description || null, is_default: false })
      .select()
      .single();

    if (newPortfolio) {
      setPortfolios((prev) => [...prev, newPortfolio]);
    }
  }, []);

  const updatePortfolio = useCallback(async (id: string, updates: { name?: string; description?: string }) => {
    await supabase.from('portfolios').update(updates).eq('id', id);
    setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const deletePortfolio = useCallback(async (id: string) => {
    // Don't allow deleting default portfolio
    const target = portfolios.find((p) => p.id === id);
    if (target?.is_default) throw new Error('Cannot delete default portfolio');

    await supabase.from('portfolios').delete().eq('id', id);
    setPortfolios((prev) => prev.filter((p) => p.id !== id));

    // If deleted the active one, switch to all
    if (activePortfolioId === id) {
      setActivePortfolioId(null);
    }
    await refreshData();
  }, [portfolios, activePortfolioId, setActivePortfolioId, refreshData]);

  // --- Holding CRUD (portfolio-aware) ---
  const addHolding = useCallback(async (data: AddAssetFormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use active portfolio or default
    const portfolioId = activePortfolioId || portfolios.find((p) => p.is_default)?.id || portfolios[0]?.id;

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
      const { data: newHolding } = await supabase.from('holdings').insert({
        user_id: user.id,
        portfolio_id: portfolioId,
        ticker: data.ticker,
        name: data.name,
        type: data.type,
        quantity: data.quantity,
        avg_buy_price: data.buy_price,
        buy_price_currency: data.buy_price_currency,
        coingecko_id: data.coingecko_id || null,
      }).select().single();
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
  }, [refreshData, activePortfolioId, portfolios]);

  const editHolding = useCallback(async (id: string, updates: { quantity?: number; avg_buy_price?: number }) => {
    await supabase.from('holdings').update(updates).eq('id', id);
    await refreshData();
  }, [refreshData]);

  const deleteHolding = useCallback(async (id: string) => {
    await supabase.from('holdings').delete().eq('id', id);
    await refreshData();
  }, [refreshData]);

  const sellHolding = useCallback(async (id: string, quantity: number, price: number, note?: string) => {
    const { data: holding } = await supabase
      .from('holdings')
      .select('*')
      .eq('id', id)
      .single();

    if (!holding) throw new Error('Holding not found');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

    // Then update/delete holding
    const newQty = holding.quantity - quantity;
    if (newQty <= 0) {
      await supabase.from('holdings').delete().eq('id', id);
    } else {
      await supabase.from('holdings').update({ quantity: newQty }).eq('id', id);
    }

    await refreshData();
  }, [refreshData]);

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
        deleteHolding: deleteHolding,
        sellHolding,
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
