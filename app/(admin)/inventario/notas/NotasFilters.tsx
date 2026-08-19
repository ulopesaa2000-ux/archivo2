// app/(admin)/inventario/notas/NotasFilters.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet'
import { 
  Search, Loader2, X, Filter, ChevronDown, ChevronUp, 
  ArrowUpDown, Check, SlidersHorizontal
} from 'lucide-react'
import {
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

  // Conteo de filtros secundarios activos
  const activeAdvancedCount = [
    currentTipo !== '_all',
    currentCiudad !== '_all',
    currentBodega !== '_all',
    Boolean(currentDesde),
    Boolean(currentHasta),
    currentSortBy !== 'fecha_nota' || currentOrder !== 'desc',
  ].filter(Boolean).length

  // Estado del acordeón de filtros secundarios en desktop
  const [showAdvancedDesktop, setShowAdvancedDesktop] = useState(false)

  // Estado del Bottom Sheet de filtros para móvil
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showMoreFiltersInSheet, setShowMoreFiltersInSheet] = useState(true)

  // Estado del menú desplegable tipo notificación desde el botón flotante
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false)

  // Detector de scroll y visibilidad para el botón flotante en móvil
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScrolledPast, setIsScrolledPast] = useState(false)

  useEffect(() => {
    const target = containerRef.current
    if (!target) return

    // El shell admin hace scroll en el elemento <main>
    const scrollParent = target.closest('main') || window

    const checkScroll = () => {
      const rect = target.getBoundingClientRect()
      // Cuando la parte inferior del bloque de filtros sube por encima del header (~60px)
      setIsScrolledPast(rect.bottom < 65)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const rect = entry.boundingClientRect
        setIsScrolledPast(!entry.isIntersecting && rect.bottom < 65)
      },
      {
        threshold: [0, 0.1, 0.2],
        rootMargin: '-60px 0px 0px 0px',
      }
    )

    observer.observe(target)
    scrollParent.addEventListener('scroll', checkScroll, { passive: true })
    checkScroll()

    return () => {
      observer.disconnect()
      scrollParent.removeEventListener('scroll', checkScroll)
    }
  }, [])

  // Abrir automáticamente si hay algún filtro secundario activo en desktop
  useEffect(() => {
    if (activeAdvancedCount > 0) {
      setShowAdvancedDesktop(true)
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
    <>
      {/* ── Botón Cuadradito Flotante Superior Izquierdo (Aparece solo al hacer Scroll en Móvil) ── */}
      {isScrolledPast && (
        <div className="fixed top-[62px] left-3 z-40 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <Button
            type="button"
            onClick={() => setIsFloatingMenuOpen(!isFloatingMenuOpen)}
            className="h-10 w-10 p-0 rounded-xl bg-background/95 backdrop-blur-md border border-primary/40 text-primary shadow-xl shadow-black/20 flex items-center justify-center relative active:scale-95 transition-all hover:bg-background"
            title="Filtros rápidos"
          >
            <Filter className="h-4 w-4 text-primary" />
            {activeAdvancedCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground px-1 shadow-xs">
                {activeAdvancedCount}
              </span>
            )}
          </Button>

          {/* Menú Desplegable Extendido Tipo Notificación */}
          {isFloatingMenuOpen && (
            <div className="absolute top-12 left-0 w-[calc(100vw-24px)] max-w-xs sm:max-w-sm bg-background/98 backdrop-blur-lg border border-border/80 rounded-2xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              {/* Fila 1: Buscador rápido + cerrar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nota o SKU..."
                    defaultValue={currentQ}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-8 h-8 text-xs rounded-xl"
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFloatingMenuOpen(false)}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Fila 2: Píldoras rápidas */}
              <div className="grid grid-cols-3 gap-1">
                <Button
                  type="button"
                  variant={currentEstado === '_all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-[11px] px-1 rounded-xl font-bold truncate justify-center"
                  onClick={() => updateParam('estado_codigo', null)}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant={currentEstado === 'PEND' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-[11px] px-1 rounded-xl font-bold truncate justify-center ${
                    currentEstado === 'PEND'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-600 border-amber-500/30'
                  }`}
                  onClick={() => updateParam('estado_codigo', 'PEND')}
                >
                  ⚡ Pendiente
                </Button>
                <Button
                  type="button"
                  variant={currentEstado === 'CONF' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 text-[11px] px-1 rounded-xl font-bold truncate justify-center ${
                    currentEstado === 'CONF'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-600 border-emerald-500/30'
                  }`}
                  onClick={() => updateParam('estado_codigo', 'CONF')}
                >
                  ✅ Confirmada
                </Button>
              </div>

              {/* Fila 3: Botón para abrir el panel completo avanzado */}
              <div className="pt-2 border-t flex items-center justify-between gap-2">
                {hasFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAll(['notas-search'])}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive px-2"
                  >
                    Limpiar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsFloatingMenuOpen(false)
                    setIsSheetOpen(true)
                  }}
                  className="h-8 text-xs font-bold text-primary gap-1 ml-auto rounded-xl border-primary/30"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Más Filtros (Bodega, Fechas...)</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bloque Principal de Filtros ── */}
      <div 
        ref={containerRef}
        className={`space-y-3 p-3 sm:p-4 bg-card border border-border/60 rounded-2xl shadow-xs transition-opacity ${isPending ? 'opacity-70' : ''}`}
      >
        {/* Fila 1: Buscador + Botón de Filtros */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="notas-search"
              placeholder="Buscar por número de nota..."
              defaultValue={currentQ}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-10 text-xs sm:text-sm bg-background/50 border-muted rounded-xl"
            />
            {isPending && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Botón de Filtros Avanzados */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Versión Móvil: Botón Cuadradito con Ícono de Filtro */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSheetOpen(true)}
              className="h-10 w-10 p-0 md:hidden rounded-xl border-border shadow-xs relative flex items-center justify-center"
              title="Filtros avanzados"
            >
              <Filter className="h-4 w-4 text-primary" />
              {activeAdvancedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground px-1 shadow-xs">
                  {activeAdvancedCount}
                </span>
              )}
            </Button>

            {/* Versión Desktop: Alterna Acordeón */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedDesktop(!showAdvancedDesktop)}
              className="h-10 px-3.5 hidden md:flex items-center gap-2 rounded-xl text-xs font-bold border-border shadow-xs"
            >
              <Filter className="h-4 w-4 text-primary" />
              <span>Filtros</span>
              {activeAdvancedCount > 0 && (
                <Badge variant="default" className="h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground font-black rounded-full">
                  {activeAdvancedCount}
                </Badge>
              )}
              {showAdvancedDesktop ? (
                <ChevronUp className="h-4 w-4 ml-0.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-0.5 text-muted-foreground" />
              )}
            </Button>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAll(['notas-search'])}
                className="h-10 px-2 sm:px-3 text-xs text-muted-foreground hover:text-destructive shrink-0 rounded-xl"
                title="Limpiar todos los filtros"
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Fila 2: Píldoras de Filtro Rápido de Estado */}
        <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:w-auto">
          <Button
            type="button"
            variant={currentEstado === '_all' ? 'default' : 'outline'}
            size="sm"
            className="h-9 text-xs px-2 sm:px-3 justify-center rounded-xl font-bold"
            onClick={() => updateParam('estado_codigo', null)}
          >
            Todas
          </Button>
          <Button
            type="button"
            variant={currentEstado === 'PEND' ? 'default' : 'outline'}
            size="sm"
            className={`h-9 text-xs px-2 sm:px-3 justify-center font-bold rounded-xl ${
              currentEstado === 'PEND'
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-xs'
                : 'text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10'
            }`}
            onClick={() => updateParam('estado_codigo', 'PEND')}
          >
            ⚡ Por Confirmar
          </Button>
          <Button
            type="button"
            variant={currentEstado === 'CONF' ? 'default' : 'outline'}
            size="sm"
            className={`h-9 text-xs px-2 sm:px-3 justify-center font-bold rounded-xl ${
              currentEstado === 'CONF'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
            }`}
            onClick={() => updateParam('estado_codigo', 'CONF')}
          >
            ✅ Confirmadas
          </Button>
        </div>

        {/* ── Acordeón de Filtros Secundarios en Desktop ── */}
        {showAdvancedDesktop && (
          <div className="hidden md:grid pt-3 border-t border-border/50 grid-cols-2 md:grid-cols-5 lg:flex lg:flex-wrap items-center gap-3 animate-in fade-in-50 slide-in-from-top-1 duration-200">
            {/* Ordenar por */}
            <div className="space-y-1 sm:space-y-0">
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
                <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs font-medium rounded-xl">
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
              <Select
                value={currentTipo}
                onValueChange={(v) => updateParam('tipo_movimiento_id', v === '_all' ? null : v)}
              >
                <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs rounded-xl">
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

            {/* Ciudad */}
            <div className="space-y-1 sm:space-y-0">
              <Select
                value={currentCiudad}
                onValueChange={(v) => handleCiudadChange(v || '_all')}
              >
                <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs rounded-xl">
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
              <Select
                value={currentBodega}
                onValueChange={(v) => updateParam('bodega_origen_id', v === '_all' ? null : v)}
              >
                <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs rounded-xl">
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
                className="h-9 text-xs rounded-xl"
                value={currentDesde}
                onChange={(e) => updateParam('fecha_desde', e.target.value || null)}
                title="Fecha inicial"
              />
              <Input
                type="date"
                className="h-9 text-xs rounded-xl"
                value={currentHasta}
                onChange={(e) => updateParam('fecha_hasta', e.target.value || null)}
                title="Fecha final"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Sheet Interactivo para Móvil ── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-3xl max-h-[85vh] p-5 overflow-y-auto bg-background/98 backdrop-blur border-t border-border shadow-2xl flex flex-col gap-4"
        >
          <SheetHeader className="pb-2 border-b">
            <SheetTitle className="text-base font-extrabold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Filtrar Notas de Inventario
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Ajusta los filtros de búsqueda, estado, bodega o fechas.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-1 flex-1 overflow-y-auto">
            {/* 1. Buscador dentro del Sheet */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Número de Nota o Folio</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ej: N-20260818-0069"
                  defaultValue={currentQ}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-10 text-sm rounded-xl"
                />
              </div>
            </div>

            {/* 2. Píldoras de Estado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado de la Nota</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={currentEstado === '_all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 text-xs font-bold rounded-xl"
                  onClick={() => updateParam('estado_codigo', null)}
                >
                  Todas
                </Button>
                <Button
                  type="button"
                  variant={currentEstado === 'PEND' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-10 text-xs font-bold rounded-xl ${
                    currentEstado === 'PEND'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-600 border-amber-500/30'
                  }`}
                  onClick={() => updateParam('estado_codigo', 'PEND')}
                >
                  ⚡ Pendiente
                </Button>
                <Button
                  type="button"
                  variant={currentEstado === 'CONF' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-10 text-xs font-bold rounded-xl ${
                    currentEstado === 'CONF'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-600 border-emerald-500/30'
                  }`}
                  onClick={() => updateParam('estado_codigo', 'CONF')}
                >
                  ✅ Confirmada
                </Button>
              </div>
            </div>

            {/* 3. Acordeón Desplegable para Demás Filtros */}
            <div className="border rounded-2xl p-3.5 bg-muted/20 space-y-3">
              <button
                type="button"
                onClick={() => setShowMoreFiltersInSheet(!showMoreFiltersInSheet)}
                className="flex items-center justify-between w-full text-xs font-extrabold text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span>Filtros Detallados (Bodega, Tipo, Fechas)</span>
                  {activeAdvancedCount > 0 && (
                    <Badge variant="default" className="h-4 px-1.5 text-[9px] bg-primary text-primary-foreground font-bold">
                      {activeAdvancedCount}
                    </Badge>
                  )}
                </div>
                {showMoreFiltersInSheet ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showMoreFiltersInSheet && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  {/* Tipo de Movimiento */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Tipo de Movimiento</label>
                    <Select
                      value={currentTipo}
                      onValueChange={(v) => updateParam('tipo_movimiento_id', v === '_all' ? null : v)}
                    >
                      <SelectTrigger className="w-full h-10 text-xs rounded-xl">
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
                            <span className="mr-1.5">{TIPO_MOVIMIENTO_ICONS[t.codigo] ?? ''}</span>
                            {t.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ciudad */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Ciudad / Zona</label>
                    <Select
                      value={currentCiudad}
                      onValueChange={(v) => handleCiudadChange(v || '_all')}
                    >
                      <SelectTrigger className="w-full h-10 text-xs rounded-xl">
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

                  {/* Bodega de Origen */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Bodega Origen</label>
                    <Select
                      value={currentBodega}
                      onValueChange={(v) => updateParam('bodega_origen_id', v === '_all' ? null : v)}
                    >
                      <SelectTrigger className="w-full h-10 text-xs rounded-xl">
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

                  {/* Rango de Fechas */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Rango de Fechas</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Desde</span>
                        <Input
                          type="date"
                          className="h-10 text-xs rounded-xl mt-0.5"
                          value={currentDesde}
                          onChange={(e) => updateParam('fecha_desde', e.target.value || null)}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Hasta</span>
                        <Input
                          type="date"
                          className="h-10 text-xs rounded-xl mt-0.5"
                          value={currentHasta}
                          onChange={(e) => updateParam('fecha_hasta', e.target.value || null)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ordenamiento */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Ordenar por</label>
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
                      <SelectTrigger className="w-full h-10 text-xs font-medium rounded-xl">
                        <div className="flex items-center gap-1.5 truncate">
                          <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">
                            {currentSortBy === 'fecha_nota' && currentOrder === 'desc'
                              ? '📅 Fecha (Más reciente primero)'
                              : currentSortBy === 'fecha_nota' && currentOrder === 'asc'
                              ? '📅 Fecha (Más antigua primero)'
                              : currentSortBy === 'numero_nota' && currentOrder === 'asc'
                              ? '🔢 N° Nota (A - Z)'
                              : currentSortBy === 'numero_nota' && currentOrder === 'desc'
                              ? '🔢 N° Nota (Z - A)'
                              : currentSortBy === 'costo_total'
                              ? '💰 Costo (Mayor a menor)'
                              : currentSortBy === 'total_cajas'
                              ? '📦 Cajas (Mayor a menor)'
                              : 'Ordenar por...'}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fecha_nota-desc">📅 Fecha (Más reciente primero)</SelectItem>
                        <SelectItem value="fecha_nota-asc">📅 Fecha (Más antigua primero)</SelectItem>
                        <SelectItem value="numero_nota-asc">🔢 N° Nota (A - Z)</SelectItem>
                        <SelectItem value="numero_nota-desc">🔢 N° Nota (Z - A)</SelectItem>
                        <SelectItem value="costo_total-desc">💰 Costo (Mayor a menor)</SelectItem>
                        <SelectItem value="total_cajas-desc">📦 Cajas (Mayor a menor)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acciones Finales del Bottom Sheet */}
          <div className="pt-3 border-t flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                clearAll(['notas-search'])
              }}
              className="flex-1 h-11 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1.5" />
              Limpiar Todo
            </Button>

            <Button
              type="button"
              onClick={() => setIsSheetOpen(false)}
              className="flex-1 h-11 rounded-xl font-bold uppercase tracking-wider text-xs bg-primary text-primary-foreground shadow-md gap-1.5"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              Aceptar / Ver Resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
