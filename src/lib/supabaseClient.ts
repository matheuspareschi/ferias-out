import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Fica `null` quando as variáveis de ambiente não foram configuradas — nesse
 * caso o app funciona só com localStorage, sem sincronizar entre aparelhos.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const SYNC_ENABLED = supabase !== null
