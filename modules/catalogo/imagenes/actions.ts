// modules/catalogo/imagenes/actions.ts
// app/(admin)/catalogo/imagenes/components/ImageQuickEdit.tsx
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import { resolverSkuParaArchivo, type MatchResult, type SkuCatalogProduct } from './sku-matcher'

type ActionResult = { success: boolean; error?: string; message?: string }

const BUCKET = 'product_images'

/**
 * Revalida todas las rutas y tags afectados por cambios en imágenes de productos.
 */
async function revalidateImagenesProducto(productoId?: number, supabaseClient?: any) {
  try {
    revalidatePath('/catalogo/imagenes')
    revalidatePath('/catalogo')
    revalidatePath('/ecommerce')
    revalidatePath('/ecommerce/productos')
    revalidatePath('/shop')
    revalidatePath('/inicio')
    revalidatePath('/')
    revalidateTag('catalogo-filtros', 'max')

    if (productoId) {
      revalidatePath(`/catalogo/${productoId}`)

      if (supabaseClient) {
        const { data: webData } = await supabaseClient
          .from('productos_web')
          .select('slug')
          .eq('producto_id', productoId)
          .maybeSingle()

        if (webData?.slug) {
          revalidatePath(`/shop/${webData.slug}`)
        }
      }
    }
  } catch (err) {
    console.warn('[revalidateImagenesProducto] Warning revalidating paths:', err)
  }
}

/**
 * Actualiza una imagen (alt_text, uso, orden, principal, producto_id).
 * Permite reasignar la imagen a otro producto si fue asociada incorrectamente.
 */
