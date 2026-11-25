// c:\Users\uriel\Downloads\enero 26\archivo2\lib\docs\types.ts

export const DOCS_BUCKET = 'documentation' as const
export const DOCS_REGISTRY_PATH = 'registry.json' as const
export const DOCS_ARTICLES_PREFIX = 'articles' as const
export const DOCS_MEDIA_PREFIX = 'media' as const

export type DocRole = 'general' | 'productos' | 'inventario' | 'ecommerce'

export const DOC_ROLE_META: Record<
  DocRole,
  { label: string; shortLabel: string; description: string; order: number }
> = {
  general: {
    label: 'Recorrido General',
    shortLabel: 'General',
    description: 'Visión completa del flujo de mercancía desde la compra hasta la tienda.',
    order: 0,
  },
  productos: {
    label: 'Administrador de Productos',
    shortLabel: 'Productos',
    description: 'Catálogo, Orden Rápida Excel, imágenes masivas y organización por familias.',
    order: 1,
  },
  inventario: {
    label: 'Administrador de Inventario',
    shortLabel: 'Inventario',
    description: 'Notas OCR, surtido de contenedores, ajustes, conteo físico y reportes.',
    order: 2,
  },
  ecommerce: {
    label: 'Administrador de Ecommerce',
    shortLabel: 'Ecommerce',
    description: 'Publicación en tienda web, edición de /inicio, favoritos y cotizaciones.',
    order: 3,
  },
}

export type DocBlock =
  | {
      id: string
      type: 'heading'
      level: 2 | 3
      text: string
    }
  | {
      id: string
      type: 'paragraph'
      text: string
    }
  | {
      id: string
      type: 'steps'
      title?: string
      items: Array<{
        title: string
        description: string
      }>
    }
  | {
      id: string
      type: 'callout'
      variant: 'info' | 'warning' | 'tip'
      title?: string
      text: string
    }
  | {
      id: string
      type: 'image'
      src: string
      storagePath?: string
      alt: string
      caption?: string
    }
  | {
      id: string
      type: 'video'
      url: string
      title?: string
    }
  | {
      id: string
      type: 'checklist'
      title?: string
      items: string[]
    }

export interface DocRegistryItem {
  slug: string
  titulo: string
  resumen: string
  rol: DocRole
  orden: number
  publicado: boolean
  rutasAdmin: string[]
  docxOrigen?: string
  updatedAt?: string
  updatedBy?: string
}

export interface DocRegistry {
  version: number
  updatedAt: string
  items: DocRegistryItem[]
}

export interface DocArticle {
  slug: string
  titulo: string
  resumen: string
  rol: DocRole
  publicado: boolean
  rutasAdmin: string[]
  duracionEstimada?: string
  requisitosPrevios?: string[]
  docxOrigen?: string
  blocks: DocBlock[]
  updatedAt: string
  updatedBy?: string
}

export interface ParsedVideoEmbed {
  provider: 'youtube' | 'drive' | 'direct' | 'unsupported'
  embedUrl: string | null
}

/**
 * Convierte enlaces de YouTube, Google Drive o video directo (.webm/.mp4)
 * en URLs seguras listas para embed con whitelist estricta de dominios.
 */
export function parseEmbedVideoUrl(rawUrl: string): ParsedVideoEmbed {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { provider: 'unsupported', embedUrl: null }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { provider: 'unsupported', embedUrl: null }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { provider: 'unsupported', embedUrl: null }
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

  // YouTube
  if (host === 'youtu.be') {
    const videoId = parsed.pathname.split('/').filter(Boolean)[0]
    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      }
    }
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const vParam = parsed.searchParams.get('v')
    const segments = parsed.pathname.split('/').filter(Boolean)
    const pathId =
      segments[0] === 'embed' || segments[0] === 'shorts' ? segments[1] : null
    const videoId = vParam || pathId
    if (videoId && /^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      }
    }
  }

  // Google Drive
  if (host === 'drive.google.com') {
    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    const idParam = parsed.searchParams.get('id')
    const fileId = fileMatch?.[1] || idParam
    if (fileId && /^[a-zA-Z0-9_-]{10,80}$/.test(fileId)) {
      return {
        provider: 'drive',
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      }
    }
  }

  // Video directo
  if (/\.(webm|mp4|ogg)(\?.*)?$/i.test(parsed.pathname)) {
    return {
      provider: 'direct',
      embedUrl: parsed.toString(),
    }
  }

  return { provider: 'unsupported', embedUrl: null }
}

export function docArticlePath(slug: string): string {
  return `${DOCS_ARTICLES_PREFIX}/${slug}.json`
}

/**
 * Resuelve la guía más específica asociada a una ruta actual del panel admin.
 */
export function resolveDocSlugForAdminPath(
  pathname: string | null | undefined,
  items: Pick<DocRegistryItem, 'slug' | 'rutasAdmin' | 'publicado'>[]
): string | null {
  if (!pathname) return null

  let bestSlug: string | null = null
  let bestLength = -1

  for (const item of items) {
    if (!item.publicado) continue
    for (const route of item.rutasAdmin) {
      const normalized = route.trim()
      if (!normalized) continue
      const isExact = pathname === normalized
      const isPrefix =
        normalized !== '/' && pathname.startsWith(`${normalized}/`)
      if ((isExact || isPrefix) && normalized.length > bestLength) {
        bestLength = normalized.length
        bestSlug = item.slug
      }
    }
  }

  return bestSlug
}
