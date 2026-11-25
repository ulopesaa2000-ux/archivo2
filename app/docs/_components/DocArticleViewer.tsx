// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\DocArticleViewer.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckSquare,
  Info,
  Lightbulb,
  Link2,
  List,
  Maximize2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { parseEmbedVideoUrl, type DocBlock } from '@/lib/docs/types'
import { Button } from '@/components/ui/button'

interface DocArticleViewerProps {
  blocks: DocBlock[]
  requisitosPrevios?: string[]
}

function resolveImageSrc(block: Extract<DocBlock, { type: 'image' }>): string {
  if (block.storagePath) {
    return `/api/docs/asset?kind=media&path=${encodeURIComponent(block.storagePath)}`
  }
  return block.src
}

export function DocArticleViewer({
  blocks,
  requisitosPrevios = [],
}: DocArticleViewerProps) {
  const [zoomedImage, setZoomedImage] = useState<{
    src: string
    alt: string
    caption?: string
  } | null>(null)

  const headings = useMemo(
    () =>
      blocks.filter(
        (b): b is Extract<DocBlock, { type: 'heading' }> => b.type === 'heading'
      ),
    [blocks]
  )

  useEffect(() => {
    if (!zoomedImage) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomedImage])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Enlace de la guía copiado')
    } catch {
      toast.error('No se pudo copiar el enlace')
    }
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      {/* Columna principal del artículo */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {requisitosPrevios.length > 0 && (
          <section className="rounded-xl border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Requisitos previos
            </p>
            <ul className="space-y-1">
              {requisitosPrevios.map((req, idx) => (
                <li
                  key={`req-${idx}`}
                  className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {blocks.map((block) => {
          switch (block.type) {
            case 'heading':
              return block.level === 2 ? (
                <h2
                  key={block.id}
                  id={block.id}
                  className="scroll-mt-20 text-xl font-bold tracking-tight pt-4 border-b pb-2"
                >
                  {block.text}
                </h2>
              ) : (
                <h3
                  key={block.id}
                  id={block.id}
                  className="scroll-mt-20 text-lg font-semibold pt-2"
                >
                  {block.text}
                </h3>
              )

            case 'paragraph':
              return (
                <p
                  key={block.id}
                  className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-line"
                >
                  {block.text}
                </p>
              )

            case 'steps':
              return (
                <div key={block.id} className="space-y-3">
                  {block.title && (
                    <h3 className="text-base font-semibold">{block.title}</h3>
                  )}
                  <ol className="space-y-3">
                    {block.items.map((step, index) => (
                      <li
                        key={`${block.id}-${index}`}
                        className="flex gap-3 rounded-xl border bg-card p-4 shadow-xs"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {index + 1}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-semibold">{step.title}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )

            case 'callout': {
              const styles =
                block.variant === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                  : block.variant === 'tip'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
                    : 'border-blue-500/40 bg-blue-500/10 text-blue-950 dark:text-blue-200'
              const Icon =
                block.variant === 'warning'
                  ? AlertTriangle
                  : block.variant === 'tip'
                    ? Lightbulb
                    : Info

              return (
                <div
                  key={block.id}
                  className={cn('flex gap-3 rounded-xl border p-4', styles)}
                >
                  <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs sm:text-sm min-w-0">
                    {block.title && <p className="font-semibold">{block.title}</p>}
                    <p className="whitespace-pre-line opacity-90 leading-relaxed">
                      {block.text}
                    </p>
                  </div>
                </div>
              )
            }

            case 'image': {
              const src = resolveImageSrc(block)
              return (
                <figure key={block.id} className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setZoomedImage({
                        src,
                        alt: block.alt,
                        caption: block.caption,
                      })
                    }
                    className="group relative block w-full overflow-hidden rounded-xl border bg-muted/30 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Clic para ampliar imagen"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={block.alt}
                      loading="lazy"
                      className="w-full h-auto max-h-[520px] object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                    />
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-background/85 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                      <Maximize2 className="h-3 w-3" />
                      Ampliar
                    </span>
                  </button>
                  {block.caption && (
                    <figcaption className="text-center text-xs text-muted-foreground">
                      {block.caption}
                    </figcaption>
                  )}
                </figure>
              )
            }

            case 'video': {
              const parsed = parseEmbedVideoUrl(block.url)
              if (!parsed.embedUrl) {
                return (
                  <div
                    key={block.id}
                    className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground"
                  >
                    Enlace de video no soportado: {block.url}
                  </div>
                )
              }
              return (
                <div key={block.id} className="space-y-2">
                  {block.title && (
                    <p className="text-sm font-semibold">{block.title}</p>
                  )}
                  {parsed.provider === 'direct' ? (
                    <video
                      controls
                      preload="metadata"
                      className="w-full rounded-xl border bg-black aspect-video"
                      src={parsed.embedUrl}
                    />
                  ) : (
                    <div className="aspect-video w-full overflow-hidden rounded-xl border bg-black">
                      <iframe
                        src={parsed.embedUrl}
                        title={block.title || 'Video guía'}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>
              )
            }

            case 'checklist':
              return (
                <div
                  key={block.id}
                  className="rounded-xl border bg-card p-4 space-y-2.5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    <span>{block.title || 'Checklist de verificación'}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {block.items.map((entry, idx) => (
                      <li
                        key={`${block.id}-${idx}`}
                        className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{entry}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
          }
        })}
      </div>

      {/* Tabla de contenidos lateral (Desktop XL) */}
      <aside className="hidden xl:block w-60 shrink-0 sticky top-20 space-y-4">
        <div className="rounded-xl border bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <List className="h-3.5 w-3.5" />
            <span>En esta guía</span>
          </div>

          {headings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Vista rápida</p>
          ) : (
            <nav className="space-y-1.5" aria-label="Tabla de contenidos">
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className={cn(
                    'block text-xs leading-snug text-muted-foreground hover:text-primary transition-colors',
                    h.level === 3 && 'pl-3 text-[11px]'
                  )}
                >
                  {h.text}
                </a>
              ))}
            </nav>
          )}

          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="w-full justify-start h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copiar enlace
            </Button>
          </div>
        </div>
      </aside>

      {/* Modal Lightbox de Imagen */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setZoomedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={zoomedImage.alt}
        >
          <div
            className="relative max-w-6xl w-full max-h-[92vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full shadow-lg"
              onClick={() => setZoomedImage(null)}
              aria-label="Cerrar imagen ampliada"
            >
              <X className="h-4 w-4" />
            </Button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="max-h-[82vh] w-auto max-w-full rounded-xl border bg-background object-contain shadow-2xl"
            />
            {zoomedImage.caption && (
              <p className="rounded-lg bg-background/90 px-4 py-2 text-xs sm:text-sm text-foreground shadow">
                {zoomedImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
