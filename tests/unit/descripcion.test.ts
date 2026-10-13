// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\descripcion.test.ts
import { describe, expect, it } from 'vitest'
import { aMayusculasDescripcion } from '@/lib/descripcion'

describe('aMayusculasDescripcion (fase mayúsculas)', () => {
  it('pasa a mayúsculas con trim', () => {
    expect(aMayusculasDescripcion('  Playera dama  ')).toBe('PLAYERA DAMA')
  })

  it('vacio/nulo → cadena vacía (DB mapea a null)', () => {
    expect(aMayusculasDescripcion('')).toBe('')
    expect(aMayusculasDescripcion('   ')).toBe('')
    expect(aMayusculasDescripcion(null)).toBe('')
    expect(aMayusculasDescripcion(undefined)).toBe('')
  })

  it('conserva números y acentos en mayúsculas', () => {
    expect(aMayusculasDescripcion('mezclilla 2026')).toBe('MEZCLILLA 2026')
  })
})
