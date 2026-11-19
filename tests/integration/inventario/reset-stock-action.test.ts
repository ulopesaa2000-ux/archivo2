// tests/integration/inventario/reset-stock-action.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  createClient: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchBodegasUsuario: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

vi.mock('@/modules/auth/queries', () => ({
  getCurrentUser: mocks.getCurrentUser,
  fetchBodegasUsuario: mocks.fetchBodegasUsuario,
}))

type StockRow = {
  id: number
  bodega_id: number
  producto_id: number
  caja_id: number | null
  cajas: number
  piezas_sueltas: number
}

type NotaFake = {
  id: number
  estado_id: number
  activo: boolean
  observaciones: string | null
  lineRowIds: number[]
}

type RpcCall = { fn: string; args: Record<string, unknown> }

function crearSupabaseFake(stock: StockRow[]) {
  const notas: NotaFake[] = []
  const rpcCalls: RpcCall[] = []
  let nextNotaId = 100

  function stockBuilder() {
    let bodegaId: number | null = null
    let cajasDistintasDe: number | null = null

    const builder = {
      select: () => builder,
      eq: (col: string, value: number) => {
        if (col === 'bodega_id') bodegaId = value
        return builder
      },
      neq: (col: string, value: number) => {
        if (col === 'cajas') cajasDistintasDe = value
        return builder
      },
      order: () => builder,
      range: (from: number, to: number) => {
        let rows = stock.filter((r) => r.bodega_id === bodegaId)
        if (cajasDistintasDe !== null) {
          rows = rows.filter((r) => r.cajas !== cajasDistintasDe)
        }
        rows = rows.sort((a, b) => a.id - b.id).slice(from, to + 1)
        return Promise.resolve({ data: rows, error: null })
      },
    }

    return builder
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'inventario_stock') return stockBuilder()

      if (table === 'bodegas') {
        const builder = {
          select: () => builder,
          eq: () => builder,
          single: () =>
            Promise.resolve({
              data: { id: 1, nombre: 'BODEGA TEST' },
              error: null,
            }),
        }
        return builder
      }

      if (table === 'cat_tipos_movimiento') {
        const builder = {
          select: () => builder,
          eq: () => builder,
          single: () => Promise.resolve({ data: { id: 4 }, error: null }),
        }
        return builder
      }

      if (table === 'cat_estados_nota') {
        const builder = {
          select: () => builder,
          eq: () => builder,
          single: () => Promise.resolve({ data: { id: 2 }, error: null }),
        }
        return builder
      }

      if (table === 'notas_inventario') {
        return {
          update: (values: Record<string, unknown>) => ({
            eq: (_col: string, notaId: number) => {
              const nota = notas.find((n) => n.id === notaId)
              if (!nota) return Promise.resolve({ data: null, error: null })

              if (values.estado_id === 2) {
                nota.estado_id = 2
                // Simula fn_procesar_nota_inventario: las líneas de la nota
                // descuentan sus cajas del stock.
                for (const rowId of nota.lineRowIds) {
                  const row = stock.find((r) => r.id === rowId)
                  if (row) row.cajas = 0
                }
              }

              if (values.activo === false) {
                nota.activo = false
                nota.observaciones = String(values.observaciones ?? '')
              }

              return Promise.resolve({ data: null, error: null })
            },
          }),
        }
      }

      throw new Error(`Tabla no mockeada: ${table}`)
    }),

    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })

      if (fn === 'sp_crear_nota') {
        const nota: NotaFake = {
          id: nextNotaId++,
          estado_id: 1,
          activo: true,
          observaciones: null,
          lineRowIds: [],
        }
        notas.push(nota)
        return Promise.resolve({
          data: [{ nota_id: nota.id, numero_nota: `N-TEST-${nota.id}` }],
          error: null,
        })
      }

      if (fn === 'sp_agregar_producto_nota') {
        const cajas = Number(args.p_cajas ?? 0)
        const piezas = Number(args.p_piezas_sueltas ?? 0)

        if (cajas === 0 && piezas === 0) {
          return Promise.resolve({
            data: null,
            error: { message: 'Debe ingresar al menos una cantidad de cajas o piezas.' },
          })
        }

        if (piezas < 0) {
          return Promise.resolve({
            data: null,
            error: { message: 'chk_detalle_piezas_no_negativas' },
          })
        }

        const nota = notas[notas.length - 1]
        const row = stock.find(
          (r) =>
            r.producto_id === Number(args.p_producto_id) &&
            (r.caja_id ?? null) === (args.p_caja_id ?? null)
        )
        if (nota && row) nota.lineRowIds.push(row.id)

        return Promise.resolve({ data: null, error: null })
      }

      throw new Error(`RPC no mockeado: ${fn}`)
    }),
  }

  return { supabase, rpcCalls, notas }
}

