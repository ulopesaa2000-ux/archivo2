// app/(admin)/catalogo/[id]/components/AcabadosQuickEditor.tsx
'use client'

import { useState } from 'react'
import type { CatalogosEdicion } from '@/modules/catalogo/types'
import type { AcabadoSugerido } from '@/lib/catalogo/atributos-sugerencias'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export type QuickAcabadoInput = {
  tipo_acabado_id: number
  detalle_acabado_id: number | null
  patron_acabado_id: number | null
  localizacion_id: number | null
}

export function AcabadosQuickEditor({
  catalogos,
  sugerencias,
  canEdit,
  compact = false,
  onAdd,
  onApplyAllSuggestions,
}: {
  catalogos: CatalogosEdicion
  sugerencias: AcabadoSugerido[]
  canEdit: boolean
  compact?: boolean
  onAdd: (item: QuickAcabadoInput) => void
  onApplyAllSuggestions: () => void
}) {
  const [tipoId, setTipoId] = useState('')
  const [detalleId, setDetalleId] = useState('')
  const [patronId, setPatronId] = useState('')
  const [localizacionId, setLocalizacionId] = useState('')

  const tipoNombre = catalogos.acabado_tipos.find((t) => String(t.id) === tipoId)?.nombre
  const detalleNombre =
    detalleId === '_null'
      ? 'Ninguno'
      : catalogos.acabado_detalles.find((d) => String(d.id) === detalleId)?.nombre
  const patronNombre =
    patronId === '_null'
      ? 'Ninguno'
      : catalogos.acabado_patrones.find((p) => String(p.id) === patronId)?.nombre
  const localizacionNombre =
    localizacionId === '_null'
      ? 'Ninguno'
      : catalogos.localizaciones.find((l) => String(l.id) === localizacionId)?.nombre

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit || !tipoId) return
    onAdd({
      tipo_acabado_id: Number(tipoId),
      detalle_acabado_id: detalleId && detalleId !== '_null' ? Number(detalleId) : null,
      patron_acabado_id: patronId && patronId !== '_null' ? Number(patronId) : null,
      localizacion_id: localizacionId && localizacionId !== '_null' ? Number(localizacionId) : null,
    })
    setTipoId('')
    setDetalleId('')
    setPatronId('')
    setLocalizacionId('')
  }

  return (
    <div className="space-y-3.5">
      {sugerencias.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Sugeridos ({sugerencias.length})
            </span>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onApplyAllSuggestions}
                className="h-6 px-2 text-[11px]"
              >
                Aplicar todos
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sugerencias.map((s, idx) => (
              <button
                key={`${s.tipo_acabado_id}-${s.detalle_acabado_id}-${idx}`}
                type="button"
                disabled={!canEdit}
                title={s.razon}
                onClick={() => {
                  if (!s.tipo_acabado_id) return
                  onAdd({
                    tipo_acabado_id: s.tipo_acabado_id,
                    detalle_acabado_id: s.detalle_acabado_id,
                    patron_acabado_id: s.patron_acabado_id,
                    localizacion_id: s.localizacion_id,
                  })
                }}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-background px-2 py-1 text-[11px] font-medium hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span className="font-semibold">{s.detalle_nombre ?? s.tipo_nombre}</span>
                {s.patron_nombre && <span className="text-muted-foreground">· {s.patron_nombre}</span>}
                {s.localizacion_nombre && (
                  <span className="text-muted-foreground">({s.localizacion_nombre})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Tipo de Acabado *</Label>
            <Select value={tipoId} onValueChange={(v) => setTipoId(v ?? '')} disabled={!canEdit}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Selecciona tipo...">{tipoNombre}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {catalogos.acabado_tipos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Detalle</Label>
            <Select value={detalleId} onValueChange={(v) => setDetalleId(v ?? '')} disabled={!canEdit}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Opcional...">{detalleNombre}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_null">Ninguno</SelectItem>
                {catalogos.acabado_detalles.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Patrón / Estampado</Label>
            <Select value={patronId} onValueChange={(v) => setPatronId(v ?? '')} disabled={!canEdit}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Opcional...">{patronNombre}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_null">Ninguno</SelectItem>
                {catalogos.acabado_patrones.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Localización</Label>
            <Select value={localizacionId} onValueChange={(v) => setLocalizacionId(v ?? '')} disabled={!canEdit}>
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Opcional...">{localizacionNombre}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_null">Ninguno</SelectItem>
                {catalogos.localizaciones.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!canEdit || !tipoId} className="h-8 px-3 gap-1">
            <Plus className="h-3.5 w-3.5" /> Agregar acabado
          </Button>
        </div>
      </form>
    </div>
  )
}
