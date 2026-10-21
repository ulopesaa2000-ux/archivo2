// lib/inventario/excel-impresion-historico.ts
/**
 * Hoja "Formato Impresión" del reporte histórico.
 *
 * Calcada del reporte GLOBAL de Stock (app/(admin)/inventario/stock/StockMatrixTable.tsx):
 *   título mergeado · subtítulo · encabezados rotados 45° · DESCRIPCIÓN
 *   combinada y mergeada por familia · GLOBAL en rojo · FAMILIA al final ·
 *   zebra · borde medium al cierre de familia · filas de total.
 *
 * Dos variantes:
 *   - `conMovimientos: false` → UNA columna por bodega con el stock YA revertido al
 *     corte (el formato del inventario global de Stock, a la fecha de corte).
 *   - `conMovimientos: true`  → el PAR "AL CORTE | MOVIMIENTOS" por columna.
 */

import {
  COLOR,
  NUM_FMT,
  NUM_FMT_FIRMA,
  compareFamiliaAsc,
  compareSkuAsc,
  esFamiliaSinAsignar,
  num,
  type DatosExcelHistorico,
  type FilaExcel,
} from './excel-historico'

type WorkSheet = any

export type OpcionesImpresion = {
  /** true = par AL CORTE | MOVIMIENTOS por columna. false = una sola columna. */
  conMovimientos?: boolean
}

type ItemAgrupado = {
  familia: string
  sku: string
  descripcion_general: string
  porColumna: Record<string, { corte: number; movimiento: number; hoy: number; ajuste: number }>
  totalCorte: number
  totalMovimiento: number
}

/** Clave de la columna a la que pertenece una fila plana. */
function claveColumnaFila(
  fila: { bodega_id: number; ciudad: string },
  tipo: 'bodega' | 'ciudad'
): string {
  return tipo === 'ciudad' ? `c:${fila.ciudad}` : `b:${fila.bodega_id}`
}

