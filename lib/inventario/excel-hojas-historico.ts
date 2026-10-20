// lib/inventario/excel-hojas-historico.ts
/**
 * Hojas "Datos", "Movimientos" y "Resumen" del reporte histórico.
 * La hoja "Formato Impresión" vive en `excel-impresion-historico.ts`.
 */

import {
  COLOR,
  NUM_FMT,
  NUM_FMT_FIRMA,
  compareFamiliaAsc,
  compareSkuAsc,
  esFamiliaSinAsignar,
  num,
  type ColumnaExcel,
  type DatosExcelHistorico,
} from './excel-historico'

type WorkSheet = any

function estiloHeader(sheet: WorkSheet, fila: number, columnas: number, color = 'FF1E293B') {
  const row = sheet.getRow(fila)
  row.height = 28
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  for (let c = 1; c <= columnas; c++) {
    row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    row.getCell(c).border = {
      top: { style: 'thin', color: { argb: COLOR.bordeHeader } },
      bottom: { style: 'medium', color: { argb: COLOR.bordeFuerte } },
      left: { style: 'thin', color: { argb: COLOR.bordeHeader } },
      right: { style: 'thin', color: { argb: COLOR.bordeHeader } },
    }
  }
}

function bordeFino() {
  return {
    top: { style: 'thin', color: { argb: COLOR.bordeFino } },
    bottom: { style: 'thin', color: { argb: COLOR.bordeFino } },
    left: { style: 'thin', color: { argb: COLOR.bordeFino } },
    right: { style: 'thin', color: { argb: COLOR.bordeFino } },
  }
}

/** Hoja "Datos": una fila por producto × columna. */
export function construirHojaDatos(workbook: any, datos: DatosExcelHistorico): void {
  const sheet: WorkSheet = workbook.addWorksheet('Datos')
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }

  const columnas = [
    { header: 'FAMILIA', key: 'familia', width: 16 },
    { header: 'DESCRIPCIÓN GENERAL', key: 'descripcion', width: 38 },
    { header: 'SKU (ESTILO)', key: 'sku', width: 18 },
    { header: 'MARCA', key: 'marca', width: 16 },
    { header: 'BODEGA', key: 'bodega', width: 18 },
    { header: 'CIUDAD', key: 'ciudad', width: 15 },
    { header: 'CAJAS HOY', key: 'hoy', width: 12 },
    { header: 'AJUSTE AL CORTE', key: 'ajuste', width: 15 },
    { header: `CAJAS AL ${datos.fechaCorte}`, key: 'corte', width: 16 },
    { header: 'ENTRÓ POST.', key: 'entró', width: 13 },
    { header: 'SALIÓ POST.', key: 'salió', width: 13 },
    { header: 'NOTAS', key: 'notas', width: 9 },
  ]
  sheet.columns = columnas

  // Título del reporte (fila 1) y encabezado (fila 2)
  sheet.mergeCells(1, 1, 1, columnas.length)
  const titulo = sheet.getCell(1, 1)
  titulo.value = `STOCK HISTORICO AL ${datos.fechaCorte}  ·  ${datos.alcanceLabel}  ·  solo cajas`
  titulo.font = { bold: true, size: 12, color: { argb: COLOR.tituloFuente } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 24

  sheet.addRow([])
  sheet.addRow(columnas.map((c) => c.header))
  estiloHeader(sheet, 3, columnas.length)

  const filas = datos.filas.slice().sort((a, b) => {
    const fam = compareFamiliaAsc(a.familia || 'Sin Familia', b.familia || 'Sin Familia')
    if (fam !== 0) return fam
    const sku = compareSkuAsc(a.sku, b.sku)
    if (sku !== 0) return sku
    return a.bodega_id - b.bodega_id
  })

  filas.forEach((f, idx) => {
    const row = sheet.addRow({
      familia: f.familia ?? '',
      descripcion: f.descripcion_general || f.descripcion || '',
      sku: f.sku,
      marca: f.marca ?? '',
      bodega: f.bodega_nombre,
      ciudad: f.ciudad,
      hoy: num(f.cajas_hoy),
      ajuste: num(f.ajuste),
      corte: num(f.cajas_corte),
      'entró': num(f.entradas_posteriores),
      'salió': num(f.salidas_posteriores),
      notas: f.n_notas,
    })
    row.height = 18
    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.zebra } }
    }
    row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
      cell.border = bordeFino()
      cell.font = { size: 10 }
      cell.alignment = { vertical: 'middle' }
      if (col >= 7 && col <= 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.numFmt = col === 8 ? NUM_FMT_FIRMA : NUM_FMT
      }
    })
    // Ajuste con signo y celdas negativas en rojo
    const celAjuste = row.getCell(8)
    celAjuste.font = {
      size: 10,
      bold: f.ajuste !== 0,
      color: { argb: f.ajuste < 0 ? COLOR.negativo : f.ajuste > 0 ? 'FF15803D' : 'FF1E293B' },
    }
    const celCorte = row.getCell(9)
    celCorte.font = {
      size: 10,
      bold: true,
      color: { argb: f.valor_inconsistente ? COLOR.negativo : 'FF0F172A' },
    }
    const celEntró = row.getCell(10)
    celEntró.font = { size: 10, color: { argb: f.entradas_posteriores > 0 ? 'FF15803D' : 'FF1E293B' } }
    const celSalió = row.getCell(11)
    celSalió.font = { size: 10, color: { argb: f.salidas_posteriores > 0 ? COLOR.negativo : 'FF1E293B' } }
  })

  // Fila de totales
  const totalIdx = sheet.rowCount + 1
  const totalRow = sheet.getRow(totalIdx)
  totalRow.getCell(1).value = 'TOTALES'
  totalRow.getCell(1).font = { bold: true, size: 11 }
  totalRow.getCell(7).value = num(datos.totales.hoy)
  totalRow.getCell(8).value = num(datos.totales.ajuste)
  totalRow.getCell(9).value = num(datos.totales.historicas)
  totalRow.getCell(10).value = num(datos.totales.entradas)
  totalRow.getCell(11).value = num(datos.totales.salidas)
  totalRow.height = 22
  for (let c = 1; c <= columnas.length; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.total } }
    cell.border = {
      top: { style: 'medium', color: { argb: COLOR.bordeFuerte } },
      bottom: { style: 'double', color: { argb: COLOR.bordeFuerte } },
    }
    if (c >= 7 && c <= 11) {
      cell.alignment = { horizontal: 'right' }
      cell.numFmt = c === 8 ? NUM_FMT_FIRMA : NUM_FMT
    }
  }

  sheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }]
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: totalIdx - 1, column: columnas.length } }
}

