import { Holding, Transaction, Portfolio, AddAssetFormData } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export const GUEST_STORAGE_KEYS = {
  PORTFOLIOS: 'portofin_guest_portfolios',
  ACTIVE_PORTFOLIO: 'portofin_guest_active_portfolio',
  HOLDINGS: 'portofin_guest_holdings',
  TRANSACTIONS: 'portofin_guest_transactions',
  MIGRATED_AT: 'portofin_guest_migrated_at',
} as const;

export const GUEST_USER_ID = 'guest-local';
export const DEFAULT_GUEST_PORTFOLIO_ID = 'guest-portfolio-main';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultGuestPortfolio(): Portfolio {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_GUEST_PORTFOLIO_ID,
    user_id: GUEST_USER_ID,
    name: 'Portofolio Utama',
    description: null,
    is_default: true,
    created_at: now,
    updated_at: now,
  };
}

export function getGuestPortfolios(): Portfolio[] {
  if (typeof window === 'undefined') return [createDefaultGuestPortfolio()];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEYS.PORTFOLIOS);
    if (!raw) {
      const def = [createDefaultGuestPortfolio()];
      localStorage.setItem(GUEST_STORAGE_KEYS.PORTFOLIOS, JSON.stringify(def));
      return def;
    }
    const parsed = JSON.parse(raw) as Portfolio[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const def = [createDefaultGuestPortfolio()];
      localStorage.setItem(GUEST_STORAGE_KEYS.PORTFOLIOS, JSON.stringify(def));
      return def;
    }
    return parsed;
  } catch {
    return [createDefaultGuestPortfolio()];
  }
}

export function saveGuestPortfolios(portfolios: Portfolio[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEYS.PORTFOLIOS, JSON.stringify(portfolios));
  } catch (err) {
    console.error('Failed to save guest portfolios:', err);
  }
}

export function getGuestActivePortfolioId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(GUEST_STORAGE_KEYS.ACTIVE_PORTFOLIO);
    if (!saved || saved === 'all') return null;
    const portfolios = getGuestPortfolios();
    if (portfolios.some((p) => p.id === saved)) {
      return saved;
    }
    return null;
  } catch {
    return null;
  }
}

export function setGuestActivePortfolioId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(GUEST_STORAGE_KEYS.ACTIVE_PORTFOLIO, id);
    } else {
      localStorage.setItem(GUEST_STORAGE_KEYS.ACTIVE_PORTFOLIO, 'all');
    }
  } catch {
    // Ignore storage error
  }
}

export function getGuestHoldings(): Holding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEYS.HOLDINGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Holding[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestHoldings(holdings: Holding[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEYS.HOLDINGS, JSON.stringify(holdings));
    clearGuestMigratedFlag();
  } catch (err) {
    console.error('Failed to save guest holdings:', err);
  }
}

export function getGuestTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Transaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save guest transactions:', err);
  }
}

function clearGuestMigratedFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_STORAGE_KEYS.MIGRATED_AT);
  } catch {
    // Ignore
  }
}

export function createGuestPortfolio(name: string, description?: string): Portfolio {
  const portfolios = getGuestPortfolios();
  const now = new Date().toISOString();
  const newPortfolio: Portfolio = {
    id: generateId('guest-pf'),
    user_id: GUEST_USER_ID,
    name: name.trim(),
    description: description || null,
    is_default: false,
    created_at: now,
    updated_at: now,
  };
  const updated = [...portfolios, newPortfolio];
  saveGuestPortfolios(updated);
  return newPortfolio;
}

export function updateGuestPortfolio(
  id: string,
  updates: { name?: string; description?: string }
): void {
  const portfolios = getGuestPortfolios();
  const now = new Date().toISOString();
  const updated = portfolios.map((p) =>
    p.id === id ? { ...p, ...updates, updated_at: now } : p
  );
  saveGuestPortfolios(updated);
}

export function deleteGuestPortfolio(id: string): void {
  const portfolios = getGuestPortfolios();
  const target = portfolios.find((p) => p.id === id);
  if (!target || target.is_default || portfolios.length <= 1) return;

  const updatedPortfolios = portfolios.filter((p) => p.id !== id);
  saveGuestPortfolios(updatedPortfolios);

  const holdings = getGuestHoldings().filter((h) => h.portfolio_id !== id);
  saveGuestHoldings(holdings);

  const txs = getGuestTransactions().filter((t) => t.portfolio_id !== id);
  saveGuestTransactions(txs);

  const activeId = getGuestActivePortfolioId();
  if (activeId === id) {
    setGuestActivePortfolioId(null);
  }
}

