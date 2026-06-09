// lib/supabase/constants.ts
export const SUPABASE_SCHEMA = 'inv-tienda' as const

export const SUPABASE_OPTIONS = {
  db: {
    schema: SUPABASE_SCHEMA
  }
} as const
