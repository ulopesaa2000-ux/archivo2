// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database.types'
import { SUPABASE_OPTIONS, SUPABASE_SCHEMA } from './constants'

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error('[Supabase Client Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.')
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.')
  }
  if (!supabaseAnonKey) {
    console.error('[Supabase Client Error] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.')
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.')
  }

  return createBrowserClient<Database, typeof SUPABASE_SCHEMA>(
    supabaseUrl,
    supabaseAnonKey,
    SUPABASE_OPTIONS
  )
}
