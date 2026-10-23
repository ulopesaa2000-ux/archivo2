// lib/inventario/folio-nota.ts

/**
 * Mapeo oficial de códigos de tipo de movimiento a prefijos de folio confirmado.
 * - ENT (Entrada) -> EM (Entrada Mercancía)
 * - SAL (Salida) -> SM (Salida Mercancía)
 * - TRF (Traspaso / Transferencia) -> TR (Traslado)
 * - DEV (Devolución) -> DM (Devolución Mercancía)
 * - AJU (Ajuste) -> AJ (Ajuste)
 */
export const PREFIJO_FOLIO_CONFIRMADO: Record<string, string> = {
  ENT: 'EM',
  SAL: 'SM',
  TRF: 'TR',
  DEV: 'DM',
  AJU: 'AJ',
}

export const NOMBRE_TIPO_PREFIJO: Record<string, string> = {
  EM: 'Entrada Mercancía',
  SM: 'Salida Mercancía',
  TR: 'Traslado',
  DM: 'Devolución Mercancía',
  AJ: 'Ajuste',
}

/**
 * Calcula el folio definitivo de una nota al momento de ser confirmada.
 * Si la nota inicia con "N-", reemplaza ese prefijo provisional por el prefijo
 * oficial correspondiente a su tipo de movimiento (EM-, SM-, TR-, DM-, AJ-).
 *
 * Si la nota no inicia con "N-" o no se reconoce el tipo, preserva el folio actual.
 */
export function calcularFolioConfirmado(
  numeroNota?: string | null,
  tipoCodigo?: string | null
): string {
  if (!numeroNota) return ''
  if (!tipoCodigo) return numeroNota

  const prefijo = PREFIJO_FOLIO_CONFIRMADO[tipoCodigo.toUpperCase()]
  if (!prefijo) return numeroNota

  if (numeroNota.startsWith('N-')) {
    return `${prefijo}-${numeroNota.slice(2)}`
  }

  return numeroNota
}

export type InfoCambioFolio = {
  folioActual: string
  folioNuevo: string
  prefijo: string | null
  nombreTipo: string | null
  cambiara: boolean
}

/**
 * Provee la información para mostrar avisos en la UI previa confirmación
 * indicando si el folio cambiará de N-... a EM-... / SM-... / etc.
 */
export function obtenerInfoCambioFolio(
  numeroNota?: string | null,
  tipoCodigo?: string | null
): InfoCambioFolio {
  const actual = numeroNota || ''
  const nuevo = calcularFolioConfirmado(actual, tipoCodigo)
  const prefijo = tipoCodigo ? PREFIJO_FOLIO_CONFIRMADO[tipoCodigo.toUpperCase()] || null : null
  const nombreTipo = prefijo ? NOMBRE_TIPO_PREFIJO[prefijo] || null : null

  return {
    folioActual: actual,
    folioNuevo: nuevo,
    prefijo,
    nombreTipo,
    cambiara: Boolean(actual && nuevo && actual !== nuevo),
  }
}
