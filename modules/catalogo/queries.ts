// modules/catalogo/queries.ts
'use server'

import { cacheLife, cacheTag } from 'next/cache'
import { createClient, createStaticClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  FiltrosCatalogo, ResultadoListado, CatalogosParaFiltros, CatalogosEdicion,
  FKDescriptivas, TagResuelto, ComplementoResuelto,
  AcabadoResuelto, VarianteResuelta, MedidaResuelta,
  ConjuntoResuelto, CajaConDetalle, CajaContenidoMap,
} from './types'
import type {
  ProductoRow, ProductoWebRow, ProductoImagenRow,
  TipoPrendaRow, EdadRow, PersonaRow, MarcaRow, GeneroRow, TelaRow,
} from '@/lib/types/tables'

import { getCommercialScope } from '@/lib/dal'
import { buildCajaContenidoMap } from '@/modules/cajas/utils'

// ═══════════════════════════════════════════════════════════════
// LISTADO
// ═══════════════════════════════════════════════════════════════

export async function fetchProductosCatalogo(
  filtros: FiltrosCatalogo
): Promise<ResultadoListado> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const scope = await getCommercialScope()

  // ── Catálogos en paralelo (para filtros y lookup) ─────────
  const catalogos = await fetchCatalogosParaFiltros()

  // ── Query principal ───────────────────────────────────────
  let query = supabase
    .from('productos')
    .select(
      'id, sku_base, nombre, descripcion, familia, estado, precio_ec, pz_en_caja, activo, destacado, es_conjunto, marca_id, genero_id, tela_ext_id, cliente_b2b_id, persona_id',
      { count: 'exact' }
    )

  // Aplicar filtro de alcance comercial para no-superadmins
  if (!scope.is_super_admin) {
    const clauses: string[] = []
    if (scope.allowed_cliente_ids.length > 0) {
      clauses.push(`cliente_b2b_id.in.(${scope.allowed_cliente_ids.join(',')})`)
    }
    if (scope.allowed_proveedor_ids.length > 0) {
      clauses.push(`persona_id.in.(${scope.allowed_proveedor_ids.join(',')})`)
    }
    // Incluir también los productos generales sin cliente específico asignado (marca libre)
    clauses.push('cliente_b2b_id.is.null')

    query = query.or(clauses.join(','))
  }

  // ── Filtro: búsqueda texto (SKU o descripción) ────────────
  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`sku_base.ilike.${term},descripcion.ilike.${term}`)
  }

  // ── Filtro: estado ────────────────────────────────────────
  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }

  // ── Filtro: marca ─────────────────────────────────────────
  if (filtros.marca_id) {
    query = query.eq('marca_id', filtros.marca_id)
  }

  // ── Filtro: género ────────────────────────────────────────
  if (filtros.genero_id) {
    query = query.eq('genero_id', filtros.genero_id)
  }

  // ── Filtro: destacados ────────────────────────────────────
  // Checkbox OFF (default): sin filtro, muestra todos
  // Checkbox ON: solo productos con destacado = true
  if (filtros.destacados === true) {
    query = query.eq('destacado', true)
  }

  // ── Filtro: activos / incluir no activos ──────────────────
  // Checkbox OFF (default): solo activo = true
  // Checkbox ON: sin filtro de activo (muestra todos)
  if (filtros.incluir_inactivos !== true) {
    query = query.eq('activo', true)
  }

  // ── Ordenamiento y paginación ─────────────────────────────
  const sortBy = filtros.sort_by ?? 'id'
  const ascending = filtros.order === 'asc'
  query = query
    .order(sortBy, { ascending })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchProductosCatalogo:', error)
    return { productos: [], total: 0, catalogos }
  }

  // Obtener imágenes principales
  const productoIds = (data || []).map((p: any) => p.id)
  let imagenesMap: Record<number, string> = {}
  if (productoIds.length > 0) {
    const { data: imagenes } = await supabase
      .from('producto_imagenes')
      .select('producto_id, url')
      .eq('es_principal', true)
      .in('producto_id', productoIds)
    imagenesMap = (imagenes || []).reduce((acc: any, img: any) => {
      acc[img.producto_id] = img.url
      return acc
    }, {})
  }

  const productos = (data ?? []).map((p: any) => ({
    ...p,
    imagen_principal: imagenesMap[p.id] || null,
  }))

  return {
    productos,
    total: count ?? 0,
    catalogos,
  }
}

