// lib/inventario/reset-stock.ts
/**
 * Reglas puras del reinicio operativo de stock.
 *
 * La unidad oficial de stock es CAJAS (AGENTS.md 3.1.3). El cierre de una
 * bodega descuenta únicamente cajas mediante una nota AJU; las piezas sueltas
 * legacy no se envían (el detalle exige `piezas_sueltas >= 0`) ni bloquean la
 * verificación.
 */

export type FilaCajasParaCierre = {
  cajas: number
  caja_id: number | null
}

/** ¿La fila debe entrar al cierre de cajas? */
export function esFilaCajasNoCero(row: Pick<FilaCajasParaCierre, 'cajas'>): boolean {
  return Number(row.cajas) !== 0
}

/**
 * Payload de `sp_agregar_producto_nota` para cerrar una fila.
 *
 * Devuelve `null` si la fila no tiene cajas que cerrar: el RPC rechaza una
 * línea con cajas = 0 y piezas = 0, y las piezas no forman parte del cierre.
 */
export function payloadCierreCajas(row: FilaCajasParaCierre): {
  p_cajas: number
  p_piezas_sueltas: 0
  p_caja_id?: number
} | null {
  const cajas = Number(row.cajas)
  if (cajas === 0) return null

  return {
    p_cajas: -cajas,
    p_piezas_sueltas: 0,
    ...(row.caja_id != null ? { p_caja_id: row.caja_id } : {}),
  }
}
