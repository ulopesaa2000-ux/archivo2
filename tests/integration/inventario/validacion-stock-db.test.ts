// tests/integration/inventario/validacion-stock-db.test.ts
/**
 * Validación END-TO-END del pre-chequeo de stock contra la BD real.
 * SOLO LECTURA. Se salta automáticamente si no hay credenciales.
 *
 * Reproduce el caso real que reportó el usuario: un mismo SKU en dos renglones
 * (6 + 1) con 6 cajas disponibles. El trigger `fn_procesar_nota_inventario`
 * procesa renglón por renglón y revienta en el segundo sin decir qué SKU falló.
 *
 * Los asserts son INVARIANTES (el faltante es siempre 1 caja), no números fijos:
 * la base es viva y se mueve todos los días. El stock se relee justo antes de
 * validar para minimize la ventana de carrera con otros procesos.
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
    /* sin credenciales → los tests se saltan */
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

// El módulo de auth usa `server-only` (no resoluble fuera de Next): el pre-chequeo
// no necesita sesión, solo lectura de stock.
vi.mock('@/modules/auth/queries', () => ({
  getCurrentUser: vi.fn(async () => null),
}))

type FilaStock = {
  producto_id: number
  bodega_id: number
  caja_id: number | null
  cajas: number
  piezas_sueltas: number
}

type Contexto = {
  producto: { producto_id: number; sku: string; cajas: number; bodega_id: number }
  tipoSalidaId: number
}

describe('pre-chequeo de stock · BD real (solo lectura)', () => {
  let ctx: Contexto | null = null

  beforeAll(async () => {
    if (!HAY_CREDENCIALES) return

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: tipo } = await supabase
      .from('cat_tipos_movimiento')
      .select('id')
      .eq('codigo', 'SAL')
      .maybeSingle()

    // Un producto con stock real (renglón de bodega, sin caja física).
    const { data: filas } = await supabase
      .from('inventario_stock')
      .select('producto_id, bodega_id, caja_id, cajas, piezas_sueltas')
      .is('caja_id', null)
      .gt('cajas', 0)
      .limit(1)

    const fila = (filas as FilaStock[] | null)?.[0] ?? null
    if (!fila) return

    const { data: producto } = await supabase
      .from('productos')
      .select('sku_base')
      .eq('id', fila.producto_id)
      .maybeSingle()

    ctx = {
      producto: {
        producto_id: fila.producto_id,
        sku: (producto as { sku_base: string } | null)?.sku_base ?? '',
        cajas: Number(fila.cajas),
        bodega_id: fila.bodega_id,
      },
      tipoSalidaId: (tipo as { id: number } | null)?.id ?? 0,
    }
  })

  it('detecta el agregado (disponible + 1) repartido en dos renglones', async () => {
    if (!HAY_CREDENCIALES || !ctx) return

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const leerStock = async () => {
      const { data } = await supabase
        .from('inventario_stock')
        .select('cajas')
        .eq('producto_id', ctx!.producto.producto_id)
        .eq('bodega_id', ctx!.producto.bodega_id)
        .is('caja_id', null)
        .maybeSingle()
      return Number((data as { cajas: number } | null)?.cajas ?? 0)
    }

    // Relee el stock justo antes de validar (la base es viva).
    const disponible = await leerStock()
    if (!disponible) return

    const { validarDisponibilidadNotaAction } = await import('@/modules/inventario/actions')

    const base = {
      tipo_movimiento_id: ctx.tipoSalidaId,
      bodega_origen_id: ctx.producto.bodega_id,
      bodega_destino_id: null,
      fecha_nota: '2026-10-21',
      nota_referencia: '',
      observaciones: '',
      costo_total: null,
    }

    const producto = {
      tempId: crypto.randomUUID(),
      producto_id: ctx.producto.producto_id,
      producto_sku: ctx.producto.sku,
      producto_nombre: null,
      producto_pz_en_caja: null,
      piezas_sueltas: 0,
      caja_id: null,
      caja_codigo: null,
      stock_origen_cajas: disponible,
      stock_origen_piezas: 0,
    }

    // Caso A: el total cabe exactamente → la nota pasa.
    const ok = await validarDisponibilidadNotaAction({
      ...base,
      productos: [{ ...producto, cajas: disponible }],
    })

    // Caso B: una caja de más repartida en dos renglones (6 + 1) → faltante de 1.
    const excedido = await validarDisponibilidadNotaAction({
      ...base,
      productos: [
        { ...producto, cajas: disponible },
        { ...producto, tempId: crypto.randomUUID(), cajas: 1 },
      ],
    })

    // Si el stock se movió durante la validación (otro proceso confirmó notas),
    // los asserts dependerían de un valor que ya no es válido: se omiten.
    if ((await leerStock()) !== disponible) return

    expect(ok.ok).toBe(true)
    expect(ok.faltantes).toHaveLength(0)

    expect(excedido.ok).toBe(false)
    expect(excedido.faltantes).toHaveLength(1)

    const faltante = excedido.faltantes[0]
    expect(faltante.producto_id).toBe(ctx.producto.producto_id)
    expect(faltante.producto_sku).toBe(ctx.producto.sku)
    expect(faltante.renglones).toBe(2)
    expect(faltante.solicitado_cajas).toBe(disponible + 1)
    expect(faltante.disponible_cajas).toBe(disponible)
    expect(faltante.faltan_cajas).toBe(1)

    // El detalle por SKU debe estar listo para el mensaje de error.
    expect(excedido.disponible_por_clave[`${ctx.producto.producto_id}:0`]).toBeDefined()
  })

  it('no bloquea las entradas (no consumen stock)', async () => {
    if (!HAY_CREDENCIALES || !ctx) return

    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: tipo } = await supabase
      .from('cat_tipos_movimiento')
      .select('id')
      .eq('codigo', 'ENT')
      .maybeSingle()

    const { validarDisponibilidadNotaAction } = await import('@/modules/inventario/actions')

    const resultado = await validarDisponibilidadNotaAction({
      tipo_movimiento_id: (tipo as { id: number } | null)?.id ?? null,
      bodega_origen_id: ctx.producto.bodega_id,
      bodega_destino_id: null,
      fecha_nota: '2026-10-21',
      nota_referencia: '',
      observaciones: '',
      costo_total: null,
      productos: [
        {
          tempId: crypto.randomUUID(),
          producto_id: ctx.producto.producto_id,
          producto_sku: ctx.producto.sku,
          producto_nombre: null,
          producto_pz_en_caja: null,
          cajas: 9999,
          piezas_sueltas: 0,
          caja_id: null,
          caja_codigo: null,
          stock_origen_cajas: 0,
          stock_origen_piezas: 0,
        },
      ],
    })

    expect(resultado.ok).toBe(true)
    expect(resultado.modo).toBe('entrada')
  })
})