export async function fetchCatalogosParaFiltros(): Promise<CatalogosParaFiltros> {
  'use cache'
  cacheLife('hours')
  cacheTag('catalogo-filtros')

  const supabase = createStaticClient()

  const [marcasRes, generosRes, telasRes] = await Promise.all([
    supabase
      .from('cat_marcas')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('cat_generos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('cat_telas')
      .select('id, nombre')
      .order('nombre'),
  ])

  return {
    marcas: (marcasRes.data ?? []) as MarcaRow[],
    generos: (generosRes.data ?? []) as GeneroRow[],
    telas: (telasRes.data ?? []) as TelaRow[],
  }
}

/**
 * Todos los catálogos de FK necesarios para el formulario de edición
 * del Hero de producto (marca, género, tipo de prenda, edad, telas, personas).
 */
export async function fetchCatalogosEdicion(): Promise<CatalogosEdicion> {
  const supabase = await createClient()

  const [
    marcasRes, generosRes, telasRes, tiposRes, edadesRes, personasRes,
    tiposTagRes, refTagsRes, partesRes, compTiposRes, corteFormasRes, acaTiposRes, acaDetRes, acaPatRes, locaRes,
    tallasRes, coloresRes
  ] = await Promise.all([
    supabase.from('cat_marcas').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('cat_generos').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('cat_telas').select('id, nombre').order('nombre'),
    supabase.from('cat_tipo_prenda').select('id, nombre').order('nombre'),
    supabase.from('cat_edades').select('id, rango').order('orden'),
    supabase.from('personas').select('id, nombre_completo').order('nombre_completo'),

    // Para Tabs
    supabase.from('tipo_tag').select('id, nombre, es_multiple').eq('activo', true).order('nombre'),
    supabase.from('ref_tag').select('id, nombre, tipo_tag_id').eq('activo', true).order('nombre'),
    supabase.from('parte_prenda_comp').select('id, nombre').order('nombre'),
    supabase.from('tipo_comp').select('id, nombre, complemento_en').order('nombre'),
    supabase.from('corte_forma_comp').select('id, nombre, corte_forma_en').order('nombre'),
    supabase.from('tipo_acabado').select('id, nombre').order('nombre'),
    supabase.from('detalle_acabado').select('id, nombre').order('nombre'),
    supabase.from('patron_acabado').select('id, estampado_patron').order('estampado_patron'),
    supabase.from('localizacion_acabado').select('id, nombre').order('nombre'),
    supabase.from('cat_tallas').select('id, nombre, codigo').order('orden'),
    supabase.from('cat_colores').select('id, nombre, codigo').order('nombre'),
  ])

  const mapToCatalogo = (data: any[] | null) => (data ?? []) as any[]

  return {
    marcas:       mapToCatalogo(marcasRes.data),
    generos:      mapToCatalogo(generosRes.data),
    telas:        mapToCatalogo(telasRes.data),
    tipos_prenda: mapToCatalogo(tiposRes.data),
    edades: (edadesRes.data ?? []).map((e: any) => ({
      id: e.id,
      nombre: e.rango ?? String(e.id),
    })),
    personas: (personasRes.data ?? []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre_completo,
    })),

    tipos_tag:    (tiposTagRes.data ?? []) as { id: number; nombre: string; es_multiple: boolean | null }[],
    ref_tags:     (refTagsRes.data ?? []) as { id: number; nombre: string; tipo_tag_id: number }[],
    partes:       mapToCatalogo(partesRes.data),
    componente_tipos: (compTiposRes.data ?? []) as { id: number; nombre: string; complemento_en: string | null }[],
    corte_formas: (corteFormasRes.data ?? []) as { id: number; nombre: string; corte_forma_en: string | null }[],
    materiales:   mapToCatalogo(telasRes.data),
    acabado_tipos:    mapToCatalogo(acaTiposRes.data),
    acabado_detalles: mapToCatalogo(acaDetRes.data),
    acabado_patrones: (acaPatRes.data ?? []).map((p: any) => ({
      id: p.id,
      nombre: p.estampado_patron ?? 'Sin nombre',
    })),
    localizaciones:   mapToCatalogo(locaRes.data),
    tallas:           (tallasRes.data ?? []) as { id: number; nombre: string; codigo: string }[],
    colores:          (coloresRes.data ?? []) as { id: number; nombre: string; codigo: string }[],
  }
}

