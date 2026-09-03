// app/(admin)/inventario/trazabilidad/components/TrazabilidadTimelineDrawer.tsx
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight, 
  Clock, 
  ExternalLink, 
  Package, 
  Layers, 
  Warehouse, 
  Loader2,
  TrendingDown,
  TrendingUp,
  ArrowLeftRight,
  SlidersHorizontal,
  FileText
} from 'lucide-react'
import { fetchProductoTimeline, type TimelineEvento } from '@/modules/inventario/trazabilidad'

interface Props {
  isOpen: boolean
  onClose: () => void
  productoId: number | null
  skuBase: string
  descripcion?: string
  familia?: string
  fechaDesde?: string
  fechaHasta?: string
}

export function TrazabilidadTimelineDrawer({
  isOpen,
  onClose,
  productoId,
  skuBase,
  descripcion,
  familia,
  fechaDesde,
  fechaHasta,
}: Props) {
  const [eventos, setEventos] = useState<TimelineEvento[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !productoId) return

    setLoading(true)
    fetchProductoTimeline(productoId, fechaDesde, fechaHasta)
      .then((data) => {
        setEventos(data)
      })
      .catch((err) => {
        console.error('Error cargando timeline:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, productoId, fechaDesde, fechaHasta])

  const getTipoBadge = (codigo: string) => {
    switch (codigo) {
      case 'ENT':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30 gap-1 text-[11px]">
            <TrendingUp className="w-3 h-3" /> Entrada
          </Badge>
        )
      case 'SAL':
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/20 border-red-500/30 gap-1 text-[11px]">
            <TrendingDown className="w-3 h-3" /> Salida
          </Badge>
        )
      case 'TRF':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/30 gap-1 text-[11px]">
            <ArrowLeftRight className="w-3 h-3" /> Traspaso
          </Badge>
        )
      case 'AJU':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30 gap-1 text-[11px]">
            <SlidersHorizontal className="w-3 h-3" /> Ajuste
          </Badge>
        )
      default:
        return <Badge variant="secondary">{codigo}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Regla 3.6: sm:max-w-4xl para modales de alta densidad */}
      <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        
        {/* Cabecera */}
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
                  {skuBase}
                </Badge>
                {familia && (
                  <Badge variant="secondary" className="text-xs">
                    {familia}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-bold text-foreground mt-1">
                Línea de Tiempo y Trazabilidad Cronológica
              </DialogTitle>
              {descripcion && (
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate max-w-xl">
                  {descripcion}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Contenido / Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Cargando trazabilidad histórica del producto...</p>
            </div>
          ) : eventos.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Sin movimientos registrados</p>
              <p className="text-xs mt-1">No se encontraron notas confirmadas para este producto en el rango seleccionado.</p>
            </div>
          ) : (
            <div className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {eventos.map((ev, idx) => (
                <div key={`${ev.nota_id}-${ev.detalle_id}-${idx}`} className="relative pb-6 last:pb-2">
                  
                  {/* Nodo circular en la línea */}
                  <div className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-xs ${
                    ev.tipo_codigo === 'ENT' ? 'bg-emerald-500' :
                    ev.tipo_codigo === 'SAL' ? 'bg-red-500' :
                    ev.tipo_codigo === 'TRF' ? 'bg-blue-500' : 'bg-amber-500'
                  }`} />

                  {/* Tarjeta del evento */}
                  <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-2.5">
                    
                    {/* Fila superior: Fecha, Badge de Tipo y Folio Nota */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getTipoBadge(ev.tipo_codigo)}
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          {new Date(ev.fecha_nota).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/inventario/notas/${ev.nota_id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md"
                        >
                          <FileText className="w-3 h-3" />
                          {ev.numero_nota}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Fila Central: Movimiento y Flujo de Ciudad / Bodega */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs pt-1">
                      
                      {/* Cantidad */}
                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          Cantidad
                        </span>
                        <p className="text-sm font-black text-foreground">
                          {ev.cajas} cajas
                          {ev.piezas_sueltas > 0 && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              (+{ev.piezas_sueltas} pz)
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Ruta Geográfica (Origen ➔ Destino) */}
                      <div className="sm:col-span-9">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                          Ruta Geográfica & Bodegas
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 font-medium">
                          {ev.tipo_codigo === 'TRF' ? (
                            <>
                              <Badge variant="outline" className="text-[11px] font-semibold bg-muted/30">
                                {ev.origen_ciudad}: {ev.origen_bodega}
                              </Badge>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <Badge variant="outline" className="text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                {ev.destino_ciudad}: {ev.destino_bodega}
                              </Badge>
                            </>
                          ) : ev.tipo_codigo === 'SAL' ? (
                            <>
                              <Badge variant="outline" className="text-[11px] font-semibold bg-muted/30">
                                {ev.origen_ciudad}: {ev.origen_bodega}
                              </Badge>
                              <ArrowRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <Badge variant="outline" className="text-[11px] font-semibold bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30">
                                {ev.cliente_destino || 'Despacho / Venta'}
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              {ev.origen_ciudad}: {ev.origen_bodega}
                            </Badge>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Observaciones / Referencia si existen */}
                    {(ev.observaciones || ev.nota_referencia) && (
                      <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        {ev.nota_referencia && (
                          <span>
                            Ref: <strong className="text-foreground">{ev.nota_referencia}</strong>
                          </span>
                        )}
                        {ev.observaciones && (
                          <span className="italic">
                            &ldquo;{ev.observaciones}&rdquo;
                          </span>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-3 px-5 border-t border-border bg-muted/30 flex justify-between items-center text-xs text-muted-foreground">
          <span>Total de notas registradas: <strong>{eventos.length}</strong></span>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cerrar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
