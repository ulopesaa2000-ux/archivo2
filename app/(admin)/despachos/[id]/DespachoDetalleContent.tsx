// app/(admin)/despachos/[id]/DespachoDetalleContent.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES } from '@/lib/constants'
import {
  ArrowLeft, AlertCircle, Check, X, Loader2, Truck,
} from 'lucide-react'
import {
  confirmarSalidaDespachoAction, recibirDespachoAction, cancelarDespachoAction,
} from '@/modules/despachos/actions'

type DespachoDetalle = NonNullable<Awaited<ReturnType<typeof import('@/modules/despachos/queries').fetchDespachoById>>>

const ESTADO_COLORS: Record<string, string> = {
  Programado: 'bg-yellow-100 text-yellow-800',
  'En Tránsito': 'bg-blue-100 text-blue-800',
  Recibido: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
}

export function DespachoDetalleContent({ despacho }: { despacho: DespachoDetalle }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [cantidades, setCantidades] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {}
    for (const det of despacho.detalles ?? []) {
      init[det.id] = det.cantidad_cajas_solicitadas ?? 0
    }
    return init
  })

  const handleConfirmarSalida = () => {
    setError(null)
    startTransition(async () => {
      const r = await confirmarSalidaDespachoAction(despacho.id)
      if (!r.success) { setError(r.error ?? 'Error.'); return }
      router.refresh()
    })
  }

  const handleRecibir = () => {
    setError(null)
    startTransition(async () => {
      const r = await recibirDespachoAction(despacho.id, cantidades)
      if (!r.success) { setError(r.error ?? 'Error.'); return }
      router.refresh()
    })
  }

  const handleCancelar = () => {
    if (!confirm('¿Cancelar este despacho?')) return
    setError(null)
    startTransition(async () => {
      const r = await cancelarDespachoAction(despacho.id)
      if (!r.success) { setError(r.error ?? 'Error.'); return }
      router.refresh()
    })
  }

  const totalSolicitadas = despacho.detalles?.reduce((a, d) => a + (d.cantidad_cajas_solicitadas ?? 0), 0) ?? 0
  const totalCargadas = despacho.detalles?.reduce((a, d) => a + (d.cantidad_cajas_cargadas ?? 0), 0) ?? 0
  const totalRecibidas = despacho.detalles?.reduce((a, d) => a + (d.cantidad_cajas_recibidas ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={ADMIN_ROUTES.despachos.lista}
            className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Despachos
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Despacho #{despacho.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {despacho.estado === 'Programado' && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelar} disabled={isPending}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleConfirmarSalida} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <Truck className="h-3.5 w-3.5 mr-1" /> Confirmar salida
              </Button>
            </>
          )}
          {despacho.estado === 'En Tránsito' && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelar} disabled={isPending}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleRecibir} disabled={isPending}>
                {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <Check className="h-3.5 w-3.5 mr-1" /> Recibir en bodega
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold">Despacho #{despacho.id}</h2>
            <Badge className={ESTADO_COLORS[despacho.estado ?? ''] ?? ''}>{despacho.estado}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Origen</span>
              <p className="font-semibold">{despacho.bodega_origen?.nombre ?? '—'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Destino</span>
              <p className="font-semibold">{despacho.bodega_destino?.nombre ?? '—'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Salida</span>
              <p><Fecha valor={despacho.fecha_real_salida ?? despacho.fecha_programada} formato="fecha" /></p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recepción</span>
              <p><Fecha valor={despacho.fecha_recepcion} formato="fecha" /></p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Chofer</span>
              <p>{despacho.chofer ?? '—'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Vehículo</span>
              <p>{despacho.vehiculo_info ?? '—'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cajas totales</span>
              <p className="text-2xl font-black tabular-nums">{totalSolicitadas}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recibidas</span>
              <p className="text-2xl font-black tabular-nums">{totalRecibidas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles */}
      <Card>
        <CardHeader><CardTitle className="text-base">Productos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Solicitadas</TableHead>
                <TableHead className="text-right">Cargadas</TableHead>
                <TableHead className="text-right">Recibidas</TableHead>
                {despacho.estado === 'En Tránsito' && <TableHead className="text-right w-24">Recibir</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!despacho.detalles || despacho.detalles.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={despacho.estado === 'En Tránsito' ? 6 : 5} className="text-center text-muted-foreground py-8">
                    Sin productos
                  </TableCell>
                </TableRow>
              ) : (
                despacho.detalles.map((det: any) => (
                  <TableRow key={det.id}>
                    <TableCell className="font-mono text-xs">{det.producto_sku ?? '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{det.producto_nombre ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{det.cantidad_cajas_solicitadas}</TableCell>
                    <TableCell className="text-right tabular-nums">{det.cantidad_cajas_cargadas ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{det.cantidad_cajas_recibidas ?? '—'}</TableCell>
                    {despacho.estado === 'En Tránsito' && (
                      <TableCell>
                        <Input
                          type="number" min={0} max={det.cantidad_cajas_solicitadas ?? 0}
                          value={cantidades[det.id] ?? det.cantidad_cajas_solicitadas ?? 0}
                          onChange={(e) => setCantidades(prev => ({ ...prev, [det.id]: parseInt(e.target.value) || 0 }))}
                          className="w-20 h-8 text-right ml-auto"
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
