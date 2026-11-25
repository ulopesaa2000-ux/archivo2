// c:\Users\uriel\Downloads\enero 26\archivo2\modules\docs\actions.ts
'use server'

import fs from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { isSuperAdmin } from '@/lib/auth/permissions'
import { DEFAULT_DOC_ITEMS } from '@/lib/docs/default-registry'
import {
  type DocArticle,
  type DocBlock,
  type DocRegistryItem,
} from '@/lib/docs/types'
import {
  deleteDocArticleFromStorage,
  fetchDocArticleFromStorage,
  fetchDocsRegistry,
  optimizeDocImageToWebp,
  uploadDocArticle,
  uploadDocBinaryFile,
  uploadDocMediaFile,
  uploadDocsRegistry,
} from './storage'
import { loadFallbackDocArticle } from './fallback-articles'

const ALLOWED_MEDIA_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/webm',
  'video/mp4',
])

const MAX_MEDIA_BYTES = 10 * 1024 * 1024

function normalizeSlug(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function requireSuperAdmin() {
  const { user } = await verifySession()
  if (!isSuperAdmin(user)) {
    throw new Error('Solo el Super Admin puede modificar la documentación.')
  }
  return user
}

function revalidateDocsRoutes(slug?: string) {
  revalidatePath('/docs')
  revalidatePath('/docs', 'layout')
  if (slug) {
    revalidatePath(`/docs/${slug}`)
  }
  revalidatePath('/dashboard')
}

export async function saveDocGuideAction(input: {
  article: DocArticle
  originalSlug?: string
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    const user = await requireSuperAdmin()
    const cleanSlug = normalizeSlug(input.article.slug)
    if (!cleanSlug) {
      return { ok: false, error: 'El slug de la guía no puede estar vacío.' }
    }

    const now = new Date().toISOString()
    const cleanRoutes = input.article.rutasAdmin
      .map((r) => r.trim())
      .filter(Boolean)

    const updatedArticle: DocArticle = {
      ...input.article,
      slug: cleanSlug,
      titulo: input.article.titulo.trim() || 'Guía sin título',
      resumen: input.article.resumen.trim(),
      rutasAdmin: cleanRoutes,
      requisitosPrevios: (input.article.requisitosPrevios ?? [])
        .map((r) => r.trim())
        .filter(Boolean),
      updatedAt: now,
      updatedBy: user.nombre_completo || user.email || 'Super Admin',
    }

    const articleResult = await uploadDocArticle(updatedArticle)
    if (!articleResult.ok) {
      return { ok: false, error: articleResult.error }
    }

    const { registry } = await fetchDocsRegistry()
    const matchSlug = input.originalSlug ? normalizeSlug(input.originalSlug) : cleanSlug
    const existingIndex = registry.items.findIndex(
      (item) => item.slug === matchSlug || item.slug === cleanSlug
    )

    const sameRoleCount = registry.items.filter(
      (item) => item.rol === updatedArticle.rol
    ).length

    const nextItem: DocRegistryItem = {
      slug: cleanSlug,
      titulo: updatedArticle.titulo,
      resumen: updatedArticle.resumen,
      rol: updatedArticle.rol,
      orden:
        existingIndex >= 0
          ? registry.items[existingIndex].orden
          : sameRoleCount + 1,
      publicado: updatedArticle.publicado,
      rutasAdmin: updatedArticle.rutasAdmin,
      docxOrigen: updatedArticle.docxOrigen,
      updatedAt: now,
      updatedBy: updatedArticle.updatedBy,
    }

    const nextItems = [...registry.items]
    if (existingIndex >= 0) {
      nextItems[existingIndex] = nextItem
    } else {
      nextItems.push(nextItem)
    }

    const registryResult = await uploadDocsRegistry({
      version: registry.version,
      updatedAt: now,
      items: nextItems,
    })

    if (!registryResult.ok) {
      return { ok: false, error: registryResult.error }
    }

    if (input.originalSlug && matchSlug !== cleanSlug) {
      await deleteDocArticleFromStorage(matchSlug)
    }

    revalidateDocsRoutes(cleanSlug)
    return { ok: true, slug: cleanSlug }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'No se pudo guardar la guía.',
    }
  }
}

export async function deleteDocGuideAction(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin()
    const cleanSlug = normalizeSlug(slug)
    if (!cleanSlug) {
      return { ok: false, error: 'Slug inválido.' }
    }

    const { registry } = await fetchDocsRegistry()
    const nextItems = registry.items.filter((item) => item.slug !== cleanSlug)

    const registryResult = await uploadDocsRegistry({
      version: registry.version,
      updatedAt: new Date().toISOString(),
      items: nextItems,
    })

    if (!registryResult.ok) {
      return { ok: false, error: registryResult.error }
    }

    await deleteDocArticleFromStorage(cleanSlug)
    revalidateDocsRoutes(cleanSlug)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'No se pudo eliminar la guía.',
    }
  }
}

export async function uploadDocMediaAction(
  formData: FormData
): Promise<
  | { ok: true; storagePath: string; previewUrl: string }
  | { ok: false; error: string }
> {
  try {
    await requireSuperAdmin()
    const file = formData.get('file')
    const slugHint = String(formData.get('slug') || 'guia')

    if (!(file instanceof File)) {
      return { ok: false, error: 'No se recibió ningún archivo.' }
    }
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return {
        ok: false,
        error: 'Formato no permitido. Usa PNG, JPG, WebP, GIF, WebM o MP4.',
      }
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return { ok: false, error: 'El archivo supera el límite de 10 MB.' }
    }

    const res = await uploadDocMediaFile(file, slugHint)
    if (!res.ok) {
      return { ok: false, error: res.error }
    }

    return {
      ok: true,
      storagePath: res.storagePath,
      previewUrl: `/api/docs/asset?kind=media&path=${encodeURIComponent(res.storagePath)}`,
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'No se pudo subir el archivo.',
    }
  }
}

