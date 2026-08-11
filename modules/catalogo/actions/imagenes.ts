// modules/catalogo/actions/imagenes.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import sharp from 'sharp'
import type { Database } from '@/lib/types/database.types'
import {
  type ActionResult,
  toCleanText,
  toInteger,
  toBoolean,
} from './_shared'

// Mapa de uso_imagen → subcarpeta en el bucket
const USO_A_FOLDER: Record<string, string> = {
  principal_ecommerce: 'principal',
  galeria_secundaria:  'galeria',
  ficha_tecnica:       'ficha',
  marketing_banner:    'marketing',
  etiqueta_logistica:  'etiqueta',
  color_variacion:     'variantes/color',
  tallas_variacion:    'variantes/talla',
}

const BUCKET = 'product_images'

// ─────────────────────────────────────────────────────────────────────────────
// Upload (Storage + producto_imagenes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sube un archivo al bucket de Supabase Storage con la ruta estructurada:
 *   Productos/{skuBase}/{folder}/{uuid}.webp
 * O registra directamente una URL externa sin tocar el Storage.
 */
export async function uploadImagenAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // ── Campos comunes ────────────────────────────────────────
  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id') || toInteger(formData, 'id')
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const skuBase = toCleanText(formData, 'sku_base')
  if (!skuBase) return { success: false, error: 'SKU del producto requerido.' }

  const usoImagen    = toCleanText(formData, 'uso_imagen') ?? 'principal_ecommerce'
  const altText      = toCleanText(formData, 'alt_text')
  const orden        = toInteger(formData, 'orden') ?? 0
  const esPrincipal  = formData.get('es_principal') === 'true'
  const origenImagen = toCleanText(formData, 'origen_imagen') ?? 'local'

  let publicUrl: string
  const urlOg: string | null = null // Disponible para ambos modos

  if (origenImagen === 'url_externa') {
    // ── Modo URL externa: no se sube nada al Storage ─────────
    const urlExterna = toCleanText(formData, 'url_externa')
    if (!urlExterna) return { success: false, error: 'URL de imagen requerida.' }
    // Validación básica de URL
    try { new URL(urlExterna) } catch {
      return { success: false, error: 'La URL proporcionada no es válida.' }
    }
    publicUrl = urlExterna
  } else {
    // ── Modo local: subir al Storage con optimización ───────
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) return { success: false, error: 'No se recibió ningún archivo.' }

    const skuSafe = skuBase.replace(/[^a-zA-Z0-9_\-]/g, '_')
    const uuid = crypto.randomUUID()

    // ── Obtener arrayBuffer una sola vez ─────────────────────
    let fileArrayBuffer: ArrayBuffer
    try {
      fileArrayBuffer = await file.arrayBuffer()
    } catch (err: unknown) {
      console.error('Error leyendo archivo:', err)
      return { success: false, error: 'Error al leer el archivo.' }
    }

    // ── Optimización WebP para display normal ─────────────────
    let optimizedBuffer: Buffer
    try {
      optimizedBuffer = await sharp(Buffer.from(fileArrayBuffer))
        .resize({ width: 2048, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
    } catch (err: unknown) {
      console.error('Error optimizando imagen:', err)
      return { success: false, error: 'Error al procesar la imagen.' }
    }

    const folder = USO_A_FOLDER[usoImagen] ?? 'galeria'
    const storagePath = `Productos/${skuSafe}/${folder}/${uuid}.webp`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, optimizedBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: `Error al subir al Storage: ${uploadError.message}` }
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    if (!urlData?.publicUrl) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      return { success: false, error: 'No se pudo obtener la URL pública de la imagen.' }
    }
    publicUrl = urlData.publicUrl
  }

  // ── Si es principal, quitar la anterior ───────────────────
  if (esPrincipal) {
    await supabase
      .from('producto_imagenes')
      .update({ es_principal: false })
      .eq('producto_id', productoId)
  }

  // ── Registrar en BD ───────────────────────────────────────
  const insertData: Database['inv-tienda']['Tables']['producto_imagenes']['Insert'] = {
    producto_id:   productoId,
    url:           publicUrl,
    es_principal:  esPrincipal,
    orden,
    alt_text:      altText,
    uso_imagen:    usoImagen,
    origen_imagen: origenImagen,
    ...(urlOg ? { url_og: urlOg } : {}),
  }

  const { error: dbError } = await supabase.from('producto_imagenes').insert(insertData)

  if (dbError) {
    return { success: false, error: `Error al registrar en BD: ${dbError.message}` }
  }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar metadatos de imagen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Actualiza los metadatos de una imagen existente (alt_text, uso_imagen, orden).
 * Para imágenes externas también permite actualizar la URL.
 * NO mueve archivos en Storage.
 */
