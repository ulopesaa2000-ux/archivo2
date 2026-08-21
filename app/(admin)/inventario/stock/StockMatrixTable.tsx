// app/(admin)/inventario/stock/StockMatrixTable.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Download,
  Package,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  ChevronDown as ChevronDownIcon,
  FileBox,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { exportStockMatrixAction } from '@/modules/inventario/actions'
import type { StockMatrixItem } from '@/modules/inventario/types'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  items: StockMatrixItem[]
  bodegasColumnas: BodegaRow[]
  total: number
  agruparPor?: string
  totalesCajasRealesPorBodega?: Record<number, number>
}

export function StockMatrixTable({ items, bodegasColumnas, total, agruparPor, totalesCajasRealesPorBodega }: Props) {
  const searchParams = useSearchParams()
  const [isExporting, setIsExporting] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (familia: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(familia)) next.delete(familia)
      else next.add(familia)
      return next
    })
  }

  // Agrupación de items si agruparPor === 'familia'
  const groupedItems = useMemo(() => {
    if (agruparPor !== 'familia') return null

    const groups: Record<string, { familia: string; total_general: number; stock_por_bodega: Record<number, number>; items: StockMatrixItem[] }> = {}
    
    items.forEach(item => {
      const familiaKey = item.producto_familia || 'Sin Familia'
      if (!groups[familiaKey]) {
        groups[familiaKey] = {
          familia: familiaKey,
          total_general: 0,
          stock_por_bodega: {},
          items: []
        }
      }
      
      groups[familiaKey].items.push(item)
      groups[familiaKey].total_general += item.total_general
      
      bodegasColumnas.forEach(b => {
        if (!groups[familiaKey].stock_por_bodega[b.id]) {
          groups[familiaKey].stock_por_bodega[b.id] = 0
        }
        groups[familiaKey].stock_por_bodega[b.id] += (item.stock_por_bodega[b.id]?.total ?? 0)
      })
    })
    
    // Sort groups by name alphabetically
    return Object.values(groups).sort((a, b) => a.familia.localeCompare(b.familia))
  }, [items, agruparPor, bodegasColumnas])

  // Cálculos de totales
  const { totalsPerBodega, grandTotal } = useMemo(() => {
    const totals: Record<number, number> = {}
    let grand = 0
    
    items.forEach(item => {
      grand += item.total_general
      bodegasColumnas.forEach(b => {
        if (!totals[b.id]) totals[b.id] = 0
        totals[b.id] += (item.stock_por_bodega[b.id]?.total ?? 0)
      })
    })
    
    return { totalsPerBodega: totals, grandTotal: grand }
  }, [items, bodegasColumnas])

  const grandTotalReal = useMemo(() => {
    if (totalesCajasRealesPorBodega && Object.keys(totalesCajasRealesPorBodega).length > 0) {
      return Object.values(totalesCajasRealesPorBodega).reduce((a, b) => a + b, 0)
    }
    return grandTotal
  }, [totalesCajasRealesPorBodega, grandTotal])

  const expandAll = () => {
    if (!groupedItems) return
    toast.info('Expandiendo vista espere un poco...', {
      duration: 1500,
      position: 'top-right'
    })
    const allFamilias = new Set(groupedItems.map(g => g.familia))
    setExpandedGroups(allFamilias)
  }

  // Mapear descripción general por familia para usar en subtotales
  const familyDescriptions = useMemo(() => {
    const map: Record<string, string> = {}
    items.forEach(item => {
      const family = item.producto_familia || 'Sin Familia'
      if (!map[family]) {
        map[family] = item.producto_nombre || item.producto_descripcion || ''
      }
    })
    return map
  }, [items])

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const downloadExcel = async (mode: 'flat' | 'grouped' = 'flat') => {
    setIsExporting(true)
    toast.info('Obteniendo datos de toda la matriz para exportar...')

    try {
      const q = searchParams.get('q') || undefined
      const con_stock_cero = searchParams.get('con_stock_cero') === 'true'
      const ciudadesRaw = searchParams.get('ciudades')
      const ciudades = ciudadesRaw ? ciudadesRaw.split(',').filter(Boolean) : undefined
      const bodegasRaw = searchParams.get('bodegas')
      const bodegas = bodegasRaw ? bodegasRaw.split(',').map(Number).filter(n => !isNaN(n)) : undefined

      const res = await exportStockMatrixAction({ q, con_stock_cero, ciudades, bodegas }, bodegasColumnas)
      if (!res.success || !res.data || res.data.length === 0) {
        toast.error(res.error || 'No se encontraron datos para exportar.')
        setIsExporting(false)
        return
      }

      const allItems = res.data
      const workbook = new ExcelJS.Workbook()
      
      // Mapear descripción general por familia y calcular totales
      const familyDescriptions: Record<string, string> = {}
      const itemsByFamily: Record<string, typeof allItems> = {}
      const expTotalsCajasPerBodega: Record<number, number> = {}
      const expTotalsPiezasPerBodega: Record<number, number> = {}
      let expGrandTotalCajas = 0
      let expGrandTotalPiezas = 0

      allItems.forEach(item => {
        const family = item.producto_familia || 'SIN FAMILIA'
        if (!familyDescriptions[family]) {
          familyDescriptions[family] = item.producto_nombre || item.producto_descripcion || ''
        }

        if (!itemsByFamily[family]) itemsByFamily[family] = []
        itemsByFamily[family].push(item)

        const pzCaja = item.pz_en_caja ?? 1
        let itemTotalCajas = 0
        let itemTotalPiezas = 0

        bodegasColumnas.forEach(b => {
          if (!expTotalsCajasPerBodega[b.id]) expTotalsCajasPerBodega[b.id] = 0
          if (!expTotalsPiezasPerBodega[b.id]) expTotalsPiezasPerBodega[b.id] = 0

          const cajas = item.stock_por_bodega[b.id]?.cajas ?? item.stock_por_bodega[b.id]?.total ?? 0
          const piezasSueltas = item.stock_por_bodega[b.id]?.piezas_sueltas ?? 0
          const totalPiezas = (cajas * pzCaja) + piezasSueltas

          expTotalsCajasPerBodega[b.id] += cajas
          expTotalsPiezasPerBodega[b.id] += totalPiezas

          itemTotalCajas += cajas
          itemTotalPiezas += totalPiezas
        })

        expGrandTotalCajas += itemTotalCajas
        expGrandTotalPiezas += itemTotalPiezas
      })

      // --- HOJA 1: DATOS (Machine Readable) ---
      const dataSheet = workbook.addWorksheet('Datos Stock')

      const columns = [
        { header: 'FAMILIA', key: 'familia', width: 20 },
        { header: 'DESCRIPCIÓN GENERAL', key: 'desc_gral', width: 45 },
        { header: 'SKU (ESTILO)', key: 'sku', width: 20 },
        { header: 'PZ X CAJA', key: 'pz_caja', width: 12 },
        ...bodegasColumnas.map(b => ({ header: b.nombre.toUpperCase(), key: `b_${b.id}`, width: 14 })),
        { header: 'TOTAL CAJAS', key: 'total_cajas', width: 15 },
        { header: 'TOTAL PIEZAS', key: 'total_piezas', width: 15 }
      ]
      dataSheet.columns = columns

      // Estilo Header Hoja 1
      dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      dataSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
      dataSheet.getRow(1).alignment = { horizontal: 'center' }

      // Colores por familia
      const uniqueFamilies = Array.from(new Set(allItems.map(i => i.producto_familia || 'SIN FAMILIA')))
      const familyColorMap: Record<string, string> = {}
      uniqueFamilies.forEach((f, idx) => {
        familyColorMap[f] = idx % 2 === 0 ? 'FFD9EAF7' : 'FFFFFFFF'
      })

      allItems.forEach(item => {
        const family = item.producto_familia || 'SIN FAMILIA'
        const pzCaja = item.pz_en_caja ?? 1
        let rowCajas = 0
        let rowPiezas = 0

        const rowValues: any = {
          familia: family,
          desc_gral: familyDescriptions[family],
          sku: item.producto_sku,
          pz_caja: pzCaja,
        }

        bodegasColumnas.forEach(b => {
          const cajas = item.stock_por_bodega[b.id]?.cajas ?? item.stock_por_bodega[b.id]?.total ?? 0
          const piezasSueltas = item.stock_por_bodega[b.id]?.piezas_sueltas ?? 0
          const totalPiezas = (cajas * pzCaja) + piezasSueltas
          rowValues[`b_${b.id}`] = cajas
          rowCajas += cajas
          rowPiezas += totalPiezas
        })

        rowValues.total_cajas = rowCajas
        rowValues.total_piezas = rowPiezas

        const row = dataSheet.addRow(rowValues)
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: familyColorMap[family] } }
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
        })
        row.getCell('total_cajas').font = { bold: true, color: { argb: 'FF0F172A' } }
        row.getCell('total_piezas').font = { bold: true, color: { argb: 'FFDC2626' } }
      })

      // Filas de Resumen al final de Hoja 1 (Datos Stock)
      dataSheet.addRow({})

      const dataRowCajasValues: any = {
        familia: '',
        desc_gral: '',
        sku: 'TOTAL CAJAS',
        pz_caja: '',
        total_cajas: expGrandTotalCajas,
        total_piezas: ''
      }
      bodegasColumnas.forEach(b => {
        dataRowCajasValues[`b_${b.id}`] = expTotalsCajasPerBodega[b.id] ?? 0
      })
      const dataRowCajas = dataSheet.addRow(dataRowCajasValues)
      dataRowCajas.font = { bold: true }
      dataRowCajas.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      dataRowCajas.getCell('sku').alignment = { horizontal: 'right' }
      dataRowCajas.getCell('total_cajas').font = { bold: true, color: { argb: 'FFDC2626' } }

      const dataRowBodegasValues: any = {
        familia: '',
        desc_gral: '',
        sku: 'BODEGAS',
        pz_caja: '',
        total_cajas: 'TOTAL',
        total_piezas: ''
      }
      bodegasColumnas.forEach(b => {
        dataRowBodegasValues[`b_${b.id}`] = b.nombre.toUpperCase()
      })
      const dataRowBodegas = dataSheet.addRow(dataRowBodegasValues)
      dataRowBodegas.font = { bold: true, size: 9 }
      dataRowBodegas.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      dataRowBodegas.getCell('sku').alignment = { horizontal: 'right' }
      dataRowBodegas.getCell('total_cajas').font = { bold: true, color: { argb: 'FFDC2626' } }

      // --- HOJA 2: FORMATO IMPRESIÓN (Similar a la imagen) ---
      const printSheet = workbook.addWorksheet('Formato Impresión')
      
      // Configuración para Impresión: Repetir encabezados en cada página
      printSheet.pageSetup.printTitlesRow = '3:3'
      printSheet.pageSetup.paperSize = 9 // A4
      printSheet.pageSetup.orientation = 'landscape'
      
      // Márgenes estrechos (en pulgadas)
      printSheet.pageSetup.margins = {
        left: 0.25, right: 0.25,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      }
      
      // Ajustar todas las columnas en una página
      printSheet.pageSetup.fitToPage = true
      printSheet.pageSetup.fitToWidth = 1
      printSheet.pageSetup.fitToHeight = 0 // Altura automática según contenido
      
      // Títulos grandes arriba
      printSheet.mergeCells('A1:C1')
      printSheet.getCell('A1').value = 'REPORTE DE EXISTENCIAS GLOBAL'
      printSheet.getCell('A1').font = { bold: true, size: 18 }
      
      // Headers de Bodegas Inclinados
      const startBodegaCol = 4
      const headerRowIdx = 3
      const headerRow = printSheet.getRow(headerRowIdx)
      headerRow.height = 90 // Más alto para el texto inclinado
      
      // Estilo para headers de Familia, Estilo, Descripcion
      const mainHeaderStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 12 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: { bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } }
      }

      const c1 = printSheet.getCell(headerRowIdx, 1); c1.value = 'FAMILIA'; Object.assign(c1, mainHeaderStyle);
      const c2 = printSheet.getCell(headerRowIdx, 2); c2.value = 'ESTILO'; Object.assign(c2, mainHeaderStyle);
      const c3 = printSheet.getCell(headerRowIdx, 3); c3.value = 'DESCRIPCION'; Object.assign(c3, mainHeaderStyle);
      
      bodegasColumnas.forEach((b, idx) => {
        const cell = printSheet.getCell(headerRowIdx, startBodegaCol + idx)
        cell.value = b.nombre.toUpperCase()
        cell.alignment = { textRotation: 45, vertical: 'middle', horizontal: 'center' }
        cell.font = { bold: true, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        cell.border = { bottom: { style: 'medium' }, left: { style: 'thin' } }
      })
      
      const globalCol = startBodegaCol + bodegasColumnas.length
      const globalHeader = printSheet.getCell(headerRowIdx, globalCol)
      globalHeader.value = 'GLOBAL'
      globalHeader.alignment = { textRotation: 45, vertical: 'middle', horizontal: 'center' }
      globalHeader.font = { bold: true, color: { argb: 'FFDC2626' } }
      globalHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }

      // Datos en Hoja de Impresión con Merge
      let currentRowIdx = 4
      Object.entries(itemsByFamily).forEach(([family, familyItems], fIdx) => {
        const startRow = currentRowIdx
        const isEven = fIdx % 2 === 0
        const bgColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB'
        
        familyItems.forEach((item, itemIdx) => {
          const row = printSheet.getRow(currentRowIdx)
          row.height = 35 // Filas más altas para que se vean cuadradas
          
          if (itemIdx === 0) {
            printSheet.getCell(currentRowIdx, 1).value = family
            printSheet.getCell(currentRowIdx, 3).value = familyDescriptions[family]
          }
          
          const estiloCell = printSheet.getCell(currentRowIdx, 2)
          estiloCell.value = item.producto_sku
          estiloCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
          estiloCell.font = { size: 11, bold: true }
          
          bodegasColumnas.forEach((b, bIdx) => {
            const val = item.stock_por_bodega[b.id]?.cajas ?? item.stock_por_bodega[b.id]?.total ?? 0
            const cell = printSheet.getCell(currentRowIdx, startBodegaCol + bIdx)
            cell.value = val // Mantener como número para cálculos en Excel
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            
            // Estilo de número: 0 en gris, >0 en Negro Negrita
            cell.font = { 
              size: 13, 
              bold: val > 0, 
              color: { argb: val > 0 ? 'FF000000' : 'FFD1D5DB' } 
            }
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
          })
          
          const totalCell = printSheet.getCell(currentRowIdx, globalCol)
          totalCell.value = item.total_general
          totalCell.font = { bold: true, color: { argb: 'FFDC2626' }, size: 13 }
          totalCell.alignment = { horizontal: 'center', vertical: 'middle' }
          totalCell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } } }

          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
          currentRowIdx++
        })

        const endRow = currentRowIdx - 1
        
        // Realizar Merges para Familia y Descripcion
        if (startRow < endRow) {
          printSheet.mergeCells(startRow, 1, endRow, 1)
          printSheet.mergeCells(startRow, 3, endRow, 3)
        }

        // Estilo para las celdas merged
        const familyCell = printSheet.getCell(startRow, 1);
        const descCell = printSheet.getCell(startRow, 3);
        
        [familyCell, descCell].forEach((cell: any) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.font = { bold: true, size: 10 };
          cell.border = { 
            bottom: { style: 'medium', color: { argb: 'FF475569' } },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Borde grueso al final de cada bloque de familia para "margen"
        const lastRow = printSheet.getRow(endRow)
        lastRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { 
            ...cell.border,
            bottom: { style: 'medium', color: { argb: 'FF475569' } } 
          }
        })
      })

      // RESUMEN AL FINAL EN HOJA DE IMPRESIÓN (Idéntico a la imagen de referencia: TOTAL CAJAS + BODEGAS)
      currentRowIdx += 2

      // 1. FILA TOTAL CAJAS
      const rowCajasIdx = currentRowIdx
      printSheet.getRow(rowCajasIdx).height = 28
      printSheet.getCell(rowCajasIdx, 3).value = 'TOTAL CAJAS'
      printSheet.getCell(rowCajasIdx, 3).font = { bold: true, size: 11, color: { argb: 'FF1E293B' } }
      printSheet.getCell(rowCajasIdx, 3).alignment = { horizontal: 'right', vertical: 'middle' }
      printSheet.getCell(rowCajasIdx, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      printSheet.getCell(rowCajasIdx, 3).border = { top: { style: 'medium' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      bodegasColumnas.forEach((b, idx) => {
        const cell = printSheet.getCell(rowCajasIdx, startBodegaCol + idx)
        cell.value = expTotalsCajasPerBodega[b.id] ?? 0
        cell.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        cell.border = { top: { style: 'medium' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      })

      const finalCajasCell = printSheet.getCell(rowCajasIdx, globalCol)
      finalCajasCell.value = expGrandTotalCajas
      finalCajasCell.font = { bold: true, size: 13, color: { argb: 'FFDC2626' } }
      finalCajasCell.alignment = { horizontal: 'center', vertical: 'middle' }
      finalCajasCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      finalCajasCell.border = { top: { style: 'medium' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      // 2. FILA NOMBRE DE BODEGA ABAJO (Idéntica a la imagen de referencia)
      currentRowIdx++
      const rowBodegasIdx = currentRowIdx
      printSheet.getRow(rowBodegasIdx).height = 42
      printSheet.getCell(rowBodegasIdx, 3).value = 'BODEGAS'
      printSheet.getCell(rowBodegasIdx, 3).font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } }
      printSheet.getCell(rowBodegasIdx, 3).alignment = { horizontal: 'right', vertical: 'middle' }
      printSheet.getCell(rowBodegasIdx, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      printSheet.getCell(rowBodegasIdx, 3).border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } }

      bodegasColumnas.forEach((b, idx) => {
        const cell = printSheet.getCell(rowBodegasIdx, startBodegaCol + idx)
        cell.value = b.nombre.toUpperCase()
        cell.font = { bold: true, size: 9, color: { argb: 'FF0F172A' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } }
      })

      const finalBodegaTotalCell = printSheet.getCell(rowBodegasIdx, globalCol)
      finalBodegaTotalCell.value = 'TOTAL'
      finalBodegaTotalCell.font = { bold: true, size: 11, color: { argb: 'FFDC2626' } }
      finalBodegaTotalCell.alignment = { horizontal: 'center', vertical: 'middle' }
      finalBodegaTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      finalBodegaTotalCell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } }

      // Anchos Hoja Impresión
      printSheet.getColumn(1).width = 15
      printSheet.getColumn(2).width = 18
      printSheet.getColumn(3).width = 50
      bodegasColumnas.forEach((_, idx) => {
        printSheet.getColumn(startBodegaCol + idx).width = 12
      })
      printSheet.getColumn(globalCol).width = 12

      // Descargar
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Reporte_Stock_Matriz_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Excel profesional generado (${allItems.length} productos exportados)`)
    } catch (err: any) {
      toast.error('Error al exportar Excel: ' + (err.message ?? 'Desconocido'))
    } finally {
      setIsExporting(false)
    }
  }

  if (bodegasColumnas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
        <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium">No se han seleccionado bodegas.</p>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Seleccione al menos una bodega, o la opción &ldquo;Todas las bodegas&rdquo; en los filtros superiores, para visualizar el inventario.
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No se encontraron productos con stock en las bodegas seleccionadas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {agruparPor === 'familia' && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll}>
                <Maximize2 className="mr-2 h-4 w-4" />
                Expandir Todo
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                <Minimize2 className="mr-2 h-4 w-4" />
                Colapsar Todo
              </Button>
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting} className="font-semibold text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando todo...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Excel
                  <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={() => downloadExcel('flat')}>
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
              Stock General (Plano)
            </DropdownMenuItem>
            {agruparPor === 'familia' && (
              <DropdownMenuItem onClick={() => downloadExcel('grouped')}>
                <FileBox className="mr-2 h-4 w-4 text-blue-600" />
                Stock por Familias
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border overflow-x-auto shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b font-semibold text-muted-foreground">
              <th className="px-4 py-3 text-left sticky left-0 bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] w-[140px] min-w-[140px] align-bottom">
                Familia
              </th>
              <th className="px-4 py-3 text-left sticky left-[140px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] w-[160px] min-w-[160px] border-l align-bottom">
                SKU
              </th>
              <th className="px-4 py-3 text-left border-l min-w-[250px] align-bottom">
                Descripción
              </th>
              <th className="px-3 py-2.5 text-center border-l bg-primary/5 align-bottom" title="Total general de cajas en todas las bodegas">
                <div className="flex flex-col items-center gap-1 min-w-[85px]">
                  <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-2xs tabular-nums">
                    {grandTotalReal.toLocaleString('es-MX')} {grandTotalReal === 1 ? 'caja' : 'cajas'}
                  </div>
                  <span className="font-bold text-primary text-xs uppercase tracking-wider">TOTAL</span>
                </div>
              </th>
              {bodegasColumnas.map((b) => {
                const totalCajasBodega = totalesCajasRealesPorBodega?.[b.id] ?? totalsPerBodega[b.id] ?? 0
                return (
                  <th key={b.id} className="px-3 py-2.5 text-center border-l whitespace-nowrap align-bottom">
                    <div className="flex flex-col items-center gap-1 min-w-[90px]">
                      <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-black bg-blue-100/90 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-300/70 dark:border-blue-700/50 shadow-2xs tabular-nums">
                        {totalCajasBodega.toLocaleString('es-MX')} {totalCajasBodega === 1 ? 'caja' : 'cajas'}
                      </div>
                      <span className="block truncate max-w-[125px] font-bold text-foreground text-xs" title={b.nombre}>
                        {b.nombre}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {groupedItems ? (
              groupedItems.map((group, groupIdx) => {
                const isExpanded = expandedGroups.has(group.familia)
                const isEven = groupIdx % 2 === 0
                const rowBgClass = isEven ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-background'
                
                return (
                  <React.Fragment key={`group-${group.familia}`}>
                    {/* Fila Agrupadora (Familia) */}
                    <tr 
                      className={`border-b hover:bg-blue-100/50 dark:hover:bg-blue-900/20 font-medium cursor-pointer transition-colors ${rowBgClass}`} 
                      onClick={() => toggleGroup(group.familia)}
                    >
                      <td className={`px-4 py-3 sticky left-0 backdrop-blur z-20 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] w-[140px] min-w-[140px] ${isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90 dark:bg-muted/40'}`}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                          <span className="block whitespace-nowrap truncate font-bold text-primary">{group.familia}</span>
                        </div>
                      </td>
                      <td colSpan={2} className={`px-4 py-3 sticky left-[140px] z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] text-muted-foreground italic text-xs truncate whitespace-nowrap overflow-hidden max-w-[400px] ${isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90 dark:bg-muted/40'}`} title={familyDescriptions[group.familia]}>
                        {familyDescriptions[group.familia]}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-bold border-l border-r bg-primary/5">
                        {group.total_general}
                      </td>
                      {bodegasColumnas.map(b => {
                        const val = group.stock_por_bodega[b.id] ?? 0
                        return (
                          <td key={`group-b-${b.id}`} className="px-4 py-3 text-center tabular-nums border-l border-muted/50 text-muted-foreground">
                            {val > 0 ? val : '—'}
                          </td>
                        )
                      })}
                    </tr>
                    
                    {/* Filas Hijos (Productos) */}
                    {isExpanded && group.items.map((item) => (
                      <tr key={item.producto_id} className={`border-b last:border-0 hover:bg-primary/5 ${isEven ? 'bg-blue-50/20 dark:bg-blue-900/5' : 'bg-background'}`}>
                        <td className={`px-4 py-2 sticky left-0 backdrop-blur z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] text-xs text-muted-foreground italic w-[140px] min-w-[140px] ${isEven ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'bg-background/95'}`}>
                          {group.familia}
                        </td>
                        <td className={`px-4 py-2 sticky left-[140px] backdrop-blur z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] font-mono text-xs border-l w-[160px] min-w-[160px] ${isEven ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'bg-background/95'}`}>
                          {item.producto_sku}
                        </td>
                        <td className="px-4 py-2 text-xs border-l truncate max-w-[300px] min-w-[250px]" title={item.producto_descripcion || item.producto_nombre || ''}>
                          {item.producto_nombre || item.producto_descripcion}
                        </td>
                        <td className="px-4 py-2 text-center text-sm tabular-nums bg-muted/5 border-l border-r font-medium">
                          {item.total_general}
                        </td>
                        {bodegasColumnas.map(b => {
                          const val = item.stock_por_bodega[b.id]?.total ?? 0
                          return (
                            <td key={`child-${item.producto_id}-${b.id}`} className="px-4 py-2 text-sm text-center tabular-nums border-l border-muted/30">
                              {val > 0 ? (
                                <span className="text-primary">{val}</span>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })
            ) : (
              items.map((item) => (
                <tr key={item.producto_id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 sticky left-0 bg-background/95 backdrop-blur z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] text-xs text-muted-foreground">
                    {item.producto_familia || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-sm border-l">
                    {item.producto_sku}
                  </td>
                  <td className="px-4 py-3 text-xs border-l truncate max-w-[300px]" title={item.producto_descripcion || item.producto_nombre || ''}>
                    {item.producto_nombre || item.producto_descripcion}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-semibold bg-muted/10 border-l border-r">
                    {item.total_general}
                  </td>
                  {bodegasColumnas.map(b => {
                    const val = item.stock_por_bodega[b.id]?.total ?? 0
                    return (
                      <td key={b.id} className="px-4 py-3 text-center tabular-nums border-l border-muted/50">
                        {val > 0 ? (
                          <span className="font-medium text-primary">{val}</span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-muted/50 font-bold border-t-2 border-primary/20">
            <tr>
              <td className="px-4 py-4 sticky left-0 bg-muted/90 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b]">
                TOTALES GENERALES
              </td>
              <td className="border-l bg-muted/20"></td>
              <td className="border-l bg-muted/20"></td>
              <td className="px-4 py-4 text-center tabular-nums border-l border-r bg-primary/10 text-primary">
                {grandTotal}
              </td>
              {bodegasColumnas.map(b => (
                <td key={`foot-${b.id}`} className="px-4 py-4 text-center tabular-nums border-l bg-muted/30">
                  {totalsPerBodega[b.id] ?? 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
