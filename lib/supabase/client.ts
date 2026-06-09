// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database.types'
import { SUPABASE_OPTIONS, SUPABASE_SCHEMA } from './constants'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.')
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.')
  }

  return createBrowserClient<Database, typeof SUPABASE_SCHEMA>(
    supabaseUrl,
    supabaseAnonKey,
    SUPABASE_OPTIONS
  )
}
