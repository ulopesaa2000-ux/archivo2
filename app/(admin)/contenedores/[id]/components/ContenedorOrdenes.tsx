// app/(admin)/contenedores/[id]/components/ContenedorOrdenes.tsx
'use client'

import React, { useState, useTransition, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShoppingCart, PlusCircle, Loader2, Search, AlertCircle, Trash2,
  Calendar, Building2, Hash,
} from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { ESTADO_ORDEN_B2B_COLORS, MONEDAS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { OrdenRow } from '@/components/admin/ordenes/OrdenRow'
import type { OrdenRowData } from '@/components/admin/ordenes/OrdenRow'
import {
  vincularOrdenContenedorAction,
  desvincularOrdenContenedorAction,
} from '@/modules/contenedores/actions'
import { crearOrdenB2BAction } from '@/modules/ordenes-b2b/actions'
import { fetchOrdenesDisponibles } from '@/modules/contenedores/queries'
import type { OrdenEnContenedor, OrdenDisponible } from '@/modules/contenedores/types'
import type { CatalogosB2B } from '@/modules/ordenes-b2b/types'
import { OrdenFormDialog } from '../../../ordenes-b2b/OrdenFormDialog'

// ════════════════════════════════════════════════════════════
// A G R E G A R   O R D E N   D I A L O G
// ════════════════════════════════════════════════════════════

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function AgregarOrdenDialog({
  open, onOpenChange, contenedorId, catalogos,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contenedorId: number
  catalogos: CatalogosB2B
}) {
  const router = useRouter()
  const [tab, setTab] = useState('vincular')

  // ── Vincular existente ──
  const [search, setSearch] = useState('')
  const [disponibles, setDisponibles] = useState<OrdenDisponible[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [vinculando, setVinculando] = useState(false)

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    setLoading(true)
    setSelectedId(null)
    try {
      const items = await fetchOrdenesDisponibles(contenedorId, q || undefined)
      setDisponibles(items)
    } catch {
      setDisponibles([])
    } finally {
      setLoading(false)
    }
  }, 300)

  useEffect(() => {
    if (open) { setSearch(''); debouncedSearch('') }
  }, [open])

  const handleVincular = async () => {
    if (!selectedId) return
    setVinculando(true)
    const result = await vincularOrdenContenedorAction(contenedorId, selectedId)
    setVinculando(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    }
  }

  // ── Crear nueva ──
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [provNombre, setProvNombre] = useState('')
  const [provId, setProvId] = useState('')
  const [cliNombre, setCliNombre] = useState('')
  const [cliId, setCliId] = useState('')

  const handleCrear = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setCreando(true)
    const fd = new FormData()
    fd.set('proveedor_id', provId)
    fd.set('cliente_b2b_id', cliId || '')
    fd.set('folio_proveedor', (e.currentTarget.querySelector<HTMLInputElement>('[name=folio_proveedor]')?.value ?? ''))
    fd.set('moneda', (e.currentTarget.querySelector<HTMLSelectElement>('[name=moneda]')?.value ?? 'USD'))
    fd.set('tipo_cambio', (e.currentTarget.querySelector<HTMLInputElement>('[name=tipo_cambio]')?.value ?? ''))
    fd.set('observaciones', (e.currentTarget.querySelector<HTMLTextAreaElement>('[name=observaciones]')?.value ?? ''))
    fd.set('contenedor_id', String(contenedorId))
    const result = await crearOrdenB2BAction(fd)
    setCreando(false)
    if (result.success) {
      onOpenChange(false)
      router.refresh()
    } else {
      setError(result.error ?? 'Error al crear orden.')
    }
  }

  const selectedOrder = useMemo(
    () => disponibles.find((o) => o.id === selectedId),
    [selectedId, disponibles],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-h-[90vh] !p-6 !overflow-hidden"
        style={{ maxWidth: 'calc(85vw - 3.5em)', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex flex-col flex-1 min-h-0">
          <DialogHeader className="shrink-0">
            <DialogTitle>Agregar Orden al Contenedor</DialogTitle>
          </DialogHeader>
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex-1 flex flex-col min-h-0 mt-2"
          >
            <TabsList className="grid grid-cols-2 shrink-0">
              <TabsTrigger value="vincular">Vincular existente</TabsTrigger>
              <TabsTrigger value="crear">Crear nueva</TabsTrigger>
            </TabsList>

            {/* ═══════════════════ VINCULAR EXISTENTE ═══════════════════ */}
            <TabsContent
              value="vincular"
              className="flex-1 flex flex-col min-h-0 mt-4 data-[state=active]:flex"
            >
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por folio del proveedor..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); debouncedSearch(e.target.value) }}
                />
              </div>

              <div className="flex-1 rounded-lg border mt-3 min-h-0 overflow-y-auto overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Buscando órdenes...
                  </div>
                ) : disponibles.length === 0 ? (
                  <div className="text-center py-16 text-sm text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>{search ? 'Sin resultados con ese folio.' : 'No hay órdenes disponibles para vincular.'}</p>
                  </div>
                ) : (
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-10" />
                      <col className="w-20" />
                      <col className="w-36" />
                      <col className="w-48" />
                      <col className="w-16" />
                      <col className="w-16" />
                      <col className="w-32" />
                      <col className="w-16" />
                      <col className="w-44" />
                      <col className="w-20" />
                    </colgroup>
                    <thead>
                      <tr className="bg-muted/50 font-semibold text-muted-foreground border-b sticky top-0 z-10">
                        <th className="px-3 py-3"></th>
                        <th className="px-4 py-3 text-left font-mono text-xs">ID</th>
                        <th className="px-4 py-3 text-left text-xs">Folio</th>
                        <th className="px-4 py-3 text-left text-xs">Proveedor</th>
                        <th className="px-4 py-3 text-center text-xs">Cajas</th>
                        <th className="px-4 py-3 text-center text-xs">Piezas</th>
                        <th className="px-4 py-3 text-left text-xs">Fecha</th>
                        <th className="px-4 py-3 text-center text-xs">Moneda</th>
                        <th className="px-4 py-3 text-center text-xs">Estado</th>
                        <th className="px-4 py-3 text-center text-xs">Cont.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disponibles.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedId(o.id)}
                          className={cn(
                            'border-t cursor-pointer transition-colors',
                            selectedId === o.id
                              ? 'bg-primary/5 border-l-2 border-l-primary'
                              : 'hover:bg-muted/30 border-l-2 border-l-transparent',
                          )}
                        >
                          <td className="px-3 py-3 text-center overflow-hidden">
                            <div className={cn(
                              'w-4 h-4 rounded-full border-2 transition-colors mx-auto',
                              selectedId === o.id ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                            )} />
                          </td>
                          <td className="px-4 py-3 font-mono text-primary font-semibold text-sm truncate">#{o.id}</td>
                          <td className="px-4 py-3 font-semibold truncate" title={o.folio_proveedor ?? ''}>{o.folio_proveedor ?? '—'}</td>
                          <td className="px-4 py-3 truncate" title={o.proveedor_nombre ?? ''}>
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{o.proveedor_nombre ?? '—'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums font-semibold truncate">{o.total_cajas ?? 0}</td>
                          <td className="px-4 py-3 text-center tabular-nums truncate">{o.total_piezas ?? 0}</td>
                          <td className="px-4 py-3 truncate">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {formatDate(o.fecha_orden)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs font-medium truncate">{o.moneda}</td>
                          <td className="px-4 py-3 text-center overflow-hidden">
                            <Badge variant="secondary" className={cn('text-[11px] px-2 py-0.5 max-w-full truncate inline-block', ESTADO_ORDEN_B2B_COLORS[o.estado ?? ''] ?? '')}>
                              {o.estado}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center overflow-hidden">
                            {o.contenedor_id ? (
                              <Badge variant="outline" className="text-[11px] text-muted-foreground border-dashed px-2 py-0.5 truncate max-w-full inline-block">
                                Este
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-200 bg-emerald-50 px-2 py-0.5 truncate max-w-full inline-block">
                                Libre
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Selected order summary + actions */}
              <div className="shrink-0 mt-3 space-y-3">
                {selectedOrder && (
                  <div className="flex items-center gap-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2.5 text-xs">
                    <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-mono font-semibold text-primary">#{selectedOrder.id}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-medium">{selectedOrder.folio_proveedor ?? '—'}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{selectedOrder.proveedor_nombre}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="tabular-nums">{selectedOrder.total_cajas ?? 0} cajas / {selectedOrder.total_piezas ?? 0} pz</span>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" disabled={!selectedId || vinculando} onClick={handleVincular}>
                    {vinculando && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Vincular al Contenedor
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ═══════════════════ CREAR NUEVA ═══════════════════ */}
            <TabsContent
              value="crear"
              className="flex-1 flex flex-col min-h-0 mt-4 data-[state=active]:flex"
            >
              <form onSubmit={handleCrear} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-1.5 col-span-1">
                      <Label className="text-xs font-semibold">Proveedor</Label>
                      <Select value={provNombre} onValueChange={(val) => { const v = val ?? ''; setProvNombre(v); const p = catalogos.proveedores.find(x => x.nombre_completo === v); setProvId(p?.id ? String(p.id) : '') }}>
                        <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                        <SelectContent>
                          {catalogos.proveedores.map((p) => (
                            <SelectItem key={p.id} value={p.nombre_completo}>{p.nombre_completo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <Label className="text-xs font-semibold">Cliente B2B</Label>
                      <Select value={cliNombre} onValueChange={(val) => { const v = val ?? ''; setCliNombre(v); const c = catalogos.clientesB2B.find(x => x.nombre_completo === v); setCliId(c?.id ? String(c.id) : '') }}>
                        <SelectTrigger className="h-10 w-full"><SelectValue placeholder="Opcional..." /></SelectTrigger>
                        <SelectContent>
                          {catalogos.clientesB2B.map((c) => (
                            <SelectItem key={c.id} value={c.nombre_completo}>{c.nombre_completo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <Label className="text-xs font-semibold">Folio del Proveedor</Label>
                      <Input name="folio_proveedor" className="h-10" placeholder="Ej: PO-2024-001" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-xs font-semibold">Moneda y TC</Label>
                      <div className="flex gap-2">
                        <div className="w-24 shrink-0">
                          <Select name="moneda" defaultValue="USD">
                            <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MONEDAS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-28 shrink-0">
                          <Input
                            name="tipo_cambio"
                            type="number"
                            step="0.0001"
                            min="0"
                            className="h-10"
                            placeholder="##.##"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 col-span-3">
                      <Label className="text-xs font-semibold">Observaciones</Label>
                      <Textarea
                        name="observaciones"
                        className="min-h-[60px] resize-y"
                        placeholder="Notas adicionales sobre la orden..."
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 shrink-0 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creando}>
                    {creando && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                    Crear Orden
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ════════════════════════════════════════════════════════════
// C O N T E N E D O R   O R D E N E S
// ════════════════════════════════════════════════════════════

export function ContenedorOrdenes({
  ordenes, contenedorId, catalogos,
}: {
  ordenes: OrdenEnContenedor[]
  contenedorId: number
  catalogos: CatalogosB2B
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [editingOrden, setEditingOrden] = useState<OrdenEnContenedor | null>(null)

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleRemoveConfirm = () => {
    if (!removingId) return
    startTransition(async () => {
      await desvincularOrdenContenedorAction(removingId, contenedorId)
      setRemovingId(null)
      router.refresh()
    })
  }

  // Empty state
  if (ordenes.length === 0) {
    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">0 órdenes vinculadas</p>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" /> Agregar Orden
          </Button>
        </div>
        <div className="flex flex-col items-center py-12 text-muted-foreground rounded-lg border">
          <ShoppingCart className="h-8 w-8" /><p className="text-sm mt-2">Sin órdenes vinculadas.</p>
        </div>
        <AgregarOrdenDialog open={dialogOpen} onOpenChange={setDialogOpen} contenedorId={contenedorId} catalogos={catalogos} />
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''} vinculada{ordenes.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5 mr-1" /> Agregar Orden
        </Button>
      </div>

      {/* Dialog */}
      <AgregarOrdenDialog open={dialogOpen} onOpenChange={setDialogOpen} contenedorId={contenedorId} catalogos={catalogos} />

      {/* Table */}
      <div className="rounded-lg border overflow-hidden bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
              <th className="px-2 py-2 w-[40px]"></th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Folio Prov.</th>
              <th className="px-4 py-2 text-left">Proveedor</th>
              <th className="px-4 py-2 text-center">Cajas</th>
              <th className="px-4 py-2 text-center">Piezas</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((o) => (
              <OrdenRow
                key={o.id}
                item={o as unknown as OrdenRowData}
                isExpanded={expanded.has(o.id)}
                onToggle={toggle}
                showContenedor={false}
                onEdit={(id) => {
                  const found = ordenes.find((x) => x.id === id)
                  if (found) setEditingOrden(found)
                }}
                onDelete={(id) => setRemovingId(id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={removingId !== null} onOpenChange={(open) => { if (!open) setRemovingId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitar orden del contenedor</AlertDialogTitle>
            <AlertDialogDescription>
              La orden dejará de estar vinculada a este contenedor. No se elimina la orden, solo la asociación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleRemoveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingOrden && catalogos && (
        <OrdenFormDialog
          mode="edit"
          catalogos={catalogos}
          orden={editingOrden as any}
          open={!!editingOrden}
          onOpenChange={(open) => {
            if (!open) setEditingOrden(null)
          }}
        />
      )}
    </div>
  )
}
