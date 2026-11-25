// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\DocArticleEditableClient.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Copy,
  Edit3,
  FileUp,
  Heading2,
  ImagePlus,
  ListOrdered,
  Pilcrow,
  Save,
  Settings2,
  Trash2,
  Undo2,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parseMarkdownToDocBlocks } from '@/lib/docs/markdown-importer'
import type { DocArticle, DocBlock } from '@/lib/docs/types'
import { deleteDocGuideAction, saveDocGuideAction } from '@/modules/docs/actions'
import { DocArticleViewer } from './DocArticleViewer'
import { DocBlockEditorModal, DocMetadataEditorModal } from './DocBlockEditorModal'
import { useDocsEditor } from './DocsEditorContext'

function createDefaultBlock(type: DocBlock['type']): DocBlock {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, text: 'Nueva sección' }
    case 'paragraph':
      return { id, type: 'paragraph', text: 'Escribe aquí la explicación...' }
    case 'steps':
      return {
        id,
        type: 'steps',
        title: 'Pasos en pantalla',
        items: [{ title: 'Paso 1', description: 'Describe la acción a realizar.' }],
      }
    case 'callout':
      return {
        id,
        type: 'callout',
        variant: 'info',
        title: 'Nota importante',
        text: 'Detalle o advertencia clave para el operador.',
      }
    case 'image':
      return {
        id,
        type: 'image',
        src: '',
        alt: 'Captura de pantalla',
        caption: '',
      }
    case 'video':
      return {
        id,
        type: 'video',
        url: '',
        title: 'Video tutorial',
      }
    case 'checklist':
      return {
        id,
        type: 'checklist',
        title: 'Checklist de verificación',
        items: ['Primer punto verificado'],
      }
  }
}

const BLOCK_TYPE_LABELS: Record<DocBlock['type'], string> = {
  heading: 'Título',
  paragraph: 'Párrafo',
  steps: 'Pasos',
  callout: 'Aviso',
  image: 'Imagen',
  video: 'Video',
  checklist: 'Checklist',
}

