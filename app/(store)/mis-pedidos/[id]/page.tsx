// app/(store)/mis-pedidos/[id]/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { verifySessionOptional } from '@/lib/dal'
import { fetchOrdenVentaById } from '@/modules/ecommerce/queries'
import { OrdenDetalleView } from '@/components/store/pedidos/OrdenDetalleView'

export const metadata: Metadata = {
  title: 'Detalle de Pedido | Catálogo IDOL NAVY',
}

export default async function MisPedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ordenId = Number(id)
  if (!Number.isInteger(ordenId) || ordenId <= 0) notFound()

  // Sin sesión no hay detalle directo: usar el buscador con folio+email
  const session = await verifySessionOptional()
  if (!session.isAuth) redirect('/mis-pedidos')

  const user = session.user
  const esCliente = user?.rol_id === 19 || (user?.rol?.nombre || '').toLowerCase().includes('cliente ecom')
  if (!esCliente) redirect(`/ecommerce/ordenes-venta/${ordenId}`)

  const orden = await fetchOrdenVentaById(ordenId)
  if (!orden) notFound()

  return (
    <div className="bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/mis-pedidos" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a mis pedidos
        </Link>
        <OrdenDetalleView orden={orden} />
      </div>
    </div>
  )
}
