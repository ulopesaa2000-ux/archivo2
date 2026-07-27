// app/(admin)/contenedores/ExcelExportDialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Download, Loader2, FileSpreadsheet } from 'lucide-react'
import { fetchContenedoresDetalleAnual } from '@/modules/contenedores/queries'
import ExcelJS from 'exceljs'
import { toast } from 'sonner'

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const

export function ExcelExportDialog() {
  const [open, setOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const yearNum = parseInt(selectedYear, 10)
      const data = await fetchContenedoresDetalleAnual(yearNum)

      if (!data || data.length === 0) {
        toast.info(`No se encontraron contenedores para el año ${selectedYear}.`)
        setExporting(false)
        return
      }

      // Generar libro de trabajo con formato corporativo profesional
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(`Contenedores ${selectedYear}`, {
        views: [{ showGridLines: true }]
      })

      // Configuración de página e impresión
      worksheet.pageSetup.orientation = 'landscape'
      worksheet.pageSetup.paperSize = 9 // A4
      worksheet.pageSetup.fitToPage = true
      worksheet.pageSetup.fitToWidth = 1
      worksheet.pageSetup.fitToHeight = 0

      // 1. TÍTULOS Y CABECERA DEL DOCUMENTO (Filas 1 y 2)
      worksheet.mergeCells('A1:Z1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = `REPORTE ANUAL DE CONTENEDORES Y LOGÍSTICA B2B (${selectedYear})`
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E3A8A' } }
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' }

      worksheet.mergeCells('A2:Z2')
      const subtitleCell = worksheet.getCell('A2')
      const fechaGeneracion = new Date().toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
      subtitleCell.value = `Fecha de emisión: ${fechaGeneracion} | Total de Contenedores: ${data.length}`
      subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } }
      subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' }

      // Fila vacía 3 para separación
      worksheet.getRow(3).height = 12

      // 2. COLUMNAS Y ENCABEZADOS DE LA TABLA (Fila 4)
      const columnsDef = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'CÓDIGO CONTENEDOR', key: 'codigo_contenedor', width: 22 },
        { header: 'NÚMERO CONTENEDOR', key: 'numero_contenedor', width: 22 },
        { header: 'ESTADO', key: 'estado', width: 18 },
        { header: 'ETA (LLEGADA EST.)', key: 'fecha_eta', width: 16 },
        { header: 'ETD (SALIDA EST.)', key: 'fecha_etd', width: 16 },
        { header: 'LLEGADA REAL', key: 'fecha_llegada_real', width: 16 },
        { header: 'NAVIERA', key: 'naviera', width: 20 },
        { header: 'BUQUE', key: 'buque', width: 20 },
        { header: 'PUERTO ORIGEN', key: 'puerto_origen', width: 18 },
        { header: 'PUERTO DESTINO', key: 'puerto_destino', width: 18 },
        { header: 'PROVEEDORES CONSOLIDADOS', key: 'proveedores_nombres', width: 32 },
        { header: 'FOLIOS ÓRDENES B2B', key: 'folios_ordenes', width: 26 },
        { header: 'TOTAL CAJAS', key: 'cajas_totales', width: 14 },
        { header: 'TOTAL PIEZAS', key: 'piezas_totales', width: 14 },
        { header: 'CBM OCUPADO (m³)', key: 'cbm_ocupado', width: 16 },
        { header: 'CBM MÁXIMO (m³)', key: 'cbm_total', width: 16 },
        { header: 'PESO TOTAL (kg)', key: 'peso_total_kg', width: 16 },
        { header: 'FLETE MARÍTIMO (USD)', key: 'costo_flete_maritimo', width: 20 },
        { header: 'DESADUANAMIENTO', key: 'costo_desaduanamiento', width: 22 },
        { header: 'BL RECIBIDO', key: 'bl', width: 14 },
        { header: 'FACTURA RECIBIDA', key: 'factura', width: 16 },
        { header: 'PACKING LIST', key: 'packing_list', width: 15 },
        { header: 'TELEX RELEASE', key: 'telex', width: 15 },
        { header: 'MUESTRAS ENTREGADAS', key: 'muestras', width: 18 },
        { header: 'COMENTARIOS', key: 'comentarios', width: 30 },
      ]

      const headerRowIdx = 4
      const headerRow = worksheet.getRow(headerRowIdx)
      headerRow.height = 30

      columnsDef.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = col.header
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A8A' } // Azul marino corporativo
        }
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0F172A' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } }
        }
      })

      // Estilos de badge por estado
      const stateStyles: Record<string, { bg: string; font: string; label: string }> = {
        borrador: { bg: 'FFF1F5F9', font: 'FF475569', label: 'BORRADOR' },
        en_transito: { bg: 'FFE8F0FE', font: 'FF1E40AF', label: 'EN TRÁNSITO' },
        en_aduana: { bg: 'FFFEF3C7', font: 'FF92400E', label: 'EN ADUANA' },
        en_bodega: { bg: 'FFE6F4EA', font: 'FF166534', label: 'EN BODEGA' },
        surtido: { bg: 'FFE6F4EA', font: 'FF166534', label: 'SURTIDO' },
        arribado: { bg: 'FFE6F4EA', font: 'FF166534', label: 'ARRIBADO' },
        cancelado: { bg: 'FFFCE8E6', font: 'FF991B1B', label: 'CANCELADO' }
      }

      // 3. REGISTROS / HISTORIAL DE CONTENEDORES EN CADA FILA
      const dataStartRowIdx = 5
      data.forEach((c, idx) => {
        const rowIdx = dataStartRowIdx + idx
        const row = worksheet.getRow(rowIdx)
        row.height = 24

        const checklist = (c.documentos_checklist as Record<string, boolean>) || {}
        const estadoKey = (c.estado || '').toLowerCase()
        const estadoStyle = stateStyles[estadoKey] || {
          bg: 'FFF1F5F9', font: 'FF334155', label: (c.estado || '—').toUpperCase()
        }

        const values = [
          idx + 1,
          c.codigo_contenedor || '—',
          c.numero_contenedor || '—',
          estadoStyle.label,
          c.fecha_eta ? c.fecha_eta.slice(0, 10) : '—',
          c.fecha_etd ? c.fecha_etd.slice(0, 10) : '—',
          c.fecha_llegada_real ? c.fecha_llegada_real.slice(0, 10) : '—',
          c.naviera || '—',
          c.buque || '—',
          c.puerto_origen || '—',
          c.puerto_destino || '—',
          c.proveedores_nombres || '—',
          c.folios_ordenes || '—',
          c.cajas_totales ?? 0,
          c.piezas_totales ?? 0,
          c.cbm_ocupado ?? 0,
          c.cbm_total ?? 0,
          c.peso_total_kg ?? 0,
          c.costo_flete_maritimo ?? 0,
          c.costo_desaduanamiento ?? 0,
          checklist.bl ? 'SÍ' : 'NO',
          checklist.factura ? 'SÍ' : 'NO',
          checklist.packing_list ? 'SÍ' : 'NO',
          checklist.telex ? 'SÍ' : 'NO',
          checklist.muestras ? 'SÍ' : 'NO',
          c.comentarios || '—'
        ]

        const isEven = idx % 2 === 0
        const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC' // Zebra striping suave

        values.forEach((val, colIdx) => {
          const cell = row.getCell(colIdx + 1)
          cell.value = val
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } }
          cell.alignment = { vertical: 'middle' }

          // Fondo por defecto
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }

          // Bordes por celda
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
          }

          // Formatos y alineaciones específicas según columna (1-indexed)
          switch (colIdx + 1) {
            case 1: // # Index
              cell.alignment = { vertical: 'middle', horizontal: 'center' }
              cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } }
              break
            case 2: // Código
              cell.font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF1E40AF' } }
              cell.alignment = { vertical: 'middle', horizontal: 'left' }
              break
            case 3: // Número Contenedor
              cell.font = { name: 'Consolas', size: 10 }
              cell.alignment = { vertical: 'middle', horizontal: 'left' }
              break
            case 4: // Estado
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoStyle.bg } }
              cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: estadoStyle.font } }
              cell.alignment = { vertical: 'middle', horizontal: 'center' }
              break
            case 5: // ETA
            case 6: // ETD
            case 7: // Llegada Real
              cell.alignment = { vertical: 'middle', horizontal: 'center' }
              break
            case 14: // Cajas
            case 15: // Piezas
              cell.numFmt = '#,##0'
              cell.alignment = { vertical: 'middle', horizontal: 'right' }
              cell.font = { name: 'Calibri', size: 10, bold: true }
              break
            case 16: // CBM Ocupado
            case 17: // CBM Máximo
              cell.numFmt = '0.00'
              cell.alignment = { vertical: 'middle', horizontal: 'right' }
              break
            case 18: // Peso Total
              cell.numFmt = '#,##0.00'
              cell.alignment = { vertical: 'middle', horizontal: 'right' }
              break
            case 19: // Flete Marítimo
            case 20: // Desaduanamiento
              cell.numFmt = '$#,##0.00'
              cell.alignment = { vertical: 'middle', horizontal: 'right' }
              cell.font = { name: 'Calibri', size: 10, bold: true }
              break
            case 21: // Checklist items (21 a 25)
            case 22:
            case 23:
            case 24:
            case 25:
              cell.alignment = { vertical: 'middle', horizontal: 'center' }
              if (val === 'SÍ') {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF166534' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
              } else {
                cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF94A3B8' } }
              }
              break
          }
        })
      })

      // 4. FILA DE TOTALES Y SUMATORIA (Summary Row)
      const lastDataRowIdx = dataStartRowIdx + data.length - 1
      const summaryRowIdx = lastDataRowIdx + 1
      const summaryRow = worksheet.getRow(summaryRowIdx)
      summaryRow.height = 28

      summaryRow.getCell(12).value = `TOTALES (${data.length} CONTENEDORES)`
      summaryRow.getCell(12).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } }
      summaryRow.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' }

      // Total Cajas (Col 14 - N)
      const cajasCell = summaryRow.getCell(14)
      cajasCell.value = { formula: `SUM(N${dataStartRowIdx}:N${lastDataRowIdx})`, result: data.reduce((s, c) => s + (c.cajas_totales ?? 0), 0) }
      cajasCell.numFmt = '#,##0'
      cajasCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E40AF' } }
      cajasCell.alignment = { vertical: 'middle', horizontal: 'right' }

      // Total Piezas (Col 15 - O)
      const piezasCell = summaryRow.getCell(15)
      piezasCell.value = { formula: `SUM(O${dataStartRowIdx}:O${lastDataRowIdx})`, result: data.reduce((s, c) => s + (c.piezas_totales ?? 0), 0) }
      piezasCell.numFmt = '#,##0'
      piezasCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E40AF' } }
      piezasCell.alignment = { vertical: 'middle', horizontal: 'right' }

      // Total CBM Ocupado (Col 16 - P)
      const cbmCell = summaryRow.getCell(16)
      cbmCell.value = { formula: `SUM(P${dataStartRowIdx}:P${lastDataRowIdx})`, result: data.reduce((s, c) => s + (c.cbm_ocupado ?? 0), 0) }
      cbmCell.numFmt = '0.00'
      cbmCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } }
      cbmCell.alignment = { vertical: 'middle', horizontal: 'right' }

      // Total Peso (Col 18 - R)
      const pesoCell = summaryRow.getCell(18)
      pesoCell.value = { formula: `SUM(R${dataStartRowIdx}:R${lastDataRowIdx})`, result: data.reduce((s, c) => s + (c.peso_total_kg ?? 0), 0) }
      pesoCell.numFmt = '#,##0.00'
      pesoCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } }
      pesoCell.alignment = { vertical: 'middle', horizontal: 'right' }

      // Total Flete (Col 19 - S)
      const fleteCell = summaryRow.getCell(19)
      fleteCell.value = { formula: `SUM(S${dataStartRowIdx}:S${lastDataRowIdx})`, result: data.reduce((s, c) => s + (c.costo_flete_maritimo ?? 0), 0) }
      fleteCell.numFmt = '$#,##0.00'
      fleteCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } }
      fleteCell.alignment = { vertical: 'middle', horizontal: 'right' }

      // Total Desaduanamiento (Col 20 - T)
      const desaduanaCell = summaryRow.getCell(20)
      desaduanaCell.value = { formula: `SUM(T${dataStartRowIdx}:T${lastDataRowIdx})`, result: data.reduce((s, c) => s + (c.costo_desaduanamiento ?? 0), 0) }
      desaduanaCell.numFmt = '$#,##0.00'
      desaduanaCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } }
      desaduanaCell.alignment = { vertical: 'middle', horizontal: 'right' }

      // Aplicar fondo y bordes dobles a la fila de totales
      for (let colIdx = 1; colIdx <= columnsDef.length; colIdx++) {
        const cell = summaryRow.getCell(colIdx)
        if (!cell.fill || cell.fill.type !== 'pattern') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF475569' } },
          bottom: { style: 'double', color: { argb: 'FF0F172A' } }
        }
      }

      // 5. AJUSTAR ANCHOS DE COLUMNAS
      columnsDef.forEach((colDef, i) => {
        const col = worksheet.getColumn(i + 1)
        col.width = colDef.width
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Reporte_Contenedores_${selectedYear}.xlsx`
      anchor.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Reporte del año ${selectedYear} exportado exitosamente.`)
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Ocurrió un error al generar el archivo de Excel.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="h-9 px-3 text-xs font-medium rounded-md border border-emerald-600/35 hover:bg-emerald-50 hover:text-emerald-800 transition-all flex items-center gap-1.5 bg-background">
        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
        Exportar Excel
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] w-full max-w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Descargar Reporte Anual
          </DialogTitle>
          <DialogDescription>
            Genera un archivo Excel detallado de los contenedores programados o arribados durante el año seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year-select" className="text-right text-xs font-semibold">
              Año a Exportar
            </Label>
            <div className="col-span-3">
              <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || '')}>
                <SelectTrigger id="year-select">
                  <SelectValue placeholder="Selecciona un año..." />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={exporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-1">
            {exporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Generar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
