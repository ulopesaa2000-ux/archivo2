// app/(admin)/inventario/stock/ConteoFisicoOcrModal.tsx
'use client'

import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Camera,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  ArrowRight,
  Warehouse,
  CloudDownload,
  CloudUpload,
  CheckCheck,
  Replace,
  Eye,
  EyeOff,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react'
import type { BodegaRow } from '@/lib/types/tables'
import type { ImportFilaValida } from '@/modules/inventario/import-actions'
import { usePanZoom, useNativeWheel } from '@/hooks/use-pan-zoom'
import { useConteoFisico } from './_hooks/use-conteo-fisico'
import { ConteoFisicoResumenHojas } from './_components/ConteoFisicoResumenHojas'
import { BarraBuscarReemplazar } from './_components/BarraBuscarReemplazar'
import { ConteoFisicoRow } from './_components/ConteoFisicoRow'
import { BuscadorRapidoFlotante } from './_components/BuscadorRapidoFlotante'
import { VisorHojaLateral } from './_components/VisorHojaLateral'
import { HojasNubeSelectorModal } from './HojasNubeSelectorModal'
import { VisorFotoHojaModal } from './VisorFotoHojaModal'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  onIrAConciliacion: (bodegaId: number, filas: ImportFilaValida[], propuestaDbIds?: string[]) => void
}

