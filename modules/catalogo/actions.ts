// modules/catalogo/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'

export type ActionResult = {
  success: boolean
  error?: string
  id?: number
}

// ── Helpers de saneo ────────────────────────────────────────
function toCleanText(fd: FormData, key: string): string | null {
  const val = fd.get(key)
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  return trimmed === '' ? null : trimmed
}

function toInteger(fd: FormData, key: string): number | null {
  const val = fd.get(key)
  if (!val) return null
  const num = parseInt(String(val), 10)
  return isNaN(num) ? null : num
}

function toNumeric(fd: FormData, key: string): number | null {
  const val = fd.get(key)
  if (!val) return null
  const num = parseFloat(String(val))
  return isNaN(num) ? null : num
}

function toBoolean(fd: FormData, key: string): boolean {
  return fd.get(key) === 'true' || fd.get(key) === 'on'
}

// ═══════════════════════════════════════════════════════════════

export async function createProductAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const sku_base = toCleanText(formData, 'sku_base')
  if (!sku_base) {
    return { success: false, error: 'SKU es obligatorio.' }
  }

  const payload = {
    sku_base,
    nombre: toCleanText(formData, 'nombre'),
    descripcion: toCleanText(formData, 'descripcion'),
    composicion: toCleanText(formData, 'composicion'),
    familia: toCleanText(formData, 'familia'),
    estado: toCleanText(formData, 'estado') ?? 'borrador',
    precio_ec: toNumeric(formData, 'precio_ec'),
    pz_en_caja: toInteger(formData, 'pz_en_caja') ?? 1,
    marca_id: toInteger(formData, 'marca_id'),
    genero_id: toInteger(formData, 'genero_id'),
    tipo_prenda_id: toInteger(formData, 'tipo_prenda_id'),
    edad_id: toInteger(formData, 'edad_id'),
    tela_forro_id: toInteger(formData, 'tela_forro_id'),
    tela_ext_id: toInteger(formData, 'tela_ext_id'),
    persona_id: toInteger(formData, 'persona_id'),
    activo: toBoolean(formData, 'activo'),
    destacado: toBoolean(formData, 'destacado'),
    es_conjunto: toBoolean(formData, 'es_conjunto'),
  }

  const { data, error } = await (supabase
    .from('productos') as any)
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El SKU "${sku_base}" ya existe.` }
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

  const id = toInteger(formData, 'product_id')
  if (!id) return { success: false, error: 'ID de producto requerido.' }

  const sku_base = toCleanText(formData, 'sku_base')
  if (!sku_base) return { success: false, error: 'SKU es obligatorio.' }

  const payload = {
    sku_base,
    nombre: toCleanText(formData, 'nombre'),
    descripcion: toCleanText(formData, 'descripcion'),
    composicion: toCleanText(formData, 'composicion'),
    familia: toCleanText(formData, 'familia'),
    estado: toCleanText(formData, 'estado'),
    precio_ec: toNumeric(formData, 'precio_ec'),
    pz_en_caja: toInteger(formData, 'pz_en_caja'),
    marca_id: toInteger(formData, 'marca_id'),
    genero_id: toInteger(formData, 'genero_id'),
    tipo_prenda_id: toInteger(formData, 'tipo_prenda_id'),
    edad_id: toInteger(formData, 'edad_id'),
    tela_forro_id: toInteger(formData, 'tela_forro_id'),
    tela_ext_id: toInteger(formData, 'tela_ext_id'),
    persona_id: toInteger(formData, 'persona_id'),
    activo: toBoolean(formData, 'activo'),
    destacado: toBoolean(formData, 'destacado'),
    es_conjunto: toBoolean(formData, 'es_conjunto'),
  }

  const { error } = await (supabase
    .from('productos') as any)
    .update(payload)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El SKU "${sku_base}" ya existe.` }
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

  const { error } = await (supabase
    .from('productos') as any)
    .update({ activo: false })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
  return { success: true }
}
