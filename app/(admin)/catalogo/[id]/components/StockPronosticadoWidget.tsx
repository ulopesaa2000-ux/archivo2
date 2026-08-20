// app/(admin)/catalogo/[id]/components/StockPronosticadoWidget.tsx
'use client'

import { useState } from 'react'
import type { StockPronosticadoProducto } from '@/modules/catalogo/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fecha } from '@/components/shared/Fecha'
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Clock,
  Warehouse,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'

export function StockPronosticadoWidget({
  stock,
}: {
  stock: StockPronosticadoProducto
}) {
  const [mostrarNotas, setMostrarNotas] = useState(false)

  const hayMovimientos = stock.notas_pendientes.length > 0

  return (
    <div className="space-y-3">
      {/* ── CUADRO COMPACTO DE PRONÓSTICO ─────────────────────────── */}
      <div className="rounded-lg border bg-background/60 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Stock Pronosticado
          </span>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-xs text-muted-foreground font-sans">Proyección:</span>
            <span className="text-sm font-black text-primary">
              {stock.disponible_pronosticado_cajas.toLocaleString()} cjs
            </span>
          </div>
        </div>

        {/* CHIPS DE MOVIMIENTOS EN UN SOLO CUADRO */}
        <div className="grid grid-cols-3 gap-2">
          {/* ENTRADAS (+) */}
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-center">
            <div className="text-[10px] font-medium uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
              <ArrowUpRight className="h-3 w-3" />
              Entradas
            </div>
            <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
              +{stock.entradas_pendientes_cajas.toLocaleString()}
            </div>
          </div>

          {/* SALIDAS (-) */}
          <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-2 text-center">
            <div className="text-[10px] font-medium uppercase text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
              <ArrowDownRight className="h-3 w-3" />
              Salidas
            </div>
            <div className="text-base font-bold font-mono text-rose-700 dark:text-rose-300">
              -{stock.salidas_pendientes_cajas.toLocaleString()}
            </div>
          </div>

          {/* TRANSFERENCIAS (⇄) */}
          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2 text-center">
            <div className="text-[10px] font-medium uppercase text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1">
              <ArrowLeftRight className="h-3 w-3" />
              Traspasos
            </div>
            <div className="text-base font-bold font-mono text-blue-700 dark:text-blue-300">
              {stock.transferencias_cajas.toLocaleString()}
            </div>
          </div>
        </div>

        {/* BOTÓN TOGGLE DE NOTAS PENDIENTES */}
        {hayMovimientos ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrarNotas((prev) => !prev)}
            className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-between px-2 bg-muted/30 hover:bg-muted/60 rounded"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>
                {stock.notas_pendientes.length} nota{stock.notas_pendientes.length !== 1 ? 's' : ''} en trámite
              </span>
            </div>
            {mostrarNotas ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="text-[11px] text-center text-muted-foreground/70 py-0.5">
            Sin notas pendientes en curso
          </div>
        )}
      </div>

      {/* ── TABLA DESPLEGABLE DE NOTAS EN TRÁNSITO AL DARLE CLICK ──────── */}
      {mostrarNotas && hayMovimientos && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
          <div className="bg-muted/40 px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-semibold tracking-tight text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Notas Pendientes Involucradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium py-2 px-3">Nota</th>
                  <th className="text-left font-medium py-2 px-2">Tipo</th>
                  <th className="text-left font-medium py-2 px-2">Ruta</th>
                  <th className="text-right font-medium py-2 px-3">Cajas</th>
                  <th className="text-right font-medium py-2 px-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stock.notas_pendientes.map((nota) => {
                  const esEntrada = nota.afecta_inventario > 0
                  const esSalida = nota.afecta_inventario < 0
                  const esTraspaso = nota.tipo_codigo === 'TRF' || nota.afecta_inventario === 0

                  return (
                    <tr key={nota.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium">
                        <Link
                          href={`/inventario/notas/${nota.id}`}
                          className="text-primary hover:underline"
                        >
                          {nota.numero_nota}
                        </Link>
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 ${
                            esEntrada
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : esSalida
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}
                        >
                          {nota.tipo_codigo}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span>{nota.bodega_origen_nombre}</span>
                          {nota.bodega_destino_nombre && (
                            <>
                              <span>→</span>
                              <span>{nota.bodega_destino_nombre}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {esEntrada && '+'}
                        {esSalida && '-'}
                        {nota.cajas.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
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
