// modules/config/tablas-soporte/queries.ts
import { createClient } from '@/lib/supabase/server'
import {
  TABLAS_SOPORTE_CONFIG,
  type TablaSoporteKey,
  type TablaSoporteRowMap,
} from './types'

export async function fetchTablaSoporteData<K extends TablaSoporteKey>(
  tabla: K,
  q?: string,
  estado?: 'todos' | 'activos' | 'inactivos'
): Promise<TablaSoporteRowMap[K][]> {
  const supabase = await createClient()
  const config = TABLAS_SOPORTE_CONFIG[tabla]

  // Base query: cast dynamic table name to any for supabase type safety
  let query = (supabase.from(tabla as any) as any).select('*')

  // Status filtering (if table has 'activo' column)
  if (config.hasActivoCol && estado && estado !== 'todos') {
    if (estado === 'activos') {
      query = query.eq('activo', true)
    } else if (estado === 'inactivos') {
      query = query.or('activo.is.null,activo.eq.false')
    }
  }

  // Search filtering
  if (q && q.trim().length > 0) {
    const cleanQ = q.trim()
    const orConditions = config.searchFields
      .map((field) => `${field}.ilike.%${cleanQ}%`)
      .join(',')
    query = query.or(orConditions)
  }

  // Default ordering logic per table
  if (tabla === 'cat_colores') {
    query = query.order('orden_display', { ascending: true })
  } else if (tabla === 'personas') {
    query = query.order('nombre_completo', { ascending: true })
  } else if (['cat_marcas', 'cat_tallas', 'cat_edades', 'cat_telas', 'cat_tipo_prenda'].includes(tabla)) {
    query = query.order('id', { ascending: true })
  } else {
    query = query.order('id', { ascending: true })
  }

  const { data, error } = await query

  if (error) {
    console.error(`fetchTablaSoporteData (${tabla}) error:`, error)
    return []
  }

  return (data ?? []) as TablaSoporteRowMap[K][]
}

export async function fetchTablaSoporteCounts(): Promise<Record<TablaSoporteKey, number>> {
  const supabase = await createClient()
  const keys: TablaSoporteKey[] = [
    'personas',
    'cat_marcas',
    'cat_tallas',
    'cat_colores',
    'cat_telas',
    'cat_generos',
    'cat_edades',
    'cat_tipo_prenda',
    'cat_tipos_movimiento',
    'cat_estados_nota',
  ]

  const countEntries = await Promise.all(
    keys.map(async (key) => {
      const { count } = await (supabase.from(key as any) as any)
        .select('*', { count: 'exact', head: true })
      return [key, count ?? 0] as const
    })
  )

  return Object.fromEntries(countEntries) as Record<TablaSoporteKey, number>
}