export function DocArticleEditableClient({
  initialArticle,
}: {
  initialArticle: DocArticle
}) {
  const router = useRouter()
  const { canEdit, isEditMode } = useDocsEditor()
  const [draft, setDraft] = useState<DocArticle>(initialArticle)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isMetadataOpen, setIsMetadataOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!canEdit || !isEditMode) {
    return (
      <DocArticleViewer
        blocks={draft.blocks}
        requisitosPrevios={draft.requisitosPrevios}
      />
    )
  }

  const editingBlock =
    editingIndex !== null ? draft.blocks[editingIndex] ?? null : null

  const updateBlocks = (nextBlocks: DocBlock[]) => {
    setDraft((prev) => ({ ...prev, blocks: nextBlocks }))
    setHasChanges(true)
  }

  const moveBlock = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= draft.blocks.length) return
    const next = [...draft.blocks]
    const [removed] = next.splice(index, 1)
    next.splice(target, 0, removed)
    updateBlocks(next)
  }

  const duplicateBlock = (index: number) => {
    const original = draft.blocks[index]
    const cloned: DocBlock = {
      ...structuredClone(original),
      id: `${original.type}-${Date.now()}`,
    }
    const next = [...draft.blocks]
    next.splice(index + 1, 0, cloned)
    updateBlocks(next)
  }

  const deleteBlock = (index: number) => {
    updateBlocks(draft.blocks.filter((_, idx) => idx !== index))
  }

  const addBlockAndEdit = (type: DocBlock['type']) => {
    const newBlock = createDefaultBlock(type)
    const next = [...draft.blocks, newBlock]
    updateBlocks(next)
    setEditingIndex(next.length - 1)
  }

  const handleImportMarkdown = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const importedBlocks = parseMarkdownToDocBlocks(text)
    if (importedBlocks.length === 0) {
      toast.error('No se detectaron bloques en el archivo Markdown.')
      return
    }
    updateBlocks([...draft.blocks, ...importedBlocks])
    toast.success(`Se agregaron ${importedBlocks.length} bloques desde ${file.name}`)
    e.target.value = ''
  }

  const handleSaveGuide = () => {
    startTransition(async () => {
      const res = await saveDocGuideAction({
        article: draft,
        originalSlug: initialArticle.slug,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setHasChanges(false)
      toast.success('Guía guardada en el bucket privado documentation')
      if (res.slug !== initialArticle.slug) {
        router.push(`/docs/${res.slug}` as Route)
      } else {
        router.refresh()
      }
    })
  }

  const handleDeleteGuide = () => {
    if (
      !window.confirm(
        `¿Eliminar la guía "${draft.titulo}"? Esta acción quitará la guía del índice y del bucket.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const res = await deleteDocGuideAction(initialArticle.slug)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Guía eliminada')
      router.push('/docs' as Route)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Barra superior del modo edición */}
      <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-amber-500 text-zinc-950 hover:bg-amber-500">
            Editando guía
          </Badge>
          {hasChanges && (
            <Badge variant="outline" className="border-amber-600/50 text-amber-700 dark:text-amber-300">
              Cambios sin guardar
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs bg-background"
            onClick={() => setIsMetadataOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Metadatos y rutas
          </Button>

          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors">
            <FileUp className="h-3.5 w-3.5" />
            <span>Importar .md</span>
            <input
              type="file"
              accept=".md,.markdown,.txt"
              onChange={handleImportMarkdown}
              className="hidden"
            />
          </label>

          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => {
                setDraft(initialArticle)
                setHasChanges(false)
              }}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Descartar
            </Button>
          )}

          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            className="h-8 gap-1 text-xs"
            onClick={handleDeleteGuide}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isPending}
            className="h-8 gap-1.5 text-xs"
            onClick={handleSaveGuide}
          >
            <Save className="h-3.5 w-3.5" />
            {isPending ? 'Guardando...' : 'Guardar guía'}
          </Button>
        </div>
      </div>

      {/* Lista editable de bloques */}
      {draft.blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Esta guía todavía no tiene bloques. Agrega uno abajo para comenzar.
        </div>
      ) : (
        <div className="space-y-4">
          {draft.blocks.map((block, index) => (
            <div
              key={block.id}
              className="group relative rounded-xl border border-border/80 bg-card/50 p-4 transition-colors hover:border-amber-500/60"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <Badge variant="outline" className="text-[11px] font-mono">
                  #{index + 1} · {BLOCK_TYPE_LABELS[block.type]}
                </Badge>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                    title="Subir bloque"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={index === draft.blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                    title="Bajar bloque"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setEditingIndex(index)}
                  >
                    <Edit3 className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => duplicateBlock(index)}
                    title="Duplicar bloque"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteBlock(index)}
                    title="Eliminar bloque"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <DocArticleViewer blocks={[block]} />
            </div>
          ))}
        </div>
      )}

      {/* Barra para añadir nuevos bloques */}
      <div className="rounded-xl border border-dashed bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          + Agregar nuevo bloque a esta guía
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('heading')}
          >
            <Heading2 className="h-3.5 w-3.5" />
            Título
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('paragraph')}
          >
            <Pilcrow className="h-3.5 w-3.5" />
            Párrafo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('steps')}
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Pasos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('callout')}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Aviso
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('image')}
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Imagen
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('video')}
          >
            <Video className="h-3.5 w-3.5" />
            YouTube / Drive
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => addBlockAndEdit('checklist')}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Checklist
          </Button>
        </div>
      </div>

      {/* Modales de edición */}
      <DocBlockEditorModal
        key={editingBlock?.id ?? 'closed'}
        block={editingBlock}
        slugHint={draft.slug}
        onClose={() => setEditingIndex(null)}
        onSave={(updated) => {
          if (editingIndex === null) return
          const next = [...draft.blocks]
          next[editingIndex] = updated
          updateBlocks(next)
          setEditingIndex(null)
        }}
      />

      <DocMetadataEditorModal
        key={isMetadataOpen ? `meta-${draft.slug}` : 'meta-closed'}
        open={isMetadataOpen}
        article={draft}
        onClose={() => setIsMetadataOpen(false)}
        onSave={(patch) => {
          setDraft((prev) => ({ ...prev, ...patch }))
          setHasChanges(true)
          setIsMetadataOpen(false)
          toast.info('Metadatos actualizados en borrador. Pulsa "Guardar guía" para publicar.')
        }}
      />
    </div>
  )
}
