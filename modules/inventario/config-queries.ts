// modules/inventario/config-queries.ts
'use server'

import { cacheLife, cacheTag } from 'next/cache'
import { createClient, createStaticClient } from '@/lib/supabase/server'
import type { ConfigInventario } from './config-types'
import { DEFAULT_CONFIG_INVENTARIO } from './config-types'

/**
 * Obtiene la configuración global del módulo de Inventario con caché optimizada.
 */
export async function fetchConfigInventario(): Promise<ConfigInventario> {
  'use cache'
  cacheLife('hours')
  cacheTag('inventario-config')

  try {
    const supabase = createStaticClient()

    const { data, error } = await supabase
      .from('config_inventario' as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) {
      return DEFAULT_CONFIG_INVENTARIO
    }

    return {
      ...DEFAULT_CONFIG_INVENTARIO,
      ...(data as unknown as Partial<ConfigInventario>),
      permisos_tipos_movimiento: (data as any).permisos_tipos_movimiento ?? DEFAULT_CONFIG_INVENTARIO.permisos_tipos_movimiento,
      orden_ciudades: (data as any).orden_ciudades ?? DEFAULT_CONFIG_INVENTARIO.orden_ciudades,
      orden_bodegas_ids: (data as any).orden_bodegas_ids ?? DEFAULT_CONFIG_INVENTARIO.orden_bodegas_ids,
    }
  } catch (err) {
    console.error('Exception in fetchConfigInventario:', err)
    return DEFAULT_CONFIG_INVENTARIO
  }
}

/**
 * Consulta en tiempo real sin caché estática (usado para formularios y mutaciones).
 */
export async function fetchConfigInventarioLive(): Promise<ConfigInventario> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('config_inventario' as any)
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error || !data) {
      return DEFAULT_CONFIG_INVENTARIO
    }

    return {
      ...DEFAULT_CONFIG_INVENTARIO,
      ...(data as unknown as Partial<ConfigInventario>),
      permisos_tipos_movimiento: (data as any).permisos_tipos_movimiento ?? DEFAULT_CONFIG_INVENTARIO.permisos_tipos_movimiento,
      orden_ciudades: (data as any).orden_ciudades ?? DEFAULT_CONFIG_INVENTARIO.orden_ciudades,
      orden_bodegas_ids: (data as any).orden_bodegas_ids ?? DEFAULT_CONFIG_INVENTARIO.orden_bodegas_ids,
    }
  } catch (err) {
    console.error('Exception in fetchConfigInventarioLive:', err)
    return DEFAULT_CONFIG_INVENTARIO
  }
}
