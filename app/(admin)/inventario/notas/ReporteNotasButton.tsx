// app/(admin)/inventario/notas/ReporteNotasButton.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useTransition } from 'react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { Download, FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react'
import { getNotasParaReporteAction, getResumenReporteNotasAction } from '@/modules/inventario/report-actions'
import type { FiltrosNotas, NotaListItem } from '@/modules/inventario/types'
import type { BodegaRow } from '@/lib/types/tables'
import { TIPO_MOVIMIENTO_COLORS, ESTADO_NOTA_LABELS } from '@/lib/constants'

type Props = {
  bodegas: BodegaRow[]
  filtrosActuales: FiltrosNotas
}

export function ReporteNotasButton({ bodegas, filtrosActuales }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [selectedMes, setSelectedMes] = useState<string>('custom')

  // Generar opciones de los últimos 6 meses (mes actual + 6 anteriores = 7 en total)
  const optionsMeses = React.useMemo(() => {
    const list = []
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    const hoy = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const mesNombre = nombresMeses[d.getMonth()]
      const anio = d.getFullYear()
      
      const primerDia = `${anio}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const ultimoDiaObjeto = new Date(anio, d.getMonth() + 1, 0)
      const ultimoDia = `${anio}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ultimoDiaObjeto.getDate()).padStart(2, '0')}`
      
      list.push({
        label: `${mesNombre} ${anio}`,
        value: `${primerDia}|${ultimoDia}`
      })
    }
    return list
  }, [])

  const handleMesChange = (val: string | null) => {
    if (!val) return
    setSelectedMes(val)
    if (val === 'custom') return
    const [desde, hasta] = val.split('|')
    setFechaDesde(desde)
    setFechaHasta(hasta)
  }

  const handleFechaDesdeChange = (val: string) => {
    setFechaDesde(val)
    setSelectedMes('custom')
  }

  const handleFechaHastaChange = (val: string) => {
    setFechaHasta(val)
    setSelectedMes('custom')
  }
  
  // Agrupar bodegas por ciudad
  const ciudadesMap = React.useMemo(() => {
    const map: Record<string, BodegaRow[]> = {}
    bodegas.forEach(b => {
      const ciudad = b.ciudad || 'Sin Ciudad Asignada'
      if (!map[ciudad]) map[ciudad] = []
      map[ciudad].push(b)
    })
    return map
  }, [bodegas])

  const [selectedBodegas, setSelectedBodegas] = useState<number[]>([])
  const [resumen, setResumen] = useState<{ total: number; porTipo: Record<string, number> }>({ total: 0, porTipo: {} })
  const [isPendingResumen, startResumenTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)

  // Seleccionar todas las bodegas al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setSelectedBodegas(bodegas.map(b => b.id))
      setFechaDesde('')
      setFechaHasta('')
      setSelectedMes('custom')
    }
  }, [isOpen, bodegas])

  // Cargar resumen reactivamente cuando cambian fechas o bodegas seleccionadas
  useEffect(() => {
    if (!isOpen) return

    startResumenTransition(async () => {
      const res = await getResumenReporteNotasAction({
        bodegaIds: selectedBodegas,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined
      })
      setResumen(res)
    })
  }, [selectedBodegas, fechaDesde, fechaHasta, isOpen])

  const handleToggleBodega = (id: number) => {
    setSelectedBodegas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleToggleCiudad = (ciudad: string, checked: boolean) => {
    const bodegasCiudadIds = ciudadesMap[ciudad]?.map(b => b.id) || []
    if (checked) {
      setSelectedBodegas(prev => Array.from(new Set([...prev, ...bodegasCiudadIds])))
    } else {
      setSelectedBodegas(prev => prev.filter(id => !bodegasCiudadIds.includes(id)))
    }
  }

  // Generar y descargar el archivo Excel
  const generateExcelReport = async (filtros: Omit<FiltrosNotas, 'page'>, filename: string) => {
    setIsDownloading(true)
    toast.info('Consultando notas para el reporte...')

    try {
      const notas = await getNotasParaReporteAction(filtros)
      
      if (notas.length === 0) {
        toast.warning('No se encontraron notas con el rango e indicaciones especificadas.')
        setIsDownloading(false)
        return
      }

      toast.info('Construyendo reporte Excel...')
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Reporte de Notas')

      // Configuración de impresión
      sheet.pageSetup.orientation = 'landscape'
      sheet.pageSetup.fitToPage = true
      sheet.pageSetup.fitToWidth = 1
      sheet.pageSetup.fitToHeight = 0

      // Columnas del reporte
      sheet.columns = [
        { header: 'N° NOTA', key: 'numero_nota', width: 16 },
        { header: 'TIPO MOVIMIENTO', key: 'tipo_nombre', width: 22 },
        { header: 'FECHA REGISTRO', key: 'fecha_nota', width: 20 },
        { header: 'BODEGA ORIGEN', key: 'bodega_origen_nombre', width: 25 },
        { header: 'BODEGA DESTINO', key: 'bodega_destino_nombre', width: 25 },
        { header: 'CAJAS', key: 'total_cajas', width: 12 },
        { header: 'COSTO TOTAL', key: 'costo_total', width: 15 },
        { header: 'ESTADO', key: 'estado_nombre', width: 15 },
        { header: 'REFERENCIA', key: 'nota_referencia', width: 20 },
        { header: 'OBSERVACIONES', key: 'observaciones', width: 35 },
        { header: 'CREADO POR', key: 'usuario_nombre', width: 25 }
      ]

      // Estilo de cabeceras
      const headerRow = sheet.getRow(1)
      headerRow.height = 32
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E40AF' } // Azul corporativo
        }
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } }
        }
      })

      // Rellenar filas
      notas.forEach((n, idx) => {
        const row = sheet.addRow({
          numero_nota: n.numero_nota,
          tipo_nombre: n.tipo_nombre,
          fecha_nota: n.fecha_nota ? new Date(n.fecha_nota).toLocaleDateString('es-MX', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
          }) : '—',
          bodega_origen_nombre: n.bodega_origen_nombre,
          bodega_destino_nombre: n.bodega_destino_nombre || '—',
          total_cajas: n.total_cajas || 0,
          costo_total: n.costo_total || 0,
          estado_nombre: n.estado_nombre,
          nota_referencia: n.nota_referencia || '—',
          observaciones: n.observaciones || '—',
          usuario_nombre: n.usuario_nombre || '—'
        })

        row.height = 25
        row.alignment = { vertical: 'middle' }

        // Alineación y formatos específicos
        row.getCell('numero_nota').font = { name: 'Consolas', size: 10 }
        row.getCell('total_cajas').alignment = { horizontal: 'center', vertical: 'middle' }
        
        const costoCell = row.getCell('costo_total')
        costoCell.numFmt = '$#,##0.00'
        costoCell.alignment = { horizontal: 'right', vertical: 'middle' }

        // Colores por tipo de movimiento para dinamismo
        const tipoCell = row.getCell('tipo_nombre')
        tipoCell.alignment = { horizontal: 'center', vertical: 'middle' }
        if (n.tipo_codigo === 'ENT') {
          tipoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } } // verde
          tipoCell.font = { color: { argb: 'FF137333' }, bold: true }
        } else if (n.tipo_codigo === 'SAL') {
          tipoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } } // rojo
          tipoCell.font = { color: { argb: 'FFC5221F' }, bold: true }
        } else if (n.tipo_codigo === 'TRF') {
          tipoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } } // azul
          tipoCell.font = { color: { argb: 'FF1A73E8' }, bold: true }
        } else if (n.tipo_codigo === 'AJU') {
          tipoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF7E0' } } // naranja/amarillo
          tipoCell.font = { color: { argb: 'FFB06000' }, bold: true }
        }

        // Color alternativo para filas
        if (idx % 2 === 1) {
          row.eachCell((cell) => {
            if ((cell.col as any) !== 2) { // Evitar sobreescribir fondo del tipo de movimiento
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8FAFC' } // Gris pizarra muy claro
              }
            }
          })
        }

        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          }
        })
      })

      // Fila de resumen final
      const summaryRowIdx = notas.length + 2
      const summaryRow = sheet.getRow(summaryRowIdx)
      summaryRow.height = 30
      summaryRow.font = { bold: true, size: 11 }
      summaryRow.alignment = { vertical: 'middle' }

      sheet.getCell(summaryRowIdx, 4).value = 'TOTALES:'
      sheet.getCell(summaryRowIdx, 4).alignment = { horizontal: 'right', vertical: 'middle' }

      // Sumatoria de cajas y costos mediante fórmulas
      const cajasFormulaCell = sheet.getCell(summaryRowIdx, 6)
      cajasFormulaCell.value = { formula: `SUM(F2:F${notas.length + 1})`, result: 0 }
      cajasFormulaCell.alignment = { horizontal: 'center', vertical: 'middle' }

      const costoFormulaCell = sheet.getCell(summaryRowIdx, 7)
      costoFormulaCell.value = { formula: `SUM(G2:G${notas.length + 1})`, result: 0 }
      costoFormulaCell.numFmt = '$#,##0.00'
      costoFormulaCell.alignment = { horizontal: 'right', vertical: 'middle' }

      summaryRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF475569' } }
        }
      })

      // Generar buffer y descargar
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Reporte Excel generado correctamente')
    } catch (e) {
      console.error(e)
      toast.error('Ocurrió un error inesperado al generar el reporte.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Descarga directa del filtro de la URL actual
  const handleDownloadVistaActual = () => {
    const { page, ...filtros } = filtrosActuales
    const fechaStr = new Date().toISOString().split('T')[0]
    generateExcelReport(filtros, `Notas_Vista_Actual_${fechaStr}.xlsx`)
  }

  // Descarga del reporte personalizado
  const handleDownloadPersonalizado = () => {
    if (selectedBodegas.length === 0) {
      toast.error('Debes seleccionar al menos una bodega para el reporte.')
      return
    }

    const filtros: Omit<FiltrosNotas, 'page'> = {
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      limit_bodega_ids: selectedBodegas
    }

    const fechaStr = new Date().toISOString().split('T')[0]
    generateExcelReport(filtros, `Reporte_Notas_Personalizado_${fechaStr}.xlsx`)
    setIsOpen(false)
  }

  // Verifica si el filtro es masivo (ninguna fecha acotada y todas las bodegas seleccionadas)
  const esReporteMasivo = !fechaDesde && !fechaHasta && selectedBodegas.length === bodegas.length

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            Descargar Reporte
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handleDownloadVistaActual} disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            Descargar Vista Actual
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Personalizar Reporte...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full max-w-full sm:max-w-[90vw] lg:max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Personalizar Reporte de Notas
            </DialogTitle>
            <DialogDescription>
              Selecciona las bodegas por zona o ciudad y acota el rango de fechas para la descarga.
            </DialogDescription>
          </DialogHeader>

          {/* Cuerpo del Modal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 py-4 overflow-y-auto">
            
            {/* Lado Izquierdo: Fechas y Bodegas */}
            <div className="md:col-span-2 space-y-4 pr-2">
              {/* Rango de Fechas */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-sm font-semibold">Rango de Fechas</Label>
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor="rep-mes-selector" className="text-xs text-muted-foreground shrink-0">
                      Mes Rápido:
                    </Label>
                    <Select value={selectedMes} onValueChange={handleMesChange}>
                      <SelectTrigger id="rep-mes-selector" className="h-8 w-[160px] text-xs">
                        <SelectValue placeholder="Seleccionar mes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Personalizado</SelectItem>
                        {optionsMeses.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rep-desde" className="text-xs text-muted-foreground">Desde</Label>
                    <Input
                      id="rep-desde"
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => handleFechaDesdeChange(e.target.value)}
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rep-hasta" className="text-xs text-muted-foreground">Hasta</Label>
                    <Input
                      id="rep-hasta"
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => handleFechaHastaChange(e.target.value)}
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Selector de Bodegas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Bodegas Asociadas</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setSelectedBodegas(bodegas.map(b => b.id))}
                      className="text-xs text-primary"
                    >
                      Marcar todas
                    </Button>
                    <span className="text-muted-foreground">|</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setSelectedBodegas([])}
                      className="text-xs text-muted-foreground"
                    >
                      Desmarcar todas
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[250px] border rounded-lg p-4 bg-muted/20">
                  <div className="space-y-4">
                    {Object.entries(ciudadesMap).map(([ciudad, bodegasCiudad]) => {
                      const allChecked = bodegasCiudad.every(b => selectedBodegas.includes(b.id))
                      const someChecked = bodegasCiudad.some(b => selectedBodegas.includes(b.id)) && !allChecked
                      
                      return (
                        <div key={ciudad} className="space-y-2 border-b last:border-b-0 pb-3 last:pb-0">
                          {/* Selector Ciudad */}
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`ciudad-${ciudad}`}
                              checked={allChecked ? true : (someChecked ? 'indeterminate' as any : false)}
                              onCheckedChange={(checked) => handleToggleCiudad(ciudad, !!checked)}
                            />
                            <Label
                              htmlFor={`ciudad-${ciudad}`}
                              className="font-bold text-sm text-foreground cursor-pointer"
                            >
                              {ciudad}
                            </Label>
                          </div>

                          {/* Listado Bodegas */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-1">
                            {bodegasCiudad.map((b) => (
                              <div key={b.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`bodega-${b.id}`}
                                  checked={selectedBodegas.includes(b.id)}
                                  onCheckedChange={() => handleToggleBodega(b.id)}
                                />
                                <Label
                                  htmlFor={`bodega-${b.id}`}
                                  className="text-xs text-muted-foreground font-normal cursor-pointer leading-tight"
                                >
                                  {b.nombre} {b.es_virtual && <span className="text-[10px] text-blue-500 font-bold">(V)</span>}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Lado Derecho: Resumen en Tiempo Real */}
            <div className="bg-muted/30 border rounded-lg p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Resumen de Carga</Label>
                
                {isPendingResumen ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs">Actualizando datos...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs text-muted-foreground font-medium">Notas Estimadas</p>
                      <p className="text-3xl font-black font-mono leading-none mt-1 text-primary">{resumen.total}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-muted-foreground">Desglose por Tipo:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">
                          <p className="text-muted-foreground font-medium">Entradas</p>
                          <p className="font-bold text-emerald-600 font-mono text-sm">{resumen.porTipo['ENT'] || 0}</p>
                        </div>
                        <div className="p-2 bg-red-500/5 border border-red-500/20 rounded">
                          <p className="text-muted-foreground font-medium">Salidas</p>
                          <p className="font-bold text-red-600 font-mono text-sm">{resumen.porTipo['SAL'] || 0}</p>
                        </div>
                        <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded">
                          <p className="text-muted-foreground font-medium">Traspasos</p>
                          <p className="font-bold text-blue-600 font-mono text-sm">{resumen.porTipo['TRF'] || 0}</p>
                        </div>
                        <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded">
                          <p className="text-muted-foreground font-medium">Ajustes</p>
                          <p className="font-bold text-amber-600 font-mono text-sm">{resumen.porTipo['AJU'] || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advertencia de Descarga Masiva */}
                {esReporteMasivo && (
                  <div className="p-3 bg-amber-100 dark:bg-amber-950/20 border border-amber-300/30 text-amber-900 dark:text-amber-300 rounded-lg flex items-start gap-2 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Descarga masiva detectada</p>
                      <p className="opacity-80 mt-0.5">
                        Estás a punto de descargar todas las notas de todas las bodegas. Esto puede demorar unos momentos. Se recomienda acotar por fecha.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleDownloadPersonalizado}
                className="w-full"
                disabled={resumen.total === 0 || isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Excel
                  </>
                )}
              </Button>
            </div>

          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
