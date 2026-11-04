4// lib/supabase/env.ts

export type DbTarget = 'sandbox' | 'production'

export interface ActiveSupabaseConfig {
  target: DbTarget
  isProduction: boolean
  isSandbox: boolean
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey?: string
}

/**
 * Resuelve la configuración activa de Supabase.
 *
 * REGLA DE ORO DE SEGURIDAD:
 * - Solo si NEXT_PUBLIC_DB_TARGET === 'sandbox' se conectará al Sandbox de Supabase Cloud.
 * - Si NEXT_PUBLIC_DB_TARGET no existe (como en Dokploy/VPS al hacer PR/build de Docker)
 *   o vale 'production', SIEMPRE usará las variables estándar originales de Producción.
 *
 * NOTA DE NEXT.JS:
 * Las variables que se leen en el navegador (client components) requieren el prefijo
 * NEXT_PUBLIC_ para que Webpack/Turbopack las incruste en el bundle del cliente.
 */
export function getActiveSupabaseConfig(): ActiveSupabaseConfig {
  const isSandbox = process.env.NEXT_PUBLIC_DB_TARGET === 'sandbox'
  const target: DbTarget = isSandbox ? 'sandbox' : 'production'

  let url: string | undefined
  let key: string | undefined
  let serviceRoleKey: string | undefined

  if (isSandbox) {
    url =
      process.env.NEXT_PUBLIC_SANDBOX_SUPABASE_URL ||
      process.env.SANDBOX_SUPABASE_URL
    key =
      process.env.NEXT_PUBLIC_SANDBOX_SUPABASE_ANON_KEY ||
      process.env.SANDBOX_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    serviceRoleKey =
      process.env.SANDBOX_SUPABASE_SERVICE_ROLE_KEY || undefined
  } else {
    // Modo producción (default absoluto en Dokploy, VPS y PRs)
    // Mantiene exactamente los nombres originales e intactos
    url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  }

  if (!url || !key) {
    console.error(`[Supabase Config Error] Falta URL o Key para el entorno '${target}'.`, {
      target,
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
    })
    throw new Error(
      `Missing Supabase credentials for target '${target}'. Check your environment variables.`
    )
  }

  return {
    target,
    isProduction: target === 'production',
    isSandbox: target === 'sandbox',
    supabaseUrl: url,
    supabaseAnonKey: key,
    supabaseServiceRoleKey: serviceRoleKey,
  }
}
