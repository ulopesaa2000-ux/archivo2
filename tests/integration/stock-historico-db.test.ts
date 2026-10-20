// tests/integration/stock-historico-db.test.ts
/**
 * Validación END-TO-END del motor de Stock Histórico contra la BD real.
 * SOLO LECTURA. Se salta automáticamente si no hay credenciales.
 *
 * Los asserts son INVARIANTES (relaciones que siempre se cumplen), no números
 * fijos: la base es viva y confirma notas a diario, así que un total absoluto
 * se volvería obsoleto. Los valores de referencia del modelo MD sirven como
 * documentación, no como assert.
 */

import { describe, expect, it, vi, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ── Carga de .env.local (Vite no lo carga en modo test) ──────────────────────
function cargarEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const linea of raw.split(/\r?\n/)) {
      if (!linea.trim() || linea.startsWith('#') || !linea.includes('=')) continue
      const i = linea.indexOf('=')
      const k = linea.slice(0, i).trim()
      const v = linea.slice(i + 1).trim().replace(/^"|"$/g, '')
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* sin credenciales → el describe se salta */
  }
}
cargarEnv()

const HAY_CREDENCIALES = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
)

vi.mock('@/lib/supabase/server', async () => {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const build = () =>
    createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'inv-tienda' } }
    )
  return {
    createClient: async () => build(),
    createStaticClient: () => build(),
  }
})

const CORTE = '2026-09-30'

describe.skipIf(!HAY_CREDENCIALES)('Stock Histórico contra la BD real', () => {
  let res: any
  let bodegasMeta: any[]

  beforeAll(async () => {
    const { fetchStockHistorico } = await import('@/modules/inventario/historico-queries')
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('bodegas').select('*').eq('activa', true).order('id')
    bodegasMeta = (data ?? []) as any[]
    const bodegaIds = bodegasMeta.map((b) => b.id)
    res = await fetchStockHistorico({
      fechaCorte: CORTE,
      bodegaIds,
      bodegas: bodegasMeta,
      page: 1,
      limit: 5000,
    })
  }, 120000)

  it('el total de hoy coincide con la suma de inventario_stock', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('inventario_stock').select('cajas, bodega_id').is('caja_id', null)
    const ids = res.porBodega.map((b: number) => b.bodega_id)
    const suma = (data ?? [])
      .filter((r: any) => ids.includes(Number(r.bodega_id)))
      .reduce((s: number, r: any) => s + Number(r.cajas || 0), 0)
    expect(res.totales.hoy).toBeCloseTo(suma, 2)
  })

  it('el total al corte = hoy + ajuste (invariante)', () => {
    expect(res.totales.historico).toBeCloseTo(res.totales.hoy + res.totales.ajuste, 3)
  })

  it('revierte notas CONF posteriores al corte', () => {
    expect(res.notasRevertidas).toBeGreaterThan(0)
    expect(res.nMovimientos).toBeGreaterThanOrEqual(res.notasRevertidas)
  })

  it('marca las filas que quedaron en negativo sin truncarlas', () => {
    const negativas = res.filas.filter((f: any) => f.cajas_historicas < 0)
    // `filas` es la página actual; `negativos` cuenta sobre todas.
    expect(negativas.length).toBeLessThanOrEqual(res.negativos)
    expect(negativas.every((f: any) => f.valor_inconsistente)).toBe(true)
  })

  it('la suma por bodega cuadra con el total', () => {
    const suma = res.porBodega.reduce((s: number, b: any) => s + b.historico, 0)
    expect(suma).toBeCloseTo(res.totales.historico, 3)
  })

  it('la suma por ciudad cuadra con el total', () => {
    const suma = res.porCiudad.reduce((s: number, c: any) => s + c.historico, 0)
    expect(suma).toBeCloseTo(res.totales.historico, 3)
  })

  it('cada fila con ajuste tiene el desglose de entradas/salidas', () => {
    for (const f of res.filas as any[]) {
      const neto = f.entradas_posteriores - f.salidas_posteriores
      expect(f.ajuste).toBeCloseTo(-neto, 3)
    }
  })

  it('la matriz agrupada cuadra con los totales del alcance', async () => {
    const { fetchStockHistorico } = await import('@/modules/inventario/historico-queries')
    const m = await fetchStockHistorico({
      fechaCorte: CORTE,
      bodegaIds: bodegasMeta.map((b) => b.id),
      bodegas: bodegasMeta,
      page: 1,
      limit: 5000,
      modo: 'agrupado',
      columnasPor: 'ciudad',
    })

    expect(m.modo).toBe('agrupado')
    expect(m.matriz).not.toBeNull()
    const sumaColumnas = m.matriz!.columnas.reduce((s: number, c: any) => s + c.total_historicas, 0)
    expect(sumaColumnas).toBeCloseTo(m.totales.historico, 3)
    expect(m.matriz!.totales.historicas).toBeCloseTo(m.totales.historico, 3)
    // Una columna por ciudad del alcance
    expect(m.matriz!.columnas.length).toBe(
      new Set(bodegasMeta.map((b: any) => (b.ciudad || 'VIRTUAL').toUpperCase())).size
    )
  })

  it('con una sola bodega la vista es individual', async () => {
    const { fetchStockHistorico } = await import('@/modules/inventario/historico-queries')
    const una = bodegasMeta[0]
    const m = await fetchStockHistorico({
      fechaCorte: CORTE,
      bodegaIds: [una.id],
      bodegas: [una],
      page: 1,
      limit: 5000,
    })
    expect(m.modo).toBe('individual')
    expect(m.matriz).toBeNull()
    expect(m.totalProductos).toBeGreaterThan(0)
    expect(m.totalFilas).toBeGreaterThanOrEqual(m.totalProductos)
  })
})

