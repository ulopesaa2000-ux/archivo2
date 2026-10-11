// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\orden-rapida-reparto.test.ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  derivarRepartoPorFilas,
  stagingMinFilaPorCodigo,
  calcularDestinos,
  dedupSeparaciones,
  riquezaSeparacion,
} from '@/lib/orden-rapida-colores'

function loadFixture() {
  const p = path.resolve(__dirname, '../fixtures/moti-15-2026-separacion.json')
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

describe('reparto exacto 15-2026 (AND260030 vs AND260029)', () => {
  it('staging trae fila de creacion por caja', () => {
    const fx = loadFixture()
    const minFila = stagingMinFilaPorCodigo(fx.staging_bloque)
    expect(Object.keys(minFila)).toHaveLength(6)
    const porSufijo: Record<string, number> = {}
    for (const [cod, f] of Object.entries(minFila)) porSufijo[cod.slice(-4)] = f
    expect(porSufijo).toMatchObject({
      '0001': 70, '0002': 74, '0003': 78, '0004': 82, '0005': 86, '0006': 90,
    })
  })

  it('deriva 6/6 exactas por posicion (incluye los dos CTN 73)', () => {
    const fx = loadFixture()
    const minFila = stagingMinFilaPorCodigo(fx.staging_bloque)
    const codigos: string[] = fx.cajas_para_revisar
    const { mapa, sinPosicion } = derivarRepartoPorFilas(codigos, minFila, fx.productos_candidatos)
    expect(sinPosicion).toEqual([])
    expect(mapa.size).toBe(6)
    const skuDe = (suf: string) => mapa.get(codigos.find((c) => c.endsWith(suf))!)
    expect(skuDe('0001')).toBe('AND260030')
    expect(skuDe('0002')).toBe('AND260030')
    expect(skuDe('0003')).toBe('AND260030')
    expect(skuDe('0004')).toBe('AND260030') // CTN 73 fila 82 -> 030
    expect(skuDe('0005')).toBe('AND260029')
    expect(skuDe('0006')).toBe('AND260029') // CTN 73 fila 90 -> 029
  })

  it('sin candidatos o sin filas no asigna nada', () => {
    const r1 = derivarRepartoPorFilas(['A', 'B'], { A: 10 }, [])
    expect(r1.mapa.size).toBe(0)
    expect(r1.sinPosicion).toEqual(['A', 'B'])
    const r2 = derivarRepartoPorFilas(['A'], {}, [{ sku_base: 'X', filas: [5] }])
    expect(r2.mapa.size).toBe(0)
    expect(r2.sinPosicion).toEqual(['A'])
  })
})

describe('calcularDestinos (3 niveles)', () => {
  it('entrada rica mueve 6/6 con 6 exactas (2 cambian de SKU)', () => {
    const fx = loadFixture()
    const minFila = stagingMinFilaPorCodigo(fx.staging_bloque)
    const codigos: string[] = fx.cajas_para_revisar
    const porCodigo = new Map(fx.cajas_bloque.map((c: { codigo_caja_temporal: string; carton_no_raw: string }) => [c.codigo_caja_temporal, c.carton_no_raw]))
    const { destinos, exactas } = calcularDestinos(
      codigos.map((codigo) => ({ codigo, carton: porCodigo.get(codigo) || '' })),
      minFila,
      fx.productos_candidatos,
      [],
    )
    expect(destinos.size).toBe(6)
    expect(exactas).toBe(6)
    const mueven = [...destinos.entries()].filter(([, s]) => s !== 'AND260030')
    expect(mueven).toHaveLength(2)
    expect(mueven.every(([, s]) => s === 'AND260029')).toBe(true)
  })

  it('entrada pobre (sin filas ni cartones) no mueve nada', () => {
    const fx = loadFixture()
    const codigos: string[] = fx.cajas_para_revisar
    const { destinos, exactas } = calcularDestinos(
      codigos.map((codigo) => ({ codigo, carton: '' })),
      {},
      [{ sku_base: 'AND260030' }, { sku_base: 'AND260029' }],
      [],
    )
    expect(destinos.size).toBe(0)
    expect(exactas).toBe(0)
  })

  it('respaldo por carton mueve el rango unico sin staging', () => {
    const { destinos } = calcularDestinos(
      [
        { codigo: 'C-1', carton: '1--70' },
        { codigo: 'C-2', carton: '1--72' },
      ],
      {},
      [
        { sku_base: 'AND260030', cartones: ['1--70'] },
        { sku_base: 'AND260029', cartones: ['1--72'] },
      ],
      [],
    )
    // C-1 se queda con el 1er candidato (no entra en destinos), C-2 se mueve
    expect(destinos.get('C-2')).toBe('AND260029')
    expect(destinos.has('C-1')).toBe(false)
  })
})

describe('dedupSeparaciones (rica vs pobre)', () => {
  const RICA = {
    tipo: 'sku_conjoinado_dudoso',
    sku_base_original: 'AND260030 3JA8969 3JA8970 AND260029',
    productos_candidatos: [
      { sku_base: 'AND260030', filas: [70, 71], cartones: ['1--70'] },
      { sku_base: 'AND260029', filas: [86, 87], cartones: ['1--72'] },
    ],
    cajas_para_revisar: ['C-1', 'C-2'],
  }
  const POBRE = {
    tipo: 'sku_conjoinado_dudoso',
    sku_base_original: 'AND260030 3JA8969 3JA8970 AND260029',
    productos_candidatos: [{ sku_base: 'AND260030' }, { sku_base: 'AND260029' }],
    cajas_para_revisar: ['C-1', 'C-2'],
  }

  it('la rica puntua mas que la pobre', () => {
    expect(riquezaSeparacion(RICA)).toBeGreaterThan(riquezaSeparacion(POBRE))
  })

  it('duplicado mismo tipo conserva solo la rica', () => {
    expect(dedupSeparaciones([POBRE, RICA])).toEqual([RICA])
    expect(dedupSeparaciones([RICA, POBRE])).toEqual([RICA])
  })

  it('tipos distintos se conservan ambos', () => {
    const pack = { tipo: 'pack_duplicado_dudoso', sku_base_original: 'X' }
    expect(dedupSeparaciones([RICA, pack])).toHaveLength(2)
  })

  it('pobre unica se conserva (banner mostrara crear-manual)', () => {
    expect(dedupSeparaciones([POBRE])).toEqual([POBRE])
  })
})
