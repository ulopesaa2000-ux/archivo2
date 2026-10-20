// tests/unit/stock-historico.test.ts
import { describe, expect, it } from 'vitest'
import {
  aplicarRollback,
  calcularDelta,
  calcularRollback,
  construirKardex,
  corteHasta,
  detectarAjustesDirectos,
  efectoEnBodega,
  efectoRollback,
  esMovimientoAplicable,
  idsProductosUnicos,
  inicioDesde,
  normalizaFecha,
  normalizaHasta,
  pivotarMatriz,
  resumenPorBodega,
  type FilaPlanaHistorico,
  type MovimientoHistorico,
} from '@/lib/inventario/stock-historico'

function mov(over: Partial<MovimientoHistorico> = {}): MovimientoHistorico {
  return {
    nota_id: 1,
    numero_nota: 'N-TEST-0001',
    fecha_nota: '2026-10-05T12:00:00',
    fecha_confirmacion: '2026-10-05T12:00:00',
    tipo_codigo: 'ENT',
    afecta_inventario: 1,
    estado_codigo: 'CONF',
    activo: true,
    bodega_origen_id: 6,
    bodega_destino_id: null,
    producto_id: 100,
    cajas: 10,
    ...over,
  }
}

describe('cortes de fecha (naive, misma convención que fetchNotas)', () => {
  it('convierte el día local en límites inclusivos', () => {
    expect(inicioDesde('2026-09-30')).toBe('2026-09-30T00:00:00')
    expect(corteHasta('2026-09-30')).toBe('2026-09-30T23:59:59.999')
  })

  it('normaliza fecha simple e ISO', () => {
    expect(normalizaFecha('2026-09-30')).toBe('2026-09-30T00:00:00')
    expect(normalizaHasta('2026-09-30')).toBe('2026-09-30T23:59:59.999')
    expect(normalizaFecha('2026-09-30T18:00:00')).toBe('2026-09-30T18:00:00')
    expect(normalizaFecha(null)).toBe('')
  })
})

describe('efectoEnBodega — regla de signos', () => {
  it('ENT suma en su bodega origen', () => {
    expect(efectoEnBodega(mov({ tipo_codigo: 'ENT', afecta_inventario: 1, cajas: 8 }), 6)).toBe(8)
    expect(efectoEnBodega(mov({ tipo_codigo: 'ENT' }), 9)).toBe(0)
  })

  it('DEV suma en su bodega origen', () => {
    expect(efectoEnBodega(mov({ tipo_codigo: 'DEV', afecta_inventario: 1, cajas: 3 }), 6)).toBe(3)
  })

  it('SAL resta en su bodega origen', () => {
    expect(efectoEnBodega(mov({ tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 5 }), 6)).toBe(-5)
  })

  it('TRF resta en origen y suma en destino', () => {
    const trf = mov({ tipo_codigo: 'TRF', afecta_inventario: 0, bodega_origen_id: 6, bodega_destino_id: 9, cajas: 12 })
    expect(efectoEnBodega(trf, 6)).toBe(-12)
    expect(efectoEnBodega(trf, 9)).toBe(12)
  })

  it('TRF con origen = destino es neto cero', () => {
    const trf = mov({ tipo_codigo: 'TRF', bodega_origen_id: 6, bodega_destino_id: 6, cajas: 12 })
    expect(efectoEnBodega(trf, 6)).toBe(0)
  })

  it('AJU positivo suma y AJU negativo resta en origen', () => {
    expect(efectoEnBodega(mov({ tipo_codigo: 'AJU', afecta_inventario: 0, cajas: 7 }), 6)).toBe(7)
    expect(efectoEnBodega(mov({ tipo_codigo: 'AJU', afecta_inventario: 0, cajas: -7 }), 6)).toBe(-7)
  })

  it('el rollback es el inverso del efecto aplicado', () => {
    const ent = mov({ tipo_codigo: 'ENT', cajas: 8 })
    expect(efectoRollback(ent, 6)).toBe(-8)
    const sal = mov({ tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 5 })
    expect(efectoRollback(sal, 6)).toBe(5)
  })
})

