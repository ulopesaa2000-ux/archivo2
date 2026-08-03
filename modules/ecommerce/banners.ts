// modules/ecommerce/banners.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
 */
export async function fetchBannersCategorias(): Promise<CategoriaBannerResuelto[]> {
  try {
    const supabase = await createClient()

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

    return (data || []).map((row: any) => ({
      id: row.id,
      nombre: row.nombre,
      genero_id: row.genero_id,
      tipo_prenda_id: row.tipo_prenda_id,
      producto_id: row.producto_id,
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
    }))
  } catch (err) {
    console.warn('Exception in fetchBannersCategorias:', err)
    return []
  }
}

/**
 * Obtiene el banner promocional activo para una categoría específica en la tienda pública
 */
export async function fetchBannerCategoriaActivo(params: {
  generoId?: number | null
  genero?: string | null
  tipoPrendaId?: number | null
  tipo?: string | null
  slug?: string | null
}): Promise<CategoriaBannerResuelto | null> {
  try {
    const supabase = await createClient()

    let generoId = params.generoId
    if (!generoId && params.genero) {
      const gLower = params.genero.toLowerCase()
      if (gLower.includes('dama') || gLower.includes('mujer')) generoId = 1
      else if (gLower.includes('caballero') || gLower.includes('hombre')) generoId = 2
      else if (gLower.includes('unisex')) generoId = 3
    }

    let tipoPrendaId = params.tipoPrendaId
    if (!tipoPrendaId && params.tipo) {
      const tLower = params.tipo.toLowerCase()
      if (tLower.includes('chamarra')) tipoPrendaId = 5
      else if (tLower.includes('rompevientos')) tipoPrendaId = 11
      else if (tLower.includes('chaleco')) tipoPrendaId = 4
      else if (tLower.includes('set') || tLower.includes('conjunto')) tipoPrendaId = 13
      else if (tLower.includes('sueter')) tipoPrendaId = 16
      else if (tLower.includes('sudadera')) tipoPrendaId = 15
      else if (tLower.includes('abrigo')) tipoPrendaId = 1
    }

    // 1. Intentar buscar en categoria_banners
    try {
      let query = (supabase as any)
        .from('categoria_banners')
        .select('*')
        .eq('activo', true)

      if (generoId && tipoPrendaId) {
        query = query.eq('genero_id', generoId).eq('tipo_prenda_id', tipoPrendaId)
      } else if (generoId) {
        query = query.eq('genero_id', generoId)
      } else if (tipoPrendaId) {
        query = query.eq('tipo_prenda_id', tipoPrendaId)
      } else if (params.slug) {
        query = query.eq('slug_categoria', params.slug)
      }

      query = query.order('orden', { ascending: true }).limit(1)

      const { data, error } = await query

      if (!error && data && data.length > 0) {
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

        if (finalImgUrl) {
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
        }
      }
    } catch (bErr) {
      console.warn('Nota en fetchBannerCategoriaActivo (categoria_banners):', bErr)
    }

    // 2. BUSCAR EL PRODUCTO DESTACADO ASIGNADO MÁS RECIENTE EN productos_web
    if (generoId) {
      try {
        const { data: pwDestacado } = await (supabase.from('productos_web') as any)
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
              tipo_prenda_id,
              activo
            )
          `)
          .eq('destacado', true)
          .eq('productos.genero_id', generoId)
          .eq('productos.activo', true)
          .order('updated_at', { ascending: false })
          .limit(5)

        if (pwDestacado && pwDestacado.length > 0) {
          for (const item of pwDestacado) {
            const prod = item.productos
            const { data: img } = await supabase
              .from('producto_imagenes')
              .select('url')
              .eq('producto_id', item.producto_id)
              .order('es_principal', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (img?.url) {
              const gNombre = generoId === 1 ? 'Colección Dama' : 'Colección Caballero'
              const defaultLink = item.slug ? `/shop/${item.slug}` : (generoId === 1 ? '/shop?genero=dama' : '/shop?genero=caballero')

              return {
                id: item.id,
                nombre: gNombre,
                genero_id: generoId,
                tipo_prenda_id: prod.tipo_prenda_id,
                producto_id: item.producto_id,
                producto_web_id: item.id,
                slug_categoria: null,
                imagen_url: img.url,
                titulo_banner: gNombre,
                subtitulo_banner: prod.nombre,
                link_destino: defaultLink,
                activo: true,
                orden: 1,
                created_at: item.updated_at,
                updated_at: item.updated_at,
                producto_sku: prod.sku_base,
                producto_slug: item.slug,
              }
            }
          }
        }
      } catch (pErr) {
        console.warn('Nota en fetchBannerCategoriaActivo (productos_web):', pErr)
      }

      // 3. Fallback secundario: si no hay destacado guardado, tomar el producto más reciente con foto
      let pQuery = (supabase.from('productos') as any)
        .select(
          `
          id,
          sku_base,
          nombre,
          genero_id,
          tipo_prenda_id,
          created_at,
          productos_web!left(slug)
          `
        )
        .eq('activo', true)
        .eq('genero_id', generoId)
        .order('id', { ascending: false })
        .limit(10)

      if (tipoPrendaId) {
        pQuery = pQuery.eq('tipo_prenda_id', tipoPrendaId)
      }

      const { data: prods } = await pQuery

      if (prods && prods.length > 0) {
        const prodIds = prods.map((p: any) => p.id)

        const { data: imgs } = await supabase
          .from('producto_imagenes')
          .select('producto_id, url, es_principal')
          .in('producto_id', prodIds)

        const imgMap = (imgs || []).reduce((acc: Record<number, string>, img: any) => {
          if (!acc[img.producto_id] || img.es_principal) {
            acc[img.producto_id] = img.url
          }
          return acc
        }, {})

        for (const p of prods) {
          const imgUrl = imgMap[p.id]
          if (imgUrl) {
            const pw = Array.isArray(p.productos_web) ? p.productos_web[0] : p.productos_web
            const gNombre = generoId === 1 ? 'Colección Dama' : 'Colección Caballero'
            const defaultLink = pw?.slug ? `/shop/${pw.slug}` : (generoId === 1 ? '/shop?genero=dama' : '/shop?genero=caballero')

            return {
              id: p.id,
              nombre: gNombre,
              genero_id: generoId,
              tipo_prenda_id: p.tipo_prenda_id,
              producto_id: p.id,
              producto_web_id: pw?.id ?? null,
              slug_categoria: null,
              imagen_url: imgUrl,
              titulo_banner: gNombre,
              subtitulo_banner: p.nombre,
              link_destino: defaultLink,
              activo: true,
              orden: 1,
              created_at: p.created_at,
              updated_at: p.created_at,
              producto_sku: p.sku_base,
              producto_slug: pw?.slug ?? null,
            }
          }
        }
      }
    }

    return null
  } catch (err) {
    console.error('Error en fetchBannerCategoriaActivo:', err)
    return null
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
    return { success: true }
  } catch (err: any) {
    console.error('Excepción createBannerCategoriaAction:', err)
    return { success: false, error: err?.message || 'Error inesperado al crear el banner.' }
  }
}

/**
 * Server Action: Alternar estado activo o actualizar orden/datos del banner
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
    if (formData.has('genero_id')) updateData.genero_id = formData.get('genero_id') ? Number(formData.get('genero_id')) : null
    if (formData.has('tipo_prenda_id')) updateData.tipo_prenda_id = formData.get('tipo_prenda_id') ? Number(formData.get('tipo_prenda_id')) : null
    if (formData.has('producto_id')) {
      const pid = formData.get('producto_id') ? Number(formData.get('producto_id')) : null
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
      .limit(50)

    if (params.tipoPrendaId) {
      query = query.eq('tipo_prenda_id', params.tipoPrendaId)
    }

    if (params.q && params.q.trim()) {
      const term = `%${params.q.trim()}%`
      query = query.or(`sku_base.ilike.${term},nombre.ilike.${term}`)
    }

    const { data: rawData, error } = await query

    if (error || !rawData) {
      return []
    }

    const productoIds = rawData.map((p: any) => p.id)
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

    const resultado: ProductoCandidatoColeccion[] = []

    for (const item of rawData) {
      const imgUrl = imagenesMap[item.id]
      if (!imgUrl) continue // Solo productos con imagen real

      const pw = Array.isArray(item.productos_web) ? item.productos_web[0] : item.productos_web

      const estaPublicado = !!(pw && pw.activo !== false && pw.slug)
      resultado.push({
        id: item.id,
        producto_id: item.id,
        nombre: item.nombre,
        sku_base: item.sku_base,
        marca_nombre: item.cat_marcas?.nombre ?? null,
        tipo_prenda_id: item.tipo_prenda_id,
        tipo_prenda_nombre: item.cat_tipo_prenda?.nombre ?? null,
        imagen_principal: imgUrl,
        slug: pw?.slug ?? null,
        esta_publicado: estaPublicado,
      })
    }

    return resultado
  } catch (err) {
    console.error('Error en fetchProductosCandidatosColeccionAction:', err)
    return []
  }
}

export async function asignarProductoDestacadoColeccionAction(params: {
  generoId: number
  productoId: number
  imagenUrl: string
  tituloBanner?: string
  linkDestino?: string
  publicarProducto?: boolean // si true, activa el producto en productos_web
}): Promise<{ success: boolean; error?: string; detalle?: string }> {
  try {
    const supabase = await createClient()

    // 1. Obtener o publicar el producto en productos_web
    const { data: pw } = await supabase
      .from('productos_web')
      .select('id, slug, activo')
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

    const bannerData = {
      nombre: nombreColeccion,
      genero_id: params.generoId,
      producto_id: params.productoId,
      producto_web_id: pw?.id ?? null,
      imagen_url: params.imagenUrl,
      titulo_banner: params.tituloBanner || nombreColeccion,
      link_destino: params.linkDestino || (params.generoId === 1 ? '/shop?genero=dama' : '/shop?genero=caballero'),
      activo: true,
      updated_at: new Date().toISOString(),
    }

    // 2. Upsert en categoria_banners — propagar errores al usuario
    const { data: existentes } = await (supabase as any)
      .from('categoria_banners')
      .select('id')
      .eq('genero_id', params.generoId)

    if (existentes && existentes.length > 0) {
      const { error: updateError } = await (supabase as any)
        .from('categoria_banners')
        .update(bannerData)
        .eq('id', existentes[0].id)

      if (updateError) {
        console.error('Error al actualizar categoria_banners:', updateError.message)
        return {
          success: false,
          error: `Error al guardar banner: ${updateError.message}`,
          detalle: `UPDATE categoria_banners id=${existentes[0].id}`
        }
      }
    } else {
      const { error: insertError } = await (supabase as any)
        .from('categoria_banners')
        .insert({
          ...bannerData,
          orden: 1,
        })

      if (insertError) {
        console.error('Error al insertar categoria_banners:', insertError.message)
        return {
          success: false,
          error: `Error al crear banner: ${insertError.message}`,
          detalle: 'INSERT categoria_banners'
        }
      }
    }

    revalidatePath('/')
    revalidatePath('/shop')
    return { success: true, detalle: `Banner de ${nombreColeccion} guardado correctamente` }
  } catch (err: any) {
    console.error('Error en asignarProductoDestacadoColeccionAction:', err)
    return { success: false, error: err?.message || 'Error al asignar producto a la colección' }
  }
}

