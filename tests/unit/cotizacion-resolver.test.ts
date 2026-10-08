// tests/unit/cotizacion-resolver.test.ts
import { describe, it, expect } from 'vitest'
import { resolverItemsCotizacion } from '@/lib/utils/cotizacion-resolver'

describe('resolverItemsCotizacion', () => {
  it('conserva variantes reales sin referencia web', () => {
    const res = resolverItemsCotizacion(
      [{ varianteId: 77, nombre: 'Chamarra' }],
      new Map([[77, 5]]),
      new Map()
    )
    expect(res).toEqual([{ varianteId: 77, productoWebId: null, pzPorCaja: null }])
  })

  it('resuelve id web a variante null + web y factor (tabla de variantes vacía)', () => {
    const res = resolverItemsCotizacion(
      [{ varianteId: 101, nombre: 'Rompevientos' }],
      new Map(),
      new Map([[101, { producto_id: 9, pz_en_caja: 25 }]])
    )
    expect(res).toEqual([{ varianteId: null, productoWebId: 101, pzPorCaja: 25 }])
  })

  it('factor null si el producto no define pz_en_caja', () => {
    const res = resolverItemsCotizacion(
      [{ varianteId: 102, nombre: 'Chaleco' }],
      new Map(),
      new Map([[102, { producto_id: 10, pz_en_caja: null }]])
    )
    expect(res).toEqual([{ varianteId: null, productoWebId: 102, pzPorCaja: null }])
  })

  it('lanza error claro si el id no existe en ningún lado', () => {
    expect(() =>
      resolverItemsCotizacion([{ varianteId: 999, nombre: 'Fantasma' }], new Map(), new Map())
    ).toThrow('Fantasma')
  })
})
