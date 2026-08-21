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
      {/* ── Acciones Operativas Principales (Arriba y Destacadas) ── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Acciones Operativas de Inventario
            </h2>
            <p className="text-xs text-muted-foreground">
              Acceso rápido para registrar movimientos o consultar existencias en tiempo real.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-background/80 text-muted-foreground border-border hidden sm:inline-flex">
            Bodega: {bodegaNombre}
          </Badge>
        </div>

        {/* Botones Grandes en Grid: 1 columna en móvil (grandes y táctiles) / 2 columnas en desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link
            href={ADMIN_ROUTES.inventario.notas}
            className="group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] border border-primary-foreground/10 overflow-hidden min-h-[72px] sm:min-h-[80px]"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-white/20 text-white shrink-0 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="text-left">
                <span className="text-base sm:text-lg font-black tracking-tight block leading-tight">
                  Notas de Inventario
                </span>
                <span className="text-xs text-primary-foreground/80 font-medium block mt-0.5">
                  Ver historial, crear nota o escanear OCR
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </Link>

          <Link
            href={ADMIN_ROUTES.inventario.stock}
            className="group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-card hover:bg-muted/80 text-foreground border-2 border-border/90 hover:border-primary/40 shadow-xs hover:shadow-md transition-all active:scale-[0.98] overflow-hidden min-h-[72px] sm:min-h-[80px]"
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform">
                <Package className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="text-left">
                <span className="text-base sm:text-lg font-black tracking-tight block leading-tight">
                  Consultar Stock
                </span>
                <span className="text-xs text-muted-foreground font-medium block mt-0.5">
                  Existencias por SKU y bodega
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0 ml-2" />
          </Link>
        </div>
      </div>

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
    </div>
  )
}