// ═══════════════════════════════════════════════════════════════
// DETALLE
// ═══════════════════════════════════════════════════════════════

export async function fetchProductoPorId(
  id: number
): Promise<ProductoRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  const row = data as any
  return {
    ...data,
    cliente_b2b_id: row.cliente_b2b_id ?? null,
  } as unknown as ProductoRow
}

export async function fetchFKDescriptivas(
  producto: ProductoRow
): Promise<FKDescriptivas> {
  const supabase = await createClient()

  const [marca, genero, edad, tipo_prenda, tela_forro, tela_ext, persona] =
    await Promise.all([
      producto.marca_id
        ? supabase.from('cat_marcas').select('nombre').eq('id', producto.marca_id).single()
        : { data: null },
      producto.genero_id
        ? supabase.from('cat_generos').select('nombre').eq('id', producto.genero_id).single()
        : { data: null },
      producto.edad_id
        ? supabase.from('cat_edades').select('rango').eq('id', producto.edad_id).single()
        : { data: null },
      producto.tipo_prenda_id
        ? supabase.from('cat_tipo_prenda').select('nombre').eq('id', producto.tipo_prenda_id).single()
        : { data: null },
      producto.tela_forro_id
        ? supabase.from('cat_telas').select('nombre').eq('id', producto.tela_forro_id).single()
        : { data: null },
      producto.tela_ext_id
        ? supabase.from('cat_telas').select('nombre').eq('id', producto.tela_ext_id).single()
        : { data: null },
      producto.persona_id
        ? supabase.from('personas').select('nombre_completo').eq('id', producto.persona_id).single()
        : { data: null },
    ])

  return {
    marca: marca.data?.nombre ?? null,
    genero: genero.data?.nombre ?? null,
    edad: edad.data?.rango ?? null,
    tipo_prenda: tipo_prenda.data?.nombre ?? null,
    tela_forro: tela_forro.data?.nombre ?? null,
    tela_exterior: tela_ext.data?.nombre ?? null,
    persona: persona.data?.nombre_completo ?? null,
  }
}

export async function fetchProductoWeb(
  productoId: number
): Promise<ProductoWebRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('productos_web')
    .select('*')
    .eq('producto_id', productoId)
    .single()
  return data
}

export async function fetchImagenesProducto(
  productoId: number
): Promise<ProductoImagenRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('producto_imagenes')
    .select('*')
    .eq('producto_id', productoId)
    .order('es_principal', { ascending: false })
    .order('orden')
  return data ?? []
}

export async function fetchCajasProducto(
  productoId: number
): Promise<CajaConDetalle[]> {
  const supabase = await createClient()

  const { data: cajas } = await supabase
    .from('cajas_producto')
    .select('*')
    .eq('producto_id', productoId)
    .or('activo.is.null,activo.eq.true')
    .order('codigo_caja')

  if (!cajas || cajas.length === 0) return []

  const cajasConDetalle: CajaConDetalle[] = []

  for (const caja of cajas) {
    const { data: detalles } = await supabase
      .from('caja_detalles')
      .select(`
        *,
        talla:cat_tallas!caja_detalles_talla_id_fkey ( codigo, nombre ),
        color:cat_colores!caja_detalles_color_id_fkey ( nombre, hex_code )
      `)
      .eq('caja_id', caja.id)

    const detallesResueltos = (detalles ?? []).map((d: any) => ({
      ...d,
      talla_codigo: d.talla?.codigo ?? null,
      talla_nombre: d.talla?.nombre ?? null,
      color_nombre: d.color?.nombre ?? null,
      color_hex: d.color?.hex_code ?? null,
    }))

    const contenidoMap = buildCajaContenidoMap(detallesResueltos)

    cajasConDetalle.push({
      ...caja,
      detalles: detallesResueltos,
      contenidoMap,
    })
  }

  return cajasConDetalle
}


