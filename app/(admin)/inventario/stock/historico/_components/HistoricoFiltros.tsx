// app/(admin)/inventario/stock/historico/_components/HistoricoFiltros.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, History, ListOrdered, X } from 'lucide-react'
import { useFilterParams } from '@/components/admin/useFilterParams'
import { SearchInput } from '@/components/admin/SearchInput'
import { AlcanceCombobox } from './AlcanceCombobox'
import { ColumnasPanel } from './ColumnasPanel'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  bodegas: BodegaRow[]
  fechaCorte: string
  alcance: 'bodega' | 'ciudad' | 'todas'
  vista: 'corte' | 'kardex'
  desde: string
  hasta: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function finDeMes(base: Date): string {
  return iso(new Date(base.getFullYear(), base.getMonth() + 1, 0))
}

function primerDiaDe(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
  return `${fecha.slice(0, 7)}-01`
}

/**
 * Estado local sincronizado con un prop (patrón de React "adjusting state when
 * a prop changes", sin `setState` dentro de un effect).
 *
 * Hace falta porque los props vienen del Server Component y tardan en llegar:
 * sin estado local, el input controlado se resetea al valor viejo mientras
 * navega y el usuario ve cómo la fecha "vuelve" al valor anterior.
 */
function useValorLocal(valor: string): [string, (v: string) => void] {
  const [local, setLocal] = useState(valor)
  const [previo, setPrevio] = useState(valor)
  if (previo !== valor) {
    setPrevio(valor)
    setLocal(valor)
  }
  return [local, setLocal]
}

export function HistoricoFiltros({ bodegas, fechaCorte, alcance, vista, desde, hasta }: Props) {
  const { updateParam, updateParams, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  const q = searchParam('q')
  const bodegaSel = searchParam('bodega')
  const ciudadSel = searchParam('ciudad')

  // El alcance/vista se leen de la URL (respuesta inmediata al hacer clic);
  // los props son solo el fallback del primer render.
  const alcanceUrl = searchParam('alcance')
  const alcanceActual: 'bodega' | 'ciudad' | 'todas' =
    alcanceUrl === 'bodega' || alcanceUrl === 'ciudad' ? alcanceUrl : alcance
  const vistaUrl = searchParam('vista')
  const vistaActual: 'corte' | 'kardex' = vistaUrl === 'kardex' ? vistaUrl : vista

  // Estado local optimista de las fechas: el prop viene del Server Component y
  // tarda en llegar, así que si el input fuera controlado por el prop se
  // "revierte" visualmente mientras navega.
  const [fechaLocal, setFechaLocal] = useValorLocal(fechaCorte)
  const [desdeLocal, setDesdeLocal] = useValorLocal(desde)
  const [hastaLocal, setHastaLocal] = useValorLocal(hasta)

  /** Cambia la fecha de corte y sincroniza el periodo del kardex. */
  const cambioFecha = (nueva: string) => {
    if (!nueva) return
    setFechaLocal(nueva)
    setDesdeLocal(primerDiaDe(nueva))
    setHastaLocal(nueva)
    updateParams({
      fecha: nueva,
      desde: primerDiaDe(nueva),
      hasta: nueva,
    })
  }

  /** En el kardex, el cierre del periodo es también la fecha de corte. */
  const cambioHasta = (nuevo: string) => {
    if (!nuevo) return
    setHastaLocal(nuevo)
    setFechaLocal(nuevo)
    updateParams({ hasta: nuevo, fecha: nuevo })
  }

  const cambioDesde = (nuevo: string) => {
    if (!nuevo) return
    setDesdeLocal(nuevo)
    updateParams({ desde: nuevo })
  }

  const hoy = new Date()
  const presets = [
    { label: 'Fin de mes anterior', valor: finDeMes(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)) },
    { label: 'Fin de mes actual', valor: finDeMes(hoy) },
    { label: 'Hoy', valor: iso(hoy) },
  ]

  return (
    <div className={`space-y-3 ${isPending ? 'opacity-70' : ''}`}>
      {/* ── Fila 1: vista + alcance + fecha ── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Selector de vista */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shadow-sm">
          <Button
            type="button"
            variant={vistaActual === 'corte' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => updateParam('vista', null)}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            Stock a la fecha
          </Button>
          <Button
            type="button"
            variant={vistaActual === 'kardex' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => updateParam('vista', 'kardex')}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Movimientos del periodo
          </Button>
        </div>

        {/* Selector de alcance (combobox: ciudad → bodega) */}
        <AlcanceCombobox
          bodegas={bodegas}
          alcance={alcanceActual}
          ciudad={ciudadSel || null}
          bodegaId={bodegaSel ? parseInt(bodegaSel, 10) || null : null}
          onCambiar={(params) =>
            updateParams({
              alcance: params.alcance === 'todas' ? null : params.alcance,
              ciudad: params.ciudad ?? null,
              bodega: params.bodegaId != null ? String(params.bodegaId) : null,
            })
          }
        />

        {/* Fecha de corte */}
        <div className="space-y-1">
          <Label htmlFor="hist-fecha" className="text-[11px] text-muted-foreground">
            {vistaActual === 'corte' ? 'Stock al cierre de' : 'Corte'}
          </Label>
          <Input
            id="hist-fecha"
            type="date"
            value={fechaLocal}
            onChange={(e) => cambioFecha(e.target.value)}
            className="h-9 w-[170px] text-xs"
          />
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          {presets.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cambioFecha(p.valor)}
              className={`h-9 text-xs ${fechaLocal === p.valor ? 'border-primary bg-primary/5 font-bold' : ''}`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        <ColumnasPanel mostrarAgrupar={vistaActual === 'corte'} />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll(['hist-search'])}
            className="text-muted-foreground h-9 text-xs px-2"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* ── Fila 2: buscador + rango del kardex ── */}
      <div className="flex flex-wrap items-end gap-3">
        <SearchInput
          id="hist-search"
          placeholder="Buscar por SKU, descripción o familia..."
          currentValue={q}
          onSearch={(term) => updateParam('q', term)}
          delay={300}
          minLength={2}
          controlled
        />

        {vistaActual === 'kardex' && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="hist-desde" className="text-[11px] text-muted-foreground">
                Desde
              </Label>
              <Input
                id="hist-desde"
                type="date"
                value={desdeLocal}
                onChange={(e) => cambioDesde(e.target.value)}
                className="h-9 w-[160px] text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hist-hasta" className="text-[11px] text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="hist-hasta"
                type="date"
                value={hastaLocal}
                onChange={(e) => cambioHasta(e.target.value)}
                className="h-9 w-[160px] text-xs"
              />
            </div>
          </div>
        )}

        <Badge variant="outline" className="h-7 px-2 text-[11px] font-mono">
          corte: {fechaLocal}
        </Badge>
      </div>
    </div>
  )
}
