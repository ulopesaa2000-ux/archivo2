// lib/inventario/excel-historico.ts
/**
 * Constructor del Excel del Stock Histórico (puro, sin React).
 * Se carga con `dynamic import` porque exceljs es pesado (AGENTS.md 3.7.3).
 *
 * Hojas:
 *   1. "Stock a la fecha"    → una fila por producto × bodega
 *   2. "Movimientos revertidos" → notas CONF posteriores al corte que se deshacen
 *   3. "Resumen"             → por bodega y por ciudad (+ ajustes directos)
 * En modo kardex: "Movimientos" + "Resumen" de periodo.
 */

export type FilaExcelCorte = {
  producto_familia: string | null
  producto_sku: string
  producto_descripcion: string | null
  marca_nombre: string | null
  pz_en_caja: number | null
  bodega_nombre: string
  ciudad: string
  cajas_hoy: number
  ajuste: number
  cajas_historicas: number
  n_notas: number
  valor_inconsistente: boolean
}

export type MovimientoExcel = {
  fecha_nota: string
  fecha_confirmacion: string | null
  numero_nota: string
  tipo_codigo: string
  estado_codigo: string
  bodega_origen_nombre: string
  bodega_destino_nombre: string | null
  bodega_nombre: string
  producto_sku: string
  producto_descripcion: string | null
  cajas: number
  efecto: number
  saldo?: number
}

export type ResumenExcel = {
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  hoy: number
  ajuste: number
  historico: number
}

export type ResumenCiudadExcel = {
  ciudad: string
  hoy: number
  ajuste: number
  historico: number
}

export type AjusteDirectoExcel = {
  bodega_nombre: string
  fecha: string
  filas_afectadas: number
  usuario_id: number | null
}

export type DatosExcelCorte = {
  fechaCorte: string
  filas: FilaExcelCorte[]
  totales: { hoy: number; ajuste: number; historico: number }
  porBodega: ResumenExcel[]
  porCiudad: ResumenCiudadExcel[]
  ajustesDirectos: AjusteDirectoExcel[]
  movimientosRevertidos: MovimientoExcel[]
  notasRevertidas: number
}

export type DatosExcelKardex = {
  desde: string
  hasta: string
  filas: MovimientoExcel[]
  totales: { entradas: number; salidas: number; saldoInicial: number; saldoFinal: number }
  notasDistintas: number
  totalFilas: number
}

const AZUL = 'FF1E40AF'
const AZUL_OSCURO = 'FF1E3A8A'

function num(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function encabezado(sheet: any, titulo: string) {
  sheet.pageSetup.orientation = 'landscape'
  sheet.pageSetup.fitToPage = true
  sheet.pageSetup.fitToWidth = 1
  sheet.pageSetup.fitToHeight = 0
  const row = sheet.getRow(1)
  row.getCell(1).value = titulo
  row.getCell(1).font = { bold: true, size: 13, color: { argb: AZUL_OSCURO } }
  row.height = 22
}

function estiloCabecera(sheet: any, fila: number) {
  const row = sheet.getRow(fila)
  row.height = 28
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  row.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
    cell.border = { bottom: { style: 'medium', color: { argb: AZUL_OSCURO } } }
  })
}

