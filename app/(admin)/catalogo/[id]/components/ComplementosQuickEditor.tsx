// app/(admin)/catalogo/[id]/components/ComplementosQuickEditor.tsx
'use client'

import { useMemo, useState } from 'react'
import type { CatalogosEdicion } from '@/modules/catalogo/types'
import type { ComplementoSugerido } from '@/lib/catalogo/atributos-sugerencias'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export type QuickComplementoInput = {
  parte_prenda_id: number
  tipo_comp_id: number | null
  material_id: number | null
  corte_forma_id: number | null
  descripcion_adicional: string | null
}

export function ComplementosQuickEditor({
  catalogos,
  sugerencias,
  canEdit,
  compact = false,
  onAdd,
  onApplyAllSuggestions,
}: {
  catalogos: CatalogosEdicion
  sugerencias: ComplementoSugerido[]
  canEdit: boolean
  compact?: boolean
  onAdd: (item: QuickComplementoInput) => void
  onApplyAllSuggestions: () => void
}) {
  const [parteId, setParteId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [corteId, setCorteId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [notas, setNotas] = useState('')

  const parteNombre = useMemo(
    () => catalogos.partes.find((p) => String(p.id) === parteId)?.nombre,
    [catalogos.partes, parteId]
  )
  const tipoNombre = useMemo(
    () => catalogos.componente_tipos.find((t) => String(t.id) === tipoId)?.nombre,
    [catalogos.componente_tipos, tipoId]
  )

  const corteNombre = useMemo(
    () =>
      corteId === '_null'
        ? 'Ninguno'
        : catalogos.corte_formas.find((c) => String(c.id) === corteId)?.nombre,
    [catalogos.corte_formas, corteId]
  )
  const materialNombre = useMemo(
    () =>
      materialId === '_null'
        ? 'Ninguno'
        : catalogos.materiales.find((m) => String(m.id) === materialId)?.nombre,
    [catalogos.materiales, materialId]
  )
  const tipoDisplayNombre = tipoId === '_null' ? 'Ninguno' : tipoNombre

  const tiposFiltrados = useMemo(
    () =>
      parteNombre
        ? catalogos.componente_tipos.filter(
            (tc) => tc.complemento_en === parteNombre || tc.complemento_en === 'TODO'
          )
        : catalogos.componente_tipos,
    [catalogos.componente_tipos, parteNombre]
  )

  const cortesFiltrados = useMemo(
    () =>
      parteNombre
        ? catalogos.corte_formas.filter(
            (cf) =>
              cf.corte_forma_en === parteNombre ||
              cf.corte_forma_en === 'TODO' ||
              (tipoNombre && cf.corte_forma_en === tipoNombre)
          )
        : catalogos.corte_formas,
    [catalogos.corte_formas, parteNombre, tipoNombre]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit || !parteId) return
    onAdd({
      parte_prenda_id: Number(parteId),
      tipo_comp_id: tipoId && tipoId !== '_null' ? Number(tipoId) : null,
      corte_forma_id: corteId && corteId !== '_null' ? Number(corteId) : null,
      material_id: materialId && materialId !== '_null' ? Number(materialId) : null,
      descripcion_adicional: notas.trim() || null,
    })
    setParteId('')
    setTipoId('')
    setCorteId('')
    setMaterialId('')
    setNotas('')
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
                key={`${s.parte_prenda_id}-${s.tipo_comp_id}-${idx}`}
                type="button"
                disabled={!canEdit}
                title={s.razon}
                onClick={() => {
                  if (!s.parte_prenda_id) return
                  onAdd({
                    parte_prenda_id: s.parte_prenda_id,
                    tipo_comp_id: s.tipo_comp_id,
                    corte_forma_id: s.corte_forma_id,
                    material_id: s.material_id,
                    descripcion_adicional: null,
                  })
                }}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-background px-2 py-1 text-[11px] font-medium hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                <Plus className="h-3 w-3 shrink-0" />
                <span className="font-semibold">{s.parte_nombre}</span>
                {s.tipo_nombre && s.tipo_nombre !== 'N/A' && (
                  <span className="text-muted-foreground">· {s.tipo_nombre}</span>
                )}
                {s.corte_nombre && (
                  <span className="text-muted-foreground">({s.corte_nombre})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Parte de prenda *</Label>
            <Select
              value={parteId}
              onValueChange={(v) => {
                setParteId(v ?? '')
                setTipoId('')
                setCorteId('')
              }}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Selecciona parte...">
                  {parteNombre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {catalogos.partes.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <Select
              value={tipoId}
              onValueChange={(v) => {
                setTipoId(v ?? '')
                setCorteId('')
              }}
              disabled={!canEdit || !parteId}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder={parteId ? 'Opcional...' : 'Elige parte primero'}>
                  {tipoDisplayNombre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_null">Ninguno</SelectItem>
                {tiposFiltrados.map((tc) => (
                  <SelectItem key={tc.id} value={String(tc.id)}>
                    {tc.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Corte / Forma</Label>
            <Select
              value={corteId}
              onValueChange={(v) => setCorteId(v ?? '')}
              disabled={!canEdit || !parteId}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Opcional...">
                  {corteNombre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_null">Ninguno</SelectItem>
                {cortesFiltrados.map((cf) => (
                  <SelectItem key={cf.id} value={String(cf.id)}>
                    {cf.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Material</Label>
            <Select
              value={materialId}
              onValueChange={(v) => setMaterialId(v ?? '')}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue placeholder="Opcional...">
                  {materialNombre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_null">Ninguno</SelectItem>
                {catalogos.materiales.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Nota adicional (opcional)..."
            disabled={!canEdit}
            className="h-8 text-xs flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!canEdit || !parteId}
            className="h-8 px-3 gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        </div>
      </form>
    </div>
  )
}
