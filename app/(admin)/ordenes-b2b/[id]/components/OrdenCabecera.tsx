// app/(admin)/ordenes-b2b/[id]/components/OrdenCabecera.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Pencil, Save, X, Loader2, AlertCircle } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import {
  ADMIN_ROUTES, ESTADO_ORDEN_B2B_COLORS, ESTADOS_ORDEN_B2B, MONEDAS,
} from '@/lib/constants'
import { actualizarOrdenB2BAction, cambiarEstadoOrdenAction } from '@/modules/ordenes-b2b/actions'
import type { OrdenB2BListItem, CatalogosB2B } from '@/modules/ordenes-b2b/types'

export function OrdenCabecera({
  orden, catalogos, canEdit,
}: {
  orden: OrdenB2BListItem
  catalogos: CatalogosB2B
  canEdit: boolean
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Resetear edición al cambiar de orden (evita que persista al navegar)
  useEffect(() => {
    setIsEditing(false)
    setError(null)
  }, [orden.id])

  const estadoColor = ESTADO_ORDEN_B2B_COLORS[orden.estado ?? ''] ?? ''
  const esTerminal = orden.estado === 'Cerrada' || orden.estado === 'Cancelada'

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('orden_id', String(orden.id))
    startTransition(async () => {
      const result = await actualizarOrdenB2BAction(fd)
      if (!result.success) { setError(result.error ?? 'Error.'); return }
      setIsEditing(false)
      router.refresh()
    })
  }

  const handleEstado = (nuevoEstado: string) => {
    startTransition(async () => {
      const result = await cambiarEstadoOrdenAction(orden.id, nuevoEstado)
      if (!result.success) { setError(result.error ?? 'Error.'); return }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={ADMIN_ROUTES.ordenesB2B.lista}
            className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Órdenes B2B
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Orden #{orden.id}</span>
        </div>
        <div className="flex items-center gap-2">
          {!esTerminal && canEdit && (
            <Select onValueChange={(v: any) => { if (v) handleEstado(v) }} disabled={isPending}>
              <SelectTrigger data-testid="orden-estado-trigger" className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Cambiar estado..." />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_ORDEN_B2B.filter((e) => e !== orden.estado && e !== 'Borrador').map((e) => (
                  <SelectItem key={e} value={e}>→ {e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!esTerminal && !isEditing && canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isEditing ? (
            <form key={orden.id} onSubmit={handleSave} className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Editando Orden #{orden.id}</h3>
                  <p className="text-xs text-muted-foreground">Modifica los campos que necesites</p>
                </div>
                <Badge variant="outline" className="text-xs">{orden.estado}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Proveedor</Label>
                  <Select name="proveedor_id" defaultValue={String(catalogos.proveedores.find(p => p.nombre_completo === orden.proveedor_nombre)?.id ?? '')}>
                    <SelectTrigger data-testid="orden-edit-proveedor-trigger" className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {catalogos.proveedores.map(p => (<SelectItem key={p.id} value={String(p.id)}>{p.nombre_completo}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Folio proveedor</Label>
                  <Input name="folio_proveedor" defaultValue={orden.folio_proveedor ?? ''} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Moneda</Label>
                  <Select name="moneda" defaultValue={orden.moneda}>
                    <SelectTrigger data-testid="orden-edit-moneda-trigger" className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONEDAS.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo de cambio</Label>
                  <Input type="number" step="0.01" name="tipo_cambio" defaultValue={orden.tipo_cambio ?? ''} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fecha de finalización</Label>
                  <Input
                    type="datetime-local"
                    name="fecha_orden"
                    defaultValue={orden.fecha_orden ? orden.fecha_orden.slice(0, 16) : ''}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Observaciones</Label>
                <Textarea name="observaciones" defaultValue={orden.observaciones ?? ''} rows={2} className="resize-y min-h-[60px]" />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                {error ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
                  </div>
                ) : <div />}
                <div className="flex items-center gap-2 ml-auto">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setIsEditing(false); setError(null) }} disabled={isPending}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isPending}>
                    {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    <Save className="h-3.5 w-3.5 mr-1" /> Guardar cambios
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">Orden #{orden.id}</h2>
                <Badge className={estadoColor}>{orden.estado}</Badge>
                {orden.contenedor_codigo && (
                  <Link href={ADMIN_ROUTES.contenedores.detalle(orden.contenedor_id!)}
                    className="text-xs font-mono text-primary hover:underline">
                    📦 {orden.contenedor_codigo}
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Proveedor</span>
                  <p className="text-base font-bold text-foreground">{orden.proveedor_nombre ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Folio</span>
                  <p className="font-mono text-sm font-semibold">{orden.folio_proveedor ?? '—'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Moneda</span>
                  <p className="text-base font-semibold">{orden.moneda} {orden.tipo_cambio ? <span className="text-sm font-normal text-muted-foreground">(TC: {orden.tipo_cambio})</span> : ''}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Fecha</span>
                  <p className="text-base font-semibold"><Fecha valor={orden.fecha_orden} formato="fecha" /></p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cajas</span>
                  <p className="text-2xl font-black tabular-nums tracking-tight">{orden.total_cajas ?? 0}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Piezas</span>
                  <p className="text-2xl font-black tabular-nums tracking-tight">{orden.total_piezas ?? 0}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">CBM</span>
                  <p className="text-2xl font-black tabular-nums tracking-tight">{orden.cbm_orden ?? '—'}</p>
                </div>
                {orden.cliente_nombre && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cliente destino</span>
                    <p className="text-base font-semibold">{orden.cliente_nombre}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