/** Genera el .xlsx del corte (stock a la fecha). */
export async function construirExcelCorte(datos: DatosExcelCorte): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Idol Navy — Stock Histórico'
  wb.created = new Date()

  const d = datos

  // ── Hoja 1 ──
  const sheet = wb.addWorksheet('Stock a la fecha')
  encabezado(sheet, `Stock al cierre de ${d.fechaCorte} (cajas) — solo notas CONF/MODF activas`)
  sheet.addRow([])
  sheet.addRow([
    'FAMILIA', 'SKU', 'DESCRIPCIÓN', 'MARCA', 'PZ/CJA', 'BODEGA', 'CIUDAD',
    'CAJAS HOY', 'AJUSTE AL CORTE', `CAJAS AL ${d.fechaCorte}`, 'NOTAS', '⚠ INCONSISTENTE',
  ])
  estiloCabecera(sheet, 3)
  for (const f of d.filas) {
    sheet.addRow([
      f.producto_familia ?? '',
      f.producto_sku,
      f.producto_descripcion ?? '',
      f.marca_nombre ?? '',
      f.pz_en_caja ?? '',
      f.bodega_nombre,
      f.ciudad,
      num(f.cajas_hoy),
      num(f.ajuste),
      num(f.cajas_historicas),
      f.n_notas,
      f.valor_inconsistente ? 'SI' : '',
    ])
  }
  sheet.columns = [
    { width: 14 }, { width: 18 }, { width: 38 }, { width: 16 }, { width: 8 },
    { width: 20 }, { width: 16 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 8 }, { width: 14 },
  ]
  sheet.getColumn(8).numFmt = '#,##0.##'
  sheet.getColumn(9).numFmt = '+#,##0.##;-#,##0.##;0'
  sheet.getColumn(10).numFmt = '#,##0.##'
  sheet.getColumn(10).font = { bold: true }

  const totalRowIdx = sheet.rowCount + 1
  sheet.getRow(totalRowIdx).values = [
    '', '', 'TOTALES', '', '', '', '',
    num(d.totales.hoy), num(d.totales.ajuste), num(d.totales.historico), d.notasRevertidas, '',
  ]
  const tr = sheet.getRow(totalRowIdx)
  tr.font = { bold: true, size: 11 }
  tr.eachCell((cell: any) => {
    cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } }
  })
  sheet.getCell(totalRowIdx, 8).numFmt = '#,##0.##'
  sheet.getCell(totalRowIdx, 9).numFmt = '+#,##0.##;-#,##0.##;0'
  sheet.getCell(totalRowIdx, 10).numFmt = '#,##0.##'

  // ── Hoja 2 ──
  const ms = wb.addWorksheet('Movimientos revertidos')
  encabezado(ms, `Movimientos CONF posteriores al ${d.fechaCorte} que se revierten para llegar al corte`)
  ms.addRow([])
  ms.addRow([
    'FECHA NOTA', 'FECHA CONFIRMACIÓN', 'NOTA', 'TIPO', 'ESTADO', 'ORIGEN', 'DESTINO',
    'PRODUCTO', 'DESCRIPCIÓN', 'CAJAS', 'EFECTO EN BODEGA',
  ])
  estiloCabecera(ms, 3)
  for (const m of d.movimientosRevertidos) {
    ms.addRow([
      m.fecha_nota,
      m.fecha_confirmacion ?? '',
      m.numero_nota,
      m.tipo_codigo,
      m.estado_codigo,
      m.bodega_origen_nombre,
      m.bodega_destino_nombre ?? '',
      m.producto_sku,
      m.producto_descripcion ?? '',
      num(m.cajas),
      num(m.efecto),
    ])
  }
  ms.columns = [
    { width: 20 }, { width: 22 }, { width: 18 }, { width: 8 }, { width: 10 },
    { width: 20 }, { width: 20 }, { width: 18 }, { width: 34 }, { width: 10 }, { width: 16 },
  ]
  ms.getColumn(10).numFmt = '#,##0.##'
  ms.getColumn(11).numFmt = '+#,##0.##;-#,##0.##;0'

  // ── Hoja 3 ──
  const rs = wb.addWorksheet('Resumen')
  encabezado(rs, `Resumen por bodega y ciudad al ${d.fechaCorte}`)
  rs.addRow([])
  rs.addRow(['BODEGA', 'CIUDAD', 'CAJAS HOY', 'AJUSTE', `CAJAS AL ${d.fechaCorte}`, 'DIFERENCIA', 'ESTADO'])
  estiloCabecera(rs, 3)
  const conAjuste = new Set(d.ajustesDirectos.map((a) => a.bodega_nombre))
  for (const b of d.porBodega) {
    rs.addRow([
      b.bodega_nombre, b.ciudad, num(b.hoy), num(b.ajuste), num(b.historico),
      num(b.historico - b.hoy),
      conAjuste.has(b.bodega_nombre) ? 'AJUSTE DIRECTO (aproximado)' : 'ok',
    ])
  }
  rs.addRow([])
  rs.addRow(['CIUDAD', '', 'CAJAS HOY', 'AJUSTE', `CAJAS AL ${d.fechaCorte}`, 'DIFERENCIA', ''])
  estiloCabecera(rs, rs.rowCount)
  for (const c of d.porCiudad) {
    rs.addRow([c.ciudad, '', num(c.hoy), num(c.ajuste), num(c.historico), num(c.historico - c.hoy), ''])
  }
  rs.columns = [
    { width: 26 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 28 },
  ]
  rs.getColumn(3).numFmt = '#,##0.##'
  rs.getColumn(4).numFmt = '+#,##0.##;-#,##0.##;0'
  rs.getColumn(5).numFmt = '#,##0.##'
  rs.getColumn(6).numFmt = '+#,##0.##;-#,##0.##;0'

  if (d.ajustesDirectos.length > 0) {
    rs.addRow([])
    rs.addRow(['AJUSTES DIRECTOS (fuera de notas): el histórico de estas bodegas es aproximado'])
    rs.getRow(rs.rowCount).font = { bold: true, color: { argb: 'FFB06000' } }
    rs.addRow(['BODEGA', 'FECHA', 'FILAS AFECTADAS', 'USUARIO'])
    estiloCabecera(rs, rs.rowCount)
    for (const a of d.ajustesDirectos) {
      rs.addRow([a.bodega_nombre, a.fecha, a.filas_afectadas, a.usuario_id ?? ''])
    }
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

/** Genera el .xlsx del kardex (movimientos del periodo). */
export async function construirExcelKardex(datos: DatosExcelKardex): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Idol Navy — Stock Histórico'
  wb.created = new Date()

  const k = datos
  const sheet = wb.addWorksheet('Movimientos')
  encabezado(sheet, `Movimientos confirmados del ${k.desde} al ${k.hasta} (cajas)`)
  sheet.addRow([])
  sheet.addRow([
    'FECHA NOTA', 'FECHA CONFIRMACIÓN', 'NOTA', 'TIPO', 'ESTADO', 'ORIGEN', 'DESTINO',
    'BODEGA', 'PRODUCTO', 'DESCRIPCIÓN', 'CAJAS', 'EFECTO', 'SALDO',
  ])
  estiloCabecera(sheet, 3)
  for (const f of k.filas) {
    sheet.addRow([
      f.fecha_nota,
      f.fecha_confirmacion ?? '',
      f.numero_nota,
      f.tipo_codigo,
      f.estado_codigo,
      f.bodega_origen_nombre,
      f.bodega_destino_nombre ?? '',
      f.bodega_nombre,
      f.producto_sku,
      f.producto_descripcion ?? '',
      num(f.cajas),
      num(f.efecto),
      num(f.saldo ?? 0),
    ])
  }
  sheet.columns = [
    { width: 20 }, { width: 22 }, { width: 18 }, { width: 8 }, { width: 10 },
    { width: 20 }, { width: 20 }, { width: 20 }, { width: 18 }, { width: 32 },
    { width: 10 }, { width: 12 }, { width: 12 },
  ]
  sheet.getColumn(11).numFmt = '#,##0.##'
  sheet.getColumn(12).numFmt = '+#,##0.##;-#,##0.##;0'
  sheet.getColumn(13).numFmt = '#,##0.##'

  const rs = wb.addWorksheet('Resumen')
  encabezado(rs, `Resumen del periodo ${k.desde} — ${k.hasta}`)
  rs.addRow([])
  rs.addRow(['SALDO INICIAL', 'ENTRADAS', 'SALIDAS', 'SALDO FINAL', 'NOTAS', 'MOVIMIENTOS'])
  estiloCabecera(rs, 3)
  rs.addRow([
    num(k.totales.saldoInicial),
    num(k.totales.entradas),
    num(k.totales.salidas),
    num(k.totales.saldoFinal),
    k.notasDistintas,
    k.totalFilas,
  ])
  rs.columns = [{ width: 18 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 16 }]

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}
