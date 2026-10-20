// app/(admin)/inventario/stock/historico/_components/HistoricoFiltros.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarClock, History, ListOrdered, Warehouse, MapPin, Layers, X } from 'lucide-react'
import { useFilterParams } from '@/components/admin/useFilterParams'
import { SearchInput } from '@/components/admin/SearchInput'
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

export function HistoricoFiltros({ bodegas, fechaCorte, alcance, vista, desde, hasta }: Props) {
  const { updateParam, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  const q = searchParam('q')
  const bodegaSel = searchParam('bodega')
  const ciudadSel = searchParam('ciudad')

  const ciudades = Array.from(
    new Set(bodegas.map((b) => (b.ciudad || 'VIRTUAL').trim().toUpperCase()))
  ).sort()

  const cambioFecha = (nueva: string) => {
    if (!nueva) return
    updateParam('fecha', nueva)
    // El kardex sigue por defecto el mes de la fecha de corte.
    updateParam('desde', primerDiaDe(nueva))
    updateParam('hasta', nueva)
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
            variant={vista === 'corte' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => updateParam('vista', null)}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            Stock a la fecha
          </Button>
          <Button
            type="button"
            variant={vista === 'kardex' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => updateParam('vista', 'kardex')}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Movimientos del periodo
          </Button>
        </div>

        {/* Selector de alcance */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shadow-sm">
          <Button
            type="button"
            variant={alcance === 'todas' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              updateParam('alcance', null)
              updateParam('bodega', null)
              updateParam('ciudad', null)
            }}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            Todas
          </Button>
          <Button
            type="button"
            variant={alcance === 'ciudad' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              updateParam('alcance', 'ciudad')
              updateParam('bodega', null)
            }}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" />
            Ciudad
          </Button>
          <Button
            type="button"
            variant={alcance === 'bodega' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              updateParam('alcance', 'bodega')
              updateParam('ciudad', null)
            }}
            className="h-8 text-xs font-semibold px-3 gap-1.5"
          >
            <Warehouse className="h-3.5 w-3.5" />
            Bodega
          </Button>
        </div>

        {/* Bodega (alcance = bodega) */}
        {alcance === 'bodega' && (
          <div className="space-y-1 min-w-[200px]">
            <Label className="text-[11px] text-muted-foreground">Bodega</Label>
            <Select
              value={bodegaSel || undefined}
              onValueChange={(v) => updateParam('bodega', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecciona bodega" />
              </SelectTrigger>
              <SelectContent>
                {bodegas.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                    {b.nombre} · {(b.ciudad || 'VIRTUAL').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ciudad (alcance = ciudad) */}
        {alcance === 'ciudad' && (
          <div className="space-y-1 min-w-[180px]">
            <Label className="text-[11px] text-muted-foreground">Ciudad</Label>
            <Select
              value={ciudadSel || undefined}
              onValueChange={(v) => updateParam('ciudad', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecciona ciudad" />
              </SelectTrigger>
              <SelectContent>
                {ciudades.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Fecha de corte */}
        <div className="space-y-1">
          <Label htmlFor="hist-fecha" className="text-[11px] text-muted-foreground">
            {vista === 'corte' ? 'Stock al cierre de' : 'Corte'}
          </Label>
          <Input
            id="hist-fecha"
            type="date"
            value={fechaCorte}
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
              className={`h-9 text-xs ${fechaCorte === p.valor ? 'border-primary bg-primary/5 font-bold' : ''}`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

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

        {vista === 'kardex' && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="hist-desde" className="text-[11px] text-muted-foreground">
                Desde
              </Label>
              <Input
                id="hist-desde"
                type="date"
                value={desde}
                onChange={(e) => updateParam('desde', e.target.value)}
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
                value={hasta}
                onChange={(e) => updateParam('hasta', e.target.value)}
                className="h-9 w-[160px] text-xs"
              />
            </div>
          </div>
        )}

        <Badge variant="outline" className="h-7 px-2 text-[11px] font-mono">
          corte: {fechaCorte}
        </Badge>
      </div>
    </div>
  )
}
