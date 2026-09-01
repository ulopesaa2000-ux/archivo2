// modules/contenedores/exportarResumenExcel.ts
'use client'

import ExcelJS from 'exceljs'
import type { ResumenContenedorData } from './types'

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFF66FF' },
  bgColor: { argb: 'FFFF66FF' },
}

const NUM_FMT_MONEY = '_-"$"* #,##0.00_-;-"$"* #,##0.00_-;_-"$"* "-"??_-;_-@'

/**
 * Descarga una imagen desde una URL y retorna un ArrayBuffer o null
 */
async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch (err) {
    console.warn('No se pudo cargar la imagen para el Excel:', url, err)
    return null
  }
}

/**
 * Genera y descarga el archivo Excel resumen estilo HAMU1553617
 */
export async function generarExcelResumenContenedor(
  data: ResumenContenedorData
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'inv-tienda'
  workbook.lastModifiedBy = 'inv-tienda'
  workbook.created = new Date()
  workbook.modified = new Date()

  const sheet = workbook.addWorksheet('Hoja 1', {
    views: [{ showGridLines: true }],
  })

  // 1. Configuración de Anchos de Columna
  sheet.columns = [
    { key: 'A', width: 6.5 },   // CONTROL
    { key: 'B', width: 22 },    // IMAGEN / RESUMEN PRENDAS
    { key: 'C', width: 32 },    // MODELO
    { key: 'D', width: 26 },    // DESCRIPCIÓN
    { key: 'E', width: 26 },    // COMPOSICIÓN
    { key: 'F', width: 17 },    // PIEZAS TOTALES
    { key: 'G', width: 15 },    // TOTAL DE CAJAS
    { key: 'H', width: 15 },    // PIEZAS EN CAJA
    { key: 'I', width: 16 },    // PRECIO USD
    { key: 'J', width: 23 },    // IMPORTE TOTAL
    { key: 'K', width: 14 },    // CBM
    { key: 'L', width: 13 },    // DEMORAS
    { key: 'M', width: 13 },    // ALMACENAJES
    { key: 'N', width: 18 },    // FECHA DE LLEGADA AL ALMACEN
  ]

  // 2. Fila 1: Código de Contenedor
  const row1 = sheet.getRow(1)
  row1.height = 28
  const cellB1 = row1.getCell(2)
  cellB1.value = data.numeroContenedor || data.codigoContenedor
  cellB1.font = { name: 'Century Gothic', size: 16, bold: true, color: { argb: 'FF000000' } }
  cellB1.alignment = { vertical: 'middle', horizontal: 'center' }

  // 3. Fila 2: Cabecera Logística B/L
  const row2 = sheet.getRow(2)
  row2.height = 24

  // B2: Etiqueta fecha BL
  const cellB2 = row2.getCell(2)
  cellB2.value = 'fecha de salida BL '
  cellB2.font = { name: 'Century Gothic', size: 15, bold: true }
  cellB2.alignment = { vertical: 'middle', horizontal: 'center' }

  // C2: Fecha salida
  const cellC2 = row2.getCell(3)
  let fechaBL = data.fechaSalidaBl || ''
  if (fechaBL) {
    try {
      const d = new Date(fechaBL)
      if (!isNaN(d.getTime())) {
        fechaBL = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
      }
    } catch {}
  }
  cellC2.value = fechaBL
  cellC2.font = { name: 'Century Gothic', size: 13, bold: true }
  cellC2.alignment = { vertical: 'middle', horizontal: 'center' }

  // D2: Importador y Puerto Destino (ej: "VARDIT  PUERTO LAREDO")
  const cellD2 = row2.getCell(4)
  const importadorStr = data.importador?.trim() || 'VARDIT'
  const puertoStr = data.puertoDestino?.trim() || 'PUERTO LAREDO'
  cellD2.value = `${importadorStr}  ${puertoStr}`
  cellD2.font = { name: 'Century Gothic', size: 13, bold: true, color: { argb: 'FFFF0000' } }
  cellD2.alignment = { vertical: 'middle', horizontal: 'center' }

  // E2: Desaduanamiento
  const cellE2 = row2.getCell(5)
  cellE2.value = data.costoDesaduanamiento
    ? `DESADUANAMIENTO ${Number(data.costoDesaduanamiento).toLocaleString('en-US')}USD `
    : 'DESADUANAMIENTO 20,000USD '
  cellE2.font = { name: 'Century Gothic', size: 13, bold: true, color: { argb: 'FF0000FF' } }
  cellE2.alignment = { vertical: 'middle', horizontal: 'center' }

  // F2: ISF
  const cellF2 = row2.getCell(6)
  cellF2.value = data.costoIsf !== null && data.costoIsf !== undefined
    ? `ISF ${data.costoIsf} USD`
    : 'ISF 350 USD'
  cellF2.font = { name: 'Century Gothic', size: 13, bold: true, color: { argb: 'FF9900FF' } }
  cellF2.alignment = { vertical: 'middle', horizontal: 'center' }

  // G2: Flete Marítimo
  const cellG2 = row2.getCell(7)
  cellG2.value = data.costoFleteMaritimo
    ? `FELTE MARITIMO ${Number(data.costoFleteMaritimo).toLocaleString('en-US')}USD`
    : 'FELTE MARITIMO 5950USD'
  cellG2.font = { name: 'Century Gothic', size: 13, bold: true, color: { argb: 'FFFF0000' } }
  cellG2.alignment = { vertical: 'middle', horizontal: 'center' }

  // 4. Fila 3: Encabezados de Columnas
  const row3 = sheet.getRow(3)
  row3.height = 36
  const headers = [
    'CONTROL',
    data.resumenPrendasTitulo || 'CONJ. DEP. CHAM Y SUD. DAMA; CHAM. CAB.',
    'MODELO',
    'DESCRIPCION',
    'COMPOSICIÓN',
    'PIEZAS TOTALES',
    'TOTAL DE CAJAS',
    'PIEZAS EN  CAJA',
    'PRECIO USD',
    'IMPORTE TOTAL',
    'CBM',
    'DEMORAS',
    'ALMACENAJES ',
    'FECHA DE LLEGADA AL ALMACEN ',
  ]

  headers.forEach((h, idx) => {
    const cell = row3.getCell(idx + 1)
    cell.value = h
    cell.font = {
      name: 'Century Gothic',
      size: idx >= 11 ? 10 : idx === 0 || idx === 1 ? 14 : 16,
      bold: true,
      color: { argb: 'FF000000' },
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = BORDER_THIN
    if (idx <= 10) {
      cell.fill = HEADER_FILL
    }
  })

  // 5. Descargar imágenes en paralelo
  const items = data.items || []
  const imageBuffers = await Promise.all(
    items.map((it) => (it.imagenUrl ? fetchImageBuffer(it.imagenUrl) : Promise.resolve(null)))
  )

  // 6. Filas de Datos (Fila 4 a 3 + items.length)
  const startRow = 4
  const endRow = items.length > 0 ? startRow + items.length - 1 : startRow

  items.forEach((item, idx) => {
    const r = startRow + idx
    const row = sheet.getRow(r)
    row.height = 170

    // Col 1: CONTROL
    const c1 = row.getCell(1)
    c1.value = item.control || idx + 1
    c1.font = { name: 'Century Gothic', size: 16 }
    c1.alignment = { vertical: 'middle', horizontal: 'center' }
    c1.border = BORDER_THIN

    // Col 2: IMAGEN (Incrustar si existe, o celda en blanco)
    const c2 = row.getCell(2)
    c2.value = null
    c2.border = BORDER_THIN
    c2.alignment = { vertical: 'middle', horizontal: 'center' }

    const imgBuf = imageBuffers[idx]
    if (imgBuf) {
      try {
        const imageId = workbook.addImage({
          buffer: imgBuf,
          extension: 'jpeg',
        })
        sheet.addImage(imageId, {
          tl: { col: 1.1, row: r - 0.95 },
          ext: { width: 134, height: 190 },
          editAs: 'oneCell',
        })
      } catch (err) {
        console.warn('Error incrustando imagen en fila', r, err)
      }
    }

    // Col 3: MODELO
    const c3 = row.getCell(3)
    c3.value = item.modelo
    c3.font = { name: 'Century Gothic', size: 16, bold: true }
    c3.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c3.border = BORDER_THIN

    // Col 4: DESCRIPCION
    const c4 = row.getCell(4)
    c4.value = item.descripcion
    c4.font = { name: 'Century Gothic', size: 15 }
    c4.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c4.border = BORDER_THIN

    // Col 5: COMPOSICION
    const c5 = row.getCell(5)
    c5.value = item.composicion
    c5.font = { name: 'Century Gothic', size: 16 }
    c5.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c5.border = BORDER_THIN

    // Col 6: PIEZAS TOTALES (Fórmula = G{r} * H{r} o valor real consolidado)
    const c6 = row.getCell(6)
    const isStandardMultiplication = item.piezasTotales === item.totalCajas * item.piezasPorCaja
    c6.value = isStandardMultiplication
      ? { formula: `G${r}*H${r}`, result: item.piezasTotales }
      : item.piezasTotales
    c6.font = { name: 'Century Gothic', size: 16 }
    c6.alignment = { vertical: 'middle', horizontal: 'center' }
    c6.border = BORDER_THIN

    // Col 7: TOTAL DE CAJAS
    const c7 = row.getCell(7)
    c7.value = item.totalCajas
    c7.font = { name: 'Century Gothic', size: 16 }
    c7.alignment = { vertical: 'middle', horizontal: 'center' }
    c7.border = BORDER_THIN

    // Col 8: PIEZAS EN CAJA
    const c8 = row.getCell(8)
    c8.value = item.piezasPorCaja
    c8.font = { name: 'Century Gothic', size: 16 }
    c8.alignment = { vertical: 'middle', horizontal: 'center' }
    c8.border = BORDER_THIN

    // Col 9: PRECIO USD
    const c9 = row.getCell(9)
    c9.value = item.precioUsd
    c9.numFmt = NUM_FMT_MONEY
    c9.font = { name: 'Century Gothic', size: 16 }
    c9.alignment = { vertical: 'middle', horizontal: 'center' }
    c9.border = BORDER_THIN

    // Col 10: IMPORTE TOTAL (Fórmula = F{r} * I{r})
    const c10 = row.getCell(10)
    c10.value = {
      formula: `F${r}*I${r}`,
      result: item.importeTotal || Number(((item.piezasTotales || 0) * (item.precioUsd || 0)).toFixed(2)),
    }
    c10.numFmt = NUM_FMT_MONEY
    c10.font = { name: 'Century Gothic', size: 16 }
    c10.alignment = { vertical: 'middle', horizontal: 'center' }
    c10.border = BORDER_THIN

    // Col 11: CBM
    const c11 = row.getCell(11)
    c11.value = item.cbm
    c11.numFmt = '0.0000'
    c11.font = { name: 'Century Gothic', size: 16 }
    c11.alignment = { vertical: 'middle', horizontal: 'center' }
    c11.border = BORDER_THIN

    // Col 12, 13, 14: Bordes para extras
    for (let c = 12; c <= 14; c++) {
      const cell = row.getCell(c)
      cell.border = BORDER_THIN
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    }
  })

  // 7. Combinar celdas de Extras L, M, N
  if (items.length > 0) {
    if (items.length > 1) {
      sheet.mergeCells(`L${startRow}:L${endRow}`)
      sheet.mergeCells(`M${startRow}:M${endRow}`)
      sheet.mergeCells(`N${startRow}:N${endRow}`)
    }

    const cellL = sheet.getCell(`L${startRow}`)
    cellL.value = data.demoras || null
    cellL.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    const cellM = sheet.getCell(`M${startRow}`)
    cellM.value = data.almacenajes || null
    cellM.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    const cellN = sheet.getCell(`N${startRow}`)
    let fechaLlegada = data.fechaLlegadaAlmacen || data.fechaLlegadaReal || data.fechaEta || ''
    if (fechaLlegada) {
      try {
        const d = new Date(fechaLlegada)
        if (!isNaN(d.getTime())) {
          fechaLlegada = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
        }
      } catch {}
    }
    cellN.value = fechaLlegada || null
    cellN.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  }

  // 8. Fila de Totales (endRow + 1)
  const totalsRowIdx = endRow + 1
  const totalsRow = sheet.getRow(totalsRowIdx)
  totalsRow.height = 24

  const totalPzCalc = items.reduce((s, it) => s + (it.piezasTotales || it.totalCajas * it.piezasPorCaja), 0)
  const totalCajasCalc = items.reduce((s, it) => s + (it.totalCajas || 0), 0)
  const totalUsdCalc = items.reduce((s, it) => s + (it.importeTotal || 0), 0)

  const cTotPz = totalsRow.getCell(6)
  cTotPz.value = {
    formula: `SUM(F${startRow}:F${endRow})`,
    result: totalPzCalc,
  }
  cTotPz.font = { name: 'Century Gothic', size: 16, bold: true }
  cTotPz.alignment = { vertical: 'middle', horizontal: 'center' }

  const cTotCajas = totalsRow.getCell(7)
  cTotCajas.value = {
    formula: `SUM(G${startRow}:G${endRow})`,
    result: totalCajasCalc,
  }
  cTotCajas.font = { name: 'Century Gothic', size: 16, bold: true }
  cTotCajas.alignment = { vertical: 'middle', horizontal: 'center' }

  const cTotUsd = totalsRow.getCell(10)
  cTotUsd.value = {
    formula: `SUM(J${startRow}:J${endRow})`,
    result: totalUsdCalc,
  }
  cTotUsd.numFmt = NUM_FMT_MONEY
  cTotUsd.font = { name: 'Century Gothic', size: 16, bold: true }
  cTotUsd.alignment = { vertical: 'middle', horizontal: 'center' }

  // 9. Fila BALANCE y DIFERENCIA
  const balanceRowIdx = totalsRowIdx + 2
  const balanceRow = sheet.getRow(balanceRowIdx)
  balanceRow.height = 24

  const cellBalanceLbl = balanceRow.getCell(9)
  cellBalanceLbl.value = 'BALANCE'
  cellBalanceLbl.font = { name: 'Century Gothic', size: 16, bold: true }
  cellBalanceLbl.alignment = { vertical: 'middle', horizontal: 'center' }

  const cellBalanceVal = balanceRow.getCell(10)
  cellBalanceVal.value = data.balance || 0
  cellBalanceVal.numFmt = NUM_FMT_MONEY
  cellBalanceVal.font = { name: 'Century Gothic', size: 16, bold: true }
  cellBalanceVal.alignment = { vertical: 'middle', horizontal: 'center' }

  const diffRowIdx = balanceRowIdx + 1
  const diffRow = sheet.getRow(diffRowIdx)
  diffRow.height = 24

  const cellDiffLbl = diffRow.getCell(9)
  cellDiffLbl.value = 'DIFERENCIA'
  cellDiffLbl.font = { name: 'Century Gothic', size: 16, bold: true }
  cellDiffLbl.alignment = { vertical: 'middle', horizontal: 'center' }

  const cellDiffVal = diffRow.getCell(10)
  cellDiffVal.value = {
    formula: `(J${totalsRowIdx}-J${balanceRowIdx})`,
    result: totalUsdCalc - (data.balance || 0),
  }
  cellDiffVal.numFmt = NUM_FMT_MONEY
  cellDiffVal.font = { name: 'Century Gothic', size: 16, bold: true }
  cellDiffVal.alignment = { vertical: 'middle', horizontal: 'center' }

  // 10. Descargar archivo en el navegador
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const filename = `TABLA_${(data.numeroContenedor || data.codigoContenedor || 'CONTENEDOR').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}
