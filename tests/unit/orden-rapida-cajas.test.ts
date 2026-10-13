// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\orden-rapida-cajas.test.ts
import { describe, expect, it } from 'vitest'
import {
  agruparCajasPorProducto,
  aplicarEdicionCaja,
  aplicarRepartoSeparacion,
  aplicarMapaColoresACajas,
  enriquecerDetallesConMapa,
  detallesDesdeMatriz,
  fijarPzMinima,
  type CajaEditable,
  type ProductoEditable,
} from '@/lib/orden-rapida-cajas'

function caja(over: Partial<CajaEditable> & { codigo_caja: string }): CajaEditable {
  return {
    nombre_pack: 'PACK UNICO',
    piezas_por_caja: 10,
    cantidad_cajas: 2,
    total_piezas: 20,
    peso_bruto_kg: 0,
    peso_bruto_total_kg: 0,
    peso_neto_kg: 0,
    peso_neto_total_kg: 0,
    largo_cm: 0,
    ancho_cm: 0,
    alto_cm: 0,
    cbm: 0,
    cbm_por_caja: 0,
    cbm_total_linea: 0,
    tallas: [],
    colores: [],
    matriz: { tallas: [], colores: [], valores: {} },
    ...over,
  }
}

describe('agruparCajasPorProducto (pura)', () => {
  const productos: ProductoEditable[] = [
    { temp_id: 't1', sku_base: 'SKU-A' },
    { temp_id: 't2', sku_base: 'SKU-B' },
  ]
  const cajas = [
    caja({ codigo_caja: 'C1', sku_base: 'SKU-A', producto_temp_id: 't1' }),
    caja({ codigo_caja: 'C2', sku_base: 'SKU-A', producto_temp_id: 't1' }),
    caja({ codigo_caja: 'C3', sku_base: 'SKU-B', producto_temp_id: 't2' }),
    caja({ codigo_caja: 'C4', sku_base: 'SKU-Z' }),
  ]

  it('agrupa por temp_id y luego por SKU, huerfanos aparte', () => {
    const grupos = agruparCajasPorProducto(cajas, productos)
    expect(grupos).toHaveLength(3)
    expect(grupos[0].cajas.map((c) => c.codigo_caja)).toEqual(['C1', 'C2'])
    expect(grupos[1].cajas.map((c) => c.codigo_caja)).toEqual(['C3'])
    expect(grupos[2].producto.sku_base).toBe('SKU-Z')
    expect(grupos[2].producto.temp_id).toBe('orphan_SKU-Z')
  })

  it('sin temp_id cae a match por SKU', () => {
    const sueltas = [
      caja({ codigo_caja: 'C1', sku_base: 'SKU-A' }),
      caja({ codigo_caja: 'C2', sku_base: 'SKU-A' }),
    ]
    const grupos = agruparCajasPorProducto(sueltas, [{ temp_id: 't9', sku_base: 'SKU-A' }])
    expect(grupos).toHaveLength(1)
    expect(grupos[0].cajas).toHaveLength(2)
  })

  it('no muta las entradas', () => {
    const antes = JSON.stringify(cajas)
    agruparCajasPorProducto(cajas, productos)
    expect(JSON.stringify(cajas)).toBe(antes)
  })
})

describe('aplicarEdicionCaja (pura)', () => {
  it('reconstruye matriz y recalcula piezas', () => {
    const c = caja({ codigo_caja: 'C1', tallas: ['CH'], colores: ['NEGRO'] })
    const next = aplicarEdicionCaja(c, {
      base: {},
      detalles: [
        { talla_id: 1, color_id: 1, cantidad: 4, talla_nombre: 'CH', color_nombre: 'NEGRO' },
        { talla_id: 2, color_id: 1, cantidad: 6, talla_nombre: 'M', color_nombre: 'NEGRO' },
      ],
    })
    expect(next.piezas_por_caja).toBe(10)
    expect(next.matriz.valores).toEqual({ NEGRO: { CH: 4, M: 6 } })
    expect(next.matriz.tallas).toEqual(['CH'])
    expect(next.matriz.colores).toEqual(['NEGRO'])
    // original intacto
    expect(c.piezas_por_caja).toBe(10)
    expect(c.matriz.valores).toEqual({})
  })

  it('limpia marca de estimado al fijar valor real', () => {
    const c = caja({ codigo_caja: 'C1', piezas_por_caja: 1, piezas_estimadas: true })
    const next = aplicarEdicionCaja(c, { base: { piezas_por_caja: 24 }, detalles: [] })
    expect(next.piezas_por_caja).toBe(24)
    expect(next.piezas_estimadas).toBe(false)
  })
})

