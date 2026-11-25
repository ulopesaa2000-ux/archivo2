// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\[slug]\page.tsx
import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { isSuperAdmin } from '@/lib/auth/permissions'
import { fetchDocArticleFromStorage, fetchDocsRegistry } from '@/modules/docs/storage'
import { loadFallbackDocArticle } from '@/modules/docs/fallback-articles'
import { DOC_ROLE_META, type DocArticle } from '@/lib/docs/types'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { DocArticleEditableClient } from '../_components/DocArticleEditableClient'

export default async function DocArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [{ user }, { registry }, storedArticle, fallbackArticle] = await Promise.all([
    verifySession(),
    fetchDocsRegistry(),
    fetchDocArticleFromStorage(slug),
    loadFallbackDocArticle(slug),
  ])

  const canEdit = isSuperAdmin(user)
  const metaItem = registry.items.find((item) => item.slug === slug)
  const article = storedArticle ?? fallbackArticle

  if (!metaItem && !article) {
    notFound()
  }

  const isPublished = article?.publicado ?? metaItem?.publicado ?? false
  if (!isPublished && !canEdit) {
    notFound()
  }

  const titulo = article?.titulo ?? metaItem?.titulo ?? slug
  const resumen = article?.resumen ?? metaItem?.resumen ?? ''
  const rol = article?.rol ?? metaItem?.rol ?? 'general'
  const rutasAdmin = article?.rutasAdmin ?? metaItem?.rutasAdmin ?? []
  const docxOrigen = article?.docxOrigen ?? metaItem?.docxOrigen
  const duracion = article?.duracionEstimada
  const requisitos = article?.requisitosPrevios ?? []
  const blocks = article?.blocks ?? []
  const roleMeta = DOC_ROLE_META[rol]

  const orderedVisible = registry.items
    .filter((item) => item.publicado || canEdit)
    .sort((a, b) => {
      const roleDiff = DOC_ROLE_META[a.rol].order - DOC_ROLE_META[b.rol].order
      return roleDiff !== 0 ? roleDiff : a.orden - b.orden
    })

  const currentIdx = orderedVisible.findIndex((item) => item.slug === slug)
  const prevGuide = currentIdx > 0 ? orderedVisible[currentIdx - 1] : null
  const nextGuide =
    currentIdx >= 0 && currentIdx < orderedVisible.length - 1
      ? orderedVisible[currentIdx + 1]
      : null

  const effectiveArticle: DocArticle = article ?? {
    slug,
    titulo,
    resumen,
    rol,
    publicado: isPublished,
    rutasAdmin,
    duracionEstimada: duracion,
    requisitosPrevios: requisitos,
    docxOrigen,
    blocks,
    updatedAt: metaItem?.updatedAt ?? new Date().toISOString(),
    updatedBy: metaItem?.updatedBy,
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={'/docs' as Route}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            '-ml-2 h-8 gap-1.5 text-xs'
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todas las guías
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {docxOrigen && (
            <a
              href={`/api/docs/asset?kind=docx&file=${encodeURIComponent(docxOrigen)}`}
              download={docxOrigen}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'h-8 gap-1.5 text-xs'
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar Word (.docx)
            </a>
          )}

          {rutasAdmin[0] && (
            <Link
              href={rutasAdmin[0] as Route}
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'h-8 gap-1.5 text-xs'
              )}
            >
              Ir a pantalla del sistema
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <header className="space-y-3 border-b pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{roleMeta.label}</Badge>
          {!isPublished && (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600">
              Borrador
            </Badge>
          )}
          {duracion && (
            <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
              <Clock className="h-3 w-3" />
              {duracion}
            </Badge>
          )}
          {docxOrigen && (
            <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
              <FileText className="h-3 w-3" />
              {docxOrigen}
            </Badge>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{titulo}</h1>
        {resumen && (
          <p className="text-sm sm:text-base text-muted-foreground">{resumen}</p>
        )}

        {rutasAdmin.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted-foreground">Rutas vinculadas:</span>
            {rutasAdmin.map((route) => (
              <code
                key={route}
                className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground"
              >
                {route}
              </code>
            ))}
          </div>
        )}
      </header>

      <DocArticleEditableClient key={effectiveArticle.slug} initialArticle={effectiveArticle} />

      {(prevGuide || nextGuide) && (
        <nav
          aria-label="Navegación entre guías"
          className="grid gap-3 sm:grid-cols-2 border-t pt-6"
        >
          {prevGuide ? (
            <Link
              href={`/docs/${prevGuide.slug}` as Route}
              className="group flex flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                Guía anterior
              </span>
              <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                {prevGuide.titulo}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {nextGuide && (
            <Link
              href={`/docs/${nextGuide.slug}` as Route}
              className="group flex flex-col items-end text-right gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                Siguiente guía
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                {nextGuide.titulo}
              </span>
            </Link>
          )}
        </nav>
      )}
    </article>
  )
}
