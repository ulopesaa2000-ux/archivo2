// modules/catalogo/actions/detalle.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  type ActionResult,
  requireCatalogoPermission,
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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id')

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase.from('acabado_producto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export type AcabadoBatchInputItem = {
  tipo_acabado_id: number | null
  detalle_acabado_id?: number | null
  patron_acabado_id?: number | null
  localizacion_id?: number | null
}

export async function saveAcabadosBatchAction(input: {
  productoId: number
  items: AcabadoBatchInputItem[]
}): Promise<{
  success: boolean
  error?: string
  data?: {
    inserted: {
      id: number
      tipo_acabado_id: number | null
      detalle_acabado_id: number | null
      patron_acabado_id: number | null
      localizacion_id: number | null
    }[]
  }
}> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const { productoId, items } = input
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }
  if (!items || items.length === 0) return { success: true, data: { inserted: [] } }

  const supabase = await createClient()
  const toInsert = items.map((item) => ({
    producto_id: productoId,
    tipo_acabado_id: item.tipo_acabado_id,
    detalle_acabado_id: item.detalle_acabado_id ?? null,
    patron_acabado_id: item.patron_acabado_id ?? null,
    localizacion_id: item.localizacion_id ?? null,
  }))

  const { data, error } = await supabase
    .from('acabado_producto')
    .insert(toInsert)
    .select('id, tipo_acabado_id, detalle_acabado_id, patron_acabado_id, localizacion_id')

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true, data: { inserted: data ?? [] } }
}

export async function clearAllAcabadosAction(
  productoId: number
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase
    .from('acabado_producto')
    .delete()
    .eq('producto_id', productoId)

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id')

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase.from('producto_tags').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export type TagBatchInputItem = {
  tipo_tag_id: number
  ref_tag_id: number | null
  valor_texto?: string | null
  es_multiple?: boolean
}

export async function saveTagsBatchAction(input: {
  productoId: number
  items: TagBatchInputItem[]
}): Promise<{
  success: boolean
  error?: string
  data?: {
    added: number
    replaced: number
    deletedIds: number[]
    inserted: { id: number; tipo_tag_id: number | null; ref_tag_id: number | null; valor_texto: string | null }[]
  }
}> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const { productoId, items } = input
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }
  if (!items || items.length === 0) {
    return { success: true, data: { added: 0, replaced: 0, deletedIds: [], inserted: [] } }
  }

  const supabase = await createClient()
  const { data: existingRows, error: fetchErr } = await supabase
    .from('producto_tags')
    .select('id, tipo_tag_id, ref_tag_id')
    .eq('producto_id', productoId)

  if (fetchErr) return { success: false, error: fetchErr.message }

  const existing = existingRows ?? []
  const singleChoiceTipoIds = new Set<number>()
  const finalSingleItems = new Map<number, TagBatchInputItem>()
  const multiItems: TagBatchInputItem[] = []

  for (const item of items) {
    if (item.es_multiple === false) {
      singleChoiceTipoIds.add(item.tipo_tag_id)
      finalSingleItems.set(item.tipo_tag_id, item)
    } else {
      multiItems.push(item)
    }
  }

  const idsToDelete: number[] = []
  if (singleChoiceTipoIds.size > 0) {
    for (const row of existing) {
      if (row.tipo_tag_id != null && singleChoiceTipoIds.has(row.tipo_tag_id)) {
        idsToDelete.push(row.id)
      }
    }
  }

  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('producto_tags')
      .delete()
      .in('id', idsToDelete)
    if (delErr) return { success: false, error: delErr.message }
  }

  const existingPairKeys = new Set(
    existing
      .filter((r) => !idsToDelete.includes(r.id))
      .map((r) => `${r.tipo_tag_id ?? ''}:${r.ref_tag_id ?? ''}`)
  )

  const toInsert: {
    producto_id: number
    tipo_tag_id: number
    ref_tag_id: number | null
    valor_texto: string | null
  }[] = []

  for (const item of [...finalSingleItems.values(), ...multiItems]) {
    const pairKey = `${item.tipo_tag_id}:${item.ref_tag_id ?? ''}`
    if (item.ref_tag_id != null && existingPairKeys.has(pairKey)) continue
    existingPairKeys.add(pairKey)
    toInsert.push({
      producto_id: productoId,
      tipo_tag_id: item.tipo_tag_id,
      ref_tag_id: item.ref_tag_id,
      valor_texto: item.valor_texto?.trim() || null,
    })
  }

  let insertedRows: { id: number; tipo_tag_id: number | null; ref_tag_id: number | null; valor_texto: string | null }[] = []
  if (toInsert.length > 0) {
    const { data: insData, error: insErr } = await supabase
      .from('producto_tags')
      .insert(toInsert)
      .select('id, tipo_tag_id, ref_tag_id, valor_texto')
    if (insErr) return { success: false, error: insErr.message }
    insertedRows = insData ?? []
  }

  revalidatePath(`/catalogo/${productoId}`)
  return {
    success: true,
    data: {
      added: insertedRows.length,
      replaced: idsToDelete.length,
      deletedIds: idsToDelete,
      inserted: insertedRows,
    },
  }
}

export async function clearAllTagsAction(
  productoId: number
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase
    .from('producto_tags')
    .delete()
    .eq('producto_id', productoId)

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id')

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase.from('complemento_producto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

export type ComplementoBatchInputItem = {
  parte_prenda_id: number | null
  tipo_comp_id?: number | null
  material_id?: number | null
  corte_forma_id?: number | null
  descripcion_adicional?: string | null
}

export async function saveComplementosBatchAction(input: {
  productoId: number
  items: ComplementoBatchInputItem[]
}): Promise<{
  success: boolean
  error?: string
  data?: {
    inserted: {
      id: number
      parte_prenda_id: number | null
      tipo_comp_id: number | null
      material_id: number | null
      corte_forma_id: number | null
      descripcion_adicional: string | null
    }[]
  }
}> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const { productoId, items } = input
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }
  if (!items || items.length === 0) return { success: true, data: { inserted: [] } }

  const supabase = await createClient()
  const toInsert = items.map((item) => ({
    producto_id: productoId,
    parte_prenda_id: item.parte_prenda_id,
    tipo_comp_id: item.tipo_comp_id ?? null,
    material_id: item.material_id ?? null,
    corte_forma_id: item.corte_forma_id ?? null,
    descripcion_adicional: item.descripcion_adicional?.trim() || null,
  }))

  const { data, error } = await supabase
    .from('complemento_producto')
    .insert(toInsert)
    .select('id, parte_prenda_id, tipo_comp_id, material_id, corte_forma_id, descripcion_adicional')

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true, data: { inserted: data ?? [] } }
}

export async function clearAllComplementosAction(
  productoId: number
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase
    .from('complemento_producto')
    .delete()
    .eq('producto_id', productoId)

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const { error } = await supabase.from('producto_conjunto').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoPadreId}`)
  return { success: true }
}
