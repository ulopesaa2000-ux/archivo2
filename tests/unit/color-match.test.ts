// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\color-match.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildColorDraft,
  canonicalEn,
  cleanColorRaw,
  inferirCodigoHexTipo,
  resolveColor,
  stripChinese,
  suggestEs,
  type CatalogColor,
} from '@/lib/color-match'

// Catalogo simulado con convencion nombre_intern EN + nombre ES.
const CATALOGO: CatalogColor[] = [
  { id: 1, nombre: 'NEGRO', codigo: 'NEG', nombre_intern: 'BLACK' },
  { id: 2, nombre: 'BLANCO', codigo: 'BLA', nombre_intern: 'WHITE' },
  { id: 3, nombre: 'CAFÉ', codigo: 'CAF', nombre_intern: 'BROWN' },
  { id: 4, nombre: 'MORADO', codigo: 'MOR', nombre_intern: 'PURPLE' },
  { id: 5, nombre: 'VERDE', codigo: 'VER', nombre_intern: 'GREEN' },
  { id: 6, nombre: 'BEIGE', codigo: 'BEI', nombre_intern: 'BEIGE' },
  { id: 7, nombre: 'ROSA', codigo: 'ROS', nombre_intern: 'PINK' },
  { id: 8, nombre: 'MARINO', codigo: 'MAR', nombre_intern: 'NAVY' },
  { id: 9, nombre: 'DENIM', codigo: 'DEN', nombre_intern: 'DENIM' },
]

describe('color-match: limpieza', () => {
  it('quita caracteres chinos y conserva el resto', () => {
    expect(stripChinese('BLACK 黑色597')).toBe('BLACK 597')
    expect(stripChinese('  PURPURA  ')).toBe('Purpura'.toUpperCase())
  })

  it('cleanColorRaw normaliza a UPPER sin chinos', () => {
    expect(cleanColorRaw('café  ')).toBe('CAFÉ')
  })
})

describe('color-match: paleta 17-2026 contra catalogo', () => {
  it('matchea por nombre_intern ingles', () => {
    expect(resolveColor('PURPURA', CATALOGO)).toMatchObject({ found: true, id: 4, via: 'nombre_intern' })
    expect(resolveColor('COFFEE', CATALOGO)).toMatchObject({ found: true, id: 3 })
    expect(resolveColor('BLACK', CATALOGO)).toMatchObject({ found: true, id: 1 })
  })

  it('matchea espanol directo por nombre', () => {
    expect(resolveColor('CAFÉ', CATALOGO)).toMatchObject({ found: true, id: 3 })
    expect(resolveColor('BEIGE', CATALOGO)).toMatchObject({ found: true, id: 6 })
  })

  it('typos conocidos resuelven al canonico', () => {
    expect(canonicalEn('PURPUPA')).toBe('PURPLE')
    expect(resolveColor('PATROL', CATALOGO).found).toBe(false) // PETROL no esta en catalogo mock
  })

  it('compuestos requieren ambos lados', () => {
    expect(resolveColor('BLACK/STONE', CATALOGO).found).toBe(false)
    expect(resolveColor('NEGRO/BLANCO', CATALOGO).found).toBe(true)
  })

  it('variantes resuelven al canonico del catalogo', () => {
    expect(resolveColor('ROSE', CATALOGO)).toMatchObject({ found: true, id: 7 })
    expect(resolveColor('BEIGE 04', CATALOGO)).toMatchObject({ found: true, id: 6 })
  })

  it('cercanos matchean parcial (revisión ámbar en UI)', () => {
    expect(resolveColor('VERDE MILITARY', CATALOGO)).toMatchObject({ found: true, via: 'parcial' })
    expect(resolveColor('LT BEIGE', CATALOGO)).toMatchObject({ found: true, via: 'parcial' })
  })

  it('desconocidos no matchean (van al modal, no a Negro)', () => {
    for (const raw of ['DK WINE', 'PIEDRA', 'PETROL']) {
      expect(resolveColor(raw, CATALOGO).found).toBe(false)
    }
  })

  it('cadenas cortas no hacen parcial', () => {
    expect(resolveColor('RO', CATALOGO).found).toBe(false)
  })
})

describe('color-match: borrador de creacion', () => {
  it('prefilla ES/EN/codigo/hex/tipo', () => {
    const d = buildColorDraft('DK WINE', 'DARK WINE', 'Vino Tinto')
    expect(d).toMatchObject({ raw: 'DK WINE', nombre: 'VINO TINTO', nombre_intern: 'DARK WINE' })
    expect(d.codigo.length).toBeGreaterThanOrEqual(2)
    expect(d.tipo_color).toBe('SOLIDO')
  })

  it('compuesto sugiere DOBLE', () => {
    expect(inferirCodigoHexTipo('NEGRO/ROJO').tipo).toBe('DOBLE')
  })
})

describe('color-match: sugerencias ES', () => {
  it('traduce canonicos', () => {
    expect(suggestEs('PURPLE')).toBe('MORADO')
    expect(suggestEs('COFFEE')).toBe('CAFÉ')
    expect(suggestEs('LIGHT BEIGE')).toBe('BEIGE CLARO')
  })
})
