// app/(admin)/inventario/trazabilidad/components/TrazabilidadMatrizTable.tsx
'use client'

import React, { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Package,
  Route,
  ArrowRight,
  ArrowLeftRight,
  Download,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import ExcelJS from 'exceljs'
import Link from 'next/link'
import type { FilaTrazabilidadMatriz, NotaCanceladaResumen, NotasCeldaRespuesta } from '@/modules/inventario/trazabilidad'
import { fetchNotasCelda } from '@/modules/inventario/trazabilidad'
import { TrazabilidadTimelineDrawer } from './TrazabilidadTimelineDrawer'
import { compareFamiliaAsc, compareSkuAsc, isUnassignedFamily as isUnassignedFamilyCanon } from '@/lib/inventario/familias-orden'

interface Props {
  filas: FilaTrazabilidadMatriz[]
  ciudades: string[]
  agruparPor: 'familia' | 'producto'
  fechaDesde: string
  fechaHasta: string
  canceladas?: NotaCanceladaResumen[]
  verCanceladas?: boolean
  /** Alcance a bodega: relabela columnas y fija el popover a esa bodega */
  alcanceBodega?: string | null
  ciudadFiltro?: string
  bodegaId?: number
}

interface CeldaSel {
  fila: FilaTrazabilidadMatriz
  titulo: string
  kind: 'salidas' | 'entradas' | 'todo'
  x: number
  y: number
}

function isUnassignedFamily(fam: string | null | undefined): boolean {
  return isUnassignedFamilyCanon(fam)
}

export function TrazabilidadMatrizTable({
  filas,
  ciudades,
  agruparPor,
  fechaDesde,
  fechaHasta,
  canceladas = [],
  verCanceladas = false,
  alcanceBodega = null,
  ciudadFiltro,
  bodegaId,
}: Props) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  // Popover anclado de notas por celda
  const [celda, setCelda] = useState<CeldaSel | null>(null)
  const [celdaNotas, setCeldaNotas] = useState<NotasCeldaRespuesta | null>(null)
  const [celdaLoading, setCeldaLoading] = useState(false)

  const openCelda = (
    e: React.MouseEvent<HTMLElement>,
    fila: FilaTrazabilidadMatriz,
    kind: CeldaSel['kind'],
    ciudadScope: string | undefined,
    titulo: string
  ) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const w = 340
    const x = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
    const y = Math.min(rect.bottom + 8, window.innerHeight - 420)
    setCelda({ fila, titulo, kind, x, y: Math.max(8, y) })
    setCeldaNotas(null)
    setCeldaLoading(true)
    fetchNotasCelda({
      productoId: fila.producto_id,
      familia: fila.producto_id ? undefined : fila.familia,
      ciudad: bodegaId ? undefined : ciudadScope,
      bodegaId,
      desde: fechaDesde,
      hasta: fechaHasta,
      incluirCanceladas: verCanceladas,
      limite: 15,
    })
      .then(setCeldaNotas)
      .catch(() => setCeldaNotas({ notas: [], pendientes: [], total: 0 }))
      .finally(() => setCeldaLoading(false))
  }

  const tituloAlcance = alcanceBodega || ciudadFiltro || 'Todas las plazas'

  React.useEffect(() => {
    if (!celda) return
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setCelda(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [celda])

  // Estado para el modal de timeline individual
  const [timelineProduct, setTimelineProduct] = useState<{
    id: number | null
    sku: string
    descripcion?: string
    familia?: string
    modo: 'sku' | 'familia'
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
      // Fila de SKU individual → diagrama del SKU
      setTimelineProduct({
        id: item.producto_id,
        sku: item.sku_base || '',
        descripcion: item.descripcion,
        familia: item.familia,
        modo: 'sku',
      })
    } else if (item.skus && item.skus.length > 0) {
      // Fila de familia → lista de SKUs con stock para elegir cuál rastrear
      setTimelineProduct({
        id: null,
        sku: item.familia,
        descripcion: item.descripcion,
        familia: item.familia,
        modo: 'familia',
      })
    }
  }

  const expandAll = () => {
    const all = new Set(filas.filter(f => f.skus && f.skus.length > 0).map(f => f.id))
    setExpandedFamilies(all)
  }

  const collapseAll = () => setExpandedFamilies(new Set())

  // ─────────────────────────────────────────────────────────────────────────
  // Exportación Excel — Matriz + Resumen por Ciudad (misma lógica que la vista)
  // Familias clásico A→Z (SIN_FAMILIA al final), SKUs ascendente A→Z,
  // descripción canónica de la primera SKU alfabética sin depender de stock.
  // ─────────────────────────────────────────────────────────────────────────
  const handleExportExcel = async (modo: 'matriz' | 'ciudades' | 'completo' = 'completo') => {
    if (filas.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }
    setIsExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Idol Navy - Inv Tienda'
      workbook.created = new Date()

      // Ciudades relevantes (mismo cálculo que la vista) para columnas dinámicas
      const ciudadesExp = ciudadesRelevantes.length > 0 ? ciudadesRelevantes : ciudades

      // ── Ordenamiento garantizado para el reporte (clásico A→Z, idéntico al backend) ──
      const compareFamiliaDesc = (a: string, b: string) => compareFamiliaAsc(a, b)

      let filasOrdenadas = [...filas]
      if (agruparPor === 'familia') {
        filasOrdenadas.sort((a, b) => compareFamiliaDesc(a.familia, b.familia))
        filasOrdenadas.forEach(f => {
          if (f.skus) f.skus = [...f.skus].sort((a, b) => compareSkuAsc(a.sku_base, b.sku_base))
        })
      } else {
        filasOrdenadas.sort((a, b) => {
          const cmp = compareFamiliaDesc(a.familia, b.familia)
          if (cmp !== 0) return cmp
          return compareSkuAsc(a.sku_base, b.sku_base)
        })
      }

      // Helpers de agregados para hoja de totales y resumen por ciudad
      const totalesPorCiudadSalidas: Record<string, number> = {}
      const totalesPorCiudadStock: Record<string, number> = {}
      let grandStockInicial = 0
      let grandEntradas = 0
      let grandSalidas = 0
      let grandTraspasos = 0
      let grandStockActual = 0
      const traspasosEnviadosPorCiudad: Record<string, number> = {}
      const traspasosRecibidosPorCiudad: Record<string, number> = {}

      filasOrdenadas.forEach(f => {
        grandStockInicial += f.stock_inicial
        grandEntradas += f.total_entradas
        grandSalidas += f.total_salidas
        grandTraspasos += f.total_traspasos
        grandStockActual += f.stock_actual
        ciudadesExp.forEach(cd => {
          totalesPorCiudadSalidas[cd] = (totalesPorCiudadSalidas[cd] || 0) + (f.salidas_por_ciudad[cd] || 0)
          totalesPorCiudadStock[cd] = (totalesPorCiudadStock[cd] || 0) + (f.stock_por_ciudad[cd] || 0)
        })
        // Traspasos: contabilizar enviados/recibidos por ciudad desde flujo detallado
        // Si es familia agregada, el flujo ya está consolidado; contar por fila evita duplicados si incluimos SKUs
        // Para no doble contar en modo familia, solo contar filas de familia (agregadas) o en modo producto todas
        const flujo = f.traspasos_flujo || []
        flujo.forEach(t => {
          if (t.origen_ciudad) traspasosEnviadosPorCiudad[t.origen_ciudad] = (traspasosEnviadosPorCiudad[t.origen_ciudad] || 0) + t.cajas
          if (t.destino_ciudad) traspasosRecibidosPorCiudad[t.destino_ciudad] = (traspasosRecibidosPorCiudad[t.destino_ciudad] || 0) + t.cajas
        })
      })

      const fechaDesdeFmt = new Date(fechaDesde).toLocaleDateString('es-MX')
      const fechaHastaFmt = new Date(fechaHasta).toLocaleDateString('es-MX')

      // ═══════════════════════════════════════════════════════════════════════
      // HOJA 1: MATRIZ TRAZABILIDAD (misma lógica que vista por ciudad)
      // ═══════════════════════════════════════════════════════════════════════
      if (modo === 'matriz' || modo === 'completo') {
        const ws = workbook.addWorksheet('Matriz Trazabilidad', {
          properties: { tabColor: { argb: 'FF1E40AF' } },
        })

        ws.pageSetup = {
          orientation: 'landscape',
          paperSize: 9,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.2, right: 0.2, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
          printTitlesRow: '3:3',
        }

        const startVentasCol = 6 // A=1 Familia, B=2 Descripción, C=3 Estilo, D=4 StockIni, E=5 Entradas
        const numCiudades = ciudadesExp.length
        const totalSalidasCol = startVentasCol + numCiudades
        const traspasosCol = totalSalidasCol + 1
        const stockActualCol = traspasosCol + 1
        const startStockCiudadCol = stockActualCol + 1
        const totalCols = startStockCiudadCol + numCiudades - 1

        // Fila 1: Título
        ws.getRow(1).height = 28
        ws.mergeCells(1, 1, 1, totalCols)
        const titleCell = ws.getCell(1, 1)
        titleCell.value = `TRAZABILIDAD Y FLUJO DE INVENTARIO  —  ${fechaDesdeFmt} al ${fechaHastaFmt}  •  Agrupado por ${agruparPor === 'familia' ? 'FAMILIA' : 'PRODUCTO'}`
        titleCell.font = { bold: true, size: 13, color: { argb: 'FF0F172A' } }
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDF5' } }

        // Fila 2: Subtítulo con conteos
        ws.getRow(2).height = 16
        ws.mergeCells(2, 1, 2, totalCols)
        const subCell = ws.getCell(2, 1)
        subCell.value = `Familias descendente Z→A  •  SKUs ascendente A→Z  •  Descripción canónica (primer SKU alfabético sin depender de stock)  •  ${filasOrdenadas.length} ${agruparPor === 'familia' ? 'familias' : 'productos'}  •  ${numCiudades} plazas`
        subCell.font = { size: 9, color: { argb: 'FF64748B' }, italic: true }
        subCell.alignment = { horizontal: 'center', vertical: 'middle' }

        // Fila 3: Encabezados
        const hr = ws.getRow(3)
        hr.height = 72
        const borderHeader: Partial<ExcelJS.Borders> = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'medium', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } },
        }

        const headers: { col: number; label: string; fill: string; rot?: number; width?: number }[] = [
          { col: 1, label: 'FAMILIA', fill: 'FFB4C6E7' },
          { col: 2, label: 'DESCRIPCIÓN', fill: 'FFB4C6E7' },
          { col: 3, label: 'ESTILO (SKU)', fill: 'FFF1F5F9' },
          { col: 4, label: 'STOCK\nINICIAL', fill: 'FFF1F5F9' },
          { col: 5, label: 'ENTRADAS\n(+)', fill: 'FFDCFCE7' },
        ]
        // Ventas por ciudad
        ciudadesExp.forEach((cd, idx) => {
          headers.push({ col: startVentasCol + idx, label: `VENTAS\n${cd}`, fill: 'FFFEE2E2', rot: 45 })
        })
        headers.push(
          { col: totalSalidasCol, label: 'TOTAL\nSALIDAS', fill: 'FFFEE2E2', rot: 45 },
          { col: traspasosCol, label: 'TRASPASOS\n(cj)', fill: 'FFDBEAFE', rot: 45 },
          { col: stockActualCol, label: 'STOCK\nACTUAL', fill: 'FFF1F5F9' },
        )
        ciudadesExp.forEach((cd, idx) => {
          headers.push({ col: startStockCiudadCol + idx, label: `STOCK\n${cd}`, fill: 'FFE0E7FF', rot: 45 })
        })

        headers.forEach(h => {
          const c = ws.getCell(3, h.col)
          c.value = h.label
          c.font = { bold: true, size: 8, color: { argb: 'FF0F172A' } }
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.fill } }
          c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, textRotation: h.rot || 0 }
          c.border = borderHeader
        })

        // Anchos
        ws.getColumn(1).width = 16
        ws.getColumn(2).width = 38
        ws.getColumn(3).width = 18
        ws.getColumn(4).width = 10
        ws.getColumn(5).width = 10
        ciudadesExp.forEach((_, idx) => { ws.getColumn(startVentasCol + idx).width = 9 })
        ws.getColumn(totalSalidasCol).width = 11
        ws.getColumn(traspasosCol).width = 10
        ws.getColumn(stockActualCol).width = 11
        ciudadesExp.forEach((_, idx) => { ws.getColumn(startStockCiudadCol + idx).width = 9 })

        // Filas de datos
        let rIdx = 4
        const thinBorder: Partial<ExcelJS.Borders> = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        }

        const writeRow = (
          row: ExcelJS.Row,
          fam: string,
          desc: string,
          sku: string,
          stockIni: number,
          entradas: number,
          salidasPorCiudad: Record<string, number>,
          totalSalidas: number,
          traspasos: number,
          stockAct: number,
          stockPorCiudad: Record<string, number>,
          isFamily: boolean,
          famColor: string
        ) => {
          const vals: any[] = []
          // Familia
          const c1 = ws.getCell(rIdx, 1); c1.value = fam; c1.font = { bold: isFamily, size: 9, color: { argb: isFamily ? 'FF1E40AF' : 'FF334155' } }; c1.alignment = { vertical: 'middle', horizontal: 'left' }; c1.border = thinBorder
          // Descripción
          const c2 = ws.getCell(rIdx, 2); c2.value = (desc || '').toUpperCase(); c2.font = { size: 8, color: { argb: 'FF475569' } }; c2.alignment = { vertical: 'middle', wrapText: true }; c2.border = thinBorder
          // SKU
          const c3 = ws.getCell(rIdx, 3); c3.value = sku || fam; c3.font = { bold: !isFamily, size: 9, color: { argb: 'FF0F172A' } }; c3.alignment = { vertical: 'middle', horizontal: 'center' }; c3.border = thinBorder
          // Stock ini
          const c4 = ws.getCell(rIdx, 4); c4.value = stockIni > 0 ? stockIni : null; c4.font = { size: 9, color: { argb: 'FF64748B' } }; c4.alignment = { horizontal: 'center', vertical: 'middle' }; c4.border = thinBorder; c4.numFmt = '#,##0'
          // Entradas
          const c5 = ws.getCell(rIdx, 5); c5.value = entradas > 0 ? entradas : null; c5.font = { size: 9, color: { argb: 'FF15803D' }, bold: entradas > 0 }; c5.alignment = { horizontal: 'center', vertical: 'middle' }; c5.border = thinBorder; c5.numFmt = '#,##0'

          ciudadesExp.forEach((cd, idx) => {
            const val = salidasPorCiudad[cd] || 0
            const c = ws.getCell(rIdx, startVentasCol + idx)
            c.value = val > 0 ? val : null
            c.font = { size: 9, color: { argb: val > 0 ? 'FFDC2626' : 'FFE2E8F0' }, bold: val > 0 }
            c.alignment = { horizontal: 'center', vertical: 'middle' }
            c.border = thinBorder
            c.numFmt = '#,##0'
          })

          const cTotSal = ws.getCell(rIdx, totalSalidasCol); cTotSal.value = totalSalidas > 0 ? totalSalidas : null; cTotSal.font = { bold: true, size: 9, color: { argb: 'FFDC2626' } }; cTotSal.alignment = { horizontal: 'center', vertical: 'middle' }; cTotSal.border = thinBorder; cTotSal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; cTotSal.numFmt = '#,##0'

          const cTrasp = ws.getCell(rIdx, traspasosCol); cTrasp.value = traspasos > 0 ? traspasos : null; cTrasp.font = { size: 9, color: { argb: 'FF1D4ED8' } }; cTrasp.alignment = { horizontal: 'center', vertical: 'middle' }; cTrasp.border = thinBorder; cTrasp.numFmt = '#,##0'

          const cStockAct = ws.getCell(rIdx, stockActualCol); cStockAct.value = stockAct; cStockAct.font = { bold: true, size: 9, color: { argb: 'FF0F172A' } }; cStockAct.alignment = { horizontal: 'center', vertical: 'middle' }; cStockAct.border = thinBorder; cStockAct.numFmt = '#,##0'

          ciudadesExp.forEach((cd, idx) => {
            const val = stockPorCiudad[cd] || 0
            const c = ws.getCell(rIdx, startStockCiudadCol + idx)
            c.value = val > 0 ? val : null
            c.font = { size: 9, color: { argb: val > 0 ? 'FF1E40AF' : 'FFE2E8F0' } }
            c.alignment = { horizontal: 'center', vertical: 'middle' }
            c.border = thinBorder
            c.numFmt = '#,##0'
          })

          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: famColor } }
          row.height = isFamily ? 18 : 15
        }

        if (agruparPor === 'familia') {
          filasOrdenadas.forEach((famRow, fIdx) => {
            const bg = fIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'
            const famColor = bg
            // Fila familia
            const rowFam = ws.getRow(rIdx)
            writeRow(
              rowFam, famRow.familia, famRow.descripcion || '', famRow.familia,
              famRow.stock_inicial, famRow.total_entradas, famRow.salidas_por_ciudad, famRow.total_salidas, famRow.total_traspasos, famRow.stock_actual, famRow.stock_por_ciudad, true, famColor
            )
            // Negrita especial para familia
            for (let c = 1; c <= totalCols; c++) {
              const cell = ws.getCell(rIdx, c)
              if (!cell.fill || (cell.fill as any).fgColor?.argb === 'FFE2E8F0') {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: famColor } }
              }
              if (c === 1) cell.font = { bold: true, size: 9, color: { argb: 'FF1E40AF' } }
            }
            rIdx++
            // SKUs hijos (todos expandidos en el reporte)
            const skusSorted = [...(famRow.skus || [])].sort((a, b) => compareSkuAsc(a.sku_base, b.sku_base))
            skusSorted.forEach(sku => {
              const rowSku = ws.getRow(rIdx)
              const skuBg = fIdx % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF'
              writeRow(rowSku, famRow.familia, sku.descripcion || '', sku.sku_base || '', sku.stock_inicial, sku.total_entradas, sku.salidas_por_ciudad, sku.total_salidas, sku.total_traspasos, sku.stock_actual, sku.stock_por_ciudad, false, skuBg)
              // Atenuar familia en hijos
              ws.getCell(rIdx, 1).font = { size: 8, color: { argb: 'FF94A3B8' }, italic: true }
              ws.getCell(rIdx, 2).font = { size: 8, color: { argb: 'FF64748B' } }
              rIdx++
            })
          })
        } else {
          // modo producto: filas planas
          filasOrdenadas.forEach((prod, idx) => {
            const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'
            const row = ws.getRow(rIdx)
            writeRow(row, prod.familia, prod.descripcion || '', prod.sku_base || '', prod.stock_inicial, prod.total_entradas, prod.salidas_por_ciudad, prod.total_salidas, prod.total_traspasos, prod.stock_actual, prod.stock_por_ciudad, false, bg)
            rIdx++
          })
        }

        // Fila de totales generales
        rIdx += 1
        const rowTot = ws.getRow(rIdx)
        rowTot.height = 20
        const totalBorder: Partial<ExcelJS.Borders> = {
          top: { style: 'medium', color: { argb: 'FF475569' } },
          bottom: { style: 'medium', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        }
        ws.mergeCells(rIdx, 1, rIdx, 3)
        const lblTot = ws.getCell(rIdx, 1); lblTot.value = 'TOTAL GENERAL'; lblTot.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } }; lblTot.alignment = { horizontal: 'right', vertical: 'middle' }; lblTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; lblTot.border = totalBorder
        ws.getCell(rIdx, 2).border = totalBorder; ws.getCell(rIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        ws.getCell(rIdx, 3).border = totalBorder; ws.getCell(rIdx, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }

        const cTotIni = ws.getCell(rIdx, 4); cTotIni.value = grandStockInicial; cTotIni.font = { bold: true, size: 10 }; cTotIni.alignment = { horizontal: 'center', vertical: 'middle' }; cTotIni.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; cTotIni.border = totalBorder; cTotIni.numFmt = '#,##0'
        const cTotEnt = ws.getCell(rIdx, 5); cTotEnt.value = grandEntradas; cTotEnt.font = { bold: true, size: 10, color: { argb: 'FF15803D' } }; cTotEnt.alignment = { horizontal: 'center', vertical: 'middle' }; cTotEnt.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; cTotEnt.border = totalBorder; cTotEnt.numFmt = '#,##0'
        ciudadesExp.forEach((cd, idx) => {
          const c = ws.getCell(rIdx, startVentasCol + idx); c.value = totalesPorCiudadSalidas[cd] || 0; c.font = { bold: true, size: 10, color: { argb: 'FFDC2626' } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; c.border = totalBorder; c.numFmt = '#,##0'
        })
        const cTotSal = ws.getCell(rIdx, totalSalidasCol); cTotSal.value = grandSalidas; cTotSal.font = { bold: true, size: 11, color: { argb: 'FFDC2626' } }; cTotSal.alignment = { horizontal: 'center', vertical: 'middle' }; cTotSal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; cTotSal.border = totalBorder; cTotSal.numFmt = '#,##0'
        const cTotTrasp = ws.getCell(rIdx, traspasosCol); cTotTrasp.value = grandTraspasos; cTotTrasp.font = { bold: true, size: 10, color: { argb: 'FF1D4ED8' } }; cTotTrasp.alignment = { horizontal: 'center', vertical: 'middle' }; cTotTrasp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; cTotTrasp.border = totalBorder; cTotTrasp.numFmt = '#,##0'
        const cTotStock = ws.getCell(rIdx, stockActualCol); cTotStock.value = grandStockActual; cTotStock.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } }; cTotStock.alignment = { horizontal: 'center', vertical: 'middle' }; cTotStock.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; cTotStock.border = totalBorder; cTotStock.numFmt = '#,##0'
        ciudadesExp.forEach((cd, idx) => {
          const c = ws.getCell(rIdx, startStockCiudadCol + idx); c.value = totalesPorCiudadStock[cd] || 0; c.font = { bold: true, size: 10, color: { argb: 'FF1E40AF' } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; c.border = totalBorder; c.numFmt = '#,##0'
        })

        // Fila de etiquetas de bodegas ciudades repetida al pie
        rIdx += 1
        const rowFoot = ws.getRow(rIdx)
        rowFoot.height = 44
        // primeras 3 columnas vacías con label
        ws.mergeCells(rIdx, 1, rIdx, 3)
        const lblFoot = ws.getCell(rIdx, 1); lblFoot.value = 'PLAZAS →'; lblFoot.font = { bold: true, size: 9, color: { argb: 'FF1E40AF' } }; lblFoot.alignment = { horizontal: 'right', vertical: 'middle' }; lblFoot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; lblFoot.border = thinBorder
        ws.getCell(rIdx, 2).border = thinBorder; ws.getCell(rIdx, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        ws.getCell(rIdx, 3).border = thinBorder; ws.getCell(rIdx, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        ws.getCell(rIdx, 4).value = 'INICIAL'; ws.getCell(rIdx, 4).font = { bold: true, size: 7 }; ws.getCell(rIdx, 4).alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom', wrapText: true }; ws.getCell(rIdx, 4).border = thinBorder
        ws.getCell(rIdx, 5).value = 'ENTRADAS'; ws.getCell(rIdx, 5).font = { bold: true, size: 7 }; ws.getCell(rIdx, 5).alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }; ws.getCell(rIdx, 5).border = thinBorder
        ciudadesExp.forEach((cd, idx) => {
          const c = ws.getCell(rIdx, startVentasCol + idx); c.value = cd; c.font = { bold: true, size: 8, color: { argb: 'FFDC2626' } }; c.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }; c.border = thinBorder; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        })
        ws.getCell(rIdx, totalSalidasCol).value = 'TOTAL\nSAL'; ws.getCell(rIdx, totalSalidasCol).font = { bold: true, size: 7, color: { argb: 'FFDC2626' } }; ws.getCell(rIdx, totalSalidasCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; ws.getCell(rIdx, totalSalidasCol).border = thinBorder; ws.getCell(rIdx, totalSalidasCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        ws.getCell(rIdx, traspasosCol).value = 'TRASP'; ws.getCell(rIdx, traspasosCol).font = { bold: true, size: 7, color: { argb: 'FF1D4ED8' } }; ws.getCell(rIdx, traspasosCol).alignment = { horizontal: 'center', vertical: 'middle' }; ws.getCell(rIdx, traspasosCol).border = thinBorder
        ws.getCell(rIdx, stockActualCol).value = 'STOCK\nACT'; ws.getCell(rIdx, stockActualCol).font = { bold: true, size: 7 }; ws.getCell(rIdx, stockActualCol).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; ws.getCell(rIdx, stockActualCol).border = thinBorder
        ciudadesExp.forEach((cd, idx) => {
          const c = ws.getCell(rIdx, startStockCiudadCol + idx); c.value = cd; c.font = { bold: true, size: 8, color: { argb: 'FF1E40AF' } }; c.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }; c.border = thinBorder; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
        })

        // Filtro y freeze
        ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: totalCols } }
        ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }]
      }

      // ═══════════════════════════════════════════════════════════════════════
      // HOJA 2: RESUMEN POR CIUDAD (reporte agregado por plaza)
      // ═══════════════════════════════════════════════════════════════════════
      if (modo === 'ciudades' || modo === 'completo') {
        const ws2 = workbook.addWorksheet('Resumen por Ciudad', {
          properties: { tabColor: { argb: 'FF0EA5E9' } },
        })
        ws2.pageSetup = {
          orientation: 'portrait',
          paperSize: 9,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 1,
        }

        // Título
        ws2.mergeCells('A1:G1')
        const t2 = ws2.getCell('A1')
        t2.value = `REPORTE DE TRAZABILIDAD POR CIUDAD  —  ${fechaDesdeFmt} al ${fechaHastaFmt}`
        t2.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } }
        t2.alignment = { horizontal: 'center', vertical: 'middle' }
        t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } }
        ws2.getRow(1).height = 26

        ws2.mergeCells('A2:G2')
        const s2 = ws2.getCell('A2')
        s2.value = `Misma lógica que la vista de trazabilidad • Familias descendente Z→A • SKUs ascendente A→Z`
        s2.font = { size: 9, color: { argb: 'FF64748B' }, italic: true }
        s2.alignment = { horizontal: 'center', vertical: 'middle' }
        ws2.getRow(2).height = 14

        // Headers fila 3
        const hdr2 = ['CIUDAD / PLAZA', 'VENTAS (cj)', '% VENTAS', 'STOCK ACT (cj)', '% STOCK', 'TRASP ENVIADOS (cj)', 'TRASP RECIBIDOS (cj)']
        const hdrFill2 = ['FFB4C6E7', 'FFFEE2E2', 'FFFEE2E2', 'FFE0E7FF', 'FFE0E7FF', 'FFDBEAFE', 'FFDCFCE7']
        const rowHdr2 = ws2.getRow(3)
        rowHdr2.height = 22
        hdr2.forEach((h, idx) => {
          const c = ws2.getCell(3, idx + 1)
          c.value = h
          c.font = { bold: true, size: 9, color: { argb: 'FF0F172A' } }
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hdrFill2[idx] } }
          c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
          c.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } }, bottom: { style: 'medium', color: { argb: 'FF475569' } }, left: { style: 'thin', color: { argb: 'FF94A3B8' } }, right: { style: 'thin', color: { argb: 'FF94A3B8' } } }
        })
        ws2.columns = [
          { width: 22 },
          { width: 15 },
          { width: 12 },
          { width: 15 },
          { width: 12 },
          { width: 17 },
          { width: 17 },
        ]

        // Datos por ciudad
        const ciudadsOrdenadas = [...ciudadesExp].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
        let r2 = 4
        ciudadsOrdenadas.forEach((cd, idx) => {
          const ventas = totalesPorCiudadSalidas[cd] || 0
          const stock = totalesPorCiudadStock[cd] || 0
          const pctVentas = grandSalidas > 0 ? Math.round((ventas / grandSalidas) * 100) : 0
          const pctStock = grandStockActual > 0 ? Math.round((stock / grandStockActual) * 100) : 0
          const trEnv = traspasosEnviadosPorCiudad[cd] || 0
          const trRec = traspasosRecibidosPorCiudad[cd] || 0
          const row = ws2.getRow(r2)
          row.height = 18
          const isEven = idx % 2 === 0
          const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC'
          const vals = [cd, ventas, pctVentas ? `${pctVentas}%` : '0%', stock, pctStock ? `${pctStock}%` : '0%', trEnv || 0, trRec || 0]
          vals.forEach((v, cIdx) => {
            const c = ws2.getCell(r2, cIdx + 1)
            c.value = v as any
            c.font = { size: 10, color: { argb: 'FF1E293B' }, bold: cIdx === 0 }
            c.alignment = { horizontal: cIdx === 0 ? 'left' : 'center', vertical: 'middle' }
            c.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
            if (cIdx === 1 || cIdx === 3 || cIdx === 5 || cIdx === 6) c.numFmt = '#,##0'
          })
          // Color énfasis
          ws2.getCell(r2, 2).font = { bold: true, color: { argb: 'FFDC2626' }, size: 10 }
          ws2.getCell(r2, 4).font = { bold: true, color: { argb: 'FF1E40AF' }, size: 10 }
          r2++
        })

        // Fila total general
        const rowTot2 = ws2.getRow(r2)
        rowTot2.height = 20
        const totVals2: any[] = ['TOTAL GENERAL', grandSalidas, '100%', grandStockActual, '100%', Object.values(traspasosEnviadosPorCiudad).reduce((a, b) => a + b, 0), Object.values(traspasosRecibidosPorCiudad).reduce((a, b) => a + b, 0)]
        totVals2.forEach((v, cIdx) => {
          const c = ws2.getCell(r2, cIdx + 1)
          c.value = v
          c.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } }
          c.alignment = { horizontal: cIdx === 0 ? 'right' : 'center', vertical: 'middle' }
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cIdx === 0 ? 'FFF1F5F9' : cIdx === 1 ? 'FFFEE2E2' : cIdx === 3 ? 'FFE0E7FF' : 'FFF8FAFC' } }
          c.border = { top: { style: 'medium', color: { argb: 'FF475569' } }, bottom: { style: 'medium', color: { argb: 'FF475569' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
          if (cIdx === 1 || cIdx === 3 || cIdx === 5 || cIdx === 6) c.numFmt = '#,##0'
        })
        ws2.getCell(r2, 2).font = { bold: true, color: { argb: 'FFDC2626' }, size: 11 }
        ws2.getCell(r2, 4).font = { bold: true, color: { argb: 'FF1E40AF' }, size: 11 }

        // Nota al pie
        r2 += 2
        ws2.mergeCells(`A${r2}:G${r2}`)
        const note2 = ws2.getCell(`A${r2}`)
        note2.value = `* Reporte generado con la misma lógica que la vista de Trazabilidad por Ciudad (notas CONF en el período seleccionado). Agrupado por Familia/Producto descendente.`
        note2.font = { size: 8, color: { argb: 'FF94A3B8' }, italic: true }
        note2.alignment = { horizontal: 'left', vertical: 'middle' }

        ws2.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 7 } }
        ws2.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }]
      }

      // Configurar pestaña activa por defecto en la primera hoja
      workbook.views = [{ x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }]

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const sufijo = modo === 'matriz' ? 'Matriz' : modo === 'ciudades' ? 'PorCiudad' : 'Completo'
      const nombre = `Trazabilidad_${sufijo}_${agruparPor}_${fechaDesde.split('T')[0]}_al_${fechaHasta.split('T')[0]}.xlsx`
      a.href = url
      a.download = nombre
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Reporte Trazabilidad ${sufijo} exportado (${filasOrdenadas.length} ${agruparPor === 'familia' ? 'familias' : 'productos'})`)
    } catch (e: any) {
      console.error(e)
      toast.error('Error al generar Excel: ' + (e?.message || 'desconocido'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      
      {/* Barra de acciones: expandir/colapsar + exportar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {agruparPor === 'familia' && filas.some(f => f.skus && f.skus.length > 0) && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll} className="h-8 text-xs">Expandir todo</Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="h-8 text-xs">Colapsar todo</Button>
            </>
          )}
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Orden: Familias descendente Z→A • SKUs ascendente A→Z • Descripción canónica
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || filas.length === 0}
              className="h-8 gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-300/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isExporting ? 'Generando...' : 'Exportar Excel'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => handleExportExcel('completo')} className="gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="text-xs font-semibold">Reporte Completo (Recomendado)</p>
                <p className="text-[11px] text-muted-foreground">Matriz + Resumen por Ciudad</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportExcel('matriz')} className="gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs font-semibold">Solo Matriz por Plaza</p>
                <p className="text-[11px] text-muted-foreground">Ventas y Stock por ciudad + traspasos</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportExcel('ciudades')} className="gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="text-xs font-semibold">Solo Resumen por Ciudad</p>
                <p className="text-[11px] text-muted-foreground">Ventas, stock y traspasos agregados</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
                
                {/* Columnas dinámicas de Salidas por Ciudad (o bodega en alcance) */}
                {ciudadesRelevantes.map((cd) => (
                  <th key={`head-sal-${cd}`} className="py-3 px-3 text-right min-w-[95px] text-red-600 dark:text-red-400" title={alcanceBodega ? `Alcance: bodega ${alcanceBodega}` : undefined}>
                    Ventas {alcanceBodega || cd}
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
                      } ${fila.tiene_pendiente ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500' : ''}`}>
                        
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
                                {fila.tiene_pendiente && (
                                  <Badge
                                    className="text-[10px] px-1.5 py-0 h-4 bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-500/40 font-bold"
                                    title={`En trámite (PEND/PROC): ${(fila.notas_pendientes || []).map(n => `${n.numero_nota} (${n.delta >= 0 ? '+' : ''}${n.delta})`).join(', ') || 'pendiente'}`}
                                  >
                                    +{fila.pend_entradas ?? 0} ({fila.pend_n_entradas ?? 0}) / −{fila.pend_salidas ?? 0} ({fila.pend_n_salidas ?? 0})
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
                          {fila.total_entradas > 0 ? (
                            <button type="button" onClick={(e) => openCelda(e, fila, 'entradas', ciudadFiltro, tituloAlcance)} className="hover:underline cursor-pointer" title={`Ver notas de entradas — ${tituloAlcance}`}>
                              +{fila.total_entradas}
                            </button>
                          ) : '-'}
                        </td>

                        {/* Salidas por Ciudad Relevante */}
                        {ciudadesRelevantes.map((cd) => {
                          const salCd = fila.salidas_por_ciudad[cd] || 0
                          return (
                            <td key={`cell-sal-${fila.id}-${cd}`} className="py-2.5 px-3 text-right font-mono text-xs">
                              {salCd > 0 ? (
                                <button type="button" onClick={(e) => openCelda(e, fila, 'salidas', cd, alcanceBodega || cd)} className="font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer" title={`Ver notas de ventas en ${alcanceBodega || cd}`}>
                                  -{salCd}
                                </button>
                              ) : (
                                <span className="text-muted-foreground/50">-</span>
                              )}
                            </td>
                          )
                        })}

                        {/* Total Salidas */}
                        <td className="py-2.5 px-3 text-right font-mono font-black text-red-600 dark:text-red-400 bg-red-500/5">
                          {fila.total_salidas > 0 ? (
                            <button type="button" onClick={(e) => openCelda(e, fila, 'salidas', ciudadFiltro, tituloAlcance)} className="hover:underline cursor-pointer" title={`Ver notas de salidas — ${tituloAlcance}`}>
                              -{fila.total_salidas}
                            </button>
                          ) : '-'}
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
                          {fila.stock_actual > 0 || fila.total_entradas > 0 || fila.total_salidas > 0 ? (
                            <button type="button" onClick={(e) => openCelda(e, fila, 'todo', ciudadFiltro, tituloAlcance)} className="text-foreground hover:underline cursor-pointer" title={`Ver cómo se movió el stock — ${tituloAlcance}`}>
                              {fila.stock_actual} cj
                            </button>
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
                          className={`hover:bg-muted/20 transition-colors text-[11px] ${sku.tiene_pendiente ? 'bg-yellow-500/10 border-l-2 border-l-yellow-500' : 'bg-muted/5'}`}
                        >
                          <td className="py-2 px-4 pl-9 sticky left-0 z-10 bg-card/95 backdrop-blur-xs border-r border-border/40">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                              <span className="font-mono font-bold text-foreground">
                                {sku.sku_base}
                              </span>
                              {sku.tiene_pendiente && (
                                <Badge className="text-[9px] px-1 py-0 h-3.5 bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-500/40 font-bold">
                                  En trámite
                                </Badge>
                              )}
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
                            {sku.total_entradas > 0 ? (
                              <button type="button" onClick={(e) => openCelda(e, sku, 'entradas', ciudadFiltro, tituloAlcance)} className="hover:underline cursor-pointer" title={`Ver notas de entradas — ${tituloAlcance}`}>
                                +{sku.total_entradas}
                              </button>
                            ) : '-'}
                          </td>

                          {/* Salidas por Ciudad */}
                          {ciudadesRelevantes.map((cd) => {
                            const salCd = sku.salidas_por_ciudad[cd] || 0
                            return (
                              <td key={`sub-sal-${sku.id}-${cd}`} className="py-2 px-3 text-right font-mono text-[11px]">
                                {salCd > 0 ? (
                                  <button type="button" onClick={(e) => openCelda(e, sku, 'salidas', cd, alcanceBodega || cd)} className="text-red-600 dark:text-red-400 font-medium hover:underline cursor-pointer" title={`Ver notas de ventas en ${alcanceBodega || cd}`}>
                                    -{salCd}
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground/30">-</span>
                                )}
                              </td>
                            )
                          })}

                          {/* Total Salidas */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400 bg-red-500/5">
                            {sku.total_salidas > 0 ? (
                              <button type="button" onClick={(e) => openCelda(e, sku, 'salidas', ciudadFiltro, tituloAlcance)} className="hover:underline cursor-pointer" title={`Ver notas de salidas — ${tituloAlcance}`}>
                                -{sku.total_salidas}
                              </button>
                            ) : '-'}
                          </td>

                          {/* Traspasos */}
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground">
                            {sku.total_traspasos > 0 ? `${sku.total_traspasos} cj` : '-'}
                          </td>

                          {/* Stock Actual */}
                          <td className="py-2 px-3 text-right font-mono font-semibold bg-muted/10">
                            {sku.stock_actual > 0 || sku.total_entradas > 0 || sku.total_salidas > 0 ? (
                              <button type="button" onClick={(e) => openCelda(e, sku, 'todo', ciudadFiltro, tituloAlcance)} className="hover:underline cursor-pointer" title={`Ver cómo se movió el stock — ${tituloAlcance}`}>
                                {sku.stock_actual} cj
                              </button>
                            ) : '0'}
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
            Mostrando <strong>{filas.length}</strong> {agruparPor === 'familia' ? 'familias' : 'productos'} • Orden: familias descendente Z→A • SKUs A→Z • Descripción canónica
          </span>
          <span className="text-[11px] flex items-center gap-2">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> CONF</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> PEND/PROC en trámite</span>
            {verCanceladas && <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> CANC (no suma)</span>}
            <span>* Haz clic en <strong><Route className="w-3 h-3 inline" /> Kardex</strong> para ver la cronología.</span>
          </span>
        </div>
      </div>

      {/* Popover anclado de notas por celda */}
      {celda && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCelda(null)} />
          <div
            className="fixed z-50 w-[340px] max-w-[calc(100vw-16px)] max-h-[400px] overflow-y-auto bg-popover text-popover-foreground rounded-xl border border-border shadow-xl p-3 space-y-2.5"
            style={{ left: celda.x, top: celda.y }}
            role="dialog"
            aria-label={`Notas de ${celda.titulo}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-black truncate">
                  {celda.fila.sku_base || celda.fila.familia}
                  <span className="font-normal text-muted-foreground"> · {celda.titulo}</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  {celda.kind === 'salidas' ? 'Salidas' : celda.kind === 'entradas' ? 'Entradas' : 'Movimiento de stock'}
                </p>
              </div>
              <button type="button" onClick={() => setCelda(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none px-1" aria-label="Cerrar">×</button>
            </div>

            {celdaLoading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando notas…
              </p>
            ) : (
              <>
                {(celda.fila.pend_n_entradas || celda.fila.pend_n_salidas) ? (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1.5">
                    <p className="text-[10px] uppercase font-bold text-yellow-800 dark:text-yellow-300">En trámite (no suma al real)</p>
                    <p className="font-mono font-black text-xs text-yellow-800 dark:text-yellow-300">
                      +{celda.fila.pend_entradas ?? 0} ({celda.fila.pend_n_entradas ?? 0}) / −{celda.fila.pend_salidas ?? 0} ({celda.fila.pend_n_salidas ?? 0})
                    </p>
                  </div>
                ) : null}
                {celdaNotas && celdaNotas.notas.length === 0 && celdaNotas.pendientes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Sin notas en este alcance y período.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(celdaNotas?.notas || []).map((n) => (
                      <div key={`${n.nota_id}-${n.producto_id}`} className={`flex items-center gap-2 text-xs rounded-md border px-2 py-1.5 ${n.estado_codigo === 'CANC' ? 'opacity-60' : 'border-border'}`}>
                        <Link href={`/inventario/notas/${n.nota_id}`} target="_blank" rel="noopener noreferrer" className={`font-mono font-bold hover:underline ${n.estado_codigo === 'CANC' ? 'line-through text-gray-500' : 'text-primary'}`}>
                          {n.numero_nota}
                        </Link>
                        <Badge variant="outline" className="text-[9px] px-1">{n.tipo_codigo}</Badge>
                        <span className={`font-mono font-bold ml-auto ${n.firmado > 0 ? 'text-emerald-600' : n.firmado < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                          {n.firmado > 0 ? `+${n.firmado}` : n.firmado}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[80px]" title={n.sku_base}>{n.sku_base}</span>
                      </div>
                    ))}
                    {(celdaNotas?.pendientes || []).map((n) => (
                      <div key={`pend-${n.nota_id}-${n.producto_id}`} className="flex items-center gap-2 text-xs rounded-md border border-yellow-500/40 bg-yellow-500/5 px-2 py-1.5">
                        <Link href={`/inventario/notas/${n.nota_id}`} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-primary hover:underline">
                          {n.numero_nota}
                        </Link>
                        <Badge className="text-[9px] px-1 bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-500/40">{n.tipo_codigo}</Badge>
                        <span className={`font-mono font-bold ml-auto ${n.firmado > 0 ? 'text-emerald-600' : n.firmado < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                          {n.firmado > 0 ? `+${n.firmado}` : n.firmado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-[11px]"
                  onClick={() => { openTimeline(celda.fila); setCelda(null) }}
                >
                  <Route className="w-3 h-3 mr-1" /> Abrir Kardex completo
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {/* Sección gris de canceladas — solo visual cuando el toggle está ON, nunca suma */}
      {verCanceladas && canceladas.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden opacity-90">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40">
            <p className="text-xs font-bold text-muted-foreground">
              Notas canceladas en el período <span className="font-normal">(gris, solo visual — excluidas de entradas, salidas y stock inicial)</span>: {canceladas.length}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-muted/60 sticky top-0 text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 px-3">Nota</th>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3 text-right">Cajas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {canceladas.slice(0, 100).map((c, idx) => (
                  <tr key={`${c.nota_id}-${c.producto_id}-${idx}`} className="text-muted-foreground">
                    <td className="py-1.5 px-3 font-mono line-through">{c.numero_nota}</td>
                    <td className="py-1.5 px-3 font-mono">{c.fecha_nota ? new Date(c.fecha_nota).toLocaleDateString('es-MX') : '—'}</td>
                    <td className="py-1.5 px-3 font-mono">{c.sku_base}</td>
                    <td className="py-1.5 px-3"><Badge variant="secondary" className="text-[10px] bg-gray-500/10 text-gray-600 dark:text-gray-400">{c.tipo_codigo}</Badge></td>
                    <td className="py-1.5 px-3 text-right font-mono">{c.cajas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {canceladas.length > 100 && (
              <p className="px-4 py-2 text-[11px] text-muted-foreground italic">Mostrando 100 de {canceladas.length}. Usa el reporte Excel o el timeline por SKU para el detalle completo.</p>
            )}
          </div>
        </div>
      )}

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
          verCanceladasInicial={verCanceladas}
          modoInicial={timelineProduct.modo}
        />
      )}

    </div>
  )
}
