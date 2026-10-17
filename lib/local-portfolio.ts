import { Portfolio, Holding, Transaction, AssetType, Currency } from '@/types';
import { supabase } from './supabase';

const KEYS = {
  PORTFOLIOS: 'portofin_guest_portfolios',
  HOLDINGS: 'portofin_guest_holdings',
  TRANSACTIONS: 'portofin_guest_transactions',
  ACTIVE_PORTFOLIO_ID: 'portofin_guest_active_id',
  SYNC_LOCK: 'portofin_guest_sync_in_progress',
} as const;

export const DEFAULT_GUEST_PORTFOLIO_ID = 'guest-default';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getGuestPortfolios(): Portfolio[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.PORTFOLIOS);
    if (raw) {
      const parsed = JSON.parse(raw) as Portfolio[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default below
  }

  const defaultPortfolio: Portfolio = {
    id: DEFAULT_GUEST_PORTFOLIO_ID,
    user_id: 'guest',
    name: 'Portofolio Utama',
    icon: 'briefcase',
    color: '#0F172A',
    is_default: true,
    created_at: new Date().toISOString(),
  };

  saveGuestPortfolios([defaultPortfolio]);
  return [defaultPortfolio];
}

export function saveGuestPortfolios(portfolios: Portfolio[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS.PORTFOLIOS, JSON.stringify(portfolios));
  } catch (err) {
    console.error('Failed to save guest portfolios:', err);
  }
}

export function getGuestActivePortfolioId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEYS.ACTIVE_PORTFOLIO_ID);
  } catch {
    return null;
  }
}

export function setGuestActivePortfolioId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS.ACTIVE_PORTFOLIO_ID, id);
  } catch {
    // Ignore storage quota errors
  }
}

export function getGuestHoldings(): Holding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.HOLDINGS);
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
    localStorage.setItem(KEYS.HOLDINGS, JSON.stringify(holdings));
  } catch (err) {
    console.error('Failed to save guest holdings:', err);
  }
}

export function getGuestTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.TRANSACTIONS);
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
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save guest transactions:', err);
  }
}

export function hasGuestDataToSync(): boolean {
  if (typeof window === 'undefined') return false;
  const holdings = getGuestHoldings();
  const transactions = getGuestTransactions();
  const portfolios = getGuestPortfolios();
  return holdings.length > 0 || transactions.length > 0 || portfolios.length > 1;
}

export function clearGuestStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEYS.PORTFOLIOS);
    localStorage.removeItem(KEYS.HOLDINGS);
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.ACTIVE_PORTFOLIO_ID);
    localStorage.removeItem(KEYS.SYNC_LOCK);
  } catch {
    // Ignore
  }
}

export function createGuestPortfolio(name: string, icon = 'briefcase', color = '#0F172A'): Portfolio {
  const portfolios = getGuestPortfolios();
  const newPortfolio: Portfolio = {
    id: createId('guest-pf'),
    user_id: 'guest',
    name,
    icon,
    color,
    is_default: portfolios.length === 0,
    created_at: new Date().toISOString(),
  };
  const updated = [...portfolios, newPortfolio];
  saveGuestPortfolios(updated);
  return newPortfolio;
}

export function updateGuestPortfolio(
  id: string,
  data: Partial<Pick<Portfolio, 'name' | 'icon' | 'color'>>
): Portfolio[] {
  const portfolios = getGuestPortfolios();
  const updated = portfolios.map(p => (p.id === id ? { ...p, ...data } : p));
  saveGuestPortfolios(updated);
  return updated;
}

export function deleteGuestPortfolio(id: string): Portfolio[] {
  const portfolios = getGuestPortfolios();
  const target = portfolios.find(p => p.id === id);
  if (!target || target.is_default) return portfolios;

  const remaining = portfolios.filter(p => p.id !== id);
  saveGuestPortfolios(remaining);

  const holdings = getGuestHoldings().filter(h => h.portfolio_id !== id);
  saveGuestHoldings(holdings);

  const transactions = getGuestTransactions().filter(t => t.portfolio_id !== id);
  saveGuestTransactions(transactions);

  return remaining;
}

