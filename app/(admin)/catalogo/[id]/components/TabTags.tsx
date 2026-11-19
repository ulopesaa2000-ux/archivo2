// app/(admin)/catalogo/[id]/components/TabTags.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CatalogosEdicion, TagResuelto } from '@/modules/catalogo/types'
import {
  getTagCategoryStyle,
  sugerirTagsDesdeProducto,
} from '@/lib/catalogo/tag-sugerencias'
import {
  clearAllTagsAction,
  deleteTagAction,
  saveTagsBatchAction,
} from '@/modules/catalogo/actions'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeftRight,
  Loader2,
  Maximize2,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { TagsQuickEditor, type QuickTagSelection } from './TagsQuickEditor'
import { TabTagsFullModal } from './TabTagsFullModal'

export function TabTags({
  tags,
  productoId,
  catalogos,
  descripcion = null,
  tipoPrenda = null,
  skuBase = null,
  imagenPrincipalUrl = null,
  canEdit = true,
}: {
  tags: TagResuelto[]
  productoId: number
  catalogos: CatalogosEdicion
  descripcion?: string | null
  tipoPrenda?: string | null
  skuBase?: string | null
  imagenPrincipalUrl?: string | null
  canEdit?: boolean
}) {
  const [isFullModalOpen, setIsFullModalOpen] = useState(false)
  const [expandedEditor, setExpandedEditor] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [localTags, setLocalTags] = useState<TagResuelto[]>(tags)
  const [pendingCount, setPendingCount] = useState(0)
  const pendingRef = useRef(0)

  useEffect(() => {
    if (pendingRef.current === 0) {
      setLocalTags(tags)
    }
  }, [tags])

  const tipoById = useMemo(
    () => new Map(catalogos.tipos_tag.map((t) => [t.id, t])),
    [catalogos.tipos_tag]
  )
  const refById = useMemo(
    () => new Map(catalogos.ref_tags.map((r) => [r.id, r])),
    [catalogos.ref_tags]
  )

  const sugerencias = useMemo(
    () =>
      sugerirTagsDesdeProducto({
        descripcion,
        tipoPrenda,
        tiposTag: catalogos.tipos_tag,
        refTags: catalogos.ref_tags,
        tagsActuales: localTags,
      }),
    [catalogos.ref_tags, catalogos.tipos_tag, descripcion, localTags, tipoPrenda]
  )

  const groupedAssigned = useMemo(() => {
    const map = new Map<string, { nombre: string; codigo: string | null; items: TagResuelto[] }>()
    for (const t of localTags) {
      const key = String(t.tipo_tag_id ?? t.tipo_tag_nombre ?? 'otros')
      const entry = map.get(key) ?? {
        nombre: t.tipo_tag_nombre ?? 'Otros',
        codigo: t.tipo_tag_codigo,
        items: [],
      }
      entry.items.push(t)
      map.set(key, entry)
    }
    return Array.from(map.values())
  }, [localTags])

  const beginOp = () => {
    pendingRef.current += 1
    setPendingCount(pendingRef.current)
  }

  const endOp = () => {
    pendingRef.current = Math.max(0, pendingRef.current - 1)
    setPendingCount(pendingRef.current)
  }

  const buildOptimisticTag = useCallback(
    (tipoTagId: number, refTagId: number, tempId: number): TagResuelto => {
      const tipo = tipoById.get(tipoTagId)
      const ref = refById.get(refTagId)
      return {
        id: tempId,
        tipo_tag_id: tipoTagId,
        tipo_tag_nombre: tipo?.nombre ?? null,
        tipo_tag_codigo: tipo?.codigo ?? null,
        ref_tag_id: refTagId,
        ref_tag_nombre: ref?.nombre ?? null,
        ref_tag_codigo: null,
        valor_texto: null,
      }
    },
    [refById, tipoById]
  )

  const handleAddTag = (sel: QuickTagSelection) => {
    const tempId = -Math.floor(Date.now() + Math.random() * 100000)
    const optimisticTag = buildOptimisticTag(sel.tipo_tag_id, sel.ref_tag_id, tempId)

    let snapshotBefore: TagResuelto[] = []
    setLocalTags((prev) => {
      snapshotBefore = prev
      const filtered =
        sel.es_multiple === false
          ? prev.filter((t) => t.tipo_tag_id !== sel.tipo_tag_id)
          : prev
      if (filtered.some((t) => t.ref_tag_id === sel.ref_tag_id)) return filtered
      return [...filtered, optimisticTag]
    })

    beginOp()
    void saveTagsBatchAction({
      productoId,
      items: [
        {
          tipo_tag_id: sel.tipo_tag_id,
          ref_tag_id: sel.ref_tag_id,
          es_multiple: sel.es_multiple,
        },
      ],
    })
      .then((res) => {
        if (!res.success) {
          setLocalTags(snapshotBefore)
          toast.error(res.error ?? 'No se pudo agregar el tag')
          return
        }
        const realRow = res.data?.inserted?.[0]
        if (realRow) {
          setLocalTags((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, id: realRow.id } : t))
          )
        }
      })
      .catch(() => {
        setLocalTags(snapshotBefore)
        toast.error('Error de conexión al guardar el tag')
      })
      .finally(endOp)
  }

  const handleRemoveTag = (tagId: number) => {
    let removedTag: TagResuelto | undefined
    setLocalTags((prev) => {
      removedTag = prev.find((t) => t.id === tagId)
      return prev.filter((t) => t.id !== tagId)
    })

    // Si aún tenía ID temporal (no persistido), no hace falta llamar delete en BD
    if (tagId < 0) return

    beginOp()
    void deleteTagAction(tagId, productoId)
      .then((res) => {
        if (!res.success) {
          if (removedTag) {
            setLocalTags((prev) => [...prev, removedTag!])
          }
          toast.error(res.error ?? 'No se pudo quitar el tag')
        }
      })
      .catch(() => {
        if (removedTag) {
          setLocalTags((prev) => [...prev, removedTag!])
        }
        toast.error('Error de conexión al quitar el tag')
      })
      .finally(endOp)
  }

  const handleApplyAllSuggestions = () => {
    if (sugerencias.length === 0) return
    const itemsToApply = [...sugerencias]
    const tempPairs = itemsToApply.map((s, idx) => ({
      sug: s,
      tempId: -Math.floor(Date.now() + idx * 100 + Math.random() * 90),
    }))

    let snapshotBefore: TagResuelto[] = []
    setLocalTags((prev) => {
      snapshotBefore = prev
      let next = [...prev]
      for (const { sug, tempId } of tempPairs) {
        if (sug.es_multiple === false) {
          next = next.filter((t) => t.tipo_tag_id !== sug.tipo_tag_id)
        }
        if (!next.some((t) => t.ref_tag_id === sug.ref_tag_id)) {
          next.push(buildOptimisticTag(sug.tipo_tag_id, sug.ref_tag_id, tempId))
        }
      }
      return next
    })

    beginOp()
    void saveTagsBatchAction({
      productoId,
      items: itemsToApply.map((s) => ({
        tipo_tag_id: s.tipo_tag_id,
        ref_tag_id: s.ref_tag_id,
        es_multiple: s.es_multiple,
      })),
    })
      .then((res) => {
        if (!res.success) {
          setLocalTags(snapshotBefore)
          toast.error(res.error ?? 'No se pudieron aplicar las sugerencias')
          return
        }
        const inserted = res.data?.inserted ?? []
        if (inserted.length > 0) {
          setLocalTags((prev) =>
            prev.map((t) => {
              if (t.id >= 0) return t
              const match = inserted.find((row) => row.ref_tag_id === t.ref_tag_id)
              return match ? { ...t, id: match.id } : t
            })
          )
        }
        toast.success(`${itemsToApply.length} tags sugeridos aplicados`)
      })
      .catch(() => {
        setLocalTags(snapshotBefore)
        toast.error('Error al aplicar las sugerencias')
      })
      .finally(endOp)
  }

  const handleClearAll = async () => {
    const snapshot = localTags
    setLocalTags([])
    beginOp()
    try {
      const res = await clearAllTagsAction(productoId)
      if (!res.success) {
        setLocalTags(snapshot)
        toast.error(res.error ?? 'No se pudieron limpiar los tags')
        return
      }
      toast.success('Todos los tags fueron eliminados')
      setShowClearModal(false)
    } finally {
      endOp()
    }
  }

  const isSaving = pendingCount > 0

  return (
    <div className="space-y-4 mt-4">
      {localTags.length === 0 ? (
        /* ── Estado 1: Vacío con recomendador + editor rápido inline ── */
        <Card className="border-dashed">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Sin tags asignados
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {sugerencias.length > 0
                    ? `Detectamos ${sugerencias.length} sugerencias desde la descripción. Agrégalas en 1 clic o busca abajo.`
                    : 'Usa los booleanos rápidos o el buscador universal para asignar tags sin abrir ventanas.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFullModalOpen(true)}
              className="h-8 gap-1.5 shrink-0"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Editor completo
            </Button>
          </CardHeader>
          <CardContent>
            <TagsQuickEditor
              tags={localTags}
              catalogos={catalogos}
              sugerencias={sugerencias}
              isPending={isSaving}
              canEdit={canEdit}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onApplyAllSuggestions={handleApplyAllSuggestions}
            />
          </CardContent>
        </Card>
      ) : (
        /* ── Estado 2: Con datos -> Split 2/3 asignados + 1/3 editor rápido (expandible a 2/3) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Panel izquierdo: Tags asignados */}
          <Card
            className={cn(
              'transition-all duration-200',
              expandedEditor ? 'lg:col-span-4' : 'lg:col-span-8'
            )}
          >
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Tags asignados
                </CardTitle>
                <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                  {localTags.length}
                </Badge>
                {isSaving && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Guardando
                  </span>
                )}
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearModal(true)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpiar todos
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedAssigned.map((group) => (
                <div key={group.nombre} className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.nombre}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                          getTagCategoryStyle(group.codigo ?? group.nombre)
                        )}
                      >
                        <span>{t.ref_tag_nombre ?? t.valor_texto ?? '—'}</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t.id)}
                            className="rounded-sm hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
                            aria-label={`Quitar ${t.ref_tag_nombre ?? 'tag'}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Panel derecho: Editor rápido (1/3 o 2/3) */}
          <Card
            className={cn(
              'transition-all duration-200',
              expandedEditor ? 'lg:col-span-8' : 'lg:col-span-4'
            )}
          >
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <CardTitle className="text-sm font-semibold truncate">
                  Agregar rápido
                </CardTitle>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedEditor((prev) => !prev)}
                  title={expandedEditor ? 'Contraer panel a 1/3' : 'Ampliar panel a 2/3'}
                  className="h-7 px-2 text-xs gap-1 hidden lg:inline-flex"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {expandedEditor ? '1/3' : '2/3'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullModalOpen(true)}
                  title="Abrir editor completo en modal"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Ampliar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TagsQuickEditor
                tags={localTags}
                catalogos={catalogos}
                sugerencias={sugerencias}
                isPending={isSaving}
                canEdit={canEdit}
                compact={!expandedEditor}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onApplyAllSuggestions={handleApplyAllSuggestions}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Estado 3: Modal Grande Completo ── */}
      <TabTagsFullModal
        open={isFullModalOpen}
        onOpenChange={setIsFullModalOpen}
        tags={localTags}
        catalogos={catalogos}
        sugerencias={sugerencias}
        imagenPrincipalUrl={imagenPrincipalUrl}
        skuBase={skuBase}
        descripcion={descripcion}
        tipoPrenda={tipoPrenda}
        isPending={isSaving}
        canEdit={canEdit}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onApplyAllSuggestions={handleApplyAllSuggestions}
        onRequestClearAll={() => setShowClearModal(true)}
      />

      <ConfirmDeleteModal
        isOpen={showClearModal}
        onOpenChange={setShowClearModal}
        title="¿Limpiar todos los tags?"
        description="Se quitarán todos los tags asignados a este producto."
        elementName={`${localTags.length} tag(s) asignados`}
        confirmText="Limpiar todos"
        confirmLoadingText="Limpiando..."
        onConfirm={handleClearAll}
      />
    </div>
  )
}
