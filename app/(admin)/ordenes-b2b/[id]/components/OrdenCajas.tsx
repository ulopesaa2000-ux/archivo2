// app/(admin)/ordenes-b2b/[id]/components/OrdenCajas.tsx
'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Package, Plus, Link2, Loader2, Search, Trash2, Boxes, CheckCircle2 } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'
import {
  desvincularCajaOrdenAction,
  vincularMultiplesCajasOrdenAction,
  actualizarCantidadCajasOrdenAction,
} from '@/modules/ordenes-b2b/actions'
import { updateCajaCompletaAction, desactivarCajaAction } from '@/modules/cajas/actions'
import { fetchCajasListado } from '@/modules/ordenes-b2b/queries'
import type { CajaDetalleInput } from '@/modules/cajas/actions'
import type { OrdenCajaResuelta, OrdenDetalleResuelto } from '@/modules/ordenes-b2b/types'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'
import { CrearCajaDialog } from '@/components/admin/cajas/CrearCajaDialog'

type CatalogoItem = { id: number; nombre: string; codigo?: string }

type CajaBusquedaItem = {
  id: number
  codigo_caja: string
  nombre_pack: string | null
  producto_sku: string | null
  piezas_por_caja: number | null
  cbm: number | null
}

type CajaSelectionMap = Record<number, { cantidad: string }>
type CajaSeleccionadaFull = CajaBusquedaItem & { cantidad: string }

// Estado persistente entre búsquedas (fuera del componente para mantener entre renders)
let persistentSelectedMap: CajaSelectionMap = {}
let persistentSelectedCajas: Map<number, CajaSeleccionadaFull> = new Map()

