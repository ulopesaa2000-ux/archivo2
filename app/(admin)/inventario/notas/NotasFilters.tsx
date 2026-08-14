// app/(admin)/inventario/notas/NotasFilters.tsx
'use client'

import { useState, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { Search, Loader2, X, Filter, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
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
  const currentSortBy  = searchParam('sort_by', 'fecha_nota')
  const currentOrder   = searchParam('order', 'desc')

  // Conteo de filtros secundarios activos (excluyendo q y estado_codigo si es PEND/CONF)
  const activeAdvancedCount = [
    currentTipo !== '_all',
    currentCiudad !== '_all',
    currentBodega !== '_all',
    Boolean(currentDesde),
    Boolean(currentHasta),
    currentSortBy !== 'fecha_nota' || currentOrder !== 'desc',
  ].filter(Boolean).length

  // Estado del acordeón de filtros secundarios
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Abrir automáticamente si hay algún filtro secundario activo
  useEffect(() => {
    if (activeAdvancedCount > 0) {
      setShowAdvanced(true)
    }
  }, [activeAdvancedCount])

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
    <div className={`space-y-3 p-3.5 bg-card border border-border/60 rounded-xl shadow-xs ${isPending ? 'opacity-70' : ''}`}>
      {/* 1. Buscador horizontal de ancho completo */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="notas-search"
          placeholder="Buscar por número de nota..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10 h-10 text-sm bg-background/50 border-muted"
        />
        {isPending && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* 2. Barra de Control Móvil / Escritorio: Píldoras de Estado + Botón Desplegar Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Píldoras de Filtro Rápido (3 columnas iguales en móviles) */}
        <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:w-auto">
          <Button
            variant={currentEstado === '_all' ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs px-2 sm:px-3 justify-center"
            onClick={() => updateParam('estado_codigo', null)}
          >
            Todas
          </Button>
          <Button
            variant={currentEstado === 'PEND' ? 'default' : 'outline'}
            size="sm"
            className={`h-9 text-xs px-2 sm:px-3 justify-center font-semibold ${
              currentEstado === 'PEND'
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                : 'text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
            }`}
            onClick={() => updateParam('estado_codigo', 'PEND')}
          >
            ⚡ Por Confirmar
          </Button>
          <Button
            variant={currentEstado === 'CONF' ? 'default' : 'outline'}
            size="sm"
            className={`h-9 text-xs px-2 sm:px-3 justify-center font-semibold ${
              currentEstado === 'CONF'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
            }`}
            onClick={() => updateParam('estado_codigo', 'CONF')}
          >
            ✅ Confirmadas
          </Button>
        </div>

        {/* Botón para Desplegar / Plegar Filtros Avanzados */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="h-9 text-xs w-full sm:w-auto flex items-center justify-center gap-1.5 border-dashed"
          >
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Filtros</span>
            {activeAdvancedCount > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary">
                {activeAdvancedCount}
              </Badge>
            )}
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4 ml-1 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-1 text-muted-foreground" />
            )}
          </Button>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAll(['notas-search'])}
              className="h-9 text-xs text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* 3. Panel Desplegable de Filtros Secundarios (Plegable con Chevron) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:flex lg:flex-wrap items-center gap-3 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          {/* Ordenar por */}
          <div className="space-y-1 sm:space-y-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block sm:hidden">Ordenar por</span>
            <Select
              value={`${currentSortBy}-${currentOrder}`}
              onValueChange={(val) => {
                if (!val) return
                const [sb, ord] = val.split('-')
                if (sb === 'fecha_nota' && ord === 'desc') {
                  updateParam('sort_by', null)
                  updateParam('order', null)
                } else {
                  updateParam('sort_by', sb)
                  updateParam('order', ord)
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs font-medium">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {currentSortBy === 'fecha_nota' && currentOrder === 'desc'
                      ? '📅 Fecha (Más reciente)'
                      : currentSortBy === 'fecha_nota' && currentOrder === 'asc'
                      ? '📅 Fecha (Más antigua)'
                      : currentSortBy === 'numero_nota' && currentOrder === 'asc'
                      ? '🔢 N° Nota (A-Z)'
                      : currentSortBy === 'numero_nota' && currentOrder === 'desc'
                      ? '🔢 N° Nota (Z-A)'
                      : currentSortBy === 'bodega_origen_nombre'
                      ? '🏬 Bodega Origen'
                      : currentSortBy === 'estado_codigo'
                      ? '⚡ Estado'
                      : currentSortBy === 'costo_total'
                      ? '💰 Costo Total'
                      : currentSortBy === 'total_cajas'
                      ? '📦 Total Cajas'
                      : 'Ordenar por...'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fecha_nota-desc">📅 Fecha (Más reciente primero)</SelectItem>
                <SelectItem value="fecha_nota-asc">📅 Fecha (Más antigua primero)</SelectItem>
                <SelectItem value="numero_nota-asc">🔢 N° Nota (A - Z)</SelectItem>
                <SelectItem value="numero_nota-desc">🔢 N° Nota (Z - A)</SelectItem>
                <SelectItem value="bodega_origen_nombre-asc">🏬 Bodega Origen (A - Z)</SelectItem>
                <SelectItem value="estado_codigo-asc">⚡ Estado</SelectItem>
                <SelectItem value="costo_total-desc">💰 Costo (Mayor a menor)</SelectItem>
                <SelectItem value="total_cajas-desc">📦 Cajas (Mayor a menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo Movimiento */}
          <div className="space-y-1 sm:space-y-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block sm:hidden">Tipo Movimiento</span>
            <Select
              value={currentTipo}
              onValueChange={(v) => updateParam('tipo_movimiento_id', v === '_all' ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
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
          </div>

          {/* Estado Específico */}
          <div className="space-y-1 sm:space-y-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block sm:hidden">Estado</span>
            <Select
              value={currentEstado}
              onValueChange={(v) => updateParam('estado_codigo', v === '_all' ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
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
          </div>

          {/* Ciudad */}
          <div className="space-y-1 sm:space-y-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block sm:hidden">Ciudad</span>
            <Select
              value={currentCiudad}
              onValueChange={(v) => handleCiudadChange(v || '_all')}
            >
              <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
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
          </div>

          {/* Bodega Origen */}
          <div className="space-y-1 sm:space-y-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block sm:hidden">Bodega</span>
            <Select
              value={currentBodega}
              onValueChange={(v) => updateParam('bodega_origen_id', v === '_all' ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs">
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
          </div>

          {/* Fechas Desde / Hasta */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto items-center">
            <Input
              type="date"
              className="h-9 text-xs"
              value={currentDesde}
              onChange={(e) => updateParam('fecha_desde', e.target.value || null)}
              title="Fecha inicial"
            />
            <Input
              type="date"
              className="h-9 text-xs"
              value={currentHasta}
              onChange={(e) => updateParam('fecha_hasta', e.target.value || null)}
              title="Fecha final"
            />
          </div>
        </div>
      )}
    </div>
  )
}