describe('resetStockCeroBodegaAction', () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset()
    mocks.getCurrentUser.mockResolvedValue({
      id: 1,
      auth_user_id: 'auth-superadmin',
      rol_id: 6,
      rol: { id: 6, nombre: 'Super Admin', nivel_acceso: 1 },
      bodegas: [],
      bodega_ids: [],
      permisos: { es_super_admin: true },
    })
    mocks.fetchBodegasUsuario.mockResolvedValue([{ id: 1, nombre: 'BODEGA TEST' }])
  })

  it('cierra solo cajas y no deja que las piezas legacy bloqueen el reset', async () => {
    const stock: StockRow[] = [
      { id: 1, bodega_id: 1, producto_id: 10, caja_id: null, cajas: 3, piezas_sueltas: 0 },
      { id: 2, bodega_id: 1, producto_id: 20, caja_id: null, cajas: 0, piezas_sueltas: 5 },
      { id: 3, bodega_id: 1, producto_id: 30, caja_id: null, cajas: 2, piezas_sueltas: 4 },
    ]
    const { supabase, rpcCalls } = crearSupabaseFake(stock)
    mocks.createClient.mockResolvedValue(supabase)

    const { resetStockCeroBodegaAction } = await import('@/modules/config/inventory-reset-actions')
    const result = await resetStockCeroBodegaAction(1)

    expect(result.success).toBe(true)
    expect(result.totalLineas).toBe(2)
    expect(result.notaIds).toHaveLength(1)

    const addCalls = rpcCalls.filter((c) => c.fn === 'sp_agregar_producto_nota')
    expect(addCalls).toHaveLength(2)
    expect(addCalls.map((c) => c.args.p_producto_id)).toEqual([10, 30])

    for (const call of addCalls) {
      expect(call.args.p_piezas_sueltas).toBe(0)
      expect(Number(call.args.p_cajas)).toBeLessThan(0)
    }

    // La fila 2 (cajas = 0, piezas = 5) nunca se envía al RPC.
    expect(addCalls.some((c) => c.args.p_producto_id === 20)).toBe(false)

    // Las cajas quedaron en 0; las piezas legacy siguen intactas.
    expect(stock.find((r) => r.id === 1)?.cajas).toBe(0)
    expect(stock.find((r) => r.id === 2)?.cajas).toBe(0)
    expect(stock.find((r) => r.id === 2)?.piezas_sueltas).toBe(5)
    expect(stock.find((r) => r.id === 3)?.cajas).toBe(0)
    expect(stock.find((r) => r.id === 3)?.piezas_sueltas).toBe(4)
  })

  it('reporta éxito cuando la bodega solo tiene piezas legacy', async () => {
    const stock: StockRow[] = [
      { id: 1, bodega_id: 1, producto_id: 10, caja_id: null, cajas: 0, piezas_sueltas: 7 },
    ]
    const { supabase, rpcCalls } = crearSupabaseFake(stock)
    mocks.createClient.mockResolvedValue(supabase)

    const { resetStockCeroBodegaAction } = await import('@/modules/config/inventory-reset-actions')
    const result = await resetStockCeroBodegaAction(1)

    expect(result.success).toBe(true)
    expect(result.totalLineas).toBe(0)
    expect(result.notaIds).toEqual([])
    expect(rpcCalls).toHaveLength(0)
  })
})