describe('detallesDesdeMatriz', () => {
  it('emite solo celdas con cantidad > 0 con shape n8n', () => {
    const c = caja({
      codigo_caja: 'C9',
      sku_base: 'SKU-A',
      nombre_pack: 'PACK A',
      matriz: { tallas: ['CH', 'M'], colores: ['NEGRO'], valores: { NEGRO: { CH: 4, M: 0 } } },
    })
    const dets = detallesDesdeMatriz(c)
    expect(dets).toHaveLength(1)
    expect(dets[0]).toMatchObject({
      codigo_caja_temporal: 'C9',
      sku_base: 'SKU-A',
      nombre_pack: 'PACK A',
      color_raw: 'NEGRO',
      talla_codigo: 'CH',
      cantidad_por_caja: 4,
    })
  })

  it('sin codigo o sin matriz devuelve vacio', () => {
    expect(detallesDesdeMatriz(caja({ codigo_caja: '' }))).toEqual([])
  })
})

describe('aplicarMapaColoresACajas (ID + renombrar, fusionando)', () => {
  it('renombra GOOFFE a CAFE en matriz y lista', () => {
    const c = caja({
      codigo_caja: 'C1',
      tallas: ['CH', 'M'],
      colores: ['GOOFFE'],
      matriz: { tallas: ['CH', 'M'], colores: ['GOOFFE'], valores: { GOOFFE: { CH: 4, M: 6 } } },
    })
    const { cajas: next, tocadas } = aplicarMapaColoresACajas([c], new Map([['GOOFFE', { color_id: 9, nombre: 'CAFÉ' }]]))
    expect(tocadas).toBe(1)
    expect(next[0].matriz.colores).toEqual(['CAFÉ'])
    expect(next[0].colores).toEqual(['CAFÉ'])
    expect(next[0].matriz.valores).toEqual({ 'CAFÉ': { CH: 4, M: 6 } })
    expect(c.matriz.colores).toEqual(['GOOFFE'])
  })

  it('fusiona sumando cuando dos raws caen al mismo id', () => {
    const c = caja({
      codigo_caja: 'C2',
      tallas: ['CH'],
      colores: ['GOOFFE', 'CAFE'],
      matriz: { tallas: ['CH'], colores: ['GOOFFE', 'CAFE'], valores: { GOOFFE: { CH: 3 }, CAFE: { CH: 5 } } },
    })
    const { cajas: next } = aplicarMapaColoresACajas(
      [c],
      new Map([
        ['GOOFFE', { color_id: 9, nombre: 'CAFÉ' }],
        ['CAFE', { color_id: 9, nombre: 'CAFÉ' }],
      ]),
    )
    expect(next[0].matriz.colores).toEqual(['CAFÉ'])
    expect(next[0].matriz.valores).toEqual({ 'CAFÉ': { CH: 8 } })
  })

  it('es insensible a case/acentos y no toca lo no mapeado', () => {
    const c = caja({
      codigo_caja: 'C3',
      tallas: ['CH'],
      colores: ['gooffe', 'NEGRO'],
      matriz: { tallas: ['CH'], colores: ['gooffe', 'NEGRO'], valores: { gooffe: { CH: 2 }, NEGRO: { CH: 7 } } },
    })
    const { cajas: next, tocadas } = aplicarMapaColoresACajas([c], new Map([['GOOFFE', { color_id: 9, nombre: 'CAFÉ' }]]))
    expect(tocadas).toBe(1)
    expect(next[0].matriz.colores).toEqual(['CAFÉ', 'NEGRO'])
    expect(next[0].matriz.valores['CAFÉ']).toEqual({ CH: 2 })
  })
})

describe('enriquecerDetallesConMapa', () => {
  it('inyecta color_id sin mutar', () => {
    const dets = [
      { codigo_caja_temporal: 'C1', color_raw: 'GOOFFE', cantidad_por_caja: 2 },
      { codigo_caja_temporal: 'C1', color_raw: 'NEGRO', cantidad_por_caja: 3 },
    ]
    const out = enriquecerDetallesConMapa(dets, new Map([['GOOFFE', 9]]))
    expect(out[0].color_id).toBe(9)
    expect(out[1].color_id).toBeUndefined()
    expect(dets[0].color_id).toBeUndefined()
  })
})
describe('fijarPzMinima (pura)', () => {
  it('fija 1 pza solo en cajas sin dato y las marca', () => {
    const cajas = [
      caja({ codigo_caja: 'C1', piezas_por_caja: 0, cantidad_cajas: 5 }),
      caja({ codigo_caja: 'C2', piezas_por_caja: 20, cantidad_cajas: 3 }),
      caja({ codigo_caja: 'C3', piezas_por_caja: 0, cantidad_cajas: 0, tipo_caja: 'padre_resumen' }),
    ]
    const { cajas: next, fijadas } = fijarPzMinima(cajas)
    expect(fijadas).toBe(1)
    expect(next[0].piezas_por_caja).toBe(1)
    expect(next[0].total_piezas).toBe(5)
    expect(next[0].piezas_estimadas).toBe(true)
    expect(next[1].piezas_por_caja).toBe(20)
    expect(next[2].piezas_por_caja).toBe(0)
    // sin mutar
    expect(cajas[0].piezas_por_caja).toBe(0)
  })
})

