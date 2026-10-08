// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\orden-rapida-colores.test.ts
import { describe, expect, it } from 'vitest'
import {
  partirRangosCarton,
  seedColoresPorConfirmar,
  siguienteLetraPack,
} from '@/lib/orden-rapida-colores'
import type { CatalogColor } from '@/lib/color-match'

const CATALOGO: CatalogColor[] = [
  { id: 1, nombre: 'NEGRO', codigo: 'NEG', nombre_intern: 'BLACK' },
  { id: 4, nombre: 'MORADO', codigo: 'MOR', nombre_intern: 'PURPLE' },
  { id: 5, nombre: 'VERDE', codigo: 'VER', nombre_intern: 'GREEN' },
]

describe('siguienteLetraPack', () => {
  it('avanza PACK B -> PACK C', () => {
    expect(siguienteLetraPack('PACK B')).toBe('PACK C')
    expect(siguienteLetraPack('pack a')).toBe('PACK B')
  })

  it('sufija cuando no es letra', () => {
    expect(siguienteLetraPack('PACK UNICO')).toBe('PACK UNICO B')
    expect(siguienteLetraPack('PACK Z')).toBe('PACK Z B')
  })
})

describe('partirRangosCarton', () => {
  it('2 rangos mueve exactamente el segundo (caso PACK B duplicado)', () => {
    expect(partirRangosCarton(['1--70', '1--72'])).toEqual({ conservar: ['1--70'], mover: ['1--72'] })
  })

  it('reparte mitades en listas largas', () => {
    expect(partirRangosCarton(['a', 'b', 'c', 'd'])).toEqual({ conservar: ['a', 'b'], mover: ['c', 'd'] })
  })

  it('deduplica y exige 2+ distintos', () => {
    expect(partirRangosCarton(['73', '73'])).toEqual({ conservar: ['73'], mover: [] })
    expect(partirRangosCarton([])).toEqual({ conservar: [], mover: [] })
  })
})

describe('seedColoresPorConfirmar', () => {
  it('marca existente vs nuevo y fusiona cajas de duplicados', () => {
    const seed = seedColoresPorConfirmar(
      [
        { raw: 'PURPURA', en: 'PURPLE', es: 'Morado', cajas: ['CJ-1'], fuente: 'ia' },
        { raw: 'PATROL', cajas: ['CJ-2'], fuente: 'wizard' },
        { raw: 'patrol', cajas: ['CJ-3'], fuente: 'wizard' },
        { raw: 'BLACK', cajas: ['CJ-1'], fuente: 'ia' },
      ],
      [{ color_raw: 'BLACK', codigo_caja_temporal: 'CJ-4' }],
      CATALOGO,
    )
    expect(seed).toHaveLength(3)
    // PURPURA matchea por nombre_intern (diseno): existente con tripletes IA intactos
    const pur = seed.find((s) => s.raw === 'PURPURA')!
    expect(pur.estado).toBe('existente')
    expect(pur.color_id).toBe(4)
    expect(pur.en).toBe('PURPLE')
    // PATROL no existe: nuevo + cajas fusionadas de duplicados
    const pat = seed.find((s) => s.raw === 'PATROL')!
    expect(pat.estado).toBe('nuevo')
    expect(pat.cajas).toEqual(expect.arrayContaining(['CJ-2', 'CJ-3']))
    const blk = seed.find((s) => s.raw === 'BLACK')!
    expect(blk.estado).toBe('existente')
    expect(blk.color_id).toBe(1)
  })

  it('ignora raws vacios y respeta tripletes IA', () => {
    const seed = seedColoresPorConfirmar(
      [{ raw: '  ', cajas: [] }],
      [{ color_raw: '', codigo_caja_temporal: 'CJ-1' }],
      CATALOGO,
    )
    expect(seed).toHaveLength(0)
  })
})
