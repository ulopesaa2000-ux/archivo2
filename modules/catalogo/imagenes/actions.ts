// modules/catalogo/imagenes/actions.ts
// app/(admin)/catalogo/imagenes/components/ImageQuickEdit.tsx
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'

type ActionResult = { success: boolean; error?: string; message?: string }

const BUCKET = 'product_images'

/**
 * Actualiza una imagen (alt_text, uso, orden, principal).
 * Nota: producto_id no es editable - la imagen ya está asociada a un producto.
 */
export async function updateImagenGlobalAction(
  imagenId: number,
  data: {
    alt_text?: string | null
    uso_imagen?: string
    orden?: number
    es_principal?: boolean
  }
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // Si es principal, obtener producto_id y quitar principal de otras imágenes
  if (data.es_principal) {
    const { data: imgData } = await (supabase.from('producto_imagenes') as any)
      .select('producto_id')
      .eq('id', imagenId)
      .single()
    
    if (imgData?.producto_id) {
      await (supabase.from('producto_imagenes') as any)
        .update({ es_principal: false })
        .eq('producto_id', imgData.producto_id)
        .neq('id', imagenId)
    }
  }

  const { error } = await (supabase.from('producto_imagenes') as any)
    .update(data)
    .eq('id', imagenId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/catalogo/imagenes')
  return { success: true }
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
    .select('url, origen_imagen, producto_id')
    .eq('id', imagenId)
    .single()

  if (fetchError || !imgData) {
    return { success: false, error: 'No se encontró la imagen.' }
  }

  const productoId = imgData.producto_id

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

  revalidatePath('/catalogo/imagenes')
  revalidatePath(`/catalogo/${productoId}`)
  
  return { success: true, message: desvincularSolo ? 'Imagen desvinculada (archivo сохраняется en Storage)' : 'Imagen eliminada' }
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

  revalidatePath('/catalogo/imagenes')
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

      // 2. Si es principal, quitar principal de otras imágenes del producto
      if (row.es_principal) {
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
          es_principal: row.es_principal || false,
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
    revalidatePath('/catalogo/imagenes')
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

  for (const img of imagenes) {
    try {
      // 1. Si es principal, quitar principal de otras imágenes del producto
      if (img.es_principal) {
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
          es_principal: img.es_principal || false,
          origen_imagen: 'local',
        })

      if (insertError) {
        console.warn('[uploadImagenesConSkuAction] Insert error:', insertError.message)
        // Limpiar archivo subido si falla el registro
        await supabase.storage.from(BUCKET).remove([filePath])
        failCount++
      } else {
        successCount++
      }
    } catch (err) {
      console.warn('[uploadImagenesConSkuAction] Exception:', err)
      failCount++
    }
  }

  if (successCount > 0) {
    revalidatePath('/catalogo/imagenes')
  }

  return { success: successCount, failed: failCount }
}