export function addGuestHolding(data: {
  portfolio_id: string;
  asset_type: AssetType;
  ticker: string;
  name: string;
  quantity: number;
  avg_buy_price: number;
  currency: Currency;
  coingecko_id?: string | null;
}): void {
  const holdings = getGuestHoldings();
  const transactions = getGuestTransactions();
  const normalizedTicker = data.ticker.toUpperCase();
  const now = new Date().toISOString();

  const existingIndex = holdings.findIndex(
    h =>
      h.portfolio_id === data.portfolio_id &&
      h.ticker.toUpperCase() === normalizedTicker &&
      h.asset_type === data.asset_type
  );

  let holdingId: string;

  if (existingIndex >= 0) {
    const existing = holdings[existingIndex];
    const totalQty = Number(existing.quantity) + data.quantity;
    const totalCost =
      Number(existing.quantity) * Number(existing.avg_buy_price) +
      data.quantity * data.avg_buy_price;
    const newAvgPrice = totalQty > 0 ? totalCost / totalQty : data.avg_buy_price;
    holdingId = existing.id;

    holdings[existingIndex] = {
      ...existing,
      quantity: totalQty,
      avg_buy_price: newAvgPrice,
      updated_at: now,
    };
  } else {
    holdingId = createId('guest-hold');
    const newHolding: Holding = {
      id: holdingId,
      user_id: 'guest',
      portfolio_id: data.portfolio_id,
      asset_type: data.asset_type,
      ticker: normalizedTicker,
      name: data.name,
      quantity: data.quantity,
      avg_buy_price: data.avg_buy_price,
      currency: data.currency,
      coingecko_id: data.coingecko_id || null,
      created_at: now,
      updated_at: now,
    };
    holdings.unshift(newHolding);
  }

  const newTx: Transaction = {
    id: createId('guest-tx'),
    user_id: 'guest',
    portfolio_id: data.portfolio_id,
    holding_id: holdingId,
    action: 'buy',
    asset_type: data.asset_type,
    ticker: normalizedTicker,
    name: data.name,
    quantity: data.quantity,
    price: data.avg_buy_price,
    total: data.quantity * data.avg_buy_price,
    currency: data.currency,
    realized_pl: null,
    avg_cost_at_sell: null,
    note: null,
    created_at: now,
  };

  saveGuestHoldings(holdings);
  saveGuestTransactions([newTx, ...transactions]);
}

export function editGuestHolding(
  id: string,
  data: { quantity: number; avg_buy_price: number }
): void {
  const holdings = getGuestHoldings();
  const now = new Date().toISOString();
  const updated = holdings.map(h =>
    h.id === id
      ? {
          ...h,
          quantity: data.quantity,
          avg_buy_price: data.avg_buy_price,
          updated_at: now,
        }
      : h
  );
  saveGuestHoldings(updated);
}

export function deleteGuestHolding(id: string): void {
  const holdings = getGuestHoldings().filter(h => h.id !== id);
  saveGuestHoldings(holdings);
}

export function sellGuestHolding(
  holdingId: string,
  sellQty: number,
  sellPrice: number,
  note?: string
): void {
  const holdings = getGuestHoldings();
  const transactions = getGuestTransactions();
  const holding = holdings.find(h => h.id === holdingId);
  if (!holding) throw new Error('Holding not found');

  const currentQty = Number(holding.quantity);
  if (sellQty > currentQty) {
    throw new Error('Cannot sell more than owned quantity');
  }

  const avgCost = Number(holding.avg_buy_price);
  const realizedPl = (sellPrice - avgCost) * sellQty;
  const remainingQty = currentQty - sellQty;
  const now = new Date().toISOString();

  const newTx: Transaction = {
    id: createId('guest-tx'),
    user_id: 'guest',
    portfolio_id: holding.portfolio_id || DEFAULT_GUEST_PORTFOLIO_ID,
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
    created_at: now,
  };

  let updatedHoldings: Holding[];
  if (remainingQty <= 0) {
    updatedHoldings = holdings.filter(h => h.id !== holdingId);
  } else {
    updatedHoldings = holdings.map(h =>
      h.id === holdingId ? { ...h, quantity: remainingQty, updated_at: now } : h
    );
  }

  saveGuestHoldings(updatedHoldings);
  saveGuestTransactions([newTx, ...transactions]);
}

