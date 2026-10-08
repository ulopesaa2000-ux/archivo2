// app/(admin)/ecommerce/ordenes-venta/[id]/CotizacionEditor.tsx
'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { actualizarItemOrden, eliminarItemOrden } from '@/modules/ecommerce/actions'
import { precioPorCaja } from '@/modules/ecommerce/utils'
import type { OrdenItemExtendido } from '@/modules/ecommerce/types'

interface FilaEdicion {
  cajas: string
  factor: string
  precio: string
}

interface FilaResuelta {
  valida: boolean
  pz: number
  factor: number | null
  cajas: number | null
  precio: number
  precioCaja: number | null
  subtotal: number
}

function mxn(valor: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(valor)
}

function filaInicial(item: OrdenItemExtendido): FilaEdicion {
  const factor = item.pz_por_caja ?? item.pz_en_caja_default ?? null
  if (factor && factor > 0) {
    const cajas = item.cantidad / factor
    return {
      cajas: String(Number.isInteger(cajas) ? cajas : Number(cajas.toFixed(2))),
      factor: String(factor),
      precio: String(item.precio_unitario),
    }
  }
  return { cajas: '', factor: '', precio: String(item.precio_unitario) }
}

function resolverFila(item: OrdenItemExtendido, fila: FilaEdicion): FilaResuelta {
  const precio = Number(fila.precio)
  const factorRaw = fila.factor.trim() === '' ? null : Math.floor(Number(fila.factor))
  const factor = factorRaw !== null && Number.isInteger(factorRaw) && factorRaw >= 1 ? factorRaw : null

  if (!Number.isFinite(precio) || precio < 0) {
    return { valida: false, pz: 0, factor, cajas: null, precio: 0, precioCaja: null, subtotal: 0 }
  }

  if (factor === null) {
    return { valida: false, pz: 0, factor: null, cajas: null, precio, precioCaja: null, subtotal: 0 }
  }

  const cajasRaw = fila.cajas.trim() === '' ? NaN : Number(fila.cajas)
  if (!Number.isFinite(cajasRaw) || cajasRaw < 1) {
    return { valida: false, pz: 0, factor, cajas: null, precio, precioCaja: precioPorCaja(precio, factor), subtotal: 0 }
  }

  const pz = Math.floor(cajasRaw) * factor
  const precioCaja = precioPorCaja(precio, factor) ?? 0
  return { valida: true, pz, factor, cajas: Math.floor(cajasRaw), precio, precioCaja, subtotal: pz * precio }
}

export const COTIZACION_DIRTY_EVENT = 'inv_cotizacion_dirty'