export async function updateImagenAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const id = toInteger(formData, 'id')
  const productoId = toInteger(formData, 'producto_id') || toInteger(formData, 'product_id')
  if (!id)         return { success: false, error: 'ID de imagen requerido.' }
  if (!productoId) return { success: false, error: 'ID de producto requerido.' }

  const altText   = toCleanText(formData, 'alt_text')
  const usoImagen = toCleanText(formData, 'uso_imagen')
  const orden     = toInteger(formData, 'orden') ?? 0
  // 'url' solo viene si es imagen externa (enviado por ImagenCard al editar)
  const newUrl    = toCleanText(formData, 'url')

  const updatePayload: Database['inv-tienda']['Tables']['producto_imagenes']['Update'] = { orden }
  if (altText !== null)  updatePayload.alt_text  = altText
  if (usoImagen !== null) updatePayload.uso_imagen = usoImagen
  if (newUrl !== null)   updatePayload.url        = newUrl

  const { error } = await supabase
    .from('producto_imagenes')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Marcar imagen como principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marca una imagen como principal y quita la propiedad de todas las demás del mismo producto.
 */
export async function setPrincipalImagenAction(
  imagenId: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // 1. Quitar principal de todas
  const { error: clearError } = await supabase
    .from('producto_imagenes')
    .update({ es_principal: false })
    .eq('producto_id', productoId)

  if (clearError) return { success: false, error: clearError.message }

  // 2. Marcar la nueva como principal
  const { error: setError } = await supabase
    .from('producto_imagenes')
    .update({ es_principal: true })
    .eq('id', imagenId)

  if (setError) return { success: false, error: setError.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Eliminar imagen (Storage + BD)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Elimina la imagen del Storage Y de la tabla producto_imagenes.
 * Operación atómica: primero Storage, luego BD.
 */
export async function deleteImagenAction(
  imagenId: number,
  productoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // 1. Obtener la URL de la imagen
  const { data: imgData, error: fetchError } = await supabase
    .from('producto_imagenes')
    .select('url, origen_imagen')
    .eq('id', imagenId)
    .single()

  if (fetchError || !imgData) {
    return { success: false, error: 'No se encontró la imagen.' }
  }

  // 2. Si es imagen local, eliminarla del Storage
  if (imgData.origen_imagen === 'local' && imgData.url) {
    const bucketPrefix = `/object/public/${BUCKET}/`
    const urlPath = imgData.url as string
    const idx = urlPath.indexOf(bucketPrefix)
    if (idx !== -1) {
      const storagePath = urlPath.slice(idx + bucketPrefix.length)
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([storagePath])
      // No bloqueamos si falla el storage (el archivo puede ya no existir)
      if (storageError) {
        console.warn('[deleteImagenAction] Storage remove warning:', storageError.message)
      }
    }
  }

  // 3. Eliminar de la BD
  const { error: dbError } = await supabase
    .from('producto_imagenes')
    .delete()
    .eq('id', imagenId)

  if (dbError) return { success: false, error: dbError.message }

  revalidatePath(`/catalogo/${productoId}`)
  return { success: true }
}
