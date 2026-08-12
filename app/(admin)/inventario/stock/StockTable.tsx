// app/(admin)/inventario/stock/StockTable.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Loader2, Package, Maximize2, Minimize2, Download, FileSpreadsheet } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import { exportStockByBodegaAction } from '@/modules/inventario/actions'
import type { StockListItem, StockDetalleCaja } from '@/modules/inventario/types'

export function StockTable({
  items,
  bodegaId,
  agruparPor,
}: {
  items: StockListItem[]
  bodegaId: number
  agruparPor?: string
}) {
  const searchParams = useSearchParams()
  const [isExporting, setIsExporting] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, StockDetalleCaja[] | null>>({})
  const [loading, setLoading] = useState<Record<number, boolean>>({})
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

    const groups: Record<string, { familia: string; total_piezas: number; total_cajas: number; items: StockListItem[] }> = {}
    
    items.forEach(item => {
      const familiaKey = item.producto_familia || 'Sin Familia'
      if (!groups[familiaKey]) {
        groups[familiaKey] = {
          familia: familiaKey,
          total_piezas: 0,
          total_cajas: 0,
          items: []
        }
      }
      
      const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas

      groups[familiaKey].items.push(item)
      groups[familiaKey].total_piezas += totalPiezas
      groups[familiaKey].total_cajas += item.cajas
    })
    
    return Object.values(groups).sort((a, b) => a.familia.localeCompare(b.familia))
  }, [items, agruparPor])

  // Totales
  const { totalCajas, totalPiezas } = useMemo(() => {
    let tc = 0
    let tp = 0
    items.forEach(item => {
      tc += item.cajas
      tp += (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
    })
    return { totalCajas: tc, totalPiezas: tp }
  }, [items])

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

  const expandAll = () => {
    if (!groupedItems) return
    toast.info('Expandiendo vista espere un poco...', {
      duration: 1500,
      position: 'top-right'
    })
    setExpandedGroups(new Set(groupedItems.map(g => g.familia)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const downloadExcel = async () => {
    setIsExporting(true)
    toast.info('Obteniendo existencias completas para exportar...')

    try {
      const q = searchParams.get('q') || undefined
      const con_stock_cero = searchParams.get('con_stock_cero') === 'true'

      const res = await exportStockByBodegaAction(bodegaId, { q, con_stock_cero })
      if (!res.success || !res.data || res.data.length === 0) {
        toast.error(res.error || 'No se encontraron datos para exportar.')
        setIsExporting(false)
        return
      }

      const allItems = res.data
      const workbook = new ExcelJS.Workbook()
      
      // --- HOJA 1: DATOS ---
      const dataSheet = workbook.addWorksheet('Datos Stock')
      
      // Mapear descripción general por familia
      const familyDescriptions: Record<string, string> = {}
      allItems.forEach(item => {
        const family = item.producto_familia || 'SIN FAMILIA'
        if (!familyDescriptions[family]) {
          familyDescriptions[family] = item.producto_nombre || item.producto_descripcion || ''
        }
      })

      dataSheet.columns = [
        { header: 'FAMILIA', key: 'familia', width: 20 },
        { header: 'DESCRIPCIÓN GENERAL', key: 'desc_gral', width: 45 },
        { header: 'SKU (ESTILO)', key: 'sku', width: 20 },
        { header: 'MARCA', key: 'marca', width: 20 },
        { header: 'CAJAS', key: 'cajas', width: 12 },
        { header: 'PZ SUELTAS', key: 'piezas_sueltas', width: 12 },
        { header: 'TOTAL PIEZAS', key: 'total_piezas', width: 15 },
        { header: 'UBICACIÓN', key: 'ubicacion', width: 15 }
      ]

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
        const row = dataSheet.addRow({
          familia: family,
          desc_gral: familyDescriptions[family],
          sku: item.producto_sku,
          marca: item.marca_nombre || '',
          cajas: item.cajas,
          piezas_sueltas: item.piezas_sueltas,
          total_piezas: (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas,
          ubicacion: item.ubicacion_pasillo || ''
        })

        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: familyColorMap[family] } }
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
        })
      })

      // --- HOJA 2: FORMATO IMPRESIÓN ---
      const printSheet = workbook.addWorksheet('Formato Impresión')
      
      // Configuración para Impresión: Repetir encabezados
      printSheet.pageSetup.printTitlesRow = '3:3'
      printSheet.pageSetup.paperSize = 9
      printSheet.pageSetup.orientation = 'landscape'
      
      // Márgenes estrechos
      printSheet.pageSetup.margins = {
        left: 0.25, right: 0.25,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3
      }
      
      // Ajustar columnas a una página
      printSheet.pageSetup.fitToPage = true
      printSheet.pageSetup.fitToWidth = 1
      printSheet.pageSetup.fitToHeight = 0

      printSheet.mergeCells('A1:C1')
      printSheet.getCell('A1').value = `REPORTE DE EXISTENCIAS - BODEGA ${bodegaId}`
      printSheet.getCell('A1').font = { bold: true, size: 18 }
      
      // Header Hoja 2
      const headerRowIdx = 3
      const headerRow = printSheet.getRow(headerRowIdx)
      headerRow.height = 40
      
      const mainHeaderStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, size: 12 },
        alignment: { vertical: 'middle', horizontal: 'center' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: { bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } }
      }

      const headers = ['FAMILIA', 'ESTILO', 'DESCRIPCION', 'CAJAS', 'PZ SUELTAS', 'TOTAL PIEZAS', 'UBICACION']
      headers.forEach((h, i) => {
        const cell = printSheet.getCell(headerRowIdx, i + 1)
        cell.value = h
        Object.assign(cell, mainHeaderStyle)
      })

      // Agrupar items por familia
      const itemsByFamily: Record<string, typeof allItems> = {}
      let expTotalCajas = 0
      let expTotalPiezas = 0

      allItems.forEach(item => {
        expTotalCajas += item.cajas
        expTotalPiezas += (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas

        const f = item.producto_familia || 'SIN FAMILIA'
        if (!itemsByFamily[f]) itemsByFamily[f] = []
        itemsByFamily[f].push(item)
      })

      let currentRowIdx = 4
      Object.entries(itemsByFamily).forEach(([family, familyItems], fIdx) => {
        const startRow = currentRowIdx
        const isEven = fIdx % 2 === 0
        const bgColor = isEven ? 'FFFFFFFF' : 'FFF9FAFB'

        familyItems.forEach((item, itemIdx) => {
          const row = printSheet.getRow(currentRowIdx)
          row.height = 35
          
          if (itemIdx === 0) {
            printSheet.getCell(currentRowIdx, 1).value = family
            printSheet.getCell(currentRowIdx, 3).value = familyDescriptions[family]
          }
          
          const estiloCell = printSheet.getCell(currentRowIdx, 2)
          estiloCell.value = item.producto_sku
          estiloCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
          estiloCell.font = { size: 11, bold: true }

          const cajas = item.cajas
          const pzSueltas = item.piezas_sueltas
          const totalPz = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
          
          const styleNum = (val: number) => ({
            value: val,
            alignment: { horizontal: 'center', vertical: 'middle' },
            font: { size: 13, bold: val > 0, color: { argb: val > 0 ? 'FF000000' : 'FFD1D5DB' } }
          })

          Object.assign(printSheet.getCell(currentRowIdx, 4), styleNum(cajas))
          Object.assign(printSheet.getCell(currentRowIdx, 5), styleNum(pzSueltas))
          Object.assign(printSheet.getCell(currentRowIdx, 6), styleNum(totalPz))

          printSheet.getCell(currentRowIdx, 7).value = item.ubicacion_pasillo || ''
          
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } }
          })

          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
          currentRowIdx++
        })

        const endRow = currentRowIdx - 1
        
        if (startRow < endRow) {
          printSheet.mergeCells(startRow, 1, endRow, 1)
          printSheet.mergeCells(startRow, 3, endRow, 3)
        }

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

        // Borde grueso al final del bloque
        printSheet.getRow(endRow).eachCell({ includeEmpty: true }, (cell: any) => {
          cell.border = { ...cell.border, bottom: { style: 'medium', color: { argb: 'FF475569' } } };
        });
      })

      // Resumen Footer
      currentRowIdx += 2
      printSheet.getCell(currentRowIdx, 3).value = 'TOTALES GENERALES:'
      printSheet.getCell(currentRowIdx, 4).value = expTotalCajas
      printSheet.getCell(currentRowIdx, 6).value = expTotalPiezas
      printSheet.getRow(currentRowIdx).font = { bold: true, size: 12 }

      printSheet.getColumn(1).width = 15
      printSheet.getColumn(2).width = 18
      printSheet.getColumn(3).width = 50
      printSheet.getColumn(6).width = 15

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Stock_Bodega_${bodegaId}_Completo_${new Date().toISOString().split('T')[0]}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Excel profesional generado (${allItems.length} productos)`)
    } catch (err: any) {
      toast.error('Error al exportar Excel: ' + (err.message ?? 'Desconocido'))
    } finally {
      setIsExporting(false)
    }
  }

  const toggleExpand = async (productoId: number) => {
    if (expanded[productoId] !== undefined) {
      setExpanded((prev) => {
        const next = { ...prev }
        delete next[productoId]
        return next
      })
      return
    }

    setLoading((prev) => ({ ...prev, [productoId]: true }))

    try {
      const res = await fetch(
        `/api/inventario/stock-detalle?bodega_id=${bodegaId}&producto_id=${productoId}`
      )
      if (res.ok) {
        const data = await res.json()
        setExpanded((prev) => ({ ...prev, [productoId]: data }))
      }
    } catch {
      setExpanded((prev) => ({ ...prev, [productoId]: [] }))
    }

    setLoading((prev) => ({ ...prev, [productoId]: false }))
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border">
        <Package className="h-12 w-12" />
        <p className="text-sm mt-4">No hay stock registrado en esta bodega.</p>
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
        
        <Button
          variant="outline"
          size="sm"
          onClick={downloadExcel}
          disabled={isExporting}
          className="text-green-600 font-bold hover:bg-green-50 dark:hover:bg-green-950/30"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportando todo...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
              <th className="px-2 py-3 w-[40px] sticky left-0 bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0]"></th>
              <th className="px-4 py-3 text-left sticky left-[40px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[120px] min-w-[120px]">Familia</th>
              <th className="px-4 py-3 text-left border-l sticky left-[160px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px]">SKU</th>
              <th className="px-4 py-3 text-left border-l hidden md:table-cell min-w-[200px]">Descripción</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell border-l">Marca</th>
              <th className="px-4 py-3 text-center border-l">Cajas</th>
              <th className="px-4 py-3 text-center border-l">Pz Sueltas</th>
              <th className="px-4 py-3 text-right border-l">Total Piezas</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell border-l">Ubicación</th>
            </tr>
          </thead>
        <tbody>
          {groupedItems ? (
            groupedItems.map((group, groupIdx) => {
              const isGroupExpanded = expandedGroups.has(group.familia)
              const isEven = groupIdx % 2 === 0
              const rowBgClass = isEven ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-background'
              
              return (
                <React.Fragment key={`group-${group.familia}`}>
                  {/* Fila Agrupadora (Familia) */}
                  <tr 
                    className={`border-b hover:bg-blue-100/50 dark:hover:bg-blue-900/20 font-medium cursor-pointer transition-colors ${rowBgClass}`} 
                    onClick={() => toggleGroup(group.familia)}
                  >
                    <td className={`px-2 py-3 sticky left-0 z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[40px] ${isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90'}`}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary pointer-events-none">
                        {isGroupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </td>
                    <td className={`px-4 py-3 font-bold text-sm text-primary sticky left-[40px] z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[120px] min-w-[120px] ${isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90'}`}>
                      {group.familia}
                    </td>
                    <td colSpan={3} className={`px-4 py-3 text-xs text-muted-foreground italic bg-muted/5 truncate whitespace-nowrap overflow-hidden max-w-[400px] sticky left-[160px] z-20 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] ${isEven ? 'bg-blue-50/90 dark:bg-blue-900/40' : 'bg-muted/90'}`} title={familyDescriptions[group.familia]}>
                      {familyDescriptions[group.familia]}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold bg-primary/5 border-l border-r">{group.total_cajas}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground bg-muted/5">—</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold bg-primary/10 text-primary border-l">{group.total_piezas}</td>
                    <td colSpan={2} className="px-4 py-3 hidden xl:table-cell"></td>
                  </tr>
 
                  {/* Filas Hijos (Productos) */}
                  {isGroupExpanded && group.items.map(item => {
                    const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
                    const isExpanded = expanded[item.producto_id] !== undefined
                    const isLoading = loading[item.producto_id]
                    const detalles = expanded[item.producto_id]
 
                    return (
                      <React.Fragment key={`child-${item.id}`}>
                        <tr className={`border-t hover:bg-primary/5 ${isEven ? 'bg-blue-50/20 dark:bg-blue-900/5' : 'bg-background'}`}>
                          <td className={`px-2 py-2 text-right sticky left-0 z-10 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[40px] ${isEven ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'bg-background/95'}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(item.producto_id)}
                            >
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          </td>
                          <td className={`px-4 py-2 text-xs text-muted-foreground italic sticky left-[40px] z-10 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[120px] min-w-[120px] ${isEven ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'bg-background/95'}`}>
                            {group.familia}
                          </td>
                          <td className={`px-4 py-2 font-mono text-xs font-medium border-l sticky left-[160px] z-10 backdrop-blur shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] ${isEven ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'bg-background/95'}`}>
                            {item.producto_sku}
                          </td>
                          <td className="px-4 py-2 text-xs hidden md:table-cell truncate max-w-[300px] border-l" title={item.producto_descripcion || item.producto_nombre || ''}>
                            {item.producto_descripcion || item.producto_nombre || '—'}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell border-l">
                            {item.marca_nombre ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-center tabular-nums font-medium border-l">
                            {item.cajas}
                          </td>
                          <td className="px-4 py-2 text-center tabular-nums border-l">
                            {item.piezas_sueltas}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold border-l">
                            {totalPiezas}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground hidden xl:table-cell border-l">
                            {item.ubicacion_pasillo ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-right hidden xl:table-cell border-l">
                            <Fecha valor={item.updated_at} formato="relativo" className="text-xs text-muted-foreground" />
                          </td>
                        </tr>

                        {isExpanded && detalles && detalles.length > 0 && (
                          <tr key={`${item.id}-detail`} className="bg-muted/10">
                            <td></td>
                            <td colSpan={8} className="px-4 py-3">
                              <div className="rounded border border-muted-foreground/20 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/30">
                                      <th className="px-3 py-1.5 text-left">Caja</th>
                                      <th className="px-3 py-1.5 text-left">Pack</th>
                                      <th className="px-3 py-1.5 text-center">Cajas</th>
                                      <th className="px-3 py-1.5 text-center">Piezas</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalles.map((d) => (
                                      <tr key={d.id} className="border-t border-muted-foreground/10">
                                        <td className="px-3 py-1.5 font-mono">{d.caja_codigo ?? '—'}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground">{d.caja_nombre_pack ?? '—'}</td>
                                        <td className="px-3 py-1.5 text-center tabular-nums">{d.cajas}</td>
                                        <td className="px-3 py-1.5 text-center tabular-nums">{d.piezas_sueltas}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}

                        {isExpanded && detalles && detalles.length === 0 && (
                          <tr key={`${item.id}-empty`} className="bg-muted/10">
                            <td></td>
                            <td colSpan={8} className="px-4 py-3 text-xs text-muted-foreground text-center">
                              Sin desglose por caja para este producto.
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              )
            })
          ) : (
            items.map((item) => {
              const totalPiezas = (item.cajas * (item.producto_pz_en_caja ?? 0)) + item.piezas_sueltas
              const isExpanded = expanded[item.producto_id] !== undefined
              const isLoading = loading[item.producto_id]
              const detalles = expanded[item.producto_id]

              return (
                <React.Fragment key={item.id}>
                  <tr className="border-t hover:bg-muted/30">
                    <td className="px-2 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleExpand(item.producto_id)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {item.producto_familia || '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs font-medium border-l">
                      {item.producto_sku}
                    </td>
                    <td className="px-4 py-2 text-xs hidden md:table-cell truncate max-w-[300px] border-l" title={item.producto_descripcion || item.producto_nombre || ''}>
                      {item.producto_descripcion || item.producto_nombre || '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell border-l">
                      {item.marca_nombre ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums font-medium border-l">
                      {item.cajas}
                    </td>
                    <td className="px-4 py-2 text-center tabular-nums border-l">
                      {item.piezas_sueltas}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold border-l">
                      {totalPiezas}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground hidden xl:table-cell border-l">
                      {item.ubicacion_pasillo ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-right hidden xl:table-cell border-l">
                      <Fecha valor={item.updated_at} formato="relativo" className="text-xs text-muted-foreground" />
                    </td>
                  </tr>

                  {/* Fila expandida: detalle por caja */}
                  {isExpanded && detalles && detalles.length > 0 && (
                    <tr key={`${item.id}-detail`} className="bg-muted/20">
                      <td></td>
                      <td colSpan={8} className="px-4 py-3">
                        <div className="rounded border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-3 py-1.5 text-left">Caja</th>
                                <th className="px-3 py-1.5 text-left">Pack</th>
                                <th className="px-3 py-1.5 text-center">Cajas</th>
                                <th className="px-3 py-1.5 text-center">Piezas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalles.map((d) => (
                                <tr key={d.id} className="border-t">
                                  <td className="px-3 py-1.5 font-mono">{d.caja_codigo ?? '—'}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{d.caja_nombre_pack ?? '—'}</td>
                                  <td className="px-3 py-1.5 text-center tabular-nums">{d.cajas}</td>
                                  <td className="px-3 py-1.5 text-center tabular-nums">{d.piezas_sueltas}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}

                  {isExpanded && detalles && detalles.length === 0 && (
                    <tr key={`${item.id}-empty`} className="bg-muted/20">
                      <td></td>
                      <td colSpan={8} className="px-4 py-3 text-xs text-muted-foreground text-center">
                        Sin desglose por caja para este producto.
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })
            )}
          </tbody>
          <tfoot className="bg-muted/50 font-bold border-t-2 border-primary/20">
            <tr>
              <td colSpan={2} className="px-4 py-4 text-left">TOTALES GENERALES</td>
              <td className="border-l"></td>
              <td className="hidden md:table-cell border-l"></td>
              <td className="hidden lg:table-cell border-l"></td>
              <td className="px-4 py-4 text-center tabular-nums border-l bg-muted/20">{totalCajas}</td>
              <td className="px-4 py-4 text-center tabular-nums border-l">—</td>
              <td className="px-4 py-4 text-right tabular-nums border-l bg-primary/10 text-primary">{totalPiezas}</td>
              <td colSpan={2} className="hidden xl:table-cell border-l"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

