// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database.types'
import { SUPABASE_OPTIONS, SUPABASE_SCHEMA } from './constants'
import { getActiveSupabaseConfig } from './env'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getActiveSupabaseConfig()

  return createBrowserClient<Database, typeof SUPABASE_SCHEMA>(
    supabaseUrl,
    supabaseAnonKey,
    SUPABASE_OPTIONS
  )
}
