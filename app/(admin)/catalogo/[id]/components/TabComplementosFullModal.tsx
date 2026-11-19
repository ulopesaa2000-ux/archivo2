// app/(admin)/catalogo/[id]/components/TabComplementosFullModal.tsx
'use client'

import { useMemo } from 'react'
import type { CatalogosEdicion, ComplementoResuelto } from '@/modules/catalogo/types'
import type { ComplementoSugerido } from '@/lib/catalogo/atributos-sugerencias'
import { normalizeTagText } from '@/lib/catalogo/tag-sugerencias'
import { ProductoAtributoModalShell } from './ProductoAtributoModalShell'
import { ComplementosQuickEditor, type QuickComplementoInput } from './ComplementosQuickEditor'
import { Puzzle, Plus, X } from 'lucide-react'

const PRESETS_COMPLEMENTOS: { label: string; parte: string; tipo: string; corte?: string }[] = [
  { label: 'Gorro fijo', parte: 'GORRO', tipo: 'FIJO' },
  { label: 'Gorro desmontable', parte: 'GORRO', tipo: 'DESMONTABLE' },
  { label: 'Cierre cremallera', parte: 'CIERRE FRONTAL', tipo: 'CREMALLERA' },
  { label: 'Cierre botones', parte: 'CIERRE FRONTAL', tipo: 'BOTONES' },
  { label: 'Puño en rib', parte: 'PUNO', tipo: 'RIB' },
  { label: 'Cintura en rib', parte: 'CINTURA', tipo: 'RIB' },
  { label: 'Bolsas laterales', parte: 'COSTADOS', tipo: 'BOLSAS' },
  { label: 'Bolsas cargo', parte: 'COSTADOS', tipo: 'BOLSAS', corte: 'CARGO' },
  { label: 'Manga larga recta', parte: 'MANGA', tipo: 'LARGA', corte: 'RECTA' },
  { label: 'Forro completo', parte: 'REVESTIMIENTO', tipo: 'N/A', corte: 'COMPLETO' },
]

export function TabComplementosFullModal({
  open,
  onOpenChange,
  complementos,
  catalogos,
  sugerencias,
  imagenPrincipalUrl = null,
  skuBase = null,
  descripcion = null,
  tipoPrenda = null,
  isSaving,
  canEdit,
  onAdd,
  onRemove,
  onApplyAllSuggestions,
  onRequestClearAll,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  complementos: ComplementoResuelto[]
  catalogos: CatalogosEdicion
  sugerencias: ComplementoSugerido[]
  imagenPrincipalUrl?: string | null
  skuBase?: string | null
  descripcion?: string | null
  tipoPrenda?: string | null
  isSaving: boolean
  canEdit: boolean
  onAdd: (item: QuickComplementoInput) => void
  onRemove: (id: number) => void
  onApplyAllSuggestions: () => void
  onRequestClearAll: () => void
}) {
  const presetsResueltos = useMemo(() => {
    return PRESETS_COMPLEMENTOS.map((preset) => {
      const parte = catalogos.partes.find((p) =>
        normalizeTagText(p.nombre).includes(normalizeTagText(preset.parte))
      )
      if (!parte) return null
      const tipo = catalogos.componente_tipos.find((t) =>
        normalizeTagText(t.nombre).includes(normalizeTagText(preset.tipo))
      )
      const corte = preset.corte
        ? catalogos.corte_formas.find((c) =>
            normalizeTagText(c.nombre).includes(normalizeTagText(preset.corte!))
          )
        : undefined
      return {
        label: preset.label,
        input: {
          parte_prenda_id: parte.id,
          tipo_comp_id: tipo?.id ?? null,
          corte_forma_id: corte?.id ?? null,
          material_id: null,
          descripcion_adicional: null,
        } satisfies QuickComplementoInput,
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [catalogos.componente_tipos, catalogos.corte_formas, catalogos.partes])

  return (
    <ProductoAtributoModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Editor completo de Complementos"
      description="Agrega combinaciones rápidas de partes, cierres, mangas, cuellos o revestimientos."
      icon={<Puzzle className="h-4 w-4 text-primary" />}
      imagenPrincipalUrl={imagenPrincipalUrl}
      skuBase={skuBase}
      tipoPrenda={tipoPrenda}
      productoDescripcion={descripcion}
      assignedTitle="Complementos asignados"
      assignedCount={complementos.length}
      isSaving={isSaving}
      canEdit={canEdit}
      onRequestClearAll={onRequestClearAll}
      assignedContent={
        complementos.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Aún no hay complementos asignados.</p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {complementos.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-1.5 rounded-md border bg-background px-2 py-1.5 text-[11px]"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.parte_prenda ?? '—'}</p>
                  <p className="text-muted-foreground truncate">
                    {[c.tipo_complemento, c.corte_forma, c.material].filter(Boolean).join(' · ') || 'Sin detalle'}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRemove(c.id)}
                    className="rounded-sm hover:bg-muted p-0.5 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Quitar complemento"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      }
    >
      <ComplementosQuickEditor
        catalogos={catalogos}
        sugerencias={sugerencias}
        canEdit={canEdit}
        onAdd={onAdd}
        onApplyAllSuggestions={onApplyAllSuggestions}
      />

      {presetsResueltos.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2 bg-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Combinaciones rápidas (1 clic)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {presetsResueltos.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={!canEdit}
                onClick={() => onAdd(preset.input)}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </ProductoAtributoModalShell>
  )
}
