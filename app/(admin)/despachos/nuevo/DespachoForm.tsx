// app/(admin)/despachos/nuevo/DespachoForm.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { ADMIN_ROUTES } from '@/lib/constants'
import {
  ArrowLeft, Plus, Minus, Trash2, Loader2, Truck, AlertCircle, Check,
  Search, X, CheckCheck, RotateCcw, Package,
} from 'lucide-react'
import { crearDespachoAction, fetchStockVirtualAction } from '@/modules/despachos/actions'
import type { BodegaRow } from '@/lib/types/tables'
import type { StockVirtualItem } from '@/modules/despachos/types'

type ProductoSeleccionado = {
  producto_id: number
  sku: string
  nombre: string
  cajas: number
}

export function DespachoForm({
  bodegasVirtuales, bodegasFisicas, origenId,
}: {
  bodegasVirtuales: BodegaRow[]
  bodegasFisicas: BodegaRow[]
  origenId?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingStock, setLoadingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selecciones
  const [bodegaOrigenId, setBodegaOrigenId] = useState<number | null>(origenId ?? null)
  const [bodegaDestinoId, setBodegaDestinoId] = useState<number | null>(null)
  const [stock, setStock] = useState<StockVirtualItem[]>([])
  const [productos, setProductos] = useState<ProductoSeleccionado[]>([])
  const [vehiculo, setVehiculo] = useState('')
  const [chofer, setChofer] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  // Buscador y filtro rápido de stock
  const [busquedaStock, setBusquedaStock] = useState('')
  const [ocultarAgregados, setOcultarAgregados] = useState(false)
  const cajasInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const focusAndSelectCajas = (productoId: number) => {
    const el = cajasInputRefs.current[productoId]
    if (!el) return
    el.focus()
    requestAnimationFrame(() => el.select())
  }

  const handleBodegaChange = async (id: number) => {
    setBodegaOrigenId(id)
    setProductos([])
    setBusquedaStock('')
    setLoadingStock(true)
    try {
      const items = await fetchStockVirtualAction(id)
      setStock(items)
    } finally {
      setLoadingStock(false)
    }
  }

  useEffect(() => {
    if (origenId) {
      handleBodegaChange(origenId)
    }
  }, [origenId])

  const bodegaOrigenSeleccionada = useMemo(
    () => bodegasVirtuales.find((b) => b.id === bodegaOrigenId) ?? null,
    [bodegasVirtuales, bodegaOrigenId]
  )
  const bodegaDestinoSeleccionada = useMemo(
    () => bodegasFisicas.find((b) => b.id === bodegaDestinoId) ?? null,
    [bodegasFisicas, bodegaDestinoId]
  )

  const seleccionadosMap = useMemo(
    () => new Map(productos.map((p) => [p.producto_id, p])),
    [productos]
  )

  const stockDisponible = useMemo(
    () => stock.filter((s) => s.cajas_disponibles > 0),
    [stock]
  )

  const stockFiltrado = useMemo(() => {
    const q = busquedaStock.trim().toLowerCase()
    return stockDisponible.filter((s) => {
      if (ocultarAgregados && seleccionadosMap.has(s.producto_id)) return false
      if (!q) return true
      const sku = (s.sku_base ?? '').toLowerCase()
      const nombre = (s.producto_descripcion ?? s.producto_nombre ?? '').toLowerCase()
      return sku.includes(q) || nombre.includes(q)
    })
  }, [stockDisponible, busquedaStock, ocultarAgregados, seleccionadosMap])

  const toggleProducto = (item: StockVirtualItem) => {
    if (seleccionadosMap.has(item.producto_id)) {
      setProductos((prev) => prev.filter((p) => p.producto_id !== item.producto_id))
      return
    }
    setProductos((prev) => [
      ...prev,
      {
        producto_id: item.producto_id,
        sku: item.sku_base ?? '?',
        nombre: item.producto_descripcion || item.producto_nombre || '?',
        cajas: item.cajas_disponibles,
      },
    ])
  }

  const agregarVisibles = () => {
    setProductos((prev) => {
      const existing = new Set(prev.map((p) => p.producto_id))
      const nuevos: ProductoSeleccionado[] = []
      for (const item of stockFiltrado) {
        if (!existing.has(item.producto_id)) {
          nuevos.push({
            producto_id: item.producto_id,
            sku: item.sku_base ?? '?',
            nombre: item.producto_descripcion || item.producto_nombre || '?',
            cajas: item.cajas_disponibles,
          })
        }
      }
      return [...prev, ...nuevos]
    })
  }

  const updateCajas = (productoId: number, maxDisp: number, cajas: number) => {
    const clamped = Math.max(0, Math.min(maxDisp, cajas))
    setProductos((prev) =>
      prev.map((p) => (p.producto_id === productoId ? { ...p, cajas: clamped } : p))
    )
  }

  const removeProducto = (productoId: number) => {
    setProductos((prev) => prev.filter((p) => p.producto_id !== productoId))
  }

  const totalCajasDisponiblesBodega = useMemo(
    () => stockDisponible.reduce((acc, s) => acc + s.cajas_disponibles, 0),
    [stockDisponible]
  )
  const totalCajasADespachar = useMemo(
    () => productos.reduce((acc, p) => acc + (p.cajas || 0), 0),
    [productos]
  )
  const pendientesPorAgregar = useMemo(
    () => stockFiltrado.filter((s) => !seleccionadosMap.has(s.producto_id)).length,
    [stockFiltrado, seleccionadosMap]
  )

  const handleSubmit = () => {
    if (!bodegaOrigenId) { setError('Selecciona bodega origen.'); return }
    if (!bodegaDestinoId) { setError('Selecciona bodega destino.'); return }
    if (productos.length === 0) { setError('Agrega al menos un producto.'); return }
    if (productos.some((p) => p.cajas <= 0)) { setError('Todas las cantidades deben ser mayores a 0.'); return }

    setError(null)
    startTransition(async () => {
      const result = await crearDespachoAction({
        bodega_origen_id: bodegaOrigenId,
        bodega_destino_id: bodegaDestinoId,
        vehiculo_info: vehiculo || undefined,
        chofer: chofer || undefined,
        fecha_programada: fecha,
        productos: productos.map((p) => ({
          producto_id: p.producto_id,
          cantidad_cajas: p.cajas,
        })),
      })

      if (!result.success) { setError(result.error ?? 'Error.'); return }
      router.push(ADMIN_ROUTES.despachos.detalle(result.despacho_id!))
      router.refresh()
    })
  }

  return (
    <TooltipProvider delay={80}>
      <div className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* Selectores de bodega + Datos de transporte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Bodega origen (virtual)</Label>
            <Select
              value={bodegaOrigenId ? String(bodegaOrigenId) : ''}
              onValueChange={(v) => { if (v) handleBodegaChange(parseInt(v, 10)) }}
            >
              <SelectTrigger className="w-full">
                <span className="truncate">
                  {bodegaOrigenSeleccionada
                    ? `${bodegaOrigenSeleccionada.nombre} (${bodegaOrigenSeleccionada.codigo})`
                    : 'Seleccionar bodega virtual...'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {bodegasVirtuales.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.nombre} ({b.codigo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Bodega destino (física)</Label>
            <Select
              value={bodegaDestinoId ? String(bodegaDestinoId) : ''}
              onValueChange={(v) => { if (v) setBodegaDestinoId(parseInt(v, 10)) }}
            >
              <SelectTrigger className="w-full">
                <span className="truncate">
                  {bodegaDestinoSeleccionada
                    ? `${bodegaDestinoSeleccionada.nombre} (${bodegaDestinoSeleccionada.codigo})`
                    : 'Seleccionar bodega física...'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {bodegasFisicas.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.nombre} ({b.codigo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {bodegaOrigenId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Vehículo</Label>
              <Input value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} placeholder="Ej: Camión 3.5t" />
            </div>
            <div className="space-y-1.5">
              <Label>Chofer</Label>
              <Input value={chofer} onChange={(e) => setChofer(e.target.value)} placeholder="Nombre del chofer" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha programada</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
        )}

        {/* SECCIÓN 1: STOCK DISPONIBLE EN BODEGA VIRTUAL (3 COLUMNAS) */}
        {bodegaOrigenId && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span>Stock disponible en {bodegaOrigenSeleccionada?.nombre ?? 'bodega virtual'}</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stockDisponible.length} SKUs · {totalCajasDisponiblesBodega} cajas
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clic en la cápsula para agregar todas sus cajas disponibles. Desliza el mouse sobre la descripción para verla completa.
                </p>
              </div>

              {stockDisponible.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={ocultarAgregados ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setOcultarAgregados((v) => !v)}
                  >
                    {ocultarAgregados ? 'Mostrando solo pendientes' : 'Ocultar ya agregados'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={pendientesPorAgregar === 0}
                    onClick={agregarVisibles}
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                    {busquedaStock.trim()
                      ? `Agregar filtrados (${pendientesPorAgregar})`
                      : `Agregar todo (${pendientesPorAgregar})`}
                  </Button>
                </div>
              )}
            </div>

            {/* Buscador rápido */}
            {stockDisponible.length > 0 && (
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={busquedaStock}
                  onChange={(e) => setBusquedaStock(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const firstPending = stockFiltrado.find((s) => !seleccionadosMap.has(s.producto_id))
                      if (firstPending) toggleProducto(firstPending)
                    }
                  }}
                  placeholder="Buscar rápido por SKU o descripción... (Enter agrega el primer resultado)"
                  className="pl-9 pr-9 h-9 text-sm"
                />
                {busquedaStock && (
                  <button
                    type="button"
                    onClick={() => setBusquedaStock('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {loadingStock ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Consultando stock de la bodega virtual...</span>
              </div>
            ) : stockDisponible.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No hay stock disponible en esta bodega virtual.
              </p>
            ) : stockFiltrado.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No hay productos que coincidan con el filtro actual.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {stockFiltrado.map((s) => {
                  const seleccionado = seleccionadosMap.get(s.producto_id)
                  const added = Boolean(seleccionado)
                  const desc = s.producto_descripcion || s.producto_nombre || 'Sin descripción'

                  return (
                    <button
                      key={s.producto_id}
                      type="button"
                      onClick={() => toggleProducto(s)}
                      className={`group flex items-stretch justify-between gap-2.5 rounded-xl border p-2 text-left transition-all ${
                        added
                          ? 'border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/15 shadow-xs'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-accent/40'
                      }`}
                    >
                      {/* 1. SKU EN GRANDE A LO ALTO DE LA CÁPSULA */}
                      <div
                        className={`flex flex-col justify-center rounded-lg px-2.5 py-1.5 shrink-0 border transition-colors ${
                          added
                            ? 'border-emerald-500/40 bg-emerald-500/15'
                            : 'border-border/70 bg-muted/60 group-hover:border-primary/30'
                        }`}
                      >
                        <span className="font-mono text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-none">
                          {s.sku_base}
                        </span>
                        {added && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mt-1 leading-none">
                            ✓ En lista ({seleccionado?.cajas})
                          </span>
                        )}
                      </div>

                      {/* 2. DESCRIPCIÓN EN EL ESPACIO CENTRAL + NUBE FLOTANTE AL HOVER */}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div className="min-w-0 flex-1 flex items-center py-0.5" />
                          }
                        >
                          <p className="text-xs font-medium text-foreground/85 line-clamp-2 leading-snug">
                            {desc}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={8}
                          className="max-w-xs sm:max-w-sm rounded-xl border border-border/40 bg-popover px-3.5 py-2.5 text-popover-foreground shadow-xl"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono text-xs font-extrabold text-primary">
                                {s.sku_base}
                              </span>
                              <span className="font-mono text-xs font-bold tabular-nums text-emerald-500">
                                {s.cajas_disponibles} cajas disp.
                              </span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed text-popover-foreground">
                              {desc}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* 3. CAJAS RESALTADAS + BOTÓN DE ACCIÓN */}
                      <div className="flex items-center gap-2 shrink-0 pl-1">
                        <div
                          className={`flex flex-col items-end justify-center rounded-lg px-2 py-1 ${
                            added ? 'bg-emerald-500/15' : 'bg-primary/10'
                          }`}
                        >
                          <span
                            className={`text-base sm:text-lg font-black tabular-nums leading-none ${
                              added ? 'text-emerald-400' : 'text-foreground'
                            }`}
                          >
                            {s.cajas_disponibles}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5 leading-none">
                            cajas
                          </span>
                        </div>
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                            added
                              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                              : 'border-border bg-muted/40 text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground'
                          }`}
                        >
                          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 2: PRODUCTOS A DESPACHAR (2 COLUMNAS) */}
        {productos.length > 0 && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Productos a despachar ({productos.length})
                </h3>
                <Badge variant="default" className="font-mono text-xs">
                  {totalCajasADespachar} cajas en total
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setProductos([])}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Vaciar lista
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
              {productos.map((p) => {
                const stockItem = stock.find((s) => s.producto_id === p.producto_id)
                const maxDisp = stockItem?.cajas_disponibles ?? 999

                return (
                  <div
                    key={p.producto_id}
                    onClick={() => focusAndSelectCajas(p.producto_id)}
                    className="flex items-stretch justify-between gap-2.5 rounded-xl border bg-background p-2 cursor-pointer transition-colors hover:border-primary/40 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30"
                  >
                    {/* 1. SKU EN GRANDE A LO ALTO DE LA CÁPSULA */}
                    <div className="flex flex-col justify-center rounded-lg border border-border/70 bg-muted/60 px-2.5 py-1.5 shrink-0">
                      <span className="font-mono text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-none">
                        {p.sku}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground tabular-nums mt-1 leading-none">
                        Disp: <strong className="text-foreground">{maxDisp}</strong> cajas
                      </span>
                    </div>

                    {/* 2. DESCRIPCIÓN CENTRAL + NUBE FLOTANTE AL HOVER */}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div className="min-w-0 flex-1 flex items-center py-0.5" />
                        }
                      >
                        <p className="text-xs font-medium text-foreground/85 line-clamp-2 leading-snug">
                          {p.nombre}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={8}
                        className="max-w-xs sm:max-w-sm rounded-xl border border-border/40 bg-popover px-3.5 py-2.5 text-popover-foreground shadow-xl"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-xs font-extrabold text-primary">
                              {p.sku}
                            </span>
                            <span className="font-mono text-xs font-bold tabular-nums text-emerald-500">
                              Despachando {p.cajas} de {maxDisp} cajas
                            </span>
                          </div>
                          <p className="text-xs font-medium leading-relaxed text-popover-foreground">
                            {p.nombre}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* 3. CONTROLES DE CAJAS RESALTADOS */}
                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={p.cajas <= 1}
                        onClick={() => updateCajas(p.producto_id, maxDisp, p.cajas - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        ref={(el) => { cajasInputRefs.current[p.producto_id] = el }}
                        type="text"
                        inputMode="numeric"
                        value={p.cajas === 0 ? '' : String(p.cajas)}
                        onFocus={(e) => {
                          const target = e.currentTarget
                          requestAnimationFrame(() => target.select())
                        }}
                        onClick={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          updateCajas(p.producto_id, maxDisp, raw === '' ? 0 : parseInt(raw, 10))
                        }}
                        onBlur={() => {
                          if (p.cajas <= 0) updateCajas(p.producto_id, maxDisp, 1)
                        }}
                        className="w-16 h-8 text-center tabular-nums text-sm font-extrabold px-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={p.cajas >= maxDisp}
                        onClick={() => updateCajas(p.producto_id, maxDisp, p.cajas + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      {p.cajas < maxDisp && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2 text-[11px] font-semibold"
                          onClick={() => updateCajas(p.producto_id, maxDisp, maxDisp)}
                          title={`Usar máximo disponible (${maxDisp})`}
                        >
                          Máx
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProducto(p.producto_id)}
                        title="Quitar del despacho"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 justify-end pt-2 border-t">
          <Link href={ADMIN_ROUTES.despachos.lista}>
            <Button variant="outline" size="sm"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
          </Link>
          <Button size="sm" onClick={handleSubmit} disabled={isPending || productos.length === 0}>
            {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            <Truck className="h-3.5 w-3.5 mr-1" /> Crear despacho ({totalCajasADespachar} cajas)
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
