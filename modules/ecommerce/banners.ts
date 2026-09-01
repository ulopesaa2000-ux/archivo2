// modules/ecommerce/banners.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createStaticClient } from '@/lib/supabase/server'
import { getSmartImagenUrl } from '@/lib/utils/imagen'

export interface CategoriaBannerRow {
  id: number
  nombre: string
  genero_id: number | null
  tipo_prenda_id: number | null
  producto_id: number | null
  producto_web_id: number | null
  slug_categoria: string | null
  imagen_url: string
  titulo_banner: string | null
  subtitulo_banner: string | null
  link_destino: string | null
  activo: boolean
  orden: number
  created_at: string
  updated_at: string
}

export interface CategoriaBannerResuelto extends CategoriaBannerRow {
  genero_nombre?: string | null
  tipo_prenda_nombre?: string | null
  producto_nombre?: string | null
  producto_sku?: string | null
  producto_slug?: string | null
}

/**
 * Obtiene todos los banners de categorías para el panel de administración
 * con nombres descriptivos de género, tipo de prenda y producto
 */
export async function fetchBannersCategorias(): Promise<CategoriaBannerResuelto[]> {
  try {
    const supabase = createStaticClient()

    const { data, error } = await (supabase as any)
      .from('categoria_banners')
      .select('*')
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        console.warn('Banner categorias query note:', error.message || error)
      }
      return []
    }

    const rows = data || []
    if (rows.length === 0) return []

    // Obtener catálogos para enriquecer nombres
    const [generosRes, tiposRes, prodsRes] = await Promise.all([
      supabase.from('cat_generos').select('id, nombre'),
      supabase.from('cat_tipo_prenda').select('id, nombre'),
      supabase.from('productos').select('id, nombre, sku_base, productos_web!left(slug)'),
    ])

    const generosMap = new Map((generosRes.data || []).map((g: any) => [g.id, g.nombre]))
    const tiposMap = new Map((tiposRes.data || []).map((t: any) => [t.id, t.nombre]))
    const prodsMap = new Map((prodsRes.data || []).map((p: any) => [
      p.id,
      {
        nombre: p.nombre,
        sku_base: p.sku_base,
        slug: Array.isArray(p.productos_web) ? p.productos_web[0]?.slug : p.productos_web?.slug,
      }
    ]))

    return rows.map((row: any) => {
      const prodInfo = row.producto_id ? prodsMap.get(row.producto_id) : null
      return {
        id: row.id,
        nombre: row.nombre,
        genero_id: row.genero_id,
        genero_nombre: row.genero_id ? (generosMap.get(row.genero_id) || (row.genero_id === 1 ? 'Dama' : row.genero_id === 2 ? 'Caballero' : 'Unisex')) : null,
        tipo_prenda_id: row.tipo_prenda_id,
        tipo_prenda_nombre: row.tipo_prenda_id ? tiposMap.get(row.tipo_prenda_id) : null,
        producto_id: row.producto_id,
        producto_nombre: prodInfo?.nombre || null,
        producto_sku: prodInfo?.sku_base || null,
        producto_slug: prodInfo?.slug || null,
        producto_web_id: row.producto_web_id,
        slug_categoria: row.slug_categoria,
        imagen_url: row.imagen_url,
        titulo_banner: row.titulo_banner,
        subtitulo_banner: row.subtitulo_banner,
        link_destino: row.link_destino,
        activo: row.activo ?? true,
        orden: row.orden ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }
    })
  } catch (err) {
    console.warn('Exception in fetchBannersCategorias:', err)
    return []
  }
}

/**
 * Obtiene el banner promocional panorámico activo para una categoría específica en la tienda pública (/shop)
 * Si la tienda general no tiene filtro de categoría, retorna null.
 * Solo retorna un banner si está explícitamente cargado y activo en la tabla `categoria_banners`.
 */
