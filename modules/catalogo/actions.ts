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

export async function updateProductoWebAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const productoId = toInteger(formData, 'producto_id')
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    // Precios
    precio_publico: toNumeric(formData, 'precio_publico') ?? 0,
    precio_oferta: toNumeric(formData, 'precio_oferta'),
    // Nombre y descripciones web
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

  const { error } = await (supabase
    .from('productos_web') as any)
    .update(payload)
    .eq('producto_id', productoId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

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
    producto_id: productoId,
    tipo_acabado_id: toInteger(formData, 'tipo_acabado_id'),
    detalle_acabado_id: toInteger(formData, 'detalle_acabado_id'),
    patron_acabado_id: toInteger(formData, 'patron_acabado_id'),
    localizacion_id: toInteger(formData, 'localizacion_id'),
  }

  if (id) {
    const { error } = await (supabase.from('acabado_producto') as any).update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase.from('acabado_producto') as any).insert(payload)
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
  const { error } = await (supabase.from('acabado_producto') as any).delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
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
  const { error } = await (supabase
    .from('productos') as any)
    .update({ estado: nuevoEstado })
    .eq('id', productoId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo')
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

  const productoId = toInteger(formData, 'producto_id')
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    producto_id: productoId,
    // El trigger de BD genera el slug automáticamente al INSERT
    precio_publico: toNumeric(formData, 'precio_publico') ?? 0,
    precio_oferta:  toNumeric(formData, 'precio_oferta'),
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

  const { error } = await (supabase
    .from('productos_web') as any)
    .insert(payload)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este producto ya tiene un registro de tienda web.' }
    }
    return { success: false, error: error.message }
  }

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
    const { error } = await (supabase.from('producto_tags') as any).update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase.from('producto_tags') as any).insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

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
  const productoId = toInteger(formData, 'producto_id')
  
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const payload = {
    producto_id: productoId,
    talla_id: toInteger(formData, 'talla_id'),
    color_id: toInteger(formData, 'color_id'),
    costo_promedio: toNumeric(formData, 'costo_promedio'),
    precio_venta: toNumeric(formData, 'precio_venta'),
    activo: toBoolean(formData, 'activo'),
    sku_completo: toCleanText(formData, 'sku_completo'),
  }

  if (id) {
    const { error } = await (supabase.from('variantes_producto') as any).update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase.from('variantes_producto') as any).insert(payload)
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
  const { error } = await (supabase.from('variantes_producto') as any).delete().eq('id', id)

  if (error) return { success: false, error: error.message }

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
  const { error } = await (supabase.from('producto_tags') as any).delete().eq('id', id)

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
    producto_id: productoId,
    parte_prenda_id: toInteger(formData, 'parte_prenda_id'),
    tipo_comp_id:    toInteger(formData, 'tipo_comp_id'),
    material_id:     toInteger(formData, 'material_id'),
    corte_forma_id:  toInteger(formData, 'corte_forma_id'),
    descripcion_adicional: toCleanText(formData, 'descripcion_adicional'),
  }

  if (id) {
    const { error } = await (supabase.from('complemento_producto') as any).update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase.from('complemento_producto') as any).insert(payload)
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
  const { error } = await (supabase.from('complemento_producto') as any).delete().eq('id', id)

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
    const { error } = await (supabase.from('producto_conjunto') as any).update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase.from('producto_conjunto') as any).insert(payload)
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
  const { error } = await (supabase.from('producto_conjunto') as any).delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoPadreId}`)
  return { success: true }
}
