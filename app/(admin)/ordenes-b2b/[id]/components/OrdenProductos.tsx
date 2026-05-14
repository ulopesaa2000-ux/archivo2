// app/(admin)/ordenes-b2b/[id]/components/OrdenProductos.tsx
'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Loader2, Package, Plus, Pencil, Save, X, Search, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ESTADO_DETALLE_B2B_COLORS } from '@/lib/constants'
import { eliminarDetalleOrdenAction, agregarDetalleOrdenAction, actualizarDetalleOrdenAction } from '@/modules/ordenes-b2b/actions'
import { fetchProductosBusqueda } from '@/modules/ordenes-b2b/queries'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'
import type { OrdenDetalleResuelto } from '@/modules/ordenes-b2b/types'

// ════════════════════════════════════════════════════════════
// A G R E G A R   P R O D U C T O   D I A L O G
// ════════════════════════════════════════════════════════════

function AgregarProductoDialog({
  open, onOpenChange, ordenId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ordenId: number
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: number; sku_base: string; nombre: string; descripcion: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    setLoading(true)
    setSelected(null)
    try {
      const items = await fetchProductosBusqueda(q || undefined)
      setResults(items)
    } catch { setResults([]) } finally { setLoading(false) }
  }, 300)

  useEffect(() => { if (open) { setSearch(''); debouncedSearch('') } }, [open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    setError(null)
    setCreando(true)
    const fd = new FormData(e.currentTarget)
    fd.set('orden_id', String(ordenId))
    fd.set('producto_id', String(selected))
    const result = await agregarDetalleOrdenAction(fd)
    setCreando(false)
    if (result.success) { onOpenChange(false); router.refresh() }
    else { setError(result.error ?? 'Error.') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Agregar Producto a la Orden</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto por SKU o nombre..." value={search}
              onChange={(e) => { setSearch(e.target.value); debouncedSearch(e.target.value) }} />
          </div>
          <div className="max-h-40 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
              </div>
            ) : results.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                {search ? 'Sin resultados.' : 'Escribe para buscar productos.'}
              </p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {results.map((p) => (
                    <tr key={p.id} onClick={() => setSelected(p.id)}
                      className={cn('border-t cursor-pointer transition-colors',
                        selected === p.id ? 'bg-primary/5' : 'hover:bg-muted/30')}>
                      <td className={cn('w-4 px-2 py-2', selected === p.id ? 'text-primary' : 'text-transparent')}>●</td>
                      <td className="px-2 py-2 font-mono text-primary font-medium">{p.sku_base}</td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-medium truncate max-w-[200px]">{p.descripcion ?? p.nombre}</div>
                        {p.nombre && p.descripcion && <div className="text-[10px] text-muted-foreground">{p.nombre}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-3 bg-muted/10">
              <div className="text-xs font-medium text-muted-foreground">
                Producto seleccionado: <span className="text-foreground font-semibold">
                  {results.find(p => p.id === selected)?.sku_base}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] font-semibold text-muted-foreground">Piezas</label>
                  <Input name="piezas_pedidas" type="number" min="0" className="h-8 text-xs" placeholder="0" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">Cajas</label>
                  <Input name="cajas_pedidas" type="number" min="0" step="0.5" className="h-8 text-xs" placeholder="0" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">P.Unit (USD)</label>
                  <Input name="precio_unitario" type="number" step="0.01" min="0" className="h-8 text-xs" placeholder="0.00" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">Precio Yuan</label>
                  <Input name="precio_yuan" type="number" step="0.01" min="0" className="h-8 text-xs" placeholder="0.00" /></div>
                <div><label className="text-[10px] font-semibold text-muted-foreground">CBM</label>
                  <Input name="cbm_detalle" type="number" step="0.001" min="0" className="h-8 text-xs" placeholder="0.000" /></div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                  <AlertCircle className="h-3 w-3 shrink-0" /><span>{error}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={creando}>
                  {creando && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Agregar
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
// O R D E N   P R O D U C T O S
// ════════════════════════════════════════════════════════════

export function OrdenProductos({ detalles, ordenId }: { detalles: OrdenDetalleResuelto[]; ordenId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  const startEdit = (d: OrdenDetalleResuelto) => {
    setEditingId(d.id)
    setEditForm({
      piezas_pedidas: String(d.piezas_pedidas ?? ''),
      cajas_pedidas: String(d.cajas_pedidas ?? ''),
      precio_unitario: String(d.precio_unitario ?? ''),
      precio_yuan: String(d.precio_yuan ?? ''),
      cbm_detalle: String(d.cbm_detalle ?? ''),
    })
  }

  const handleSaveEdit = (detalleId: number) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('detalle_id', String(detalleId))
      fd.set('orden_id', String(ordenId))
      fd.set('piezas_pedidas', editForm.piezas_pedidas)
      fd.set('cajas_pedidas', editForm.cajas_pedidas)
      fd.set('precio_unitario', editForm.precio_unitario)
      fd.set('precio_yuan', editForm.precio_yuan)
      fd.set('cbm_detalle', editForm.cbm_detalle)
      const result = await actualizarDetalleOrdenAction(fd)
      if (result.success) { setEditingId(null); router.refresh() }
    })
  }

  const handleDelete = (detalleId: number) => {
    startTransition(async () => {
      await eliminarDetalleOrdenAction(detalleId, ordenId)
      router.refresh()
    })
  }

  if (detalles.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">0 líneas de producto</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Producto
          </Button>
        </div>
        <div className="flex flex-col items-center py-12 text-muted-foreground rounded-lg border">
          <Package className="h-8 w-8" /><p className="text-sm mt-2">Sin productos.</p>
        </div>
        <AgregarProductoDialog open={dialogOpen} onOpenChange={setDialogOpen} ordenId={ordenId} />
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{detalles.length} línea{detalles.length !== 1 ? 's' : ''} de producto</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Producto
        </Button>
      </div>

      <AgregarProductoDialog open={dialogOpen} onOpenChange={setDialogOpen} ordenId={ordenId} />

      <div className="rounded-lg border overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 font-semibold text-muted-foreground">
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-center">Pz</th>
              <th className="px-3 py-2 text-center">Cajas</th>
              <th className="px-3 py-2 text-right">P.Unit</th>
              <th className="px-3 py-2 text-right">Yuan</th>
              <th className="px-3 py-2 text-right">CBM</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((d) => {
              const isEditing = editingId === d.id
              const estadoColor = ESTADO_DETALLE_B2B_COLORS[d.estado_producto ?? ''] ?? ''

              return (
                <tr key={d.id} className={cn('border-t', isEditing && 'bg-accent/20')}>
                  <td className="px-3 py-2 font-mono">{d.producto_sku ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <div className="text-xs font-medium truncate">{d.producto_descripcion ?? d.producto_nombre ?? '—'}</div>
                    {d.producto_nombre && d.producto_descripcion && (
                      <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                        {d.producto_nombre}
                      </div>
                    )}
                  </td>

                  {isEditing ? (
                    <>
                      <td className="px-1 py-1"><Input name="piezas" type="number" min="0"
                        className="h-7 w-16 text-xs text-center" value={editForm.piezas_pedidas}
                        onChange={(e) => setEditForm(f => ({ ...f, piezas_pedidas: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="cajas" type="number" min="0" step="0.5"
                        className="h-7 w-14 text-xs text-center" value={editForm.cajas_pedidas}
                        onChange={(e) => setEditForm(f => ({ ...f, cajas_pedidas: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="punit" type="number" step="0.01" min="0"
                        className="h-7 w-20 text-xs text-right" value={editForm.precio_unitario}
                        onChange={(e) => setEditForm(f => ({ ...f, precio_unitario: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="yuan" type="number" step="0.01" min="0"
                        className="h-7 w-20 text-xs text-right" value={editForm.precio_yuan}
                        onChange={(e) => setEditForm(f => ({ ...f, precio_yuan: e.target.value }))} /></td>
                      <td className="px-1 py-1"><Input name="cbm" type="number" step="0.001" min="0"
                        className="h-7 w-20 text-xs text-right" value={editForm.cbm_detalle}
                        onChange={(e) => setEditForm(f => ({ ...f, cbm_detalle: e.target.value }))} /></td>
                      <td className="px-3 py-2"><Badge variant="secondary" className={`text-[10px] ${estadoColor}`}>{d.estado_producto}</Badge></td>
                      <td className="px-2 py-1">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleSaveEdit(d.id)} disabled={isPending}>
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center tabular-nums">{d.piezas_pedidas ?? 0}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{d.cajas_pedidas ?? 0}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.precio_unitario ? formatCurrency(d.precio_unitario, 'USD') : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.precio_yuan ?? '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.cbm_detalle ?? '—'}</td>
                      <td className="px-3 py-2"><Badge variant="secondary" className={`text-[10px] ${estadoColor}`}>{d.estado_producto}</Badge></td>
                      <td className="px-2 py-1">
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"
                            onClick={() => startEdit(d)} title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(d.id)} disabled={isPending} title="Eliminar">
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
