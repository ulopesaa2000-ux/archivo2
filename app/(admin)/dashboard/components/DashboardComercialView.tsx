// app/(admin)/dashboard/components/DashboardComercialView.tsx
import Link from 'next/link'
import type { ComercialDashboardData } from '@/modules/dashboard/types'
import { Card, CardContent } from '@/components/ui/card'
import { ADMIN_ROUTES } from '@/lib/constants'
import { DashboardExpandableList } from './DashboardExpandableList'
import { 
  ShoppingCart, 
  Ship, 
  Package, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react'

interface DashboardComercialViewProps {
  data: ComercialDashboardData
  nivel: number
}

export function DashboardComercialView({ data, nivel }: DashboardComercialViewProps) {
  const { kpis, ultimasOrdenes, proximosContenedores } = data

  return (
    <div className="space-y-6">
      {/* Tarjetas de Métricas B2B */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Métricas: Órdenes */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {nivel === 5 ? 'Órdenes Asignadas' : 'Órdenes Pendientes'}
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.ordenesActivas}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" /> Órdenes activas en curso
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Métricas: Contenedores */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contenedores en Tránsito
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <Ship className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.contenedoresTransito}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Embarques activos asignados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Métricas: Cajas */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {nivel === 5 ? 'Cajas a Fabricar' : 'Total Cajas Solicitadas'}
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.cajasSolicitadas.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Producción de empaque total B2B
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Listados Expandibles */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Columna A: Últimas Órdenes */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Últimas Órdenes B2B
            </h2>
            <Link
              href={ADMIN_ROUTES.ordenesB2B.lista}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DashboardExpandableList items={ultimasOrdenes} type="orders" />
        </div>

        {/* Columna B: Próximos Embarques */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" />
              Contenedores Asociados
            </h2>
            <Link
              href={ADMIN_ROUTES.contenedores.lista}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DashboardExpandableList items={proximosContenedores} type="containers" />
        </div>
      </div>
    </div>
  )
}
