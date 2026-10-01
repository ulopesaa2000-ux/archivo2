// modules/ecommerce/pdf-catalog-actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { compareFamiliaAsc } from '@/lib/inventario/familias-orden'

export interface FiltrosPdfCatalog {
  generoId?: 'todos' | 'infantil' | number | string
  tiposPrendaIds?: number[]
  soloConStock?: boolean
  soloPublicados?: boolean
  soloConFoto?: boolean
  busqueda?: string
  /** Modo catálogo completo: trae todos los activos con y sin foto (el modal relaja los filtros). */
  modoCompleto?: boolean
  /** Orden canónico por familia (género → familia → SKU) para el catálogo completo. */
  ordenarPorFamilia?: boolean
  /**
   * Dirección del orden en modo completo: 'familia' = solo familia A→Z sin
   * importar género (igual que /catalogo/familias); 'genero' = línea → familia → SKU.
   */
  ordenFamilia?: 'familia' | 'genero'
}

export interface ProductoPdfCatalog {
  id: number
  sku: string
  nombre: string
  descripcion: string
  genero: string
  tipo_prenda: string
  familia: string | null
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

    // 2. Consulta de productos (solo activos: base del catálogo completo y selectivo)
    let query = (supabase.from('productos') as any)
      .select(`
        id,
        sku_base,
        nombre,
        descripcion,
        familia,
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

    // 3. Obtener imágenes principales por chunks para evitar límites de URL o de filas (1000)
    const prodIds = (prods || []).map((p: any) => p.id)
    let imgMap: Record<number, string> = {}

    if (prodIds.length > 0) {
      const CHUNK_SIZE = 150
      for (let i = 0; i < prodIds.length; i += CHUNK_SIZE) {
        const chunk = prodIds.slice(i, i + CHUNK_SIZE)
        const { data: imgData } = await (supabase
          .from('producto_imagenes') as any)
          .select('producto_id, url, es_principal, orden, uso_imagen')
          .in('producto_id', chunk)
          .not('uso_imagen', 'in', '("oculta","oculto","ficha_tecnica","etiqueta_logistica")')
          .order('es_principal', { ascending: false })
          .order('orden', { ascending: true })

        for (const img of imgData || []) {
          if (!imgMap[img.producto_id] && img.url) {
            imgMap[img.producto_id] = img.url
          }
        }
      }
    }

    // 4. Filtrar y estructurar
    // En modo completo se incluyen todos los activos con y sin foto/stock
    // (el modal fuerza los flags a false, esto es doble seguridad).
    const resultados: ProductoPdfCatalog[] = []
    const modoCompleto = filtros.modoCompleto ?? false
    const soloConStock = modoCompleto ? false : (filtros.soloConStock ?? true)
    const soloPublicados = modoCompleto ? false : (filtros.soloPublicados ?? false)
    const soloConFoto = modoCompleto ? false : (filtros.soloConFoto ?? true)

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
        familia: p.familia || null,
        marca: p.cat_marcas?.nombre || 'IDOL NAVY',
        precio_publico: pw?.precio_publico ?? null,
        precio_oferta: pw?.precio_oferta ?? null,
        cajas_stock: stock.cajas,
        piezas_stock: stock.piezas,
        imagen_url: imagenUrl,
        esta_publicado: estaPublicado,
      })
    }

    // Orden: por familia en modo completo ('familia' = solo familia A→Z sin
    // importar género; 'genero' = línea → familia → SKU), o con foto primero
    // + recientes en modo selectivo.
    const genOrder: Record<string, number> = { Dama: 1, Mujer: 1, Caballero: 2, Hombre: 2, 'Niño': 3, 'Niña': 3, Infantil: 3, Unisex: 4 }
    const soloFamiliaAz = (filtros.ordenFamilia ?? 'genero') === 'familia'
    if (filtros.ordenarPorFamilia || modoCompleto) {
      resultados.sort((a, b) => {
        if (!soloFamiliaAz) {
          const gA = genOrder[a.genero] || 9
          const gB = genOrder[b.genero] || 9
          if (gA !== gB) return gA - gB
        }
        const fComp = compareFamiliaAsc(a.familia || '', b.familia || '')
        if (fComp !== 0) return fComp
        return (a.sku || '').localeCompare(b.sku || '', 'es', { sensitivity: 'base' })
      })
    } else {
      resultados.sort((a, b) => {
        if (a.imagen_url && !b.imagen_url) return -1
        if (!a.imagen_url && b.imagen_url) return 1
        return b.id - a.id
      })
    }

    return {
      productos: resultados,
      total: resultados.length,
    }
  } catch (err) {
    console.error('Excepción en fetchProductosParaCatalogoPdfAction:', err)
    return { productos: [], total: 0 }
  }
}

export interface ImagenOptimizadaPdf {
  base64: string
  width: number
  height: number
  aspectRatio: number
}

/**
 * Optimiza una imagen individual en el servidor con Sharp, resolviendo problemas de CORS,
 * formatos WebP/AVIF y URLs con caracteres especiales de Odoo 18, WordPress y Supabase.
 *
 * NOTA: Esta es la vía principal para imágenes de Odoo (moda.sistemaindumentaria.com),
 * que NO envía `Access-Control-Allow-Origin` y por tanto nunca pueden leerse con
 * canvas en el navegador. El fallback cliente solo funciona para hosts con CORS (*).
 */
export async function optimizarImagenParaPdfAction(
  url: string,
  maxW: number = 500,
  quality: number = 80
): Promise<ImagenOptimizadaPdf | null> {
  if (!url || typeof url !== 'string' || !url.trim()) return null

  try {
    let targetUrl = url.trim()
    if (targetUrl.startsWith('//')) targetUrl = `https:${targetUrl}`

    let parsedUrl: URL
    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      parsedUrl = new URL(encodeURI(targetUrl))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    let response: Response
    try {
      response = await fetch(parsedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) return null

    // Odoo puede devolver HTML (login) en vez de imagen: validar antes de sharp.
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('image/')) {
      console.warn(`[optimizarImagenParaPdfAction] Respuesta no-imagen para ${url}: ${contentType}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)
    if (inputBuffer.length === 0) return null

