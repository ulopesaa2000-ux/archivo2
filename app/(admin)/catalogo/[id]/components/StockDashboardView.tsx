// app/(admin)/catalogo/[id]/components/StockDashboardView.tsx
'use client'

import { useState } from 'react'
import type { StockProductoBodegaItem, StockPronosticadoProducto } from '@/modules/catalogo/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fecha } from '@/components/shared/Fecha'
import {
  Warehouse,
  Boxes,
  MapPin,
  ChevronDown,
  ChevronUp,
  Building2,
  TrendingUp,
} from 'lucide-react'
import { StockPronosticadoWidget } from './StockPronosticadoWidget'

export function StockDashboardView({
  stockItems,
  stockForecast,
}: {
  stockItems: StockProductoBodegaItem[]
  stockForecast: StockPronosticadoProducto
}) {
  const [mostrarBodegas, setMostrarBodegas] = useState(true)

  const totalCajas = stockItems.reduce((acc, curr) => acc + curr.cajas, 0)
  const bodegasConStock = stockItems.filter((i) => i.cajas > 0).length

  const entradas = stockForecast.entradas_pendientes_cajas
  const salidas = stockForecast.salidas_pendientes_cajas
  const pronosticadas = stockForecast.disponible_pronosticado_cajas
  const hayNotas = stockForecast.notas_pendientes.length > 0

  // Construir texto de la operación matemática entre paréntesis
  let operacionTexto = `${totalCajas}`
  if (entradas > 0) operacionTexto += ` + ${entradas}`
  if (salidas > 0) operacionTexto += ` - ${salidas}`
  if (hayNotas && (entradas > 0 || salidas > 0)) operacionTexto += ` = ${pronosticadas}`
  operacionTexto += ' cjs'

  return (
    <div className="space-y-4">
      {/* ── CUADRO PRINCIPAL TIPO DASHBOARD GLOBALIZADO ────────────── */}
      <div className="rounded-xl border bg-gradient-to-br from-card via-card to-muted/20 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">

          {/* LADO IZQUIERDO: STOCK REAL EN GRANDE Y NEGRITA */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-2 border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 lg:pr-6">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-primary" />
                Stock Real
              </span>

              {/* LETRERO OPERACIÓN: EXISTENCIAS PRONOSTICADAS (REAL + NOTAS = TOTAL) */}
              <Badge
                variant="outline"
                className="flex flex-col items-center h-auto py-1.5 px-3 text-[15px] leading-tight font-medium font-mono border-primary/30 bg-primary/5 text-primary"
                title="Stock Real + Notas Pendientes = Pronosticado"
              >
                <span>Existencias Pronosticadas:</span>
                <span className="font-bold font-mono">({operacionTexto})</span>
              </Badge>

            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-foreground">
                {totalCajas.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Cajas
              </span>
            </div>

            {/* BOTÓN / KPI DE BODEGAS CON STOCK */}
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarBodegas((prev) => !prev)}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 bg-muted/40 hover:bg-muted border border-border/60 rounded-lg w-full justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-semibold text-foreground">{bodegasConStock}</span>
                  <span>de {stockItems.length} bodegas con stock</span>
                </div>
                {mostrarBodegas ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* LADO DERECHO: PRONOSTICADO / ENTRADAS / SALIDAS / TRANSFERENCIAS */}
          <div className="lg:col-span-7">
            <StockPronosticadoWidget stock={stockForecast} />
          </div>
        </div>
      </div>

      {/* ── DESGLOSE DE BODEGAS AL DARLE CLICK ──────────────────────── */}
      {mostrarBodegas && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
          <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between">
            <span className="text-xs font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Desglose de Stock Físico por Bodega
            </span>
            <span className="text-[11px] text-muted-foreground">
              {stockItems.length} bodega{stockItems.length !== 1 ? 's' : ''} en total
            </span>
          </div>

          {stockItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No hay inventario registrado en ninguna bodega.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium py-2.5 px-4">Bodega</th>
                    <th className="text-left font-medium py-2.5 px-3">Ciudad / Tipo</th>
                    <th className="text-left font-medium py-2.5 px-3">Pasillo / Ubicación</th>
                    <th className="text-right font-medium py-2.5 px-4">Cajas Físicas</th>
                    <th className="text-right font-medium py-2.5 px-4">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stockItems.map((item) => {
                    const tieneStock = item.cajas > 0
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-muted/40 transition-colors ${!tieneStock ? 'opacity-50 bg-muted/10' : ''
                          }`}
                      >
                        <td className="py-2.5 px-4 font-medium">
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
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {item.es_virtual ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                              Virtual
                            </Badge>
                          ) : (
                            <span>{item.bodega_ciudad || '—'}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono">
                          {item.ubicacion_pasillo ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary/70" />
                              {item.ubicacion_pasillo}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-sm font-bold text-foreground">
                          {item.cajas.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground">
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
      )}
    </div>
  )
}
