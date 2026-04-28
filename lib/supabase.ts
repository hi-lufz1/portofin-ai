import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create a real client if credentials are provided
export const supabase: SupabaseClient = supabaseUrl && !supabaseUrl.includes('xxxxxxxxxxxx')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

export const isSupabaseConfigured = Boolean(supabaseUrl && !supabaseUrl.includes('xxxxxxxxxxxx') && supabaseAnonKey && !supabaseAnonKey.includes('...'));