export function seedGuestSampleData(portfolioId: string): void {
  const now = Date.now();
  const sampleHoldings: Holding[] = [
    {
      id: createId('guest-hold'),
      user_id: 'guest',
      portfolio_id: portfolioId,
      asset_type: 'stock',
      ticker: 'BBCA',
      name: 'Bank Central Asia Tbk',
      quantity: 2500,
      avg_buy_price: 9150,
      currency: 'IDR',
      coingecko_id: null,
      created_at: new Date(now - 30 * 86400000).toISOString(),
      updated_at: new Date(now - 5 * 86400000).toISOString(),
    },
    {
      id: createId('guest-hold'),
      user_id: 'guest',
      portfolio_id: portfolioId,
      asset_type: 'stock',
      ticker: 'BMRI',
      name: 'Bank Mandiri (Persero) Tbk',
      quantity: 3000,
      avg_buy_price: 6250,
      currency: 'IDR',
      coingecko_id: null,
      created_at: new Date(now - 24 * 86400000).toISOString(),
      updated_at: new Date(now - 4 * 86400000).toISOString(),
    },
    {
      id: createId('guest-hold'),
      user_id: 'guest',
      portfolio_id: portfolioId,
      asset_type: 'stock',
      ticker: 'TLKM',
      name: 'Telkom Indonesia (Persero) Tbk',
      quantity: 4000,
      avg_buy_price: 2980,
      currency: 'IDR',
      coingecko_id: null,
      created_at: new Date(now - 18 * 86400000).toISOString(),
      updated_at: new Date(now - 3 * 86400000).toISOString(),
    },
    {
      id: createId('guest-hold'),
      user_id: 'guest',
      portfolio_id: portfolioId,
      asset_type: 'crypto',
      ticker: 'BTC',
      name: 'Bitcoin',
      quantity: 0.045,
      avg_buy_price: 985000000,
      currency: 'IDR',
      coingecko_id: 'bitcoin',
      created_at: new Date(now - 45 * 86400000).toISOString(),
      updated_at: new Date(now - 7 * 86400000).toISOString(),
    },
    {
      id: createId('guest-hold'),
      user_id: 'guest',
      portfolio_id: portfolioId,
      asset_type: 'crypto',
      ticker: 'SOL',
      name: 'Solana',
      quantity: 8.5,
      avg_buy_price: 2450000,
      currency: 'IDR',
      coingecko_id: 'solana',
      created_at: new Date(now - 15 * 86400000).toISOString(),
      updated_at: new Date(now - 2 * 86400000).toISOString(),
    },
  ];

  const sampleTransactions: Transaction[] = sampleHoldings.map((h, idx) => ({
    id: createId('guest-tx'),
    user_id: 'guest',
    portfolio_id: portfolioId,
    holding_id: h.id,
    action: 'buy',
    asset_type: h.asset_type,
    ticker: h.ticker,
    name: h.name,
    quantity: h.quantity,
    price: h.avg_buy_price,
    total: h.quantity * h.avg_buy_price,
    currency: h.currency,
    realized_pl: null,
    avg_cost_at_sell: null,
    note: idx === 0 ? 'Akumulasi bertahap blue-chip' : null,
    created_at: h.created_at,
  }));

  const existingHoldings = getGuestHoldings().filter(h => h.portfolio_id !== portfolioId);
  const existingTransactions = getGuestTransactions().filter(t => t.portfolio_id !== portfolioId);

  saveGuestHoldings([...sampleHoldings, ...existingHoldings]);
  saveGuestTransactions([...sampleTransactions, ...existingTransactions]);
}

/**
 * Idempotent migration of local guest sandbox portfolios, holdings, and transactions
 * to the authenticated user's Supabase account.
 */