describe('aplicarRepartoSeparacion (bug AND260030 suma 0)', () => {
  const CONJ = 'AND260030 3JA8969 3JA8970 AND260029'
  function estado15() {
    const productos: ProductoEditable[] = [{ temp_id: 't-conj', sku_base: CONJ }]
    const cajas = [
      '0001', '0002', '0003', '0004', '0005', '0006',
    ].map((suf, i) => caja({
      codigo_caja: `CONJ-PACKUNICO-${suf}`,
      codigo_caja_temporal: `CONJ-PACKUNICO-${suf}`,
      sku_base: CONJ,
      producto_temp_id: 't-conj',
      cantidad_cajas: [70, 1, 1, 1, 72, 1][i],
      piezas_por_caja: [34, 34, 28, 20, 34, 34][i],
    }))
    const detalles = cajas.flatMap((c) => detallesDesdeMatriz({
      ...c,
      matriz: { tallas: ['CH'], colores: ['NEGRO'], valores: { NEGRO: { CH: 1 } } },
    }))
    return { productos, cajas, detalles }
  }
  const argsBase = {
    prodATempId: 't-conj',
    skuA: 'AND260030',
    skuRawA: 'AND260030 3JA8969',
    nuevos: [{ temp_id: 't-029', sku_base: 'AND260029' }] as ProductoEditable[],
    tempPorSku: { AND260030: 't-conj', AND260029: 't-029' },
    originalUp: CONJ,
    renombrar: (cod: string, skuD: string) => `${skuD}--${cod}`,
  }

  it('las que se quedan heredan el SKU del 1er candidato (no mas suma 0)', () => {
    const { productos, cajas, detalles } = estado15()
    // Solo las 2 ultimas se mueven a AND260029
    const destino = new Map([
      ['CONJ-PACKUNICO-0005', 'AND260029'],
      ['CONJ-PACKUNICO-0006', 'AND260029'],
    ])
    const r = aplicarRepartoSeparacion({ productos, cajas, detalles, destinoPorCodigo: destino, ...argsBase })
    expect(r.movidas).toBe(2)
    const porSku = new Map<string, number>()
    for (const c of r.cajas) {
      porSku.set(String(c.sku_base), (porSku.get(String(c.sku_base)) || 0) + Number(c.cantidad_cajas))
    }
    // 70+1+1+1=73 para 030, 72+1=73 para 029: el match cuadra 73/73
    expect(porSku.get('AND260030')).toBe(73)
    expect(porSku.get('AND260029')).toBe(73)
    expect(porSku.has(CONJ)).toBe(false)
    // Codigos movidos renombrados, quedados intactos pero con SKU nuevo
    expect(r.cajas.find((c) => c.codigo_caja === 'CONJ-PACKUNICO-0001')?.sku_base).toBe('AND260030')
    expect(r.cajas.find((c) => c.codigo_caja === 'AND260029--CONJ-PACKUNICO-0005')).toBeDefined()
    // Detalles siguen a sus cajas
    const detSkus = new Set(r.detalles.map((d) => String(d.sku_base)))
    expect(detSkus.has(CONJ)).toBe(false)
    // Producto original renombrado, nuevo agregado
    expect(r.productos).toHaveLength(2)
    expect(r.productos[0].sku_base).toBe('AND260030')
    expect(r.productos[0].temp_id).toBe('t-conj')
  })

  it('soloCrear crea productos y reasigna quedadas sin mover nada', () => {
    const { productos, cajas, detalles } = estado15()
    const r = aplicarRepartoSeparacion({ productos, cajas, detalles, destinoPorCodigo: new Map(), ...argsBase })
    expect(r.movidas).toBe(0)
    expect(r.productos).toHaveLength(2)
    // Todas las cajas quedan con el 1er candidato: listas para arrastre manual
    expect(new Set(r.cajas.map((c) => String(c.sku_base)))).toEqual(new Set(['AND260030']))
  })
})