export async function fetchTagsProducto(
  productoId: number
): Promise<TagResuelto[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('producto_tags').select(`
      id, valor_texto, tipo_tag_id, ref_tag_id,
      tipo_tag:tipo_tag!producto_tags_tipo_tag_id_fkey ( nombre, codigo ),
      ref_tag:ref_tag!producto_tags_ref_tag_id_fkey ( nombre, codigo )
    `)
    .eq('producto_id', productoId)

  return (data ?? []).map((d: any) => ({
    id: d.id,
    tipo_tag_id: d.tipo_tag_id,
    tipo_tag_nombre: d.tipo_tag?.nombre ?? null,
    tipo_tag_codigo: d.tipo_tag?.codigo ?? null,
    ref_tag_id: d.ref_tag_id,
    ref_tag_nombre: d.ref_tag?.nombre ?? null,
    ref_tag_codigo: d.ref_tag?.codigo ?? null,
    valor_texto: d.valor_texto,
  }))
}

export async function fetchComplementosProducto(
  productoId: number
): Promise<ComplementoResuelto[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('complemento_producto').select(`
      id, descripcion_adicional, 
      parte_prenda_id, tipo_comp_id, material_id, corte_forma_id,
      parte:parte_prenda_comp!complemento_producto_parte_prenda_id_fkey ( nombre ),
      tipo:tipo_comp!complemento_producto_tipo_comp_id_fkey ( nombre ),
      material:cat_telas!complemento_producto_material_id_fkey ( nombre ),
      corte:corte_forma_comp!complemento_producto_corte_forma_id_fkey ( nombre )
    `)
    .eq('producto_id', productoId)

  return (data ?? []).map((d: any) => ({
    id: d.id,
    parte_prenda_id: d.parte_prenda_id,
    parte_prenda: d.parte?.nombre ?? null,
    tipo_comp_id: d.tipo_comp_id,
    tipo_complemento: d.tipo?.nombre ?? null,
    material_id: d.material_id,
    material: d.material?.nombre ?? null,
    corte_forma_id: d.corte_forma_id,
    corte_forma: d.corte?.nombre ?? null,
    descripcion_adicional: d.descripcion_adicional,
  }))
}

export async function fetchAcabadosProducto(
  productoId: number
): Promise<AcabadoResuelto[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('acabado_producto').select(`
      id, tipo_acabado_id, detalle_acabado_id, patron_acabado_id, localizacion_id,
      tipo:tipo_acabado!acabado_producto_tipo_acabado_id_fkey ( nombre ),
      detalle:detalle_acabado!acabado_producto_detalle_acabado_id_fkey ( nombre ),
      patron:patron_acabado!acabado_producto_patron_acabado_id_fkey ( estampado_patron ),
      localizacion:localizacion_acabado!acabado_producto_localizacion_id_fkey ( nombre )
    `)
    .eq('producto_id', productoId)

  return (data ?? []).map((d: any) => ({
    id: d.id,
    tipo_acabado_id: d.tipo_acabado_id,
    tipo_acabado: d.tipo?.nombre ?? null,
    detalle_acabado_id: d.detalle_acabado_id,
    detalle: d.detalle?.nombre ?? null,
    patron_acabado_id: d.patron_acabado_id,
    patron: d.patron?.estampado_patron ?? null,
    localizacion_id: d.localizacion_id,
    localizacion: d.localizacion?.nombre ?? null,
  }))
}

export async function fetchVariantesProducto(
  productoId: number
): Promise<VarianteResuelta[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('variantes_producto').select(`
      id, sku_completo, costo_promedio, precio_venta, activo,
      talla_id, color_id,
      talla:cat_tallas!variantes_producto_talla_id_fkey ( codigo, nombre ),
      color:cat_colores!variantes_producto_color_id_fkey ( nombre, hex_code )
    `)
    .eq('producto_id', productoId)

  return (data ?? []).map((d: any) => ({
    id: d.id,
    sku_completo: d.sku_completo,
    talla_id: d.talla_id,
    talla_codigo: d.talla?.codigo ?? null,
    talla_nombre: d.talla?.nombre ?? null,
    color_id: d.color_id,
    color_nombre: d.color?.nombre ?? null,
    color_hex: d.color?.hex_code ?? null,
    costo_promedio: d.costo_promedio,
    precio_venta: d.precio_venta,
    activo: d.activo,
  }))
}