export async function fetchBannerCategoriaActivo(params: {
  generoId?: number | null
  genero?: string | null
  tipoPrendaId?: number | null
  tipo?: string | null
  slug?: string | null
}): Promise<CategoriaBannerResuelto | null> {
  try {
    const supabase = createStaticClient()

    let generoId: number | number[] | null = params.generoId ?? null

    if (!generoId && params.genero) {
      const gLower = params.genero.toLowerCase().trim()
      if (gLower.includes('dama') || gLower.includes('mujer')) {
        generoId = 1
      } else if (gLower.includes('caballero') || gLower.includes('hombre')) {
        generoId = 2
      } else if (gLower.includes('unisex')) {
        generoId = 3
      } else if (gLower === 'nino' || gLower === 'niño' || (gLower.includes('niñ') && gLower.includes('o')) || gLower.includes('nino')) {
        generoId = 4
      } else if (gLower === 'nina' || gLower === 'niña' || (gLower.includes('niñ') && gLower.includes('a')) || gLower.includes('nina')) {
        generoId = 5
      } else if (gLower.includes('infantil')) {
        generoId = [4, 5]
      } else if (!isNaN(Number(gLower))) {
        generoId = Number(gLower)
      }
    }

    let tipoPrendaId = params.tipoPrendaId ?? null
    if (!tipoPrendaId && params.tipo) {
      const tLower = params.tipo.toLowerCase().trim()
      if (tLower.includes('nino') || tLower.includes('niña') || tLower.includes('infantil')) {
        if (!generoId) generoId = [4, 5]
      }

      if (tLower.includes('chamarra')) tipoPrendaId = 5
      else if (tLower.includes('rompevientos')) tipoPrendaId = 11
      else if (tLower.includes('chaleco')) tipoPrendaId = 4
      else if (tLower.includes('set') || tLower.includes('conjunto')) tipoPrendaId = 13
      else if (tLower.includes('sueter')) tipoPrendaId = 16
      else if (tLower.includes('sudadera')) tipoPrendaId = 15
      else if (tLower.includes('abrigo')) tipoPrendaId = 1
      else if (!isNaN(Number(tLower))) tipoPrendaId = Number(tLower)
    }

    // Si no hay ningún criterio de filtro, no mostrar ningún banner
    if (!generoId && !tipoPrendaId && !params.slug) {
      return null
    }

    // Construir query estricta sobre categoria_banners
    let query = (supabase as any)
      .from('categoria_banners')
      .select('*')
      .eq('activo', true)

    if (generoId && tipoPrendaId) {
      if (Array.isArray(generoId)) {
        query = query.in('genero_id', generoId).eq('tipo_prenda_id', tipoPrendaId)
      } else {
        query = query.eq('genero_id', generoId).eq('tipo_prenda_id', tipoPrendaId)
      }
    } else if (generoId) {
      if (Array.isArray(generoId)) {
        query = query.in('genero_id', generoId)
      } else {
        query = query.eq('genero_id', generoId)
      }
    } else if (tipoPrendaId) {
      query = query.eq('tipo_prenda_id', tipoPrendaId)
    } else if (params.slug) {
      query = query.eq('slug_categoria', params.slug)
    }

    const { data, error } = await query.order('orden', { ascending: true }).limit(1)

    // Si no hubo coincidencia estricta en categoria_banners, NUNCA mostrar un banner no relacionado
    if (error || !data || data.length === 0) {
      return null
    }

    const row = data[0]
    let prodSku: string | null = null
    let prodSlug: string | null = null
    let finalImgUrl = row.imagen_url

    if (row.producto_id) {
      const { data: prod } = await (supabase.from('productos') as any)
        .select('sku_base, nombre, productos_web!left(slug)')
        .eq('id', row.producto_id)
        .maybeSingle()

      if (prod) {
        prodSku = prod.sku_base
        const pw = Array.isArray(prod.productos_web) ? prod.productos_web[0] : prod.productos_web
        prodSlug = pw?.slug ?? null
      }

      if (!finalImgUrl) {
        const { data: img } = await supabase
          .from('producto_imagenes')
          .select('url')
          .eq('producto_id', row.producto_id)
          .order('es_principal', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (img?.url) {
          finalImgUrl = img.url
        }
      }
    }

    if (!finalImgUrl) return null

    return {
      id: row.id,
      nombre: row.nombre,
      genero_id: row.genero_id,
      tipo_prenda_id: row.tipo_prenda_id,
      producto_id: row.producto_id,
      producto_web_id: row.producto_web_id,
      slug_categoria: row.slug_categoria,
      imagen_url: finalImgUrl,
      titulo_banner: row.titulo_banner || row.nombre,
      subtitulo_banner: row.subtitulo_banner,
      link_destino: row.link_destino || (prodSlug ? `/shop/${prodSlug}` : null),
      activo: row.activo ?? true,
      orden: row.orden ?? 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
      producto_sku: prodSku,
      producto_slug: prodSlug,
    }
  } catch (err) {
    console.error('Error en fetchBannerCategoriaActivo:', err)
    return null
  }
}

/**
 * Obtiene la portada para las tarjetas de colección (3:4) de la página principal (Home)
 * Totalmente independiente de los banners panorámicos de categoría
 */
export async function fetchPortadaColeccionHome(generoId: 1 | 2): Promise<{
  titulo: string
  imagen_url: string | null
  producto_sku: string | null
  producto_slug: string | null
}> {
  try {
    const supabase = createStaticClient()
    const nombreColeccion = generoId === 1 ? 'Colección Dama' : 'Colección Caballero'

    // 1. Buscar producto web destacado con foto para este género
    const { data: pwDestacados } = await (supabase.from('productos_web') as any)
      .select(`
        id,
        producto_id,
        slug,
        destacado,
        updated_at,
        productos!inner (
          id,
          sku_base,
          nombre,
          genero_id,
          activo
        )
      `)
      .eq('destacado', true)
      .eq('productos.genero_id', generoId)
      .eq('productos.activo', true)
      .order('updated_at', { ascending: false })
      .limit(5)

    if (pwDestacados && pwDestacados.length > 0) {
      for (const item of pwDestacados) {
        const { data: img } = await supabase
          .from('producto_imagenes')
          .select('url')
          .eq('producto_id', item.producto_id)
          .order('es_principal', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (img?.url) {
          return {
            titulo: nombreColeccion,
            imagen_url: img.url,
            producto_sku: item.productos.sku_base,
            producto_slug: item.slug,
          }
        }
      }
    }

    // 2. Fallback: buscar el producto más reciente con fotografía para este género
    const { data: prods } = await (supabase.from('productos') as any)
      .select(`
        id,
        sku_base,
        nombre,
        genero_id,
        productos_web!left(slug)
      `)
      .eq('activo', true)
      .eq('genero_id', generoId)
      .order('id', { ascending: false })
      .limit(10)

    if (prods && prods.length > 0) {
      for (const p of prods) {
        const { data: img } = await supabase
          .from('producto_imagenes')
          .select('url')
          .eq('producto_id', p.id)
          .order('es_principal', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (img?.url) {
          const pw = Array.isArray(p.productos_web) ? p.productos_web[0] : p.productos_web
          return {
            titulo: nombreColeccion,
            imagen_url: img.url,
            producto_sku: p.sku_base,
            producto_slug: pw?.slug ?? null,
          }
        }
      }
    }

    return {
      titulo: nombreColeccion,
      imagen_url: null,
      producto_sku: null,
      producto_slug: null,
    }
  } catch (err) {
    console.error('Error en fetchPortadaColeccionHome:', err)
    return {
      titulo: generoId === 1 ? 'Colección Dama' : 'Colección Caballero',
      imagen_url: null,
      producto_sku: null,
      producto_slug: null,
    }
  }
}

/**
 * Server Action: Crear nuevo banner de categoría
 */
export async function createBannerCategoriaAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const nombre = formData.get('nombre') as string
    const genero_id = formData.get('genero_id') ? Number(formData.get('genero_id')) : null
    const tipo_prenda_id = formData.get('tipo_prenda_id') ? Number(formData.get('tipo_prenda_id')) : null
    const producto_id = formData.get('producto_id') ? Number(formData.get('producto_id')) : null
    const titulo_banner = (formData.get('titulo_banner') as string) || null
    const subtitulo_banner = (formData.get('subtitulo_banner') as string) || null
    const link_destino = (formData.get('link_destino') as string) || null
    const orden = formData.get('orden') ? Number(formData.get('orden')) : 0

    const file = formData.get('file') as File | null
    let imagen_url = (formData.get('imagen_url') as string) || ''

    if (!nombre) {
      return { success: false, error: 'El nombre del banner es requerido.' }
    }

    // Subir archivo a Supabase Storage si se adjuntó un archivo
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `banners/categorias/banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error('Error subiendo banner a Storage:', uploadError)
        return { success: false, error: `Error subiendo archivo: ${uploadError.message}` }
      }

      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(uploadData.path)

      imagen_url = publicUrlData.publicUrl
    }

    if (!imagen_url) {
      return { success: false, error: 'Debes adjuntar una imagen o proporcionar una URL válida.' }
    }

    // Obtener producto_web_id si se seleccionó un producto
    let producto_web_id: number | null = null
    if (producto_id) {
      const { data: pw } = await supabase
        .from('productos_web')
        .select('id')
        .eq('producto_id', producto_id)
        .maybeSingle()
      
      if (pw) {
        producto_web_id = pw.id
      }
    }

    const { error: insertError } = await (supabase as any)
      .from('categoria_banners')
      .insert({
        nombre,
        genero_id,
        tipo_prenda_id,
        producto_id,
        producto_web_id,
        imagen_url,
        titulo_banner,
        subtitulo_banner,
        link_destino,
        orden,
        activo: true,
      })

    if (insertError) {
      console.error('Error insertando categoria_banners:', insertError)
      return { success: false, error: `Error en BD: ${insertError.message}` }
    }

    revalidatePath('/ecommerce/config')
    revalidatePath('/shop')
    revalidatePath('/inicio')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Excepción createBannerCategoriaAction:', err)
    return { success: false, error: err?.message || 'Error inesperado al crear el banner.' }
  }
}

/**
 * Server Action: Actualizar banner de categoría (datos, estado, o imagen)
 */
export async function updateBannerCategoriaAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const id = Number(formData.get('id'))
    if (!id) return { success: false, error: 'ID de banner inválido.' }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (formData.has('nombre')) updateData.nombre = formData.get('nombre')
    if (formData.has('activo')) updateData.activo = formData.get('activo') === 'true'
    if (formData.has('orden')) updateData.orden = Number(formData.get('orden'))
    if (formData.has('titulo_banner')) updateData.titulo_banner = formData.get('titulo_banner') || null
    if (formData.has('subtitulo_banner')) updateData.subtitulo_banner = formData.get('subtitulo_banner') || null
    if (formData.has('link_destino')) updateData.link_destino = formData.get('link_destino') || null
    if (formData.has('genero_id')) {
      const gVal = formData.get('genero_id')
      updateData.genero_id = gVal && gVal !== '' ? Number(gVal) : null
    }
    if (formData.has('tipo_prenda_id')) {
      const tpVal = formData.get('tipo_prenda_id')
      updateData.tipo_prenda_id = tpVal && tpVal !== '' ? Number(tpVal) : null
    }
    if (formData.has('producto_id')) {
      const pid = formData.get('producto_id') && formData.get('producto_id') !== '' ? Number(formData.get('producto_id')) : null
      updateData.producto_id = pid
      if (pid) {
        const { data: pw } = await supabase
          .from('productos_web')
          .select('id')
          .eq('producto_id', pid)
          .maybeSingle()
        updateData.producto_web_id = pw?.id ?? null
      } else {
        updateData.producto_web_id = null
      }
    }

    // Si se subió un nuevo archivo de imagen
    const file = formData.get('file') as File | null
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `banners/categorias/banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('productos')
        .upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error('Error subiendo imagen de banner actualizada:', uploadError)
        return { success: false, error: `Error subiendo archivo: ${uploadError.message}` }
      }

      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(uploadData.path)

      updateData.imagen_url = publicUrlData.publicUrl
    } else if (formData.has('imagen_url') && formData.get('imagen_url')) {
      updateData.imagen_url = formData.get('imagen_url')
    }

    const { error: updateError } = await (supabase as any)
      .from('categoria_banners')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Error actualizando banner:', updateError)
      return { success: false, error: updateError.message }
    }

    revalidatePath('/ecommerce/config')
    revalidatePath('/shop')
    revalidatePath('/inicio')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al actualizar.' }
  }
}