function rewriteInfografiaBlocks(
  blocks: DocBlock[],
  uploadedInfografias: Map<string, string>
): { blocks: DocBlock[]; changed: boolean } {
  let changed = false
  const nextBlocks = blocks.map((block) => {
    if (block.type !== 'image') return block

    const match = block.src.match(/kind=infografia&file=([^&]+)/)
    if (!match) return block

    const originalFile = decodeURIComponent(match[1])
    const storagePath = uploadedInfografias.get(originalFile)
    if (!storagePath) return block

    const nextSrc = `/api/docs/asset?kind=media&path=${encodeURIComponent(storagePath)}`
    if (block.storagePath === storagePath && block.src === nextSrc) {
      return block
    }

    changed = true
    return {
      ...block,
      storagePath,
      src: nextSrc,
    }
  })

  return { blocks: nextBlocks, changed }
}

export async function syncBaseDocsToStorageAction(): Promise<
  | { ok: true; syncedCount: number; imagesCount: number; docxCount: number }
  | { ok: false; error: string }
> {
  try {
    const user = await requireSuperAdmin()
    const now = new Date().toISOString()
    const updatedBy = user.nombre_completo || user.email || 'Super Admin'

    // 1. Subir todas las infografías optimizadas a WebP en media/infografias/
    const infografiasDir = path.join(process.cwd(), 'docs', 'capturas', 'infografias_roles')
    const uploadedInfografias = new Map<string, string>()

    try {
      const entries = await fs.readdir(infografiasDir)
      for (const file of entries) {
        if (!file.toLowerCase().endsWith('.png')) continue
        const fullPath = path.join(infografiasDir, file)
        const rawBuffer = await fs.readFile(fullPath)
        const webpBuffer = await optimizeDocImageToWebp(rawBuffer)
        const webpName = file.replace(/\.png$/i, '.webp')
        const storagePath = `media/infografias/${webpName}`
        const uploadRes = await uploadDocBinaryFile(storagePath, webpBuffer, 'image/webp', true)
        if (uploadRes.ok) {
          uploadedInfografias.set(file, storagePath)
        }
      }
    } catch (err) {
      console.warn('[docs/sync] No se pudieron leer infografías locales:', err)
    }

    // 2. Subir los 4 manuales Word originales a word/
    const docxSources: Array<{ file: string; fullPath: string }> = [
      {
        file: '01_Guia_Administrador_Productos.docx',
        fullPath: path.join(process.cwd(), 'docs', 'manuales', 'roles', '01_Guia_Administrador_Productos.docx'),
      },
      {
        file: '02_Guia_Administrador_Inventario.docx',
        fullPath: path.join(process.cwd(), 'docs', 'manuales', 'roles', '02_Guia_Administrador_Inventario.docx'),
      },
      {
        file: '03_Guia_Administrador_Ecommerce.docx',
        fullPath: path.join(process.cwd(), 'docs', 'manuales', 'roles', '03_Guia_Administrador_Ecommerce.docx'),
      },
      {
        file: '04_Guia_General_Recorrido_Mercancia.docx',
        fullPath: path.join(process.cwd(), 'docs', 'manuales', 'recorrido-general', '04_Guia_General_Recorrido_Mercancia.docx'),
      },
    ]

    let docxCount = 0
    for (const docItem of docxSources) {
      try {
        const buf = await fs.readFile(docItem.fullPath)
        const res = await uploadDocBinaryFile(
          `word/${docItem.file}`,
          buf,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          true
        )
        if (res.ok) docxCount += 1
      } catch {
        // Si falta alguno en disco, continuar con el resto
      }
    }

    // 3. Combinar registry actual con DEFAULT_DOC_ITEMS sin perder guías creadas por usuario
    const { registry } = await fetchDocsRegistry()
    const mergedItems = [...registry.items]
    for (const baseItem of DEFAULT_DOC_ITEMS) {
      if (!mergedItems.some((item) => item.slug === baseItem.slug)) {
        mergedItems.push(baseItem)
      }
    }

    const registryRes = await uploadDocsRegistry({
      version: registry.version,
      updatedAt: now,
      items: mergedItems,
    })
    if (!registryRes.ok) {
      return { ok: false, error: registryRes.error }
    }

    // 4. Crear guías faltantes o reparar rutas de infografías en guías ya existentes
    let syncedCount = 0
    for (const item of mergedItems) {
      const existing = await fetchDocArticleFromStorage(item.slug)
      if (existing) {
        const { blocks, changed } = rewriteInfografiaBlocks(existing.blocks, uploadedInfografias)
        if (changed) {
          const updateRes = await uploadDocArticle({
            ...existing,
            blocks,
            updatedAt: now,
            updatedBy,
          })
          if (updateRes.ok) syncedCount += 1
        }
        continue
      }

      const fallback = await loadFallbackDocArticle(item.slug)
      if (!fallback) continue

      const { blocks } = rewriteInfografiaBlocks(fallback.blocks, uploadedInfografias)
      const uploadRes = await uploadDocArticle({
        ...fallback,
        blocks,
        updatedAt: now,
        updatedBy,
      })
      if (uploadRes.ok) syncedCount += 1
    }

    revalidateDocsRoutes()
    return {
      ok: true,
      syncedCount,
      imagesCount: uploadedInfografias.size,
      docxCount,
    }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : 'No se pudo sincronizar la base documental.',
    }
  }
}
