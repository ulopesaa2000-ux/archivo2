// app/(admin)/contenedores/ReporteAnualGrid.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ESTADO_CONTENEDOR_COLORS, ESTADO_CONTENEDOR_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { Info, Loader2, Ship, User, FileText, Package, Calendar } from 'lucide-react'
import { fetchContenedoresDetalleAnual } from '@/modules/contenedores/queries'
import type { ContenedorReporteItem } from '@/modules/contenedores/types'
import { toast } from 'sonner'

type ReporteAnualGridProps = {
  data: ContenedorReporteItem[]
  years: number[]
}

const COLOR_LEGEND = [
  { label: 'Borrador', color: 'bg-zinc-400' },
  { label: 'En Tránsito', color: 'bg-blue-500' },
  { label: 'En Aduana', color: 'bg-amber-500' },
  { label: 'En Bodega / Surtido', color: 'bg-emerald-500' },
  { label: 'Cancelado', color: 'bg-red-500' },
]

export function ReporteAnualGrid({ data, years }: ReporteAnualGridProps) {
  // Estado para modal de Proveedor x Año
  const [selectedCell, setSelectedCell] = useState<{
    proveedorNombre: string
    anio: number
    contenedores: {
      id: number
      codigo_contenedor: string
      numero_contenedor: string | null
      estado: string
      fecha_eta: string | null
    }[]
  } | null>(null)

  // Estado para modal consolidado del Año completo agrupado por Contenedor
  const [selectedYearGroup, setSelectedYearGroup] = useState<number | null>(null)
  const [yearDetails, setYearDetails] = useState<any[] | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Calcular la suma de contenedores para cada año
  const totalsByYear = years.reduce((acc, year) => {
    let sum = 0
    data.forEach((item) => {
      sum += item.anios[year]?.cantidad ?? 0
    })
    acc[year] = sum
    return acc
  }, {} as Record<number, number>)

  const handleOpenYearGroup = async (year: number) => {
    setSelectedYearGroup(year)
    setLoadingDetails(true)
    setYearDetails(null)
    try {
      const details = await fetchContenedoresDetalleAnual(year)
      setYearDetails(details)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar la consolidación de contenedores.')
    } finally {
      setLoadingDetails(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Guía de Estados */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] bg-muted/40 p-3 rounded-lg border border-border/80">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">Leyenda de Estados:</span>
        {COLOR_LEGEND.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${c.color} shrink-0 shadow-sm border border-background`} />
            <span className="font-semibold text-foreground/80">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold text-foreground min-w-[250px] sticky left-0 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Proveedor
              </TableHead>
              {years.map((year) => (
                <TableHead key={year} className="text-center font-bold text-foreground min-w-[110px] p-0">
                  <button
                    onClick={() => handleOpenYearGroup(year)}
                    className="w-full py-3 h-full hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1 font-bold"
                    title={`Ver consolidación por contenedor de ${year}`}
                  >
                    <span>{year}</span>
                    <Info className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={years.length + 1} className="text-center py-8 text-muted-foreground">
                  No se encontraron datos para el reporte anual.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Filas de proveedores */}
                {data.map((item) => (
                  <TableRow key={item.proveedor_id} className="hover:bg-accent/40 transition-colors">
                    <TableCell className="font-medium sticky left-0 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      {item.proveedor_nombre}
                    </TableCell>
                    {years.map((year) => {
                      const anioData = item.anios[year]
                      const count = anioData?.cantidad ?? 0

                      return (
                        <TableCell key={year} className="text-center">
                          {count > 0 ? (
                            <Badge
                              onClick={() =>
                                setSelectedCell({
                                  proveedorNombre: item.proveedor_nombre,
                                  anio: year,
                                  contenedores: anioData.contenedores,
                                })
                              }
                              className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 font-bold cursor-pointer rounded-md shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                              {count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/30 font-light select-none">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}

                {/* Fila de Totales Anuales */}
                <TableRow className="bg-muted/30 font-bold border-t-2">
                  <TableCell className="sticky left-0 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-bold text-foreground">
                    Total Contenedores Pedidos
                  </TableCell>
                  {years.map((year) => (
                    <TableCell key={year} className="text-center font-bold">
                      {totalsByYear[year] > 0 ? (
                        <Badge variant="outline" className="px-2.5 py-1 font-black border-primary/45 text-primary bg-primary/5 shadow-sm">
                          {totalsByYear[year]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/30 font-light select-none">-</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG 1: CONTENEDORES DE UN PROVEEDOR EN UN AÑO ESPECÍFICO */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="sm:max-w-3xl w-full max-w-full">
          <DialogHeader>
            <DialogTitle>
              Contenedores de {selectedCell?.proveedorNombre} ({selectedCell?.anio})
            </DialogTitle>
            <DialogDescription>
              Detalle de los contenedores asociados a este proveedor programados para llegar en el año {selectedCell?.anio}.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto rounded-md border border-border mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold text-foreground">Código</TableHead>
                  <TableHead className="font-semibold text-foreground">No. Contenedor</TableHead>
                  <TableHead className="font-semibold text-foreground">Estado</TableHead>
                  <TableHead className="font-semibold text-foreground">Fecha ETA</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCell?.contenedores.map((c) => (
                  <TableRow key={c.id} className="hover:bg-accent/40 animate-in fade-in duration-100">
                    <TableCell className="font-medium font-mono text-xs text-primary">{c.codigo_contenedor}</TableCell>
                    <TableCell className="font-semibold">{c.numero_contenedor ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={ESTADO_CONTENEDOR_COLORS[c.estado] ?? 'bg-gray-100 text-gray-800'}>
                        {ESTADO_CONTENEDOR_LABELS[c.estado] ?? c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.fecha_eta ? formatDate(c.fecha_eta) : 'Sin ETA'}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/contenedores/${c.id}`}
                        className="text-primary hover:underline text-xs font-bold"
                        onClick={() => setSelectedCell(null)}
                      >
                        Ver Detalle →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: CONSOLIDACIÓN DE CONTENEDORES DEL AÑO COMPLETO AGRUPADOS */}
      <Dialog open={!!selectedYearGroup} onOpenChange={(open) => !open && setSelectedYearGroup(null)}>
        <DialogContent className="sm:max-w-4xl w-full max-w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary shrink-0" />
              Consolidación Anual de Contenedores ({selectedYearGroup})
            </DialogTitle>
            <DialogDescription>
              Agrupación de cargas por contenedor. Revisa qué proveedores y órdenes viajan consolidados en cada contenedor para el año {selectedYearGroup} y sus estados correspondientes.
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground font-semibold">Generando agrupación consolidada...</span>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {!yearDetails || yearDetails.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No se encontraron contenedores para el año {selectedYearGroup}.
                </p>
              ) : (
                yearDetails.map((c) => (
                  <Card key={c.id} className="border border-border/80 shadow-sm overflow-hidden">
                    <div className="bg-muted/40 p-4 border-b flex flex-wrap justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                          <Ship className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-primary">{c.codigo_contenedor}</span>
                            {c.numero_contenedor && (
                              <span className="text-xs text-muted-foreground font-semibold">({c.numero_contenedor})</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Naviera: {c.naviera ?? '—'} | Buque: {c.buque ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={ESTADO_CONTENEDOR_COLORS[c.estado] ?? 'bg-gray-100 text-gray-800'}>
                          {ESTADO_CONTENEDOR_LABELS[c.estado] ?? c.estado}
                        </Badge>
                        <Link
                          href={`/contenedores/${c.id}`}
                          onClick={() => setSelectedYearGroup(null)}
                          className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          Ir a Logística →
                        </Link>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-4">
                      {/* KPIs del Contenedor */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground uppercase font-bold text-center">
                        <div className="bg-muted/10 p-2 rounded border border-border/50">
                          <span className="block font-black text-foreground text-xs tabular-nums">{c.cajas_totales}</span>
                          Cajas Consolidadas
                        </div>
                        <div className="bg-muted/10 p-2 rounded border border-border/50">
                          <span className="block font-black text-foreground text-xs tabular-nums">{c.piezas_totales}</span>
                          Piezas Totales
                        </div>
                        <div className="bg-muted/10 p-2 rounded border border-border/50">
                          <span className="block font-black text-foreground text-xs italic tabular-nums">
                            {c.cbm_ocupado?.toFixed(2) ?? 0} / {c.cbm_total ?? '—'} m³
                          </span>
                          CBM Ocupado
                        </div>
                        <div className="bg-muted/10 p-2 rounded border border-border/50">
                          <span className="block font-black text-foreground text-xs tabular-nums">
                            {c.fecha_eta ? formatDate(c.fecha_eta) : '—'}
                          </span>
                          ETA Estimado
                        </div>
                      </div>

                      {/* Desglose de Proveedores/Órdenes Consolidados */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> Proveedores y Cargas a bordo
                        </h4>

                        {!c.ordenes || c.ordenes.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-1">
                            Este contenedor no tiene órdenes vinculadas actualmente.
                          </p>
                        ) : (
                          <div className="rounded border overflow-hidden">
                            <Table className="text-xs">
                              <TableHeader>
                                <TableRow className="bg-muted/20">
                                  <TableHead className="font-semibold p-2.5">Proveedor</TableHead>
                                  <TableHead className="font-semibold p-2.5">Folio Orden</TableHead>
                                  <TableHead className="font-semibold p-2.5">Estado Orden</TableHead>
                                  <TableHead className="text-center font-semibold p-2.5">Cajas</TableHead>
                                  <TableHead className="text-center font-semibold p-2.5">Piezas</TableHead>
                                  <TableHead className="text-right font-semibold p-2.5">Volumen</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {c.ordenes.map((o: any) => (
                                  <TableRow key={o.id} className="hover:bg-accent/30">
                                    <td className="p-2.5 font-medium flex items-center gap-1.5">
                                      <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                      {o.proveedor_nombre}
                                    </td>
                                    <td className="p-2.5 font-mono text-xs font-semibold text-primary">
                                      <Link
                                        href={`/ordenes-b2b/${o.id}`}
                                        onClick={() => setSelectedYearGroup(null)}
                                        className="hover:underline flex items-center gap-1"
                                      >
                                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                        {o.folio_proveedor ?? `ID: ${o.id}`}
                                      </Link>
                                    </td>
                                    <td className="p-2.5">
                                      <span className="font-semibold text-[11px] text-foreground/80">
                                        {o.estado ?? 'Pendiente'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center font-bold font-mono">{o.total_cajas ?? 0}</td>
                                    <td className="p-2.5 text-center font-bold font-mono text-muted-foreground">{o.total_piezas ?? 0} pz</td>
                                    <td className="p-2.5 text-right font-bold font-mono text-muted-foreground italic">
                                      {o.cbm_orden ? `${o.cbm_orden.toFixed(2)} m³` : '—'}
                                    </td>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
