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
import * as XLSX from 'xlsx'
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

      // Convertir y aplanar datos para el reporte de Excel
      const rows = data.map((c) => {
        const checklist = (c.documentos_checklist as Record<string, boolean>) || {}
        return {
          'Código Contenedor': c.codigo_contenedor,
          'Número de Contenedor': c.numero_contenedor ?? '—',
          'Estado Contenedor': c.estado.toUpperCase(),
          'ETA (Llegada Estimada)': c.fecha_eta ? c.fecha_eta.slice(0, 10) : '—',
          'ETD (Salida Estimada)': c.fecha_etd ? c.fecha_etd.slice(0, 10) : '—',
          'Llegada Real': c.fecha_llegada_real ? c.fecha_llegada_real.slice(0, 10) : '—',
          'Naviera': c.naviera ?? '—',
          'Buque': c.buque ?? '—',
          'Puerto Origen': c.puerto_origen ?? '—',
          'Puerto Destino': c.puerto_destino ?? '—',
          'Proveedores Consolidados': c.proveedores_nombres ?? '—',
          'Folios Órdenes B2B': c.folios_ordenes ?? '—',
          'Total Cajas': c.cajas_totales ?? 0,
          'Total Piezas': c.piezas_totales ?? 0,
          'CBM Ocupado (m³)': c.cbm_ocupado ?? 0,
          'CBM Máximo': c.cbm_total ?? 0,
          'Peso Total (kg)': c.peso_total_kg ?? 0,
          'Flete Marítimo (USD)': c.costo_flete_maritimo ?? 0,
          'Costo Desaduanamiento': c.costo_desaduanamiento ?? 0,
          'Detalles Pago Flete': c.pago_flete_detalles ?? '—',
          'Comentarios': c.comentarios ?? '—',
          'BL Recibido': checklist.bl ? 'SÍ' : 'NO',
          'Factura Recibida': checklist.factura ? 'SÍ' : 'NO',
          'Packing List Recibida': checklist.packing_list ? 'SÍ' : 'NO',
          'Telex Release': checklist.telex ? 'SÍ' : 'NO',
          'Muestras Entregadas': checklist.muestras ? 'SÍ' : 'NO',
        }
      })

      // Generar libro de trabajo y descargar
      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, `Contenedores ${selectedYear}`)

      // Ajustar anchos de columnas automáticamente
      const maxLens = Object.keys(rows[0]).map((key) => {
        return Math.max(
          key.length,
          ...rows.map((row: any) => String(row[key] ?? '').length)
        )
      })
      worksheet['!cols'] = maxLens.map((w) => ({ wch: w + 2 }))

      XLSX.writeFile(workbook, `Reporte_Contenedores_${selectedYear}.xlsx`)
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
