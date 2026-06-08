// app/(admin)/inventario/notas/NotasFilters.tsx
'use client'

import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { Search, Loader2, X } from 'lucide-react'
import {
  ESTADO_NOTA_COLORS,
  TIPO_MOVIMIENTO_ICONS,
} from '@/lib/constants'
import { useFilterParams } from '@/components/admin/useFilterParams'
import type { CatalogosInventario } from '@/modules/inventario/types'

export function NotasFilters({ catalogos }: { catalogos: CatalogosInventario }) {
  const { updateParam, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 400)

  const currentQ       = searchParam('q')
  const currentTipo    = searchParam('tipo_movimiento_id', '_all')
  const currentEstado  = searchParam('estado_codigo', '_all')
  const currentCiudad  = searchParam('ciudad', '_all')
  const currentBodega  = searchParam('bodega_origen_id', '_all')
  const currentDesde   = searchParam('fecha_desde')
  const currentHasta   = searchParam('fecha_hasta')

  const handleCiudadChange = (ciudad: string) => {
    if (ciudad === '_all') {
      updateParam('ciudad', null)
      return
    }
    updateParam('ciudad', ciudad)
    
    if (currentBodega !== '_all') {
      const bodegaSelected = catalogos.bodegas.find(b => String(b.id) === currentBodega)
      if (bodegaSelected && bodegaSelected.ciudad !== ciudad) {
        updateParam('bodega_origen_id', null)
      }
    }
  }

  const bodegasFiltradas = currentCiudad !== '_all'
    ? catalogos.bodegas.filter(b => b.ciudad === currentCiudad)
    : catalogos.bodegas

  return (
    <div className={`space-y-3 ${isPending ? 'opacity-70' : ''}`}>
      {/* Buscador */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="notas-search"
          placeholder="Buscar por número de nota..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Selects + Fechas */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tipo Movimiento */}
        <Select
          value={currentTipo}
          onValueChange={(v) => updateParam('tipo_movimiento_id', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <span className="truncate">
              {currentTipo === '_all'
                ? 'Todos los tipos'
                : (catalogos.tiposMovimiento.find((t) => String(t.id) === currentTipo)?.nombre ?? 'Tipo')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {catalogos.tiposMovimiento.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                <span className="mr-1">{TIPO_MOVIMIENTO_ICONS[t.codigo] ?? ''}</span>
                {t.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select
          value={currentEstado}
          onValueChange={(v) => updateParam('estado_codigo', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <span className="truncate">
              {currentEstado === '_all'
                ? 'Todos los estados'
                : (catalogos.estadosNota.find((e) => e.codigo === currentEstado)?.nombre ?? 'Estado')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estados</SelectItem>
            {catalogos.estadosNota.map((e) => (
              <SelectItem key={e.id} value={e.codigo}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      ESTADO_NOTA_COLORS[e.codigo]?.split(' ')[0] ?? 'bg-gray-300'
                    }`}
                  />
                  {e.nombre}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ciudad */}
        <Select
          value={currentCiudad}
          onValueChange={(v) => handleCiudadChange(v || '_all')}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <span className="truncate">
              {currentCiudad === '_all'
                ? 'Todas las ciudades'
                : currentCiudad}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las ciudades</SelectItem>
            {(catalogos.ciudades ?? []).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bodega Origen */}
        <Select
          value={currentBodega}
          onValueChange={(v) => updateParam('bodega_origen_id', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <span className="truncate">
              {currentBodega === '_all'
                ? 'Todas las bodegas'
                : (catalogos.bodegas.find((b) => String(b.id) === currentBodega)?.nombre ?? 'Bodega')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las bodegas</SelectItem>
            {bodegasFiltradas.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Fechas */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-9 w-[140px] text-sm"
            value={currentDesde}
            onChange={(e) => updateParam('fecha_desde', e.target.value || null)}
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            className="h-9 w-[140px] text-sm"
            value={currentHasta}
            onChange={(e) => updateParam('fecha_hasta', e.target.value || null)}
          />
        </div>

        <div className="flex-1" />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll(['notas-search'])}
            className="text-muted-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
