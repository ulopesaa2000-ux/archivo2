// modules/catalogo/actions/variantes.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import type { Database } from '@/lib/types/database.types'
import {
  type ActionResult,
  toCleanText,
  toInteger,
  toNumeric,
  toBoolean,
} from './_shared'

// ─────────────────────────────────────────────────────────────────────────────
// Variantes
// ─────────────────────────────────────────────────────────────────────────────

export async function saveVarianteAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id')

  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const talla_id    = toInteger(formData, 'talla_id')
  const color_id    = toInteger(formData, 'color_id')
  const sku_completo = toCleanText(formData, 'sku_completo')

  if (!talla_id || !color_id || !sku_completo) {
    return { success: false, error: 'Talla, Color y SKU completo son requeridos.' }
  }

  const payload = {
    producto_id:    productoId,
    talla_id,
    color_id,
    costo_promedio: toNumeric(formData, 'costo_promedio'),
    precio_venta:   toNumeric(formData, 'precio_venta'),
    activo:         toBoolean(formData, 'activo'),
    sku_completo,
  }

  if (id) {
    const { error } = await supabase.from('variantes_producto').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('variantes_producto').insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export async function deleteVarianteAction(
  id: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const { error } = await supabase.from('variantes_producto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export async function deleteVariantesBatchAction(
  ids: number[],
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  if (!ids.length) return { success: false, error: 'No se seleccionaron variantes' }

  const supabase = await createClient()
  const { error } = await supabase.from('variantes_producto').delete().in('id', ids)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true, id: ids.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear Referencia Color
// ─────────────────────────────────────────────────────────────────────────────

export async function createColorAction(
  nombre: string,
  codigo: string,
  hexCode: string,
  tipoColor: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const payload = {
    nombre:        nombre.toUpperCase(),
    codigo:        codigo.toUpperCase(),
    hex_code:      hexCode || null,
    tipo_color:    tipoColor,
    orden_display: 99,
  }

  const { data, error } = await supabase
    .from('cat_colores')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El código de color "${payload.codigo}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear Talla
// ─────────────────────────────────────────────────────────────────────────────

export async function createTallaAction(
  nombre: string,
  codigo: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const payload = {
    nombre: nombre.toUpperCase(),
    codigo: codigo.toUpperCase(),
  }

  const { data, error } = await supabase
    .from('cat_tallas')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `La talla "${codigo}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

// ─────────────────────────────────────────────────────────────────────────────
// Medidas
// ─────────────────────────────────────────────────────────────────────────────

export async function saveMedidasAction(
  productoId: number,
  medidas: { talla_id: number; punto_medida_id: number; medida_cm: number }[]
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  // 1. Eliminar medidas existentes
  const { error: deleteError } = await supabase
    .from('medidas_producto')
    .delete()
    .eq('producto_id', productoId)

  if (deleteError) return { success: false, error: deleteError.message }

  // 2. Insertar nuevas medidas si hay
  if (medidas.length > 0) {
    const payload: Database['inv-tienda']['Tables']['medidas_producto']['Insert'][] =
      medidas.map((m) => ({
        producto_id:     productoId,
        talla_id:        m.talla_id,
        punto_medida_id: m.punto_medida_id,
        medida_cm:       m.medida_cm,
        medida_ft:       Math.round((m.medida_cm / 2.54) * 100) / 100,
      }))

    const { error: insertError } = await supabase.from('medidas_producto').insert(payload)
    if (insertError) return { success: false, error: insertError.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}
