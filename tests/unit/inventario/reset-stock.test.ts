// tests/unit/inventario/reset-stock.test.ts
import { describe, expect, it } from 'vitest'
import {
  esFilaCajasNoCero,
  payloadCierreCajas,
} from '@/lib/inventario/reset-stock'

describe('reset-stock', () => {
  describe('esFilaCajasNoCero', () => {
    it('acepta cajas positivas, negativas y fraccionarias', () => {
      expect(esFilaCajasNoCero({ cajas: 1 })).toBe(true)
      expect(esFilaCajasNoCero({ cajas: -1 })).toBe(true)
      expect(esFilaCajasNoCero({ cajas: 1.5 })).toBe(true)
    })

    it('ignora cajas en cero aunque la fila tenga piezas legacy', () => {
      // El helper solo recibe cajas; una fila con cajas=0 no entra al cierre.
      expect(esFilaCajasNoCero({ cajas: 0 })).toBe(false)
    })
  })

  describe('payloadCierreCajas', () => {
    it('devuelve null cuando no hay cajas que cerrar', () => {
      expect(payloadCierreCajas({ cajas: 0, caja_id: null })).toBeNull()
    })

    it('descuenta cajas y fuerza piezas en 0', () => {
      expect(payloadCierreCajas({ cajas: 3, caja_id: null })).toEqual({
        p_cajas: -3,
        p_piezas_sueltas: 0,
      })
    })

    it('conserva cajas fraccionarias', () => {
      expect(payloadCierreCajas({ cajas: 1.5, caja_id: null })).toEqual({
        p_cajas: -1.5,
        p_piezas_sueltas: 0,
      })
    })

    it('incluye p_caja_id cuando la fila lo tiene', () => {
      expect(payloadCierreCajas({ cajas: 2, caja_id: 7 })).toEqual({
        p_cajas: -2,
        p_piezas_sueltas: 0,
        p_caja_id: 7,
      })
    })

    it('nunca devuelve piezas negativas', () => {
      const payload = payloadCierreCajas({ cajas: 5, caja_id: null })
      expect(payload?.p_piezas_sueltas).toBe(0)
      expect(payload?.p_piezas_sueltas).toBeGreaterThanOrEqual(0)
    })
  })
})
