// modules/admin-table/config/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import type { TableFeatures, UserTableConfigRow, TableConfigDefaultRow } from './types'
import { getDefaultFeatures } from './defaults'

// ─────────────────────────────────────────────────────────────────────────────
// Obtener config de una tabla para el usuario actual (con fallback a defaults)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchUserTableConfig(
  route: string
): Promise<{ config: TableFeatures; source: 'db' | 'default' }> {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // 1. Si hay usuario, intentar cargar su config
  if (user) {
    const [userConfigRes, globalDefaultRes] = await Promise.all([
      (supabase as any)
        .from('user_table_configs')
        .select('features, is_default')
        .eq('user_id', user.id)
        .eq('route', route)
        .single(),
      (supabase as any)
        .from('table_config_defaults')
        .select('features')
        .eq('route', route)
        .single(),
    ])
    const userConfig = userConfigRes.data

    if (userConfig && !userConfig.is_default) {
      return { config: userConfig.features as TableFeatures, source: 'db' }
    }

    if (globalDefaultRes.data) {
      return { config: globalDefaultRes.data.features as TableFeatures, source: 'default' }
    }
  }

  // 2. Si no hay config de usuario, usar defaults globales
  const { data: globalDefault } = await (supabase as any)
    .from('table_config_defaults')
    .select('features')
    .eq('route', route)
    .single()

  if (globalDefault) {
    return { config: globalDefault.features as TableFeatures, source: 'default' }
  }

  // 3. Fallback local final
  return { config: getDefaultFeatures(route), source: 'default' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener TODAS las configs del usuario actual (con fallback)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchAllUserTableConfigs(): Promise<Map<string, TableFeatures>> {
  const user = await getCurrentUser()
  const result = new Map<string, TableFeatures>()

  if (!user) {
    // Si no hay usuario, cargar solo defaults globales
    const supabase = await createClient()
    const { data: defaults } = await (supabase as any)
      .from('table_config_defaults')
      .select('route, features')

    if (defaults) {
      for (const row of defaults as TableConfigDefaultRow[]) {
        result.set(row.route, row.features as TableFeatures)
      }
    }
    return result
  }

  const supabase = await createClient()

  // User configs and global defaults are independent, so load both at once.
  const [userConfigsRes, globalDefaultsRes] = await Promise.all([
    (supabase as any)
      .from('user_table_configs')
      .select('route, features, is_default')
      .eq('user_id', user.id),
    (supabase as any)
      .from('table_config_defaults')
      .select('route, features'),
  ])
  const userConfigs = userConfigsRes.data
  const globalDefaults = globalDefaultsRes.data

  // 3. Map de defaults globales
  const defaultsMap = new Map<string, TableFeatures>()
  if (globalDefaults) {
    for (const row of globalDefaults as TableConfigDefaultRow[]) {
      defaultsMap.set(row.route, row.features as TableFeatures)
    }
  }

  // 4. Merge: usar config de usuario si existe y no es default, si no usar global
  if (userConfigs) {
    for (const row of userConfigs as (UserTableConfigRow & { is_default: boolean })[]) {
      if (row.is_default) {
        // Si está marcado como default, usar el global
        result.set(row.route, defaultsMap.get(row.route) ?? getDefaultFeatures(row.route))
      } else {
        result.set(row.route, row.features as TableFeatures)
      }
    }
  }

  // 5. Agregar rutas que no tienen config de usuario pero sí tienen default global
  for (const [route, features] of defaultsMap) {
    if (!result.has(route)) {
      result.set(route, features)
    }
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener solo el default global para una ruta (sin usuario)
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchTableConfigDefault(route: string): Promise<TableFeatures | null> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('table_config_defaults')
    .select('features')
    .eq('route', route)
    .single()

  return data ? (data.features as TableFeatures) : null
}
