// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\orden-rapida-reparto-e2e.test.ts
// Cadena wizard-only con SALIDA REAL del workflow vivo (fixture):
// extraccion adapter (staging_por_codigo, misma expresion que OrdenRapidaWizard)
// -> derivarRepartoPorFilas -> 6/6 exactas AND260030/AND260029.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  derivarRepartoPorFilas,
  stagingMinFilaPorCodigo,
} from '@/lib/orden-rapida-colores'

function loadSalida() {
  const p = path.resolve(__dirname, '../fixtures/moti-15-2026-salida.json')
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

describe('cadena wizard-only con JSON real del workflow', () => {
  it('adapter extrae staging_por_codigo (misma expresion que el wizard)', () => {
    const data = loadSalida()
    const raw = data.staging_sugerido?.packing_lineas_staging ?? data.packing_lineas_staging ?? []
    expect(Array.isArray(raw)).toBe(true)
    const staging = stagingMinFilaPorCodigo(raw)
    expect(Object.keys(staging)).toHaveLength(10) // 3 + 1 + 6 registros caja
    const conj = 'AND260030 3JA8969 3JA8970 AND260029'
    const delBloque = raw.filter(
      (l: { sku_base?: string }) => String(l.sku_base || '') === conj,
    )
    expect(delBloque.length).toBeGreaterThan(0)
  })

  it('separacion + staging resuelven 6/6 sin tocar el workflow', () => {
    const data = loadSalida()
    const sep = (data.separacion_sugerida || []).find(
      (s: { tipo?: string }) => s.tipo === 'sku_conjoinado_dudoso',
    )
    expect(sep).toBeDefined()
    const staging = stagingMinFilaPorCodigo(
      data.staging_sugerido?.packing_lineas_staging ?? [],
    )
    const codigos: string[] = sep.cajas_para_revisar
    expect(codigos).toHaveLength(6)
    const { mapa, sinPosicion } = derivarRepartoPorFilas(
      codigos,
      staging,
      sep.productos_candidatos,
    )
    expect(sinPosicion).toEqual([])
    const porSku = new Map<string, string[]>()
    for (const [cod, sku] of mapa) {
      if (!porSku.has(sku)) porSku.set(sku, [])
      porSku.get(sku)!.push(cod)
    }
    expect(porSku.get('AND260030')).toHaveLength(4)
    expect(porSku.get('AND260029')).toHaveLength(2)
    // El CTN 73 de pcs 20 (fila 82) va a 030 y el de pcs 34 (fila 90) a 029
    const pcs = new Map(
      (data.cajas_para_editar || []).map((c: { codigo_caja_temporal?: string; piezas_por_caja?: number }) => [
        String(c.codigo_caja_temporal || ''),
        Number(c.piezas_por_caja) || 0,
      ]),
    )
    const cod030 = porSku.get('AND260030')!
    const cod029 = porSku.get('AND260029')!
    expect(cod030.map((c) => pcs.get(c)).sort((a, b) => a - b)).toEqual([20, 28, 34, 34])
    expect(cod029.map((c) => pcs.get(c)).sort((a, b) => a - b)).toEqual([34, 34])
  })
})