export async function updateImagenGlobalAction(
  imagenId: number,
  data: {
    alt_text?: string | null
    uso_imagen?: string
    orden?: number
    es_principal?: boolean
    producto_id?: number
  }
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // 1. Obtener imagen actual
  const { data: imgData, error: fetchErr } = await (supabase.from('producto_imagenes') as any)
    .select('producto_id, es_principal')
    .eq('id', imagenId)
    .single()

  if (fetchErr || !imgData) {
    return { success: false, error: 'No se encontró la imagen' }
  }

  const oldProductoId = imgData.producto_id as number
  const targetProductoId = data.producto_id !== undefined ? Number(data.producto_id) : oldProductoId
  const isChangingProduct = targetProductoId !== oldProductoId

  // 2. Si se cambia de producto y la imagen era principal en el producto anterior:
  if (isChangingProduct && imgData.es_principal) {
    // Promover la siguiente imagen disponible del producto anterior a principal
    const { data: remainingImgs } = await (supabase.from('producto_imagenes') as any)
      .select('id')
      .eq('producto_id', oldProductoId)
      .neq('id', imagenId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)

    if (remainingImgs && remainingImgs.length > 0) {
      await (supabase.from('producto_imagenes') as any)
        .update({ es_principal: true })
        .eq('id', remainingImgs[0].id)
    }
  }

  // 3. Determinar es_principal para el producto destino
  let finalEsPrincipal = data.es_principal
  if (isChangingProduct && finalEsPrincipal === undefined) {
    // Si no se especificó y se movió de producto, verificar si el nuevo producto ya tiene principal
    const { data: targetHasPrincipal } = await (supabase.from('producto_imagenes') as any)
      .select('id')
      .eq('producto_id', targetProductoId)
      .eq('es_principal', true)
      .limit(1)

    if (!targetHasPrincipal || targetHasPrincipal.length === 0) {
      finalEsPrincipal = true
    }
  }

  // Si esta imagen será principal, quitar principal de otras imágenes del producto destino
  if (finalEsPrincipal) {
    await (supabase.from('producto_imagenes') as any)
      .update({ es_principal: false })
      .eq('producto_id', targetProductoId)
      .neq('id', imagenId)
  }

  // 4. Preparar payload de actualización
  const updatePayload: Record<string, any> = {}
  if (data.alt_text !== undefined) updatePayload.alt_text = data.alt_text
  if (data.uso_imagen !== undefined) updatePayload.uso_imagen = data.uso_imagen
  if (data.orden !== undefined) updatePayload.orden = data.orden
  if (finalEsPrincipal !== undefined) updatePayload.es_principal = finalEsPrincipal
  if (isChangingProduct) updatePayload.producto_id = targetProductoId

  const { error: updateErr } = await (supabase.from('producto_imagenes') as any)
    .update(updatePayload)
    .eq('id', imagenId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // 5. Revalidar caches y páginas
  await revalidateImagenesProducto(oldProductoId, supabase)
  if (isChangingProduct) {
    await revalidateImagenesProducto(targetProductoId, supabase)
  }

  return {
    success: true,
    message: isChangingProduct
      ? 'Imagen reasignada al nuevo producto con éxito'
      : 'Imagen actualizada'
  }
}

/**
 * Elimina imagen con opción de desvincular (mantener archivo en Storage).
 * 
 * @param imagenId - ID de la imagen a eliminar
 * @param desvincularSolo - Si true, solo elimina de BD pero deja el archivo en Storage
 */
export async function deleteImagenGlobalAction(
  imagenId: number,
  desvincularSolo: boolean = false
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // 1. Obtener la URL de la imagen
  const { data: imgData, error: fetchError } = await (supabase
    .from('producto_imagenes') as any)
    .select('url, origen_imagen, producto_id, es_principal')
    .eq('id', imagenId)
    .single()

  if (fetchError || !imgData) {
    return { success: false, error: 'No se encontró la imagen.' }
  }

  const productoId = imgData.producto_id
  const eraPrincipal = imgData.es_principal === true

  // 2. Si NO es desvincularSolo Y es imagen local, eliminarla del Storage
  if (!desvincularSolo && imgData.origen_imagen === 'local' && imgData.url) {
    const bucketPrefix = `/object/public/${BUCKET}/`
    const urlPath = imgData.url as string
    const idx = urlPath.indexOf(bucketPrefix)
    
    if (idx !== -1) {
      const storagePath = urlPath.slice(idx + bucketPrefix.length)
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([storagePath])
      
      if (storageError) {
        console.warn('[deleteImagenGlobalAction] Storage remove warning:', storageError.message)
      }
    }
  }

  // 3. Eliminar de la BD (o desvincular)
  const { error: dbError } = await (supabase.from('producto_imagenes') as any)
    .delete()
    .eq('id', imagenId)

  if (dbError) {
    return { success: false, error: dbError.message }
  }

  // 4. Si era principal, promover la siguiente imagen restante
  if (eraPrincipal && productoId) {
    const { data: restantes } = await (supabase.from('producto_imagenes') as any)
      .select('id')
      .eq('producto_id', productoId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)

    if (restantes && restantes.length > 0) {
      await (supabase.from('producto_imagenes') as any)
        .update({ es_principal: true })
        .eq('id', restantes[0].id)
    }
  }

  await revalidateImagenesProducto(productoId, supabase)
  
  return { success: true, message: desvincularSolo ? 'Imagen desvinculada (archivo conservado en Storage)' : 'Imagen eliminada' }
}

/**
 * Define una imagen como principal de su producto.
 */
export async function setImagenPrincipalAction(
  imagenId: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // Quitar principal de otras imágenes del producto
  await (supabase.from('producto_imagenes') as any)
    .update({ es_principal: false })
    .eq('producto_id', productoId)

  // Establecer esta como principal
  const { error } = await (supabase.from('producto_imagenes') as any)
    .update({ es_principal: true })
    .eq('id', imagenId)

  if (error) {
    return { success: false, error: error.message }
  }

  await revalidateImagenesProducto(productoId, supabase)
  return { success: true }
}

/**
 * Importa imágenes desde URLs externas (usando Excel/CSV).
 * Por cada fila del Excel: busca el producto por SKU y crea el registro de imagen.
 */
export async function importarImagenesDesdeExcelAction(
  rows: {
    sku: string
    url: string
    es_principal: boolean
    alt_text: string
    uso: string
    orden: number
  }[]
): Promise<{ success: number; failed: number }> {
  const user = await getCurrentUser()
  if (!user) return { success: 0, failed: rows.length }

  const supabase = await createClient()

  let successCount = 0
  let failCount = 0
  const productosAfectados = new Set<number>()

  for (const row of rows) {
    try {
      // 1. Buscar producto por SKU
      const { data: producto, error: prodError } = await (supabase
        .from('productos') as any)
        .select('id')
        .eq('sku_base', row.sku)
        .single()

      if (prodError || !producto) {
        console.warn(`[importarImagenesDesdeExcelAction] Producto no encontrado: ${row.sku}`)
        failCount++
        continue
      }

      productosAfectados.add(producto.id)

      let esPrincipal = row.es_principal

      if (!esPrincipal) {
        const { count: principalCount } = await (supabase.from('producto_imagenes') as any)
          .select('id', { count: 'exact', head: true })
          .eq('producto_id', producto.id)
          .eq('es_principal', true)

        if (!principalCount || principalCount === 0) {
          esPrincipal = true
        }
      }

      // 2. Si es principal, quitar principal de otras imágenes del producto
      if (esPrincipal) {
        await (supabase.from('producto_imagenes') as any)
          .update({ es_principal: false })
          .eq('producto_id', producto.id)
      }

      // 3. Insertar imagen
      const { error: insertError } = await (supabase.from('producto_imagenes') as any)
        .insert({
          producto_id: producto.id,
          url: row.url,
          alt_text: row.alt_text || null,
          uso_imagen: row.uso || 'galeria_secundaria',
          orden: row.orden || 0,
          es_principal: esPrincipal,
          origen_imagen: 'url_externa',
        })

      if (insertError) {
        console.warn(`[importarImagenesDesdeExcelAction] Error inserting: ${insertError.message}`)
        failCount++
      } else {
        successCount++
      }
    } catch (err) {
      console.warn(`[importarImagenesDesdeExcelAction] Exception:`, err)
      failCount++
    }
  }

  if (successCount > 0) {
    await revalidateImagenesProducto(undefined, supabase)
    for (const prodId of productosAfectados) {
      revalidatePath(`/catalogo/${prodId}`)
    }
  }

  return { success: successCount, failed: failCount }
}

/**
 * Sube imágenes locales (archivos) al Storage y las asocia a productos por SKU.
 * Cada imagen se sube al bucket, se crea el registro en producto_imagenes.
 */
export async function uploadImagenesConSkuAction(
  imagenes: {
    file: File
    producto_id: number
    sku_base: string
    alt_text: string
    uso_imagen: string
    orden: number
    es_principal: boolean
  }[]
): Promise<{ success: number; failed: number }> {
  const user = await getCurrentUser()
  if (!user) return { success: 0, failed: imagenes.length }

  const supabase = await createClient()
  
  let successCount = 0
  let failCount = 0
  const productosAfectados = new Set<number>()

  for (const img of imagenes) {
    try {
      let esPrincipal = img.es_principal

      if (!esPrincipal) {
        const { count: principalCount } = await (supabase.from('producto_imagenes') as any)
          .select('id', { count: 'exact', head: true })
          .eq('producto_id', img.producto_id)
          .eq('es_principal', true)

        if (!principalCount || principalCount === 0) {
          esPrincipal = true
        }
      }

      // 1. Si es principal, quitar principal de otras imágenes del producto
      if (esPrincipal) {
        await (supabase.from('producto_imagenes') as any)
          .update({ es_principal: false })
          .eq('producto_id', img.producto_id)
      }

      // 2. Subir archivo al Storage
      const fileBuffer = await img.file.arrayBuffer()
      const filePath = `${img.sku_base}/${Date.now()}_${img.file.name}`
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: img.file.type,
          upsert: false,
        })

      if (uploadError) {
        console.warn('[uploadImagenesConSkuAction] Upload error:', uploadError.message)
        failCount++
        continue
      }

      // 3. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath)

      const publicUrl = urlData.publicUrl

      // 4. Crear registro en producto_imagenes
      const { error: insertError } = await (supabase.from('producto_imagenes') as any)
        .insert({
          producto_id: img.producto_id,
          url: publicUrl,
          alt_text: img.alt_text || null,
          uso_imagen: img.uso_imagen || 'galeria_secundaria',
          orden: img.orden || 0,
          es_principal: esPrincipal,
          origen_imagen: 'local',
        })

      if (insertError) {
        console.warn('[uploadImagenesConSkuAction] Insert error:', insertError.message)
        // Limpiar archivo subido si falla el registro
        await supabase.storage.from(BUCKET).remove([filePath])
        failCount++
      } else {
        successCount++
        productosAfectados.add(img.producto_id)
      }
    } catch (err) {
      console.warn('[uploadImagenesConSkuAction] Exception:', err)
      failCount++
    }
  }

  if (successCount > 0) {
    await revalidateImagenesProducto(undefined, supabase)
    for (const prodId of productosAfectados) {
      revalidatePath(`/catalogo/${prodId}`)
    }
  }

  return { success: successCount, failed: failCount }
}

