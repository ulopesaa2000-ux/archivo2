// modules/ecommerce/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  ConfigEcommerce,
  ProductoWebExtendido,
  ProductoWebPublico,
  OrdenVentaResumen,
  OrdenVentaDetalle,
  OrdenItemExtendido,
  VariantePublica,
  FiltrosProductoWeb,
  FiltrosOrdenesVenta,
} from './types'

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════

export async function fetchConfigEcommerce(): Promise<ConfigEcommerce | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('config_ecommerce')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.error('Error fetchConfigEcommerce:', error)
    return null
  }

  return data as ConfigEcommerce
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS WEB (ADMIN)
// ═══════════════════════════════════════════════════════════════

export async function fetchProductosWebAdmin(
  filtros: FiltrosProductoWeb
): Promise<{ productos: ProductoWebExtendido[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query con todos los joins necesarios
  let query = (supabase
    .from('productos_web') as any)
    .select(
      `
      *,
      productos!inner(
        sku_base,
        nombre,
        descripcion,
        marca_id,
        genero_id,
        tipo_prenda_id,
        pz_en_caja,
        composicion,
        activo,
        cat_marcas!left(nombre),
        cat_tipo_prenda!left(nombre),
        cat_generos!left(nombre)
      )
      `,
      { count: 'exact' }
    )

  // Filtros
  if (filtros.activo !== undefined) {
    query = query.eq('activo', filtros.activo)
  }
  if (filtros.en_oferta) {
    query = query.eq('en_oferta', true)
  }
  if (filtros.destacado) {
    query = query.eq('destacado', true)
  }
  if (filtros.nuevo) {
    query = query.eq('nuevo', true)
  }
  if (filtros.marca_id) {
    query = query.eq('productos.marca_id', filtros.marca_id)
  }
  if (filtros.tipo_prenda_id) {
    query = query.eq('productos.tipo_prenda_id', filtros.tipo_prenda_id)
  }
  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`slug.ilike.${term},productos.nombre.ilike.${term},productos.sku_base.ilike.${term}`)
  }

  // Ordenamiento y paginación
  query = query
    .order('orden_display', { ascending: true })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchProductosWebAdmin:', error)
    return { productos: [], total: 0 }
  }

  // Transformar datos
  const productos: ProductoWebExtendido[] = (data || []).map((item: any) => ({
    ...item,
    sku_base: item.productos?.sku_base,
    nombre: item.productos?.nombre,
    descripcion: item.productos?.descripcion,
    marca_id: item.productos?.marca_id,
    genero_id: item.productos?.genero_id,
    tipo_prenda_id: item.productos?.tipo_prenda_id,
    pz_en_caja: item.productos?.pz_en_caja,
    composicion: item.productos?.composicion,
    marca_nombre: item.cat_marcas?.nombre,
    tipo_prenda_nombre: item.cat_tipo_prenda?.nombre,
    genero_nombre: item.cat_generos?.nombre,
  }))

  return {
    productos,
    total: count ?? 0,
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS NO PUBLICADOS (para admin)
// ═══════════════════════════════════════════════════════════════

export async function fetchProductosNoPublicados(): Promise<
  { id: number; sku_base: string; nombre: string; marca: string | null }[]
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos')
    .select('id, sku_base, nombre, cat_marcas(nombre)')
    .eq('activo', true)
    .eq('estado', 'publicado')
    .not('id', 'in', (
      supabase.from('productos_web').select('producto_id')
    ))
    .order('sku_base')

  if (error) {
    console.error('Error fetchProductosNoPublicados:', error)
    return []
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    sku_base: p.sku_base,
    nombre: p.nombre,
    marca: p.cat_marcas?.nombre,
  }))
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS WEB PÚBLICOS (STORE)
// ═══════════════════════════════════════════════════════════════

