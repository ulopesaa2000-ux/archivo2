// modules/catalogo/actions/detalle.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import {
  type ActionResult,
  toCleanText,
  toInteger,
  toBoolean,
} from './_shared'

// ─────────────────────────────────────────────────────────────────────────────
// Acabados
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAcabadoAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id')

  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    producto_id:        productoId,
    tipo_acabado_id:    toInteger(formData, 'tipo_acabado_id'),
    detalle_acabado_id: toInteger(formData, 'detalle_acabado_id'),
    patron_acabado_id:  toInteger(formData, 'patron_acabado_id'),
    localizacion_id:    toInteger(formData, 'localizacion_id'),
  }

  if (id) {
    const { error } = await supabase.from('acabado_producto').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('acabado_producto').insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export async function deleteAcabadoAction(
  id: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const { error } = await supabase.from('acabado_producto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tags (Etiquetas)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveTagAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id')

  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    producto_id: productoId,
    tipo_tag_id: toInteger(formData, 'tipo_tag_id'),
    ref_tag_id:  toInteger(formData, 'ref_tag_id'),
    valor_texto: toCleanText(formData, 'valor_texto'),
  }

  if (id) {
    const { error } = await supabase.from('producto_tags').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('producto_tags').insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export async function deleteTagAction(
  id: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const { error } = await supabase.from('producto_tags').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Complementos
// ─────────────────────────────────────────────────────────────────────────────

export async function saveComplementoAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id')

  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    producto_id:           productoId,
    parte_prenda_id:       toInteger(formData, 'parte_prenda_id'),
    tipo_comp_id:          toInteger(formData, 'tipo_comp_id'),
    material_id:           toInteger(formData, 'material_id'),
    corte_forma_id:        toInteger(formData, 'corte_forma_id'),
    descripcion_adicional: toCleanText(formData, 'descripcion_adicional'),
  }

  if (id) {
    const { error } = await supabase.from('complemento_producto').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('complemento_producto').insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export async function deleteComplementoAction(
  id: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const { error } = await supabase.from('complemento_producto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Conjunto (Hijos)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveConjuntoItemAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoPadreId = toInteger(formData, 'producto_padre_id')

  if (!productoPadreId) return { success: false, error: 'ID de producto padre requerido.' }

  const payload = {
    producto_padre_id: productoPadreId,
    producto_hijo_id:  toInteger(formData, 'producto_hijo_id'),
    cantidad:          toInteger(formData, 'cantidad') || 1,
    orden:             toInteger(formData, 'orden') || 0,
    es_requerido:      toBoolean(formData, 'es_requerido'),
  }

  if (id) {
    const { error } = await supabase.from('producto_conjunto').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('producto_conjunto').insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoPadreId}`)
  return { success: true }
}

export async function deleteConjuntoItemAction(
  id: number,
  productoPadreId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()
  const { error } = await supabase.from('producto_conjunto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoPadreId}`)
  return { success: true }
}
