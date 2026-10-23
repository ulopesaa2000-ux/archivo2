// tests/unit/inventario/folio-nota.test.ts
import { describe, it, expect } from 'vitest'
import {
  calcularFolioConfirmado,
  obtenerInfoCambioFolio,
  PREFIJO_FOLIO_CONFIRMADO,
} from '@/lib/inventario/folio-nota'

describe('Folio de notas de inventario al confirmar', () => {
  it('reemplaza el prefijo N- por EM- en notas de Entrada (ENT)', () => {
    expect(calcularFolioConfirmado('N-20260304-0001', 'ENT')).toBe('EM-20260304-0001')
  })

  it('reemplaza el prefijo N- por SM- en notas de Salida (SAL)', () => {
    expect(calcularFolioConfirmado('N-20260304-0042', 'SAL')).toBe('SM-20260304-0042')
  })

  it('reemplaza el prefijo N- por TR- en notas de Traslado / Traspaso (TRF)', () => {
    expect(calcularFolioConfirmado('N-20261023-0100', 'TRF')).toBe('TR-20261023-0100')
  })

  it('reemplaza el prefijo N- por DM- en notas de Devolución (DEV)', () => {
    expect(calcularFolioConfirmado('N-20261023-0999', 'DEV')).toBe('DM-20261023-0999')
  })

  it('reemplaza el prefijo N- por AJ- en notas de Ajuste (AJU)', () => {
    expect(calcularFolioConfirmado('N-20261023-0555', 'AJU')).toBe('AJ-20261023-0555')
  })

  it('soporta tipoCodigo en minúsculas', () => {
    expect(calcularFolioConfirmado('N-20260304-0001', 'ent')).toBe('EM-20260304-0001')
  })

  it('no modifica folios que ya tienen prefijo confirmado', () => {
    expect(calcularFolioConfirmado('EM-20260304-0001', 'ENT')).toBe('EM-20260304-0001')
    expect(calcularFolioConfirmado('SM-20260304-0001', 'SAL')).toBe('SM-20260304-0001')
  })

  it('no altera folios que no comienzan con N-', () => {
    expect(calcularFolioConfirmado('CUSTOM-001', 'ENT')).toBe('CUSTOM-001')
  })

  it('retorna información completa de cambio de folio para la UI', () => {
    const info = obtenerInfoCambioFolio('N-20260304-0005', 'ENT')
    expect(info.cambiara).toBe(true)
    expect(info.folioActual).toBe('N-20260304-0005')
    expect(info.folioNuevo).toBe('EM-20260304-0005')
    expect(info.prefijo).toBe('EM')
    expect(info.nombreTipo).toBe('Entrada Mercancía')
  })

  it('indica cambiara = false si ya coincide o no empieza con N-', () => {
    const info = obtenerInfoCambioFolio('EM-20260304-0005', 'ENT')
    expect(info.cambiara).toBe(false)
    expect(info.folioNuevo).toBe('EM-20260304-0005')
  })
})