describe('filtro de notas aplicables', () => {
  it('solo CONF y MODF activas aplican', () => {
    expect(esMovimientoAplicable({ estado_codigo: 'CONF', activo: true })).toBe(true)
    expect(esMovimientoAplicable({ estado_codigo: 'MODF', activo: true })).toBe(true)
    expect(esMovimientoAplicable({ estado_codigo: 'CANC', activo: true })).toBe(false)
    expect(esMovimientoAplicable({ estado_codigo: 'PEND', activo: true })).toBe(false)
    expect(esMovimientoAplicable({ estado_codigo: 'PROC', activo: true })).toBe(false)
    expect(esMovimientoAplicable({ estado_codigo: 'CONF', activo: false })).toBe(false)
  })

  it('el rollback ignora CANC, PEND y notas ocultas', () => {
    const corte = corteHasta('2026-09-30')
    const movimientos = [
      mov({ nota_id: 1, tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, tipo_codigo: 'ENT', cajas: 99, estado_codigo: 'CANC' }),
      mov({ nota_id: 3, tipo_codigo: 'ENT', cajas: 88, estado_codigo: 'PEND' }),
      mov({ nota_id: 4, tipo_codigo: 'ENT', cajas: 77, activo: false }),
    ]
    const rb = calcularRollback(movimientos, corte)
    const entry = rb.get('6|100')
    expect(entry?.delta).toBe(10)
    expect(entry?.notas).toHaveLength(1)
  })
})

describe('calcularRollback — deshacer lo posterior a la fecha', () => {
  const corte = corteHasta('2026-09-30')

  it('excluye las notas dentro del corte y toma las posteriores', () => {
    const movimientos = [
      mov({ nota_id: 1, fecha_nota: '2026-09-30T12:00:00', tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, fecha_nota: '2026-09-30T23:59:59.999', tipo_codigo: 'ENT', cajas: 4 }),
      mov({ nota_id: 3, fecha_nota: '2026-10-01T00:00:00', tipo_codigo: 'ENT', cajas: 6 }),
    ]
    const rb = calcularRollback(movimientos, corte)
    expect(rb.get('6|100')?.delta).toBe(6)
  })

  it('acumula por (bodega, producto) y suma TRF en origen y destino', () => {
    const movimientos = [
      mov({ nota_id: 1, tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 3 }),
      mov({ nota_id: 3, tipo_codigo: 'TRF', bodega_origen_id: 6, bodega_destino_id: 9, cajas: 7 }),
    ]
    const rb = calcularRollback(movimientos, corte)
    expect(rb.get('6|100')?.delta).toBe(10 - 3 - 7) // entrada - salida - salida por traslado
    expect(rb.get('9|100')?.delta).toBe(7) // entrada por traslado
  })
})

describe('aplicarRollback — stock a la fecha', () => {
  const corte = corteHasta('2026-09-30')

  it('resta la entrada posterior y suma la salida posterior', () => {
    const movimientos = [
      mov({ nota_id: 1, tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 4 }),
    ]
    const rb = calcularRollback(movimientos, corte)
    const filas = aplicarRollback([{ bodega_id: 6, producto_id: 100, cajas: 100 }], rb)
    expect(filas[0].cajas_hoy).toBe(100)
    expect(filas[0].ajuste).toBe(-6) // −10 (entrada) +4 (salida)
    expect(filas[0].cajas_historicas).toBe(94)
    expect(filas[0].n_notas).toBe(2)
    expect(filas[0].valor_inconsistente).toBe(false)
  })

  it('marca inconsistencia cuando el corte deja la fila en negativo', () => {
    const movimientos = [mov({ nota_id: 1, tipo_codigo: 'ENT', cajas: 30 })]
    const rb = calcularRollback(movimientos, corte)
    const filas = aplicarRollback([{ bodega_id: 6, producto_id: 100, cajas: 12 }], rb)
    expect(filas[0].cajas_historicas).toBe(-18)
    expect(filas[0].valor_inconsistente).toBe(true)
  })

  it('sin movimientos posteriores el stock no cambia', () => {
    const movimientos = [mov({ nota_id: 1, fecha_nota: '2026-09-01T12:00:00', tipo_codigo: 'ENT', cajas: 10 })]
    const rb = calcularRollback(movimientos, corte)
    const filas = aplicarRollback([{ bodega_id: 6, producto_id: 100, cajas: 50 }], rb)
    expect(filas[0].cajas_historicas).toBe(50)
    expect(filas[0].n_notas).toBe(0)
  })

  it('resumen por bodega cuadra hoy + ajuste = histórico', () => {
    const movimientos = [mov({ nota_id: 1, tipo_codigo: 'ENT', cajas: 10 })]
    const rb = calcularRollback(movimientos, corte)
    const filas = aplicarRollback(
      [
        { bodega_id: 6, producto_id: 100, cajas: 100 },
        { bodega_id: 9, producto_id: 100, cajas: 50 },
      ],
      rb
    )
    const resumen = resumenPorBodega(filas)
    expect(resumen.get(6)).toEqual({ hoy: 100, ajuste: -10, historico: 90 })
    expect(resumen.get(9)).toEqual({ hoy: 50, ajuste: 0, historico: 50 })
  })
})

