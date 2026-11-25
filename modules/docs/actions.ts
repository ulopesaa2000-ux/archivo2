// c:\Users\uriel\Downloads\enero 26\archivo2\modules\docs\actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { isSuperAdmin } from '@/lib/auth/permissions'
import {
  type DocArticle,
  type DocRegistryItem,
} from '@/lib/docs/types'
import {
  deleteDocArticleFromStorage,
  fetchDocsRegistry,
  uploadDocArticle,
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

export async function syncBaseDocsToStorageAction(): Promise<
  { ok: true; syncedCount: number } | { ok: false; error: string }
> {
  try {
    const user = await requireSuperAdmin()
    const { registry } = await fetchDocsRegistry()
    const now = new Date().toISOString()

    const registryRes = await uploadDocsRegistry({
      version: registry.version,
      updatedAt: now,
      items: registry.items,
    })
    if (!registryRes.ok) {
      return { ok: false, error: registryRes.error }
    }

    let syncedCount = 0
    for (const item of registry.items) {
      const fallback = await loadFallbackDocArticle(item.slug)
      if (!fallback) continue

      const uploadRes = await uploadDocArticle({
        ...fallback,
        updatedAt: now,
        updatedBy: user.nombre_completo || user.email || 'Super Admin',
      })
      if (uploadRes.ok) {
        syncedCount += 1
      }
    }

    revalidateDocsRoutes()
    return { ok: true, syncedCount }
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