export async function syncGuestDataToSupabase(
  userId: string
): Promise<{ migratedHoldings: number; migratedTransactions: number }> {
  if (typeof window === 'undefined') {
    return { migratedHoldings: 0, migratedTransactions: 0 };
  }

  if (!hasGuestDataToSync()) {
    return { migratedHoldings: 0, migratedTransactions: 0 };
  }

  if (localStorage.getItem(KEYS.SYNC_LOCK) === 'true') {
    return { migratedHoldings: 0, migratedTransactions: 0 };
  }

  localStorage.setItem(KEYS.SYNC_LOCK, 'true');

  try {
    const guestPortfolios = getGuestPortfolios();
    const guestHoldings = getGuestHoldings();
    const guestTransactions = getGuestTransactions();

    // Fetch existing user portfolios in Supabase
    const { data: existingPortfolios, error: pfError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (pfError) throw pfError;

    const portfolioIdMap = new Map<string, string>();
    let defaultCloudPortfolio = (existingPortfolios || []).find(p => p.is_default) || (existingPortfolios || [])[0];

    for (const gpf of guestPortfolios) {
      if (gpf.is_default && defaultCloudPortfolio) {
        portfolioIdMap.set(gpf.id, defaultCloudPortfolio.id);
      } else {
        const { data: createdPf, error: createPfErr } = await supabase
          .from('portfolios')
          .insert({
            user_id: userId,
            name: gpf.name,
            icon: gpf.icon || 'briefcase',
            color: gpf.color || '#0F172A',
            is_default: !defaultCloudPortfolio && gpf.is_default,
          })
          .select()
          .single();

        if (createPfErr) throw createPfErr;
        if (createdPf) {
          portfolioIdMap.set(gpf.id, createdPf.id);
          if (!defaultCloudPortfolio) {
            defaultCloudPortfolio = createdPf;
          }
        }
      }
    }

    const fallbackPortfolioId = defaultCloudPortfolio?.id;
    if (!fallbackPortfolioId) {
      throw new Error('Could not resolve target cloud portfolio for migration');
    }

    // Fetch existing holdings in cloud to merge duplicates cleanly
    const { data: existingCloudHoldings } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId);

    const holdingIdMap = new Map<string, string>();
    let migratedHoldingsCount = 0;

    for (const gh of guestHoldings) {
      const targetPfId = portfolioIdMap.get(gh.portfolio_id) || fallbackPortfolioId;
      const match = (existingCloudHoldings || []).find(
        ch =>
          ch.portfolio_id === targetPfId &&
          ch.ticker.toUpperCase() === gh.ticker.toUpperCase() &&
          ch.asset_type === gh.asset_type
      );

      if (match) {
        const totalQty = Number(match.quantity) + Number(gh.quantity);
        const totalCost =
          Number(match.quantity) * Number(match.avg_buy_price) +
          Number(gh.quantity) * Number(gh.avg_buy_price);
        const newAvg = totalQty > 0 ? totalCost / totalQty : Number(gh.avg_buy_price);

        const { error: updErr } = await supabase
          .from('holdings')
          .update({
            quantity: totalQty,
            avg_buy_price: newAvg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.id);

        if (!updErr) {
          holdingIdMap.set(gh.id, match.id);
          migratedHoldingsCount += 1;
        }
      } else {
        const { data: insertedHolding, error: insErr } = await supabase
          .from('holdings')
          .insert({
            user_id: userId,
            portfolio_id: targetPfId,
            asset_type: gh.asset_type,
            ticker: gh.ticker.toUpperCase(),
            name: gh.name,
            quantity: gh.quantity,
            avg_buy_price: gh.avg_buy_price,
            currency: gh.currency,
            coingecko_id: gh.coingecko_id || null,
          })
          .select()
          .single();

        if (!insErr && insertedHolding) {
          holdingIdMap.set(gh.id, insertedHolding.id);
          migratedHoldingsCount += 1;
        }
      }
    }

    let migratedTxCount = 0;
    if (guestTransactions.length > 0) {
      const txPayloads = guestTransactions.map(gt => ({
        user_id: userId,
        portfolio_id: portfolioIdMap.get(gt.portfolio_id) || fallbackPortfolioId,
        holding_id: gt.holding_id ? holdingIdMap.get(gt.holding_id) || null : null,
        action: gt.action,
        asset_type: gt.asset_type,
        ticker: gt.ticker.toUpperCase(),
        name: gt.name,
        quantity: gt.quantity,
        price: gt.price,
        total: gt.total,
        currency: gt.currency,
        realized_pl: gt.realized_pl,
        avg_cost_at_sell: gt.avg_cost_at_sell,
        note: gt.note,
        created_at: gt.created_at,
      }));

      const { error: txErr } = await supabase.from('transactions').insert(txPayloads);
      if (!txErr) {
        migratedTxCount = txPayloads.length;
      }
    }

    // Clear guest storage after successful cloud sync
    clearGuestStorage();
    return {
      migratedHoldings: migratedHoldingsCount,
      migratedTransactions: migratedTxCount,
    };
  } catch (err) {
    localStorage.removeItem(KEYS.SYNC_LOCK);
    console.error('Guest data cloud sync failed:', err);
    throw err;
  }
}
