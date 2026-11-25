// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\NewGuideModal.tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { FileUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DOC_ROLE_META, type DocArticle, type DocRole } from '@/lib/docs/types'
import { parseMarkdownToGuide } from '@/lib/docs/markdown-importer'
import { saveDocGuideAction } from '@/modules/docs/actions'
import { useDocsEditor } from './DocsEditorContext'

function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function NewGuideModal() {
  const router = useRouter()
  const { isCreateModalOpen, setIsCreateModalOpen, setIsEditMode } = useDocsEditor()
  const [isPending, startTransition] = useTransition()

  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [rol, setRol] = useState<DocRole>('inventario')
  const [resumen, setResumen] = useState('')
  const [rutasTexto, setRutasTexto] = useState('')
  const [markdownRaw, setMarkdownRaw] = useState('')

  const parsedMd = useMemo(() => {
    if (!markdownRaw.trim()) return null
    return parseMarkdownToGuide(markdownRaw)
  }, [markdownRaw])

  const handleTituloChange = (val: string) => {
    setTitulo(val)
    if (!slugTouched) {
      setSlug(toSlug(val))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setMarkdownRaw(text)

    const preview = parseMarkdownToGuide(text)
    if (preview.title && !titulo.trim()) {
      setTitulo(preview.title)
      if (!slugTouched) setSlug(toSlug(preview.title))
    }
    toast.success(`Archivo "${file.name}" importado (${preview.blocks.length} bloques)`)
  }

  const resetForm = () => {
    setTitulo('')
    setSlug('')
    setSlugTouched(false)
    setRol('inventario')
    setResumen('')
    setRutasTexto('')
    setMarkdownRaw('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanSlug = toSlug(slug || titulo)
    if (!cleanSlug) {
      toast.error('Ingresa un título o slug válido para la guía.')
      return
    }

    const article: DocArticle = {
      slug: cleanSlug,
      titulo: titulo.trim() || parsedMd?.title || 'Nueva guía operativa',
      resumen: resumen.trim(),
      rol,
      publicado: true,
      rutasAdmin: rutasTexto
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
      duracionEstimada: parsedMd?.duracionEstimada,
      requisitosPrevios: parsedMd?.requisitosPrevios ?? [],
      blocks:
        parsedMd && parsedMd.blocks.length > 0
          ? parsedMd.blocks
          : [
              {
                id: `h2-${Date.now()}`,
                type: 'heading',
                level: 2,
                text: 'Introducción',
              },
              {
                id: `p-${Date.now() + 1}`,
                type: 'paragraph',
                text: 'Describe aquí el objetivo y los pasos principales de esta guía.',
              },
            ],
      updatedAt: new Date().toISOString(),
    }

    startTransition(async () => {
      const res = await saveDocGuideAction({ article })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Guía creada y guardada en el bucket privado')
      setIsCreateModalOpen(false)
      setIsEditMode(true)
      resetForm()
      router.push(`/docs/${res.slug}` as Route)
      router.refresh()
    })
  }

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear nueva guía operativa</DialogTitle>
          <DialogDescription>
            Crea una guía desde cero o importa un archivo Markdown (.md) para generar los
            bloques automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-new-title">Título *</Label>
              <Input
                id="doc-new-title"
                value={titulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                placeholder="Ej. Cómo generar un despacho"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-new-slug">Slug URL *</Label>
              <Input
                id="doc-new-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value)
                }}
                placeholder="como-generar-despacho"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-new-role">Rol / Categoría *</Label>
              <select
                id="doc-new-role"
                value={rol}
                onChange={(e) => setRol(e.target.value as DocRole)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {(Object.keys(DOC_ROLE_META) as DocRole[]).map((key) => (
                  <option key={key} value={key}>
                    {DOC_ROLE_META[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-new-routes">Rutas del ERP vinculadas (opcional)</Label>
              <Input
                id="doc-new-routes"
                value={rutasTexto}
                onChange={(e) => setRutasTexto(e.target.value)}
                placeholder="/despachos, /inventario/notas"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-new-summary">Resumen corto</Label>
            <Input
              id="doc-new-summary"
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
              placeholder="Breve explicación de qué resuelve esta guía"
            />
          </div>

          <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="doc-new-md" className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Importar desde Markdown (.md) opcional
              </Label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors">
                <FileUp className="h-3.5 w-3.5" />
                <span>Cargar archivo .md</span>
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <Textarea
              id="doc-new-md"
              value={markdownRaw}
              onChange={(e) => setMarkdownRaw(e.target.value)}
              rows={6}
              placeholder="Pega aquí tu guion .md o carga un archivo para convertir títulos, pasos, advertencias y checklists automáticamente..."
              className="font-mono text-xs"
            />

            {parsedMd && (
              <p className="text-xs text-muted-foreground">
                Vista previa detectada: <strong>{parsedMd.blocks.length} bloques</strong>
                {parsedMd.requisitosPrevios.length > 0 &&
                  ` · ${parsedMd.requisitosPrevios.length} requisitos previos`}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creando guía...' : 'Crear y abrir en editor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
