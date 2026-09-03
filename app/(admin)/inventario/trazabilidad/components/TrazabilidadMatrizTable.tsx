// app/(admin)/inventario/trazabilidad/components/TrazabilidadMatrizTable.tsx
'use client'

import React, { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Layers,
  Package,
  Route,
  ArrowRight,
  ArrowLeftRight,
  Warehouse,
  TrendingDown,
  TrendingUp,
  MapPin,
  ExternalLink
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { FilaTrazabilidadMatriz } from '@/modules/inventario/trazabilidad'
import { TrazabilidadTimelineDrawer } from './TrazabilidadTimelineDrawer'

interface Props {
  filas: FilaTrazabilidadMatriz[]
  ciudades: string[]
  agruparPor: 'familia' | 'producto'
  fechaDesde: string
  fechaHasta: string
}

export function TrazabilidadMatrizTable({
  filas,
  ciudades,
  agruparPor,
  fechaDesde,
  fechaHasta,
}: Props) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())

  // Estado para el modal de timeline individual
  const [timelineProduct, setTimelineProduct] = useState<{
    id: number
    sku: string
    descripcion?: string
    familia?: string
  } | null>(null)

  const toggleFamily = (famId: string) => {
    setExpandedFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(famId)) next.delete(famId)
      else next.add(famId)
      return next
    })
  }

  // Filtrar ciudades que tengan al menos algún movimiento o stock en las filas visibles para no saturar columnas vacías
  const ciudadesRelevantes = ciudades.filter((c) =>
    filas.some(
      (f) =>
        (f.salidas_por_ciudad[c] || 0) > 0 ||
        (f.stock_por_ciudad[c] || 0) > 0
    )
  )

  const openTimeline = (item: FilaTrazabilidadMatriz) => {
    if (item.producto_id) {
      setTimelineProduct({
        id: item.producto_id,
        sku: item.sku_base || '',
        descripcion: item.descripcion,
        familia: item.familia,
      })
    } else if (item.skus && item.skus.length > 0) {
      // Si se hace clic en una familia, abre el primer SKU de la familia o el más representativo
      const primerSku = item.skus[0]
      if (primerSku.producto_id) {
        setTimelineProduct({
          id: primerSku.producto_id,
          sku: primerSku.sku_base || item.familia,
          descripcion: primerSku.descripcion,
          familia: item.familia,
        })
      }
    }
  }

  return (
    <div className="space-y-3">
      
      {/* Contenedor de Tabla con Scroll Horizontal Responsivo */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/80 backdrop-blur-xs sticky top-0 z-20 border-b border-border text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              <tr>
                <th className="py-3 px-4 min-w-[260px] sticky left-0 z-30 bg-muted/95 backdrop-blur-xs">
                  {agruparPor === 'familia' ? 'Familia de Producto' : 'Producto / SKU'}
                </th>
                <th className="py-3 px-3 text-right min-w-[85px]">Stock Inicial</th>
                <th className="py-3 px-3 text-right min-w-[85px] text-emerald-600 dark:text-emerald-400">
                  Entradas (+)
                </th>
                
                {/* Columnas dinámicas de Salidas por Ciudad */}
                {ciudadesRelevantes.map((cd) => (
                  <th key={`head-sal-${cd}`} className="py-3 px-3 text-right min-w-[95px] text-red-600 dark:text-red-400">
                    Ventas {cd}
                  </th>
                ))}

                <th className="py-3 px-3 text-right min-w-[90px] font-black text-red-600 dark:text-red-400 bg-red-500/5">
                  Total Salidas
                </th>
                <th className="py-3 px-3 text-center min-w-[140px] text-blue-600 dark:text-blue-400">
                  Flujo Traspasos
                </th>
                <th className="py-3 px-3 text-right min-w-[95px] font-black bg-muted/40">
                  Stock Actual
                </th>
                <th className="py-3 px-3 text-center min-w-[75px]">
                  Kardex
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={8 + ciudadesRelevantes.length} className="text-center py-12 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">No se encontraron productos o familias</p>
                    <p className="text-xs">Prueba ajustando los filtros de búsqueda o ampliando el rango de fechas.</p>
                  </td>
                </tr>
              ) : (
                filas.map((fila) => {
                  const isExpanded = expandedFamilies.has(fila.id)
                  const hasSkus = Boolean(fila.skus && fila.skus.length > 0)

                  return (
                    <React.Fragment key={fila.id}>
                      {/* Fila Principal (Familia o Producto) */}
                      <tr className={`transition-colors hover:bg-muted/40 ${
                        hasSkus ? 'bg-muted/15 font-medium' : ''
                      }`}>
                        
                        {/* Columna Sticky: Nombre / Familia con botón expander */}
                        <td className="py-2.5 px-4 sticky left-0 z-10 bg-card/95 backdrop-blur-xs border-r border-border/40">
                          <div className="flex items-center gap-2">
                            {hasSkus ? (
                              <button
                                type="button"
                                onClick={() => toggleFamily(fila.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 shrink-0" />
                            )}

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground text-xs">
                                  {fila.sku_base || fila.familia}
                                </span>
                                {hasSkus && fila.descripcion && (
                                  <span className="text-[11px] font-medium text-muted-foreground/90 italic uppercase tracking-tight">
                                    {fila.descripcion}
                                  </span>
                                )}
                                {hasSkus && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                    {fila.skus?.length} SKUs
                                  </Badge>
                                )}
                              </div>
                              {!hasSkus && fila.descripcion && (
                                <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                                  {fila.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Stock Inicial */}
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          {fila.stock_inicial > 0 ? fila.stock_inicial : '-'}
                        </td>

                        {/* Entradas */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {fila.total_entradas > 0 ? `+${fila.total_entradas}` : '-'}
                        </td>

                        {/* Salidas por Ciudad Relevante */}
                        {ciudadesRelevantes.map((cd) => {
                          const salCd = fila.salidas_por_ciudad[cd] || 0
                          return (
                            <td key={`cell-sal-${fila.id}-${cd}`} className="py-2.5 px-3 text-right font-mono text-xs">
                              {salCd > 0 ? (
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  -{salCd}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </td>
                          )
                        })}

                        {/* Total Salidas */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-red-600 dark:text-red-400 bg-red-500/5">
                          {fila.total_salidas > 0 ? `-${fila.total_salidas}` : '-'}
                        </td>

                        {/* Flujo de Traspasos Inter-Ciudad */}
                        <td className="py-2.5 px-3 text-center">
                          {fila.traspasos_flujo.length === 0 ? (
                            <span className="text-muted-foreground/50">-</span>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="cursor-pointer font-mono text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 hover:bg-blue-500/20"
                                  >
                                    <ArrowLeftRight className="w-2.5 h-2.5" />
                                    {fila.total_traspasos} cj ({fila.traspasos_flujo.length} mov)
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="p-2.5 text-xs max-w-xs space-y-1">
                                  <p className="font-bold border-b border-border pb-1">
                                    Traspasos en el período:
                                  </p>
                                  {fila.traspasos_flujo.slice(0, 4).map((t, tIdx) => (
                                    <div key={tIdx} className="flex items-center gap-1.5 text-[11px]">
                                      <span className="font-semibold">{t.origen_ciudad}</span>
                                      <ArrowRight className="w-3 h-3 text-blue-500" />
                                      <span className="font-semibold">{t.destino_ciudad}</span>
                                      <strong className="ml-auto font-mono text-primary">
                                        {t.cajas} cj
                                      </strong>
                                    </div>
                                  ))}
                                  {fila.traspasos_flujo.length > 4 && (
                                    <p className="text-[10px] text-muted-foreground italic pt-1">
                                      + {fila.traspasos_flujo.length - 4} movimientos más...
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </td>

                        {/* Stock Actual */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-xs bg-muted/20">
                          {fila.stock_actual > 0 ? (
                            <span className="text-foreground">{fila.stock_actual} cj</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>

                        {/* Botón Timeline / Kardex */}
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTimeline(fila)}
                            className="h-7 px-2 text-[11px] gap-1 hover:bg-primary/10 hover:text-primary"
                            title="Ver Línea de Tiempo de este producto"
                          >
                            <Route className="w-3.5 h-3.5" />
                          </Button>
                        </td>

                      </tr>

                      {/* Sub-Filas (SKUs si la familia está expandida) */}
                      {hasSkus && isExpanded && fila.skus?.map((sku) => (
                        <tr
                          key={sku.id}
                          className="bg-muted/5 hover:bg-muted/20 transition-colors text-[11px]"
                        >
                          <td className="py-2 px-4 pl-9 sticky left-0 z-10 bg-card/95 backdrop-blur-xs border-r border-border/40">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                              <span className="font-mono font-bold text-foreground">
                                {sku.sku_base}
                              </span>
                              {sku.descripcion && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                                  {sku.descripcion}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Stock Inicial */}
                          <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                            {sku.stock_inicial > 0 ? sku.stock_inicial : '-'}
                          </td>

                          {/* Entradas */}
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {sku.total_entradas > 0 ? `+${sku.total_entradas}` : '-'}
                          </td>

                          {/* Salidas por Ciudad */}
                          {ciudadesRelevantes.map((cd) => {
                            const salCd = sku.salidas_por_ciudad[cd] || 0
                            return (
                              <td key={`sub-sal-${sku.id}-${cd}`} className="py-2 px-3 text-right font-mono text-[11px]">
                                {salCd > 0 ? (
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    -{salCd}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">-</span>
                                )}
                              </td>
                            )
                          })}

                          {/* Total Salidas */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/5">
                            {sku.total_salidas > 0 ? `-${sku.total_salidas}` : '-'}
                          </td>

                          {/* Traspasos */}
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                            {sku.total_traspasos > 0 ? `${sku.total_traspasos} cj` : '-'}
                          </td>

                          {/* Stock Actual */}
                          <td className="py-2 px-3 text-right font-mono font-semibold bg-muted/10">
                            {sku.stock_actual > 0 ? `${sku.stock_actual} cj` : '0'}
                          </td>

                          {/* Botón Kardex del SKU */}
                          <td className="py-2 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTimeline(sku)}
                              className="h-6 px-1.5 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
                              title={`Ver Timeline de ${sku.sku_base}`}
                            >
                              <Route className="w-3 h-3" />
                            </Button>
                          </td>

                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Totales al pie de la tabla */}
        <div className="p-3 px-4 border-t border-border bg-muted/40 flex flex-wrap items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando <strong>{filas.length}</strong> {agruparPor === 'familia' ? 'familias' : 'productos'}
          </span>
          <span className="text-[11px]">
            * Haz clic en el icono <strong><Route className="w-3 h-3 inline" /> Kardex</strong> para ver la cronología completa de cada nota.
          </span>
        </div>
      </div>

      {/* Drawer / Modal de Timeline Individual */}
      {timelineProduct && (
        <TrazabilidadTimelineDrawer
          isOpen={Boolean(timelineProduct)}
          onClose={() => setTimelineProduct(null)}
          productoId={timelineProduct.id}
          skuBase={timelineProduct.sku}
          descripcion={timelineProduct.descripcion}
          familia={timelineProduct.familia}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
        />
      )}

    </div>
  )
}
