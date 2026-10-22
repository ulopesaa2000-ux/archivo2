// tests/unit/inventario/validacion-stock.test.ts
import { describe, expect, it } from 'vitest'
import {
  agregarLineasPorClave,
  ajustarLineasADisponible,
  claveStock,
  consolidarLineas,
  evaluarDisponibilidad,
  type ClaveStock,
  type LineaStock,
  type StockDisponible,
} from '@/lib/inventario/validacion-stock'

function linea(over: Partial<LineaStock> = {}): LineaStock {
  return {
    producto_id: 7601,
    producto_sku: 'QQ27/03MW',
    producto_nombre: 'ROMPEVIENTOS LICRA',
    caja_id: null,
    caja_codigo: null,
    cajas: 1,
    piezas_sueltas: 0,
    ...over,
  }
}

function stock(clave: ClaveStock, cajas: number, piezas = 0): Map<ClaveStock, StockDisponible> {
  return new Map([[clave, { cajas, piezas_sueltas: piezas }]])
}

describe('validacion-stock · clave de agrupación', () => {
  it('trata NULL de caja como la misma clave que 0', () => {
    expect(claveStock(10, null)).toBe(claveStock(10, 0))
    expect(claveStock(10, 5)).not.toBe(claveStock(10, 6))
    expect(claveStock(10, null)).not.toBe(claveStock(11, null))
  })

  it('agrega renglones del mismo producto + caja', () => {
    const mapa = agregarLineasPorClave([
      linea({ cajas: 6 }),
      linea({ cajas: 1 }),
      linea({ cajas: 2, caja_id: 7, caja_codigo: 'CAJA-A' }),
    ])

    expect(mapa.size).toBe(2)

    const base = mapa.get('7601:0')!
    expect(base.cajas).toBe(7)
    expect(base.renglones).toBe(2)

    const conCaja = mapa.get('7601:7')!
    expect(conCaja.cajas).toBe(2)
    expect(conCaja.renglones).toBe(1)
  })
})

describe('validacion-stock · evaluación agregada', () => {
  it('detecta el caso 6 + 1 contra 6 disponibles (el que revienta el trigger)', () => {
    const resultado = evaluarDisponibilidad(
      [linea({ cajas: 6 }), linea({ cajas: 1 })],
      stock('7601:0', 6),
      'salida'
    )

    expect(resultado.ok).toBe(false)
    expect(resultado.faltantes).toHaveLength(1)

    const faltante = resultado.faltantes[0]
    expect(faltante.producto_sku).toBe('QQ27/03MW')
    expect(faltante.renglones).toBe(2)
    expect(faltante.solicitado_cajas).toBe(7)
    expect(faltante.disponible_cajas).toBe(6)
    expect(faltante.faltan_cajas).toBe(1)
  })

  it('avisa (sin bloquear) cuando un SKU aparece en varios renglones pero alcanza', () => {
    const resultado = evaluarDisponibilidad(
      [linea({ cajas: 3 }), linea({ cajas: 2 })],
      stock('7601:0', 6),
      'salida'
    )

    expect(resultado.ok).toBe(true)
    expect(resultado.faltantes).toHaveLength(0)
    expect(resultado.advertencias).toHaveLength(1)
    expect(resultado.advertencias[0].renglones).toBe(2)
    expect(resultado.advertencias[0].total_cajas).toBe(5)
  })

  it('no valida entradas (no consumen stock)', () => {
    const resultado = evaluarDisponibilidad([linea({ cajas: 500 })], new Map(), 'entrada')
    expect(resultado.ok).toBe(true)
    expect(resultado.faltantes).toHaveLength(0)
  })

  it('separa claves con distinto producto o distinto caja', () => {
    const resultado = evaluarDisponibilidad(
      [
        linea({ cajas: 5, caja_id: 7 }),
        linea({ cajas: 5, caja_id: 9 }),
        linea({ cajas: 5, producto_id: 999, producto_sku: 'OTRO' }),
      ],
      new Map([
        ['7601:7', { cajas: 5, piezas_sueltas: 0 }],
        ['7601:9', { cajas: 5, piezas_sueltas: 0 }],
        ['999:0', { cajas: 5, piezas_sueltas: 0 }],
      ]),
      'salida'
    )

    expect(resultado.ok).toBe(true)
    expect(resultado.faltantes).toHaveLength(0)
  })

  it('cuenta piezas sueltas además de cajas', () => {
    const resultado = evaluarDisponibilidad(
      [linea({ cajas: 0, piezas_sueltas: 8 })],
      stock('7601:0', 10, 3),
      'salida'
    )

    expect(resultado.ok).toBe(false)
    expect(resultado.faltantes[0].faltan_piezas).toBe(5)
    expect(resultado.faltantes[0].faltan_cajas).toBe(0)
  })

  it('en ajuste negativo valida el valor absoluto de las cajas negativas', () => {
    const resultado = evaluarDisponibilidad(
      [linea({ cajas: -4 })],
      stock('7601:0', 2),
      'ajuste_negativo'
    )

    expect(resultado.ok).toBe(false)
    expect(resultado.faltantes[0].solicitado_cajas).toBe(4)
    expect(resultado.faltantes[0].faltan_cajas).toBe(2)
  })

  it('no bloquea un ajuste con entrada y salida del mismo SKU (efecto neto positivo)', () => {
    const resultado = evaluarDisponibilidad(
      [linea({ cajas: 5 }), linea({ cajas: -3 })],
      stock('7601:0', 2),
      'ajuste_negativo'
    )

    expect(resultado.ok).toBe(true)
  })
})

describe('validacion-stock · ajuste al disponible', () => {
  it('recorta el agregado para que quepa en el disponible', () => {
    const lineas = [linea({ cajas: 6 }), linea({ cajas: 1 })]
    const { faltantes } = evaluarDisponibilidad(lineas, stock('7601:0', 6), 'salida')

    const ajustadas = ajustarLineasADisponible(lineas, faltantes)

    expect(ajustadas[0].cajas).toBe(6)
    expect(ajustadas[1].cajas).toBe(0)

    const reevaluado = evaluarDisponibilidad(ajustadas, stock('7601:0', 6), 'salida')
    expect(reevaluado.ok).toBe(true)
  })

  it('no toca líneas sin faltante', () => {
    const lineas = [linea({ cajas: 2, producto_id: 1, producto_sku: 'A' })]
    const ajustadas = ajustarLineasADisponible(lineas, [])
    expect(ajustadas[0].cajas).toBe(2)
  })
})

describe('validacion-stock · consolidación de renglones', () => {
  it('fusiona renglones del mismo producto + caja sumando cajas', () => {
    const consolidadas = consolidarLineas([
      linea({ cajas: 6 }),
      linea({ cajas: 1 }),
      linea({ cajas: 4, caja_id: 7 }),
    ])

    expect(consolidadas).toHaveLength(2)

    const base = consolidadas.find((c) => c.caja_id === null)!
    expect(base.cajas).toBe(7)

    const conCaja = consolidadas.find((c) => c.caja_id === 7)!
    expect(conCaja.cajas).toBe(4)
  })

  it('consolidar no cambia el total de la nota', () => {
    const lineas = [linea({ cajas: 6 }), linea({ cajas: 1 }), linea({ cajas: 2, producto_id: 5 })]
    const totalAntes = lineas.reduce((s, l) => s + l.cajas, 0)
    const totalDespues = consolidarLineas(lineas).reduce((s, l) => s + l.cajas, 0)

    expect(totalDespues).toBe(totalAntes)
  })
})
