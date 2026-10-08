// app/(store)/mis-pedidos/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { PackageSearch } from 'lucide-react'
import { verifySessionOptional } from '@/lib/dal'
import { fetchOrdenesVenta } from '@/modules/ecommerce/queries'
import { MisPedidosLookup } from '@/components/store/pedidos/MisPedidosLookup'
import { Fecha } from '@/components/shared/Fecha'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Mis Pedidos | Catálogo IDOL NAVY',
  description: 'Consulta el estado de tus cotizaciones y pedidos con tu folio o tu cuenta.',
}

function isStaff(user: { rol_id?: number | null; rol?: { nombre?: string | null } | null } | null): boolean {
  if (!user) return false
  if (user.rol_id === 19) return false
  return !(user.rol?.nombre || '').toLowerCase().includes('cliente ecom')
}

function isCliente(user: { rol_id?: number | null; rol?: { nombre?: string | null } | null } | null): boolean {
  if (!user) return false
  return user.rol_id === 19 || (user.rol?.nombre || '').toLowerCase().includes('cliente ecom')
}

async function MisPedidosContent() {
  const session = await verifySessionOptional()

  if (session.isAuth && isStaff(session.user)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <p className="text-sm text-foreground font-medium">Eres parte del equipo operativo.</p>
        <p className="text-xs text-muted-foreground">Administra todas las cotizaciones desde el panel.</p>
        <Link
          href="/ecommerce/ordenes-venta"
          className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-6 rounded-xl text-sm font-semibold transition-colors"
        >
          Ir a Órdenes de Venta
        </Link>
      </div>
    )
  }

  if (session.isAuth && isCliente(session.user)) {
    const { ordenes } = await fetchOrdenesVenta({ page: 1 })
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-semibold text-foreground mb-4">Mis cotizaciones y pedidos</h2>
          {ordenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no tienes pedidos con tu cuenta.{' '}
              <Link href="/shop" className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline">
                Explorar catálogo
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {ordenes.slice(0, 20).map((orden) => (
                <li key={orden.id}>
                  <Link
                    href={`/mis-pedidos/${orden.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-sm text-foreground">{orden.numero_orden}</p>
                      <p className="text-xs text-muted-foreground">
                        <Fecha valor={orden.fecha_orden} formato="fecha" />
                        {' · '}
                        {orden.items_count} producto(s)
                      </p>
                    </div>
                    <Badge className="shrink-0">{orden.estado}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <MisPedidosLookup />
      </div>
    )
  }

  return <MisPedidosLookup />
}

export default function MisPedidosPage() {
  return (
    <div className="bg-background min-h-screen py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            <PackageSearch className="h-3.5 w-3.5" />
            Mis pedidos
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Sigue tu cotización
          </h1>
          <p className="text-sm text-muted-foreground">
            Con cuenta ves tus pedidos directo; sin cuenta, búscalos con tu folio y email.
          </p>
        </div>

        <Suspense
          fallback={<div className="h-64 rounded-2xl bg-muted animate-pulse" />}
        >
          <MisPedidosContent />
        </Suspense>
      </div>
    </div>
  )
}
