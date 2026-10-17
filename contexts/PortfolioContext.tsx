'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Holding, HoldingWithMarketData, Transaction, PortfolioSummary, AssetType, Currency, Portfolio } from '@/types';
import { supabase } from '@/lib/supabase';
import { getCryptoPrices } from '@/lib/coingecko';
import { getStockPrices } from '@/lib/yahoo-finance';
import { getExchangeRate } from '@/lib/currency';
import { useCurrency } from './CurrencyContext';
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

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEMO_PORTFOLIO: Portfolio = {
  id: 'demo-portfolio-1',
  user_id: '00000000-0000-0000-0000-000000000000',
  name: 'Portofolio Utama',
  icon: 'briefcase',
  color: '#0F172A',
  is_default: true,
  created_at: new Date().toISOString(),
};

const DEMO_HOLDINGS: Holding[] = [
  { id: '1', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'stock', ticker: 'BBCA', name: 'Bank Central Asia Tbk', quantity: 2500, avg_buy_price: 9200, currency: 'IDR', coingecko_id: null, created_at: new Date(Date.now() - 30 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '2', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'stock', ticker: 'BBRI', name: 'Bank Rakyat Indonesia Tbk', quantity: 5000, avg_buy_price: 4600, currency: 'IDR', coingecko_id: null, created_at: new Date(Date.now() - 25 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '3', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'stock', ticker: 'TLKM', name: 'Telkom Indonesia Tbk', quantity: 3000, avg_buy_price: 3100, currency: 'IDR', coingecko_id: null, created_at: new Date(Date.now() - 20 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '4', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'stock', ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', quantity: 50000, avg_buy_price: 72, currency: 'IDR', coingecko_id: null, created_at: new Date(Date.now() - 15 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '5', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'stock', ticker: 'BMRI', name: 'Bank Mandiri Tbk', quantity: 2000, avg_buy_price: 6400, currency: 'IDR', coingecko_id: null, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '6', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'crypto', ticker: 'BTC', name: 'Bitcoin', quantity: 0.05, avg_buy_price: 950000000, currency: 'IDR', coingecko_id: 'bitcoin', created_at: new Date(Date.now() - 40 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '7', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'crypto', ticker: 'ETH', name: 'Ethereum', quantity: 0.8, avg_buy_price: 42000000, currency: 'IDR', coingecko_id: 'ethereum', created_at: new Date(Date.now() - 35 * 86400000).toISOString(), updated_at: new Date().toISOString() },
  { id: '8', user_id: '00000000-0000-0000-0000-000000000000', portfolio_id: 'demo-portfolio-1', asset_type: 'crypto', ticker: 'SOL', name: 'Solana', quantity: 10, avg_buy_price: 2200000, currency: 'IDR', coingecko_id: 'solana', created_at: new Date(Date.now() - 12 * 86400000).toISOString(), updated_at: new Date().toISOString() },
];

const DEMO_TRANSACTIONS: Transaction[] = DEMO_HOLDINGS.map((h) => ({
  id: `tx-${h.id}`,
  user_id: h.user_id,
  portfolio_id: 'demo-portfolio-1',
  holding_id: h.id,
  action: 'buy' as const,
  asset_type: h.asset_type,
  ticker: h.ticker,
  name: h.name,
  quantity: h.quantity,
  price: h.avg_buy_price,
  total: h.quantity * h.avg_buy_price,
  currency: h.currency,
  realized_pl: null,
  avg_cost_at_sell: null,
  note: null,
  created_at: h.created_at,
}));

interface PortfolioContextType {
  // Portfolios
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  setActivePortfolioId: (id: string) => void;
  createPortfolio: (name: string, icon?: string, color?: string) => Promise<Portfolio>;
  updatePortfolio: (id: string, data: Partial<Pick<Portfolio, 'name' | 'icon' | 'color'>>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  // Holdings & data (scoped to active portfolio)
  holdings: HoldingWithMarketData[];
  allHoldings: HoldingWithMarketData[];
  transactions: Transaction[];
  summary: PortfolioSummary;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addHolding: (data: {
    asset_type: AssetType;
    ticker: string;
    name: string;
    quantity: number;
    avg_buy_price: number;
    currency: Currency;
    coingecko_id?: string | null;
  }) => Promise<void>;
  editHolding: (id: string, data: { quantity: number; avg_buy_price: number }) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  sellHolding: (holdingId: string, sellQty: number, sellPrice: number, note?: string) => Promise<void>;
  // Guest Mode helpers
  isSyncingGuest: boolean;
  guestAssetCount: number;
  seedSamplePortfolio: () => Promise<void>;
}

const defaultSummary: PortfolioSummary = {
  total_value: 0,
  total_cost: 0,
  total_pl: 0,
  total_pl_pct: 0,
  change_24h: 0,
  change_24h_pct: 0,
  stock_value: 0,
  crypto_value: 0,
  holding_count: 0,
};

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioIdState] = useState<string>('');
  const [allRawHoldings, setAllRawHoldings] = useState<Holding[]>([]);
  const [allEnrichedHoldings, setAllEnrichedHoldings] = useState<HoldingWithMarketData[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncingGuest, setIsSyncingGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currency, setExchangeRate } = useCurrency();
  const { user, loading: authLoading } = useAuth();

  // Demo state
  const [demoPortfolios, setDemoPortfolios] = useState<Portfolio[]>([DEMO_PORTFOLIO]);
  const [demoHoldings, setDemoHoldings] = useState<Holding[]>(DEMO_HOLDINGS);
  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0] || null;

  const setActivePortfolioId = useCallback((id: string) => {
    setActivePortfolioIdState(id);
    if (user) {
      localStorage.setItem('portofin_active_portfolio', id);
    } else {
      setGuestActivePortfolioId(id);
    }
  }, [user]);

  const holdings = allEnrichedHoldings.filter(h => h.portfolio_id === activePortfolio?.id);
  const transactions = allTransactions.filter(t => t.portfolio_id === activePortfolio?.id);

  const enrichHoldings = useCallback(async (rawHoldings: Holding[]) => {
    const rate = await getExchangeRate();
    setExchangeRate(rate);

    if (rawHoldings.length === 0) {
      setAllEnrichedHoldings([]);
      return;
    }

    const cryptoHoldings = rawHoldings.filter(h => h.asset_type === 'crypto' && h.coingecko_id);
    const stockHoldings = rawHoldings.filter(h => h.asset_type === 'stock');

    const cryptoIds = [...new Set(cryptoHoldings.map(h => h.coingecko_id!))];
    const stockTickers = [...new Set(stockHoldings.map(h => h.ticker))];

    const [cryptoPrices, stockPrices] = await Promise.all([
      cryptoIds.length > 0 ? getCryptoPrices(cryptoIds) : Promise.resolve({}),
      stockTickers.length > 0 ? getStockPrices(stockTickers) : Promise.resolve({}),
    ]);

    const enriched: HoldingWithMarketData[] = rawHoldings.map(h => {
      let currentPriceInHoldingCur = Number(h.avg_buy_price);
      let change24hPct = 0;

      if (h.asset_type === 'crypto' && h.coingecko_id && cryptoPrices[h.coingecko_id]) {
        const cp = cryptoPrices[h.coingecko_id];
        currentPriceInHoldingCur = h.currency === 'IDR' ? cp.idr : cp.usd;
        change24hPct = h.currency === 'IDR' ? cp.idr_24h_change : cp.usd_24h_change;
      } else if (h.asset_type === 'stock' && stockPrices[h.ticker]) {
        const sp = stockPrices[h.ticker];
        if (sp.price > 0) {
          currentPriceInHoldingCur = h.currency === 'IDR' ? sp.price : sp.price / rate;
        }
        change24hPct = sp.changePercent;
      }

      const toDisplay = (val: number): number => {
        if (h.currency === currency) return val;
        return currency === 'USD' ? val / rate : val * rate;
      };

      const qty = Number(h.quantity);
      const buyPrice = toDisplay(Number(h.avg_buy_price));
      const curPrice = toDisplay(currentPriceInHoldingCur);
      const totalCost = qty * buyPrice;
      const currentValue = qty * curPrice;
      const unrealizedPl = currentValue - totalCost;
      const unrealizedPlPct = totalCost > 0 ? (unrealizedPl / totalCost) * 100 : 0;

      return {
        ...h,
        quantity: qty,
        avg_buy_price: buyPrice,
        current_price: curPrice,
        current_value: currentValue,
        total_cost: totalCost,
        unrealized_pl: unrealizedPl,
        unrealized_pl_pct: unrealizedPlPct,
        change_24h_pct: change24hPct,
        allocation_pct: 0,
      };
    });

    const portfolioTotals: Record<string, number> = {};
    for (const h of enriched) {
      portfolioTotals[h.portfolio_id] = (portfolioTotals[h.portfolio_id] || 0) + h.current_value;
    }
    for (const h of enriched) {
      const pTotal = portfolioTotals[h.portfolio_id] || 0;
      h.allocation_pct = pTotal > 0 ? (h.current_value / pTotal) * 100 : 0;
    }

    setAllEnrichedHoldings(enriched);
  }, [currency, setExchangeRate]);

  const summary: PortfolioSummary = React.useMemo(() => {
    const totalVal = holdings.reduce((sum, h) => sum + h.current_value, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.total_cost, 0);
    const totalPl = totalVal - totalCost;
    const totalPlPct = totalCost > 0 ? (totalPl / totalCost) * 100 : 0;
    const stockVal = holdings.filter(h => h.asset_type === 'stock').reduce((s, h) => s + h.current_value, 0);
    const cryptoVal = holdings.filter(h => h.asset_type === 'crypto').reduce((s, h) => s + h.current_value, 0);
    const weighted24h = holdings.reduce((sum, h) => {
      const weight = totalVal > 0 ? h.current_value / totalVal : 0;
      return sum + h.change_24h_pct * weight;
    }, 0);
    const change24hVal = totalVal * (weighted24h / 100);

    return {
      total_value: totalVal,
      total_cost: totalCost,
      total_pl: totalPl,
      total_pl_pct: totalPlPct,
      change_24h: change24hVal,
      change_24h_pct: weighted24h,
      stock_value: stockVal,
      crypto_value: cryptoVal,
      holding_count: holdings.length,
    };
  }, [holdings]);

  const refreshData = useCallback(async () => {
    if (authLoading && !isDemo) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Fixed Demo Mode
      if (isDemo) {
        setPortfolios(demoPortfolios);
        if (!activePortfolioId || !demoPortfolios.find(p => p.id === activePortfolioId)) {
          setActivePortfolioIdState(demoPortfolios[0]?.id || '');
        }
        setAllRawHoldings(demoHoldings);
        setAllTransactions(demoTransactions);
        await enrichHoldings(demoHoldings);
        return;
      }

      // 2. Guest Mode (Deferred Auth Sandbox in localStorage)
      if (!user) {
        const guestPfs = getGuestPortfolios();
        const guestHolds = getGuestHoldings();
        const guestTxs = getGuestTransactions();

        setPortfolios(guestPfs);
        const savedGuestPfId = getGuestActivePortfolioId();
        const validPf =
          guestPfs.find(p => p.id === savedGuestPfId) ||
          guestPfs.find(p => p.id === activePortfolioId) ||
          guestPfs.find(p => p.is_default) ||
          guestPfs[0];

        if (validPf && validPf.id !== activePortfolioId) {
          setActivePortfolioIdState(validPf.id);
        }

        setAllRawHoldings(guestHolds);
        setAllTransactions(guestTxs);
        await enrichHoldings(guestHolds);
        return;
      }

      // 3. Authenticated Cloud Mode (with automatic Guest-to-Cloud sync if guest data exists)
      if (hasGuestDataToSync()) {
        setIsSyncingGuest(true);
        try {
          await syncGuestDataToSupabase(user.id);
        } catch (syncErr) {
          console.error('Guest sync warning:', syncErr);
        } finally {
          setIsSyncingGuest(false);
        }
      }

      const [portfoliosRes, holdingsRes, txRes] = await Promise.all([
        supabase.from('portfolios').select('*').order('created_at', { ascending: true }),
        supabase.from('holdings').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      if (portfoliosRes.error) throw portfoliosRes.error;
      if (holdingsRes.error) throw holdingsRes.error;
      if (txRes.error) throw txRes.error;

      let pList = (portfoliosRes.data || []) as Portfolio[];

      if (pList.length === 0) {
        const { data: newP, error: createErr } = await supabase
          .from('portfolios')
          .insert({ user_id: user.id, name: 'Portofolio Utama', icon: 'briefcase', color: '#0F172A', is_default: true })
          .select()
          .single();
        if (createErr) throw createErr;
        pList = [newP as Portfolio];
      }

      const defaultPortfolio = pList.find(p => p.is_default) || pList[0];
      const rawH = (holdingsRes.data || []) as Holding[];
      const orphanHoldings = rawH.filter(h => !h.portfolio_id);
      if (orphanHoldings.length > 0 && defaultPortfolio) {
        await supabase
          .from('holdings')
          .update({ portfolio_id: defaultPortfolio.id })
          .is('portfolio_id', null);
        for (const h of orphanHoldings) {
          h.portfolio_id = defaultPortfolio.id;
        }
      }

      const rawTx = (txRes.data || []) as Transaction[];
      const orphanTx = rawTx.filter(t => !t.portfolio_id);
      if (orphanTx.length > 0 && defaultPortfolio) {
        await supabase
          .from('transactions')
          .update({ portfolio_id: defaultPortfolio.id })
          .is('portfolio_id', null);
        for (const t of orphanTx) {
          t.portfolio_id = defaultPortfolio.id;
        }
      }

      setPortfolios(pList);

      const savedId = typeof window !== 'undefined' ? localStorage.getItem('portofin_active_portfolio') : null;
      const validSaved = pList.find(p => p.id === savedId);
      const validCurrent = pList.find(p => p.id === activePortfolioId);
      if (!validCurrent) {
        const chosen = validSaved || defaultPortfolio;
        setActivePortfolioIdState(chosen.id);
      }

      setAllRawHoldings(rawH);
      setAllTransactions(rawTx);
      await enrichHoldings(rawH);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err);
      console.error('Portfolio fetch error:', msg, err);
      setError(msg || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, demoPortfolios, demoHoldings, demoTransactions, activePortfolioId, enrichHoldings]);

  useEffect(() => {
    if (allRawHoldings.length > 0) {
      enrichHoldings(allRawHoldings);
    }
  }, [currency, allRawHoldings, enrichHoldings]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ======= PORTFOLIO CRUD =======
  const createPortfolio = async (name: string, icon = 'briefcase', color = '#0F172A'): Promise<Portfolio> => {
    if (isDemo) {
      const newP: Portfolio = {
        id: `demo-portfolio-${Date.now()}`,
        user_id: '00000000-0000-0000-0000-000000000000',
        name, icon, color,
        is_default: false,
        created_at: new Date().toISOString(),
      };
      setDemoPortfolios(prev => [...prev, newP]);
      setActivePortfolioId(newP.id);
      return newP;
    }

    if (!user) {
      const newGuestPf = createGuestPortfolio(name, icon, color);
      setActivePortfolioId(newGuestPf.id);
      await refreshData();
      return newGuestPf;
    }

    const { data, error: err } = await supabase
      .from('portfolios')
      .insert({ user_id: user.id, name, icon, color, is_default: false })
      .select()
      .single();
    if (err) throw err;

    const created = data as Portfolio;
    setPortfolios(prev => [...prev, created]);
    setActivePortfolioId(created.id);
    return created;
  };

  const updatePortfolio = async (id: string, data: Partial<Pick<Portfolio, 'name' | 'icon' | 'color'>>) => {
    if (isDemo) {
      setDemoPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      return;
    }

    if (!user) {
      const updated = updateGuestPortfolio(id, data);
      setPortfolios(updated);
      return;
    }

    const { error: err } = await supabase.from('portfolios').update(data).eq('id', id);
    if (err) throw err;
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const deletePortfolio = async (id: string) => {
    const target = portfolios.find(p => p.id === id);
    if (!target || target.is_default) throw new Error('Cannot delete default portfolio');

    if (isDemo) {
      setDemoPortfolios(prev => prev.filter(p => p.id !== id));
      setDemoHoldings(prev => prev.filter(h => h.portfolio_id !== id));
      setDemoTransactions(prev => prev.filter(t => t.portfolio_id !== id));
      if (activePortfolioId === id) {
        const def = demoPortfolios.find(p => p.is_default) || demoPortfolios[0];
        if (def) setActivePortfolioId(def.id);
      }
      return;
    }

    if (!user) {
      const remaining = deleteGuestPortfolio(id);
      if (activePortfolioId === id) {
        const def = remaining.find(p => p.is_default) || remaining[0];
        if (def) setActivePortfolioId(def.id);
      }
      await refreshData();
      return;
    }

    const { error: err } = await supabase.from('portfolios').delete().eq('id', id);
    if (err) throw err;

    const remaining = portfolios.filter(p => p.id !== id);
    setPortfolios(remaining);
    if (activePortfolioId === id) {
      const def = remaining.find(p => p.is_default) || remaining[0];
      if (def) setActivePortfolioId(def.id);
    }
    await refreshData();
  };

  // ======= HOLDINGS CRUD =======
  const addHolding = async (data: {
    asset_type: AssetType;
    ticker: string;
    name: string;
    quantity: number;
    avg_buy_price: number;
    currency: Currency;
    coingecko_id?: string | null;
  }) => {
    const pId = activePortfolio?.id || DEFAULT_GUEST_PORTFOLIO_ID;

    if (isDemo) {
      const existing = demoHoldings.find(
        h => h.portfolio_id === pId && h.ticker.toUpperCase() === data.ticker.toUpperCase() && h.asset_type === data.asset_type
      );

      let holdingId: string;
      if (existing) {
        const totalQty = Number(existing.quantity) + data.quantity;
        const totalCost = Number(existing.quantity) * Number(existing.avg_buy_price) + data.quantity * data.avg_buy_price;
        const newAvgPrice = totalCost / totalQty;
        holdingId = existing.id;
        setDemoHoldings(prev => prev.map(h =>
          h.id === existing.id
            ? { ...h, quantity: totalQty, avg_buy_price: newAvgPrice, updated_at: new Date().toISOString() }
            : h
        ));
      } else {
        holdingId = `demo-${Date.now()}`;
        const newH: Holding = {
          id: holdingId,
          user_id: '00000000-0000-0000-0000-000000000000',
          portfolio_id: pId,
          asset_type: data.asset_type,
          ticker: data.ticker.toUpperCase(),
          name: data.name,
          quantity: data.quantity,
          avg_buy_price: data.avg_buy_price,
          currency: data.currency,
          coingecko_id: data.coingecko_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setDemoHoldings(prev => [newH, ...prev]);
      }

      const newTx: Transaction = {
        id: `tx-demo-${Date.now()}`,
        user_id: '00000000-0000-0000-0000-000000000000',
        portfolio_id: pId,
        holding_id: holdingId,
        action: 'buy',
        asset_type: data.asset_type,
        ticker: data.ticker.toUpperCase(),
        name: data.name,
        quantity: data.quantity,
        price: data.avg_buy_price,
        total: data.quantity * data.avg_buy_price,
        currency: data.currency,
        realized_pl: null,
        avg_cost_at_sell: null,
        note: null,
        created_at: new Date().toISOString(),
      };
      setDemoTransactions(prev => [newTx, ...prev]);
      return;
    }

    if (!user) {
      addGuestHolding({
        portfolio_id: pId,
        ...data,
      });
      await refreshData();
      return;
    }

    const existing = allRawHoldings.find(
      h => h.portfolio_id === pId && h.ticker.toUpperCase() === data.ticker.toUpperCase() && h.asset_type === data.asset_type
    );

    let holdingId: string;

    if (existing) {
      const totalQty = Number(existing.quantity) + data.quantity;
      const totalCost = Number(existing.quantity) * Number(existing.avg_buy_price) + data.quantity * data.avg_buy_price;
      const newAvgPrice = totalCost / totalQty;

      const { error: updateErr } = await supabase
        .from('holdings')
        .update({
          quantity: totalQty,
          avg_buy_price: newAvgPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateErr) throw updateErr;
      holdingId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('holdings')
        .insert({
          user_id: user.id,
          portfolio_id: pId,
          asset_type: data.asset_type,
          ticker: data.ticker.toUpperCase(),
          name: data.name,
          quantity: data.quantity,
          avg_buy_price: data.avg_buy_price,
          currency: data.currency,
          coingecko_id: data.coingecko_id || null,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      holdingId = inserted.id;
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      portfolio_id: pId,
      holding_id: holdingId,
      action: 'buy',
      asset_type: data.asset_type,
      ticker: data.ticker.toUpperCase(),
      name: data.name,
      quantity: data.quantity,
      price: data.avg_buy_price,
      total: data.quantity * data.avg_buy_price,
      currency: data.currency,
    });

    await refreshData();
  };

  const editHolding = async (id: string, data: { quantity: number; avg_buy_price: number }) => {
    if (isDemo) {
      setDemoHoldings(prev => prev.map(h =>
        h.id === id
          ? { ...h, quantity: data.quantity, avg_buy_price: data.avg_buy_price, updated_at: new Date().toISOString() }
          : h
      ));
      return;
    }

    if (!user) {
      editGuestHolding(id, data);
      await refreshData();
      return;
    }

    const { error: updateErr } = await supabase
      .from('holdings')
      .update({
        quantity: data.quantity,
        avg_buy_price: data.avg_buy_price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;
    await refreshData();
  };

  const deleteHolding = async (id: string) => {
    if (isDemo) {
      setDemoHoldings(prev => prev.filter(h => h.id !== id));
      return;
    }

    if (!user) {
      deleteGuestHolding(id);
      await refreshData();
      return;
    }

    const { error: delErr } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (delErr) throw delErr;
    await refreshData();
  };

  const sellHolding = async (holdingId: string, sellQty: number, sellPrice: number, note?: string) => {
    const holding = allRawHoldings.find(h => h.id === holdingId);
    if (!holding) throw new Error('Holding not found');

    const currentQty = Number(holding.quantity);
    if (sellQty > currentQty) {
      throw new Error('Cannot sell more than owned quantity');
    }

    const avgCost = Number(holding.avg_buy_price);
    const realizedPl = (sellPrice - avgCost) * sellQty;
    const remainingQty = currentQty - sellQty;

    if (isDemo) {
      if (remainingQty <= 0) {
        setDemoHoldings(prev => prev.filter(h => h.id !== holdingId));
      } else {
        setDemoHoldings(prev => prev.map(h =>
          h.id === holdingId
            ? { ...h, quantity: remainingQty, updated_at: new Date().toISOString() }
            : h
        ));
      }

      const newTx: Transaction = {
        id: `tx-demo-${Date.now()}`,
        user_id: '00000000-0000-0000-0000-000000000000',
        portfolio_id: holding.portfolio_id,
        holding_id: remainingQty <= 0 ? null : holdingId,
        action: 'sell',
        asset_type: holding.asset_type,
        ticker: holding.ticker,
        name: holding.name,
        quantity: sellQty,
        price: sellPrice,
        total: sellQty * sellPrice,
        currency: holding.currency,
        realized_pl: realizedPl,
        avg_cost_at_sell: avgCost,
        note: note || null,
        created_at: new Date().toISOString(),
      };
      setDemoTransactions(prev => [newTx, ...prev]);
      return;
    }

    if (!user) {
      sellGuestHolding(holdingId, sellQty, sellPrice, note);
      await refreshData();
      return;
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      portfolio_id: holding.portfolio_id,
      holding_id: remainingQty <= 0 ? null : holdingId,
      action: 'sell',
      asset_type: holding.asset_type,
      ticker: holding.ticker,
      name: holding.name,
      quantity: sellQty,
      price: sellPrice,
      total: sellQty * sellPrice,
      currency: holding.currency,
      realized_pl: realizedPl,
      avg_cost_at_sell: avgCost,
      note: note || null,
    });

    if (remainingQty <= 0) {
      const { error: delErr } = await supabase
        .from('holdings')
        .delete()
        .eq('id', holdingId);
      if (delErr) throw delErr;
    } else {
      const { error: updateErr } = await supabase
        .from('holdings')
        .update({
          quantity: remainingQty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', holdingId);
      if (updateErr) throw updateErr;
    }

    await refreshData();
  };

  const seedSamplePortfolio = async () => {
    if (user || isDemo) return;
    const pId = activePortfolio?.id || DEFAULT_GUEST_PORTFOLIO_ID;
    seedGuestSampleData(pId);
    await refreshData();
  };

  const guestAssetCount = !user && !isDemo ? allRawHoldings.length : 0;

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
        allHoldings: allEnrichedHoldings,
        transactions,
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
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