function VincularCajaDialog({
  open,
  onOpenChange,
  ordenId,
  linkedCajaIds,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ordenId: number
  linkedCajaIds: number[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<CajaBusquedaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMap, setSelectedMap] = useState<CajaSelectionMap>(persistentSelectedMap)
  const [selectedCajas, setSelectedCajas] = useState<Map<number, CajaSeleccionadaFull>>(persistentSelectedCajas)
  const [vinculando, setVinculando] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const debouncedSearch = useDebouncedCallback(async (q: string, targetPage: number = 1) => {
    setLoading(true)
    try {
      const { items } = await fetchCajasListado({ q: q || undefined })
      setResults(items as CajaBusquedaItem[])
      setPage(targetPage)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, 300)

  const toggleCaja = (cajaId: number, checked: boolean) => {
    setSelectedMap((prev) => {
      const next = { ...prev }
      if (checked) {
        next[cajaId] = next[cajaId] ?? { cantidad: '1' }
      } else {
        delete next[cajaId]
      }
      return next
    })

    setSelectedCajas((prev) => {
      const next = new Map(prev)
      if (checked) {
        const caja = results.find((r) => r.id === cajaId)
        if (caja) {
          next.set(cajaId, { ...caja, cantidad: prev.get(cajaId)?.cantidad ?? '1' })
        }
      } else {
        next.delete(cajaId)
      }
      return next
    })
  }

  const updateCantidad = (cajaId: number, cantidad: string) => {
    setSelectedMap((prev) => ({
      ...prev,
      [cajaId]: { cantidad },
    }))
    setSelectedCajas((prev) => {
      const next = new Map(prev)
      const caja = next.get(cajaId)
      if (caja) {
        next.set(cajaId, { ...caja, cantidad })
      }
      return next
    })
  }

  const totalPages = Math.ceil(results.length / PAGE_SIZE)
  const startIndex = (page - 1) * PAGE_SIZE
  const visibleResults = results.slice(startIndex, startIndex + PAGE_SIZE)
  const selectedRows = Array.from(selectedCajas.values())
  const selectedCount = selectedRows.length

  const handleVincular = async () => {
    const payload = Array.from(selectedCajas.entries()).map(([cajaId, value]) => ({
      caja_id: Number(cajaId),
      cantidad_cajas: Math.max(1, Number.parseInt(value.cantidad || '1', 10) || 1),
    }))

    if (payload.length === 0) return

    setVinculando(true)
    const result = await vincularMultiplesCajasOrdenAction(ordenId, payload)
    setVinculando(false)

    if (result.success) {
      // Limpiar estado persistente al cerrar exitosamente
      persistentSelectedMap = {}
      persistentSelectedCajas = new Map()
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1200px] min-w-[800px] h-[min(90dvh,860px)] min-h-[480px] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Boxes className="h-5 w-5 text-primary" />
            Vincular Cajas a la Orden
          </DialogTitle>
        </DialogHeader>


        {/* ── Barra de búsqueda + badge (compacta) ── */}
        <div className="px-5 py-3 border-b bg-muted/20 shrink-0 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Buscar por código, pack o SKU…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                debouncedSearch(e.target.value)
              }}
            />
          </div>
          <Badge variant="secondary" className="text-xs shrink-0 tabular-nums">
            {selectedCount} sel.
          </Badge>
        </div>

        {/* ── Cuerpo: tabla | panel seleccionadas ── */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">

          {/* Tabla de búsqueda */}
          <div className="flex-1 min-h-0 overflow-auto border-b md:border-b-0 md:border-r">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando…
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-40" />
                <p>{search ? 'Sin resultados para esa búsqueda.' : 'Escribe para buscar cajas.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ minWidth: '480px' }}>
                  <thead className="sticky top-0 bg-background z-10 border-b">
                    <tr className="text-muted-foreground">
                      <th className="w-10 px-3 py-2.5 text-center">Sel</th>
                      <th className="px-3 py-2.5 text-left">Caja / Pack</th>
                      <th className="px-3 py-2.5 text-left">SKU</th>
                      <th className="w-20 px-3 py-2.5 text-right">Pz/Caja</th>
                      <th className="w-24 px-3 py-2.5 text-right">Cajas ord.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleResults.map((caja) => {
                      const isLinked = linkedCajaIds.includes(caja.id)
                      const isSelected = Boolean(selectedMap[caja.id])

                      return (
                        <tr
                          key={caja.id}
                          className={cn(
                            'border-t transition-colors',
                            isLinked ? 'bg-muted/20 opacity-60' : isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                          )}
                        >
                          <td className="px-3 py-2.5 text-center">
                            <Checkbox
                              checked={isSelected}
                              disabled={isLinked}
                              onCheckedChange={(checked) => toggleCaja(caja.id, checked === true)}
                              aria-label={`Seleccionar ${caja.codigo_caja}`}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-mono font-semibold text-primary leading-tight">{caja.codigo_caja}</p>
                            <p className="text-muted-foreground text-[11px] leading-tight truncate max-w-[160px]">
                              {caja.nombre_pack ?? 'Sin nombre de pack'}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-mono">{caja.producto_sku ?? '—'}</p>
                            {isLinked && <Badge variant="outline" className="text-[10px] mt-0.5">Ya vinculada</Badge>}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{caja.piezas_por_caja ?? '—'}</td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="number"
                              min="1"
                              value={selectedMap[caja.id]?.cantidad ?? '1'}
                              disabled={!isSelected || isLinked}
                              onChange={(e) => updateCantidad(caja.id, e.target.value)}
                              className="h-8 text-center tabular-nums w-full"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Mostrando {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, results.length)} de {results.length} resultados
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        ←
                      </Button>
                      <span className="text-xs px-2">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-xs"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel: cajas seleccionadas — altura fija en mobile, ancho fijo en desktop */}
          <div className="h-44 md:h-auto md:w-72 lg:w-80 shrink-0 flex flex-col bg-muted/10 overflow-hidden">
            <div className="px-4 py-2.5 border-b shrink-0">
              <p className="text-sm font-semibold">Seleccionadas</p>
              <p className="text-[11px] text-muted-foreground">Ajusta la cantidad antes de confirmar.</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              {selectedRows.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <CheckCircle2 className="h-7 w-7 mb-1.5 opacity-30" />
                  <p className="text-xs">Marca cajas en la tabla.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRows.map((row) => (
                    <div key={row.id} className="rounded-md border bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs font-semibold text-primary leading-tight">{row.codigo_caja}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{row.nombre_pack ?? '—'}</p>
                          <p className="text-[10px] text-muted-foreground">{row.piezas_por_caja ?? '—'} pz/caja</p>
                        </div>
                        <div className="w-20 shrink-0">
                          <Label className="text-[10px] uppercase text-muted-foreground block mb-0.5">Cajas</Label>
                          <Input
                            type="number"
                            min="1"
                            value={selectedMap[row.id]?.cantidad ?? '1'}
                            onChange={(e) => updateCantidad(row.id, e.target.value)}
                            className="h-7 text-center tabular-nums text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t bg-background flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted-foreground">
            {selectedCount === 0
              ? 'Ninguna caja seleccionada'
              : `${selectedCount} caja${selectedCount !== 1 ? 's' : ''} lista${selectedCount !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={vinculando || selectedCount === 0} onClick={handleVincular}>
              {vinculando && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Agregar a la orden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function OrdenCajas({
  cajas,
  ordenId,
  catalogoCajas,
  detalles,
  canEditOrden = true,
  canEditCajas = true,
  canDeleteCajas = true,
  canCreateCajas = true,
}: {
  cajas: OrdenCajaResuelta[]
  ordenId: number
  detalles?: OrdenDetalleResuelto[]
  catalogoCajas?: {
    tallas: { id: number; codigo: string; nombre: string; categoria: string }[]
    colores: { id: number; nombre: string; hex_code: string | null }[]
  }
  canEditOrden?: boolean
  canEditCajas?: boolean
  canDeleteCajas?: boolean
  canCreateCajas?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [vincularOpen, setVincularOpen] = useState(false)
  const [crearOpen, setCrearOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  const tallasDisponibles: CatalogoItem[] = (catalogoCajas?.tallas ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    codigo: t.codigo,
  }))
  const coloresDisponibles: CatalogoItem[] = (catalogoCajas?.colores ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
  }))

  const linkedCajaIds = cajas.map((c) => c.caja_id)

  const handleRemove = (id: number) => setRemovingId(id)

  const confirmRemove = () => {
    if (!removingId) return
    startTransition(async () => {
      await desvincularCajaOrdenAction(removingId, ordenId)
      setRemovingId(null)
      router.refresh()
    })
  }

  const handleDeactivate = async (cajaId: number) => {
    setDeactivating(cajaId)
    try {
      await desactivarCajaAction(cajaId)
      router.refresh()
    } catch (e) {
      console.error('Error desactivando caja:', e)
    } finally {
      setDeactivating(null)
    }
  }

  const handleEdit = async (cajaId: number, data: {
    base: Partial<SharedCajaData>
    detalles: CajaDetalleInput[]
  }) => {
    await updateCajaCompletaAction(cajaId, data)

    if (data.base.cantidad_cajas !== undefined && data.base.cantidad_cajas !== null) {
      const res = await actualizarCantidadCajasOrdenAction(ordenId, cajaId, Number(data.base.cantidad_cajas))
      if (!res.success) {
        throw new Error(res.error || 'No se pudo actualizar la cantidad de cajas')
      }
    }

    router.refresh()
  }

  const mapCajaToShared = (c: OrdenCajaResuelta): SharedCajaData => ({
    id: c.caja_id,
    codigo_caja: c.caja_codigo,
    nombre_pack: c.caja_nombre_pack,
    producto_sku: c.producto_sku,
    piezas_por_caja: c.caja_piezas_por_caja,
    cbm: c.caja_cbm,
    peso_bruto_kg: c.caja_peso_bruto_kg,
    largo_cm: c.caja_largo_cm,
    ancho_cm: c.caja_ancho_cm,
    alto_cm: c.caja_alto_cm,
    costo_total_caja: c.caja_costo_total_caja,
    cantidad_cajas: c.cantidad_cajas,
    contenidoMap: c.caja_contenidoMap ?? null,
    tallas: c.caja_tallas,
    colores: c.caja_colores,
  })

  if (cajas.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">0 cajas vinculadas</p>
          {(canEditOrden || canCreateCajas) && (
            <div className="flex gap-2">
              {canEditOrden && (
                <Button variant="outline" size="sm" onClick={() => setVincularOpen(true)}>
                  <Link2 className="h-3.5 w-3.5 mr-1" /> Vincular
                </Button>
              )}
              {canCreateCajas && (
                <Button size="sm" onClick={() => setCrearOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nueva
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center py-12 text-muted-foreground rounded-lg border">
          <Package className="h-8 w-8" />
          <p className="text-sm mt-2">Sin cajas vinculadas.</p>
        </div>
        {vincularOpen && (
          <VincularCajaDialog
            open={vincularOpen}
            onOpenChange={setVincularOpen}
            ordenId={ordenId}
            linkedCajaIds={linkedCajaIds}
          />
        )}
        {crearOpen && (
          <CrearCajaDialog
            open={crearOpen}
            onOpenChange={setCrearOpen}
            ordenId={ordenId}
            detalles={detalles ?? []}
            tallasDisponibles={tallasDisponibles}
            coloresDisponibles={coloresDisponibles}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {cajas.length} caja{cajas.length !== 1 ? 's' : ''} vinculada{cajas.length !== 1 ? 's' : ''}
        </p>
        {(canEditOrden || canCreateCajas) && (
          <div className="flex gap-2">
            {canEditOrden && (
              <Button variant="outline" size="sm" onClick={() => setVincularOpen(true)}>
                <Link2 className="h-3.5 w-3.5 mr-1" /> Vincular
              </Button>
            )}
            {canCreateCajas && (
              <Button size="sm" onClick={() => setCrearOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nueva
              </Button>
            )}
          </div>
        )}
      </div>

      {vincularOpen && (
        <VincularCajaDialog
          open={vincularOpen}
          onOpenChange={setVincularOpen}
          ordenId={ordenId}
          linkedCajaIds={linkedCajaIds}
        />
      )}
      {crearOpen && (
        <CrearCajaDialog
          open={crearOpen}
          onOpenChange={setCrearOpen}
          ordenId={ordenId}
          detalles={detalles ?? []}
          tallasDisponibles={tallasDisponibles}
          coloresDisponibles={coloresDisponibles}
        />
      )}

      <div className="space-y-4 max-w-5xl">
        {cajas.map((c) => {
          const detalleProducto = detalles?.find((d) => d.producto_sku === c.producto_sku)
          const precioUnitarioUsd = detalleProducto?.precio_unitario ?? c.producto_precio_ec ?? null

          return (
            <CajaCard
              key={c.id}
              caja={mapCajaToShared(c)}
              layout="horizontal"
              canEdit={canEditCajas}
              canDelete={canEditOrden || canDeleteCajas}
              canEditOrden={canEditOrden}
              isPending={isPending || deactivating === c.caja_id}
              onRemove={canEditOrden ? () => handleRemove(c.id) : undefined}
              onEdit={canEditCajas ? handleEdit : undefined}
              onDeactivate={canDeleteCajas ? handleDeactivate : undefined}
              tallasDisponibles={tallasDisponibles}
              coloresDisponibles={coloresDisponibles}
              precioUnitarioUsd={precioUnitarioUsd}
            />
          )
        })}
      </div>

      <AlertDialog open={removingId !== null} onOpenChange={(o) => { if (!o) setRemovingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular caja</AlertDialogTitle>
            <AlertDialogDescription>
              La caja dejara de estar vinculada a esta orden. El registro de la caja no se elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