export async function fetchMedidasProducto(
  productoId: number
): Promise<MedidaResuelta[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('medidas_producto').select(`
      id, medida_cm, medida_ft,
      talla:cat_tallas!medidas_producto_talla_id_fkey ( codigo ),
      punto:puntos_medida!medidas_producto_punto_medida_id_fkey ( punto_medida, clasificacion )
    `)
    .eq('producto_id', productoId)

  return (data ?? []).map((d: any) => ({
    id: d.id,
    talla_codigo: d.talla?.codigo ?? null,
    punto_medida: d.punto?.punto_medida ?? null,
    clasificacion: d.punto?.clasificacion ?? null,
    medida_cm: d.medida_cm,
    medida_ft: d.medida_ft,
  }))
}

export async function fetchConjuntoProducto(
  productoId: number
): Promise<ConjuntoResuelto[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('producto_conjunto').select(`
      id, producto_hijo_id, cantidad, es_requerido, orden,
      hijo:productos!producto_conjunto_producto_hijo_id_fkey (
        id, sku_base, nombre
      )
    `)
    .eq('producto_padre_id', productoId)
    .order('orden')

  if (!data) return []

  const resultados: ConjuntoResuelto[] = []

  for (const d of data as any[]) {
    const hijo = d.hijo
    let imagen: string | null = null

    if (hijo?.id) {
      const { data: img } = await supabase
        .from('producto_imagenes')
        .select('url')
        .eq('producto_id', hijo.id)
        .eq('es_principal', true)
        .limit(1)
        .single()
      imagen = img?.url ?? null
    }

    resultados.push({
      id: d.id,
      producto_hijo_id: d.producto_hijo_id,
      hijo_sku: hijo?.sku_base ?? '—',
      hijo_nombre: hijo?.nombre ?? null,
      hijo_imagen: imagen,
      cantidad: d.cantidad,
      es_requerido: d.es_requerido,
      orden: d.orden,
    })
  }

  return resultados
}

export async function fetchNavegacionProducto(
  productoId: number
) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('fn_navegar_producto', {
    p_producto_id: productoId,
  })

  if (!data || (Array.isArray(data) && data.length === 0)) return null
  return Array.isArray(data) ? data[0] : data
}

export async function fetchProductoPorIdParaEdicion(
  id: number
): Promise<ProductoRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single()
  if (!data) return null
  const row = data as any
  return {
    ...data,
    cliente_b2b_id: row.cliente_b2b_id ?? null,
  } as unknown as ProductoRow
}

// ═══════════════════════════════════════════════════════════════
// AUDITORÍA
// ═══════════════════════════════════════════════════════════════

export interface AuditoriaProductoRow {
  id: number
  productoid: number
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  campos_modificados: string[]
  datos_anteriores: Record<string, any> | null
  datos_nuevos: Record<string, any> | null
  fechaauditoria: string
  usuarios: { nombrecompleto: string } | null
}

export async function fetchAuditoriaProducto(
  productoId: number
): Promise<AuditoriaProductoRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema('inv-tienda')
    .from('v_auditoria_productos' as any)
    .select(`
      id,
      productoid,
      accion,
      campos_modificados,
      datos_anteriores,
      datos_nuevos,
      fechaauditoria,
      usuarionombre
    `)
    .eq('productoid', productoId)
    .order('fechaauditoria', { ascending: false })

  if (error) {
    console.error('fetchAuditoriaProducto error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      productoId,
    })
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    usuarios: row.usuarionombre ? { nombrecompleto: row.usuarionombre } : null,
  }))
}

export interface AuditoriaGeneralRow {
  id: number
  productoid: number
  sku_base: string
  productonombre: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  campos_modificados: string[]
  datos_anteriores: Record<string, any> | null
  datos_nuevos: Record<string, any> | null
  fechaauditoria: string
  usuarionombre: string | null
}

export async function fetchAuditoriaGeneral(
  limit: number = 100
): Promise<AuditoriaGeneralRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .schema('inv-tienda')
    .from('v_auditoria_productos' as any)
    .select('*')
    .limit(limit)

  if (error) {
    console.error('fetchAuditoriaGeneral error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      limit,
    })
    return []
  }

  return (data as any) ?? []
}

