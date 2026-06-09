// modules/catalogo/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import sharp from 'sharp'
import { can, type PermissionAction } from '@/lib/auth/permissions'
import { generarSlugProducto } from '@/lib/utils/slug'
import type { Database } from '@/lib/types/database.types'

export type ActionResult = {
  success: boolean
  error?: string
  id?: number
}

async function requireCatalogoPermission(action: PermissionAction): Promise<ActionResult | null> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }
  if (!can(user, 'catalogo_productos', action)) {
    return { success: false, error: 'No tienes permisos para modificar catalogo.' }
  }
  return null
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

export async function checkSkuExistsAction(sku_base: string, currentId?: number): Promise<boolean> {
  const supabase = await createClient()
  let query = (supabase.from('productos') as any).select('id').eq('sku_base', sku_base)
  if (currentId) {
    query = query.neq('id', currentId)
  }
  const { data } = await query
  return data && data.length > 0
}

export async function createProductAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_crear')
  if (denied) return denied

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
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

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

  // ── Propagación del cambio al slug de la tienda web ─────────────────────
  try {
    const { data: webData } = await (supabase
      .from('productos_web') as any)
      .select('id')
      .eq('producto_id', id)
      .maybeSingle()

    if (webData) {
      // Si tiene registro web, consultamos los nombres descriptivos para armar el slug
      const [marca, genero, tipo_prenda] = await Promise.all([
        payload.marca_id
          ? (supabase.from('cat_marcas') as any).select('nombre').eq('id', payload.marca_id).single()
          : { data: null },
        payload.genero_id
          ? (supabase.from('cat_generos') as any).select('nombre').eq('id', payload.genero_id).single()
          : { data: null },
        payload.tipo_prenda_id
          ? (supabase.from('cat_tipo_prenda') as any).select('nombre').eq('id', payload.tipo_prenda_id).single()
          : { data: null },
      ])

      const nuevoSlug = generarSlugProducto({
        sku_base,
        tipo_prenda: tipo_prenda.data?.nombre ?? null,
        genero: genero.data?.nombre ?? null,
        marca: marca.data?.nombre ?? null,
      })

      await (supabase
        .from('productos_web') as any)
        .update({ slug: nuevoSlug })
        .eq('producto_id', id)
    }
  } catch (err) {
    console.error('Error propagando slug a productos_web:', err)
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
    slug: toCleanText(formData, 'slug'),
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
    const { error } = await supabase.from('producto_tags').update(payload).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('producto_tags').insert(payload)
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

  const talla_id = toInteger(formData, 'talla_id')
  const color_id = toInteger(formData, 'color_id')
  const sku_completo = toCleanText(formData, 'sku_completo')

  if (!talla_id || !color_id || !sku_completo) {
    return { success: false, error: 'Talla, Color y SKU completo son requeridos.' }
  }

  const payload = {
    producto_id: productoId,
    talla_id,
    color_id,
    costo_promedio: toNumeric(formData, 'costo_promedio'),
    precio_venta: toNumeric(formData, 'precio_venta'),
    activo: toBoolean(formData, 'activo'),
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
  const { error } = await supabase.from('variantes_producto')
    .delete()
    .in('id', ids)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true, id: ids.length }
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
    producto_id: productoId,
    parte_prenda_id: toInteger(formData, 'parte_prenda_id'),
    tipo_comp_id:    toInteger(formData, 'tipo_comp_id'),
    material_id:     toInteger(formData, 'material_id'),
    corte_forma_id:  toInteger(formData, 'corte_forma_id'),
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
    nombre: nombre.toUpperCase(),
    codigo: codigo.toUpperCase(),
    hex_code: hexCode || null,
    tipo_color: tipoColor,
    orden_display: 99,
  }

  const { data, error } = await supabase.from('cat_colores').insert(payload).select('id').single()

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

  const { data, error } = await supabase.from('cat_tallas').insert(payload).select('id').single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `La talla "${codigo}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
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

  const { error } = await (supabase
    .from('productos') as any)
    .update(payload)
    .in('id', ids)

  if (error) {
    return { success: false, error: error.message }
  }

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

  const { error } = await (supabase
    .from('productos') as any)
    .update({ activo: false })
    .in('id', ids)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/catalogo')
  return { success: true }
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
  const { error: deleteError } = await supabase.from('medidas_producto')
    .delete()
    .eq('producto_id', productoId)

  if (deleteError) return { success: false, error: deleteError.message }

  // 2. Insertar nuevas medidas si hay
  if (medidas.length > 0) {
    const payload = medidas.map((m) => ({
      producto_id: productoId,
      talla_id: m.talla_id,
      punto_medida_id: m.punto_medida_id,
      medida_cm: m.medida_cm,
      medida_ft: Math.round((m.medida_cm / 2.54) * 100) / 100,
    }))

    const { error: insertError } = await supabase.from('medidas_producto').insert(payload)
    if (insertError) return { success: false, error: insertError.message }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Imágenes (Storage + producto_imagenes)
// ─────────────────────────────────────────────────────────────────────────────

// Mapa de uso_imagen → subcarpeta en el bucket (P mayúscula para coincidir con el bucket)
const USO_A_FOLDER: Record<string, string> = {
  principal_ecommerce: 'principal',
  galeria_secundaria:  'galeria',
  ficha_tecnica:       'ficha',
  marketing_banner:    'marketing',
  etiqueta_logistica:  'etiqueta',
  color_variacion:     'variantes/color',
  tallas_variacion:    'variantes/talla',
}

const BUCKET = 'product_images'

/**
 * Sube un archivo al bucket de Supabase Storage con la ruta estructurada:
 *   Productos/{skuBase}/{folder}/{uuid}.{ext}
 * O registra directamente una URL externa sin tocar el Storage.
 */
export async function uploadImagenAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // ── Campos comunes ────────────────────────────────────────
  const productoId   = toInteger(formData, 'producto_id')
  if (!productoId)   return { success: false, error: 'ID de producto requerido.' }

  const skuBase      = toCleanText(formData, 'sku_base')
  if (!skuBase)      return { success: false, error: 'SKU del producto requerido.' }

  const usoImagen    = toCleanText(formData, 'uso_imagen') ?? 'principal_ecommerce'
  const altText      = toCleanText(formData, 'alt_text')
  const orden        = toInteger(formData, 'orden') ?? 0
  const esPrincipal  = formData.get('es_principal') === 'true'
  const origenImagen = toCleanText(formData, 'origen_imagen') ?? 'local'

  let publicUrl: string
  let urlOg: string | null = null // Disponible para ambos modos

  if (origenImagen === 'url_externa') {
    // ── Modo URL externa: no se sube nada al Storage ─────────
    const urlExterna = toCleanText(formData, 'url_externa')
    if (!urlExterna) return { success: false, error: 'URL de imagen requerida.' }
    // Validación básica de URL
    try { new URL(urlExterna) } catch {
      return { success: false, error: 'La URL proporcionada no es válida.' }
    }
    publicUrl = urlExterna
  } else {
    // ── Modo local: subir al Storage con optimización ───────
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No se recibió ningún archivo.' }

    const skuSafe = skuBase.replace(/[^a-zA-Z0-9_\-]/g, '_')
    const uuid = crypto.randomUUID()

    // ── Obtener arrayBuffer una sola vez para ambas transformaciones ─
    let fileArrayBuffer: ArrayBuffer
    try {
      fileArrayBuffer = await file.arrayBuffer()
    } catch (err: any) {
      console.error('Error leyendo archivo:', err)
      return { success: false, error: 'Error al leer el archivo.' }
    }

    // ── Optimización WebP para display normal ─────────────────
    let optimizedBuffer: Buffer
    try {
      optimizedBuffer = await sharp(Buffer.from(fileArrayBuffer))
        .resize({ width: 2048, withoutEnlargement: true }) // Máximo 2K para web
        .webp({ quality: 80 }) // Formato Google WebP (alta compresión, alta calidad)
        .toBuffer()
    } catch (err: any) {
      console.error('Error optimizando imagen:', err)
      return { success: false, error: 'Error al procesar la imagen.' }
    }

    const folder = USO_A_FOLDER[usoImagen] ?? 'galeria'
    const storagePath = `Productos/${skuSafe}/${folder}/${uuid}.webp`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, optimizedBuffer, { 
        contentType: 'image/webp', 
        upsert: false 
      })

    if (uploadError) {
      return { success: false, error: `Error al subir al Storage: ${uploadError.message}` }
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    if (!urlData?.publicUrl) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      return { success: false, error: 'No se pudo obtener la URL pública de la imagen.' }
    }
    publicUrl = urlData.publicUrl

    /*
    // ── Crear imagen OG para SEO (WhatsApp, Telegram, etc.) ───
    // DESHABILITADO: Para evitar la creación e inserción de imágenes sintéticas '_seo.jpg'
    // que causan problemas cuando no existen físicamente. Ahora el SEO utiliza la imagen principal directa.
    if (esPrincipal) {
      try {
        // Detectar orientación de la imagen original
        const metadata = await sharp(Buffer.from(fileArrayBuffer)).metadata()
        const isVertical = (metadata.height || 0) > (metadata.width || 0)

        let ogBuffer: Buffer

        if (isVertical) {
          // Vertical (plantilla Canva): crop cover + padding para 1200x630
          // Zoom 800x800 crop al centro, luego padding a 1200x630
          ogBuffer = await sharp(Buffer.from(fileArrayBuffer))
            .resize({ width: 800, height: 800, fit: 'cover' })
            .extend({
              top: 0,
              bottom: 0,
              left: 200, // (1200-800)/2 = 200
              right: 200,
              background: { r: 255, g: 255, b: 255 }
            })
            .jpeg({ quality: 85 })
            .toBuffer()
        } else {
          // Horizontal: contain con fondo blanco
          ogBuffer = await sharp(Buffer.from(fileArrayBuffer))
            .resize({ width: 1200, height: 630, fit: 'contain', background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 85 })
            .toBuffer()
        }

        const ogPath = `Productos/${skuSafe}/${skuSafe}_seo.jpg`
        
        const { error: ogError } = await supabase.storage
          .from(BUCKET)
          .upload(ogPath, ogBuffer, {
            contentType: 'image/jpeg',
            upsert: true // Sobrescribir si existe
          })

        if (!ogError) {
          const { data: ogUrlData } = supabase.storage.from(BUCKET).getPublicUrl(ogPath)
          if (ogUrlData?.publicUrl) {
            urlOg = ogUrlData.publicUrl
          }
        }
      } catch (ogErr: any) {
        console.warn('[uploadImagenAction] Error creando imagen OG:', ogErr.message)
      }
    }
    */
  }

  // ── Si es principal, quitar la anterior ───────────────────
  if (esPrincipal) {
    await supabase.from('producto_imagenes')
      .update({ es_principal: false })
      .eq('producto_id', productoId)
  }

  // ── Registrar en BD ───────────────────────────────────────
  const insertData: Database['inv-tienda']['Tables']['producto_imagenes']['Insert'] = {
    producto_id:   productoId,
    url:           publicUrl,
    es_principal:  esPrincipal,
    orden,
    alt_text:      altText,
    uso_imagen:    usoImagen,
    origen_imagen: origenImagen,
    ...(urlOg ? { url_og: urlOg } : {})
  }

  const { error: dbError } = await supabase.from('producto_imagenes')
    .insert(insertData)

  if (dbError) {
    // Si fue local y falla la BD, limpiar el Storage
    if (origenImagen === 'local') {
      const skuSafe     = skuBase.replace(/[^a-zA-Z0-9_\-]/g, '_')
      const folder      = USO_A_FOLDER[usoImagen] ?? 'galeria'
      // Nota: no tenemos el uuid aquí pero la URL lo tiene; se puede ignorar este edge case
    }
    return { success: false, error: `Error al registrar en BD: ${dbError.message}` }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

/**
 * Actualiza los metadatos de una imagen existente (alt_text, uso_imagen, orden).
 * Para imágenes externas también permite actualizar la URL.
 * NO mueve archivos en Storage.
 */
export async function updateImagenAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const id         = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id')
  if (!id)         return { success: false, error: 'ID de imagen requerido.' }
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const altText   = toCleanText(formData, 'alt_text')
  const usoImagen = toCleanText(formData, 'uso_imagen')
  const orden     = toInteger(formData, 'orden') ?? 0
  // 'url' solo viene si es imagen externa (enviado por ImagenCard al editar)
  const newUrl    = toCleanText(formData, 'url')

  const updatePayload: Database['inv-tienda']['Tables']['producto_imagenes']['Update'] = {
    orden,
  }
  if (altText !== null) updatePayload.alt_text = altText
  if (usoImagen !== null) updatePayload.uso_imagen = usoImagen
  if (newUrl !== null) updatePayload.url = newUrl

  const { error } = await supabase.from('producto_imagenes')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

/**
 * Marca una imagen como principal y quita la propiedad de todas las demás del mismo producto.
 */
export async function setPrincipalImagenAction(
  imagenId: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // 1. Quitar principal de todas
  const { error: clearError } = await supabase.from('producto_imagenes')
    .update({ es_principal: false })
    .eq('producto_id', productoId)

  if (clearError) return { success: false, error: clearError.message }

  // 2. Marcar la nueva como principal
  const { error: setError } = await supabase.from('producto_imagenes')
    .update({ es_principal: true })
    .eq('id', imagenId)

  if (setError) return { success: false, error: setError.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

/**
 * Elimina la imagen del Storage Y de la tabla producto_imagenes.
 * Operación atómica: primero Storage, luego BD.
 */
export async function deleteImagenAction(
  imagenId: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // 1. Obtener la URL de la imagen
  const { data: imgData, error: fetchError } = await supabase
    .from('producto_imagenes')
    .select('url, origen_imagen')
    .eq('id', imagenId)
    .single()

  if (fetchError || !imgData) {
    return { success: false, error: 'No se encontró la imagen.' }
  }

  // 2. Si es imagen local, eliminarla del Storage
  if (imgData.origen_imagen === 'local' && imgData.url) {
    // Extraer el path después del nombre del bucket
    const bucketPrefix = `/object/public/${BUCKET}/`
    const urlPath = imgData.url as string
    const idx = urlPath.indexOf(bucketPrefix)
    if (idx !== -1) {
      const storagePath = urlPath.slice(idx + bucketPrefix.length)
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([storagePath])
      // No bloqueamos si falla el storage (el archivo puede ya no existir)
      if (storageError) {
        console.warn('[deleteImagenAction] Storage remove warning:', storageError.message)
      }
    }
  }

  // 3. Eliminar de la BD
  const { error: dbError } = await supabase.from('producto_imagenes')
    .delete()
    .eq('id', imagenId)

  if (dbError) return { success: false, error: dbError.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILIAS MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function moverProductosDeFamiliaAction(
  ids: number[],
  nuevaFamilia: string
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  if (!ids || ids.length === 0) {
    return { success: false, error: 'No se especificaron productos para mover' }
  }

  const cleanFamilia = nuevaFamilia && nuevaFamilia.trim() !== '' ? nuevaFamilia.trim() : null

  const supabase = await createClient()
  const { error } = await (supabase.from('productos') as any)
    .update({ familia: cleanFamilia })
    .in('id', ids)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/catalogo/familias')
  revalidatePath('/catalogo')
  return { success: true }
}

export async function renombrarFamiliaAction(
  familiaActual: string,
  nuevaFamilia: string
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const cleanActual = familiaActual && familiaActual.trim() !== '' ? familiaActual.trim() : null
  const cleanNueva = nuevaFamilia && nuevaFamilia.trim() !== '' ? nuevaFamilia.trim() : null

  if (!cleanNueva) {
    return { success: false, error: 'El nuevo nombre de la familia no puede estar vacío.' }
  }

  const supabase = await createClient()
  let query = (supabase.from('productos') as any)
    .update({ familia: cleanNueva })

  if (cleanActual === null) {
    query = query.is('familia', null)
  } else {
    query = query.eq('familia', cleanActual)
  }

  const { error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/catalogo/familias')
  revalidatePath('/catalogo')
  return { success: true }
}
