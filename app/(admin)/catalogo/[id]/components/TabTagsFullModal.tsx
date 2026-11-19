// app/(admin)/catalogo/[id]/components/TabTagsFullModal.tsx
'use client'

import { useMemo, useState } from 'react'
import type {
  CatalogosEdicion,
  RefTagCatalogo,
  TagResuelto,
  TipoTagCatalogo,
} from '@/modules/catalogo/types'
import {
  getTagCategoryStyle,
  normalizeTagText,
  type TagSugerido,
} from '@/lib/catalogo/tag-sugerencias'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Check, Loader2, Plus, Search, Sparkles, Tag, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuickTagSelection } from './TagsQuickEditor'
import { ProductImageViewer } from './ProductImageViewer'

export function TabTagsFullModal({
  open,
  onOpenChange,
  tags,
  catalogos,
  sugerencias,
  imagenPrincipalUrl = null,
  skuBase = null,
  descripcion = null,
  tipoPrenda = null,
  isPending,
  canEdit,
  onAddTag,
  onRemoveTag,
  onApplyAllSuggestions,
  onRequestClearAll,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: TagResuelto[]
  catalogos: CatalogosEdicion
  sugerencias: TagSugerido[]
  imagenPrincipalUrl?: string | null
  skuBase?: string | null
  descripcion?: string | null
  tipoPrenda?: string | null
  isPending: boolean
  canEdit: boolean
  onAddTag: (sel: QuickTagSelection) => void
  onRemoveTag: (tagId: number) => void
  onApplyAllSuggestions: () => void
  onRequestClearAll: () => void
}) {
  const [query, setQuery] = useState('')
  const [selectedTipoId, setSelectedTipoId] = useState<number | 'all'>('all')

  const assignedByRefId = useMemo(() => {
    const map = new Map<number, TagResuelto>()
    for (const t of tags) {
      if (t.ref_tag_id != null) map.set(t.ref_tag_id, t)
    }
    return map
  }, [tags])

  const categorias = useMemo(() => {
    const refsByTipo = new Map<number, RefTagCatalogo[]>()
    for (const r of catalogos.ref_tags) {
      const list = refsByTipo.get(r.tipo_tag_id) ?? []
      list.push(r)
      refsByTipo.set(r.tipo_tag_id, list)
    }

    const q = normalizeTagText(query)
    return catalogos.tipos_tag
      .map((tipo) => {
        const allRefs = refsByTipo.get(tipo.id) ?? []
        const filtered = q
          ? allRefs.filter(
              (r) =>
                normalizeTagText(r.nombre).includes(q) ||
                normalizeTagText(tipo.nombre).includes(q)
            )
          : allRefs
        return { tipo, refs: filtered }
      })
      .filter((g) => {
        if (selectedTipoId !== 'all' && g.tipo.id !== selectedTipoId) return false
        return g.refs.length > 0
      })
  }, [catalogos.ref_tags, catalogos.tipos_tag, query, selectedTipoId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-primary" />
                Editor completo de Tags
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Haz clic para agregar o quitar al instante. Las categorías únicas reemplazan automáticamente el tag anterior.
              </DialogDescription>
            </div>
            {isPending && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Columna izquierda fija: imagen principal 3:4 con zoom + datos + tags seleccionados */}
            <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-0 space-y-3 rounded-xl border bg-muted/20 p-3">
              <ProductImageViewer
                src={imagenPrincipalUrl}
                alt={skuBase ?? 'Imagen del producto'}
                sku={skuBase ?? ''}
                className="aspect-[3/4] sm:aspect-[3/4]"
              />
              <div className="space-y-1">
                {skuBase && (
                  <p className="font-mono text-xs font-semibold text-foreground">{skuBase}</p>
                )}
                {tipoPrenda && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {tipoPrenda}
                  </Badge>
                )}
                {descripcion && (
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
                    {descripcion}
                  </p>
                )}
              </div>

              <div className="border-t pt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Tags seleccionados ({tags.length})
                  </span>
                </div>
                {tags.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    Aún no hay tags asignados.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {tags.map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                          getTagCategoryStyle(t.tipo_tag_codigo ?? t.tipo_tag_nombre)
                        )}
                      >
                        <span className="opacity-70 uppercase text-[9px]">{t.tipo_tag_nombre}:</span>
                        <span>{t.ref_tag_nombre ?? t.valor_texto ?? '—'}</span>
                        {canEdit && (
                          <button
                            type="button"
                            disabled={false}
                            onClick={() => onRemoveTag(t.id)}
                            className="ml-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
                            aria-label={`Quitar ${t.ref_tag_nombre ?? 'tag'}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </aside>

            {/* Columna derecha: sugerencias, buscador y catálogo completo */}
            <div className="flex-1 min-w-0 space-y-5">
          {/* Sugerencias inteligentes */}
          {sugerencias.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sugerencias inteligentes desde descripción ({sugerencias.length})
                </span>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={onApplyAllSuggestions}
                    className="h-7 px-2.5 text-xs"
                  >
                    Aplicar todos
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sugerencias.map((sug) => (
                  <button
                    key={sug.ref_tag_id}
                    type="button"
                    disabled={!canEdit}
                    title={sug.razon}
                    onClick={() =>
                      onAddTag({
                        tipo_tag_id: sug.tipo_tag_id,
                        ref_tag_id: sug.ref_tag_id,
                        es_multiple: sug.es_multiple,
                        label: sug.ref_nombre,
                      })
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-all hover:brightness-95',
                      getTagCategoryStyle(sug.tipo_codigo ?? sug.tipo_nombre)
                    )}
                  >
                    <Plus className="h-3 w-3" />
                    <span className="opacity-70 uppercase text-[10px]">{sug.tipo_nombre}:</span>
                    <span>{sug.ref_nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Buscador + filtro de categorías */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en todas las categorías de tags..."
                className="h-9 pl-9 pr-8 text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTipoId('all')}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  selectedTipoId === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                )}
              >
                Todas ({catalogos.tipos_tag.length})
              </button>
              {catalogos.tipos_tag.map((tipo: TipoTagCatalogo) => (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => setSelectedTipoId(tipo.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    selectedTipoId === tipo.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  )}
                >
                  {tipo.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Catálogo agrupado por categoría */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categorias.map(({ tipo, refs }) => (
              <div key={tipo.id} className="rounded-lg border p-3 space-y-2 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {tipo.nombre}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                    {tipo.es_multiple === false ? 'Selección única' : 'Múltiple'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {refs.map((ref) => {
                    const existing = assignedByRefId.get(ref.id)
                    const activeStyle = getTagCategoryStyle(tipo.codigo ?? tipo.nombre)
                    return (
                      <button
                        key={ref.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          if (existing) {
                            onRemoveTag(existing.id)
                          } else {
                            onAddTag({
                              tipo_tag_id: tipo.id,
                              ref_tag_id: ref.id,
                              es_multiple: Boolean(tipo.es_multiple),
                              label: ref.nombre,
                            })
                          }
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all disabled:opacity-50',
                          existing
                            ? cn(activeStyle, 'font-semibold ring-1 ring-primary/30')
                            : 'bg-background hover:bg-muted/70 text-foreground border-border'
                        )}
                      >
                        {existing ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />}
                        <span>{ref.nombre}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
            </div>
          </div>
        </div>

        {/* Footer: Limpiar todos / Listo */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div>
            {canEdit && tags.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={onRequestClearAll}
                className="h-8 px-2.5 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpiar todos
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4"
          >
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
