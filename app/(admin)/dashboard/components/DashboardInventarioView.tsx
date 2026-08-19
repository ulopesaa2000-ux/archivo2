// app/(admin)/dashboard/components/DashboardInventarioView.tsx
import Link from 'next/link'
import type { InventarioDashboardData, DashboardPeriod } from '@/modules/dashboard/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, ESTADO_NOTA_LABELS, ESTADO_NOTA_COLORS, TIPO_MOVIMIENTO_COLORS, TIPO_MOVIMIENTO_ICONS } from '@/lib/constants'
import { 
  Package, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  Warehouse, 
  Boxes, 
  ArrowRight, 
  PlusCircle, 
  Layers
} from 'lucide-react'

interface DashboardInventarioViewProps {
  data: InventarioDashboardData
  periodo: DashboardPeriod
}

export function DashboardInventarioView({ data, periodo }: DashboardInventarioViewProps) {
  const { kpis, topBodegas, notasRecientes, entradasRecientes, bodegaNombre } = data

  const periodoLabel = periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'histórico'

  return (
    <div className="space-y-6">
      {/* ── KPIs de Inventario ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* 1. Notas creadas en el periodo */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notas {periodoLabel}
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.notasCreadasPeriodo}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{kpis.notasConfirmadasPeriodo} confirmadas</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Notas Pendientes */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notas Pendientes
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{kpis.notasPendientes}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Requieren confirmación operativa
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Entradas de Mercancía */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Entradas (ENT)
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-foreground">{kpis.entradasPeriodo}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.piezasIngresadasPeriodo.toLocaleString()} piezas ingresadas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Stock Global / de Bodega */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Stock Disponible
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-black text-foreground">
                  {kpis.totalCajasStock.toLocaleString()}
                </p>
                <span className="text-sm font-bold text-muted-foreground">cajas</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {kpis.totalPiezasStock.toLocaleString()} pzs · {kpis.totalProductosConStock} SKUs activos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Grid Principal de Datos ── */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        
        {/* Columna A: Entradas Recientes de Mercancía */}
        <Card className="border-border shadow-xs">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              <span>Entradas Recientes ({bodegaNombre})</span>
            </CardTitle>
            <Link
              href={ADMIN_ROUTES.inventario.notas}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {entradasRecientes.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No se registraron entradas en el período seleccionado.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {entradasRecientes.map((nota) => (
                  <div key={nota.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <Link
                        href={ADMIN_ROUTES.inventario.notaDetalle(nota.id)}
                        className="font-bold text-foreground hover:text-primary transition-colors block truncate"
                      >
                        {nota.folio}
                      </Link>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                        <span>{nota.bodega_nombre}</span>
                        <span>•</span>
                        <Fecha valor={nota.fecha_movimiento} formato="fecha" />
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{nota.total_piezas} pzs
                      </span>
                      <Badge className={ESTADO_NOTA_COLORS[nota.estado_id === 2 ? 'CONF' : nota.estado_id === 3 ? 'CANC' : 'PEND']}>
                        {ESTADO_NOTA_LABELS[nota.estado_id === 2 ? 'CONF' : nota.estado_id === 3 ? 'CANC' : 'PEND']}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Columna B: Top Bodegas con Más Movimientos */}
        <Card className="border-border shadow-xs">
          <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-primary" />
              <span>Bodegas con Mayor Actividad</span>
            </CardTitle>
            <Link
              href={ADMIN_ROUTES.inventario.bodegas}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver bodegas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {topBodegas.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No hay movimientos registrados en las bodegas durante este período.
              </div>
            ) : (
              <div className="space-y-3">
                {topBodegas.map((b, idx) => (
                  <div key={b.bodegaId} className="p-3 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-foreground truncate">{b.nombre}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.esVirtual ? 'Bodega Virtual' : 'Bodega Física'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">
                        {b.totalNotas} {b.totalNotas === 1 ? 'nota' : 'notas'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.totalPiezas.toLocaleString()} piezas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Atajos Operativos Rápidos ── */}
      <div className="p-4 rounded-2xl border border-border bg-card/60 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-foreground">Acciones Operativas de Inventario</p>
          <p className="text-[11px] text-muted-foreground">Crea notas de movimiento o consulta el stock en tiempo real.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={ADMIN_ROUTES.inventario.notaNueva}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nueva Nota</span>
          </Link>
          <Link
            href={ADMIN_ROUTES.inventario.stock}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-background hover:bg-muted transition-all"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Consultar Stock</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
