// modules/contenedores/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosContenedores, ContenedorResumen,
  ContenedorPackingItem, OrdenEnContenedor,
} from './types'
import type { ContenedorRow } from '@/lib/types/tables'

// ════════════════════════════════════════════════════════════
// LISTADO (usa v_contenedor_resumen)
// ════════════════════════════════════════════════════════════

export async function fetchContenedores(
  filtros: FiltrosContenedores
): Promise<{ items: ContenedorResumen[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('v_contenedor_resumen')
    .select('*', { count: 'exact' })

  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(
      `numero_contenedor.ilike.${term},codigo_contenedor.ilike.${term},numero_bl.ilike.${term}`
    )
  }

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }

  if (filtros.año) {
    query = query
      .gte('fecha_eta', `${filtros.año}-01-01`)
      .lt('fecha_eta', `${filtros.año + 1}-01-01`)
  }

  query = query
    .order('fecha_eta', { ascending: false, nullsFirst: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchContenedores:', error)
    return { items: [], total: 0 }
  }

  return {
    items: (data ?? []) as ContenedorResumen[],
    total: count ?? 0,
  }
}

// ════════════════════════════════════════════════════════════
// DETALLE
// ════════════════════════════════════════════════════════════

export async function fetchContenedorById(
  id: number
): Promise<ContenedorRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contenedores')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as ContenedorRow
}

export async function fetchContenedorResumen(
  id: number
): Promise<ContenedorResumen | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_contenedor_resumen')
    .select('*')
    .eq('contenedor_id', id)
    .single()

  if (error || !data) return null
  return data as ContenedorResumen
}

export async function fetchOrdenesDeContenedor(
  contenedorId: number
): Promise<OrdenEnContenedor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ordenes_b2b')
    .select(`
      id, folio_proveedor, estado, moneda, tipo_cambio, observaciones,
      total_cajas, total_piezas, cbm_orden, fecha_orden,
      proveedor:personas!ordenes_b2b_proveedor_id_fkey (nombre_completo),
      cliente:personas!ordenes_b2b_cliente_b2b_id_fkey (nombre_completo),
      contenedor:contenedores!ordenes_b2b_contenedor_id_fkey (codigo_contenedor)
    `)
    .eq('contenedor_id', contenedorId)
    .order('id')

  if (error || !data) return []

  return data.map((o: any) => {
    const prov = Array.isArray(o.proveedor) ? o.proveedor[0] : o.proveedor
    const client = Array.isArray(o.cliente) ? o.cliente[0] : o.cliente
    const cont = Array.isArray(o.contenedor) ? o.contenedor[0] : o.contenedor
    return {
      id: o.id,
      folio_proveedor: o.folio_proveedor,
      estado: o.estado,
      moneda: o.moneda,
      tipo_cambio: o.tipo_cambio,
      observaciones: o.observaciones,
      total_cajas: o.total_cajas,
      total_piezas: o.total_piezas,
      cbm_orden: o.cbm_orden,
      proveedor_nombre: prov?.nombre_completo ?? null,
      cliente_nombre: client?.nombre_completo ?? null,
      contenedor_codigo: cont?.codigo_contenedor ?? null,
      fecha_orden: o.fecha_orden,
    }
  })
}

export async function fetchContenedorPacking(
  contenedorId: number
): Promise<ContenedorPackingItem[]> {
  const supabase = await createClient()

  // Primero obtener el codigo_contenedor
  const { data: cont } = await supabase
    .from('contenedores')
    .select('codigo_contenedor')
    .eq('id', contenedorId)
    .single()

  if (!cont) return []

  const { data, error } = await supabase
    .from('v_contenedor_packing')
    .select('*')
    .eq('codigo_contenedor', cont.codigo_contenedor)
    .order('orden_id')

  if (error || !data) return []
  return data as ContenedorPackingItem[]
}
