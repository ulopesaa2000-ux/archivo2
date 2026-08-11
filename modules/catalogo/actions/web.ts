// modules/catalogo/actions/web.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import {
  type ActionResult,
  toCleanText,
  toInteger,
  toNumeric,
  toBoolean,
} from './_shared'

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar registro de productos_web existente
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProductoWebAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id') || toInteger(formData, 'id')
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    // Precios
    precio_publico: toNumeric(formData, 'precio_publico') ?? 0,
    precio_oferta:  toNumeric(formData, 'precio_oferta'),
    // (slug lo gestiona el trigger de BD automáticamente)
    // Flags booleanos
    activo:               toBoolean(formData, 'activo'),
    destacado:            toBoolean(formData, 'destacado'),
    nuevo:                toBoolean(formData, 'nuevo'),
    en_oferta:            toBoolean(formData, 'en_oferta'),
    precio_negociable:    toBoolean(formData, 'precio_negociable'),
    disponible_mayorista: toBoolean(formData, 'disponible_mayorista'),
    // SEO
    titulo_seo:      toCleanText(formData, 'titulo_seo'),
    descripcion_seo: toCleanText(formData, 'descripcion_seo'),
    keywords:        toCleanText(formData, 'keywords'),
    // Otros
    orden_display: toInteger(formData, 'orden_display'),
    unidad_venta:  toCleanText(formData, 'unidad_venta'),
    modo_override: toCleanText(formData, 'modo_override'),
  }

  const { error } = await (supabase.from('productos_web') as any)
    .update(payload)
    .eq('producto_id', productoId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear registro en productos_web (cuando el producto no tenía ninguno)
// ─────────────────────────────────────────────────────────────────────────────

export async function createProductoWebAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id') || toInteger(formData, 'id')
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    producto_id:     productoId,
    slug:            toCleanText(formData, 'slug'),
    precio_publico:  toNumeric(formData, 'precio_publico') ?? 0,
    precio_oferta:   toNumeric(formData, 'precio_oferta'),
    activo:               toBoolean(formData, 'activo'),
    destacado:            toBoolean(formData, 'destacado'),
    nuevo:                toBoolean(formData, 'nuevo'),
    en_oferta:            toBoolean(formData, 'en_oferta'),
    precio_negociable:    toBoolean(formData, 'precio_negociable'),
    disponible_mayorista: toBoolean(formData, 'disponible_mayorista'),
    titulo_seo:      toCleanText(formData, 'titulo_seo'),
    descripcion_seo: toCleanText(formData, 'descripcion_seo'),
    keywords:        toCleanText(formData, 'keywords'),
    orden_display:   toInteger(formData, 'orden_display') ?? 0,
    unidad_venta:    toCleanText(formData, 'unidad_venta') ?? 'pieza',
    modo_override:   toCleanText(formData, 'modo_override') ?? 'default',
  }

  const { error } = await (supabase.from('productos_web') as any).insert(payload)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este producto ya tiene un registro de tienda web.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}