export function addGuestHolding(
  portfolioId: string,
  data: AddAssetFormData
): void {
  const holdings = getGuestHoldings();
  const transactions = getGuestTransactions();
  const now = new Date().toISOString();
  const txDate = data.date || now.split('T')[0];

  const existing = holdings.find(
    (h) =>
      h.portfolio_id === portfolioId &&
      h.ticker.toUpperCase() === data.ticker.toUpperCase() &&
      h.type === data.type &&
      h.buy_price_currency === data.buy_price_currency
  );

  let holdingId: string;

  if (existing) {
    const oldTotal = existing.quantity * existing.avg_buy_price;
    const newTotal = data.quantity * data.buy_price;
    const combinedQty = existing.quantity + data.quantity;
    const newAvgPrice = combinedQty > 0 ? (oldTotal + newTotal) / combinedQty : data.buy_price;

    holdingId = existing.id;
    const updatedHoldings = holdings.map((h) =>
      h.id === existing.id
        ? {
            ...h,
            quantity: combinedQty,
            avg_buy_price: newAvgPrice,
            updated_at: now,
          }
        : h
    );
    saveGuestHoldings(updatedHoldings);
  } else {
    holdingId = generateId('guest-hold');
    const newHolding: Holding = {
      id: holdingId,
      user_id: GUEST_USER_ID,
      portfolio_id: portfolioId,
      ticker: data.ticker.toUpperCase(),
      name: data.name,
      type: data.type,
      quantity: data.quantity,
      avg_buy_price: data.buy_price,
      buy_price_currency: data.buy_price_currency,
      coingecko_id: data.coingecko_id,
      created_at: now,
      updated_at: now,
    };
    saveGuestHoldings([newHolding, ...holdings]);
  }

  const newTx: Transaction = {
    id: generateId('guest-tx'),
    user_id: GUEST_USER_ID,
    portfolio_id: portfolioId,
    holding_id: holdingId,
    action: 'buy',
    type: data.type,
    ticker: data.ticker.toUpperCase(),
    name: data.name,
    quantity: data.quantity,
    price: data.buy_price,
    price_currency: data.buy_price_currency,
    total: data.quantity * data.buy_price,
    note: data.note || null,
    date: txDate,
    created_at: now,
  };
  saveGuestTransactions([newTx, ...transactions]);
}

export function editGuestHolding(
  id: string,
  updates: { quantity?: number; avg_buy_price?: number }
): void {
  const holdings = getGuestHoldings();
  const now = new Date().toISOString();
  const updated = holdings.map((h) =>
    h.id === id
      ? {
          ...h,
          ...(updates.quantity !== undefined ? { quantity: updates.quantity } : {}),
          ...(updates.avg_buy_price !== undefined ? { avg_buy_price: updates.avg_buy_price } : {}),
          updated_at: now,
        }
      : h
  );
  saveGuestHoldings(updated);
}

export function deleteGuestHolding(id: string): void {
  const holdings = getGuestHoldings();
  saveGuestHoldings(holdings.filter((h) => h.id !== id));
}

export function sellGuestHolding(
  holdingId: string,
  sellQty: number,
  sellPrice: number,
  note?: string
): void {
  const holdings = getGuestHoldings();
  const transactions = getGuestTransactions();
  const holding = holdings.find((h) => h.id === holdingId);
  if (!holding) throw new Error('Holding not found');
  if (sellQty <= 0 || sellQty > holding.quantity) {
    throw new Error('Invalid sell quantity');
  }

  const now = new Date().toISOString();
  const remainingQty = holding.quantity - sellQty;

  if (remainingQty <= 0.000001) {
    saveGuestHoldings(holdings.filter((h) => h.id !== holdingId));
  } else {
    saveGuestHoldings(
      holdings.map((h) =>
        h.id === holdingId
          ? { ...h, quantity: remainingQty, updated_at: now }
          : h
      )
    );
  }

  const sellTx: Transaction = {
    id: generateId('guest-tx'),
    user_id: GUEST_USER_ID,
    portfolio_id: holding.portfolio_id,
    holding_id: holdingId,
    action: 'sell',
    type: holding.type,
    ticker: holding.ticker,
    name: holding.name,
    quantity: sellQty,
    price: sellPrice,
    price_currency: holding.buy_price_currency,
    total: sellQty * sellPrice,
    note: note || null,
    date: now.split('T')[0],
    created_at: now,
  };
  saveGuestTransactions([sellTx, ...transactions]);
}

