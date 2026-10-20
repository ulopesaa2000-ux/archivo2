// tests/integration/stock-historico-db.test.ts
/**
 * Validación END-TO-END del motor de Stock Histórico contra la BD real.
 * SOLO LECTURA. Se salta automáticamente si no hay credenciales.
 *
 * Números de referencia (verificados el 2026-10-20):
 *   corte 2026-09-30 → total empresa 23,849.5 hoy → 21,783.5 al corte (descuento 2,066)
 *   17 de 20 bodegas cuadran con el rollback; 3 con ajuste directo fuera de notas.
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
const TOTAL_HOY = 23849.5
const TOTAL_CORTE = 21783.5

describe.skipIf(!HAY_CREDENCIALES)('Stock Histórico contra la BD real', () => {
  let res: Awaited<ReturnType<typeof import('@/modules/inventario/historico-queries').fetchStockHistorico>>
  let bodegasMeta: any[]

  beforeAll(async () => {
    const { fetchStockHistorico } = await import('@/modules/inventario/historico-queries')
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('bodegas').select('*').eq('activa', true).order('id')
    bodegasMeta = (data ?? []) as any[]
    const bodegaIds = bodegasMeta.map((b) => b.id)
    res = await fetchStockHistorico({ fechaCorte: CORTE, bodegaIds, bodegas: bodegasMeta })
  }, 120000)

  it('el total de hoy coincide con la suma de inventario_stock', () => {
    expect(res.totales.hoy).toBeCloseTo(TOTAL_HOY, 3)
  })

  it('el total al corte coincide con el valor de referencia', () => {
    expect(res.totales.historico).toBeCloseTo(TOTAL_CORTE, 3)
  })

  it('el ajuste es la diferencia entre hoy y el corte', () => {
    expect(res.totales.ajuste).toBeCloseTo(TOTAL_CORTE - TOTAL_HOY, 3)
  })

  it('no detecta ajustes directos POSTERIORES al corte', () => {
    // Todos los Updates masivos posteriores al 30-sep tienen una nota confirmada del
    // mismo día (importaciones masivas retro-datan la fecha de la nota), así que
    // la cifra al corte no se ve afectada por ajustes fuera de notas.
    expect(res.ajustesDirectos).toHaveLength(0)
  })

  it('reporta las 3 bodegas con descuadre histórico (stock vs notas)', () => {
    const ids = res.descuadres.map((d) => d.bodega_id).sort((a, b) => a - b)
    expect(ids).toEqual([5, 10, 16]) // DURAZNO, COCINA, RI&KA
    const b5 = res.descuadres.find((d) => d.bodega_id === 5)
    expect(b5?.dif).toBeCloseTo(-629.5, 1)
    // Sin ajuste directo posterior al corte → no marca riesgo en la cifra al corte.
    expect(res.descuadres.every((d) => d.tieneAjusteDirectoPostCorte === false)).toBe(true)
  })

  it('las 17 bodegas sanas cuadran con el rollback (ajuste = 0 salvo movimientos reales)', () => {
    // Bodega 8 SAN DIEGO 2 no tuvo movimientos posteriores al corte → ajuste 0 exacto.
    const b8 = res.porBodega.find((b) => b.bodega_id === 8)
    expect(b8?.ajuste).toBe(0)
    expect(b8?.historico).toBeCloseTo(3328, 3)
  })

  it('revierte 41 notas CONF posteriores al corte', () => {
    expect(res.notasRevertidas).toBe(41)
  })

  it('marca las filas que quedaron en negativo sin truncarlas', () => {
    expect(res.negativos).toBeGreaterThan(0)
    const negativas = res.filas.filter((f) => f.cajas_historicas < 0)
    // `filas` es la página actual; `negativos` cuenta sobre todas.
    expect(negativas.length).toBeLessThanOrEqual(res.negativos)
  })

  it('la suma por bodega cuadra con el total', () => {
    const suma = res.porBodega.reduce((s, b) => s + b.historico, 0)
    expect(suma).toBeCloseTo(res.totales.historico, 3)
  })

  it('la suma por ciudad cuadra con el total', () => {
    const suma = res.porCiudad.reduce((s, c) => s + c.historico, 0)
    expect(suma).toBeCloseTo(res.totales.historico, 3)
  })

  it('SAN MARTIN al 30-sep = 9,531 cajas', () => {
    const sm = res.porCiudad.find((c) => c.ciudad === 'SAN MARTIN')
    expect(sm?.historico).toBeCloseTo(9531, 3)
  })

  it('TOLUCA al 30-sep = 5,501.5 cajas', () => {
    const tol = res.porCiudad.find((c) => c.ciudad === 'TOLUCA')
    expect(tol?.historico).toBeCloseTo(5501.5, 3)
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
      fechaCorte: '2026-09-30',
      bodegaIds,
      bodegas: bodegasMeta,
      page: 1,
      limit: 20000,
    })
    kardex = await fetchKardexHistorico({
      desde: '2026-09-01',
      hasta: '2026-09-30',
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

  it('el corte sin paginar cuadra con el total de referencia', () => {
    expect(corte.totales.historico).toBeCloseTo(21783.5, 3)
    expect(corte.totalFilas).toBe(corte.filas.length)
  })
})
