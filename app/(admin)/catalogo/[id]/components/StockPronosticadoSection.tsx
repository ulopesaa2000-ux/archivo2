// app/(admin)/catalogo/[id]/components/StockPronosticadoSection.tsx
import { fetchStockPronosticadoProducto } from '@/modules/catalogo/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Boxes,
  Package,
  Calendar,
  AlertCircle,
  Warehouse,
} from 'lucide-react'
import Link from 'next/link'

export async function StockPronosticadoSection({
  productoId,
  pzEnCaja,
}: {
  productoId: number
  pzEnCaja?: number | null
}) {
  const stock = await fetchStockPronosticadoProducto(productoId)
  const factorPz = pzEnCaja && pzEnCaja > 0 ? pzEnCaja : 0

  const totalFisicoEquiv = stock.total_fisico_cajas * (factorPz || 1) + stock.total_fisico_piezas
  const entradasEquiv = stock.entradas_pendientes_cajas * (factorPz || 1) + stock.entradas_pendientes_piezas
  const salidasEquiv = stock.salidas_pendientes_cajas * (factorPz || 1) + stock.salidas_pendientes_piezas
  const pronosticadoEquiv = stock.disponible_pronosticado_cajas * (factorPz || 1) + stock.disponible_pronosticado_piezas

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Stock Pronosticado y Movimientos en Tránsito
          </h3>
          <p className="text-xs text-muted-foreground">
            Cálculo proyectado considerando notas pendientes de confirmación (compras, recepciones y salidas en curso).
          </p>
        </div>

        {stock.notas_pendientes.length > 0 ? (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 self-start sm:self-auto">
            <Clock className="h-3 w-3" />
            {stock.notas_pendientes.length} nota{stock.notas_pendientes.length !== 1 ? 's' : ''} pendiente{stock.notas_pendientes.length !== 1 ? 's' : ''}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 self-start sm:self-auto">
            Sin notas pendientes
          </Badge>
        )}
      </div>

      {/* Tarjetas de Proyección */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-muted/30 border-muted">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5" />
              Stock Físico Actual
            </span>
            <div className="text-xl font-bold font-mono text-foreground">
              {stock.total_fisico_cajas.toLocaleString()} <span className="text-xs font-normal text-muted-foreground font-sans">cajas</span>
            </div>
            {stock.total_fisico_piezas > 0 && (
              <div className="text-xs text-muted-foreground font-mono">
                + {stock.total_fisico_piezas.toLocaleString()} pzs sueltas
              </div>
            )}
            {factorPz > 0 && (
              <div className="text-[11px] text-muted-foreground/80 font-mono">
                ≈ {totalFisicoEquiv.toLocaleString()} pzs totales
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Entradas Pendientes
            </span>
            <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
              +{stock.entradas_pendientes_cajas.toLocaleString()} <span className="text-xs font-normal text-muted-foreground font-sans">cajas</span>
            </div>
            {stock.entradas_pendientes_piezas > 0 && (
              <div className="text-xs text-emerald-600/80 font-mono">
                + {stock.entradas_pendientes_piezas.toLocaleString()} pzs sueltas
              </div>
            )}
            {factorPz > 0 && entradasEquiv > 0 && (
              <div className="text-[11px] text-emerald-600/70 font-mono">
                ≈ +{entradasEquiv.toLocaleString()} pzs estimadas
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <ArrowDownRight className="h-3.5 w-3.5" />
              Salidas Comprometidas
            </span>
            <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-300">
              -{stock.salidas_pendientes_cajas.toLocaleString()} <span className="text-xs font-normal text-muted-foreground font-sans">cajas</span>
            </div>
            {stock.salidas_pendientes_piezas > 0 && (
              <div className="text-xs text-rose-600/80 font-mono">
                - {stock.salidas_pendientes_piezas.toLocaleString()} pzs sueltas
              </div>
            )}
            {factorPz > 0 && salidasEquiv > 0 && (
              <div className="text-[11px] text-rose-600/70 font-mono">
                ≈ -{salidasEquiv.toLocaleString()} pzs estimadas
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-primary flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Proyección Final
            </span>
            <div className="text-xl font-bold font-mono text-primary">
              {stock.disponible_pronosticado_cajas.toLocaleString()} <span className="text-xs font-normal text-muted-foreground font-sans">cajas</span>
            </div>
            {stock.disponible_pronosticado_piezas > 0 && (
              <div className="text-xs text-muted-foreground font-mono">
                + {stock.disponible_pronosticado_piezas.toLocaleString()} pzs sueltas
              </div>
            )}
            {factorPz > 0 && (
              <div className="text-[11px] text-primary/80 font-mono">
                ≈ {pronosticadoEquiv.toLocaleString()} pzs disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Notas Pendientes de este Producto */}
      {stock.notas_pendientes.length > 0 && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
          <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between">
            <span className="text-xs font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Notas de Inventario en Tránsito / Pendientes
            </span>
            <span className="text-[11px] text-muted-foreground">
              Mostrando {stock.notas_pendientes.length} movimiento{stock.notas_pendientes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium py-2.5 px-4">Nota</th>
                  <th className="text-left font-medium py-2.5 px-3">Tipo Movimiento</th>
                  <th className="text-left font-medium py-2.5 px-3">Origen / Destino</th>
                  <th className="text-right font-medium py-2.5 px-3">Cajas</th>
                  <th className="text-right font-medium py-2.5 px-3">Piezas</th>
                  <th className="text-right font-medium py-2.5 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stock.notas_pendientes.map((nota) => {
                  const esEntrada = nota.afecta_inventario > 0
                  const esSalida = nota.afecta_inventario < 0

                  return (
                    <tr key={nota.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <Link
                          href={`/inventario/notas/${nota.id}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {nota.numero_nota}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            esEntrada
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                              : esSalida
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]'
                          }
                        >
                          {nota.tipo_nombre || nota.tipo_codigo}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-muted-foreground/70" />
                          <span>{nota.bodega_origen_nombre}</span>
                          {nota.bodega_destino_nombre && (
                            <>
                              <span className="text-muted-foreground/40">→</span>
                              <span>{nota.bodega_destino_nombre}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {esEntrada && '+'}
                        {esSalida && '-'}
                        {nota.cajas.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                        {nota.piezas_sueltas > 0 ? nota.piezas_sueltas.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">
                        <Fecha valor={nota.fecha_nota} formato="fecha" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
