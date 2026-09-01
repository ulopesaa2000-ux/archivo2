// modules/ecommerce/pdf-catalog-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export interface FiltrosPdfCatalog {
  generoId?: 'todos' | 'infantil' | number | string
  tiposPrendaIds?: number[]
  soloConStock?: boolean
  soloPublicados?: boolean
  soloConFoto?: boolean
  busqueda?: string
}

export interface ProductoPdfCatalog {
  id: number
  sku: string
  nombre: string
  descripcion: string
  genero: string
  tipo_prenda: string
  marca: string
  precio_publico: number | null
  precio_oferta: number | null
  cajas_stock: number
  piezas_stock: number
  imagen_url: string | null
  esta_publicado: boolean
}

export async function fetchProductosParaCatalogoPdfAction(
  filtros: FiltrosPdfCatalog
): Promise<{ productos: ProductoPdfCatalog[]; total: number }> {
  try {
    const supabase = await createClient()

    // 1. Obtener inventario_stock agrupado
    const { data: stockData, error: stockError } = await supabase
      .from('inventario_stock')
      .select('producto_id, cajas, piezas_sueltas')

    if (stockError) {
      console.warn('Advertencia al consultar inventario_stock:', stockError)
    }

    const stockMap: Record<number, { cajas: number; piezas: number }> = {}
    for (const s of stockData || []) {
      if (!stockMap[s.producto_id]) {
        stockMap[s.producto_id] = { cajas: 0, piezas: 0 }
      }
      stockMap[s.producto_id].cajas += (s.cajas || 0)
      stockMap[s.producto_id].piezas += (s.piezas_sueltas || 0)
    }

    // 2. Consulta de productos
    let query = (supabase.from('productos') as any)
      .select(`
        id,
        sku_base,
        nombre,
        descripcion,
        genero_id,
        tipo_prenda_id,
        marca_id,
        edad_id,
        created_at,
        activo,
        cat_generos!left(nombre),
        cat_tipo_prenda!left(nombre),
        cat_marcas!left(nombre),
        productos_web!left(id, activo, slug, precio_publico, precio_oferta)
      `)
      .eq('activo', true)

    // Filtro Género
    if (filtros.generoId && filtros.generoId !== 'todos') {
      if (filtros.generoId === 'infantil') {
        query = query.or('genero_id.in.(4,5),edad_id.eq.1')
      } else {
        query = query.eq('genero_id', Number(filtros.generoId))
      }
    }

    // Filtro Tipos de prenda (multi-select)
    if (filtros.tiposPrendaIds && filtros.tiposPrendaIds.length > 0) {
      query = query.in('tipo_prenda_id', filtros.tiposPrendaIds)
    }

    // Búsqueda de texto libre
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const term = `%${filtros.busqueda.trim()}%`
      query = query.or(`sku_base.ilike.${term},nombre.ilike.${term},descripcion.ilike.${term}`)
    }

    const { data: prods, error: prodsError } = await query.order('id', { ascending: false })

    if (prodsError) {
      console.error('Error fetchProductosParaCatalogoPdfAction:', prodsError)
      return { productos: [], total: 0 }
    }

    // 3. Obtener imágenes principales
    const prodIds = (prods || []).map((p: any) => p.id)
    let imgMap: Record<number, string> = {}

    if (prodIds.length > 0) {
      const { data: imgData } = await (supabase
        .from('producto_imagenes') as any)
        .select('producto_id, url, es_principal, orden, uso_imagen')
        .in('producto_id', prodIds)
        .not('uso_imagen', 'in', '("oculta","oculto","ficha_tecnica","etiqueta_logistica")')
        .order('es_principal', { ascending: false })
        .order('orden', { ascending: true })

      for (const img of imgData || []) {
        if (!imgMap[img.producto_id] && img.url) {
          imgMap[img.producto_id] = img.url
        }
      }
    }

    // 4. Filtrar y estructurar
    const resultados: ProductoPdfCatalog[] = []
    const soloConStock = filtros.soloConStock ?? true
    const soloPublicados = filtros.soloPublicados ?? false
    const soloConFoto = filtros.soloConFoto ?? true

    for (const p of prods || []) {
      const stock = stockMap[p.id] || { cajas: 0, piezas: 0 }
      const pw = Array.isArray(p.productos_web) ? p.productos_web[0] : p.productos_web
      const estaPublicado = !!pw && (pw.activo ?? false)
      const imagenUrl = imgMap[p.id] || null

      if (soloConStock && stock.cajas <= 0) continue
      if (soloPublicados && !estaPublicado) continue
      if (soloConFoto && !imagenUrl) continue

      resultados.push({
        id: p.id,
        sku: p.sku_base,
        nombre: p.nombre || '',
        descripcion: p.descripcion || p.nombre || '',
        genero: p.cat_generos?.nombre || 'General',
        tipo_prenda: p.cat_tipo_prenda?.nombre || '',
        marca: p.cat_marcas?.nombre || 'IDOL NAVY',
        precio_publico: pw?.precio_publico ?? null,
        precio_oferta: pw?.precio_oferta ?? null,
        cajas_stock: stock.cajas,
        piezas_stock: stock.piezas,
        imagen_url: imagenUrl,
        esta_publicado: estaPublicado,
      })
    }

    // Ordenar con foto primero y luego IDs más recientes
    resultados.sort((a, b) => {
      if (a.imagen_url && !b.imagen_url) return -1
      if (!a.imagen_url && b.imagen_url) return 1
      return b.id - a.id
    })

    return {
      productos: resultados,
      total: resultados.length,
    }
  } catch (err) {
    console.error('Excepción en fetchProductosParaCatalogoPdfAction:', err)
    return { productos: [], total: 0 }
  }
}
