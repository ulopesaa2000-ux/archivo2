// app/(admin)/inventario/stock/HojasNubeSelectorModal.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CloudDownload,
  Search,
  Calendar,
  Warehouse,
  CheckCircle2,
  Clock,
  Layers,
  Eye,
  Loader2,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
} from 'lucide-react'
import { fetchHojasConteoPendientesAction } from '@/modules/inventario/conteo-fisico-actions'
import type { HojaConteoFisico } from '@/modules/inventario/conteo-fisico-types'
import type { BodegaRow } from '@/lib/types/tables'
import { formatTimeAgo, formatDateTime } from '@/lib/utils'
import { VisorFotoHojaModal } from './VisorFotoHojaModal'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bodegas: BodegaRow[]
  bodegaDefaultId: number | null
  onHojasSeleccionadas: (hojas: HojaConteoFisico[]) => void
}

export function HojasNubeSelectorModal({
  open,
  onOpenChange,
  bodegas,
  bodegaDefaultId,
  onHojasSeleccionadas,
}: Props) {
  const [hojasNube, setHojasNube] = useState<HojaConteoFisico[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroBodegaId, setFiltroBodegaId] = useState<number | 'todas'>('todas')
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'tres_dias' | 'todas'>('hoy')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [seleccionadasIds, setSeleccionadasIds] = useState<Set<string>>(new Set())

  // Visor de foto en grande dentro del submodal
  const [fotoZoomUrl, setFotoZoomUrl] = useState<string | null>(null)
  const [zoomNivel, setZoomNivel] = useState(1)

  // Cargar hojas desde Supabase al abrir
  const cargarHojas = async () => {
    setLoading(true)
    const res = await fetchHojasConteoPendientesAction(null)
    if (res.success) {
      setHojasNube(res.data.hojas)
      // Seleccionar por defecto las que sean de hoy
      const hoyStr = new Date().toISOString().slice(0, 10)
      const idsHoy = new Set<string>()
      res.data.hojas.forEach((h) => {
        const fechaHoja = h.creado_en ? h.creado_en.slice(0, 10) : ''
        if (fechaHoja === hoyStr) {
          idsHoy.add(h.id)
        }
      })
      setSeleccionadasIds(idsHoy.size > 0 ? idsHoy : new Set(res.data.hojas.map((h) => h.id)))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      cargarHojas()
    } else {
      setHojasNube([])
      setSeleccionadasIds(new Set())
    }
  }, [open])

  // Filtrado de hojas
  const hojasFiltradas = useMemo(() => {
    const ahora = new Date()
    const hoyStr = ahora.toISOString().slice(0, 10)
    const tresDiasAtras = new Date(ahora.getTime() - 3 * 24 * 60 * 60 * 1000)

    return hojasNube.filter((h) => {
      // Filtro de bodega
      if (filtroBodegaId !== 'todas' && h.bodega_origen_id !== filtroBodegaId) {
        return false
      }

      // Filtro de fecha
      if (filtroFecha === 'hoy') {
        const fechaHoja = h.creado_en ? h.creado_en.slice(0, 10) : ''
        if (fechaHoja !== hoyStr) return false
      } else if (filtroFecha === 'tres_dias') {
        if (!h.creado_en || new Date(h.creado_en) < tresDiasAtras) return false
      }

      // Filtro de texto
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase()
        const matchFolio = (h.encabezado || '').toLowerCase().includes(q)
        const matchNum = `hoja ${h.numero_hoja}`.includes(q)
        if (!matchFolio && !matchNum) return false
      }

      return true
    })
  }, [hojasNube, filtroBodegaId, filtroFecha, filtroTexto])

  // Manejo de selecciones
  const toggleSeleccion = (id: string) => {
    setSeleccionadasIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSeleccionarTodasFiltradas = () => {
    setSeleccionadasIds((prev) => {
      const next = new Set(prev)
      hojasFiltradas.forEach((h) => next.add(h.id))
      return next
    })
  }

  const handleDesmarcarTodas = () => {
    setSeleccionadasIds(new Set())
  }

  // Resumen de las hojas seleccionadas
  const resumenSeleccion = useMemo(() => {
    let totalCajas = 0
    let totalRenglones = 0
    let count = 0

    hojasNube.forEach((h) => {
      if (seleccionadasIds.has(h.id)) {
        count++
        totalCajas += h.resumen.total_hoja.cajas
        totalRenglones += h.resumen.total_hoja.renglones
      }
    })

    return { count, totalCajas, totalRenglones }
  }, [hojasNube, seleccionadasIds])

  // Confirmar y pasar a la mesa de trabajo
  const handleConfirmarCarga = () => {
    const seleccionadas = hojasNube.filter((h) => seleccionadasIds.has(h.id))
    if (seleccionadas.length === 0) return
    onHojasSeleccionadas(seleccionadas)
    onOpenChange(false)
  }

  const mapBodegas = useMemo(() => {
    return new Map(bodegas.map((b) => [b.id, b.nombre]))
  }, [bodegas])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* HEADER */}
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CloudDownload className="size-5 text-blue-600" />
              <div>
                <DialogTitle className="text-base font-bold">
                  Hojas de Conteo en la Nube (Subidas desde Celular)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Selecciona qué hojas de la libreta deseas cargar a tu mesa de trabajo actual.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={cargarHojas}
              className="gap-1.5 h-8 text-xs shrink-0"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>

          {/* FILTROS SUPERIORES */}
          <div className="p-3 bg-muted/30 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Filtro Bodega */}
              <div className="flex items-center gap-1.5 bg-background border rounded-md px-2 h-8">
                <Warehouse className="size-3.5 text-muted-foreground" />
                <select
                  value={filtroBodegaId}
                  onChange={(e) =>
                    setFiltroBodegaId(e.target.value === 'todas' ? 'todas' : Number(e.target.value))
                  }
                  className="bg-transparent text-xs font-semibold focus:outline-none"
                >
                  <option value="todas">Todas las bodegas</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Fecha */}
              <div className="flex items-center gap-1 bg-background border rounded-md p-0.5 h-8">
                <button
                  type="button"
                  onClick={() => setFiltroFecha('hoy')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filtroFecha === 'hoy'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Solo Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroFecha('tres_dias')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filtroFecha === 'tres_dias'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Últimos 3 días
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroFecha('todas')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filtroFecha === 'todas'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todas
                </button>
              </div>

              {/* Buscador de texto */}
              <div className="relative min-w-[160px] flex-1 max-w-xs">
                <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar folio o encabezado..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="pl-7 h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Acciones de selección masiva */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSeleccionarTodasFiltradas}
                className="h-7 text-[11px] px-2 text-blue-600 font-semibold"
              >
                Marcar todas
              </Button>
              <span className="text-muted-foreground text-xs">|</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDesmarcarTodas}
                className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
              >
                Desmarcar
              </Button>
            </div>
          </div>

          {/* CUADRÍCULA DE TARJETAS DE HOJAS */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                Cargando hojas pendientes de la nube...
              </div>
            ) : hojasFiltradas.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-2">
                <AlertCircle className="size-8 mx-auto opacity-40" />
                <p className="font-semibold text-sm text-foreground">
                  No se encontraron hojas con los filtros seleccionados
                </p>
                <p className="text-xs max-w-sm mx-auto">
                  Asegúrate de que las fotos tomadas desde el celular hayan terminado de subirse o prueba
                  cambiando el filtro de fecha a "Todas".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {hojasFiltradas.map((h) => {
                  const isChecked = seleccionadasIds.has(h.id)
                  const nombreBodega = h.bodega_origen_id
                    ? mapBodegas.get(h.bodega_origen_id) || 'Bodega'
                    : 'Sin bodega asignada'

                  return (
                    <div
                      key={h.id}
                      onClick={() => toggleSeleccion(h.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative group ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm ring-1 ring-blue-500'
                          : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Checkbox y Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSeleccion(h.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <span className="font-bold text-xs truncate text-foreground">
                            Hoja {h.numero_hoja}
                            {h.encabezado ? ` - ${h.encabezado}` : ''}
                          </span>
                        </div>

                        {h.comprobante_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFotoZoomUrl(h.comprobante_url || null)
                              setZoomNivel(1.5)
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-muted"
                            title="Ver foto de la hoja"
                          >
                            <Eye className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Miniatura y Metadatos */}
                      <div className="flex gap-2.5 items-center">
                        {h.comprobante_url ? (
                          <div className="w-16 h-20 rounded border overflow-hidden bg-slate-900 shrink-0 relative">
                            <img
                              src={h.comprobante_url}
                              alt="Miniatura de hoja"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-20 rounded border bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                            <Layers className="size-5 opacity-40" />
                          </div>
                        )}

                        <div className="space-y-1 text-xs truncate flex-1">
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Warehouse className="size-3 shrink-0" />
                            <span className="truncate font-medium">{nombreBodega}</span>
                          </div>

                          {h.creado_en && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <Clock className="size-3 shrink-0" />
                              <span title={formatDateTime(h.creado_en)}>
                                {formatTimeAgo(h.creado_en)}
                              </span>
                            </div>
                          )}

                          <div className="pt-1">
                            <Badge
                              variant="outline"
                              className="bg-muted text-[10px] font-semibold text-slate-800 dark:text-slate-200"
                            >
                              {h.resumen.total_hoja.cajas} cajas | {h.resumen.total_hoja.renglones} reg.
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Subtotales en dos columnas */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-muted/40 p-1.5 rounded border text-muted-foreground">
                        <div>Izq: <strong className="text-foreground">{h.resumen.columna_1.cajas} cajas</strong></div>
                        <div>Der: <strong className="text-foreground">{h.resumen.columna_2.cajas} cajas</strong></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-3 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {resumenSeleccion.count > 0 ? (
                <span>
                  Seleccionadas: <strong className="text-foreground font-bold">{resumenSeleccion.count} hoja(s)</strong> (
                  {resumenSeleccion.totalCajas} cajas en {resumenSeleccion.totalRenglones} renglones)
                </span>
              ) : (
                <span>Ninguna hoja seleccionada</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={resumenSeleccion.count === 0}
                onClick={handleConfirmarCarga}
                className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Cargar {resumenSeleccion.count} hoja(s) al conteo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VISOR DE FOTO PANTALLA COMPLETA SIN RECORTES */}
      <VisorFotoHojaModal
        open={Boolean(fotoZoomUrl)}
        onOpenChange={(op) => {
          if (!op) setFotoZoomUrl(null)
        }}
        fotoUrl={fotoZoomUrl}
        titulo="Vista previa de hoja de conteo"
      />
    </>
  )
}

