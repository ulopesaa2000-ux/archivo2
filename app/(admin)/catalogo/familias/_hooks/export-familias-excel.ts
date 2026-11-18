// app/(admin)/catalogo/familias/_hooks/export-familias-excel.ts
import type ExcelJS from 'exceljs'
import { toast } from 'sonner'
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'
import { isUnassignedFamily, type ProductListItem } from './familias-types'

interface ExportFamiliasExcelParams {
  familias: FamiliaResumen[]
  loadedProducts: Record<string, ProductListItem[]>
  stagedMoves: Record<number, string>
  mostrarInactivos: boolean
  netCounts: Record<string, number>
}

interface BodegaSimple {
  id: number
  nombre: string
  es_virtual: boolean
}

function getColumnLetter(colIndex: number): string {
  let temp = colIndex
  let letter = ''
  while (temp > 0) {
    const modulo = (temp - 1) % 26
    letter = String.fromCharCode(65 + modulo) + letter
    temp = Math.floor((temp - modulo) / 26)
  }
  return letter
}

export async function exportFamiliasToExcel({
  familias,
  loadedProducts,
  stagedMoves,
  mostrarInactivos,
  netCounts,
}: ExportFamiliasExcelParams): Promise<void> {
  const toastId = toast.loading('Generando reporte Excel agrupado por familias...')
  try {
    const ExcelJSModule = (await import('exceljs')).default
    const workbook = new ExcelJSModule.Workbook()
    workbook.creator = 'Sistema Inventario ERP'
    workbook.created = new Date()

    // 1. Obtener bodegas activas y stock real desde Supabase (misma fuente que StockMatrix)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    const [bodegasRes, stockRes] = await Promise.all([
      supabase
        .from('bodegas')
        .select('id, nombre, es_virtual, activa')
        .eq('activa', true),
      supabase
        .from('inventario_stock')
        .select('producto_id, bodega_id, cajas, piezas_sueltas'),
    ])

    if (bodegasRes.error) {
      throw new Error(`Error al obtener bodegas: ${bodegasRes.error.message}`)
    }

    const bodegasList: BodegaSimple[] = (bodegasRes.data || []) as BodegaSimple[]
    const normalBodegas = bodegasList
      .filter((b) => !b.es_virtual)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    const virtualBodegas = bodegasList
      .filter((b) => b.es_virtual)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    const sortedBodegas = [...normalBodegas, ...virtualBodegas]

    // Mapeo: producto_id -> { bodega_id: cajas } y totalStockPorProducto
    const stockPorProductoYBodega: Record<number, Record<number, number>> = {}
    const totalStockPorProducto: Record<number, number> = {}
    for (const st of stockRes.data || []) {
      if (!stockPorProductoYBodega[st.producto_id]) stockPorProductoYBodega[st.producto_id] = {}
      const cajas = st.cajas ?? 0
      stockPorProductoYBodega[st.producto_id][st.bodega_id] =
        (stockPorProductoYBodega[st.producto_id][st.bodega_id] || 0) + cajas
      totalStockPorProducto[st.producto_id] = (totalStockPorProducto[st.producto_id] || 0) + cajas
    }

    // 2. Ordenar familias alfabéticamente colocando Sin Asignar (F000-000C) al final
    const sorted = [...familias]
      .filter((f) => {
        const netCount = netCounts[f.familia || 'null'] ?? f.total_productos
        return netCount > 0 || (f.skus && f.skus.length > 0)
      })
      .sort((a, b) => {
        const aUn = isUnassignedFamily(a.familia)
        const bUn = isUnassignedFamily(b.familia)
        if (aUn && !bUn) return 1
        if (!aUn && bUn) return -1
        return (a.familia || '').localeCompare(b.familia || '')
      })

    const thinStyle: ExcelJS.BorderStyle = 'thin'
    const mediumStyle: ExcelJS.BorderStyle = 'medium'

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: thinStyle, color: { argb: 'FFCBD5E1' } },
      left: { style: thinStyle, color: { argb: 'FFCBD5E1' } },
      bottom: { style: thinStyle, color: { argb: 'FFCBD5E1' } },
      right: { style: thinStyle, color: { argb: 'FFCBD5E1' } },
    }
    const borderHeader: Partial<ExcelJS.Borders> = {
      top: { style: thinStyle, color: { argb: 'FF8596B0' } },
      left: { style: thinStyle, color: { argb: 'FF8596B0' } },
      bottom: { style: mediumStyle, color: { argb: 'FF475569' } },
      right: { style: thinStyle, color: { argb: 'FF8596B0' } },
    }

    const mesActual = new Date().toLocaleDateString('es-MX', { month: 'long' }).toUpperCase()
    const anioActual = new Date().getFullYear()

    const buildSheet = (worksheet: ExcelJS.Worksheet, isBlanco: boolean) => {
      worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 1 as ExcelJS.PaperSize,
        fitToPage: false,
        horizontalCentered: true,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
        printTitlesRow: '3:3',
      }
      worksheet.headerFooter = {
        oddHeader: '&C&9INVENTARIO GLOBAL - &D',
        oddFooter: '&CPágina &P de &N',
      }
      worksheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: true }]

      const CHARS_POR_LINEA_DESC = 40
      const ALTO_LINEA = 16
      const PADDING_VERTICAL = 18
      const ALTO_MIN_FILA = 30
      function estimarLineas(texto: string): number {
        const t = (texto || '').trim().replace(/\s+/g, ' ')
        if (!t) return 1
        const palabras = t.split(' ')
        let lineas = 1
        let usada = 0
        for (const p of palabras) {
          if (p.length > CHARS_POR_LINEA_DESC) {
            if (usada > 0) {
              lineas += 1
              usada = 0
            }
            lineas += Math.ceil(p.length / CHARS_POR_LINEA_DESC) - 1
            usada = p.length % CHARS_POR_LINEA_DESC
            continue
          }
          const conEspacio = usada === 0 ? p.length : usada + 1 + p.length
          if (conEspacio <= CHARS_POR_LINEA_DESC) {
            usada = conEspacio
          } else {
            lineas += 1
            usada = p.length
          }
        }
        return Math.max(1, lineas + (lineas > 1 ? 1 : 0))
      }
      function alturaParaBloque(descUpper: string, numFilas: number): number {
        const total = estimarLineas(descUpper) * ALTO_LINEA + PADDING_VERTICAL
        return Math.max(ALTO_MIN_FILA, Math.ceil(total / Math.max(1, numFilas)))
      }

      const PRESUPUESTO_PAGINA_PT = 440
      let usadoEnPagina = 0
      function pedirSaltoSiNoCabe(altoBloque: number, filaAnterior: number): boolean {
        if (filaAnterior < 4 || altoBloque <= 0) return false
        if (usadoEnPagina > 0 && usadoEnPagina + altoBloque > PRESUPUESTO_PAGINA_PT) {
          try {
            worksheet.getRow(filaAnterior).addPageBreak()
          } catch {
            // Ignorar si ExcelJS no puede insertar el salto
          }
          usadoEnPagina = 0
          return true
        }
        return false
      }

      const columnsList = [
        { header: 'DESCRIPCION', key: 'descripcion', width: 50 },
        { header: 'ESTILO', key: 'estilo', width: 18 },
      ]

      sortedBodegas.forEach((b) => {
        columnsList.push({
          header: b.nombre.toUpperCase(),
          key: `b_${b.id}`,
          width: 8.5,
        })
      })

      columnsList.push({ header: 'GLOBAL', key: 'global', width: 12 })
      columnsList.push({ header: 'FAMILIA', key: 'familia', width: 18 })

      worksheet.columns = columnsList
      const totalCols = columnsList.length
      const startBodegaCol = 3
      const globalCol = 3 + sortedBodegas.length
      const famCol = globalCol + 1

      const row1 = worksheet.getRow(1)
      row1.height = 40
      worksheet.mergeCells(1, 1, 1, totalCols)
      const titleCell = worksheet.getCell(1, 1)
      titleCell.value = isBlanco
        ? `INVENTARIO GLOBAL (FORMATO BLANCO)  ${mesActual} ${anioActual}`
        : `INVENTARIO GLOBAL CON EXISTENCIAS  ${mesActual} ${anioActual}`
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF0F172A' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFDF5' } }

      worksheet.getRow(2).height = 8

      const headerRow = worksheet.getRow(3)
      headerRow.height = 64

      const cDesc = headerRow.getCell(1)
      cDesc.value = 'DESCRIPCION'
      cDesc.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }
      cDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } }
      cDesc.alignment = { horizontal: 'center', vertical: 'middle' }
      cDesc.border = borderHeader

      const cEstilo = headerRow.getCell(2)
      cEstilo.value = 'ESTILO'
      cEstilo.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } }
      cEstilo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      cEstilo.alignment = { horizontal: 'center', vertical: 'middle' }
      cEstilo.border = borderHeader

      sortedBodegas.forEach((b, idx) => {
        const cell = headerRow.getCell(startBodegaCol + idx)
        cell.value = b.nombre.toUpperCase()
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF000000' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: b.es_virtual ? 'FFFCE4D6' : 'FFDDEBF7' },
        }
        cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
        cell.border = borderHeader
      })

      const cGlobal = headerRow.getCell(globalCol)
      cGlobal.value = 'GLOBAL'
      cGlobal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } }
      cGlobal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      cGlobal.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
      cGlobal.border = borderHeader

      const cFam = headerRow.getCell(famCol)
      cFam.value = 'FAMILIA'
      cFam.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } }
      cFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      cFam.alignment = { horizontal: 'center', vertical: 'middle' }
      cFam.border = borderHeader

      let currentRow = 4
      let realFamiliesCount = 0

      sorted.forEach((f) => {
        const name = f.familia || 'Sin Clasificar'
        const isUnassigned = isUnassignedFamily(f.familia)
        if (!isUnassigned) realFamiliesCount++

        const skusList = (f.skus || []).filter((s) => {
          const currentDest = stagedMoves[s.id]
          const isHere = currentDest !== undefined ? currentDest === f.familia : true
          if (!isHere) return false
          return mostrarInactivos || s.activo !== false
        })

        Object.entries(stagedMoves).forEach(([prodIdStr, destFamily]) => {
          if (destFamily === f.familia) {
            const prodId = parseInt(prodIdStr, 10)
            if (!skusList.some((s) => s.id === prodId)) {
              let foundSku: FamiliaResumenSku | undefined
              for (const origFam of familias) {
                const item = origFam.skus?.find((s) => s.id === prodId)
                if (item) {
                  foundSku = item
                  break
                }
              }
              if (!foundSku) {
                for (const prods of Object.values(loadedProducts)) {
                  const item = prods.find((p) => p.id === prodId)
                  if (item) {
                    foundSku = {
                      id: item.id,
                      sku_base: item.sku_base,
                      descripcion: item.descripcion || null,
                      activo: item.activo,
                    }
                    break
                  }
                }
              }
              if (foundSku && (mostrarInactivos || foundSku.activo !== false)) {
                skusList.push(foundSku)
              }
            }
          }
        })

        skusList.sort((a, b) => (a.sku_base || '').localeCompare(b.sku_base || '', 'es', { sensitivity: 'base' }))

        const primerSkuConDesc = skusList.find((s) => s.descripcion && s.descripcion.trim()) || skusList[0]
        const desc = primerSkuConDesc?.descripcion || f.descripcion || ''
        const descUpperFam = (desc || '').toUpperCase()
        const altoPorFilaFam = isUnassigned
          ? ALTO_MIN_FILA
          : alturaParaBloque(descUpperFam, skusList.length)

        if (!isUnassigned && skusList.length > 0) {
          const altoBloqueFam = altoPorFilaFam * skusList.length
          pedirSaltoSiNoCabe(altoBloqueFam, currentRow - 1)
        }

        if (skusList.length > 0) {
          const startMerge = currentRow
          const startColLetter = getColumnLetter(startBodegaCol)
          const endColLetter = getColumnLetter(startBodegaCol + sortedBodegas.length - 1)

          skusList.forEach((sku, idx) => {
            const totalCajas = totalStockPorProducto[sku.id] ?? 0
            const esStockCero = totalCajas === 0
            const textoFila = isUnassigned ? ((sku.descripcion || desc) || '').toUpperCase() : descUpperFam
            const altoFila = isUnassigned
              ? Math.max(ALTO_MIN_FILA, estimarLineas(textoFila) * ALTO_LINEA + PADDING_VERTICAL)
              : altoPorFilaFam

            if (isUnassigned) {
              pedirSaltoSiNoCabe(altoFila, currentRow - 1)
            }

            const rowValues: Record<string, unknown> = {
              descripcion: isUnassigned ? textoFila : idx === 0 ? descUpperFam : '',
              estilo: sku.sku_base,
              familia: isUnassigned ? sku.sku_base || 'F000-000C' : idx === 0 ? name : '',
            }

            sortedBodegas.forEach((b) => {
              if (isBlanco) {
                rowValues[`b_${b.id}`] = ''
              } else {
                const val = stockPorProductoYBodega[sku.id]?.[b.id] ?? 0
                rowValues[`b_${b.id}`] = val > 0 ? val : ''
              }
            })

            rowValues['global'] = { formula: `=SUM(${startColLetter}${currentRow}:${endColLetter}${currentRow})` }

            const row = worksheet.addRow(rowValues)
            row.height = altoFila

            for (let c = 1; c <= totalCols; c++) {
              const cell = row.getCell(c)
              cell.font = { name: 'Calibri', size: 10 }
              cell.border = thinBorder

              if (c === 1) {
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
                cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E293B' } }
              } else if (c === 2) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }

                if (!isBlanco && esStockCero) {
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFEE2E2' },
                  }
                  cell.font = {
                    name: 'Calibri',
                    size: 10.5,
                    bold: true,
                    color: { argb: 'FF991B1B' },
                  }
                } else {
                  cell.font = {
                    name: 'Calibri',
                    size: 10.5,
                    bold: true,
                    color: { argb: sku.activo === false ? 'FFFF0000' : 'FF0F172A' },
                  }
                }
              } else if (c === globalCol) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
                cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFDC2626' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
              } else if (c === famCol) {
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
                cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } }
              } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' }
                cell.font = { name: 'Calibri', size: 10, bold: false, color: { argb: 'FF000000' } }
              }
            }

            if (isUnassigned) usadoEnPagina += altoFila
            currentRow++
          })

          const endMerge = currentRow - 1
          if (!isUnassigned) usadoEnPagina += altoPorFilaFam * skusList.length

          if (!isUnassigned && endMerge > startMerge) {
            worksheet.mergeCells(startMerge, 1, endMerge, 1)
            const mergedDesc = worksheet.getCell(startMerge, 1)
            mergedDesc.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

            worksheet.mergeCells(startMerge, famCol, endMerge, famCol)
            const mergedFam = worksheet.getCell(startMerge, famCol)
            mergedFam.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

            for (let r = startMerge; r <= endMerge; r++) {
              worksheet.getCell(r, 1).border = thinBorder
              worksheet.getCell(r, famCol).border = thinBorder
            }
          }

          const lastRow = worksheet.getRow(endMerge)
          for (let c = 1; c <= totalCols; c++) {
            lastRow.getCell(c).border = {
              ...lastRow.getCell(c).border,
              bottom: { style: 'medium', color: { argb: 'FF475569' } },
            }
          }
        }
      })

      pedirSaltoSiNoCabe(26 + 64, currentRow - 1)
      currentRow++
      const totalsRowIdx = currentRow
      const namesRowIdx = currentRow + 1

      const totalsRow = worksheet.getRow(totalsRowIdx)
      const namesRow = worksheet.getRow(namesRowIdx)

      totalsRow.height = 26
      namesRow.height = 64

      worksheet.mergeCells(totalsRowIdx, 1, totalsRowIdx, 2)
      const cellTotalesLabel = worksheet.getCell(totalsRowIdx, 1)
      cellTotalesLabel.value = 'TOTAL CAJAS'
      cellTotalesLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
      cellTotalesLabel.alignment = { horizontal: 'right', vertical: 'middle' }
      cellTotalesLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }

      worksheet.mergeCells(namesRowIdx, 1, namesRowIdx, 2)
      const cellBodegasLabel = worksheet.getCell(namesRowIdx, 1)
      cellBodegasLabel.value = 'BODEGAS'
      cellBodegasLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } }
      cellBodegasLabel.alignment = { horizontal: 'right', vertical: 'middle' }
      cellBodegasLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }

      const borderResumen: Partial<ExcelJS.Borders> = {
        top: { style: 'medium', color: { argb: 'FF475569' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      }

      cellTotalesLabel.border = borderResumen
      worksheet.getCell(totalsRowIdx, 2).border = borderResumen

      const borderNamesBottom: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      }

      cellBodegasLabel.border = borderNamesBottom
      worksheet.getCell(namesRowIdx, 2).border = borderNamesBottom

      sortedBodegas.forEach((b, idx) => {
        const colNumber = startBodegaCol + idx
        const colLetter = getColumnLetter(colNumber)

        const sumCell = worksheet.getCell(totalsRowIdx, colNumber)
        sumCell.value = { formula: `=SUM(${colLetter}4:${colLetter}${totalsRowIdx - 2})` }
        sumCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } }
        sumCell.alignment = { horizontal: 'center', vertical: 'middle' }
        sumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
        sumCell.border = borderResumen

        const nameCell = worksheet.getCell(namesRowIdx, colNumber)
        nameCell.value = b.nombre.toUpperCase()
        nameCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } }
        nameCell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom', wrapText: false }
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        nameCell.border = borderNamesBottom
      })

      const globalColLetter = getColumnLetter(globalCol)
      const globalSumCell = worksheet.getCell(totalsRowIdx, globalCol)
      globalSumCell.value = { formula: `=SUM(${globalColLetter}4:${globalColLetter}${totalsRowIdx - 2})` }
      globalSumCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFDC2626' } }
      globalSumCell.alignment = { horizontal: 'center', vertical: 'middle' }
      globalSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
      globalSumCell.border = borderResumen

      const globalNameCell = worksheet.getCell(namesRowIdx, globalCol)
      globalNameCell.value = 'TOTAL'
      globalNameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } }
      globalNameCell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
      globalNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      globalNameCell.border = borderNamesBottom

      const cTotFam = worksheet.getCell(totalsRowIdx, famCol)
      cTotFam.value = `${realFamiliesCount} FAMILIAS`
      cTotFam.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } }
      cTotFam.alignment = { horizontal: 'center', vertical: 'middle' }
      cTotFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      cTotFam.border = borderResumen

      const cFootFam = worksheet.getCell(namesRowIdx, famCol)
      cFootFam.value = 'FAMILIA'
      cFootFam.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } }
      cFootFam.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
      cFootFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
      cFootFam.border = borderNamesBottom
    }

    const sheetBlanco = workbook.addWorksheet('Formato Blanco', {
      views: [{ showGridLines: true }],
    })
    buildSheet(sheetBlanco, true)

    const sheetStock = workbook.addWorksheet('Stock con Señalamiento', {
      views: [{ showGridLines: true }],
    })
    buildSheet(sheetStock, false)

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `Reporte_Familias_Agrupadas_${new Date().toISOString().slice(0, 10)}.xlsx`
    anchor.click()
    window.URL.revokeObjectURL(url)

    toast.success('¡Reporte exportado con éxito (2 hojas)!', { id: toastId })
  } catch (err: unknown) {
    console.error('Error al exportar reporte Excel:', err)
    const message = err instanceof Error ? err.message : 'Ocurrió un error al exportar el reporte Excel'
    toast.error(message, { id: toastId })
  }
}