export async function fetchProductosWebPublicos(
  filtros: FiltrosProductoWeb
): Promise<{ productos: ProductoWebPublico[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = (supabase
    .from('productos_web') as any)
    .select(
      `
      id,
      slug,
      producto_id,
      precio_publico,
      precio_oferta,
      en_oferta,
      destacado,
      nuevo,
      modo_override,
      unidad_venta,
      productos!inner(
        sku_base,
        nombre,
        descripcion,
        marca_id,
        genero_id,
        tipo_prenda_id,
        cat_marcas!left(nombre),
        cat_tipo_prenda!left(nombre),
        cat_generos!left(nombre)
      )
      `,
      { count: 'exact' }
    )
    .eq('activo', true)
    .eq('productos.activo', true)

  // Filtros públicos
  if (filtros.en_oferta) {
    query = query.eq('en_oferta', true)
  }
  if (filtros.destacado) {
    query = query.eq('destacado', true)
  }
  if (filtros.nuevo) {
    query = query.eq('nuevo', true)
  }
  if (filtros.marca_id) {
    query = query.eq('productos.marca_id', filtros.marca_id)
  }
  if (filtros.tipo_prenda_id) {
    query = query.eq('productos.tipo_prenda_id', filtros.tipo_prenda_id)
  }
  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`slug.ilike.${term},productos.nombre.ilike.${term}`)
  }

  query = query
    .order('orden_display', { ascending: true })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchProductosWebPublicos:', error)
    return { productos: [], total: 0 }
  }

  // Obtener imágenes principales
  const productoIds = (data || []).map((p: any) => p.producto_id)

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

  const productos: ProductoWebPublico[] = (data || []).map((item: any) => ({
    id: item.id,
    slug: item.slug,
    producto_id: item.producto_id,
    sku_base: item.productos?.sku_base,
    nombre: item.productos?.descripcion || item.productos?.nombre || item.titulo_seo || 'Producto',
    descripcion: item.productos?.descripcion,
    precio_publico: item.precio_publico,
    precio_oferta: item.precio_oferta,
    en_oferta: item.en_oferta,
    destacado: item.destacado,
    nuevo: item.nuevo,
    marca: item.cat_marcas?.nombre,
    tipo_prenda: item.cat_tipo_prenda?.nombre,
    genero: item.cat_generos?.nombre,
    imagen_principal: imagenesMap[item.producto_id] || null,
    modo_override: item.modo_override,
    unidad_venta: item.unidad_venta,
  }))

  return {
    productos,
    total: count ?? 0,
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTO POR SLUG (PDP)
// ═══════════════════════════════════════════════════════════════

export async function fetchProductoWebBySlug(
  slug: string
): Promise<ProductoWebPublico | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos_web')
    .select(
      `
      *,
      productos!inner(
        sku_base,
        nombre,
        descripcion,
        composicion,
        tela_ext_id,
        tela_forro_id,
        activo,
        cat_marcas!left(nombre),
        cat_tipo_prenda!left(nombre),
        cat_generos!left(nombre),
        tela_ext:cat_telas!productos_tela_ext_id_fkey(nombre),
        tela_forro:cat_telas!productos_tela_forro_id_fkey(nombre)
      )
      `
    )
    .eq('slug', decodeURIComponent(slug))
    .eq('activo', true)
    .eq('productos.activo', true)
    .single()

  if (error || !data) {
    console.error('Error fetchProductoWebBySlug:', error)
    return null
  }

  // Obtener imagen principal
  const { data: imagen } = await supabase
    .from('producto_imagenes')
    .select('url')
    .eq('producto_id', data.producto_id)
    .eq('es_principal', true)
    .single()

  // Incrementar visitas
  await supabase
    .from('productos_web')
    .update({ visitas: (data.visitas || 0) + 1 })
    .eq('id', data.id)

  const prod = data.productos as any

  return {
    id: data.id,
    slug: data.slug,
    producto_id: data.producto_id,
    sku_base: prod?.sku_base,
    nombre: prod?.descripcion || prod?.nombre || data.titulo_seo || 'Producto sin nombre',
    descripcion: prod?.descripcion,
    composicion: prod?.composicion ?? null,
    descripcion_seo: data.descripcion_seo ?? null,
    precio_publico: data.precio_publico,
    precio_oferta: data.precio_oferta,
    en_oferta: data.en_oferta,
    destacado: data.destacado,
    nuevo: data.nuevo,
    marca: prod?.cat_marcas?.nombre ?? null,
    tipo_prenda: prod?.cat_tipo_prenda?.nombre ?? null,
    genero: prod?.cat_generos?.nombre ?? null,
    tela_exterior: prod?.tela_ext?.nombre ?? null,
    tela_forro: prod?.tela_forro?.nombre ?? null,
    keywords: data.keywords ?? null,
    imagen_principal: imagen?.url || null,
    modo_override: data.modo_override,
    unidad_venta: data.unidad_venta,
  } as ProductoWebPublico
}

// ═══════════════════════════════════════════════════════════════
// VARIANTES DE PRODUCTO (PDP)
// ═══════════════════════════════════════════════════════════════

export async function fetchVariantesProducto(
  productoId: number
): Promise<VariantePublica[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('variantes_producto')
    .select(
      `
      id, sku_completo, talla_id, color_id, activo,
      cat_tallas!variantes_producto_talla_id_fkey(id, codigo, orden),
      cat_colores!variantes_producto_color_id_fkey(id, nombre, hex_code)
      `
    )
    .eq('producto_id', productoId)
    .eq('activo', true)

  if (error) {
    console.error('Error fetchVariantesProducto:', error)
    return []
  }

  return (data || [])
    .map((v: any) => ({
      id: v.id,
      sku_completo: v.sku_completo,
      talla_id: v.talla_id,
      talla_codigo: v.cat_tallas?.codigo ?? null,
      talla_orden: v.cat_tallas?.orden ?? 999,
      color_id: v.color_id,
      color_nombre: v.cat_colores?.nombre ?? null,
      color_hex: v.cat_colores?.hex_code ?? null,
      activo: v.activo,
    }))
    .sort((a, b) => (a.talla_orden ?? 999) - (b.talla_orden ?? 999))
}

// ═══════════════════════════════════════════════════════════════
// IMÁGENES DE PRODUCTO (PDP)
// ═══════════════════════════════════════════════════════════════

