// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\talla-match.test.ts
import { describe, expect, it } from 'vitest'
import { standardizeTallaCode } from '@/lib/talla-match'

describe('standardizeTallaCode (fuente unica)', () => {
  it('mapea US/ES a MX historico', () => {
    expect(standardizeTallaCode('S')).toBe('CH')
    expect(standardizeTallaCode('L')).toBe('G')
    expect(standardizeTallaCode('XL')).toBe('EG')
    expect(standardizeTallaCode('XXL')).toBe('2EG')
    expect(standardizeTallaCode('CH')).toBe('CH')
    expect(standardizeTallaCode('M')).toBe('M')
    expect(standardizeTallaCode('OS')).toBe('UNITALLA')
    expect(standardizeTallaCode('ONE SIZE')).toBe('UNITALLA')
  })

  it('mapea tallas dobles', () => {
    expect(standardizeTallaCode('S/M')).toBe('CH-M')
    expect(standardizeTallaCode('M/L')).toBe('M-G')
    expect(standardizeTallaCode('L/XL')).toBe('G-EG')
    expect(standardizeTallaCode('XL/XXL')).toBe('EG-2EG')
  })

  it('fallback conserva el trim upper', () => {
    expect(standardizeTallaCode('  10 ')).toBe('10')
    expect(standardizeTallaCode('FOO')).toBe('FOO')
    expect(standardizeTallaCode('')).toBe('')
  })
})
