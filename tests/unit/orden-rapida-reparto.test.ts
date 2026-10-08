// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\orden-rapida-reparto.test.ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  derivarRepartoPorFilas,
  stagingMinFilaPorCodigo,
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
