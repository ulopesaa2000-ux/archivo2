// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\color-match.test.ts
import { describe, expect, it } from 'vitest'
import {
  buildColorDraft,
  canonicalEn,
  claveColor,
  cleanColorRaw,
  dedupPorClave,
  esColorIgnorable,
  esPatronColor,
  extraerBaseColor,
  filtrarColoresCatalogo,
  inferirCodigoHexTipo,
  quitarStopwords,
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
  it('matchea con prioridad ES nombre -> INTERN ingles -> codigo', () => {
    // PURPURA sugiere MORADO: con la prioridad acordada entra por nombre ES.
    expect(resolveColor('PURPURA', CATALOGO)).toMatchObject({ found: true, id: 4, via: 'nombre' })
    expect(resolveColor('COFFEE', CATALOGO)).toMatchObject({ found: true, id: 3 })
    expect(resolveColor('BLACK', CATALOGO)).toMatchObject({ found: true, id: 1 })
  })

  it('rescata por nombre_intern lo mal traducido (LT/DK/OFF)', () => {
    const cat: CatalogColor[] = [
      ...CATALOGO,
      { id: 20, nombre: 'BEIGE CLARO', codigo: 'BEC', nombre_intern: 'LIGHT BEIGE' },
      { id: 21, nombre: 'BEIGE OSCURO', codigo: 'BEO', nombre_intern: 'DARK BEIGE' },
      { id: 22, nombre: 'BLANCO HUESO', codigo: 'BLH', nombre_intern: 'OFF WHITE' },
      { id: 23, nombre: 'GRIS CLARO', codigo: 'GRC', nombre_intern: 'LIGHT GREY' },
    ]
    expect(resolveColor('LT BEIGE', cat)).toMatchObject({ found: true, id: 20 })
    expect(resolveColor('DK BEIGE', cat)).toMatchObject({ found: true, id: 21 })
    expect(resolveColor('OFF WHITE', cat)).toMatchObject({ found: true, id: 22 })
    expect(resolveColor('LT GREY', cat)).toMatchObject({ found: true, id: 23 })
    expect(resolveColor('GOOFFE', cat).found).toBe(false)
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

describe('color-match Fase 1: sanitizado BONNIE 18-2026 (base UPPER vs DB)', () => {
  // Subconjunto real de inv-tienda.cat_colores (ids verdaderos).
  const BONNIE_CAT: CatalogColor[] = [
    { id: 1, nombre: 'NEGRO', codigo: 'BLK', nombre_intern: null },
    { id: 5, nombre: 'GRIS', codigo: 'GRY', nombre_intern: null },
    { id: 16, nombre: 'ARENA', codigo: 'SAND', nombre_intern: 'Sand' },
    { id: 28, nombre: 'AZUL PETRÓLEO', codigo: 'PETBLU', nombre_intern: 'Petrol Blue' },
    { id: 58, nombre: 'CAMPANILLA AZUL', codigo: 'BLUBEL', nombre_intern: 'Blue Bell' },
    { id: 72, nombre: 'CIELO AZUL', codigo: 'BLUHEA', nombre_intern: 'Blue Heaven' },
    { id: 95, nombre: 'ÉTER', codigo: 'ETHER', nombre_intern: 'Ether' },
    { id: 98, nombre: 'FRESA', codigo: 'STRAWB', nombre_intern: 'Strawberry' },
    { id: 99, nombre: 'FUCSIA', codigo: 'FUCHSI', nombre_intern: 'Fuchsia' },
    { id: 129, nombre: 'MALVA', codigo: 'MAUVE', nombre_intern: 'Mauve' },
    { id: 132, nombre: 'MALVA PÁLIDO', codigo: 'PALMAU', nombre_intern: 'Pale Mauve' },
    { id: 134, nombre: 'MARINO', codigo: 'NVY', nombre_intern: 'Navy' },
    { id: 135, nombre: 'MELANGE', codigo: 'MELANG', nombre_intern: 'Melange' },
    { id: 136, nombre: 'MELANGE OSCURO', codigo: 'DARMEL', nombre_intern: 'Dark Melange' },
    { id: 163, nombre: 'OCÉANO OSCURO', codigo: 'DAROCE', nombre_intern: 'Dark Ocean' },
    { id: 166, nombre: 'OLIVO CLARO', codigo: 'LIGOLI', nombre_intern: 'Light Olive' },
    { id: 174, nombre: 'PHLOX OSCURO', codigo: 'DARPHL', nombre_intern: 'Dark Phlox' },
    { id: 186, nombre: 'ROJO CEREZA', codigo: 'REDCHE', nombre_intern: 'Red Cherry' },
    { id: 237, nombre: 'VINO NOCHE', codigo: 'NIGWIN', nombre_intern: 'Night Wine' },
    { id: 238, nombre: 'VINO NUEVO', codigo: 'NEWWIN', nombre_intern: 'New Wine' },
  ]

  it('extrae base limpia y detecta patron puro', () => {
    expect(extraerBaseColor('PALE MAUVE 16-1806TPX(120)').base).toBe('PALE MAUVE')
    expect(extraerBaseColor('BLUE BELL119').base).toBe('BLUE BELL')
    expect(extraerBaseColor('STROWBERRY(99)').base).toBe('STROWBERRY')
    expect(extraerBaseColor('FRANBOISE 90850(57)').base).toBe('FRANBOISE')
    expect(extraerBaseColor('DK PHLOX 19-2820 (47').base).toBe('DK PHLOX')
    expect(esPatronColor('11321-121')).toBe(true)
    expect(esPatronColor('MAUVE 16-2111TPG')).toBe(false)
    expect(quitarStopwords('ALL BLACK')).toBe('BLACK')
    expect(quitarStopwords('NEW WINE')).toBe('WINE')
    expect(quitarStopwords('BLACK')).toBe('BLACK')
  })

  it('ignora tela y patron (nunca bloquean)', () => {
    expect(esColorIgnorable('FUR')).toBe(true)
    expect(esColorIgnorable('fur')).toBe(true)
    expect(esColorIgnorable('11321-121')).toBe(true)
    expect(esColorIgnorable('BLACK')).toBe(false)
  })

  it('nivel 2 auto: sufijo Pantone/numeros -> existente via base', () => {
    expect(resolveColor('MAUVE 16-2111TPG', BONNIE_CAT)).toMatchObject({ found: true, id: 129, via: 'base' })
    expect(resolveColor('MAUVE 16-2111', BONNIE_CAT)).toMatchObject({ found: true, id: 129, via: 'base' })
    expect(resolveColor('PALE MAUVE 16-1806TPX(120)', BONNIE_CAT)).toMatchObject({ found: true, id: 132 })
    expect(resolveColor('ETHER 14-4506TPX(127 )', BONNIE_CAT)).toMatchObject({ found: true, id: 95 })
    expect(resolveColor('RED CHERRY 90859(66)', BONNIE_CAT)).toMatchObject({ found: true, id: 186 })
    expect(resolveColor('BLUE BELL119', BONNIE_CAT)).toMatchObject({ found: true, id: 58 })
    expect(resolveColor('BLUE HEVEAN 17-4023TPX (125)', BONNIE_CAT)).toMatchObject({ found: true, id: 72 })
    expect(resolveColor('STROWBERRY(99)', BONNIE_CAT)).toMatchObject({ found: true, id: 98 })
    expect(resolveColor('FUSHIA 18-1945TPX(133)', BONNIE_CAT)).toMatchObject({ found: true, id: 99 })
    expect(resolveColor('NIGHT WINE 19-1623(92)', BONNIE_CAT)).toMatchObject({ found: true, id: 237 })
    expect(resolveColor('NEW WINE 90855', BONNIE_CAT)).toMatchObject({ found: true, id: 238 })
    expect(resolveColor('DK OCEAN 114', BONNIE_CAT)).toMatchObject({ found: true, id: 163 })
    expect(resolveColor('LT OLIVE OTO670113', BONNIE_CAT)).toMatchObject({ found: true, id: 166 })
    expect(resolveColor('DK PHLOX 19-2820 (47', BONNIE_CAT)).toMatchObject({ found: true, id: 174 })
    expect(resolveColor('DK MELANGE', BONNIE_CAT)).toMatchObject({ found: true, id: 136 })
    expect(resolveColor('SAND 49', BONNIE_CAT)).toMatchObject({ found: true, id: 16 })
  })

  it('stopwords: ALL BLACK -> Negro automatico', () => {
    expect(resolveColor('ALL BLACK', BONNIE_CAT)).toMatchObject({ found: true, id: 1, via: 'base' })
    expect(resolveColor('all black', BONNIE_CAT).found).toBe(true)
  })

  it('compuestos por lados con ruido', () => {
    expect(resolveColor('BLUE BELL119/GREY', BONNIE_CAT).found).toBe(true)
    expect(resolveColor('BLACK/GREY', BONNIE_CAT).found).toBe(true)
    expect(resolveColor('NAVY/ETHER', BONNIE_CAT).found).toBe(true)
    // Lado patron: solo propone en ambar (Azul Petroleo), el humano mapea o crea.
    expect(resolveColor('BLUE 14-4210TPX/22DG02023', BONNIE_CAT)).toMatchObject({ found: true, via: 'parcial' })
  })

  it('tripletes IA rescatan el match aunque el raw falle', () => {
    // IA limpia MAUVE->Malva: el aiEs alcanza el nombre ES.
    expect(resolveColor('X-RARO-1', BONNIE_CAT, 'MAUVE', 'Malva')).toMatchObject({ found: true, id: 129 })
    expect(resolveColor('X-RARO-2', BONNIE_CAT, 'BLACK', 'Negro')).toMatchObject({ found: true, id: 1 })
  })

  it('sin match real va a nuevo (no falso positivo auto)', () => {
    expect(resolveColor('FRANBOISE 90850(57)', BONNIE_CAT).found).toBe(false)
    expect(resolveColor('BRUSH 33 15-1614TPX', BONNIE_CAT).found).toBe(false)
    expect(resolveColor('CAPRI 128', BONNIE_CAT).found).toBe(false)
  })

  it('draft limpio para el modal (Fase 2 lo usara con HEX)', () => {
    expect(buildColorDraft('PALE MAUVE 16-1806TPX(120)')).toMatchObject({
      nombre: 'MALVA PÁLIDO',
      nombre_intern: 'PALE MAUVE',
    })
    expect(buildColorDraft('STROWBERRY(99)')).toMatchObject({ nombre: 'FRESA', nombre_intern: 'STRAWBERRY' })
    expect(buildColorDraft('ALL BLACK')).toMatchObject({ nombre: 'NEGRO', nombre_intern: 'BLACK' })
  })
})

describe('color-match Fase 2: biblioteca HEX (verificados API)', () => {
  it('resuelve raros BONNIE sin API', async () => {
    const { hexBiblioteca } = await import('@/lib/color-match')
    expect(hexBiblioteca('MALVA')).toBe('#E0B0FF')
    expect(hexBiblioteca('MALVA PÁLIDO')).toBe('#E0B0FF')
    expect(hexBiblioteca('ÉTER')).toBe('#98B2B4')
    expect(hexBiblioteca('ARENA')).toBe('#E2CA76')
    expect(hexBiblioteca('OCÉANO')).toBe('#005493')
    expect(hexBiblioteca('FRESA')).toBe('#FB2943')
    expect(hexBiblioteca('FUCSIA')).toBe('#ED0DD9')
    expect(hexBiblioteca('FRAMBUESA')).toBe('#B00149')
    expect(hexBiblioteca('FLOX')).toBe('#DF00FF')
    expect(hexBiblioteca('CAPRI')).toBe('#00BFFF')
    expect(hexBiblioteca('BRUSH')).toBe('#B99684')
  })

  it('desconocido -> null (el llamador usa negro)', async () => {
    const { hexBiblioteca } = await import('@/lib/color-match')
    expect(hexBiblioteca('MELANGE')).toBeNull()
    expect(hexBiblioteca('ZZZ INVENTADO')).toBeNull()
    expect(hexBiblioteca('')).toBeNull()
  })

  it('draft ya trae HEX de biblioteca (no negro)', () => {
    expect(buildColorDraft('PALE MAUVE 16-1806TPX(120)').hex_code).toBe('#E0B0FF')
    expect(buildColorDraft('STROWBERRY(99)').hex_code).toBe('#FB2943')
  })
})

describe('clasificarColorLibre: texto libre de caja (resolve-o-inerte)', () => {
  const CAT: CatalogColor[] = [
    { id: 1, nombre: 'NEGRO', codigo: 'BLK', nombre_intern: null },
    { id: 129, nombre: 'MALVA', codigo: 'MAUVE', nombre_intern: 'Mauve' },
    { id: 132, nombre: 'MALVA PÁLIDO', codigo: 'PALMAU', nombre_intern: 'Pale Mauve' },
  ]

  it('id numerico existente -> fila catalogo', async () => {
    const { clasificarColorLibre } = await import('@/lib/color-match')
    expect(clasificarColorLibre('132', CAT)).toEqual({ kind: 'catalogo', id: 132, nombre: 'MALVA PÁLIDO' })
  })

  it('raw sucio resuelve a ES con id real (PALE MAUVE -> MALVA PÁLIDO)', async () => {
    const { clasificarColorLibre } = await import('@/lib/color-match')
    expect(clasificarColorLibre('PALE MAUVE 16-1806TPX(120)', CAT)).toEqual({
      kind: 'catalogo',
      id: 132,
      nombre: 'MALVA PÁLIDO',
    })
    expect(clasificarColorLibre('mauve', CAT)).toEqual({ kind: 'catalogo', id: 129, nombre: 'MALVA' })
  })

  it('sin match -> inerte (BOLOÑESA no crea fila ni color)', async () => {
    const { clasificarColorLibre } = await import('@/lib/color-match')
    expect(clasificarColorLibre('BOLOÑESA', CAT)).toEqual({ kind: 'inerte', texto: 'BOLOÑESA' })
    expect(clasificarColorLibre('  ', CAT).kind).toBe('inerte')
  })
})
