// components/admin/OcrLineasSyncModal.tsx
'use client'

import { useState, useEffect, useTransition, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2, Save, Search, Sparkles,
  ZoomIn, ZoomOut, RotateCw, RotateCcw, ImageIcon, ArrowUpRight, Check, X
} from 'lucide-react'
import { sincronizarLineasOcrAction, actualizarPropuestaOcrLineasAction } from '@/modules/inventario/actions'
import type {
  NotaOcrPropuestaLineRaw, NotaOcrLineaSincronizada, DraftProducto, ProductoBusqueda
} from '@/modules/inventario/types'
import { cn } from '@/lib/utils'

interface OcrLineasSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ocrProposalId?: string
  initialLineas: NotaOcrPropuestaLineRaw[]
  comprobanteUrl?: string | null
  bodegaOrigenId?: number | null
  onApplyToDraft: (newProducts: DraftProducto[], updatedRawLineas: NotaOcrPropuestaLineRaw[]) => void
}

export function OcrLineasSyncModal({
  open,
  onOpenChange,
  ocrProposalId,
  initialLineas,
  comprobanteUrl,
  bodegaOrigenId,
  onApplyToDraft,
}: OcrLineasSyncModalProps) {
  const [lineas, setLineas] = useState<NotaOcrLineaSincronizada[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // ── Controles y Arrastre (Pan) de Imagen ──────────────────
  const [zoomScale, setZoomScale] = useState(1)
  const [rotateDeg, setRotateDeg] = useState(0)
  const [panPos, setPanPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleZoomIn = () => setZoomScale((s) => Math.min(s + 0.25, 3))
  const handleZoomOut = () => setZoomScale((s) => Math.max(s - 0.25, 0.5))
  const handleRotate = () => setRotateDeg((d) => (d + 90) % 360)
  const handleResetZoom = () => {
    setZoomScale(1)
    setRotateDeg(0)
    setPanPos({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPanPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  // ── Buscador Rápido de Productos Fijo sobre Imagen ─────────
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoBusqueda[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchChange = useCallback(async (q: string) => {
    setSearchTerm(q)
    if (q.trim().length < 1) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/inventario/notas/nueva/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Seleccionar producto del buscador rápido
  const handleSelectSearchResult = (prod: ProductoBusqueda) => {
    if (selectedIndex !== null && lineas[selectedIndex]) {
      // Reemplazar la línea seleccionada con el SKU oficial
      setLineas((prev) =>
        prev.map((l, i) =>
          i === selectedIndex
            ? {
                ...l,
                estilo_raw: prod.sku_base,
                producto_id: prod.id,
                producto_sku: prod.sku_base,
                producto_nombre: prod.descripcion ?? prod.nombre ?? '',
                producto_pz_en_caja: prod.pz_en_caja ?? null,
                encontrado: true,
              }
            : l
        )
      )
      setSuccess(`Línea #${selectedIndex + 1} actualizada con ${prod.sku_base}`)
    } else {
      // Agregar como nueva línea
      setLineas((prev) => [
        ...prev,
        {
          index: prev.length,
          estilo_raw: prod.sku_base,
          cantidad_cajas: 1,
          confianza: 1.0,
          producto_id: prod.id,
          producto_sku: prod.sku_base,
          producto_nombre: prod.descripcion ?? prod.nombre ?? '',
          producto_pz_en_caja: prod.pz_en_caja ?? null,
          encontrado: true,
        },
      ])
      setSuccess(`Se agregó ${prod.sku_base} a las líneas.`)
    }

    setSearchTerm('')
    setSearchResults([])
  }

  // Cargar y sincronizar líneas iniciales al abrir
  useEffect(() => {
    if (open) {
      setError(null)
      setSuccess(null)
      setSearchTerm('')
      setSearchResults([])
      setSelectedIndex(null)
      setPanPos({ x: 0, y: 0 })
      setZoomScale(1)
      setRotateDeg(0)

      const mapped: Array<{
        index: number
        estilo_raw: string
        cantidad_cajas: number
        piezas_por_caja?: number | null
        confianza?: number
      }> = (initialLineas || []).map((l, i) => ({
        index: i,
        estilo_raw: l.estilo_raw ?? '',
        cantidad_cajas: l.cantidad_cajas ?? 1,
        piezas_por_caja: l.piezas_por_caja ?? null,
        confianza: l.confianza ?? 0.85,
      }))

      if (mapped.length > 0) {
        setIsSyncing(true)
        sincronizarLineasOcrAction(mapped).then((res) => {
          setIsSyncing(false)
          if (res.success && res.data) {
            setLineas(res.data)
          } else {
            setLineas(
              mapped.map((m) => ({
                ...m,
                confianza: m.confianza ?? 0.85,
                encontrado: false,
              }))
            )
          }
        })
      } else {
        setLineas([])
      }
    }
  }, [open, initialLineas])

  // Re-sincronizar SKUs manualmente
  const handleSync = async () => {
    setError(null)
    setSuccess(null)
    setIsSyncing(true)

    const payload = lineas.map((l, i) => ({
      index: i,
      estilo_raw: l.estilo_raw,
      cantidad_cajas: l.cantidad_cajas,
      piezas_por_caja: l.piezas_por_caja,
      confianza: l.confianza,
    }))

    const res = await sincronizarLineasOcrAction(payload)
    setIsSyncing(false)

    if (res.success && res.data) {
      setLineas(res.data)
      setSuccess('Líneas sincronizadas con Supabase exitosamente.')
    } else {
      setError(res.error ?? 'Error al sincronizar líneas.')
    }
  }

  // Modificar campo de un renglón
  const handleUpdateLine = (index: number, key: keyof NotaOcrLineaSincronizada, value: any) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [key]: value } : l))
    )
  }

  // Agregar un renglón nuevo
  const handleAddLine = () => {
    setLineas((prev) => [
      ...prev,
      {
        index: prev.length,
        estilo_raw: '',
        cantidad_cajas: 1,
        confianza: 1.0,
        encontrado: false,
      },
    ])
    setSelectedIndex(lineas.length)
  }

  // Eliminar un renglón
  const handleRemoveLine = (index: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== index))
    if (selectedIndex === index) setSelectedIndex(null)
  }

  // Guardar y Aplicar al borrador de la nota
  const handleApply = () => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      // 1. Preparar lista raw para actualizar la propuesta en la BD
      const updatedRawLineas: NotaOcrPropuestaLineRaw[] = lineas.map((l) => ({
        estilo_raw: l.estilo_raw,
        cantidad_cajas: l.cantidad_cajas,
        descripcion_raw: l.descripcion_raw ?? l.estilo_raw,
        piezas_por_caja: l.piezas_por_caja ?? null,
        confianza: l.confianza,
      }))

      if (ocrProposalId) {
        const updateRes = await actualizarPropuestaOcrLineasAction(ocrProposalId, updatedRawLineas)
        if (!updateRes.success) {
          setError(`No se pudo actualizar la propuesta OCR en BD: ${updateRes.error}`)
          return
        }
      }

      // 2. Obtener stock para productos encontrados si hay bodega origen
      const draftProducts: DraftProducto[] = []

      for (const line of lineas) {
        if (!line.encontrado || !line.producto_id || !line.producto_sku) continue

        let stockCajas = 0
        let stockPiezas = 0

        if (bodegaOrigenId) {
          try {
            const stockRes = await fetch(
              `/api/inventario/notas/nueva/stock?producto_id=${line.producto_id}&bodega_id=${bodegaOrigenId}`
            )
            if (stockRes.ok) {
              const sData = await stockRes.json()
              stockCajas = sData.cajas ?? 0
              stockPiezas = sData.piezas_sueltas ?? 0
            }
          } catch (err) {
            console.error('Error obteniendo stock:', err)
          }
        }

        draftProducts.push({
          tempId: crypto.randomUUID(),
          producto_id: line.producto_id,
          producto_sku: line.producto_sku,
          producto_nombre: line.producto_nombre ?? null,
          producto_pz_en_caja: line.producto_pz_en_caja ?? null,
          cajas: line.cantidad_cajas,
          piezas_sueltas: 0,
          caja_id: null,
          caja_codigo: null,
          caja_nombre_pack: null,
          stock_origen_cajas: stockCajas,
          stock_origen_piezas: stockPiezas,
        })
      }

      // 3. Notificar al padre y cerrar modal
      onApplyToDraft(draftProducts, updatedRawLineas)
      onOpenChange(false)
    })
  }

  const encontradosCount = lineas.filter((l) => l.encontrado).length
  const totalCajas = lineas.reduce((sum, l) => sum + (l.cantidad_cajas || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[92vw] lg:max-w-[90vw] w-full h-[88vh] flex flex-col rounded-2xl p-5 gap-3">
        {/* Encabezado */}
        <DialogHeader className="pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-black uppercase tracking-tight">
                Editor y Sincronizador de Líneas OCR
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold py-1">
                {encontradosCount} / {lineas.length} SKUs Encontrados
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs font-bold py-1">
                Total Cajas: {totalCajas}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            Inspecciona la foto de la nota física a la izquierda, busca productos similares e interactúa en tiempo real con la lista de renglones resueltos.
          </DialogDescription>
        </DialogHeader>

        {/* Alertas */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-bold shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-bold shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Zona Split principal de 2 Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
          {/* ── COLUMNA IZQUIERDA: Visor de Imagen Fijo + Buscador Rápido de Catálogo ── */}
          <div className="lg:col-span-5 flex flex-col gap-2 overflow-hidden border rounded-xl p-3 bg-muted/20 relative">
            {/* Buscador Rápido de Productos Fijo sobre Imagen */}
            <div className="relative z-30 space-y-1 bg-background/95 backdrop-blur-sm p-2 rounded-xl border shadow-sm shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Search className="h-3.5 w-3.5 text-primary" />
                  Buscador Rápido de Catálogo
                </span>
                {selectedIndex !== null && (
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    Reemplazando Renglón #{selectedIndex + 1}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar por SKU o descripción en catálogo..."
                  className="h-9 pl-8 pr-14 text-xs font-mono font-bold rounded-xl border-muted shadow-sm bg-background"
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSearchChange('')
                        searchInputRef.current?.focus()
                      }}
                      className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Borrar texto de búsqueda"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isSearching && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                </div>
              </div>

              {/* Lista desplegable flotante de resultados del catálogo */}
              {searchResults.length > 0 && (
                <div className="mt-1 bg-background border rounded-xl shadow-xl max-h-[180px] overflow-auto p-1 divide-y">
                  {searchResults.slice(0, 10).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(prod)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left transition-colors text-xs group"
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-mono font-bold text-primary group-hover:underline">
                          {prod.sku_base}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {prod.descripcion ?? prod.nombre}
                        </span>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px] font-mono">
                        {prod.pz_en_caja ?? '?'} pz/caja
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {searchTerm.trim().length >= 1 && !isSearching && searchResults.length === 0 && (
                <div className="p-2 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl mt-1">
                  No se encontraron SKUs en catálogo con "{searchTerm}"
                </div>
              )}
            </div>

            {/* Controles de Imagen */}
            <div className="flex items-center justify-between bg-background border rounded-lg px-2 py-1 z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Foto Física de Nota
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={handleZoomOut}
                  title="Alejar"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={handleZoomIn}
                  title="Acercar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={handleRotate}
                  title="Rotar 90°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  onClick={handleResetZoom}
                  title="Restaurar"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                {comprobanteUrl && (
                  <a
                    href={comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    title="Ver en pestaña nueva"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Contenedor de la Imagen con Zoom/Pan Fijo */}
            <div className="flex-1 relative border rounded-lg bg-zinc-950/40 overflow-hidden flex items-center justify-center min-h-[220px]">
              {comprobanteUrl ? (
                <div
                  className="w-full h-full flex items-center justify-center p-2 select-none overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                >
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante OCR"
                    draggable={false}
                    className="max-w-full max-h-full object-contain rounded select-none shadow-2xl transition-transform duration-75"
                    style={{
                      transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale}) rotate(${rotateDeg}deg)`,
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-xs font-bold">Sin foto adjunta</p>
                  <p className="text-[10px] opacity-70">No se proporcionó la imagen física de la nota</p>
                </div>
              )}
            </div>
          </div>

          {/* ── COLUMNA DERECHA: Tabla de Renglones OCR Editables ── */}
          <div className="lg:col-span-7 flex flex-col gap-2 overflow-hidden">
            {/* Toolbar superior de la tabla */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing || lineas.length === 0}
                  className="h-8 font-bold text-xs uppercase tracking-wider gap-1.5 rounded-xl shadow"
                >
                  {isSyncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Sincronizar SKUs</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-8 text-xs font-bold gap-1 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Línea</span>
                </Button>
              </div>

              {selectedIndex !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIndex(null)}
                  className="h-7 text-[11px] text-muted-foreground"
                >
                  Desmarcar Renglón #{selectedIndex + 1}
                </Button>
              )}
            </div>

            {/* Tabla interactiva scrollable */}
            <div className="flex-1 overflow-auto border rounded-xl shadow-inner min-h-0 bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted border-b text-[11px] font-black uppercase tracking-wider text-muted-foreground z-10">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-[40px]">#</th>
                    <th className="px-2.5 py-2 text-left">Texto OCR Detectado (`estilo_raw`)</th>
                    <th className="px-2.5 py-2 text-center w-[85px]">Cajas</th>
                    <th className="px-2.5 py-2 text-left">SKU Resuelto en BD</th>
                    <th className="px-2.5 py-2 text-center w-[75px]">Conf.</th>
                    <th className="px-2.5 py-2 text-center w-[45px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineas.length > 0 ? (
                    lineas.map((line, idx) => {
                      const isSelected = selectedIndex === idx
                      const confPct = Math.round((line.confianza || 0.8) * 100)
                      const confBadgeColor =
                        confPct >= 90
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                          : confPct >= 75
                          ? 'bg-amber-500/10 text-amber-700 border-amber-300'
                          : 'bg-destructive/10 text-destructive border-destructive/30'

                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={cn(
                            'transition-colors cursor-pointer hover:bg-muted/50',
                            isSelected ? 'bg-primary/10 border-l-4 border-l-primary font-semibold' : '',
                            !line.encontrado && !isSelected ? 'bg-amber-500/5' : ''
                          )}
                        >
                          <td className="px-2.5 py-1.5 text-center font-mono font-bold text-muted-foreground">
                            {idx + 1}
                          </td>

                          {/* Campo editable de estilo_raw */}
                          <td className="px-2.5 py-1.5">
                            <Input
                              value={line.estilo_raw}
                              onChange={(e) => handleUpdateLine(idx, 'estilo_raw', e.target.value)}
                              placeholder="Texto del producto escaneado..."
                              className="h-7 font-mono text-xs font-bold rounded-lg border-muted focus:border-primary bg-background"
                            />
                          </td>

                          {/* Campo editable de cajas */}
                          <td className="px-2.5 py-1.5 text-center">
                            <Input
                              type="number"
                              min="0"
                              value={line.cantidad_cajas}
                              onChange={(e) =>
                                handleUpdateLine(
                                  idx,
                                  'cantidad_cajas',
                                  Math.max(0, parseFloat(e.target.value) || 0)
                                )
                              }
                              className="h-7 w-16 text-center font-mono font-bold text-xs px-1 rounded-lg tabular-nums mx-auto bg-background"
                            />
                          </td>

                          {/* Estado del SKU en Supabase */}
                          <td className="px-2.5 py-1.5">
                            {line.encontrado && line.producto_sku ? (
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 border-emerald-200 text-emerald-800 font-mono font-bold text-xs py-0.5"
                                >
                                  ✓ {line.producto_sku}
                                </Badge>
                                {line.producto_nombre && (
                                  <span
                                    className="text-[10px] text-muted-foreground truncate max-w-[180px]"
                                    title={line.producto_nombre}
                                  >
                                    {line.producto_nombre}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] font-bold uppercase tracking-tight py-0.5 shrink-0"
                                >
                                  ⚠️ No Encontrado
                                </Badge>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedIndex(idx)
                                    handleSearchChange(line.estilo_raw || '')
                                    searchInputRef.current?.focus()
                                  }}
                                  className="h-5 px-1.5 text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border-primary/30 rounded flex items-center gap-1 transition-all shadow-2xs"
                                  title={`Buscar "${line.estilo_raw}" en el catálogo`}
                                >
                                  <Search className="h-2.5 w-2.5 shrink-0" />
                                  <span>Buscar en catálogo</span>
                                </Button>
                              </div>
                            )}
                          </td>

                          {/* Confianza OCR */}
                          <td className="px-2.5 py-1.5 text-center">
                            <Badge
                              variant="outline"
                              className={cn('font-mono font-bold text-[9px] py-0.5', confBadgeColor)}
                            >
                              {confPct}%
                            </Badge>
                          </td>

                          {/* Eliminar renglón */}
                          <td className="px-2.5 py-1.5 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveLine(idx)
                              }}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive rounded-full"
                              title="Eliminar renglón"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground">
                        No hay líneas OCR registradas. Usa "Agregar Línea" o el Buscador Rápido de Catálogo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <DialogFooter className="pt-2 border-t flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-9 px-4 text-xs font-semibold"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={handleApply}
            disabled={isPending || lineas.length === 0}
            className="rounded-xl h-9 px-6 font-bold text-xs uppercase tracking-wider shadow-md gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Aplicar a la Nota</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
