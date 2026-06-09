// app/(admin)/despachos/nuevo/DespachoForm.tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ADMIN_ROUTES } from '@/lib/constants'
import {
  ArrowLeft, Plus, Trash2, Loader2, Truck, AlertCircle, Check,
} from 'lucide-react'
import { crearDespachoAction } from '@/modules/despachos/actions'
import { fetchStockVirtual } from '@/modules/despachos/queries'
import type { BodegaRow } from '@/lib/types/tables'
import type { StockVirtualItem } from '@/modules/despachos/types'

export function DespachoForm({
  bodegasVirtuales, bodegasFisicas, origenId,
}: {
  bodegasVirtuales: BodegaRow[]
  bodegasFisicas: BodegaRow[]
  origenId?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Selecciones
  const [bodegaOrigenId, setBodegaOrigenId] = useState<number | null>(origenId ?? null)
  const [bodegaDestinoId, setBodegaDestinoId] = useState<number | null>(null)
  const [stock, setStock] = useState<StockVirtualItem[]>([])
  const [productos, setProductos] = useState<{ producto_id: number; sku: string; nombre: string; cajas: number }[]>([])
  const [vehiculo, setVehiculo] = useState('')
  const [chofer, setChofer] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))

  const handleBodegaChange = async (id: number) => {
    setBodegaOrigenId(id)
    setProductos([])
    const items = await fetchStockVirtual(id)
    setStock(items)
  }

  // Cargar stock si viene de inventario-virtual
  useEffect(() => {
    if (origenId) {
      handleBodegaChange(origenId)
    }
  }, [origenId])

  const addProducto = (item: StockVirtualItem) => {
    if (productos.some(p => p.producto_id === item.producto_id)) return
    setProductos([...productos, {
      producto_id: item.producto_id,
      sku: item.sku_base ?? '?',
      nombre: item.producto_nombre ?? '?',
      cajas: Math.min(1, item.cajas_disponibles),
    }])
  }

  const updateCajas = (productoId: number, cajas: number) => {
    setProductos(productos.map(p =>
      p.producto_id === productoId ? { ...p, cajas: Math.max(0, cajas) } : p
    ))
  }

  const removeProducto = (productoId: number) => {
    setProductos(productos.filter(p => p.producto_id !== productoId))
  }

  const handleSubmit = () => {
    if (!bodegaOrigenId) { setError('Selecciona bodega origen.'); return }
    if (!bodegaDestinoId) { setError('Selecciona bodega destino.'); return }
    if (productos.length === 0) { setError('Agrega al menos un producto.'); return }
    if (productos.some(p => p.cajas <= 0)) { setError('Todas las cantidades deben ser mayores a 0.'); return }

    setError(null)
    startTransition(async () => {
      const result = await crearDespachoAction({
        bodega_origen_id: bodegaOrigenId,
        bodega_destino_id: bodegaDestinoId,
        vehiculo_info: vehiculo || undefined,
        chofer: chofer || undefined,
        fecha_programada: fecha,
        productos: productos.map(p => ({
          producto_id: p.producto_id,
          cantidad_cajas: p.cajas,
        })),
      })

      if (!result.success) { setError(result.error ?? 'Error.'); return }
      router.push(ADMIN_ROUTES.despachos.detalle(result.despacho_id!))
      router.refresh()
    })
  }

  const stockFiltered = stock.filter(s => s.cajas_disponibles > 0)

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Selectores de bodega */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Bodega origen (virtual)</Label>
          <Select value={bodegaOrigenId ? String(bodegaOrigenId) : ''} onValueChange={(v) => { if (v) handleBodegaChange(parseInt(v)) }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {bodegasVirtuales.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.nombre} ({b.codigo})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Bodega destino (física)</Label>
          <Select value={bodegaDestinoId ? String(bodegaDestinoId) : ''} onValueChange={(v) => { if (v) setBodegaDestinoId(parseInt(v)) }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {bodegasFisicas.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.nombre} ({b.codigo})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info transporte */}
      {bodegaOrigenId && bodegaDestinoId && (
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

      {/* Productos disponibles en bodega virtual */}
      {bodegaOrigenId && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Stock disponible en bodega virtual
          </h3>
          {stockFiltered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hay stock disponible en esta bodega.</p>
          ) : (
            <div className="rounded-md border max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cajas disp.</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockFiltered.map((s) => {
                    const added = productos.some(p => p.producto_id === s.producto_id)
                    return (
                      <TableRow key={s.producto_id} className={added ? 'bg-muted/50' : ''}>
                        <TableCell className="font-mono text-xs">{s.sku_base}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{s.producto_nombre}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.cajas_disponibles}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost" size="sm"
                            disabled={added}
                            onClick={() => addProducto(s)}
                          >
                            {added ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Productos seleccionados */}
      {productos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Productos a despachar ({productos.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cajas</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((p) => {
                  const stockItem = stock.find(s => s.producto_id === p.producto_id)
                  return (
                    <TableRow key={p.producto_id}>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.nombre}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number" min={1}
                          max={stockItem?.cajas_disponibles ?? 999}
                          value={p.cajas}
                          onChange={(e) => updateCajas(p.producto_id, parseInt(e.target.value) || 0)}
                          className="w-20 h-8 text-right inline-block"
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeProducto(p.producto_id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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
          <Truck className="h-3.5 w-3.5 mr-1" /> Crear despacho
        </Button>
      </div>
    </div>
  )
}