    // Cargar sharp dinámicamente o directo en Server Action
    const sharp = (await import('sharp')).default
    const image = sharp(inputBuffer)
    const metadata = await image.metadata()

    const origW = metadata.width || 480
    const origH = metadata.height || 640

    let targetW = origW
    let targetH = origH

    if (origW > maxW) {
      targetH = Math.round(maxW * (origH / origW))
      targetW = maxW
    }

    const outputBuffer = await image
      .rotate() // Respeta orientación EXIF
      .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }) // Transparencias -> fondo blanco
      .jpeg({ quality, mozjpeg: false })
      .toBuffer()

    const base64 = `data:image/jpeg;base64,${outputBuffer.toString('base64')}`

    return {
      base64,
      width: targetW,
      height: targetH,
      aspectRatio: targetW / targetH,
    }
  } catch (err) {
    console.warn(`[optimizarImagenParaPdfAction] Error procesando imagen ${url}:`, err)
    return null
  }
}

/**
 * Optimiza un lote de URLs de imágenes en paralelo desde el servidor Node.js.
 * `calidad` permite bajar resolución/peso en layouts densos (ej. 5×3 usa 400px).
 */
export async function optimizarImagenesLoteParaPdfAction(
  urls: string[],
  calidad?: { maxW?: number; quality?: number }
): Promise<Record<string, ImagenOptimizadaPdf | null>> {
  const results: Record<string, ImagenOptimizadaPdf | null> = {}
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)))
  const maxW = calidad?.maxW ?? 500
  const quality = calidad?.quality ?? 80

  await Promise.all(
    uniqueUrls.map(async (url) => {
      results[url] = await optimizarImagenParaPdfAction(url, maxW, quality)
    })
  )

  return results
}

