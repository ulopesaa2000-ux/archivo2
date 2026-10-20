// lib/inventario/excel-historico.ts
/**
 * Builder del Excel del Stock Histórico (puro, sin React).
 * Se carga con `dynamic import` porque exceljs es pesado (AGENTS.md 3.7.3).
 *
 * Hojas:
 *   1. "Formato Impresión" → matriz agrupada, calcada del reporte global de Stock,
 *      con el par AL CORTE | MOVIMIENTOS por columna (solo vista agrupada).
 *   2. "Datos"             → una fila por producto × columna.
 *   3. "Movimientos"       → detalle de las notas CONF posteriores al corte, con el
 *                            saldo acumulado por producto × columna.
 *   4. "Resumen"           → totales por bodega/ciudad + avisos de descuadre.
 *
 * Todo en CAJAS (el modelo ignora piezas sueltas).
 */

export type TipoColumnaExcel = 'bodega' | 'ciudad'

export type ColumnaExcel = {
  key: string
  tipo: TipoColumnaExcel
  id: number | string
  nombre: string
  ciudad: string | null
}

export type FilaExcel = {
  producto_id: number
  bodega_id: number
  familia: string | null
  sku: string
  descripcion: string | null
  descripcion_general: string | null
  marca: string | null
  pz_en_caja: number | null
  bodega_nombre: string
  ciudad: string
  cajas_hoy: number
  ajuste: number
  cajas_corte: number
  entradas_posteriores: number
  salidas_posteriores: number
  n_notas: number
  valor_inconsistente: boolean
}

export type MovimientoExcel = {
  fecha_nota: string
  fecha_confirmacion: string | null
  numero_nota: string
  tipo_codigo: string
  estado_codigo: string
  bodega_origen_id: number
  bodega_origen_nombre: string
  bodega_destino_id: number | null
  bodega_destino_nombre: string | null
  producto_id: number
  cajas: number
  /** Efecto firmado sobre la bodega afectada (+ entra / − sale). */
  efecto: number
}

export type ResumenExcel = {
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  hoy: number
  ajuste: number
  historico: number
  entradas: number
  salidas: number
  n_notas: number
}

export type DescuadreExcel = {
  bodega_nombre: string
  dif: number
  claves: number
  tiene_ajuste_directo_post_corte: boolean
}

export type AjusteDirectoExcel = {
  bodega_nombre: string
  fecha: string
  filas_afectadas: number
  usuario_id: number | null
}

export type DatosExcelHistorico = {
  modo: 'individual' | 'agrupado'
  fechaCorte: string
  alcanceLabel: string
  /** Etiqueta del tipo de columna: "BODEGA" o "CIUDAD". */
  tipoColumna: TipoColumnaExcel
  columnas: ColumnaExcel[]
  /** bodega_id → key de columna (para ubicar cada movimiento). */
  bodegaAColumna: Record<number, string>
  filas: FilaExcel[]
  totales: { hoy: number; ajuste: number; historicas: number; entradas: number; salidas: number }
  porBodega: ResumenExcel[]
  porCiudad: ResumenExcel[]
  movimientos: MovimientoExcel[]
  ajustesDirectos: AjusteDirectoExcel[]
  descuadres: DescuadreExcel[]
  notasRevertidas: number
  negativos: number
  /** Descripciones canónicas por familia (como en el reporte de Stock). */
  descripcionesCanonicas: Record<string, string>
}

export function num(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function formatearNumero(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

/** Igual que en el reporte de Stock: F000-000C / Sin Familia al final y sin combinar. */
export function esFamiliaSinAsignar(familia: string | null | undefined): boolean {
  if (!familia) return true
  const n = familia.trim().toUpperCase()
  return (
    n === 'F000-000C' ||
    n === 'F000-000' ||
    n === 'SIN FAMILIA' ||
    n === 'SIN FAMILIA' ||
    n === 'SIN ASIGNAR' ||
    n === 'SIN CLASIFICAR' ||
    n === '—' ||
    n === '-' ||
    n === 'NULL' ||
    n === 'UNDEFINED'
  )
}

/** Orden canónico de familias (A→Z, F000-000C al final). */
export function compareFamiliaAsc(a: string, b: string): number {
  if (esFamiliaSinAsignar(a) && !esFamiliaSinAsignar(b)) return 1
  if (!esFamiliaSinAsignar(a) && esFamiliaSinAsignar(b)) return -1
  return a.localeCompare(b, 'es', { sensitivity: 'base' })
}

export function compareSkuAsc(a: string | null | undefined, b: string | null | undefined): number {
  return (a || '').localeCompare(b || '', 'es', { sensitivity: 'base' })
}

// ── Paleta (misma del reporte global de Stock) ──────────────────────────────
export const COLOR = {
  titulo: 'FFFFFDF5',
  tituloFuente: 'FF0F172A',
  descripcion: 'FFB4C6E7',
  estilo: 'FFF1F5F9',
  columna: 'FFDDEBF7',
  global: 'FFFEE2E2',
  globalFuente: 'FFDC2626',
  familia: 'FFDDEBF7',
  familiaFuente: 'FF1E40AF',
  movimiento: 'FFFDE68A',
  movimientoOscuro: 'FF92400E',
  corte: 'FFE2E8F0',
  total: 'FFF1F5F9',
  totalFuente: 'FF0F172A',
  zebra: 'FFF9FAFB',
  blanco: 'FFFFFFFF',
  vacio: 'FFD1D5DB',
  negativo: 'FFDC2626',
  bordeFino: 'FFE2E8F0',
  bordeHeader: 'FF94A3B8',
  bordeFuerte: 'FF475569',
} as const

export const NUM_FMT = '#,##0.##'
export const NUM_FMT_FIRMA = '+#,##0.##;-#,##0.##;0'
