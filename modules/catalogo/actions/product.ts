// modules/catalogo/actions/product.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { generarSlugProducto } from '@/lib/utils/slug'
import type { Database } from '@/lib/types/database.types'
import {
  type ActionResult,
  requireCatalogoPermission,
  toCleanText,
  toInteger,
  toNumeric,
  toBoolean,
} from './_shared'

// ═══════════════════════════════════════════════════════════════
// SKU
// ═══════════════════════════════════════════════════════════════

export async function checkSkuExistsAction(
  sku_base: string,
  currentId?: number
): Promise<boolean> {
  const supabase = await createClient()
  const query = supabase
    .from('productos')
    .select('id')
    .eq('sku_base', sku_base.toUpperCase())

  const { data } = currentId
    ? await (query as any).neq('id', currentId).maybeSingle()
    : await (query as any).maybeSingle()

  return !!data
}

// ═══════════════════════════════════════════════════════════════
// CREATE / UPDATE / DEACTIVATE
// ═══════════════════════════════════════════════════════════════

export async function createProductAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_crear')
  if (denied) return denied

  const supabase = await createClient()

  const skuBase = toCleanText(formData, 'sku_base')
  if (!skuBase) return { success: false, error: 'SKU base es requerido.' }

  const payload: Database['inv-tienda']['Tables']['productos']['Insert'] = {
    sku_base:      skuBase.toUpperCase(),
    descripcion:   toCleanText(formData, 'descripcion'),
    marca_id:      toInteger(formData, 'marca_id'),
    genero_id:     toInteger(formData, 'genero_id'),
    edad_id:       toInteger(formData, 'edad_id'),
    tipo_prenda_id:toInteger(formData, 'tipo_prenda_id'),
    tela_ext_id:   toInteger(formData, 'tela_ext_id'),
    tela_forro_id: toInteger(formData, 'tela_forro_id'),
    persona_id:    toInteger(formData, 'persona_id'),
    composicion:   toCleanText(formData, 'composicion'),
    familia:       toCleanText(formData, 'familia'),
    es_conjunto:   toBoolean(formData, 'es_conjunto'),
    activo:        true,
  }

  const { data, error } = await supabase
    .from('productos')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El SKU "${skuBase.toUpperCase()}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/catalogo')
  return { success: true, id: data.id }
}

export async function updateProductAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const id = toInteger(formData, 'id')
  if (!id) return { success: false, error: 'ID de producto requerido.' }

  const skuBase = toCleanText(formData, 'sku_base')
  if (!skuBase) return { success: false, error: 'SKU base es requerido.' }

  const payload: Database['inv-tienda']['Tables']['productos']['Update'] = {
    sku_base:      skuBase.toUpperCase(),
    descripcion:   toCleanText(formData, 'descripcion'),
    marca_id:      toInteger(formData, 'marca_id'),
    genero_id:     toInteger(formData, 'genero_id'),
    edad_id:       toInteger(formData, 'edad_id'),
    tipo_prenda_id:toInteger(formData, 'tipo_prenda_id'),
    tela_ext_id:   toInteger(formData, 'tela_ext_id'),
    tela_forro_id: toInteger(formData, 'tela_forro_id'),
    persona_id:    toInteger(formData, 'persona_id'),
    composicion:   toCleanText(formData, 'composicion'),
    familia:       toCleanText(formData, 'familia'),
    es_conjunto:   toBoolean(formData, 'es_conjunto'),
  }

  const { error } = await supabase
    .from('productos')
    .update(payload)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El SKU "${skuBase.toUpperCase()}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/catalogo')
  revalidatePath(`/catalogo/${id}`)
  return { success: true }
}

export async function deactivateProductAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const id = toInteger(formData, 'product_id')
  if (!id) return { success: false, error: 'ID de producto requerido.' }

  const { error } = await (supabase.from('productos') as any)
    .update({ activo: false })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cambiar estado de un producto (ej. borrador → publicado)
// ─────────────────────────────────────────────────────────────────────────────

export async function cambiarEstadoProductoAction(
  productoId: number,
  nuevoEstado: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const ESTADOS_VALIDOS = ['borrador', 'pendiente', 'publicado', 'pausado', 'descontinuado']
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return { success: false, error: 'Estado no válido.' }
  }

  const supabase = await createClient()
  const { error } = await (supabase.from('productos') as any)
    .update({ estado: nuevoEstado })
    .eq('id', productoId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualización Masiva (Quick Edit)
// ─────────────────────────────────────────────────────────────────────────────

export async function bulkUpdateProductsAction(
  ids: number[],
  payload: Partial<{
    precio_ec: number
    estado: string
    marca_id: number | null
    descripcion: string | null
    familia: string | null
  }>
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  if (!ids.length) return { success: false, error: 'No se seleccionaron productos' }

  const supabase = await createClient()
  const { error } = await (supabase.from('productos') as any)
    .update(payload)
    .in('id', ids)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
  return { success: true }
}

export async function bulkDeactivateProductsAction(
  ids: number[]
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  if (!ids.length) return { success: false, error: 'No se seleccionaron productos' }

  const supabase = await createClient()
  const { error } = await (supabase.from('productos') as any)
    .update({ activo: false })
    .in('id', ids)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
  return { success: true }
}

export async function toggleDestacadoAction(
  id: number,
  nuevoEstado: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const { error } = await (supabase.from('productos') as any)
    .update({ destacado: nuevoEstado })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
  revalidatePath('/catalogo/catalogos')
  revalidatePath(`/catalogo/${id}`)
  return { success: true }
}

