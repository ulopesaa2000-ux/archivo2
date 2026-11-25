// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\DocBlockEditorModal.tsx
'use client'

import { useState, useTransition } from 'react'
import { ImagePlus, Plus, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DOC_ROLE_META,
  parseEmbedVideoUrl,
  type DocArticle,
  type DocBlock,
  type DocRole,
} from '@/lib/docs/types'
import { uploadDocMediaAction } from '@/modules/docs/actions'

interface BlockModalProps {
  block: DocBlock | null
  slugHint: string
  onClose: () => void
  onSave: (updated: DocBlock) => void
}

export function DocBlockEditorModal({
  block,
  slugHint,
  onClose,
  onSave,
}: BlockModalProps) {
  const [draft, setDraft] = useState<DocBlock | null>(block)
  const [uploading, startUpload] = useTransition()

  if (!draft) return null

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || draft.type !== 'image') return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('slug', slugHint)

    startUpload(async () => {
      const res = await uploadDocMediaAction(formData)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setDraft({
        ...draft,
        storagePath: res.storagePath,
        src: res.previewUrl,
        alt: draft.alt || file.name.replace(/\.[^.]+$/, ''),
      })
      toast.success('Imagen subida al bucket privado')
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(draft)
  }

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar bloque de contenido</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {draft.type === 'heading' && (
            <>
              <div className="space-y-1.5">
                <Label>Nivel de título</Label>
                <select
                  value={draft.level}
                  onChange={(e) =>
                    setDraft({ ...draft, level: Number(e.target.value) as 2 | 3 })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={2}>Sección principal (H2)</option>
                  <option value={3}>Subsección (H3)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Texto del título</Label>
                <Input
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          {draft.type === 'paragraph' && (
            <div className="space-y-1.5">
              <Label>Contenido de texto</Label>
              <Textarea
                rows={7}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                required
              />
            </div>
          )}

          {draft.type === 'callout' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de aviso</Label>
                  <select
                    value={draft.variant}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        variant: e.target.value as 'info' | 'warning' | 'tip',
                      })
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="info">Información (Azul)</option>
                    <option value="tip">Recomendación / Tip (Verde)</option>
                    <option value="warning">Advertencia (Amarillo)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Título del aviso (opcional)</Label>
                  <Input
                    value={draft.title ?? ''}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mensaje</Label>
                <Textarea
                  rows={5}
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          {draft.type === 'steps' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título del bloque de pasos (opcional)</Label>
                <Input
                  value={draft.title ?? ''}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Ej. Pasos en pantalla"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label>Pasos ({draft.items.length})</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        items: [
                          ...draft.items,
                          { title: `Paso ${draft.items.length + 1}`, description: '' },
                        ],
                      })
                    }
                  >
                    <Plus className="h-3 w-3" />
                    Agregar paso
                  </Button>
                </div>

                {draft.items.map((step, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                      <Input
                        value={step.title}
                        onChange={(e) => {
                          const next = [...draft.items]
                          next[idx] = { ...step, title: e.target.value }
                          setDraft({ ...draft, items: next })
                        }}
                        placeholder="Título del paso"
                        className="h-8 text-xs font-semibold"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: draft.items.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={step.description}
                      onChange={(e) => {
                        const next = [...draft.items]
                        next[idx] = { ...step, description: e.target.value }
                        setDraft({ ...draft, items: next })
                      }}
                      placeholder="Explicación detallada"
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {draft.type === 'image' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span>{uploading ? 'Subiendo...' : 'Subir captura al bucket'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-muted-foreground">
                  o pega una ruta/URL abajo
                </span>
              </div>

              <div className="space-y-1.5">
                <Label>URL o ruta de imagen</Label>
                <Input
                  value={draft.src}
                  onChange={(e) =>
                    setDraft({ ...draft, src: e.target.value, storagePath: undefined })
                  }
                  placeholder="/api/docs/asset?kind=media&path=..."
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Texto alternativo (Alt)</Label>
                  <Input
                    value={draft.alt}
                    onChange={(e) => setDraft({ ...draft, alt: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pie de imagen (opcional)</Label>
                  <Input
                    value={draft.caption ?? ''}
                    onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
                  />
                </div>
              </div>

              {draft.src && (
                <div className="rounded-lg border bg-muted/30 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      draft.storagePath
                        ? `/api/docs/asset?kind=media&path=${encodeURIComponent(draft.storagePath)}`
                        : draft.src
                    }
                    alt={draft.alt || 'Vista previa'}
                    className="max-h-52 w-auto mx-auto rounded object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {draft.type === 'video' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título del video (opcional)</Label>
                <Input
                  value={draft.title ?? ''}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Ej. Videoguía paso a paso"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-primary" />
                  Enlace de YouTube, Google Drive o archivo .webm/.mp4
                </Label>
                <Input
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... o https://drive.google.com/file/d/.../view"
                  required
                />
              </div>
              {(() => {
                const parsed = parseEmbedVideoUrl(draft.url)
                if (!parsed.embedUrl) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      Pega un enlace válido de YouTube, Google Drive o video directo para ver la vista previa.
                    </p>
                  )
                }
                return parsed.provider === 'direct' ? (
                  <video
                    controls
                    className="w-full rounded-lg border aspect-video bg-black"
                    src={parsed.embedUrl}
                  />
                ) : (
                  <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
                    <iframe
                      src={parsed.embedUrl}
                      title="Vista previa video"
                      className="h-full w-full"
                      allowFullScreen
                    />
                  </div>
                )
              })()}
            </div>
          )}

          {draft.type === 'checklist' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título del checklist</Label>
                <Input
                  value={draft.title ?? ''}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Elementos (uno por línea)</Label>
                <Textarea
                  rows={6}
                  value={draft.items.join('\n')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      items: e.target.value.split('\n'),
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading}>
              Aplicar al borrador
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface MetadataModalProps {
  open: boolean
  article: DocArticle
  onClose: () => void
  onSave: (patch: Partial<DocArticle>) => void
}

export function DocMetadataEditorModal({
  open,
  article,
  onClose,
  onSave,
}: MetadataModalProps) {
  const [titulo, setTitulo] = useState(article.titulo)
  const [slug, setSlug] = useState(article.slug)
  const [rol, setRol] = useState<DocRole>(article.rol)
  const [resumen, setResumen] = useState(article.resumen)
  const [duracion, setDuracion] = useState(article.duracionEstimada ?? '')
  const [rutasText, setRutasText] = useState(article.rutasAdmin.join(', '))
  const [reqText, setReqText] = useState((article.requisitosPrevios ?? []).join('\n'))
  const [publicado, setPublicado] = useState(article.publicado)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      titulo,
      slug,
      rol,
      resumen,
      duracionEstimada: duracion.trim() || undefined,
      rutasAdmin: rutasText
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      requisitosPrevios: reqText
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean),
      publicado,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar metadatos y rutas del ERP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Slug URL</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value as DocRole)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.keys(DOC_ROLE_META) as DocRole[]).map((key) => (
                  <option key={key} value={key}>
                    {DOC_ROLE_META[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Duración estimada</Label>
              <Input
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="Ej. 5 a 8 minutos"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Resumen</Label>
            <Textarea
              rows={2}
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Rutas del ERP vinculadas (separadas por coma)</Label>
            <Input
              value={rutasText}
              onChange={(e) => setRutasText(e.target.value)}
              placeholder="/inventario/notas, /inventario/notas/nueva"
            />
            <p className="text-[11px] text-muted-foreground">
              El botón &ldquo;Ayuda&rdquo; del menú lateral abrirá esta guía automáticamente cuando el usuario esté en estas pantallas.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Requisitos previos (uno por línea)</Label>
            <Textarea
              rows={3}
              value={reqText}
              onChange={(e) => setReqText(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={publicado}
              onChange={(e) => setPublicado(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span>Guía publicada (visible para todos los usuarios internos)</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Aplicar metadatos</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