export async function fetchImagenesProducto(
  productoId: number
): Promise<{ url: string; es_principal: boolean; orden: number }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('producto_imagenes')
    .select('url, es_principal, orden')
    .eq('producto_id', productoId)
    .order('orden', { ascending: true })

  if (error) {
    console.error('Error fetchImagenesProducto:', error)
    return []
  }

  return (data || []).map((img: any) => ({
    url: img.url,
    es_principal: img.es_principal || false,
    orden: img.orden || 0
  }))
}

// ═══════════════════════════════════════════════════════════════
// MEDIDAS DE PRODUCTO (PDP PÚBLICO)
// ═══════════════════════════════════════════════════════════════

export async function fetchMedidasPublicas(productoId: number): Promise<{
  puntos: string[]
  tallas: string[]
  tabla: Record<string, Record<string, number | null>>
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('medidas_producto')
    .select(`
      medida_cm,
      talla:cat_tallas!medidas_producto_talla_id_fkey(codigo, orden),
      punto:puntos_medida!medidas_producto_punto_medida_id_fkey(punto_medida)
    `)
    .eq('producto_id', productoId)

  if (error || !data || data.length === 0) return { puntos: [], tallas: [], tabla: {} }

  // Pivotar la data en JavaScript
  const tallasSet = new Map<string, number>()
  const puntosSet = new Set<string>()
  const tabla: Record<string, Record<string, number | null>> = {}

  for (const row of data as any[]) {
    const talla = row.talla?.codigo ?? '?'
    const orden = row.talla?.orden ?? 999
    const punto = row.punto?.punto_medida ?? '?'
    tallasSet.set(talla, Math.min(tallasSet.get(talla) ?? 999, orden))
    puntosSet.add(punto)
    if (!tabla[punto]) tabla[punto] = {}
    tabla[punto][talla] = row.medida_cm
  }

  const tallas = [...tallasSet.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([codigo]) => codigo)
  const puntos = [...puntosSet]

  return { puntos, tallas, tabla }
}

// ═══════════════════════════════════════════════════════════════
// ÓRDENES DE VENTA / COTIZACIONES (ADMIN)
// ═══════════════════════════════════════════════════════════════

export async function fetchOrdenesVenta(
  filtros: FiltrosOrdenesVenta
): Promise<{ ordenes: OrdenVentaResumen[]; total: number }> {
  const supabase = await createClient()
  const page = filtros.page ?? 1
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = (supabase
    .from('ordenes_venta') as any)
    .select('*', { count: 'exact' })

  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }
  if (filtros.fecha_desde) {
    query = query.gte('fecha_orden', filtros.fecha_desde)
  }
  if (filtros.fecha_hasta) {
    query = query.lte('fecha_orden', filtros.fecha_hasta)
  }
  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`numero_orden.ilike.${term},email_cliente.ilike.${term},nombre_cliente.ilike.${term}`)
  }

  query = query
    .order('fecha_orden', { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error('Error fetchOrdenesVenta:', error)
    return { ordenes: [], total: 0 }
  }

  // Obtener conteo de items para cada orden
  const ordenIds = (data || []).map((o: any) => o.id)
  let itemsCountMap: Record<number, number> = {}

  if (ordenIds.length > 0) {
    const { data: allItems } = await supabase
      .from('orden_items')
      .select('orden_id')
      .in('orden_id', ordenIds)

    itemsCountMap = (allItems || []).reduce((acc: any, item: any) => {
      acc[item.orden_id] = (acc[item.orden_id] || 0) + 1
      return acc
    }, {})
  }

  const ordenes: OrdenVentaResumen[] = (data || []).map((o: any) => ({
    ...o,
    items_count: itemsCountMap[o.id] || 0,
  }))

  return {
    ordenes,
    total: count ?? 0,
  }
}

export async function fetchOrdenVentaById(
  id: number
): Promise<OrdenVentaDetalle | null> {
  const supabase = await createClient()

  const { data: orden, error: ordenError } = await supabase
    .from('ordenes_venta')
    .select('*')
    .eq('id', id)
    .single()

  if (ordenError || !orden) {
    console.error('Error fetchOrdenVentaById:', ordenError)
    return null
  }

  const { data: items, error: itemsError } = await supabase
    .from('orden_items')
    .select(
      `
      *,
      variantes_producto!inner(
        sku_completo,
        producto_id,
        talla_id,
        color_id
      ),
      productos!left(nombre),
      cat_tallas!left(codigo),
      cat_colores!left(nombre)
      `
    )
    .eq('orden_id', id)

  if (itemsError) {
    console.error('Error fetchOrdenItems:', itemsError)
    return null
  }

  // Obtener imágenes
  const productoIds = [...new Set((items || []).map((i: any) => i.variantes_producto?.producto_id))]
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

  const itemsExtendidos: OrdenItemExtendido[] = (items || []).map((item: any) => ({
    ...item,
    sku_completo: item.variantes_producto?.sku_completo,
    producto_nombre: item.productos?.nombre,
    talla: item.cat_tallas?.codigo,
    color: item.cat_colores?.nombre,
    imagen: imagenesMap[item.variantes_producto?.producto_id],
  }))

  return {
    ...orden,
    items: itemsExtendidos,
  }
}
