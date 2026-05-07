// modules/catalogo/imagenes/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'

// ─── Tipos ────────────────────────────────────────────────────────────────

export type FiltrosImagenes = {
  q?: string           // Buscar por SKU o nombre de producto
  uso_imagen?: string  // Filtrar por tipo de uso
  origen?: 'local' | 'url_externa'
  es_principal?: boolean
  page?: number
}

export type ImagenGlobal = {
  id: number
  producto_id: number
  sku_base: string
  nombre_producto: string
  descripcion_producto: string
  url: string
  url_og: string | null
  es_principal: boolean
  orden: number | null
  alt_text: string | null
  uso_imagen: string
  origen_imagen: 'local' | 'url_externa'
  created_at: string | null
}

export type ResultadoImagenes = {
  imagenes: ImagenGlobal[]
  total: number
  page: number
  totalPages: number
}

// ─── Queries ────────────────────────────────────────────────────────────

/**
 * Obtiene todas las imágenes con datos del producto.
 * Paginación + filtros.
 */
export async function fetchImagenesGlobales(
  filtros: FiltrosImagenes
): Promise<ResultadoImagenes> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query base con join a productos
  let query = (supabase
    .from('producto_imagenes') as any)
    .select(`
      id,
      producto_id,
      url,
      url_og,
      es_principal,
      orden,
      alt_text,
      uso_imagen,
      origen_imagen,
      created_at,
      productos!inner(sku_base, nombre, descripcion)
    `, { count: 'exact' })

  // Filtro: búsqueda por SKU o nombre del producto
  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`productos.sku_base.ilike.${term},productos.nombre.ilike.${term}`)
  }

  // Filtro: tipo de uso
  if (filtros.uso_imagen) {
    query = query.eq('uso_imagen', filtros.uso_imagen)
  }

  // Filtro: origen (local o url_externa)
  if (filtros.origen) {
    query = query.eq('origen_imagen', filtros.origen)
  }

  // Filtro: solo principales
  if (filtros.es_principal === true) {
    query = query.eq('es_principal', true)
  }

  // Ordenar por fecha reciente
  query = query.order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('[fetchImagenesGlobales] Error:', error)
    throw new Error(`Error al obtener imágenes: ${error.message}`)
  }

  // Transformar datos
  const imagenes: ImagenGlobal[] = (data || []).map((row: any) => ({
    id: row.id,
    producto_id: row.producto_id,
    sku_base: row.productos?.sku_base ?? '',
    nombre_producto: row.productos?.nombre ?? '',
    descripcion_producto: row.productos?.descripcion ?? '',
    url: row.url,
    url_og: row.url_og,
    es_principal: row.es_principal ?? false,
    orden: row.orden,
    alt_text: row.alt_text,
    uso_imagen: row.uso_imagen,
    origen_imagen: row.origen_imagen,
    created_at: row.created_at,
  }))

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return { imagenes, total, page, totalPages }
}

/**
 * Busca productos para el selector (para importar imágenes).
 * Solo devuelve id, sku_base y nombre.
 */
export async function buscarProductosParaSelector(
  term: string,
  limit: number = 20
): Promise<{ id: number; sku_base: string; nombre: string }[]> {
  if (!term || term.length < 2) return []

  const supabase = await createClient()
  const termPattern = `%${term}%`

  const { data, error } = await (supabase
    .from('productos') as any)
    .select('id, sku_base, nombre')
    .or(`sku_base.ilike.${termPattern},nombre.ilike.${termPattern}`)
    .eq('activo', true)
    .order('sku_base')
    .limit(limit)

  if (error) {
    console.error('[buscarProductosParaSelector] Error:', error)
    return []
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    sku_base: p.sku_base,
    nombre: p.nombre,
  }))
}

/**
 * Obtiene una sola imagen por ID con datos del producto.
 */
export async function fetchImagenPorId(
  imagenId: number
): Promise<ImagenGlobal | null> {
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('producto_imagenes') as any)
    .select(`
      id,
      producto_id,
      url,
      es_principal,
      orden,
      alt_text,
      uso_imagen,
      origen_imagen,
      created_at,
      productos!inner(sku_base, nombre, descripcion)
    `)
    .eq('id', imagenId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    producto_id: data.producto_id,
    sku_base: data.productos?.sku_base ?? '',
    nombre_producto: data.productos?.nombre ?? '',
    descripcion_producto: data.productos?.descripcion ?? '',
    url: data.url,
    url_og: data.url_og,
    es_principal: data.es_principal ?? false,
    orden: data.orden,
    alt_text: data.alt_text,
    uso_imagen: data.uso_imagen,
    origen_imagen: data.origen_imagen,
    created_at: data.created_at,
  }
}