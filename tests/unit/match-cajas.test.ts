// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\match-cajas.test.ts
import { describe, expect, it } from 'vitest'
import { compararCajasLineasVsFisico } from '@/modules/contenedores/match-cajas'

describe('compararCajasLineasVsFisico (modo solo cajas)', () => {
  it('ok cuando líneas y físico cuadran exacto por (orden, producto)', () => {
    const r = compararCajasLineasVsFisico(
      [
        { ordenId: 1, productoId: 10, sku: 'A', cajas: 61 },
        { ordenId: 1, productoId: 11, sku: 'B', cajas: 75 },
      ],
      [
        { ordenId: 1, productoId: 10, sku: 'A', cajas: 61 },
        { ordenId: 1, productoId: 11, sku: 'B', cajas: 75 },
      ]
    )
    expect(r.ok).toBe(true)
    expect(r.diffs).toHaveLength(2)
  })

  it('bloquea línea en 0 con físico (caso orden 264)', () => {
    const r = compararCajasLineasVsFisico(
      [{ ordenId: 264, productoId: 7570, sku: 'TY26/02MW', cajas: 0 }],
      [{ ordenId: 264, productoId: 7570, sku: 'TY26/02MW', cajas: 25 }]
    )
    expect(r.ok).toBe(false)
    expect(r.diffs[0].estado).toBe('DIF')
    expect(r.diffs[0].dif).toBe(-25)
  })

  it('marca SIN_CAJAS cuando hay línea sin físico y SIN_LINEA al revés', () => {
    const r = compararCajasLineasVsFisico(
      [{ ordenId: 1, productoId: 10, sku: 'A', cajas: 5 }],
      [{ ordenId: 1, productoId: 99, sku: 'Z', cajas: 3 }]
    )
    expect(r.ok).toBe(false)
    const estados = r.diffs.map((d) => d.estado).sort()
    expect(estados).toEqual(['SIN_CAJAS', 'SIN_LINEA'])
  })

  it('agrupa por SKU sin ids y omite ceros totales', () => {
    const r = compararCajasLineasVsFisico(
      [
        { sku: 'a', cajas: 60 },
        { sku: 'A', cajas: 40 },
      ],
      [{ sku: 'a', cajas: 100 }]
    )
    expect(r.ok).toBe(true)
  })

  it('cualquier diferencia de 1 caja bloquea (sin tolerancia)', () => {
    const r = compararCajasLineasVsFisico(
      [{ sku: 'A', cajas: 137 }],
      [{ sku: 'A', cajas: 138 }]
    )
    expect(r.ok).toBe(false)
    expect(r.diffs[0].dif).toBe(-1)
  })
})
