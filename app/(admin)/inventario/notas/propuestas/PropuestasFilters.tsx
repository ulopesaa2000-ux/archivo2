// app/(admin)/inventario/notas/propuestas/PropuestasFilters.tsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useFilterParams } from '@/components/admin/useFilterParams'
import { SearchInput } from '@/components/admin/SearchInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  X,
  Calendar,
  Filter,
  SlidersHorizontal,
  Building2,
  Warehouse,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type PropuestaSortBy = 'fecha_escaneo' | 'origen' | 'destino' | 'confianza'

const SORT_OPTIONS: { value: PropuestaSortBy; label: string }[] = [
  { value: 'fecha_escaneo', label: 'Fecha de escaneo' },
  { value: 'origen', label: 'Origen detectado' },
  { value: 'destino', label: 'Destino detectado' },
  { value: 'confianza', label: 'Confianza OCR' },
]

type Props = {
  bodegas: { id: number; nombre: string; codigo: string }[]
  sortBy: string
  order: 'asc' | 'desc'
  estado: string
}

export function PropuestasFilters({ bodegas, sortBy, order, estado }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { updateParam, clearAll, searchParam, isPending, searchParams } = useFilterParams()

  const currentQ = searchParam('q')
  const currentBodegaOrigen = searchParam('bodega_origen_id', '_all')
  const currentBodegaDestino = searchParam('bodega_destino_id', '_all')
  const currentDesde = searchParam('fecha_desde')
  const currentHasta = searchParam('fecha_hasta')

  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  // Filtros activos excluyendo 'estado' y 'page'
  const activeFiltersCount = [
    Boolean(currentQ),
    currentBodegaOrigen !== '_all',
    currentBodegaDestino !== '_all',
    Boolean(currentDesde),
    Boolean(currentHasta),
    sortBy !== 'fecha_escaneo' || order !== 'desc',
  ].filter(Boolean).length

  const handleResetFilters = () => {
    // Conservar el estado actual ('PENDIENTE_REVISION' o 'REVISADO')
    const params = new URLSearchParams()
    if (estado) params.set('estado', estado)
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const toggleSortOrder = () => {
    const nextOrder = order === 'asc' ? 'desc' : 'asc'
    updateParam('order', nextOrder)
  }

  return (
    <div className={`space-y-3 bg-card border rounded-2xl p-4 shadow-sm transition-opacity ${isPending ? 'opacity-70' : ''}`}>
      {/* Fila 1: Buscador y Filtros Rápidos */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 min-w-[260px]">
          <SearchInput
            id="ocr-propuestas-search"
            placeholder="Buscar por folio, origen, destino, tipo..."
            currentValue={currentQ}
            onSearch={(term) => updateParam('q', term)}
            delay={300}
            controlled
          />
        </div>

        {/* Controles de Ordenación */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-muted/50 border rounded-xl p-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase px-2 hidden sm:inline">
              Ordenar:
            </span>
            <Select
              value={sortBy}
              onValueChange={(val) => updateParam('sort_by', val === 'fecha_escaneo' ? null : val)}
            >
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none text-xs font-semibold focus:ring-0 w-[145px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent align="end">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleSortOrder}
              className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
              title={order === 'asc' ? 'Orden: Ascendente (clic para cambiar a Descendente)' : 'Orden: Descendente (clic para cambiar a Ascendente)'}
            >
              {order === 'asc' ? (
                <>
                  <ArrowUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase font-bold text-primary">Asc</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] uppercase font-bold text-primary">Desc</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Fila 2: Filtros Específicos (Bodega Origen, Bodega Destino, Rango Fechas Escaneo) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Bodega Origen */}
        <Select
          value={currentBodegaOrigen}
          onValueChange={(val) => updateParam('bodega_origen_id', val === '_all' ? null : val)}
        >
          <SelectTrigger className="h-8 text-xs w-full sm:w-[180px] bg-background">
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">
                {currentBodegaOrigen !== '_all'
                  ? `Origen: ${bodegas.find((b) => String(b.id) === currentBodegaOrigen)?.nombre ?? currentBodegaOrigen}`
                  : 'Origen: Todas'}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all" className="text-xs">Todos los orígenes</SelectItem>
            {bodegas.map((b) => (
              <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                {b.nombre} ({b.codigo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bodega Destino */}
        <Select
          value={currentBodegaDestino}
          onValueChange={(val) => updateParam('bodega_destino_id', val === '_all' ? null : val)}
        >
          <SelectTrigger className="h-8 text-xs w-full sm:w-[180px] bg-background">
            <div className="flex items-center gap-1.5 truncate">
              <Warehouse className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">
                {currentBodegaDestino !== '_all'
                  ? `Destino: ${bodegas.find((b) => String(b.id) === currentBodegaDestino)?.nombre ?? currentBodegaDestino}`
                  : 'Destino: Todas'}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all" className="text-xs">Todos los destinos</SelectItem>
            {bodegas.map((b) => (
              <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                {b.nombre} ({b.codigo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Popover Rango de Fechas Escaneo */}
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className={`h-8 text-xs font-medium gap-1.5 ${
                  currentDesde || currentHasta ? 'border-primary/50 text-primary bg-primary/5' : ''
                }`}
              />
            }
          >
            <Calendar className="h-3.5 w-3.5" />
            {currentDesde || currentHasta ? (
              <span>
                {currentDesde ? currentDesde : 'Inicio'} → {currentHasta ? currentHasta : 'Fin'}
              </span>
            ) : (
              <span>Fecha de escaneo</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 space-y-3" align="start">
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                Filtrar por Fecha de Escaneo
              </h4>
              <p className="text-xs text-muted-foreground">
                Selecciona el rango de fechas en que se procesaron las notas físicas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Desde</label>
                <Input
                  type="date"
                  value={currentDesde}
                  onChange={(e) => updateParam('fecha_desde', e.target.value || null)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Hasta</label>
                <Input
                  type="date"
                  value={currentHasta}
                  onChange={(e) => updateParam('fecha_hasta', e.target.value || null)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {(currentDesde || currentHasta) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 text-muted-foreground"
                onClick={() => {
                  updateParam('fecha_desde', null)
                  updateParam('fecha_hasta', null)
                }}
              >
                Limpiar rango de fechas
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Botón Limpiar Todo cuando hay filtros activos */}
        {activeFiltersCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3.5 w-3.5" />
            <span>Limpiar filtros</span>
            <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] font-bold">
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  )
}
