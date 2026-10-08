// app/(admin)/ecommerce/ordenes-venta/[id]/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { fetchOrdenVentaById } from '@/modules/ecommerce/queries'
import { OrdenDetalleView } from '@/components/store/pedidos/OrdenDetalleView'
import { CotizacionEditor } from './CotizacionEditor'
import { NotasVinculadas } from './NotasVinculadas'
import { EstadoFinalButtons } from './EstadoFinalButtons'
import { EstadoOrdenForm } from './EstadoOrdenForm'
import { ResumenPDFButton } from './ResumenPDFButton'
import { CabeceraAcciones } from './CabeceraAcciones'

export const metadata: Metadata = {
  title: 'Detalle de Orden de Venta',
}

const ESTADOS_CIERRE = ['aprobada', 'cancelado', 'entregado', 'convertida']

async function OrdenDetalleContent({ id }: { id: number }) {
  const orden = await fetchOrdenVentaById(id)
  if (!orden) notFound()
  const bloqueada = ESTADOS_CIERRE.includes(orden.estado)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orden #{orden.id}</h1>
          <p className="text-muted-foreground">Detalle y gestión operativa de la cotización.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ResumenPDFButton orden={orden} />
          <CabeceraAcciones ordenId={orden.id} estado={orden.estado} />
        </div>
      </div>

      {/* Datos que puso el cliente */}
      <OrdenDetalleView orden={orden} mostrarItems={false} />

      {/* Productos de interés: cajas, pz por caja y precio con cálculo en vivo */}
      <CotizacionEditor ordenId={orden.id} items={orden.items} bloqueada={bloqueada} />

      {/* Solo sus notas creadas desde este folio, con link directo */}
      <NotasVinculadas folio={orden.numero_orden} />

      {/* Botones especiales de cierre */}
      <EstadoFinalButtons ordenId={orden.id} estado={orden.estado} />

      {/* Rastreo, conversión B2B y cambios de estado intermedios */}
      <EstadoOrdenForm
        ordenId={orden.id}
        estadoActual={orden.estado}
        rastreoActual={orden.numero_rastreo}
      />
    </div>
  )
}

export default async function OrdenVentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ordenId = Number(id)
  if (!Number.isInteger(ordenId) || ordenId <= 0) notFound()

  return (
    <div className="space-y-6">
      <Link href="/ecommerce/ordenes-venta" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a órdenes
      </Link>

      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded-lg" />}>
        <OrdenDetalleContent id={ordenId} />
      </Suspense>
    </div>
  )
}
