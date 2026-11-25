// c:\Users\uriel\Downloads\enero 26\archivo2\modules\docs\storage.ts
import 'server-only'
import sharp from 'sharp'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getActiveSupabaseConfig } from '@/lib/supabase/env'
import type { Database } from '@/lib/types/database.types'
import {
  DOCS_BUCKET,
  DOCS_MEDIA_PREFIX,
  DOCS_REGISTRY_PATH,
  docArticlePath,
  type DocArticle,
  type DocRegistry,
} from '@/lib/docs/types'
import { DEFAULT_DOCS_REGISTRY } from '@/lib/docs/default-registry'

/**
 * Crea un cliente de Supabase para operar con el bucket privado `documentation`.
 * Si el entorno tiene `serviceRoleKey`, lo usa en servidor tras haber validado sesión/permisos.
 * De lo contrario hace fallback al cliente servidor autenticado con cookies.
 */
async function getDocsStorageClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getActiveSupabaseConfig()
  if (supabaseServiceRoleKey) {
    return createSupabaseClient<Database, 'inv-tienda'>(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'inv-tienda' },
      }
    )
  }

  return createClient()
}

export interface DocsRegistryLoadResult {
  registry: DocRegistry
  source: 'storage' | 'fallback'
}

/**
 * Lee `registry.json` desde el bucket privado `documentation`.
 * Si aún no existe en Storage (primer arranque) devuelve el registro base.
 */
export async function fetchDocsRegistry(): Promise<DocsRegistryLoadResult> {
  try {
    const supabase = await getDocsStorageClient()
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .download(DOCS_REGISTRY_PATH)

    if (error || !data) {
      return { registry: DEFAULT_DOCS_REGISTRY, source: 'fallback' }
    }

    const rawText = await data.text()
    const parsed = JSON.parse(rawText) as Partial<DocRegistry>

    if (!Array.isArray(parsed.items)) {
      return { registry: DEFAULT_DOCS_REGISTRY, source: 'fallback' }
    }

    return {
      registry: {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        updatedAt:
          typeof parsed.updatedAt === 'string'
            ? parsed.updatedAt
            : DEFAULT_DOCS_REGISTRY.updatedAt,
        items: parsed.items,
      },
      source: 'storage',
    }
  } catch (err) {
    console.warn('[docs/storage] Error al leer registry.json, usando fallback:', err)
    return { registry: DEFAULT_DOCS_REGISTRY, source: 'fallback' }
  }
}

/**
 * Lee el artículo `articles/<slug>.json` desde el bucket privado `documentation`.
 * Retorna `null` si aún no existe en Storage.
 */
export async function fetchDocArticleFromStorage(
  slug: string
): Promise<DocArticle | null> {
  try {
    const supabase = await getDocsStorageClient()
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .download(docArticlePath(slug))

    if (error || !data) {
      return null
    }

    const rawText = await data.text()
    const parsed = JSON.parse(rawText) as DocArticle
    if (!parsed || typeof parsed.slug !== 'string' || !Array.isArray(parsed.blocks)) {
      return null
    }
    return parsed
  } catch (err) {
    console.warn(`[docs/storage] Error al leer artículo "${slug}":`, err)
    return null
  }
}

/**
 * Guarda `registry.json` en el bucket privado `documentation`.
 * Llamar únicamente desde Server Actions después de validar `isSuperAdmin(user)`.
 */
export async function uploadDocsRegistry(
  registry: DocRegistry
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await getDocsStorageClient()
    const payload = new Blob([JSON.stringify(registry, null, 2)], {
      type: 'application/json',
    })

    const { error } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(DOCS_REGISTRY_PATH, payload, {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '0',
      })

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error inesperado al guardar el índice.',
    }
  }
}

/**
 * Guarda un artículo en `articles/<slug>.json` dentro del bucket privado `documentation`.
 * Llamar únicamente desde Server Actions después de validar `isSuperAdmin(user)`.
 */
export async function uploadDocArticle(
  article: DocArticle
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await getDocsStorageClient()
    const payload = new Blob([JSON.stringify(article, null, 2)], {
      type: 'application/json',
    })

    const { error } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(docArticlePath(article.slug), payload, {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '0',
      })

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error inesperado al guardar la guía.',
    }
  }
}

/**
 * Genera una URL firmada temporal para archivos guardados en el bucket privado `documentation`.
 */
export async function createDocMediaSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  try {
    const supabase = await getDocsStorageClient()
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)

    if (error || !data?.signedUrl) {
      return null
    }
    return data.signedUrl
  } catch {
    return null
  }
}

/**
 * Elimina un artículo `articles/<slug>.json` del bucket privado `documentation`.
 */
export async function deleteDocArticleFromStorage(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await getDocsStorageClient()
    const { error } = await supabase.storage
      .from(DOCS_BUCKET)
      .remove([docArticlePath(slug)])

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error al eliminar el artículo.',
    }
  }
}

/**
 * Optimiza un buffer de imagen a WebP (máx 1600px de ancho) usando sharp.
 */
export async function optimizeDocImageToWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
}

/**
 * Sube un buffer binario arbitrario al bucket privado `documentation`.
 */
export async function uploadDocBinaryFile(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
  upsert = true
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  try {
    const supabase = await getDocsStorageClient()
    const { error } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(storagePath, buffer, {
        upsert,
        contentType,
        cacheControl: '3600',
      })

    if (error) {
      return { ok: false, error: error.message }
    }
    return { ok: true, storagePath }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error al subir archivo binario.',
    }
  }
}

/**
 * Sube una imagen (optimizada a WebP si aplica) o video de soporte al prefijo `media/`
 * dentro del bucket privado `documentation`.
 */
export async function uploadDocMediaFile(
  file: File,
  slugHint = 'guia'
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  try {
    const safeSlug =
      slugHint
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'guia'
    const rawExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
    const shouldOptimize =
      file.type.startsWith('image/') && file.type !== 'image/gif'

    let uploadBuffer: Buffer = Buffer.from(await file.arrayBuffer())
    let contentType = file.type || 'application/octet-stream'
    let finalExt = rawExt

    if (shouldOptimize) {
      uploadBuffer = await optimizeDocImageToWebp(uploadBuffer)
      contentType = 'image/webp'
      finalExt = 'webp'
    }

    const storagePath = `${DOCS_MEDIA_PREFIX}/${safeSlug}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${finalExt}`

    return uploadDocBinaryFile(storagePath, uploadBuffer, contentType, false)
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error al subir el archivo.',
    }
  }
}
