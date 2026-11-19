// app/(admin)/catalogo/[id]/components/TabAcabadosFullModal.tsx
'use client'

import { useMemo } from 'react'
import type { AcabadoResuelto, CatalogosEdicion } from '@/modules/catalogo/types'
import type { AcabadoSugerido } from '@/lib/catalogo/atributos-sugerencias'
import { normalizeTagText } from '@/lib/catalogo/tag-sugerencias'
import { ProductoAtributoModalShell } from './ProductoAtributoModalShell'
import { AcabadosQuickEditor, type QuickAcabadoInput } from './AcabadosQuickEditor'
import { Paintbrush, Plus, X } from 'lucide-react'

const PRESETS_ACABADOS: { label: string; tipo: string; detalle: string; loc?: string }[] = [
  { label: 'Estampado exterior completo', tipo: 'TECNICAS DE DECORACION', detalle: 'ESTAMPADO', loc: 'EXTERIOR COMPLETO' },
  { label: 'Estampado localizado', tipo: 'TECNICAS DE DECORACION', detalle: 'ESTAMPADO', loc: 'EXTERIOR LOCALIZADO' },
  { label: 'Bordado localizado', tipo: 'TECNICAS DE DECORACION', detalle: 'BORDADOS', loc: 'EXTERIOR LOCALIZADO' },
  { label: 'Textura acolchada', tipo: 'TEXTURA', detalle: 'ACOLCHADO', loc: 'EXTERIOR COMPLETO' },
  { label: 'Textura canalé / rib', tipo: 'TEXTURA', detalle: 'CANALE', loc: 'EXTERIOR COMPLETO' },
  { label: 'Textura lisa', tipo: 'TEXTURA', detalle: 'LISO', loc: 'EXTERIOR COMPLETO' },
  { label: 'Acabado mate', tipo: 'ACABADO', detalle: 'MATE', loc: 'EXTERIOR COMPLETO' },
  { label: 'Acabado brilloso', tipo: 'ACABADO', detalle: 'BRILLOSO', loc: 'EXTERIOR COMPLETO' },
  { label: 'Efecto desgastado', tipo: 'ACABADO', detalle: 'EFECTO DESGASTADO', loc: 'EXTERIOR COMPLETO' },
  { label: 'Parches aplicados', tipo: 'APLICACIONES', detalle: 'PARCHES', loc: 'EXTERIOR LOCALIZADO' },
]

export function TabAcabadosFullModal({
  open,
  onOpenChange,
  acabados,
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
  acabados: AcabadoResuelto[]
  catalogos: CatalogosEdicion
  sugerencias: AcabadoSugerido[]
  imagenPrincipalUrl?: string | null
  skuBase?: string | null
  descripcion?: string | null
  tipoPrenda?: string | null
  isSaving: boolean
  canEdit: boolean
  onAdd: (item: QuickAcabadoInput) => void
  onRemove: (id: number) => void
  onApplyAllSuggestions: () => void
  onRequestClearAll: () => void
}) {
  const presetsResueltos = useMemo(() => {
    return PRESETS_ACABADOS.map((preset) => {
      const tipo = catalogos.acabado_tipos.find((t) =>
        normalizeTagText(t.nombre).includes(normalizeTagText(preset.tipo))
      )
      if (!tipo) return null
      const detalle = catalogos.acabado_detalles.find((d) =>
        normalizeTagText(d.nombre).includes(normalizeTagText(preset.detalle))
      )
      const loc = preset.loc
        ? catalogos.localizaciones.find((l) =>
            normalizeTagText(l.nombre).includes(normalizeTagText(preset.loc!))
          )
        : undefined
      return {
        label: preset.label,
        input: {
          tipo_acabado_id: tipo.id,
          detalle_acabado_id: detalle?.id ?? null,
          patron_acabado_id: null,
          localizacion_id: loc?.id ?? null,
        } satisfies QuickAcabadoInput,
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [catalogos.acabado_detalles, catalogos.acabado_tipos, catalogos.localizaciones])

  return (
    <ProductoAtributoModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Editor completo de Acabados"
      description="Agrega texturas, técnicas de decoración, estampados, aplicaciones y su localización."
      icon={<Paintbrush className="h-4 w-4 text-primary" />}
      imagenPrincipalUrl={imagenPrincipalUrl}
      skuBase={skuBase}
      tipoPrenda={tipoPrenda}
      productoDescripcion={descripcion}
      assignedTitle="Acabados asignados"
      assignedCount={acabados.length}
      isSaving={isSaving}
      canEdit={canEdit}
      onRequestClearAll={onRequestClearAll}
      assignedContent={
        acabados.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Aún no hay acabados asignados.</p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
            {acabados.map((a) => (
              <div
                key={a.id}
                className="flex items-start justify-between gap-1.5 rounded-md border bg-background px-2 py-1.5 text-[11px]"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{a.tipo_acabado ?? '—'}</p>
                  <p className="text-muted-foreground truncate">
                    {[a.detalle, a.patron, a.localizacion].filter(Boolean).join(' · ') || 'Sin detalle'}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    className="rounded-sm hover:bg-muted p-0.5 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Quitar acabado"
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
      <AcabadosQuickEditor
        catalogos={catalogos}
        sugerencias={sugerencias}
        canEdit={canEdit}
        onAdd={onAdd}
        onApplyAllSuggestions={onApplyAllSuggestions}
      />

      {presetsResueltos.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2 bg-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acabados frecuentes (1 clic)
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