export function construirHojaImpresion(
  workbook: any,
  datos: DatosExcelHistorico,
  opciones: OpcionesImpresion = {}
): void {
  const conMovimientos = opciones.conMovimientos !== false
  const columnas = datos.columnas
  if (columnas.length === 0) return

  const N = columnas.length
  const subPorColumna = conMovimientos ? 2 : 1
  const startCol = 3 // 1=DESCRIPCION, 2=ESTILO
  const globalCorteCol = startCol + N * subPorColumna
  const globalMovCol = conMovimientos ? globalCorteCol + 1 : -1
  const familiaCol = (conMovimientos ? globalMovCol : globalCorteCol) + 1
  const totalCols = familiaCol
  const headerSubIdx = conMovimientos ? 4 : 3
  const primeraFilaDatos = conMovimientos ? 5 : 4

  // ── Agrupar filas planas por producto (SKU) y luego por familia ──────────
  const porProducto = new Map<string, FilaExcel[]>()
  for (const f of datos.filas) {
    const arr = porProducto.get(f.sku) ?? []
    arr.push(f)
    porProducto.set(f.sku, arr)
  }

  const items: ItemAgrupado[] = []
  const porFamiliaItems = new Map<string, ItemAgrupado[]>()
  for (const [sku, filas] of porProducto.entries()) {
    const primera = filas[0]
    const item: ItemAgrupado = {
      familia: primera.familia || 'SIN FAMILIA',
      sku,
      descripcion_general:
        primera.descripcion_general ||
        primera.descripcion ||
        (datos.descripcionesCanonicas[primera.familia || ''] ?? ''),
      porColumna: {},
      totalCorte: 0,
      totalMovimiento: 0,
    }
    for (const f of filas) {
      const key = claveColumnaFila(f, datos.tipoColumna)
      const actual = item.porColumna[key] ?? { corte: 0, movimiento: 0, hoy: 0, ajuste: 0 }
      actual.corte += f.cajas_corte
      actual.movimiento += f.entradas_posteriores - f.salidas_posteriores
      actual.hoy += f.cajas_hoy
      actual.ajuste += f.ajuste
      item.porColumna[key] = actual
      item.totalCorte += f.cajas_corte
      item.totalMovimiento += f.entradas_posteriores - f.salidas_posteriores
    }
    const arr = porFamiliaItems.get(item.familia) ?? []
    arr.push(item)
    porFamiliaItems.set(item.familia, arr)
  }

  const familias = Array.from(porFamiliaItems.keys()).sort(compareFamiliaAsc)

  const descripcionFamilia: Record<string, string> = { ...datos.descripcionesCanonicas }
  for (const fam of familias) {
    if (descripcionFamilia[fam]) continue
    const itemsFam = porFamiliaItems.get(fam)!
    descripcionFamilia[fam] = itemsFam[0]?.descripcion_general || ''
  }

  // ── Totales por columna ──────────────────────────────────────────────────
  const totalCortePorColumna: Record<string, number> = {}
  const totalMovPorColumna: Record<string, number> = {}
  let granCorte = 0
  let granMov = 0
  for (const c of columnas) {
    totalCortePorColumna[c.key] = 0
    totalMovPorColumna[c.key] = 0
  }

  // ── Hoja ─────────────────────────────────────────────────────────────────
  const sheet: WorkSheet = workbook.addWorksheet('Formato Impresión')
  sheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.2, right: 0.2, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    printTitlesRow: conMovimientos ? '3:4' : '3:3',
  }

  // Fila 1: título
  sheet.getRow(1).height = 42
  sheet.mergeCells(1, 1, 1, totalCols)
  const titulo = sheet.getCell(1, 1)
  titulo.value = `INVENTARIO HISTORICO AL ${datos.fechaCorte}`
  titulo.font = { bold: true, size: 18, color: { argb: COLOR.tituloFuente } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.titulo } }

  // Fila 2: subtítulo (alcance)
  sheet.getRow(2).height = 18
  sheet.mergeCells(2, 1, 2, totalCols)
  const sub = sheet.getCell(2, 1)
  sub.value = `Alcance: ${datos.alcanceLabel}  ·  solo cajas  ·  ${
    datos.notasRevertidas
  } notas CONF posteriores al corte revertidas  ·  generado el ${new Date().toLocaleString('es-MX')}`
  sub.font = { size: 10, italic: true, color: { argb: COLOR.bordeFuerte } }
  sub.alignment = { horizontal: 'center', vertical: 'middle' }

  // Fila 3: encabezados nivel 1
  const headerRowIdx = 3
  const headerRow = sheet.getRow(headerRowIdx)
  headerRow.height = conMovimientos ? 62 : 95
  const borderHeader = {
    top: { style: 'thin', color: { argb: COLOR.bordeHeader } },
    bottom: { style: 'medium', color: { argb: COLOR.bordeFuerte } },
    left: { style: 'thin', color: { argb: COLOR.bordeHeader } },
    right: { style: 'thin', color: { argb: COLOR.bordeHeader } },
  }

  const cDesc = sheet.getCell(headerRowIdx, 1)
  cDesc.value = 'DESCRIPCION'
  cDesc.font = { bold: true, size: 11, color: { argb: COLOR.tituloFuente } }
  cDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.descripcion } }
  cDesc.alignment = { horizontal: 'center', vertical: 'middle' }
  cDesc.border = borderHeader

  const cEstilo = sheet.getCell(headerRowIdx, 2)
  cEstilo.value = 'ESTILO'
  cEstilo.font = { bold: true, size: 11, color: { argb: COLOR.tituloFuente } }
  cEstilo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.estilo } }
  cEstilo.alignment = { horizontal: 'center', vertical: 'middle' }
  cEstilo.border = borderHeader

  // Nombre de cada columna, rotado 45° (merge sobre su par si hay pares)
  columnas.forEach((c, idx) => {
    const col = startCol + idx * subPorColumna
    if (conMovimientos) sheet.mergeCells(headerRowIdx, col, headerRowIdx, col + 1)
    const cell = sheet.getCell(headerRowIdx, col)
    cell.value = c.nombre.toUpperCase()
    cell.font = { bold: true, size: 9, color: { argb: COLOR.tituloFuente } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.columna } }
    cell.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom', wrapText: false }
    cell.border = borderHeader
    if (conMovimientos) sheet.getCell(headerRowIdx, col + 1).border = borderHeader
  })

  const cGlobal = sheet.getCell(headerRowIdx, globalCorteCol)
  cGlobal.value = 'GLOBAL'
  cGlobal.font = { bold: true, size: 10, color: { argb: COLOR.globalFuente } }
  cGlobal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.global } }
  cGlobal.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
  cGlobal.border = borderHeader

  if (conMovimientos) {
    const cGlobalMov = sheet.getCell(headerRowIdx, globalMovCol)
    cGlobalMov.value = 'MOVIMIENTOS'
    cGlobalMov.font = { bold: true, size: 9, color: { argb: COLOR.movimientoOscuro } }
    cGlobalMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.movimiento } }
    cGlobalMov.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
    cGlobalMov.border = borderHeader
  }

  const cFam = sheet.getCell(headerRowIdx, familiaCol)
  cFam.value = 'FAMILIA'
  cFam.font = { bold: true, size: 11, color: { argb: COLOR.familiaFuente } }
  cFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.familia } }
  cFam.alignment = { horizontal: 'center', vertical: 'middle' }
  cFam.border = borderHeader

  // Fila 4 (solo con pares): sub-encabezados
  if (conMovimientos) {
    const subIdx = 4
    const subRow = sheet.getRow(subIdx)
    subRow.height = 20
    columnas.forEach((c, idx) => {
      const col = startCol + idx * 2
      const celCorte = sheet.getCell(subIdx, col)
      celCorte.value = 'AL CORTE'
      celCorte.font = { bold: true, size: 8, color: { argb: COLOR.tituloFuente } }
      celCorte.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.corte } }
      celCorte.alignment = { horizontal: 'center', vertical: 'middle' }
      celCorte.border = borderHeader

      const celMov = sheet.getCell(subIdx, col + 1)
      celMov.value = 'MOVIMIENTOS'
      celMov.font = { bold: true, size: 8, color: { argb: COLOR.movimientoOscuro } }
      celMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.movimiento } }
      celMov.alignment = { horizontal: 'center', vertical: 'middle' }
      celMov.border = borderHeader
    })
    sheet.getCell(subIdx, globalCorteCol).border = borderHeader
    sheet.getCell(subIdx, globalMovCol).border = borderHeader
    sheet.getCell(subIdx, familiaCol).border = borderHeader
  }

  // ── Filas de datos ───────────────────────────────────────────────────────
  let currentRowIdx = primeraFilaDatos
  let familiasReales = 0

  familias.forEach((familia, fIdx) => {
    const items = (porFamiliaItems.get(familia) ?? []).slice().sort((a, b) => compareSkuAsc(a.sku, b.sku))
    const isUnassigned = esFamiliaSinAsignar(familia)
    if (!isUnassigned) familiasReales++
    const startRow = currentRowIdx
    const isEven = fIdx % 2 === 0
    const bgColor = isEven ? COLOR.blanco : COLOR.zebra
    const descTexto = descripcionFamilia[familia] || items[0]?.descripcion_general || ''

    let rowHeight = 30
    if (!isUnassigned && items.length === 1) {
      const lineas = Math.max(1, Math.ceil(descTexto.length / 32))
      rowHeight = Math.max(30, lineas * 15 + 10)
    }

    items.forEach((item, itemIdx) => {
      const row = sheet.getRow(currentRowIdx)
      row.height = rowHeight
      const thinBorder = {
        top: { style: 'thin', color: { argb: COLOR.bordeFino } },
        bottom: { style: 'thin', color: { argb: COLOR.bordeFino } },
        left: { style: 'thin', color: { argb: COLOR.bordeFino } },
        right: { style: 'thin', color: { argb: COLOR.bordeFino } },
      }

      // Col 1: DESCRIPCIÓN (combinada por familia)
      const celDesc = sheet.getCell(currentRowIdx, 1)
      if (isUnassigned) {
        celDesc.value = (item.descripcion_general || '').toUpperCase()
        celDesc.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      } else if (itemIdx === 0) {
        celDesc.value = descTexto.toUpperCase()
        celDesc.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      }
      celDesc.font = { size: 9.5, bold: true, color: { argb: 'FF1E293B' } }
      celDesc.border = thinBorder

      // Col 2: ESTILO (SKU)
      const celEstilo = sheet.getCell(currentRowIdx, 2)
      celEstilo.value = item.sku
      celEstilo.alignment = { vertical: 'middle', horizontal: 'center' }
      celEstilo.font = { size: 10.5, bold: true, color: { argb: COLOR.tituloFuente } }
      celEstilo.border = thinBorder

      // Cols 3..N: valor al corte (y opcionalmente el par de movimientos)
      let totalCorteFila = 0
      let totalMovFila = 0
      columnas.forEach((c, cIdx) => {
        const col = startCol + cIdx * subPorColumna
        const valorCorte = item.porColumna[c.key]?.corte ?? 0
        const valorMov = item.porColumna[c.key]?.movimiento ?? 0
        totalCorteFila += valorCorte
        totalMovFila += valorMov
        totalCortePorColumna[c.key] += valorCorte
        totalMovPorColumna[c.key] += valorMov

        const celCorte = sheet.getCell(currentRowIdx, col)
        celCorte.value = valorCorte > 0 ? valorCorte : null
        celCorte.alignment = { horizontal: 'center', vertical: 'middle' }
        celCorte.font = {
          size: 11,
          bold: valorCorte > 0,
          color: { argb: valorCorte > 0 ? 'FF000000' : COLOR.vacio },
        }
        celCorte.border = thinBorder
        celCorte.numFmt = NUM_FMT

        if (conMovimientos) {
          const celMov = sheet.getCell(currentRowIdx, col + 1)
          celMov.value = valorMov !== 0 ? valorMov : null
          celMov.alignment = { horizontal: 'center', vertical: 'middle' }
          celMov.font = {
            size: 10,
            bold: valorMov !== 0,
            color: { argb: valorMov > 0 ? 'FF15803D' : valorMov < 0 ? COLOR.negativo : COLOR.vacio },
          }
          celMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCF3' } }
          celMov.border = thinBorder
          celMov.numFmt = NUM_FMT_FIRMA
        }
      })

      granCorte += totalCorteFila
      granMov += totalMovFila

      // GLOBAL AL CORTE
      const celGlobal = sheet.getCell(currentRowIdx, globalCorteCol)
      celGlobal.value = totalCorteFila
      celGlobal.font = { bold: true, color: { argb: COLOR.globalFuente }, size: 11.5 }
      celGlobal.alignment = { horizontal: 'center', vertical: 'middle' }
      celGlobal.border = thinBorder
      celGlobal.numFmt = NUM_FMT

      // GLOBAL MOVIMIENTOS (solo en la variante con pares)
      if (conMovimientos) {
        const celGlobalMov = sheet.getCell(currentRowIdx, globalMovCol)
        celGlobalMov.value = totalMovFila !== 0 ? totalMovFila : null
        celGlobalMov.font = {
          bold: totalMovFila !== 0,
          size: 10,
          color: { argb: totalMovFila > 0 ? 'FF15803D' : totalMovFila < 0 ? COLOR.negativo : COLOR.vacio },
        }
        celGlobalMov.alignment = { horizontal: 'center', vertical: 'middle' }
        celGlobalMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCF3' } }
        celGlobalMov.border = thinBorder
        celGlobalMov.numFmt = NUM_FMT_FIRMA
      }

      // FAMILIA (al final)
      const celFam = sheet.getCell(currentRowIdx, familiaCol)
      if (isUnassigned) {
        celFam.value = item.familia || 'F000-000C'
      } else if (itemIdx === 0) {
        celFam.value = familia
      }
      celFam.font = { bold: true, size: 9.5, color: { argb: COLOR.familiaFuente } }
      celFam.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      celFam.border = thinBorder

      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      currentRowIdx++
    })

    const endRow = currentRowIdx - 1
    if (!isUnassigned && startRow < endRow) {
      sheet.mergeCells(startRow, 1, endRow, 1)
      sheet.mergeCells(startRow, familiaCol, endRow, familiaCol)
    }

    const lastRow = sheet.getRow(endRow)
    for (let col = 1; col <= totalCols; col++) {
      const cell = lastRow.getCell(col)
      cell.border = { ...cell.border, bottom: { style: 'medium', color: { argb: COLOR.bordeFuerte } } }
    }
  })

  // ── Pie: TOTAL AL CORTE ──────────────────────────────────────────────────
  currentRowIdx += 1
  const rowCorteIdx = currentRowIdx
  const rowCorte = sheet.getRow(rowCorteIdx)
  rowCorte.height = 30
  sheet.mergeCells(rowCorteIdx, 1, rowCorteIdx, 2)
  const lblCorte = sheet.getCell(rowCorteIdx, 1)
  lblCorte.value = 'TOTAL CAJAS'
  lblCorte.font = { bold: true, size: 11, color: { argb: COLOR.totalFuente } }
  lblCorte.alignment = { horizontal: 'right', vertical: 'middle' }
  lblCorte.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.total } }
  const borderResumen = {
    top: { style: 'medium', color: { argb: COLOR.bordeFuerte } },
    bottom: { style: 'thin', color: { argb: COLOR.bordeHeader } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }
  lblCorte.border = borderResumen
  sheet.getCell(rowCorteIdx, 2).border = borderResumen

  columnas.forEach((c, idx) => {
    const col = startCol + idx * subPorColumna
    const cel = sheet.getCell(rowCorteIdx, col)
    cel.value = totalCortePorColumna[c.key] ?? 0
    cel.font = { bold: true, size: 11, color: { argb: COLOR.totalFuente } }
    cel.alignment = { horizontal: 'center', vertical: 'middle' }
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    cel.border = borderResumen
    cel.numFmt = NUM_FMT
    if (conMovimientos) {
      const celVacio = sheet.getCell(rowCorteIdx, col + 1)
      celVacio.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCF3' } }
      celVacio.border = borderResumen
    }
  })

  const celTotGlobal = sheet.getCell(rowCorteIdx, globalCorteCol)
  celTotGlobal.value = granCorte
  celTotGlobal.font = { bold: true, size: 12, color: { argb: COLOR.globalFuente } }
  celTotGlobal.alignment = { horizontal: 'center', vertical: 'middle' }
  celTotGlobal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.global } }
  celTotGlobal.border = borderResumen
  celTotGlobal.numFmt = NUM_FMT

  const celFamCorte = sheet.getCell(rowCorteIdx, familiaCol)
  celFamCorte.value = `${familiasReales} FAMILIAS`
  celFamCorte.font = { bold: true, size: 10, color: { argb: COLOR.familiaFuente } }
  celFamCorte.alignment = { horizontal: 'center', vertical: 'middle' }
  celFamCorte.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.familia } }
  celFamCorte.border = borderResumen

  // ── Pie: TOTAL MOVIMIENTOS (solo en la variante con pares) ───────────────
  if (conMovimientos) {
    currentRowIdx++
    const rowMovIdx = currentRowIdx
    const rowMov = sheet.getRow(rowMovIdx)
    rowMov.height = 30
    sheet.mergeCells(rowMovIdx, 1, rowMovIdx, 2)
    const lblMov = sheet.getCell(rowMovIdx, 1)
    lblMov.value = 'TOTAL MOVIMIENTOS POSTERIORES'
    lblMov.font = { bold: true, size: 10, color: { argb: COLOR.movimientoOscuro } }
    lblMov.alignment = { horizontal: 'right', vertical: 'middle' }
    lblMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.movimiento } }
    lblMov.border = borderResumen
    sheet.getCell(rowMovIdx, 2).border = borderResumen

    columnas.forEach((c, idx) => {
      const col = startCol + idx * 2
      const cel = sheet.getCell(rowMovIdx, col + 1)
      const v = totalMovPorColumna[c.key] ?? 0
      cel.value = v !== 0 ? v : null
      cel.font = {
        bold: v !== 0,
        size: 10,
        color: { argb: v > 0 ? 'FF15803D' : v < 0 ? COLOR.negativo : COLOR.vacio },
      }
      cel.alignment = { horizontal: 'center', vertical: 'middle' }
      cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCF3' } }
      cel.border = borderResumen
      cel.numFmt = NUM_FMT_FIRMA
      const celVacio = sheet.getCell(rowMovIdx, col)
      celVacio.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCF3' } }
      celVacio.border = borderResumen
    })

    const celTotMov = sheet.getCell(rowMovIdx, globalMovCol)
    celTotMov.value = granMov !== 0 ? granMov : null
    celTotMov.font = {
      bold: true,
      size: 11,
      color: { argb: granMov > 0 ? 'FF15803D' : granMov < 0 ? COLOR.negativo : COLOR.vacio },
    }
    celTotMov.alignment = { horizontal: 'center', vertical: 'middle' }
    celTotMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCF3' } }
    celTotMov.border = borderResumen
    celTotMov.numFmt = NUM_FMT_FIRMA

    const celFamMov = sheet.getCell(rowMovIdx, familiaCol)
    celFamMov.value = datos.notasRevertidas ? `${datos.notasRevertidas} NOTAS` : ''
    celFamMov.font = { bold: true, size: 9, color: { argb: COLOR.familiaFuente } }
    celFamMov.alignment = { horizontal: 'center', vertical: 'middle' }
    celFamMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.familia } }
    celFamMov.border = borderResumen
  }

  // ── Pie: nombres de columnas ─────────────────────────────────────────────
  currentRowIdx++
  const rowColsIdx = currentRowIdx
  const rowCols = sheet.getRow(rowColsIdx)
  rowCols.height = conMovimientos ? 62 : 95
  sheet.mergeCells(rowColsIdx, 1, rowColsIdx, 2)
  const lblCols = sheet.getCell(rowColsIdx, 1)
  lblCols.value = datos.tipoColumna === 'ciudad' ? 'CIUDADES' : 'BODEGAS'
  lblCols.font = { bold: true, size: 11, color: { argb: COLOR.familiaFuente } }
  lblCols.alignment = { horizontal: 'right', vertical: 'middle' }
  lblCols.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.familia } }
  const borderCols = {
    top: { style: 'thin', color: { argb: COLOR.bordeHeader } },
    bottom: { style: 'medium', color: { argb: COLOR.bordeFuerte } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  }
  lblCols.border = borderCols
  sheet.getCell(rowColsIdx, 2).border = borderCols

  columnas.forEach((c, idx) => {
    const col = startCol + idx * subPorColumna
    if (conMovimientos) sheet.mergeCells(rowColsIdx, col, rowColsIdx, col + 1)
    const cel = sheet.getCell(rowColsIdx, col)
    cel.value = c.nombre.toUpperCase()
    cel.font = { bold: true, size: 9, color: { argb: COLOR.tituloFuente } }
    cel.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom', wrapText: false }
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.columna } }
    cel.border = borderCols
    if (conMovimientos) sheet.getCell(rowColsIdx, col + 1).border = borderCols
  })

  const celFootGlobal = sheet.getCell(rowColsIdx, globalCorteCol)
  celFootGlobal.value = 'TOTAL'
  celFootGlobal.font = { bold: true, size: 10, color: { argb: COLOR.globalFuente } }
  celFootGlobal.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
  celFootGlobal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.global } }
  celFootGlobal.border = borderCols

  if (conMovimientos) {
    const celFootMov = sheet.getCell(rowColsIdx, globalMovCol)
    celFootMov.value = 'MOVIMIENTOS'
    celFootMov.font = { bold: true, size: 9, color: { argb: COLOR.movimientoOscuro } }
    celFootMov.alignment = { textRotation: 45, horizontal: 'center', vertical: 'bottom' }
    celFootMov.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.movimiento } }
    celFootMov.border = borderCols
  }

  const celFootFam = sheet.getCell(rowColsIdx, familiaCol)
  celFootFam.value = 'FAMILIA'
  celFootFam.font = { bold: true, size: 10, color: { argb: COLOR.familiaFuente } }
  celFootFam.alignment = { horizontal: 'center', vertical: 'middle' }
  celFootFam.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.familia } }
  celFootFam.border = borderCols

  // ── Anchos de columna ────────────────────────────────────────────────────
  sheet.getColumn(1).width = 42
  sheet.getColumn(2).width = 18
  for (let idx = 0; idx < N; idx++) {
    sheet.getColumn(startCol + idx * subPorColumna).width = conMovimientos ? 11 : 13
    if (conMovimientos) sheet.getColumn(startCol + idx * subPorColumna + 1).width = 13
  }
  sheet.getColumn(globalCorteCol).width = 12
  if (conMovimientos) sheet.getColumn(globalMovCol).width = 13
  sheet.getColumn(familiaCol).width = 16
}