export function ConteoFisicoOcrModal({
  open,
  onOpenChange,
  bodegas,
  bodegaActivaId,
  onIrAConciliacion,
}: Props) {
  const [nubeSelectorOpen, setNubeSelectorOpen] = useState(false)

  const visor = usePanZoom({ max: 3, wheel: 'always' })
  const visorRef = useRef<HTMLDivElement | null>(null)
  const tableScrollRef = useRef<HTMLDivElement | null>(null)
  const scrollRafRef = useRef<number | null>(null)
  useNativeWheel(visorRef, visor.handleWheel)

  const cf = useConteoFisico({
    open,
    onOpenChange,
    bodegas,
    bodegaActivaId,
    onIrAConciliacion,
    onResetVisor: visor.reset,
  })

  // Buffer local calibrado (patrón /catalogo) para filtrar la tabla sin trabar al teclear
  const [localFiltro, setLocalFiltro] = useState(cf.filtroTexto)
  const debouncedFiltro = useDebouncedCallback((val: string) => {
    cf.setFiltroTexto(val)
  }, 350)

  useEffect(() => () => debouncedFiltro.cancel(), [debouncedFiltro])

  const submitFiltroNow = (val = localFiltro) => {
    debouncedFiltro.cancel()
    cf.setFiltroTexto(val)
  }

  const handleVerFotoStable = useCallback(
    (url: string) => {
      cf.setFotoVisorUrl(url)
    },
    [cf.setFotoVisorUrl]
  )

  // Atajo Ctrl+H para abrir/cerrar Buscar y Reemplazar estilo Excel
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault()
        cf.setReplaceOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, cf.setReplaceOpen])

  // Auto-detección de hoja visible al hacer scroll en la tabla
  const handleTableScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      const container = tableScrollRef.current
      if (!container) return
      const containerTop = container.getBoundingClientRect().top + 38
      const rows = container.querySelectorAll<HTMLTableRowElement>('tr[data-hoja-id]')
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect()
        if (rect.bottom > containerTop) {
          const hid = rows[i].dataset.hojaId
          if (hid && hid !== cf.activeFotoHojaId) {
            cf.setActiveFotoHojaId(hid)
          }
          break
        }
      }
    })
  }, [cf.activeFotoHojaId, cf.setActiveFotoHojaId])

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [])

  const hojaMap = new Map(cf.hojas.map((h) => [h.id, h]))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[96vw] lg:max-w-[96vw] w-full h-[94vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          {/* PANEL FLOTANTE FIJO DE BUSCADOR RÁPIDO 0MS */}
          <BuscadorRapidoFlotante
            open={cf.buscadorFlotanteAbierto}
            onClose={() => cf.setBuscadorFlotanteAbierto(false)}
            selectedLabel={cf.selectedIndexDisplay}
            searchInputRef={cf.searchInputRef}
            searchTerm={cf.searchTerm}
            searchResults={cf.searchResults}
            isSearching={cf.isSearching}
            isCatalogoReady={cf.isCatalogoReady}
            onSearchChange={cf.handleSearchChange}
            onSelectResult={cf.handleSelectSearchResult}
          />

          {/* HEADER */}
          <div className="px-5 py-3 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <FileSpreadsheet className="size-5 text-blue-600 dark:text-blue-400" />
                Digitalizar Conteo Físico Manuscrito (Multi-Hoja)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Propuestas y candidatos en la misma fila (<kbd className="px-1 border rounded">Enter</kbd> acepta y salta), buscador flotante 0 ms y Buscar/Reemplazar (<kbd className="px-1 border rounded">Ctrl+H</kbd>).
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNubeSelectorOpen(true)}
                className="gap-1.5 text-xs h-8 bg-background border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300"
              >
                <CloudDownload className="size-3.5 text-blue-600" />
                Sincronizar Celular (Nube)
              </Button>

              {cf.hojas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cf.guardandoNube}
                  onClick={cf.handleGuardarBorradorNube}
                  className="gap-1.5 text-xs h-8 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40"
                >
                  {cf.guardandoNube ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="size-3.5 text-emerald-600" />
                  )}
                  Guardar Borrador en Nube
                </Button>
              )}

              {cf.hojas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cf.limpiarTodo}
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8"
                >
                  <Trash2 className="size-3.5" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* CUERPO FLEX: LA TABLA OCUPA EL 100% DEL ESPACIO RESTANTE */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-4 gap-2.5">
            {/* Subida + Resumen (colapsable para despejar todo el modal) */}
            {!cf.resumenColapsado && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch shrink-0">
                <div className="lg:col-span-3 p-2.5 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col items-center justify-center text-center gap-1.5">
                  <input
                    type="file"
                    ref={cf.fileInputRef}
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => cf.procesarArchivos(e.target.files)}
                  />
                  <input
                    type="file"
                    ref={cf.cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => cf.procesarArchivos(e.target.files)}
                  />
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button
                      size="sm"
                      disabled={cf.procesando}
                      onClick={() => cf.fileInputRef.current?.click()}
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                    >
                      <Upload className="size-3.5" />
                      Subir hojas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cf.procesando}
                      onClick={() => cf.cameraInputRef.current?.click()}
                      className="gap-1.5 border-blue-300 h-8 text-xs bg-background"
                    >
                      <Camera className="size-3.5 text-blue-600" />
                      Cámara
                    </Button>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    2 columnas + aritmética (1.1 / 4+2).
                  </span>
                </div>

                <div className="lg:col-span-9">
                  <ConteoFisicoResumenHojas
                    hojas={cf.hojas}
                    resumenGlobal={cf.resumenGlobal}
                    activeFotoHojaId={cf.activeFotoHojaId}
                    onSelectHojaFoto={(hojaId, url) => {
                      cf.setActiveFotoHojaId(hojaId)
                      if (url) cf.setFotoVisorUrl(url)
                    }}
                  />
                </div>
              </div>
            )}

            {cf.procesando && (
              <div className="p-2.5 rounded-xl border border-blue-300 bg-blue-100/50 dark:bg-blue-950/40 flex items-center gap-3 animate-pulse shrink-0">
                <RefreshCw className="size-4 animate-spin text-blue-600" />
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  {cf.progresoTexto || 'Digitalizando hojas con IA y cruzando contra catálogo...'}
                </div>
              </div>
            )}

            {cf.hojas.length > 0 ? (
              <>
                {/* Toolbar de filtros y acciones */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/30 rounded-xl border shrink-0">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    <div className="flex items-center gap-1 min-w-[210px] flex-1 max-w-[290px]">
                      <div className="relative flex-1">
                        <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Filtrar renglones (Enter)..."
                          value={localFiltro}
                          onChange={(e) => {
                            const val = e.target.value
                            setLocalFiltro(val)
                            if (!val.trim()) {
                              debouncedFiltro.cancel()
                              cf.setFiltroTexto('')
                            } else if (val.trim().length >= 2) {
                              debouncedFiltro(val)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              submitFiltroNow(e.currentTarget.value)
                            }
                          }}
                          className="pl-8 pr-7 h-8 text-xs bg-background"
                        />
                        {localFiltro && (
                          <button
                            type="button"
                            onClick={() => {
                              debouncedFiltro.cancel()
                              setLocalFiltro('')
                              cf.setFiltroTexto('')
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            title="Limpiar filtro"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => submitFiltroNow()}
                        className="h-8 px-2 text-xs font-semibold shrink-0 bg-background"
                        title="Filtrar tabla ahora"
                      >
                        Buscar
                      </Button>
                    </div>

                    <select
                      value={cf.filtroHoja}
                      onChange={(e) =>
                        cf.setFiltroHoja(e.target.value === 'todas' ? 'todas' : Number(e.target.value))
                      }
                      className="h-8 text-xs rounded-md border border-input bg-background px-2 font-medium"
                    >
                      <option value="todas">Todas las hojas ({cf.hojas.length})</option>
                      {cf.hojas.map((h) => (
                        <option key={h.id} value={h.numero_hoja}>
                          Hoja {h.numero_hoja} ({h.resumen.total_hoja.renglones} reg.)
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 bg-background rounded-md p-0.5 border text-xs">
                      <button
                        type="button"
                        onClick={() => cf.setFiltroEstado('todos')}
                        className={`px-2 py-1 rounded text-xs ${
                          cf.filtroEstado === 'todos'
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Todos ({cf.contadoresFiltro.total})
                      </button>
                      <button
                        type="button"
                        onClick={() => cf.setFiltroEstado('propuestas')}
                        className={`px-2 py-1 rounded text-xs ${
                          cf.filtroEstado === 'propuestas'
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Propuestas ({cf.contadoresFiltro.propuestas})
                      </button>
                      <button
                        type="button"
                        onClick={() => cf.setFiltroEstado('sin_match')}
                        className={`px-2 py-1 rounded text-xs ${
                          cf.filtroEstado === 'sin_match'
                            ? 'bg-destructive text-destructive-foreground font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Sin match ({cf.contadoresFiltro.sinMatch})
                      </button>
                      <button
                        type="button"
                        onClick={() => cf.setFiltroEstado('con_formula')}
                        className={`px-2 py-1 rounded text-xs ${
                          cf.filtroEstado === 'con_formula'
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Fórmulas ({cf.contadoresFiltro.conFormula})
                      </button>
                    </div>

                    {/* Botón Lupa + Rayo para abrir Buscador Rápido Flotante 0ms */}
                    <Button
                      type="button"
                      size="sm"
                      variant={cf.buscadorFlotanteAbierto ? 'default' : 'outline'}
                      onClick={cf.handleToggleBuscadorFlotante}
                      className="h-8 px-2.5 gap-1 text-xs font-bold border-primary/40"
                      title="Buscador Rápido de Catálogo 0ms (panel flotante fijo)"
                    >
                      <Search className="size-3.5" />
                      <Zap className="size-3 text-amber-400 fill-amber-400" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={cf.isSyncingCatalogo}
                      onClick={cf.resincronizarCatalogo}
                      className="gap-1 h-8 text-xs font-semibold"
                    >
                      <RefreshCw className={`size-3.5 ${cf.isSyncingCatalogo ? 'animate-spin' : ''}`} />
                      Sincronizar
                    </Button>

                    {cf.resumenGlobal.propuestasAltas > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={cf.handleAceptarPropuestasAltas}
                        className="gap-1 h-8 text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                      >
                        <CheckCheck className="size-3.5" />
                        Aceptar ≥90% ({cf.resumenGlobal.propuestasAltas})
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      variant={cf.replaceOpen ? 'default' : 'outline'}
                      onClick={() => cf.setReplaceOpen((v) => !v)}
                      className="gap-1 h-8 text-xs font-semibold"
                    >
                      <Replace className="size-3.5" />
                      Buscar y Reemplazar
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant={cf.panelLateralAbierto ? 'secondary' : 'outline'}
                      onClick={() => cf.setPanelLateralAbierto((v) => !v)}
                      className="gap-1 h-8 text-xs font-semibold"
                      title="Mostrar u ocultar panel lateral de Foto de Hoja"
                    >
                      {cf.panelLateralAbierto ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Eye className="size-3.5 text-blue-600" />
                      )}
                      Foto Hoja
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => cf.handleAgregarRenglonManual(cf.hojas[0]?.id || '')}
                      className="gap-1 h-8 text-xs"
                    >
                      <Plus className="size-3.5" />
                      Renglón
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => cf.setResumenColapsado((v) => !v)}
                      className="h-8 px-2 text-xs text-muted-foreground"
                      title={cf.resumenColapsado ? 'Mostrar resumen de hojas' : 'Ocultar resumen para ampliar tabla'}
                    >
                      {cf.resumenColapsado ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronUp className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Barra Buscar y Reemplazar estilo Excel */}
                <div className="shrink-0">
                  <BarraBuscarReemplazar
                    open={cf.replaceOpen}
                    onClose={() => cf.setReplaceOpen(false)}
                    regla={cf.reglaReemplazo}
                    onChangeRegla={cf.setReglaReemplazo}
                    preview={cf.previewReemplazo}
                    previewDesactualizado={cf.previewDesactualizado}
                    sugerencias={cf.sugerenciasReemplazo}
                    canUndo={cf.canUndoReemplazo}
                    onBuscar={cf.handleBuscarReemplazo}
                    onAplicar={cf.handleAplicarReemplazo}
                    onDeshacer={cf.handleDeshacerReemplazo}
                  />
                </div>

                {/* ÁREA PRINCIPAL (100% DEL ALTO RESTANTE): Visor Lateral (opcional) + Separador Vertical + Tabla */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 overflow-hidden">
                  <VisorHojaLateral
                    open={cf.panelLateralAbierto}
                    hojaNumero={cf.activeHojaInfo?.numero_hoja}
                    encabezado={cf.activeHojaInfo?.encabezado}
                    comprobanteUrl={cf.activeComprobanteUrl}
                    visorRef={visorRef}
                    visorTransform={visor.transform}
                    visorDragging={visor.dragging}
                    onZoomOut={visor.zoomOut}
                    onZoomIn={visor.zoomIn}
                    onRotate={visor.rotate}
                    onReset={visor.reset}
                    onExpandirModal={(url) => cf.setFotoVisorUrl(url)}
                    onClose={() => cf.setPanelLateralAbierto(false)}
                    onPointerDown={visor.onPointerDown}
                    onPointerMove={visor.onPointerMove}
                    onPointerUp={visor.onPointerUp}
                    onPointerCancel={visor.onPointerCancel}
                  />

                  {/* Contenedor Tabla + Separador Vertical de Hoja */}
                  <div className="flex-1 min-w-0 min-h-0 flex border rounded-xl overflow-hidden shadow-sm bg-card">
                    {/* Separador vertical indicador de hoja activa */}
                    {cf.activeHojaInfo && (
                      <button
                        type="button"
                        onClick={() => cf.setPanelLateralAbierto((v) => !v)}
                        title={
                          cf.panelLateralAbierto
                            ? 'Ocultar foto lateral'
                            : `Mostrar foto lateral de Hoja ${cf.activeHojaInfo.numero_hoja}`
                        }
                        className="w-7 shrink-0 border-r bg-slate-100 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center py-2 transition-colors select-none"
                      >
                        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300 whitespace-nowrap">
                          HOJA {cf.activeHojaInfo.numero_hoja}
                          {cf.activeHojaInfo.encabezado ? ` · ${cf.activeHojaInfo.encabezado}` : ''}
                        </span>
                      </button>
                    )}

                    {/* Tabla scrollable a 100% de altura/ancho */}
                    <div
                      ref={tableScrollRef}
                      onScroll={handleTableScroll}
                      className="flex-1 min-w-0 min-h-0 overflow-auto"
                    >
                      <table className="w-full text-xs border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-900 border-b">
                          <tr className="text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-2 px-2.5 w-32">Posición</th>
                            <th className="py-2 px-2.5 min-w-[170px]">Código Detectado</th>
                            <th className="py-2 px-2.5 min-w-[300px]">Resolución en Catálogo</th>
                            <th className="py-2 px-2 text-center w-24">Fórmula</th>
                            <th className="py-2 px-2 text-right w-20">Cajas</th>
                            <th className="py-2 px-2 text-center w-16">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {cf.renglonesFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-muted-foreground">
                                No se encontraron renglones con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            cf.renglonesFiltrados.map((r, idx) => {
                              const prevHojaId = idx > 0 ? cf.renglonesFiltrados[idx - 1].hoja_id : null
                              const mostrarSeparadorHoja =
                                cf.filtroHoja === 'todas' && r.hoja_id !== prevHojaId
                              const hojaInfo = hojaMap.get(r.hoja_id)
                              const rowKey = `${r.hoja_id}:${r.id}`
                              const isSelected =
                                cf.selectedTarget?.hojaId === r.hoja_id &&
                                cf.selectedTarget?.renglonId === r.id

                              return (
                                <Fragment key={rowKey}>
                                  {mostrarSeparadorHoja && hojaInfo && (
                                    <tr
                                      data-hoja-id={r.hoja_id}
                                      className="bg-blue-50/70 dark:bg-blue-950/30 border-y border-blue-200 dark:border-blue-900"
                                    >
                                      <td colSpan={6} className="py-1 px-3 text-[11px] font-bold text-blue-800 dark:text-blue-300">
                                        Hoja {hojaInfo.numero_hoja}
                                        {hojaInfo.encabezado ? ` · ${hojaInfo.encabezado}` : ''}
                                        <span className="ml-2 font-normal text-muted-foreground">
                                          (Izq: {hojaInfo.resumen.columna_1.cajas} cajas / Der: {hojaInfo.resumen.columna_2.cajas} cajas)
                                        </span>
                                      </td>
                                    </tr>
                                  )}
                                  <ConteoFisicoRow
                                    row={r}
                                    isSelected={isSelected}
                                    setInputRef={(el) => {
                                      cf.rowInputRefs.current[rowKey] = el
                                    }}
                                    onSelectRow={cf.handleSelectRow}
                                    onCambiarSku={cf.handleCambiarSku}
                                    onBlurSku={cf.handleBlurSku}
                                    onEnterOnRow={cf.handleEnterOnRow}
                                    onAceptarPropuesta={cf.handleAceptarPropuesta}
                                    onSelectCandidato={cf.handleSeleccionarCandidato}
                                    onDesvincularProducto={cf.handleDesvincularProducto}
                                    onOpenSearchForRow={cf.handleOpenSearchForRow}
                                    onCambiarCajas={cf.handleCambiarCajas}
                                    onVerFoto={handleVerFotoStable}
                                    onEliminar={cf.handleEliminarRenglon}
                                  />
                                </Fragment>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <FileSpreadsheet className="size-12 text-muted-foreground/30" />
                <div className="space-y-1">
                  <p className="font-semibold text-base text-foreground">
                    Aún no has cargado ninguna hoja
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Toma una foto con tu cámara, sube fotos de tu libreta o presiona{' '}
                    <strong className="text-blue-600">&quot;Sincronizar Celular (Nube)&quot;</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-5 py-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={cf.hojas.length === 0}
              onClick={cf.descargarReporteExcel}
              className="gap-1.5 h-9 text-xs font-semibold w-full sm:w-auto"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Descargar Reporte Excel (.xlsx)
            </Button>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                  <Warehouse className="size-3.5" />
                  Bodega a comparar:
                </span>
                <select
                  value={cf.bodegaDestinoId}
                  onChange={(e) => cf.setBodegaDestinoId(Number(e.target.value))}
                  className="h-9 text-xs rounded-md border border-input bg-background px-3 font-semibold text-foreground min-w-[180px] w-full sm:w-auto"
                >
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre} {b.ciudad ? `(${b.ciudad})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                disabled={cf.hojas.length === 0}
                onClick={cf.handleContinuarConciliacion}
                className="gap-1.5 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full sm:w-auto"
              >
                Comparar con Bodega
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HojasNubeSelectorModal
        open={nubeSelectorOpen}
        onOpenChange={setNubeSelectorOpen}
        bodegas={bodegas}
        bodegaDefaultId={cf.bodegaDestinoId}
        onHojasSeleccionadas={cf.handleHojasSeleccionadasFromNube}
      />

      <VisorFotoHojaModal
        open={Boolean(cf.fotoVisorUrl)}
        onOpenChange={(op) => {
          if (!op) cf.setFotoVisorUrl(null)
        }}
        fotoUrl={cf.fotoVisorUrl}
      />
    </>
  )
}