describe('calcularDelta — movimientos dentro del periodo', () => {
  it('solo toma los movimientos del rango y excluye no aplicables', () => {
    const ventana = { desde: '2026-09-01', hasta: '2026-09-30' }
    const movimientos = [
      mov({ nota_id: 1, fecha_nota: '2026-09-01T00:00:00', tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, fecha_nota: '2026-09-15T12:00:00', tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 4 }),
      mov({ nota_id: 3, fecha_nota: '2026-09-30T23:59:59.999', tipo_codigo: 'ENT', cajas: 2 }),
      mov({ nota_id: 4, fecha_nota: '2026-10-01T00:00:00', tipo_codigo: 'ENT', cajas: 99 }),
      mov({ nota_id: 5, fecha_nota: '2026-09-10T12:00:00', tipo_codigo: 'ENT', cajas: 50, estado_codigo: 'CANC' }),
    ]
    const delta = calcularDelta(movimientos, ventana)
    expect(delta.get('6|100')?.delta).toBe(10 - 4 + 2)
  })
})

describe('construirKardex — saldo acumulado', () => {
  it('arranca en el saldo inicial y acumula el efecto de cada movimiento', () => {
    const ventana = { desde: '2026-09-01', hasta: '2026-09-30' }
    const movimientos = [
      mov({ nota_id: 1, fecha_nota: '2026-09-05T10:00:00', tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, fecha_nota: '2026-09-10T10:00:00', tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 4 }),
    ]
    const saldoInicial = new Map([['6|100', 100]])
    const filas = construirKardex(movimientos, ventana, saldoInicial)
    expect(filas).toHaveLength(2)
    expect(filas[0].saldo).toBe(110)
    expect(filas[1].saldo).toBe(106)
    expect(filas[1].efecto).toBe(-4)
  })

  it('el saldo final coincide con el saldo_fin de la misma ventana', () => {
    const corte = corteHasta('2026-09-30')
    const movimientos = [
      mov({ nota_id: 1, fecha_nota: '2026-09-05T10:00:00', tipo_codigo: 'ENT', cajas: 10 }),
      mov({ nota_id: 2, fecha_nota: '2026-10-03T10:00:00', tipo_codigo: 'SAL', afecta_inventario: -1, cajas: 4 }),
    ]
    // stock actual = 106 (el saldo inicial 100 +10 -4)
    const stock = [{ bodega_id: 6, producto_id: 100, cajas: 106 }]
    const rb = calcularRollback(movimientos, corte)
    const filas = aplicarRollback(stock, rb)
    const saldoInicial = new Map([['6|100', filas[0].cajas_historicas]])
    const k = construirKardex(movimientos, { desde: '2026-09-01', hasta: '2026-09-30' }, saldoInicial)
    const ultimo = k[k.length - 1]
    expect(ultimo.saldo).toBe(filas[0].cajas_historicas + ultimo.efecto)
  })
})