describe.skipIf(!HAY_CREDENCIALES)('Kardex — verificación cruzada con el Corte', () => {
  let corte: any
  let kardex: any
  let bodegasMeta: any[]

  beforeAll(async () => {
    const { fetchStockHistorico, fetchKardexHistorico } = await import('@/modules/inventario/historico-queries')
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('bodegas').select('*').eq('activa', true).order('id')
    bodegasMeta = (data ?? []) as any[]
    const bodegaIds = bodegasMeta.map((b) => b.id)
    corte = await fetchStockHistorico({
      fechaCorte: CORTE,
      bodegaIds,
      bodegas: bodegasMeta,
      page: 1,
      limit: 20000,
    })
    kardex = await fetchKardexHistorico({
      desde: '2026-09-01',
      hasta: CORTE,
      bodegaIds,
      bodegas: bodegasMeta,
      page: 1,
      limit: 20000,
    })
  }, 180000)

  it('el saldo final del kardex (hasta 30-sep) iguala el stock al corte', () => {
    expect(kardex.totales.saldoFinal).toBeCloseTo(corte.totales.historico, 2)
  })

  it('el saldo inicial + entradas − salidas = saldo final', () => {
    const { saldoInicial, entradas, salidas, saldoFinal } = kardex.totales
    expect(saldoInicial + entradas - salidas).toBeCloseTo(saldoFinal, 2)
  })

  it('el kardex del 1-sep al 30-sep tiene movimientos confirmados', () => {
    expect(kardex.totalFilas).toBeGreaterThan(0)
    expect(kardex.notasDistintas).toBeGreaterThan(0)
  })

  it('ninguna fila del kardex queda con efecto en PEND/CANC', () => {
    const invalidos = kardex.filas.filter(
      (f: any) => f.estado_codigo !== 'CONF' && f.estado_codigo !== 'MODF'
    )
    expect(invalidos).toHaveLength(0)
  })

  it('el saldo por producto×bodega del kardex cierra contra el corte', () => {
    // Última fila de cada clave = saldo final de esa clave.
    const ultimoPorClave = new Map<string, { saldo: number; fecha: string }>()
    for (const f of kardex.filas as any[]) {
      const previo = ultimoPorClave.get(f.clave)
      if (!previo || f.fecha_nota >= previo.fecha) {
        ultimoPorClave.set(f.clave, { saldo: f.saldo, fecha: f.fecha_nota })
      }
    }
    const cortePorClave = new Map<string, number>()
    for (const f of corte.filas as any[]) {
      cortePorClave.set(`${f.bodega_id}|${f.producto_id}`, f.cajas_historicas)
    }

    let comparadas = 0
    let maxDiff = 0
    for (const [clave, info] of ultimoPorClave.entries()) {
      const esperado = cortePorClave.get(clave)
      if (esperado === undefined) continue
      comparadas++
      maxDiff = Math.max(maxDiff, Math.abs(info.saldo - esperado))
    }

    expect(comparadas).toBeGreaterThan(100)
    expect(maxDiff).toBeLessThan(0.01)
  })
})
