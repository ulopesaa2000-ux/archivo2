// app/(admin)/dashboard/components/DashboardEcommerceView.tsx
import Link from 'next/link'
import type { EcommerceDashboardData, DashboardPeriod } from '@/modules/dashboard/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES } from '@/lib/constants'
import { 
  ShoppingCart, 
  Tag, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Store, 
  FileText,
  DollarSign
} from 'lucide-react'

interface DashboardEcommerceViewProps {
  data: EcommerceDashboardData
  periodo: DashboardPeriod
}

export function DashboardEcommerceView({ data, periodo }: DashboardEcommerceViewProps) {
  const { kpis, ordenesRecientes } = data

  const periodoLabel = periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'histórico'

  return (
    <div className="space-y-6">
      {/* ── KPIs de Ecommerce ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* 1. Productos Publicados */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Catálogo Web
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.totalProductosWeb}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>{kpis.productosEnOferta} en promoción</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Cotizaciones / Órdenes del Periodo */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cotizaciones {periodoLabel}
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.ordenesPeriodo}</p>
              <p className="text-xs text-muted-foreground mt-1">
                solicitudes recibidas en la tienda
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Cotizaciones Pendientes */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Por Atender
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{kpis.ordenesPendientes}</p>
              <p className="text-xs text-muted-foreground mt-1">
                pendientes de contacto o confirmación
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Monto Cotizado */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Monto {periodoLabel}
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">
                ${kpis.montoVentasPeriodo.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                valor estimado de cotizaciones
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Grid de Cotizaciones Recientes & Estado del Catálogo ── */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        
        {/* Columna 1 y 2: Últimas Cotizaciones Recibidas */}
        <Card className="border-border shadow-xs lg:col-span-2">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span>Cotizaciones y Pedidos Recientes</span>
            </CardTitle>
            <Link
              href={ADMIN_ROUTES.ecommerce.ordenesVenta}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {ordenesRecientes.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No hay cotizaciones registradas en este período.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {ordenesRecientes.map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{ord.nombre_cliente}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ord.numero_orden}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                        <span>{ord.email_cliente}</span>
                        <span>•</span>
                        <Fecha valor={ord.created_at || ord.fecha_orden} formato="fecha" />
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-foreground">
                        ${ord.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5 capitalize">
                        {ord.estado}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna 3: Resumen del Catálogo Web */}
        <Card className="border-border shadow-xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <span>Estado del Catálogo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-foreground">Productos Activos</span>
              </div>
              <span className="font-bold text-sm text-foreground">{kpis.totalProductosWeb}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">En Promoción</span>
              </div>
              <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{kpis.productosEnOferta}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-foreground">Destacados</span>
              </div>
              <span className="font-bold text-sm text-foreground">{kpis.productosDestacados}</span>
            </div>

            <div className="pt-2 border-t border-border">
              <Link
                href={ADMIN_ROUTES.ecommerce.productosWeb}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              >
                <span>Administrar Catálogo Web</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Atajos Ecommerce ── */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-foreground">Gestión de Tienda Pública</p>
          <p className="text-[11px] text-muted-foreground">Configura precios web, banners y revisa cotizaciones entrantes.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/inicio"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-background hover:bg-muted transition-all"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Ver Tienda Online ↗</span>
          </Link>
          <Link
            href={ADMIN_ROUTES.ecommerce.ordenesVenta}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ver Cotizaciones</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
