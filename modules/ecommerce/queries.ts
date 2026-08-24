// modules/ecommerce/queries.ts
'use server'

import { cache } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { createClient, createStaticClient } from '@/lib/supabase/server'
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
  'use cache'
  cacheLife('hours')
  cacheTag('ecommerce-config')

  try {
    const supabase = createStaticClient()

    const { data, error } = await supabase
      .from('config_ecommerce')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      console.error('Error fetchConfigEcommerce:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      })
      return null
    }

    return data as ConfigEcommerce
  } catch (err) {
    console.error('Exception in fetchConfigEcommerce:', err)
    return null
  }
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

  let query = (supabase.from('productos') as any)
    .select(
      `
      id,
      sku_base,
      nombre,
      descripcion,
      marca_id,
      genero_id,
      tipo_prenda_id,
      pz_en_caja,
      composicion,
      activo,
      created_at,
      cat_marcas!left(nombre),
      cat_tipo_prenda!left(nombre),
      cat_generos!left(nombre),
      productos_web!left(
        id,
        slug,
        precio_publico,
        precio_oferta,
        en_oferta,
        destacado,
        nuevo,
        activo
      )
      `,
      { count: 'exact' }
    )
    .eq('activo', true)

  // Filtro de texto (SKU, nombre o descripción)
  if (filtros.q) {
    const term = `%${filtros.q}%`
    query = query.or(`sku_base.ilike.${term},nombre.ilike.${term},descripcion.ilike.${term}`)
  }
  if (filtros.marca_id) {
    query = query.eq('marca_id', filtros.marca_id)
  }
  if (filtros.genero_id) {
    query = query.eq('genero_id', filtros.genero_id)
  }
  if (filtros.tipo_prenda_id) {
    query = query.eq('tipo_prenda_id', filtros.tipo_prenda_id)
  }

  const { data: rawData, count, error } = await query

  if (error) {
    console.error('Error fetchProductosWebAdmin:', error)
    return { productos: [], total: 0 }
  }

  // Obtener imágenes principales de los productos
  const productoIds = (rawData || []).map((p: any) => p.id)
  let imagenesMap: Record<number, string> = {}
  if (productoIds.length > 0) {
    const { data: imagenes } = await supabase
      .from('producto_imagenes')
      .select('producto_id, url, es_principal')
      .in('producto_id', productoIds)

    imagenesMap = (imagenes || []).reduce((acc: Record<number, string>, img: any) => {
      if (!acc[img.producto_id] || img.es_principal) {
        acc[img.producto_id] = img.url
      }
      return acc
    }, {})
  }

  // Mapear a ProductoWebExtendido
  let productos: ProductoWebExtendido[] = (rawData || []).map((item: any) => {
    const pw = Array.isArray(item.productos_web) ? item.productos_web[0] : item.productos_web
    const imgUrl = imagenesMap[item.id] || null

    return {
      id: item.id,
      producto_id: item.id,
      producto_web_id: pw?.id ?? null,
      esta_publicado: !!pw && (pw.activo ?? false),
      sku_base: item.sku_base,
      nombre: item.nombre,
      descripcion: item.descripcion,
      slug: pw?.slug ?? null,
      marca_id: item.marca_id,
      genero_id: item.genero_id,
      tipo_prenda_id: item.tipo_prenda_id,
      pz_en_caja: item.pz_en_caja ?? 1,
      composicion: item.composicion,
      marca_nombre: item.cat_marcas?.nombre ?? null,
      tipo_prenda_nombre: item.cat_tipo_prenda?.nombre ?? null,
      genero_nombre: item.cat_generos?.nombre ?? null,
      imagen_principal: imgUrl,
      tiene_foto: !!imgUrl,
      precio_publico: pw?.precio_publico ?? null,
      precio_oferta: pw?.precio_oferta ?? null,
      en_oferta: pw?.en_oferta ?? false,
      destacado: pw?.destacado ?? false,
      nuevo: pw?.nuevo ?? false,
      activo: pw?.activo ?? false,
      created_at: item.created_at || new Date().toISOString(),
    }
  })

  // Filtro estado web en post-procesamiento (100% preciso)
  if (filtros.estado_web === 'publicados') {
    productos = productos.filter((p) => p.esta_publicado)
  } else if (filtros.estado_web === 'pausados') {
    productos = productos.filter((p) => p.producto_web_id !== null && !p.activo)
  } else if (filtros.estado_web === 'no_publicados') {
    productos = productos.filter((p) => p.producto_web_id === null)
  }

  // Filtro de foto
  if (filtros.tiene_foto === 'con_foto') {
    productos = productos.filter((p) => p.tiene_foto)
  } else if (filtros.tiene_foto === 'sin_foto') {
    productos = productos.filter((p) => !p.tiene_foto)
  }

  // Ordenamiento (Por defecto: recientes con foto primero)
  const ordenarPor = filtros.ordenar_por || 'recientes_con_foto'

  productos.sort((a, b) => {
    if (ordenarPor === 'recientes_con_foto') {
      if (a.tiene_foto !== b.tiene_foto) {
        return a.tiene_foto ? -1 : 1
      }
      return b.id - a.id
    }
    if (ordenarPor === 'recientes') {
      return b.id - a.id
    }
    if (ordenarPor === 'antiguos') {
      return a.id - b.id
    }
    if (ordenarPor === 'sku_asc') {
      return a.sku_base.localeCompare(b.sku_base)
    }
    if (ordenarPor === 'precio_desc') {
      return (b.precio_publico || 0) - (a.precio_publico || 0)
    }
    if (ordenarPor === 'precio_asc') {
      return (a.precio_publico || 0) - (b.precio_publico || 0)
    }
    return b.id - a.id
  })

  const totalFiltered = productos.length
  const paginatedProductos = productos.slice(from, to + 1)

  return {
    productos: paginatedProductos,
    total: totalFiltered,
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS NO PUBLICADOS (para admin)
// ═══════════════════════════════════════════════════════════════

export async function fetchProductosNoPublicados(): Promise<
  { id: number; sku_base: string; nombre: string; marca: string | null; imagen_principal: string | null }[]
> {
  const supabase = await createClient()

  // First get all published product IDs
  const { data: publishedIds, error: publishedError } = await supabase
    .from('productos_web')
    .select('producto_id')

  if (publishedError) {
    console.error('Error fetching published IDs:', publishedError)
    return []
  }

  const excludeIds = publishedIds?.map(p => p.producto_id) || []

  // Get all active published products
  const { data, error } = await supabase
    .from('productos')
    .select('id, sku_base, nombre, marca_id')
    .eq('activo', true)
    .eq('estado', 'publicado')
    .order('sku_base')

  if (error) {
    console.error('Error fetchProductosNoPublicados:', error)
    return []
  }

  // Get marcas and images separately
  const productoIds = data?.map(p => p.id) || []
  
  let marcas: { id: number; nombre: string }[] = []
  let imagenes: { producto_id: number; url: string; es_principal: boolean | null }[] = []
  
  if (productoIds.length > 0) {
    // Get marcas
    const { data: marcasData } = await supabase
      .from('cat_marcas')
      .select('id, nombre')
    
    marcas = marcasData || []
    
    // Get principal images for these products
    const { data: imagenesData } = await supabase
      .from('producto_imagenes')
      .select('producto_id, url, es_principal')
      .eq('es_principal', true)
      .in('producto_id', productoIds)
    
    imagenes = imagenesData || []
  }

  // Filter out already published products and map data
  const filteredData = excludeIds.length > 0 
    ? (data || []).filter(p => !excludeIds.includes(p.id))
    : (data || [])

  return filteredData.map((p: any) => ({
    id: p.id,
    sku_base: p.sku_base,
    nombre: p.nombre,
    marca: marcas.find(m => m.id === p.marca_id)?.nombre || null,
    imagen_principal: imagenes.find(img => img.producto_id === p.id)?.url || null,
  }))
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS WEB PÚBLICOS (STORE)
// ═══════════════════════════════════════════════════════════════

export async function fetchProductosWebPublicos(
  filtros: FiltrosProductoWeb
): Promise<{ productos: ProductoWebPublico[]; total: number }> {
  try {
    const supabase = createStaticClient()
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
        titulo_seo,
        precio_publico,
        precio_oferta,
        en_oferta,
        destacado,
        nuevo,
        modo_override,
        unidad_venta,
        activo,
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
    if (filtros.genero) {
      const g = filtros.genero.toLowerCase()
      if (g.includes('dama') || g.includes('mujer')) {
        query = query.eq('productos.genero_id', 1) // 1 = Mujer
      } else if (g.includes('caballero') || g.includes('hombre')) {
        query = query.eq('productos.genero_id', 2) // 2 = Hombre
      } else if (g.includes('unisex')) {
        query = query.eq('productos.genero_id', 3) // 3 = Unisex
      } else if (g.includes('nino') || g.includes('niña') || g.includes('infantil')) {
        query = query.in('productos.genero_id', [4, 5]) // 4 = Niño, 5 = Niña
      }
    }
    if (filtros.tipo) {
      const t = filtros.tipo.toLowerCase().replace(/-/g, ' ')

      if (t.includes('nino') || t.includes('niña') || t.includes('infantil')) {
        query = query.in('productos.genero_id', [4, 5])
      }

      if (t.includes('chamarr')) {
        query = query.eq('productos.tipo_prenda_id', 5) // CHAMARRA
      } else if (t.includes('rompeviento')) {
        query = query.eq('productos.tipo_prenda_id', 11) // ROMPEVIENTOS
      } else if (t.includes('chaleco')) {
        query = query.eq('productos.tipo_prenda_id', 4) // CHALECO
      } else if (t.includes('set') || t.includes('conjunto') || t.includes('deportivo')) {
        query = query.eq('productos.tipo_prenda_id', 13) // SET
      } else if (t.includes('sueter') || t.includes('suéter')) {
        query = query.eq('productos.tipo_prenda_id', 16) // SUETER
      } else if (t.includes('sudadera')) {
        query = query.eq('productos.tipo_prenda_id', 15) // SUDADERA
      } else if (t.includes('abrigo')) {
        query = query.eq('productos.tipo_prenda_id', 1) // ABRIGO
      } else if (t.includes('novedad')) {
        query = query.eq('nuevo', true)
      } else {
        const term = `%${t}%`
        query = query.or(`nombre.ilike.${term},sku_base.ilike.${term}`, { foreignTable: 'productos' })
      }
    }

    if (filtros.q && filtros.q.trim()) {
      const term = `%${filtros.q.trim()}%`
      query = query.or(`slug.ilike.${term},titulo_seo.ilike.${term}`)
      query = query.or(`nombre.ilike.${term},sku_base.ilike.${term}`, { foreignTable: 'productos' })
    }

    query = query
      .order('orden_display', { ascending: true })
      .range(from, to)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetchProductosWebPublicos:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return { productos: [], total: 0 }
    }

    // Obtener imágenes principales
    const productoIds = (data || []).map((p: any) => p.producto_id)

    let imagenesMap: Record<number, { url: string; url_og: string | null }> = {}
    if (productoIds.length > 0) {
      const { data: imagenes } = (await supabase
        .from('producto_imagenes')
        .select('producto_id, url, url_og')
        .eq('es_principal', true)
        .in('producto_id', productoIds)) as any

      imagenesMap = (imagenes || []).reduce((acc: any, img: any) => {
        acc[img.producto_id] = { url: img.url, url_og: img.url_og }
        return acc
      }, {})
    }

    const productos: ProductoWebPublico[] = (data || []).map((item: any) => {
      const cleanNombre = cleanJsonGarbage(item.productos?.nombre)
      const cleanDescripcion = cleanJsonGarbage(item.productos?.descripcion)
      const cleanTituloSeo = cleanJsonGarbage(item.titulo_seo)

      return {
        id: item.id,
        slug: item.slug,
        producto_id: item.producto_id,
        sku_base: item.productos?.sku_base,
        nombre: cleanNombre || cleanDescripcion || cleanTituloSeo || item.productos?.sku_base || 'Producto',
        descripcion: cleanDescripcion,
        composicion: null,
        titulo_seo: cleanTituloSeo,
        descripcion_seo: null, // No se carga en lista
        precio_publico: item.precio_publico,
        precio_oferta: item.precio_oferta,
        en_oferta: item.en_oferta,
        destacado: item.destacado,
        nuevo: item.nuevo,
        marca: item.productos?.cat_marcas?.nombre,
        tipo_prenda: item.productos?.cat_tipo_prenda?.nombre,
        genero: item.productos?.cat_generos?.nombre,
        tela_exterior: null,
        tela_forro: null,
        keywords: null,
        imagen_principal: imagenesMap[item.producto_id]?.url || null,
        url_og: imagenesMap[item.producto_id]?.url_og || null,
        modo_override: item.modo_override,
        unidad_venta: item.unidad_venta,
        activo: item.activo,
      }
    })

    return {
      productos,
      total: count ?? 0,
    }
  } catch (err) {
    console.error('Exception in fetchProductosWebPublicos:', err)
    return { productos: [], total: 0 }
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTO POR SLUG (PDP)
// ═══════════════════════════════════════════════════════════════

// Helper module-level: limpiar campos de texto que contengan JSON basura de configuración
function cleanJsonGarbage(val?: string | null): string | null {
  if (!val) return null
  const t = val.trim()
  if (!t) return null
  if (
    t.startsWith('{') ||
    t.startsWith('[') ||
    t.includes('hero_title') ||
    t.includes('hero_description') ||
    t.includes('explora_title') ||
    t.includes('categorias_grid')
  ) {
    return null
  }
  return t
}

const fetchProductoWebBySlugCached = cache(async (
  normalizedSlug: string
): Promise<ProductoWebPublico | null> => {
  const supabase = await createClient()

  let { data, error } = await supabase
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
    .eq('slug', normalizedSlug)
    .eq('activo', true)
    .eq('productos.activo', true)
    .maybeSingle()

  if (!data) {
    const rawSearch = normalizedSlug.replace(/-/g, '/').toUpperCase()
    const { data: fallbackData } = await supabase
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
      .or(`sku_base.ilike.%${normalizedSlug}%,sku_base.ilike.%${rawSearch}%`, { foreignTable: 'productos' })
      .eq('activo', true)
      .eq('productos.activo', true)
      .limit(1)
      .maybeSingle()

    if (fallbackData) {
      data = fallbackData
    }
  }

  if (!data) {
    return null
  }

  // Obtener imagen principal
  const { data: imagen } = (await supabase
    .from('producto_imagenes')
    .select('url, url_og')
    .eq('producto_id', data.producto_id)
    .eq('es_principal', true)
    .single()) as any

  const prod = data.productos as any

  const cleanNombre = cleanJsonGarbage(prod?.nombre)
  const cleanDescripcion = cleanJsonGarbage(prod?.descripcion)
  const cleanTituloSeo = cleanJsonGarbage(data.titulo_seo)

  return {
    id: data.id,
    slug: data.slug,
    producto_id: data.producto_id,
    sku_base: prod?.sku_base,
    nombre: cleanNombre || cleanDescripcion || cleanTituloSeo || prod?.sku_base || 'Producto sin nombre',
    descripcion: cleanDescripcion,
    composicion: cleanJsonGarbage(prod?.composicion) ?? null,
    titulo_seo: cleanTituloSeo,
    descripcion_seo: null,
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
    keywords: cleanJsonGarbage(data.keywords),
    imagen_principal: imagen?.url || null,
    url_og: imagen?.url_og || null,
    modo_override: data.modo_override,
    unidad_venta: data.unidad_venta,
    activo: data.activo,
    visitas: data.visitas ?? null,
  } as ProductoWebPublico
})

export async function fetchProductoWebBySlug(
  slug: string
): Promise<ProductoWebPublico | null> {
  return fetchProductoWebBySlugCached(decodeURIComponent(slug).toLowerCase())
}

export async function incrementProductoWebVisitas(
  productoWebId: number,
  visitasActuales: number | null | undefined
): Promise<void> {
  const supabase = createStaticClient()

  const { error } = await supabase
    .from('productos_web')
    .update({ visitas: (visitasActuales ?? 0) + 1 })
    .eq('id', productoWebId)

  if (error) {
    console.error('Error incrementProductoWebVisitas:', error)
  }
}

/**
 * Obtiene todos los slugs de productos activos para el sitemap.
 */
export async function fetchAllProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('productos_web')
    .select('slug, updated_at')
    .eq('activo', true)

  if (error) {
    console.error('Error fetchAllProductSlugs:', error)
    return []
  }

  return (data || []).map((item) => ({
    slug: item.slug,
    updated_at: item.updated_at || new Date().toISOString()
  }))
}

// ═══════════════════════════════════════════════════════════════
// VARIANTES DE PRODUCTO (PDP)
// ═══════════════════════════════════════════════════════════════

export async function fetchVariantesProducto(
  productoId: number
): Promise<VariantePublica[]> {
  'use cache'
  cacheLife('hours')
  cacheTag(`producto-variantes-${productoId}`)

  const supabase = createStaticClient()

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
  'use cache'
  cacheLife('hours')
  cacheTag(`producto-imagenes-${productoId}`)

  const supabase = createStaticClient()

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
  'use cache'
  cacheLife('hours')
  cacheTag(`producto-medidas-${productoId}`)

  const supabase = createStaticClient()

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
// ÓRDENES DE VENTA (ECOMMERCE ADMIN & PORTAL CLIENTE)
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

  // Filtrado de seguridad: si es un Cliente Ecomerce, solo ve sus propias órdenes
  const { getCurrentUser } = await import('@/modules/auth/queries')
  const currentUser = await getCurrentUser()
  const isClienteEcommerce = currentUser?.rol_id === 19 || (currentUser?.rol?.nombre || '').toLowerCase().includes('cliente ecom')

  if (isClienteEcommerce && currentUser) {
    if (currentUser.email) {
      query = query.or(`usuario_id.eq.${currentUser.id},email_cliente.eq.${currentUser.email}`)
    } else {
      query = query.eq('usuario_id', currentUser.id)
    }
  }

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

  // Validación de seguridad para clientes: no pueden ver órdenes ajenas
  const { getCurrentUser } = await import('@/modules/auth/queries')
  const currentUser = await getCurrentUser()
  const isClienteEcommerce = currentUser?.rol_id === 19 || (currentUser?.rol?.nombre || '').toLowerCase().includes('cliente ecom')

  if (isClienteEcommerce && currentUser) {
    if (orden.usuario_id !== currentUser.id && orden.email_cliente !== currentUser.email) {
      console.warn(`[fetchOrdenVentaById] Acceso no autorizado a orden ${id} por cliente ${currentUser.id}`)
      return null
    }
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
