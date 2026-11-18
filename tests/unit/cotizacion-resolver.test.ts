// tests/unit/cotizacion-resolver.test.ts
import { describe, it, expect } from 'vitest'
import {
  resolverItemsCotizacion,
  calcularPrecioAutoritativoWeb,
  type ProductoWebAutoritativo,
} from '@/lib/utils/cotizacion-resolver'

function makeWeb(overrides: Partial<ProductoWebAutoritativo> = {}): ProductoWebAutoritativo {
  return {
    id: 101,
    producto_id: 9,
    activo: true,
    precio_publico: 500,
    precio_oferta: null,
    en_oferta: false,
    modo_override: null,
    pz_en_caja: 25,
    sku_base: 'SKU-101',
    ...overrides,
  }
}

describe('calcularPrecioAutoritativoWeb', () => {
  it('usa precio_oferta cuando en_oferta es true y precio_oferta > 0', () => {
    const res = calcularPrecioAutoritativoWeb(
      makeWeb({ precio_publico: 500, precio_oferta: 399, en_oferta: true }),
      'ecommerce'
    )
    expect(res).toEqual({ precioUnitario: 399, esCatalogo: false })
  })

  it('hace fallback a precio_publico si en_oferta es true pero precio_oferta es null o 0', () => {
    const resNull = calcularPrecioAutoritativoWeb(
      makeWeb({ precio_publico: 500, precio_oferta: null, en_oferta: true }),
      'ecommerce'
    )
    const resZero = calcularPrecioAutoritativoWeb(
      makeWeb({ precio_publico: 500, precio_oferta: 0, en_oferta: true }),
      'ecommerce'
    )
    expect(resNull).toEqual({ precioUnitario: 500, esCatalogo: false })
    expect(resZero).toEqual({ precioUnitario: 500, esCatalogo: false })
  })

  it('fuerza precio 0 y esCatalogo=true en modo catalogo', () => {
    const res = calcularPrecioAutoritativoWeb(makeWeb({ precio_publico: 500 }), 'catalogo')
    expect(res).toEqual({ precioUnitario: 0, esCatalogo: true })
  })
})

describe('resolverItemsCotizacion', () => {
  it('conserva variante real perteneciente al mismo producto_id y calcula precio de BD', () => {
    const res = resolverItemsCotizacion(
      [{ productoWebId: 101, varianteId: 77, nombre: 'Chamarra', cantidad: 2 }],
      new Map([[77, { producto_id: 9, activo: true }]]),
      new Map([[101, makeWeb({ id: 101, producto_id: 9, precio_publico: 450 })]]),
      'ecommerce'
    )
    expect(res).toEqual([
      {
        varianteId: 77,
        productoWebId: 101,
        pzPorCaja: 25,
        precioUnitario: 450,
        subtotal: 900,
        esCatalogoSinPrecio: false,
        esSurtido: false,
        notaPropuesta: null,
      },
    ])
  })

  it('rechaza varianteId que pertenece a otro producto_id (anti-colision)', () => {
    expect(() =>
      resolverItemsCotizacion(
        [{ productoWebId: 101, varianteId: 77, nombre: 'Chamarra', cantidad: 1 }],
        new Map([[77, { producto_id: 999, activo: true }]]),
        new Map([[101, makeWeb({ id: 101, producto_id: 9 })]]),
        'ecommerce'
      )
    ).toThrow('no pertenece al producto')
  })

  it('acepta varianteId null cuando no hay variantes y conserva productoWebId + pz_en_caja', () => {
    const res = resolverItemsCotizacion(
      [{ productoWebId: 101, varianteId: null, nombre: 'Rompevientos', cantidad: 3 }],
      new Map(),
      new Map([[101, makeWeb({ id: 101, producto_id: 9, pz_en_caja: 25, precio_publico: 200 })]]),
      'ecommerce'
    )
    expect(res[0]).toMatchObject({
      varianteId: null,
      productoWebId: 101,
      pzPorCaja: 25,
      precioUnitario: 200,
      subtotal: 600,
    })
  })

  it('en modo hibrido registra precioOfrecido solo en notaPropuesta sin alterar precioUnitario', () => {
    const res = resolverItemsCotizacion(
      [{ productoWebId: 101, varianteId: null, nombre: 'Chaleco', cantidad: 4, precioOfrecido: 1 }],
      new Map(),
      new Map([[101, makeWeb({ id: 101, producto_id: 9, precio_publico: 350 })]]),
      'hibrido'
    )
    expect(res[0].precioUnitario).toBe(350)
    expect(res[0].subtotal).toBe(1400)
    expect(res[0].notaPropuesta).toContain('propone $1.00 / lista $350.00')
  })

  it('lanza error claro si el productoWebId no existe o no esta activo', () => {
    expect(() =>
      resolverItemsCotizacion(
        [{ productoWebId: 999, varianteId: null, nombre: 'Fantasma', cantidad: 1 }],
        new Map(),
        new Map()
      )
    ).toThrow('Fantasma')
  })
})