/** Hoja "Movimientos": detalle de las notas CONF posteriores al corte, con saldo por columna. */
export function construirHojaMovimientos(workbook: any, datos: DatosExcelHistorico): void {
  const sheet: WorkSheet = workbook.addWorksheet('Movimientos')
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }

  const columnas = [
    { header: 'FECHA NOTA', key: 'fecha', width: 18 },
    { header: 'FECHA CONFIRMACIÓN', key: 'fecha_conf', width: 22 },
    { header: 'NOTA', key: 'nota', width: 18 },
    { header: 'TIPO', key: 'tipo', width: 9 },
    { header: 'ESTADO', key: 'estado', width: 10 },
    { header: datos.tipoColumna === 'ciudad' ? 'CIUDAD' : 'BODEGA', key: 'columna', width: 18 },
    { header: 'ORIGEN', key: 'origen', width: 18 },
    { header: 'DESTINO', key: 'destino', width: 18 },
    { header: 'PRODUCTO', key: 'sku', width: 18 },
    { header: 'DESCRIPCIÓN', key: 'descripcion', width: 34 },
    { header: 'CAJAS', key: 'cajas', width: 10 },
    { header: 'EFECTO', key: 'efecto', width: 11 },
    { header: 'SALDO', key: 'saldo', width: 11 },
  ]
  sheet.columns = columnas

  sheet.mergeCells(1, 1, 1, columnas.length)
  const titulo = sheet.getCell(1, 1)
  titulo.value = `MOVIMIENTOS CONF POSTERIORES AL ${datos.fechaCorte}  ·  ${datos.alcanceLabel}  ·  ${datos.movimientos.length} detalle(s)`
  titulo.font = { bold: true, size: 12, color: { argb: COLOR.tituloFuente } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 24

  sheet.addRow([])
  sheet.addRow(columnas.map((c) => c.header))
  estiloHeader(sheet, 3, columnas.length, 'FF92400E')

  // Metadata de producto (sku/descripción) desde las filas planas
  const metaProducto = new Map<number, { sku: string; descripcion: string }>()
  for (const f of datos.filas) {
    if (!metaProducto.has(f.producto_id)) {
      metaProducto.set(f.producto_id, {
        sku: f.sku,
        descripcion: f.descripcion_general || f.descripcion || '',
      })
    }
  }

  const nombreColumna = new Map<string, string>()
  for (const c of datos.columnas) nombreColumna.set(c.key, c.nombre)

  const saldos = new Map<string, number>()

  datos.movimientos.forEach((m, idx) => {
    // Columna afectada: destino (entrada) o origen (salida)
    const keyDestino = m.bodega_destino_id != null ? datos.bodegaAColumna[m.bodega_destino_id] : undefined
    const keyOrigen = datos.bodegaAColumna[m.bodega_origen_id]
    const esEntrada = keyDestino !== undefined && (m.efecto > 0 || keyOrigen === undefined)
    const key = esEntrada ? keyDestino : keyOrigen
    const columnaNombre = key ? (nombreColumna.get(key) ?? '') : ''

    const saldoKey = `${m.producto_id}|${key ?? ''}`
    const saldo = (saldos.get(saldoKey) ?? 0) + m.efecto
    saldos.set(saldoKey, saldo)

    const prod = metaProducto.get(m.producto_id)
    const row = sheet.addRow({
      fecha: m.fecha_nota,
      fecha_conf: m.fecha_confirmacion ?? '',
      nota: m.numero_nota,
      tipo: m.tipo_codigo,
      estado: m.estado_codigo,
      columna: columnaNombre,
      origen: m.bodega_origen_nombre,
      destino: m.bodega_destino_nombre ?? '',
      sku: prod?.sku ?? String(m.producto_id),
      descripcion: prod?.descripcion ?? '',
      cajas: num(m.cajas),
      efecto: num(m.efecto),
      saldo: num(saldo),
    })
    row.height = 18
    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.zebra } }
    }
    row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
      cell.border = bordeFino()
      cell.font = { size: 10 }
      if (col >= 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
        cell.numFmt = col === 12 ? NUM_FMT_FIRMA : NUM_FMT
      }
    })
    const celEfecto = row.getCell(12)
    celEfecto.font = {
      size: 10,
      bold: m.efecto !== 0,
      color: { argb: m.efecto < 0 ? COLOR.negativo : m.efecto > 0 ? 'FF15803D' : 'FF1E293B' },
    }
  })

  sheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 3 }]
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: sheet.rowCount, column: columnas.length } }
}

