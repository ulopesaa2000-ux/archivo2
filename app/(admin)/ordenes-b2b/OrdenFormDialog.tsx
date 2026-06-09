// app/(admin)/ordenes-b2b/OrdenFormDialog.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import { MONEDAS } from '@/lib/constants'
import { crearOrdenB2BAction, actualizarOrdenB2BAction } from '@/modules/ordenes-b2b/actions'
import type { CatalogosB2B, OrdenB2BListItem } from '@/modules/ordenes-b2b/types'
import { Button } from '@/components/ui/button'

type Props =
  | { mode: 'create'; catalogos: CatalogosB2B; orden?: never; open?: never; onOpenChange?: never }
  | { mode: 'edit'; catalogos: CatalogosB2B; orden: OrdenB2BListItem; open: boolean; onOpenChange: (v: boolean) => void }

export function OrdenFormDialog(props: Props) {
  const { mode, catalogos } = props
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modo create: estado interno. Modo edit: controlado desde afuera
  const [internalOpen, setInternalOpen] = useState(false)
  const open = mode === 'create' ? internalOpen : props.open
  const setOpen = (v: boolean) => {
    if (!v) setError(null)
    if (mode === 'create') setInternalOpen(v)
    else props.onOpenChange(v)
  }

  const orden = mode === 'edit' ? props.orden : undefined

  // ── Estado para selects con nombre visible / ID oculto ──
  const defaultProv = orden
    ? catalogos.proveedores.find(p => p.nombre_completo === orden.proveedor_nombre)
    : undefined
  const defaultCli = orden
    ? catalogos.clientesB2B.find(c => c.nombre_completo === orden.cliente_nombre)
    : undefined

  const [provNombre, setProvNombre] = useState(() => defaultProv?.nombre_completo ?? '')
  const [provId, setProvId] = useState(() => String(defaultProv?.id ?? ''))
  const [cliNombre, setCliNombre] = useState(() => defaultCli?.nombre_completo ?? '')
  const [cliId, setCliId] = useState(() => String(defaultCli?.id ?? ''))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('proveedor_id', provId)
    fd.set('cliente_b2b_id', cliId || '')
    fd.set('folio_proveedor', (e.currentTarget.querySelector<HTMLInputElement>('[name=folio_proveedor]')?.value ?? ''))
    fd.set('moneda', (e.currentTarget.querySelector<HTMLSelectElement>('[name=moneda]')?.value ?? 'USD'))
    fd.set('tipo_cambio', (e.currentTarget.querySelector<HTMLInputElement>('[name=tipo_cambio]')?.value ?? ''))
    fd.set('fecha_orden', (e.currentTarget.querySelector<HTMLInputElement>('[name=fecha_orden]')?.value ?? ''))
    fd.set('observaciones', (e.currentTarget.querySelector<HTMLTextAreaElement>('[name=observaciones]')?.value ?? ''))
    if (mode === 'edit') fd.set('orden_id', String(orden!.id))

    startTransition(async () => {
      const result = mode === 'create'
        ? await crearOrdenB2BAction(fd)
        : await actualizarOrdenB2BAction(fd)
      if (!result.success) { setError(result.error ?? 'Error.'); return }
      setOpen(false)
      if (mode === 'create' && result.id) router.push(`/ordenes-b2b/${result.id}`)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger solo en modo create — usa button nativo para evitar warning de Base UI */}
      {mode === 'create' && (
        <DialogTrigger
          render={
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 h-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" />
              Nueva Orden
            </button>
          }
        />
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Orden B2B' : `Editar Orden #${orden?.id}`}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}

        <form key={mode === 'edit' ? orden?.id ?? 'edit' : 'create'} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Select value={provNombre} onValueChange={(val) => { const v = val ?? ''; setProvNombre(v); const p = catalogos.proveedores.find(x => x.nombre_completo === v); setProvId(p?.id ? String(p.id) : '') }} required>
                <SelectTrigger data-testid="orden-proveedor-trigger" className="w-full"><SelectValue placeholder="Seleccionar..." className="truncate" /></SelectTrigger>
                <SelectContent>
                  {catalogos.proveedores.map((p) => (
                    <SelectItem key={p.id} value={p.nombre_completo}>{p.nombre_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente destino (opcional)</Label>
              <Select value={cliNombre || '_none'} onValueChange={(val) => { const v = val ?? ''; const isNone = v === '_none'; setCliNombre(isNone ? '' : v); const c = catalogos.clientesB2B.find(x => x.nombre_completo === v); setCliId(isNone ? '' : (c?.id ? String(c.id) : '')) }}>
                <SelectTrigger data-testid="orden-cliente-trigger" className="w-full"><SelectValue placeholder="Ninguno" className="truncate" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Ninguno</SelectItem>
                  {catalogos.clientesB2B.map((c) => (
                    <SelectItem key={c.id} value={c.nombre_completo}>{c.nombre_completo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Folio proveedor</Label>
              <Input name="folio_proveedor" placeholder="PO-2026-001" defaultValue={orden?.folio_proveedor ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select name="moneda" defaultValue={orden?.moneda ?? 'USD'}>
                  <SelectTrigger data-testid="orden-moneda-trigger" className="w-full"><SelectValue className="truncate" /></SelectTrigger>
                <SelectContent>
                  {MONEDAS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de cambio</Label>
              <Input type="number" step="0.01" name="tipo_cambio" defaultValue={orden?.tipo_cambio ?? ''} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de finalización de orden</Label>
              <Input
                type="datetime-local"
                name="fecha_orden"
                defaultValue={orden?.fecha_orden ? orden.fecha_orden.slice(0, 16) : ''}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea name="observaciones" rows={2} defaultValue={orden?.observaciones ?? ''} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Crear Orden' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
