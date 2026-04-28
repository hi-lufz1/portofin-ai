// ============================================
// Portfolio Tracker - TypeScript Types
// ============================================

export type AssetType = 'crypto' | 'stock';
export type TransactionAction = 'buy' | 'sell';
export type Currency = 'IDR' | 'USD';

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  ticker: string;        // Display symbol: ETH, BTC, BBCA
  name: string;
  type: AssetType;
  quantity: number;
  avg_buy_price: number;
  buy_price_currency: Currency;
  coingecko_id?: string; // CoinGecko ID for crypto price fetching
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  holding_id: string | null;
  portfolio_id: string | null;
  ticker: string;
  name: string;
  type: AssetType;
  action: TransactionAction;
  quantity: number;
  price: number;
  price_currency: Currency; // 'IDR' or 'USD'
  total: number;
  note: string | null;
  date: string;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  currency: Currency;
  created_at: string;
  updated_at: string;
}

// Enriched holding with live price data
export interface EnrichedHolding extends Holding {
  current_price: number;       // Current price in IDR
  current_value: number;       // quantity * current_price
  total_invested: number;      // quantity * avg_buy_price
  profit_loss: number;         // current_value - total_invested
  profit_loss_pct: number;     // (profit_loss / total_invested) * 100
  price_change_24h?: number;   // 24h price change percentage
}

// Price data from API
export interface PriceData {
  price_idr: number;
  price_usd: number;
  change_24h: number;         // percentage
  market_cap?: number;
  volume_24h?: number;
}

// Portfolio summary
export interface PortfolioSummary {
  total_value: number;
  total_invested: number;
  total_pl: number;
  total_pl_pct: number;
  daily_change: number;
  daily_change_pct: number;
  crypto_value: number;
  stock_value: number;
}

// Search result for adding new assets
export interface AssetSearchResult {
  ticker: string;        // Display ticker: ETH, BTC, BBCA
  name: string;
  type: AssetType;
  exchange?: string;
  price?: number;
  coingecko_id?: string; // CoinGecko ID for crypto price fetching
}

// Form data for adding/editing holdings
export interface AddAssetFormData {
  ticker: string;
  name: string;
  type: AssetType;
  quantity: number;
  buy_price: number;
  buy_price_currency: Currency;
  coingecko_id?: string;
  note?: string;
  date?: string;
}
