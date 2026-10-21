// lib/inventario/excel-reporte-historico.ts
/**
 * Orquestador del Excel del Stock Histórico.
 *
 * Un solo archivo con 4 hojas:
 *   1. "Formato Impresión" → formato del inventario global de Stock, con UNA columna
 *      por bodega y el stock YA revertido a la fecha de corte (referencia visual).
 *   2. "Datos"             → una fila por producto × columna (like "Datos Stock" +
 *      fecha de corte + movements).
 *   3. "Movimientos"       → detalle de las notas CONF posteriores al corte.
 *   4. "Resumen"           → totales por bodega/ciudad + avisos de descuadre.
 */

import { construirHojaImpresion } from './excel-impresion-historico'
import { construirHojaDatos, construirHojaMovimientos, construirHojaResumen } from './excel-hojas-historico'
import type { DatosExcelHistorico } from './excel-historico'

export async function construirReporteHistorico(
  datos: DatosExcelHistorico,
  opciones: { conMovimientosEnImpresion?: boolean } = {}
): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Idol Navy — Stock Histórico'
  wb.created = new Date()

  // Hoja de impresión: 1 columna por bodega (formato del inventario global de Stock).
  if (datos.columnas.length > 0 && datos.filas.length > 0) {
    construirHojaImpresion(wb, datos, { conMovimientos: opciones.conMovimientosEnImpresion === true })
  }

  // Se omiten las hojas sin contenido (p. ej. el reporte de movimientos no tiene datos planos).
  if (datos.filas.length > 0) construirHojaDatos(wb, datos)
  if (datos.movimientos.length > 0) construirHojaMovimientos(wb, datos)
  if (datos.porBodega.length > 0 || datos.porCiudad.length > 0) construirHojaResumen(wb, datos)

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}