describe('pivotarMatriz — vista agrupada', () => {
  const columnas = [
    { key: 'b:6', tipo: 'bodega' as const, id: 6, nombre: 'SAN DIEGO 1', ciudad: 'SAN MARTIN', orden: 1 },
    { key: 'b:7', tipo: 'bodega' as const, id: 7, nombre: 'TORTILLA', ciudad: 'SAN MARTIN', orden: 2 },
  ]

  const fila = (over: Partial<FilaPlanaHistorico>): FilaPlanaHistorico => ({
    bodega_id: 6,
    bodega_nombre: 'SAN DIEGO 1',
    ciudad: 'SAN MARTIN',
    producto_id: 100,
    producto_sku: 'BRI-03',
    producto_descripcion: 'Abrigo',
    producto_familia: 'F001-000A',
    marca_nombre: 'ALEXIA',
    pz_en_caja: 1,
    cajas_hoy: 10,
    ajuste: -4,
    cajas_historicas: 6,
    entradas_posteriores: 4,
    salidas_posteriores: 0,
    n_notas: 1,
    valor_inconsistente: false,
    ...over,
  })

  it('acumula una columna por bodega y una fila por producto', () => {
    const m = pivotarMatriz(
      [
        fila({}),
        fila({ bodega_id: 7, bodega_nombre: 'TORTILLA', cajas_hoy: 5, ajuste: 0, cajas_historicas: 5, n_notas: 0 }),
      ],
      columnas,
      'bodega'
    )

    expect(m.filas).toHaveLength(1)
    expect(m.filas[0].celdas['b:6'].cajas_historicas).toBe(6)
    expect(m.filas[0].celdas['b:7'].cajas_historicas).toBe(5)
    expect(m.filas[0].total_historicas).toBe(11)
    expect(m.columnas).toHaveLength(2)
    expect(m.columnas[0].total_historicas).toBe(6)
    expect(m.columnas[1].total_historicas).toBe(5)
    expect(m.totales.historicas).toBe(11)
  })

  it('agrupa por ciudad cuando la agrupación es por ciudad', () => {
    const m = pivotarMatriz(
      [
        fila({}),
        fila({ bodega_id: 7, bodega_nombre: 'TORTILLA', cajas_hoy: 5, ajuste: 0, cajas_historicas: 5 }),
      ],
      [{ key: 'c:SAN MARTIN', tipo: 'ciudad', id: 'SAN MARTIN', nombre: 'SAN MARTIN', ciudad: 'SAN MARTIN', orden: 1 }],
      'ciudad'
    )

    expect(m.filas).toHaveLength(1)
    expect(m.filas[0].celdas['c:SAN MARTIN'].cajas_historicas).toBe(11)
    expect(m.filas[0].celdas['c:SAN MARTIN'].cajas_hoy).toBe(15)
  })

  it('conserva el desglose de entradas/salidas posteriores en la celda', () => {
    const m = pivotarMatriz(
      [fila({ ajuste: -4, entradas_posteriores: 4, salidas_posteriores: 0 })],
      columnas,
      'bodega'
    )
    const celda = m.filas[0].celdas['b:6']
    expect(celda.entradas_posteriores).toBe(4)
    expect(celda.salidas_posteriores).toBe(0)
    // El ajuste es el inverso del neto de movimientos: entradas - salidas = 4 → ajuste = -4
    expect(celda.ajuste).toBe(-(celda.entradas_posteriores - celda.salidas_posteriores))
  })

  it('marca la fila inconsistente si alguna celda queda en negativo', () => {
    const m = pivotarMatriz(
      [fila({ cajas_historicas: -2, valor_inconsistente: true })],
      columnas,
      'bodega'
    )
    expect(m.filas[0].valor_inconsistente).toBe(true)
    expect(m.filas[0].celdas['b:6'].valor_inconsistente).toBe(true)
  })

  it('ignora filas cuya columna no está en las definiciones', () => {
    const m = pivotarMatriz([fila({ bodega_id: 99 })], columnas, 'bodega')
    expect(m.filas).toHaveLength(0)
    expect(m.totales.historicas).toBe(0)
  })
})

describe('idsProductosUnicos', () => {
  it('devuelve los ids de producto sin repetir y en orden de aparición', () => {
    expect(idsProductosUnicos([{ producto_id: 3 }, { producto_id: 1 }, { producto_id: 3 }])).toEqual([3, 1])
  })
})

describe('detectarAjustesDirectos', () => {
  it('ignora el update masivo con notaConfirmada en el mismo instante', () => {
    const stock = Array.from({ length: 12 }, () => ({
      bodega_id: 3,
      producto_id: 1,
      cajas: 1,
      updated_at: '2026-08-28T21:01:56.970124',
      updated_by: 8,
    }))
    const movimientos = [
      mov({
        nota_id: 9,
        fecha_confirmacion: '2026-08-28T21:01:56.970124',
        bodega_origen_id: 3,
        tipo_codigo: 'ENT',
      }),
    ]
    expect(detectarAjustesDirectos(stock, movimientos)).toHaveLength(0)
  })

  it('detecta el update masivo sin nota que lo origine', () => {
    const stock = Array.from({ length: 12 }, () => ({
      bodega_id: 5,
      producto_id: 1,
      cajas: 0,
      updated_at: '2026-08-28T22:06:28.104640',
      updated_by: 6,
    }))
    const out = detectarAjustesDirectos(stock, [])
    expect(out).toHaveLength(1)
    expect(out[0].bodega_id).toBe(5)
    expect(out[0].filas_afectadas).toBe(12)
    expect(out[0].usuario_id).toBe(6)
  })

  it('ignora grupos pequeños', () => {
    const stock = [
      { bodega_id: 5, producto_id: 1, cajas: 0, updated_at: '2026-08-28T22:06:28.104640', updated_by: 6 },
    ]
    expect(detectarAjustesDirectos(stock, [])).toHaveLength(0)
  })
})