export function seedGuestSampleData(portfolioId?: string): void {
  const targetPortfolioId =
    portfolioId || getGuestActivePortfolioId() || DEFAULT_GUEST_PORTFOLIO_ID;
  const portfolios = getGuestPortfolios();
  if (!portfolios.some((p) => p.id === targetPortfolioId)) {
    saveGuestPortfolios([createDefaultGuestPortfolio(), ...portfolios]);
  }

  const now = Date.now();
  const sampleHoldings: Holding[] = [
    {
      id: generateId('guest-hold'),
      user_id: GUEST_USER_ID,
      portfolio_id: targetPortfolioId,
      type: 'stock',
      ticker: 'BBCA',
      name: 'Bank Central Asia Tbk',
      quantity: 2500,
      avg_buy_price: 9200,
      buy_price_currency: 'IDR',
      created_at: new Date(now - 30 * 86400000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    {
      id: generateId('guest-hold'),
      user_id: GUEST_USER_ID,
      portfolio_id: targetPortfolioId,
      type: 'stock',
      ticker: 'BBRI',
      name: 'Bank Rakyat Indonesia Tbk',
      quantity: 5000,
      avg_buy_price: 4550,
      buy_price_currency: 'IDR',
      created_at: new Date(now - 24 * 86400000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    {
      id: generateId('guest-hold'),
      user_id: GUEST_USER_ID,
      portfolio_id: targetPortfolioId,
      type: 'stock',
      ticker: 'BMRI',
      name: 'Bank Mandiri Tbk',
      quantity: 2000,
      avg_buy_price: 6350,
      buy_price_currency: 'IDR',
      created_at: new Date(now - 18 * 86400000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    {
      id: generateId('guest-hold'),
      user_id: GUEST_USER_ID,
      portfolio_id: targetPortfolioId,
      type: 'crypto',
      ticker: 'BTC',
      name: 'Bitcoin',
      quantity: 0.04,
      avg_buy_price: 960000000,
      buy_price_currency: 'IDR',
      coingecko_id: 'bitcoin',
      created_at: new Date(now - 40 * 86400000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    {
      id: generateId('guest-hold'),
      user_id: GUEST_USER_ID,
      portfolio_id: targetPortfolioId,
      type: 'crypto',
      ticker: 'ETH',
      name: 'Ethereum',
      quantity: 0.65,
      avg_buy_price: 42000000,
      buy_price_currency: 'IDR',
      coingecko_id: 'ethereum',
      created_at: new Date(now - 28 * 86400000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
  ];

  const sampleTxs: Transaction[] = sampleHoldings.map((h) => ({
    id: generateId('guest-tx'),
    user_id: GUEST_USER_ID,
    portfolio_id: h.portfolio_id,
    holding_id: h.id,
    action: 'buy' as const,
    type: h.type,
    ticker: h.ticker,
    name: h.name,
    quantity: h.quantity,
    price: h.avg_buy_price,
    price_currency: h.buy_price_currency,
    total: h.quantity * h.avg_buy_price,
    note: 'Sample position',
    date: h.created_at.split('T')[0],
    created_at: h.created_at,
  }));

  saveGuestHoldings(sampleHoldings);
  saveGuestTransactions(sampleTxs);
}

export function hasGuestDataToSync(): boolean {
  if (typeof window === 'undefined') return false;
  const holdings = getGuestHoldings();
  const txs = getGuestTransactions();
  return holdings.length > 0 || txs.length > 0;
}

export function clearAllGuestData(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_STORAGE_KEYS.PORTFOLIOS);
    localStorage.removeItem(GUEST_STORAGE_KEYS.ACTIVE_PORTFOLIO);
    localStorage.removeItem(GUEST_STORAGE_KEYS.HOLDINGS);
    localStorage.removeItem(GUEST_STORAGE_KEYS.TRANSACTIONS);
    localStorage.setItem(GUEST_STORAGE_KEYS.MIGRATED_AT, new Date().toISOString());
  } catch {
    // Ignore
  }
}

/**
 * Idempotently migrates guest localStorage portfolios, holdings, and transactions
 * to the authenticated user's Supabase account, then clears local guest storage.
 */
export async function syncGuestDataToSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<{ syncedHoldings: number; syncedTransactions: number }> {
  if (!hasGuestDataToSync()) {
    return { syncedHoldings: 0, syncedTransactions: 0 };
  }

  const guestPortfolios = getGuestPortfolios();
  const guestHoldings = getGuestHoldings();
  const guestTransactions = getGuestTransactions();

  // 1. Fetch or create user's Supabase portfolios
  const { data: existingPortfolios } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const cloudPortfolios: Portfolio[] = existingPortfolios ? [...existingPortfolios] : [];
  const portfolioIdMap = new Map<string, string>();

  for (const gp of guestPortfolios) {
    const match =
      (gp.is_default && cloudPortfolios.find((cp) => cp.is_default)) ||
      cloudPortfolios.find((cp) => cp.name.toLowerCase() === gp.name.toLowerCase());

    if (match) {
      portfolioIdMap.set(gp.id, match.id);
    } else {
      const { data: created } = await supabase
        .from('portfolios')
        .insert({
          user_id: userId,
          name: gp.name,
          description: gp.description || null,
          is_default: cloudPortfolios.length === 0 ? true : gp.is_default,
        })
        .select()
        .single();

      if (created) {
        cloudPortfolios.push(created);
        portfolioIdMap.set(gp.id, created.id);
      }
    }
  }

  const fallbackCloudPortfolioId =
    cloudPortfolios.find((p) => p.is_default)?.id || cloudPortfolios[0]?.id || null;

  // 2. Fetch existing holdings to merge duplicates cleanly
  const { data: existingHoldings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  const cloudHoldings: Holding[] = existingHoldings ? [...existingHoldings] : [];
  const holdingIdMap = new Map<string, string>();
  let syncedHoldings = 0;

  for (const gh of guestHoldings) {
    const targetPortfolioId =
      (gh.portfolio_id ? portfolioIdMap.get(gh.portfolio_id) : null) || fallbackCloudPortfolioId;
    if (!targetPortfolioId) continue;

    const existingMatch = cloudHoldings.find(
      (ch) =>
        ch.portfolio_id === targetPortfolioId &&
        ch.ticker.toUpperCase() === gh.ticker.toUpperCase() &&
        ch.type === gh.type &&
        ch.buy_price_currency === gh.buy_price_currency
    );

    if (existingMatch) {
      const oldCost = existingMatch.quantity * existingMatch.avg_buy_price;
      const guestCost = gh.quantity * gh.avg_buy_price;
      const totalQty = existingMatch.quantity + gh.quantity;
      const newAvg = totalQty > 0 ? (oldCost + guestCost) / totalQty : gh.avg_buy_price;

      await supabase
        .from('holdings')
        .update({
          quantity: totalQty,
          avg_buy_price: newAvg,
        })
        .eq('id', existingMatch.id);

      holdingIdMap.set(gh.id, existingMatch.id);
      syncedHoldings++;
    } else {
      const { data: inserted } = await supabase
        .from('holdings')
        .insert({
          user_id: userId,
          portfolio_id: targetPortfolioId,
          ticker: gh.ticker,
          name: gh.name,
          type: gh.type,
          quantity: gh.quantity,
          avg_buy_price: gh.avg_buy_price,
          buy_price_currency: gh.buy_price_currency,
          coingecko_id: gh.coingecko_id || null,
        })
        .select()
        .single();

      if (inserted) {
        holdingIdMap.set(gh.id, inserted.id);
        cloudHoldings.push(inserted);
        syncedHoldings++;
      }
    }
  }

  // 3. Insert guest transactions into cloud
  let syncedTransactions = 0;
  if (guestTransactions.length > 0) {
    const txPayload = guestTransactions
      .map((gt) => {
        const targetPortfolioId =
          (gt.portfolio_id ? portfolioIdMap.get(gt.portfolio_id) : null) || fallbackCloudPortfolioId;
        if (!targetPortfolioId) return null;
        return {
          user_id: userId,
          portfolio_id: targetPortfolioId,
          holding_id: gt.holding_id ? holdingIdMap.get(gt.holding_id) || null : null,
          action: gt.action,
          type: gt.type,
          ticker: gt.ticker,
          name: gt.name,
          quantity: gt.quantity,
          price: gt.price,
          price_currency: gt.price_currency,
          total: gt.total,
          note: gt.note,
          date: gt.date,
          created_at: gt.created_at,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (txPayload.length > 0) {
      const { error: txErr } = await supabase.from('transactions').insert(txPayload);
      if (!txErr) {
        syncedTransactions = txPayload.length;
      }
    }
  }

  // 4. Clear guest storage once migrated
  clearAllGuestData();

  return { syncedHoldings, syncedTransactions };
}