export function CotizacionEditor({
  ordenId,
  items,
  bloqueada = false,
}: {
  ordenId: number
  items: OrdenItemExtendido[]
  bloqueada?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filas, setFilas] = useState<Record<number, FilaEdicion>>(() =>
    Object.fromEntries(items.map((item) => [item.id, filaInicial(item)]))
  )

  // Cálculo en vivo: todo se edita en la interfaz antes de guardar el borrador.
  // Sucia = difiere de lo guardado en DB; al refrescar, items trae lo nuevo y se limpia sola.
  const { totalVivo, filasSucias } = useMemo(() => {
    let total = 0
    const sucias: number[] = []
    for (const item of items) {
      const ini = filaInicial(item)
      const fila = filas[item.id] ?? ini
      const r = resolverFila(item, fila)
      if (r.valida) total += r.subtotal
      if (fila.cajas !== ini.cajas || fila.factor !== ini.factor || fila.precio !== ini.precio) {
        sucias.push(item.id)
      }
    }
    return { totalVivo: total, filasSucias: sucias }
  }, [items, filas])

  const setFila = (itemId: number, patch: Partial<FilaEdicion>) => {
    if (bloqueada) return
    setFilas((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }))
  }

  // Avisa al cierre cuántas filas están sin guardar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(COTIZACION_DIRTY_EVENT, { detail: filasSucias.length }))
  }, [filasSucias])

  const guardarBorrador = () => {
    if (bloqueada || filasSucias.length === 0) return
    startTransition(async () => {
      for (const itemId of filasSucias) {
        const item = items.find((i) => i.id === itemId)
        const fila = filas[itemId]
        if (!item || !fila) continue
        const r = resolverFila(item, fila)
        if (!r.valida) {
          toast.error(`Revisa cajas, pz por caja y precio de "${item.producto_nombre}"`)
          return
        }
        const res = await actualizarItemOrden(ordenId, itemId, r.pz, r.precio, r.factor)
        if (!res.success) {
          toast.error(res.error || `Error guardando partida #${itemId}`)
          return
        }
      }
      toast.success(`Borrador guardado (${filasSucias.length} partida(s))`)
      router.refresh()
    })
  }
  const eliminarPartida = (itemId: number) => {
    if (bloqueada) return
    if (!window.confirm('¿Eliminar esta partida de la cotización?')) return
    startTransition(async () => {
      const res = await eliminarItemOrden(ordenId, itemId)
      if (res.success) {
        toast.success('Partida eliminada')
        router.refresh()
      } else {
        toast.error(res.error || 'No se pudo eliminar')
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Esta orden no tiene partidas registradas.
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Paso 1 — Partidas de la cotización ({items.length})</h2>
        <Button onClick={guardarBorrador} disabled={bloqueada || isPending || filasSucias.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? 'Guardando...' : `Guardar borrador${filasSucias.length > 0 ? ` (${filasSucias.length})` : ''}`}
        </Button>
      </div>
      {bloqueada && (
        <p className="text-xs font-medium text-muted-foreground border border-border rounded-xl px-3 py-2 bg-muted/50">
          Nota cerrada: las partidas son de solo lectura. Rastreo y hoja PDF siguen disponibles.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        El cliente pide en cajas: edita cajas, pz por caja y precio unitario en vivo — el precio por caja y el total se recalculan al instante. En base de datos se guarda pz + factor por partida, sin tocar el catálogo.
      </p>

      <div className="space-y-3">
        {items.map((item) => {
          const fila = filas[item.id] ?? filaInicial(item)
          const r = resolverFila(item, fila)
          const sucia = filasSucias.includes(item.id)

          return (
            <div key={item.id} className={`rounded-xl border p-3 space-y-2.5 ${sucia ? 'border-amber-500/60 bg-amber-500/5' : 'border-border'}`}>
              <div className="flex gap-3 items-center">
                <div className="relative w-12 h-14 shrink-0 rounded-lg overflow-hidden bg-muted">
                  {item.imagen ? (
                    <Image src={item.imagen} alt={item.producto_nombre} fill className="object-cover" sizes="48px" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] text-muted-foreground">Sin foto</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" title={item.producto_nombre}>{item.producto_nombre}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {item.sku_completo}{item.talla ? ` · ${item.talla}` : ''}{item.color ? ` · ${item.color}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-600 hover:text-red-700 shrink-0"
                  onClick={() => eliminarPartida(item.id)}
                  disabled={bloqueada || isPending}
                  title="Eliminar partida"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-[10px]">Cajas</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={fila.cajas}
                    onChange={(e) => setFila(item.id, { cajas: e.target.value })}
                    disabled={bloqueada || isPending}
                    className="h-8 w-20 text-xs"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px]">Pz por caja</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={fila.factor}
                    placeholder={item.pz_en_caja_default ? String(item.pz_en_caja_default) : '25'}
                    onChange={(e) => setFila(item.id, { factor: e.target.value })}
                    disabled={bloqueada || isPending}
                    className="h-8 w-24 text-xs"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px]">Precio unit ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={fila.precio}
                    onChange={(e) => setFila(item.id, { precio: e.target.value })}
                    disabled={bloqueada || isPending}
                    className="h-8 w-28 text-xs"
                  />
                </div>
                <div className="ml-auto text-right text-xs leading-relaxed">
                  {r.cajas !== null && r.factor !== null ? (
                    <p className="text-muted-foreground">
                      {r.cajas} cajas × {r.factor} pz · {mxn(r.precio)}/pz = <strong className="text-foreground">{mxn(r.precioCaja ?? 0)}/caja</strong>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Define cajas y pz por caja</p>
                  )}
                  <p className="text-sm font-bold">{mxn(r.subtotal)}</p>
                </div>
              </div>

              {!r.valida && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Fila sin cambios válidos: se ignora en el total hasta corregirla.
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between font-bold border-t border-border pt-4">
        <span>Total en vivo</span>
        <span className="text-emerald-700 dark:text-emerald-400">{mxn(totalVivo)}</span>
      </div>
    </div>
  )
}