/**
 * Server Action: Eliminar banner de categoría
 */
export async function deleteBannerCategoriaAction(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await (supabase as any)
      .from('categoria_banners')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/ecommerce/config')
    revalidatePath('/shop')
    revalidatePath('/inicio')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al eliminar.' }
  }
}

// ═══════════════════════════════════════════════════════════════
// SELECTOR INTERACTIVO DE PRODUCTOS PARA DESTACADOS DE COLECCIÓN
// ═══════════════════════════════════════════════════════════════

export interface ProductoCandidatoColeccion {
  id: number
  producto_id: number
  nombre: string
  sku_base: string
  marca_nombre: string | null
  tipo_prenda_id: number | null
  tipo_prenda_nombre: string | null
  imagen_principal: string | null
  slug: string | null
  esta_publicado: boolean // true = activo en productos_web
}

export async function fetchTiposPrendaStore(): Promise<{ id: number; nombre: string }[]> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('cat_tipo_prenda')
      .select('id, nombre')
      .order('nombre')

    return data || []
  } catch (err) {
    return []
  }
}

export async function fetchProductosCandidatosColeccionAction(params: {
  generoId: number
  tipoPrendaId?: number | null
  q?: string
}): Promise<ProductoCandidatoColeccion[]> {
  try {
    const supabase = await createClient()

    let query = (supabase.from('productos') as any)
      .select(
        `
        id,
        sku_base,
        nombre,
        genero_id,
        tipo_prenda_id,
        activo,
        created_at,
        cat_marcas!left(nombre),
        cat_tipo_prenda!left(nombre),
        productos_web!left(id, slug, activo)
        `
      )
      .eq('activo', true)   // activo en catálogo interno
      .eq('genero_id', params.generoId)
      .order('id', { ascending: false })

    if (params.tipoPrendaId) {
      query = query.eq('tipo_prenda_id', params.tipoPrendaId)
    }

    if (params.q && params.q.trim()) {
      const term = `%${params.q.trim()}%`
      query = query.or(`sku_base.ilike.${term},nombre.ilike.${term}`)
    }

    const { data: prods, error } = await query.limit(50)

    if (error || !prods || prods.length === 0) {
      return []
    }

    const prodIds = prods.map((p: any) => p.id)

    // Obtener imágenes principales
    const { data: imgs } = await supabase
      .from('producto_imagenes')
      .select('producto_id, url, es_principal')
      .in('producto_id', prodIds)
      .order('es_principal', { ascending: false })

    const imgMap = (imgs || []).reduce((acc: Record<number, string>, row: any) => {
      if (!acc[row.producto_id] || row.es_principal) {
        acc[row.producto_id] = row.url
      }
      return acc
    }, {})

    return prods
      .filter((p: any) => Boolean(imgMap[p.id]))
      .map((p: any) => {
        const pw = Array.isArray(p.productos_web) ? p.productos_web[0] : p.productos_web
        return {
          id: p.id,
          producto_id: p.id,
          nombre: p.nombre,
          sku_base: p.sku_base,
          marca_nombre: p.cat_marcas?.nombre || null,
          tipo_prenda_id: p.tipo_prenda_id,
          tipo_prenda_nombre: p.cat_tipo_prenda?.nombre || null,
          imagen_principal: imgMap[p.id] || null,
          slug: pw?.slug || null,
          esta_publicado: Boolean(pw && pw.activo),
        }
      })
  } catch (err) {
    console.error('Error en fetchProductosCandidatosColeccionAction:', err)
    return []
  }
}

