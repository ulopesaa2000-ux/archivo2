// app/(admin)/ordenes-b2b/[id]/components/OrdenCajas.tsx
'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Package, Plus, Link2, Loader2, Search, Trash2 } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'
import { desvincularCajaOrdenAction, vincularCajaOrdenAction, actualizarCantidadCajasOrdenAction } from '@/modules/ordenes-b2b/actions'
import { createCajaAction, updateCajaCompletaAction, desactivarCajaAction } from '@/modules/cajas/actions'
import { fetchCajasListado } from '@/modules/ordenes-b2b/queries'
import type { CajaDetalleInput } from '@/modules/cajas/actions'
import type { OrdenCajaResuelta } from '@/modules/ordenes-b2b/types'
import type { OrdenDetalleResuelto } from '@/modules/ordenes-b2b/types'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'

type CatalogoItem = { id: number; nombre: string; codigo?: string }

// ════════════════════════════════════════════════════════════
// V I N C U L A R   C A J A   D I A L O G
// ════════════════════════════════════════════════════════════

function VincularCajaDialog({
  open, onOpenChange, ordenId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ordenId: number
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [vinculando, setVinculando] = useState(false)

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    setLoading(true)
    setSelected(null)
    try {
      const { items } = await fetchCajasListado({ q: q || undefined })
      setResults(items)
    } catch { setResults([]) } finally { setLoading(false) }
  }, 300)

  useEffect(() => { if (open) { setSearch(''); setCantidad('1'); debouncedSearch('') } }, [open])

  const handleVincular = async () => {
    if (!selected) return
    setVinculando(true)
    const result = await vincularCajaOrdenAction(ordenId, selected.id, parseInt(cantidad) || 1)
    setVinculando(false)
    if (result.success) { onOpenChange(false); router.refresh() }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Vincular Caja Existente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar caja por código..."
              value={search} onChange={(e) => { setSearch(e.target.value); debouncedSearch(e.target.value) }} />
          </div>

          <div className="max-h-40 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
              </div>
            ) : results.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                {search ? 'Sin resultados.' : 'Escribe para buscar cajas.'}
              </p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {results.map((c: any) => (
                    <tr key={c.id} onClick={() => setSelected(c)}
                      className={cn('border-t cursor-pointer transition-colors',
                        selected?.id === c.id ? 'bg-primary/5' : 'hover:bg-muted/30')}>
                      <td className={cn('w-4 px-2 py-2', selected?.id === c.id ? 'text-primary' : 'text-transparent')}>●</td>
                      <td className="px-2 py-2 font-mono text-primary font-medium">{c.codigo_caja}</td>
                      <td className="px-2 py-2">{c.nombre_pack ?? '—'}</td>
                      <td className="px-2 py-2 text-muted-foreground">{c.producto_sku ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <div className="flex items-end gap-3 border rounded-lg p-3 bg-muted/10">
              <div className="flex-1">
                <Label className="text-xs">Cantidad de cajas</Label>
                <Input type="number" min="1" value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)} className="h-9" />
              </div>
              <Button size="sm" disabled={vinculando} onClick={handleVincular}>
                {vinculando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Vincular
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
// C R E A R   C A J A   D I A L O G
// ════════════════════════════════════════════════════════════

function CrearCajaDialog({
  open, onOpenChange, ordenId, detalles, tallasDisponibles, coloresDisponibles,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ordenId: number
  detalles: OrdenDetalleResuelto[]
  tallasDisponibles: CatalogoItem[]
  coloresDisponibles: CatalogoItem[]
}) {
  const router = useRouter()
  const [selectedProductoId, setSelectedProductoId] = useState<string>('')

  const productoOptions = detalles
    .filter(d => d.producto_id)
    .map(d => ({ id: d.producto_id!, sku: d.producto_sku }))
    .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i) // unique

  useEffect(() => {
    if (open && productoOptions.length > 0 && !selectedProductoId) {
      setSelectedProductoId(String(productoOptions[0].id))
    }
  }, [open, productoOptions])

  const handleCreate = async (data: {
    base: Partial<SharedCajaData>
    detalles: CajaDetalleInput[]
  }) => {
    const prodId = parseInt(selectedProductoId)
    if (!prodId) return

    const newCajaId = await createCajaAction(prodId, data)
    if (newCajaId) {
      const cantidad = data.base.cantidad_cajas ? Number(data.base.cantidad_cajas) : 1
      await vincularCajaOrdenAction(ordenId, newCajaId, cantidad)
      onOpenChange(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Crear Nueva Caja</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {productoOptions.length > 1 && (
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Producto</Label>
              <Select value={selectedProductoId} onValueChange={(val) => { const v = val ?? ''; setSelectedProductoId(v) }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {productoOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.sku ?? `#${p.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <CajaCard
            caja={{ id: 0, codigo_caja: '', nombre_pack: null, piezas_por_caja: null, cbm: null, peso_bruto_kg: null, tallas: null, colores: null, contenidoMap: null, cantidad_cajas: null }}
            layout="horizontal"
            isNew
            onCreate={handleCreate}
            tallasDisponibles={tallasDisponibles}
            coloresDisponibles={coloresDisponibles}
            productoId={parseInt(selectedProductoId) || undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
// O R D E N   C A J A S
// ════════════════════════════════════════════════════════════

export function OrdenCajas({
  cajas, ordenId, catalogoCajas, detalles,
}: {
  cajas: OrdenCajaResuelta[]
  ordenId: number
  detalles?: OrdenDetalleResuelto[]
  catalogoCajas?: {
    tallas: { id: number; codigo: string; nombre: string; categoria: string }[]
    colores: { id: number; nombre: string; hex_code: string | null }[]
  }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [vincularOpen, setVincularOpen] = useState(false)
  const [crearOpen, setCrearOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [deactivating, setDeactivating] = useState<number | null>(null)

  const tallasDisponibles: CatalogoItem[] = (catalogoCajas?.tallas ?? []).map(t => ({
    id: t.id, nombre: t.nombre, codigo: t.codigo,
  }))
  const coloresDisponibles: CatalogoItem[] = (catalogoCajas?.colores ?? []).map(c => ({
    id: c.id, nombre: c.nombre,
  }))

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
    
    // Si se especificó cantidad_cajas, actualizar también la relación orden_cajas
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

  // Empty state
  if (cajas.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">0 cajas vinculadas</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setVincularOpen(true)}>
              <Link2 className="h-3.5 w-3.5 mr-1" /> Vincular
            </Button>
            <Button size="sm" onClick={() => setCrearOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nueva
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center py-12 text-muted-foreground rounded-lg border">
          <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin cajas vinculadas.</p>
        </div>
        <VincularCajaDialog open={vincularOpen} onOpenChange={setVincularOpen} ordenId={ordenId} />
        <CrearCajaDialog open={crearOpen} onOpenChange={setCrearOpen} ordenId={ordenId}
          detalles={detalles ?? []} tallasDisponibles={tallasDisponibles} coloresDisponibles={coloresDisponibles} />
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{cajas.length} caja{cajas.length !== 1 ? 's' : ''} vinculada{cajas.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setVincularOpen(true)}>
            <Link2 className="h-3.5 w-3.5 mr-1" /> Vincular
          </Button>
          <Button size="sm" onClick={() => setCrearOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nueva
          </Button>
        </div>
      </div>

      <VincularCajaDialog open={vincularOpen} onOpenChange={setVincularOpen} ordenId={ordenId} />
      <CrearCajaDialog open={crearOpen} onOpenChange={setCrearOpen} ordenId={ordenId}
        detalles={detalles ?? []} tallasDisponibles={tallasDisponibles} coloresDisponibles={coloresDisponibles} />

      <div className="space-y-4 max-w-5xl">
        {cajas.map((c) => {
          const detalleProducto = detalles?.find(d => d.producto_sku === c.producto_sku)
          const precioUnitarioUsd = detalleProducto?.precio_unitario ?? c.producto_precio_ec ?? null

          return (
            <CajaCard
              key={c.id}
              caja={mapCajaToShared(c)}
              layout="horizontal"
              canEdit
              isPending={isPending}
              onRemove={() => handleRemove(c.id)}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
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
              La caja dejará de estar vinculada a esta orden. El registro de la caja no se elimina.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