/**
 * Sube una sola imagen local al Storage y la asocia a un producto.
 * Recibe FormData para evitar problemas de serialización en Server Actions.
 */
export async function uploadSingleImagenConSkuAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const file = formData.get('file') as File
  const productoId = Number(formData.get('producto_id'))
  const skuBase = formData.get('sku_base') as string
  const altText = formData.get('alt_text') as string
  const usoImagen = formData.get('uso_imagen') as string
  let esPrincipal = formData.get('es_principal') === 'true'

  if (!file) return { success: false, error: 'Archivo no recibido en el servidor' }

  try {
    if (!esPrincipal) {
      const { count: principalCount } = await (supabase.from('producto_imagenes') as any)
        .select('id', { count: 'exact', head: true })
        .eq('producto_id', productoId)
        .eq('es_principal', true)

      if (!principalCount || principalCount === 0) {
        esPrincipal = true
      }
    }

    // 1. Si es principal, quitar principal de otras imágenes del producto
    if (esPrincipal) {
      await (supabase.from('producto_imagenes') as any)
        .update({ es_principal: false })
        .eq('producto_id', productoId)
    }

    // 2. Subir archivo al Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const filePath = `${skuBase}/${cleanFileName}`
    
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.warn('[uploadSingleImagenConSkuAction] Upload error:', uploadError.message)
      return { success: false, error: uploadError.message }
    }

    // 3. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // 4. Crear registro en producto_imagenes
    const { error: insertError } = await (supabase.from('producto_imagenes') as any)
      .insert({
        producto_id: productoId,
        url: publicUrl,
        alt_text: altText || null,
        uso_imagen: usoImagen || 'galeria_secundaria',
        orden: 0,
        es_principal: esPrincipal,
        origen_imagen: 'local',
      })

    if (insertError) {
      console.warn('[uploadSingleImagenConSkuAction] Insert error:', insertError.message)
      // Limpiar archivo subido si falla el registro
      await supabase.storage.from(BUCKET).remove([filePath])
      return { success: false, error: insertError.message }
    }

    await revalidateImagenesProducto(productoId, supabase)
    return { success: true }
  } catch (err: any) {
    console.warn('[uploadSingleImagenConSkuAction] Exception:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Detecta y empareja los SKUs para un lote de nombres de archivo subidos.
 * Utiliza el motor híbrido multicapa (reglas MOTI, canónicas, O/0, sufijos de fotos).
 */
export async function detectarSkusArchivosAction(
  filenames: string[]
): Promise<{ success: boolean; results: Record<string, MatchResult>; error?: string }> {
  try {
    if (!filenames || filenames.length === 0) {
      return { success: true, results: {} }
    }

    const supabase = await createClient()
    const { data: prods, error } = await (supabase.from('productos') as any)
      .select('id, sku_base, nombre')
      .eq('activo', true)

    if (error || !prods) {
      console.error('[detectarSkusArchivosAction] Error fetching catalog:', error)
      return { success: false, results: {}, error: error?.message || 'Error al consultar catálogo' }
    }

    const catalog: SkuCatalogProduct[] = prods.map((p: any) => ({
      id: Number(p.id),
      sku_base: String(p.sku_base),
      nombre: p.nombre ? String(p.nombre) : null,
    }))

    const results: Record<string, MatchResult> = {}
    for (const filename of filenames) {
      results[filename] = resolverSkuParaArchivo(filename, catalog)
    }

    return { success: true, results }
  } catch (err: any) {
    console.error('[detectarSkusArchivosAction] Exception:', err)
    return { success: false, results: {}, error: err.message }
  }
}