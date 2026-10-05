// app/(admin)/despachos/[id]/DespachoDetalleContent.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, ESTADO_NOTA_COLORS } from '@/lib/constants'
import {
  ArrowLeft, AlertCircle, Check, X, Loader2, Truck, FileText,
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

  const nota = (despacho as { nota?: { id: number; numero_nota: string; estado_codigo: string; estado_nombre: string | null; fecha_confirmacion: string | null } | null }).nota ?? null
  const notaPendiente = nota && (nota.estado_codigo === 'PEND' || nota.estado_codigo === 'PROC')
  const notaColor = (nota && ESTADO_NOTA_COLORS[nota.estado_codigo]) ?? 'bg-gray-100 text-gray-800'

  const runAction = (fn: (id: number) => Promise<{ success: boolean; error?: string }>) => {
    setError(null)
    startTransition(async () => {
      const r = await fn(despacho.id)
      if (!r.success) { setError(r.error ?? 'Error.'); return }
      router.refresh()
    })
  }

  const handleRecibir = () => {
    const destino = despacho.bodega_destino?.nombre ?? 'destino'
    if (!confirm(`¿Confirmar el traslado ${nota?.numero_nota ?? ''}? Se moverá el stock a ${destino}.`)) return
    runAction(recibirDespachoAction)
  }

  const handleCancelar = () => {
    if (!confirm('¿Cancelar este despacho?')) return
    runAction(cancelarDespachoAction)
  }

  const totalCajas = despacho.detalles?.reduce((a, d) => a + (d.cantidad_cajas_solicitadas ?? 0), 0) ?? 0

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
          {despacho.estado !== 'Recibido' && despacho.estado !== 'Cancelado' && (
            <Button variant="outline" size="sm" onClick={handleCancelar} disabled={isPending}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
          )}
          {despacho.estado === 'Programado' && (
            <Button variant="outline" size="sm" onClick={() => runAction(confirmarSalidaDespachoAction)} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Truck className="h-3.5 w-3.5 mr-1" /> Confirmar salida
            </Button>
          )}
          {notaPendiente && despacho.estado !== 'Cancelado' && (
            <Button size="sm" onClick={handleRecibir} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Check className="h-3.5 w-3.5 mr-1" /> Confirmar traslado
            </Button>
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
              <p className="text-2xl font-black tabular-nums">{totalCajas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nota vinculada (referencia permanente) */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Nota de traslado vinculada
        </CardTitle></CardHeader>
        <CardContent>
          {!nota ? (
            <p className="text-sm text-muted-foreground">
              Sin nota vinculada (despacho histórico anterior al traslado único).
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold">{nota.numero_nota}</span>
                <Badge variant="secondary" className={`text-xs ${notaColor}`}>
                  {nota.estado_nombre ?? nota.estado_codigo}
                </Badge>
                {nota.fecha_confirmacion && (
                  <span className="text-xs text-muted-foreground">
                    Confirmada: <Fecha valor={nota.fecha_confirmacion} formato="fecha-hora" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={ADMIN_ROUTES.inventario.notaDetalle(nota.id)}>
                    Ver nota
                  </Link>
                </Button>
                {notaPendiente && despacho.estado !== 'Cancelado' && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={ADMIN_ROUTES.inventario.notaDetalle(nota.id)}>
                      Editar en notas
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
          {notaPendiente && (
            <p className="text-xs text-muted-foreground mt-3">
              Nota creada en pendiente (borrador): revisa la mercancía en notas. Al confirmarla se moverá el stock
              ({despacho.bodega_origen?.nombre ?? 'origen'} → {despacho.bodega_destino?.nombre ?? 'destino'}).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Productos (solo lectura: se edita en la nota) */}
      <Card>
        <CardHeader><CardTitle className="text-base">Productos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cajas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!despacho.detalles || despacho.detalles.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Sin productos
                  </TableCell>
                </TableRow>
              ) : (
                despacho.detalles.map((det: any) => (
                  <TableRow key={det.id}>
                    <TableCell className="font-mono text-xs">{det.producto_sku ?? '—'}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{det.producto_nombre ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{det.cantidad_cajas_solicitadas}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Solo lectura: las cantidades se editan en la nota vinculada.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