/**
 * Server Action: Asigna una prenda destacada para la portada de Colección en la página principal (Home)
 * No sobreescribe categoria_banners
 */
export async function asignarProductoDestacadoColeccionAction(params: {
  generoId: number // 1: Dama, 2: Caballero
  productoId: number
  imagenUrl: string
  tituloBanner?: string
  linkDestino?: string
  publicarProducto?: boolean
}): Promise<{ success: boolean; error?: string; detalle?: string }> {
  try {
    const supabase = await createClient()

    // 1. Obtener o crear registro en productos_web
    const { data: pw } = await supabase
      .from('productos_web')
      .select('id, activo, slug')
      .eq('producto_id', params.productoId)
      .maybeSingle()

    if (pw) {
      if (params.publicarProducto && !pw.activo) {
        const { error: pwErr } = await supabase
          .from('productos_web')
          .update({ destacado: true, activo: true, updated_at: new Date().toISOString() })
          .eq('id', pw.id)
        if (pwErr) {
          console.error('Error al publicar producto en productos_web:', pwErr.message)
          return { success: false, error: `No se pudo publicar el producto: ${pwErr.message}` }
        }
      } else {
        const { error: pwErr } = await supabase
          .from('productos_web')
          .update({ destacado: true, updated_at: new Date().toISOString() })
          .eq('id', pw.id)
        if (pwErr) {
          console.error('Error al marcar destacado en productos_web:', pwErr.message)
          return { success: false, error: `No se pudo marcar como destacado: ${pwErr.message}` }
        }
      }
    }

    const nombreColeccion = params.generoId === 1 ? 'Colección Dama' : 'Colección Caballero'

    revalidatePath('/')
    revalidatePath('/inicio')
    revalidatePath('/shop')
    return { success: true, detalle: `Portada de ${nombreColeccion} actualizada en la página de inicio` }
  } catch (err: any) {
    console.error('Error en asignarProductoDestacadoColeccionAction:', err)
    return { success: false, error: err?.message || 'Error al asignar producto a la colección' }
  }
}