export async function fetchPuntosMedida() {
  const supabase = await createClient()
  const { data } = await supabase.from('puntos_medida').select('id, punto_medida, size_inch, position, clasificacion').order('punto_medida')
  return data ?? []
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILIAS
// ─────────────────────────────────────────────────────────────────────────────

export interface FamiliaResumenSku {
  id: number
  sku_base: string
  descripcion: string | null
  activo?: boolean | null
}

export interface FamiliaResumen {
  familia: string | null
  total_productos: number
  es_codigo_raw: boolean
  descripcion: string | null
  skus?: FamiliaResumenSku[]
}

export async function fetchResumenFamilias(): Promise<FamiliaResumen[]> {
  const supabase = await createClient()

  // Obtenemos id, familia, descripcion, sku_base y activo para el cliente 27 (Andrés Mendoza)
  const { data, error } = await supabase.from('productos')
    .select('id, familia, descripcion, sku_base, activo')
    .eq('cliente_b2b_id' as any, 27)

  if (error) {
    console.error('Error fetchResumenFamilias:', error)
    return []
  }

  const conteos: Record<string, number> = {}
  const descripciones: Record<string, string | null> = {}
  const skusPorFamilia: Record<string, FamiliaResumenSku[]> = {}
  let countNull = 0

  for (const p of data || []) {
    if (p.familia) {
      conteos[p.familia] = (conteos[p.familia] || 0) + 1
      if (!descripciones[p.familia] && p.descripcion) {
        descripciones[p.familia] = p.descripcion
      }
      if (!skusPorFamilia[p.familia]) {
        skusPorFamilia[p.familia] = []
      }
      if (p.sku_base) {
        skusPorFamilia[p.familia].push({
          id: p.id,
          sku_base: p.sku_base,
          descripcion: p.descripcion || null,
          activo: p.activo
        })
      }
    } else {
      countNull++
    }
  }

  const res: FamiliaResumen[] = Object.entries(conteos).map(([familia, count]) => {
    // Detectar si cumple el patrón F000-000A, F000-000B, etc.
    const es_codigo_raw = /^F[0-9]{3}-[0-9]{3}[A-Z]$/i.test(familia)
    return {
      familia,
      total_productos: count,
      es_codigo_raw,
      descripcion: descripciones[familia] || null,
      skus: skusPorFamilia[familia] || [],
    }
  })

  if (countNull > 0) {
    res.push({
      familia: null,
      total_productos: countNull,
      es_codigo_raw: false,
      descripcion: 'Productos sin familia asignada',
      skus: (data || [])
        .filter((p: any) => !p.familia && p.sku_base)
        .map((p: any) => ({
          id: p.id,
          sku_base: p.sku_base,
          descripcion: p.descripcion || null,
          activo: p.activo
        })),
    })
  }

  return res.sort((a, b) => {
    // Colocar códigos raw primero
    if (a.es_codigo_raw !== b.es_codigo_raw) {
      return a.es_codigo_raw ? -1 : 1
    }
    const nameA = a.familia || ''
    const nameB = b.familia || ''
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
  })
}

export async function fetchProductosPorFamilia(
  familia: string | null
): Promise<(ProductoRow & { imagen_principal: string | null })[]> {
  const supabase = await createClient()

  let query = supabase.from('productos')
    .select('id, sku_base, nombre, descripcion, familia, precio_ec, pz_en_caja, activo')
    .eq('cliente_b2b_id' as any, 27)

  if (familia === null) {
    query = query.is('familia', null)
  } else {
    query = query.eq('familia', familia)
  }

  const { data, error } = await query.order('sku_base')

  if (error) {
    console.error('Error fetchProductosPorFamilia:', error)
    return []
  }

  const productos = data || []
  if (productos.length === 0) return []

  const ids = productos.map((p: any) => p.id)

  const { data: imagenes } = await supabase.from('producto_imagenes')
    .select('producto_id, url')
    .eq('es_principal', true)
    .in('producto_id', ids)

  const imagenesMap = (imagenes || []).reduce((acc: Record<number, string>, img: any) => {
    acc[img.producto_id] = img.url
    return acc
  }, {})

  return productos.map((p: any) => ({
    ...p,
    imagen_principal: imagenesMap[p.id] || null,
  }))
}
