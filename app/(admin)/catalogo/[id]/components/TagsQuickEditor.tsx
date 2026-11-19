// app/(admin)/catalogo/[id]/components/TagsQuickEditor.tsx
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, Plus, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type QuickTagSelection = {
  tipo_tag_id: number
  ref_tag_id: number
  es_multiple: boolean
  label: string
}

type BooleanToggleConfig = {
  key: string
  label: string
  tipoCodigo: string
  positiveMatch: string
}

const BOOLEAN_TOGGLES: BooleanToggleConfig[] = [
  { key: 'gorro', label: 'Gorro / Capucha', tipoCodigo: 'GORRO', positiveMatch: 'CON GORRO' },
  { key: 'relleno', label: 'Con relleno', tipoCodigo: 'RELLENO', positiveMatch: 'CON RELLENO' },
  { key: 'talla_extra', label: 'Talla extra', tipoCodigo: 'TALLA EXTRA', positiveMatch: 'TALLAS EXTRA' },
]

export function TagsQuickEditor({
  tags,
  catalogos,
  sugerencias,
  isPending,
  canEdit,
  compact = false,
  onAddTag,
  onRemoveTag,
  onApplyAllSuggestions,
}: {
  tags: TagResuelto[]
  catalogos: CatalogosEdicion
  sugerencias: TagSugerido[]
  isPending: boolean
  canEdit: boolean
  compact?: boolean
  onAddTag: (sel: QuickTagSelection) => void
  onRemoveTag: (tagId: number) => void
  onApplyAllSuggestions: () => void
}) {
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const assignedByRefId = useMemo(() => {
    const map = new Map<number, TagResuelto>()
    for (const t of tags) {
      if (t.ref_tag_id != null) map.set(t.ref_tag_id, t)
    }
    return map
  }, [tags])

  const tipoById = useMemo(
    () => new Map(catalogos.tipos_tag.map((t) => [t.id, t])),
    [catalogos.tipos_tag]
  )

  const tipoByCodigo = useMemo(
    () =>
      new Map(
        catalogos.tipos_tag
          .filter((t) => t.codigo)
          .map((t) => [normalizeTagText(t.codigo), t])
      ),
    [catalogos.tipos_tag]
  )

  // Booleanos rápidos mapeados contra las categorías reales
  const booleanControls = useMemo(() => {
    return BOOLEAN_TOGGLES.map((cfg) => {
      const tipo = tipoByCodigo.get(normalizeTagText(cfg.tipoCodigo))
      if (!tipo) return null
      const positiveRef = catalogos.ref_tags.find(
        (r) =>
          r.tipo_tag_id === tipo.id &&
          normalizeTagText(r.nombre).includes(normalizeTagText(cfg.positiveMatch))
      )
      if (!positiveRef) return null
      const existing = assignedByRefId.get(positiveRef.id)
      return {
        ...cfg,
        tipo,
        positiveRef,
        checked: Boolean(existing),
        existingTagId: existing?.id ?? null,
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [assignedByRefId, catalogos.ref_tags, tipoByCodigo])

  // Resultados del buscador universal agrupados por tipo_tag
  const searchGroups = useMemo(() => {
    const q = normalizeTagText(query)
    if (!q && !searchFocused) return []

    const matchingRefs = catalogos.ref_tags.filter((ref) => {
      if (!q) return true
      const tipo = tipoById.get(ref.tipo_tag_id)
      const refNorm = normalizeTagText(ref.nombre)
      const tipoNorm = normalizeTagText(tipo?.nombre)
      const codigoNorm = normalizeTagText(tipo?.codigo)
      return refNorm.includes(q) || tipoNorm.includes(q) || codigoNorm.includes(q)
    })

    const grouped = new Map<number, { tipo: TipoTagCatalogo; items: RefTagCatalogo[] }>()
    for (const ref of matchingRefs.slice(0, q ? 40 : 24)) {
      const tipo = tipoById.get(ref.tipo_tag_id)
      if (!tipo) continue
      const entry = grouped.get(tipo.id) ?? { tipo, items: [] }
      entry.items.push(ref)
      grouped.set(tipo.id, entry)
    }

    return Array.from(grouped.values()).sort(
      (a, b) => (a.tipo.orden ?? 99) - (b.tipo.orden ?? 99)
    )
  }, [catalogos.ref_tags, query, searchFocused, tipoById])

  const handleToggleBoolean = (ctrl: (typeof booleanControls)[number], nextChecked: boolean) => {
    if (!canEdit) return
    if (nextChecked) {
      onAddTag({
        tipo_tag_id: ctrl.tipo.id,
        ref_tag_id: ctrl.positiveRef.id,
        es_multiple: Boolean(ctrl.tipo.es_multiple),
        label: ctrl.positiveRef.nombre,
      })
    } else if (ctrl.existingTagId != null) {
      onRemoveTag(ctrl.existingTagId)
    }
  }

  return (
    <div className="space-y-3.5">
      {/* Booleanos rápidos */}
      {booleanControls.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Booleanos rápidos
          </p>
          <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
            {booleanControls.map((ctrl) => (
              <label
                key={ctrl.key}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors cursor-pointer',
                  ctrl.checked
                    ? 'border-primary/40 bg-primary/5 text-foreground'
                    : 'bg-background hover:bg-muted/40 text-muted-foreground'
                )}
              >
                <span className="font-medium truncate">{ctrl.label}</span>
                <Switch
                  checked={ctrl.checked}
                  disabled={!canEdit}
                  onCheckedChange={(checked) => handleToggleBoolean(ctrl, checked)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sugerencias inteligentes por descripción */}
      {sugerencias.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Sugeridos por descripción ({sugerencias.length})
            </span>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={onApplyAllSuggestions}
                className="h-6 px-2 text-[11px]"
              >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
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
                  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all hover:brightness-95 active:scale-95 disabled:opacity-50',
                  getTagCategoryStyle(sug.tipo_codigo ?? sug.tipo_nombre)
                )}
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span className="opacity-70 uppercase text-[9px]">{sug.tipo_nombre}:</span>
                <span>{sug.ref_nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Buscador universal */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Agregar tags (buscador universal)
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            placeholder="Ej. bomber, casual, térmico, corte..."
            disabled={!canEdit}
            className="h-8 pl-8 pr-7 text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {searchGroups.length > 0 && (
          <div className="max-h-60 overflow-y-auto rounded-lg border bg-popover p-1.5 shadow-sm space-y-2">
            {searchGroups.map(({ tipo, items }) => (
              <div key={tipo.id} className="space-y-1">
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {tipo.nombre}
                  </span>
                  {tipo.es_multiple === false && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-normal">
                      Único (reemplaza)
                    </Badge>
                  )}
                </div>
                <div className="space-y-0.5">
                  {items.map((ref) => {
                    const existing = assignedByRefId.get(ref.id)
                    return (
                      <button
                        key={ref.id}
                        type="button"
                        disabled={!canEdit}
                        onMouseDown={(e) => {
                          e.preventDefault()
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
                          'w-full flex items-center justify-between rounded px-2 py-1.5 text-xs text-left transition-colors',
                          existing
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/70 text-foreground'
                        )}
                      >
                        <span className="truncate">{ref.nombre}</span>
                        {existing ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
