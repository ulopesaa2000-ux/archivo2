// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\color-match.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildColorDraft,
  canonicalEn,
  claveColor,
  cleanColorRaw,
  dedupPorClave,
  filtrarColoresCatalogo,
  inferirCodigoHexTipo,
  resolveColor,
  separarModificador,
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

describe('color-match: modificadores claro/oscuro (LT/DK genericos)', () => {
  it('separa prefijos EN con y sin punto', () => {
    expect(separarModificador('LT BLUE')).toEqual({ mod: 'LIGHT', base: 'BLUE' })
    expect(separarModificador('dk grey')).toEqual({ mod: 'DARK', base: 'GREY' })
    expect(separarModificador('D.BLUE')).toEqual({ mod: 'DARK', base: 'BLUE' })
    expect(separarModificador('L.GREY')).toEqual({ mod: 'LIGHT', base: 'GREY' })
    expect(separarModificador('LIGHT PINK')).toEqual({ mod: 'LIGHT', base: 'PINK' })
    // Sin comerse palabras que empiezan con D/L
    expect(separarModificador('DENIM')).toEqual({ mod: null, base: 'DENIM' })
    expect(separarModificador('LIGHT')).toEqual({ mod: null, base: 'LIGHT' })
  })

  it('separa sufijos ES claro/oscuro (con y sin B)', () => {
    expect(separarModificador('AZUL CLARO')).toEqual({ mod: 'LIGHT', base: 'AZUL' })
    expect(separarModificador('verde obscuro')).toEqual({ mod: 'DARK', base: 'VERDE' })
    expect(separarModificador('ROSA CLARA')).toEqual({ mod: 'LIGHT', base: 'ROSA' })
    expect(separarModificador('GRIS OSCURA')).toEqual({ mod: 'DARK', base: 'GRIS' })
  })

  it('compone canonico EN y ES', () => {
    expect(canonicalEn('LT BLUE')).toBe('LIGHT BLUE')
    expect(canonicalEn('DK GREY')).toBe('DARK GREY')
    expect(canonicalEn('D.BLUE')).toBe('DARK BLUE')
    expect(canonicalEn('AZUL CLARO')).toBe('LIGHT BLUE')
    expect(canonicalEn('VERDE OBSCURO')).toBe('DARK GREEN')
    expect(suggestEs('LIGHT BLUE')).toBe('AZUL CLARO')
    expect(suggestEs('DARK GREY')).toBe('GRIS OSCURO')
    expect(suggestEs('AZUL CLARO')).toBe('AZUL CLARO')
    expect(suggestEs('ROSA CLARO')).toBe('ROSA CLARO')
  })

  it('combos fijos historicos no cambian', () => {
    expect(canonicalEn('LT BEIGE')).toBe('LIGHT BEIGE')
    expect(canonicalEn('DK WINE')).toBe('DARK WINE')
    expect(canonicalEn('D.BEIGE')).toBe('DARK BEIGE')
    expect(suggestEs('LIGHT BEIGE')).toBe('BEIGE CLARO')
  })

  it('resuelve contra catalogo con claro/oscuro', () => {
    const cat: CatalogColor[] = [
      ...CATALOGO,
      { id: 10, nombre: 'AZUL CLARO', codigo: 'AZC', nombre_intern: 'LIGHT BLUE' },
      { id: 11, nombre: 'GRIS OSCURO', codigo: 'GRO', nombre_intern: 'DARK GREY' },
    ]
    expect(resolveColor('lt blue', cat)).toMatchObject({ found: true, id: 10 })
    expect(resolveColor('Lt Blue', cat)).toMatchObject({ found: true, id: 10 })
    expect(resolveColor('AZUL  CLARO', cat)).toMatchObject({ found: true, id: 10 })
    expect(resolveColor('LIGHT BLUE', cat)).toMatchObject({ found: true, id: 10 })
    expect(resolveColor('DK GREY', cat)).toMatchObject({ found: true, id: 11 })
    expect(resolveColor('D.GREY', cat)).toMatchObject({ found: true, id: 11 })
  })
})

describe('color-match: dedup insensible (claveColor)', () => {
  it('cafe claro == CAFE CLARO == Café con doble espacio', () => {
    expect(claveColor('Cafe Claro')).toBe(claveColor('CAFE CLARO'))
    expect(claveColor('CAFE CLARO')).toBe(claveColor('Café  Claro'))
    expect(claveColor('Lt Beige')).toBe(claveColor('LT BEIGE'))
  })

  it('dedupPorClave conserva el primer texto', () => {
    expect(dedupPorClave(['Cafe Claro', 'CAFE CLARO', 'NEGRO', 'negro', ''])).toEqual(['Cafe Claro', 'NEGRO'])
  })
})

describe('color-match: buscador de catalogo', () => {
  const cat: CatalogColor[] = [
    ...CATALOGO,
    { id: 10, nombre: 'AZUL CLARO', codigo: 'AZC', nombre_intern: 'LIGHT BLUE' },
    { id: 11, nombre: 'AZUL MARINO', codigo: 'AZM', nombre_intern: 'DARK BLUE' },
  ]

  it('encuentra sin importar acentos ni case', () => {
    expect(filtrarColoresCatalogo(cat, 'cafe').map((c) => c.id)).toContain(3)
    expect(filtrarColoresCatalogo(cat, 'AZUL claro').map((c) => c.id)).toContain(10)
    expect(filtrarColoresCatalogo(cat, 'marino').map((c) => c.id)).toContain(11)
  })

  it('todos los tokens deben aparecer', () => {
    const ids = filtrarColoresCatalogo(cat, 'azul claro').map((c) => c.id)
    expect(ids).toContain(10)
    expect(ids).not.toContain(11)
  })

  it('sin query devuelve los primeros N', () => {
    expect(filtrarColoresCatalogo(cat, '', 5)).toHaveLength(5)
    expect(filtrarColoresCatalogo(cat, 'zzz')).toHaveLength(0)
  })
})
