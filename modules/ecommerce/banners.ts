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
    } else {
      return null
    }

    query = query.order('orden', { ascending: true }).limit(1)

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return null
    }

    const row = data[0]
    return {
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
    }
  } catch (err) {
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
