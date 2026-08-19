// app/(admin)/dashboard/components/DashboardGeneralView.tsx
import Link from 'next/link'
import type { 
  ComercialDashboardData, 
  InventarioDashboardData, 
  EcommerceDashboardData, 
  CatalogoDashboardData,
  DashboardPeriod 
} from '@/modules/dashboard/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ADMIN_ROUTES } from '@/lib/constants'
import { 
  Building2, 
  Package, 
  ShoppingCart, 
  Store, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Boxes,
  Warehouse,
  Shirt,
  UserCheck,
  Baby,
  Tag,
  Layers
} from 'lucide-react'

interface DashboardGeneralViewProps {
  comercial: ComercialDashboardData
  inventario: InventarioDashboardData
  ecommerce: EcommerceDashboardData
  catalogo?: CatalogoDashboardData
  periodo: DashboardPeriod
}

export function DashboardGeneralView({
  comercial,
  inventario,
  ecommerce,
  catalogo,
  periodo,
}: DashboardGeneralViewProps) {
  const periodoLabel = periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'histórico'

  return (
    <div className="space-y-6">
      {/* ── Resumen 360 en 3 Columnas Temáticas ── */}
      <div className="grid gap-6 lg:grid-cols-3 items-stretch">
        
        {/* Pilar 1: Inventario y Bodegas */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Package className="w-4 h-4 text-emerald-500" />
                  <span>Inventario & Bodegas</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {inventario.bodegaNombre}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Notas {periodoLabel}</p>
                  <p className="text-2xl font-black text-foreground mt-1">{inventario.kpis.notasCreadasPeriodo}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Pendientes</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{inventario.kpis.notasPendientes}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Stock Total Disponible:</span>
                  <span className="font-bold text-foreground">
                    {inventario.kpis.totalCajasStock.toLocaleString()} cajas ({inventario.kpis.totalPiezasStock.toLocaleString()} pzs)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">SKUs con Existencia:</span>
                  <span className="font-bold text-foreground">{inventario.kpis.totalProductosConStock}</span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <Link
              href={ADMIN_ROUTES.inventario.notas}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all"
            >
              <span>Ver Inventario Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Pilar 2: Comercial y B2B */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span>Operación B2B</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  Comercial
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Órdenes Activas</p>
                  <p className="text-2xl font-black text-foreground mt-1">{comercial.kpis.ordenesActivas}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Contenedores</p>
                  <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{comercial.kpis.contenedoresTransito}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Cajas Solicitadas B2B:</span>
                  <span className="font-bold text-foreground">{comercial.kpis.cajasSolicitadas.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estado de Envíos:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">En seguimiento</span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <Link
              href={ADMIN_ROUTES.ordenesB2B.lista}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all"
            >
              <span>Ver Órdenes B2B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* Pilar 3: E-commerce y Ventas Online */}
        <Card className="border-border shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Store className="w-4 h-4 text-amber-500" />
                  <span>E-commerce & Tienda</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  Online
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Cotizaciones</p>
                  <p className="text-2xl font-black text-foreground mt-1">{ecommerce.kpis.ordenesPeriodo}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold">Por Atender</p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{ecommerce.kpis.ordenesPendientes}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Productos en Catálogo:</span>
                  <span className="font-bold text-foreground">{ecommerce.kpis.totalProductosWeb}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Prendas en Promoción:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{ecommerce.kpis.productosEnOferta}</span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <Link
              href={ADMIN_ROUTES.ecommerce.ordenesVenta}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all"
            >
              <span>Ver Cotizaciones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>

      {/* ── Sección Especial: Resumen de Catálogo y Existencias por Género ── */}
      {catalogo && (
        <Card className="border-border shadow-xs overflow-hidden">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-primary" />
                  <span>Resumen de Catálogo & Existencias por Género</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Desglose de SKUs activos y existencias físicas (≥ 1 caja) en {catalogo.bodegaNombre}.
                </p>
              </div>

              <Link
                href="/dashboard?vista=catalogo"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <span>Ver Catálogo Detallado</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4">
            {/* Grid de Géneros */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {catalogo.resumenGeneros.map((gen) => {
                const isDama = gen.genero === 'Dama'
                const isCaballero = gen.genero === 'Caballero'
                const isInfantil = gen.genero === 'Infantil'

                return (
                  <div 
                    key={gen.genero}
                    className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isDama && <UserCheck className="w-3.5 h-3.5 text-pink-500" />}
                        {isCaballero && <UserCheck className="w-3.5 h-3.5 text-blue-500" />}
                        {isInfantil && <Baby className="w-3.5 h-3.5 text-amber-500" />}
                        {!isDama && !isCaballero && !isInfantil && <Layers className="w-3.5 h-3.5 text-indigo-500" />}
                        <span className="font-bold text-xs text-foreground">{gen.genero}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {gen.totalSKUs} SKUs
                      </Badge>
                    </div>

                    <div className="pt-1 border-t border-border/50 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Con existencias:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {gen.totalSKUsConStock} SKUs
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total cajas:</span>
                        <span className="font-bold text-foreground">
                          {gen.totalCajas.toLocaleString()} cjs
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Top Chamarras Dama Destacado */}
            {catalogo.topChamarrasDama.length > 0 && (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Chamarras Dama con Más Existencias
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                    Top 5
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 pt-1">
                  {catalogo.topChamarrasDama.slice(0, 5).map((prod, idx) => (
                    <Link
                      key={prod.id}
                      href={ADMIN_ROUTES.catalogo.detalle(prod.id)}
                      className="p-2.5 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors block text-xs space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {prod.sku_base}
                        </span>
                        <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {prod.nombre || prod.descripcion || 'Sin descripción'}
                      </p>
                      <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {prod.cajas} cjs
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ≈ {prod.piezas} pzs
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
