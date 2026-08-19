// app/(admin)/catalogo/[id]/components/TabStock.tsx
import { Suspense } from 'react'
import type { fetchStockProductoPorBodegas } from '@/modules/catalogo/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Warehouse,
  Boxes,
  Package,
  MapPin,
  Layers,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react'
import { StockPronosticadoSection } from './StockPronosticadoSection'

export async function TabStock({
  productoId,
  skuBase,
  pzEnCaja,
  stockPromise,
}: {
  productoId: number
  skuBase: string
  pzEnCaja?: number | null
  stockPromise: ReturnType<typeof fetchStockProductoPorBodegas>
}) {
  const stockItems = await stockPromise

  // Cálculos rápidos de Stock Real
  const totalCajas = stockItems.reduce((acc, curr) => acc + curr.cajas, 0)
  const totalPiezasSueltas = stockItems.reduce((acc, curr) => acc + curr.piezas_sueltas, 0)
  const factorPz = pzEnCaja && pzEnCaja > 0 ? pzEnCaja : 0
  const totalPiezasEstimadas = totalCajas * factorPz + totalPiezasSueltas
  const bodegasConStock = stockItems.filter((i) => i.cajas > 0 || i.piezas_sueltas > 0).length

  return (
    <div className="space-y-6">
      {/* ── SECCIÓN 1: STOCK FÍSICO REAL INMEDIATO ─────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-primary" />
              Stock Físico por Bodega
            </h3>
            <p className="text-xs text-muted-foreground">
              Existencias reales consolidadas en todas las bodegas físicas y virtuales del sistema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {factorPz > 0 && (
              <Badge variant="outline" className="text-xs font-mono font-normal">
                {factorPz} pzs / caja
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {stockItems.length} bodega{stockItems.length !== 1 ? 's' : ''} asignada{stockItems.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* KPIs de Stock Real */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-card shadow-sm border-l-4 border-l-primary">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                Cajas Físicas
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {totalCajas.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground">En almacenes activos</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-blue-500" />
                Piezas Sueltas
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {totalPiezasSueltas.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground">Unidades abiertas</p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                Total de Piezas
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {factorPz > 0 ? totalPiezasEstimadas.toLocaleString() : '—'}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {factorPz > 0 ? `Equivalente a ${factorPz} pz/caja` : 'Sin factor de piezas'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-l-4 border-l-amber-500">
            <CardContent className="p-4 space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Warehouse className="h-3.5 w-3.5 text-amber-500" />
                Bodegas con Stock
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {bodegasConStock} <span className="text-xs font-normal text-muted-foreground">/ {stockItems.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Ubicaciones con existencias</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla Desglosada por Bodega */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
          {stockItems.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Warehouse className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">
                No hay registros de inventario para este producto en ninguna bodega.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Crea una Nota de Entrada o Ajuste para ingresar existencias iniciales.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium py-3 px-4">Bodega</th>
                    <th className="text-left font-medium py-3 px-3">Ciudad / Tipo</th>
                    <th className="text-left font-medium py-3 px-3">Pasillo / Ubicación</th>
                    <th className="text-right font-medium py-3 px-3">Cajas</th>
                    <th className="text-right font-medium py-3 px-3">Piezas Sueltas</th>
                    {factorPz > 0 && <th className="text-right font-medium py-3 px-3">Total Piezas</th>}
                    <th className="text-right font-medium py-3 px-4">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockItems.map((item) => {
                    const itemPiezas = item.cajas * factorPz + item.piezas_sueltas
                    const tieneExistencias = item.cajas > 0 || item.piezas_sueltas > 0

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/40 transition-colors ${
                          !tieneExistencias ? 'opacity-60 bg-muted/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.bodega_nombre}</span>
                            {item.bodega_codigo && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                ({item.bodega_codigo})
                              </span>
                            )}
                          </div>
                          {item.caja_codigo && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                              <Boxes className="h-3 w-3 text-muted-foreground/70" />
                              Caja: {item.caja_codigo} {item.caja_nombre_pack ? `(${item.caja_nombre_pack})` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {item.es_virtual ? (
                              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                                Virtual
                              </Badge>
                            ) : (
                              <span>{item.bodega_ciudad || '—'}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-mono">
                          {item.ubicacion_pasillo ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary/70" />
                              {item.ubicacion_pasillo}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-foreground">
                          {item.cajas.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {item.piezas_sueltas > 0 ? item.piezas_sueltas.toLocaleString() : '—'}
                        </td>
                        {factorPz > 0 && (
                          <td className="py-3 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                            {tieneExistencias ? itemPiezas.toLocaleString() : '0'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right text-muted-foreground">
                          {item.updated_at ? <Fecha valor={item.updated_at} formato="fecha" /> : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN 2: STOCK PRONOSTICADO / EN TRÁNSITO (ASYNC VIA SUSPENSE) ──── */}
      <Suspense fallback={<StockPronosticadoSkeleton />}>
        <StockPronosticadoSection productoId={productoId} pzEnCaja={pzEnCaja} />
      </Suspense>
    </div>
  )
}

function StockPronosticadoSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-3 w-96" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-36 rounded-lg" />
    </div>
  )
}