/** Hoja "Resumen": totales por bodega/ciudad + avisos de descuadre. */
export function construirHojaResumen(workbook: any, datos: DatosExcelHistorico): void {
  const sheet: WorkSheet = workbook.addWorksheet('Resumen')
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }

  const columnas = [
    { header: 'BODEGA', key: 'bodega', width: 26 },
    { header: 'CIUDAD', key: 'ciudad', width: 18 },
    { header: 'CAJAS HOY', key: 'hoy', width: 13 },
    { header: 'AJUSTE', key: 'ajuste', width: 12 },
    { header: `CAJAS AL ${datos.fechaCorte}`, key: 'corte', width: 18 },
    { header: 'ENTRÓ POST.', key: 'entró', width: 13 },
    { header: 'SALIÓ POST.', key: 'salió', width: 13 },
    { header: 'NETO MOV.', key: 'neto', width: 12 },
    { header: 'NOTAS', key: 'notas', width: 9 },
    { header: 'ESTADO', key: 'estado', width: 26 },
  ]
  sheet.columns = columnas

  sheet.mergeCells(1, 1, 1, columnas.length)
  const titulo = sheet.getCell(1, 1)
  titulo.value = `RESUMEN AL ${datos.fechaCorte}  ·  ${datos.alcanceLabel}`
  titulo.font = { bold: true, size: 12, color: { argb: COLOR.tituloFuente } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 24

  sheet.addRow([])
  sheet.addRow(columnas.map((c) => c.header))
  estiloHeader(sheet, 3, columnas.length)

  const ajustesDirecto = new Set(datos.ajustesDirectos.map((a) => a.bodega_nombre))

  const escribirFilas = (filas: typeof datos.porBodega) => {
    filas.forEach((r, idx) => {
      const row = sheet.addRow({
        bodega: r.bodega_nombre,
        ciudad: r.ciudad,
        hoy: num(r.hoy),
        ajuste: num(r.ajuste),
        corte: num(r.historico),
        'entró': num(r.entradas),
        'salió': num(r.salidas),
        neto: num(r.entradas - r.salidas),
        notas: r.n_notas,
        estado: ajustesDirecto.has(r.bodega_nombre) ? 'AJUSTE DIRECTO (aproximado)' : 'ok',
      })
      row.height = 18
      if (idx % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.zebra } }
      }
      row.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
        cell.border = bordeFino()
        cell.font = { size: 10 }
        if (col >= 3 && col <= 8) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
          cell.numFmt = col === 4 || col === 8 ? NUM_FMT_FIRMA : NUM_FMT
        }
      })
      const celEstado = row.getCell(10)
      if (ajustesDirecto.has(r.bodega_nombre)) {
        celEstado.font = { size: 10, bold: true, color: { argb: COLOR.movimientoOscuro } }
      }
    })
  }

  if (datos.porCiudad.length > 0 && datos.tipoColumna === 'ciudad') {
    escribirFilas(datos.porCiudad)
  } else {
    escribirFilas(datos.porBodega)
  }

  // Totales generales
  const totalIdx = sheet.rowCount + 1
  const totalRow = sheet.getRow(totalIdx)
  totalRow.getCell(1).value = 'TOTAL GENERAL'
  totalRow.getCell(3).value = num(datos.totales.hoy)
  totalRow.getCell(4).value = num(datos.totales.ajuste)
  totalRow.getCell(5).value = num(datos.totales.historicas)
  totalRow.getCell(6).value = num(datos.totales.entradas)
  totalRow.getCell(7).value = num(datos.totales.salidas)
  totalRow.getCell(8).value = num(datos.totales.entradas - datos.totales.salidas)
  totalRow.getCell(9).value = datos.notasRevertidas
  totalRow.height = 22
  for (let c = 1; c <= columnas.length; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.total } }
    cell.border = {
      top: { style: 'medium', color: { argb: COLOR.bordeFuerte } },
      bottom: { style: 'double', color: { argb: COLOR.bordeFuerte } },
    }
    if (c >= 3 && c <= 8) {
      cell.alignment = { horizontal: 'right' }
      cell.numFmt = c === 4 || c === 8 ? NUM_FMT_FIRMA : NUM_FMT
    }
  }

  // Avisos: descuadres y ajustes directos
  if (datos.descuadres.length > 0) {
    sheet.addRow([])
    const filaAviso = sheet.addRow([
      'AVISOS — el stock actual no cuadra con la suma de las notas activas:',
    ])
    filaAviso.getCell(1).font = { bold: true, size: 11, color: { argb: COLOR.movimientoOscuro } }
    sheet.addRow(['BODEGA', 'DIFERENCIA (CAJAS)', 'CLAVES', 'AJUSTE DIRECTO POSTERIOR AL CORTE'])
    estiloHeader(sheet, sheet.rowCount, 4, 'FF92400E')
    for (const d of datos.descuadres) {
      const row = sheet.addRow([d.bodega_nombre, num(d.dif), d.claves, d.tiene_ajuste_directo_post_corte ? 'SI' : 'NO'])
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.border = bordeFino()
        cell.font = { size: 10 }
      })
      row.getCell(2).numFmt = NUM_FMT_FIRMA
    }
  }

  if (datos.ajustesDirectos.length > 0) {
    sheet.addRow([])
    const filaAviso = sheet.addRow([
      'AJUSTES DIRECTOS en inventario_stock (fuera de notas) — el histórico es aproximado:',
    ])
    filaAviso.getCell(1).font = { bold: true, size: 11, color: { argb: COLOR.movimientoOscuro } }
    sheet.addRow(['BODEGA', 'FECHA', 'FILAS AFECTADAS', 'USUARIO'])
    estiloHeader(sheet, sheet.rowCount, 4, 'FF92400E')
    for (const a of datos.ajustesDirectos) {
      const row = sheet.addRow([a.bodega_nombre, a.fecha, a.filas_afectadas, a.usuario_id ?? ''])
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.border = bordeFino()
        cell.font = { size: 10 }
      })
    }
  }
}
