// modules/inventario/historico-queries.ts
'use server'

/**
 * Capa de DATOS del Stock Histórico (AGENTS.md 3.7.1).
 * Toda la aritmética vive en `lib/inventario/stock-historico.ts` (motor puro).
 * Este módulo solo lee de Supabase y proyecta al modelo de tipos.
 *
 * Reglas del modelo:
 *  - Solo notas CONF/MODF con `activo = true`.
 *  - Solo CAJAS (se ignora `piezas_sueltas`).
 *  - Corte por `fecha_nota`.
 */

import { createClient } from '@/lib/supabase/server'
import {
  aplicarRollback,
  calcularRollback,
  construirKardex,
  corteHasta,
  diaAnterior,
  detectarAjustesDirectos,
  efectoEnBodega,
  inicioDesde,
  reconciliarPorBodega,
  type MovimientoHistorico,
  type StockRow,
} from '@/lib/inventario/stock-historico'
import type { BodegaRow } from '@/lib/types/tables'
import { compareFamiliaAsc, compareSkuAsc } from '@/lib/inventario/familias-orden'
import type {
  AjusteDirectoHistorico,
  DescuadreBodega,
  KardexFila,
  KardexResultado,
  MovimientoRevertido,
  StockHistoricoFila,
  StockHistoricoResultado,
} from './types'

type ProductoMeta = {
  sku: string
  descripcion: string | null
  familia: string | null
  marca: string | null
  pz_en_caja: number | null
}

type BodegaMeta = {
  id: number
  nombre: string
  ciudad: string
}

function metaBodegas(bodegas: BodegaRow[]): Map<number, BodegaMeta> {
  const map = new Map<number, BodegaMeta>()
  for (const b of bodegas) {
    map.set(b.id, {
      id: b.id,
      nombre: b.nombre,
      ciudad: (b.ciudad || 'VIRTUAL').trim().toUpperCase(),
    })
  }
  return map
}

function normalizaTipo(codigo: unknown): MovimientoHistorico['tipo_codigo'] | null {
  const c = String(codigo || '').toUpperCase()
  if (c === 'ENT' || c === 'SAL' || c === 'TRF' || c === 'AJU' || c === 'DEV') return c
  return null
}

/**
 * Ids de los estados que aplicaron stock (CONF, MODF).
 *
 * IMPORTANTE: el filtro debe hacerse por `notas_inventario.estado_id` (FK) y NO por
 * `notas_inventario.cat_estados_nota.codigo`. Un filtro sobre un embed anidado
 * (nota → detalle → estado) lo aplica PostgREST con LEFT JOIN: deja la fila padre
 * y anula el embed, en vez de excluirla. Eso hacía pasar notas PEND como CONF.
 */
async function fetchEstadoIdsAplicables(): Promise<number[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cat_estados_nota')
    .select('id')
    .in('codigo', ['CONF', 'MODF'])
  if (error) {
    console.error('Error fetchEstadoIdsAplicables:', error.message)
    return []
  }
  return (data ?? []).map((e) => Number(e.id))
}

/** Catálogos de tipos y estados (pocos registros) cacheados por proceso. */
type CatalogosMov = {
  estados: Map<number, string>
  tipos: Map<number, { codigo: string; afecta: number }>
}

let catalogosCache: CatalogosMov | null = null

async function fetchCatalogosMovimiento(): Promise<CatalogosMov> {
  if (catalogosCache) return catalogosCache
  const supabase = await createClient()
  const [estadosRes, tiposRes] = await Promise.all([
    supabase.from('cat_estados_nota').select('id, codigo'),
    supabase.from('cat_tipos_movimiento').select('id, codigo, afecta_inventario'),
  ])
  catalogosCache = {
    estados: new Map((estadosRes.data ?? []).map((e) => [Number(e.id), String(e.codigo).toUpperCase()])),
    tipos: new Map(
      (tiposRes.data ?? []).map((t) => [
        Number(t.id),
        { codigo: String(t.codigo).toUpperCase(), afecta: Number(t.afecta_inventario ?? 0) },
      ])
    ),
  }
  return catalogosCache
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecturas base
// ─────────────────────────────────────────────────────────────────────────────

type FilaStockCruda = {
  bodega_id: number
  producto_id: number
  cajas: number
  updated_at: string | null
  updated_by: number | null
  producto: {
    id: number
    sku_base: string
    descripcion: string | null
    nombre: string | null
    familia: string | null
    pz_en_caja: number | null
    marca: { nombre: string } | { nombre: string }[] | null
  } | { id: number; sku_base: string; descripcion: string | null; nombre: string | null; familia: string | null; pz_en_caja: number | null; marca: { nombre: string } | { nombre: string }[] | null }[] | null
}

/**
 * Stock actual (nivel producto) del alcance, con metadata de producto.
 * Solo filas de bodega (caja_id NULL) y productos activos — mismo criterio que
 * el panel de stock para que las cifras sean comparables.
 */
export async function fetchStockHistoricoFilas(
  bodegaIds: number[]
): Promise<{ filas: StockRow[]; productos: Map<number, ProductoMeta> }> {
  if (bodegaIds.length === 0) return { filas: [], productos: new Map() }
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inventario_stock')
    .select(`
      bodega_id, producto_id, cajas, updated_at, updated_by,
      producto:productos!inner (
        id, sku_base, descripcion, nombre, familia, pz_en_caja,
        marca:cat_marcas!productos_marca_id_fkey ( nombre )
      )
    `)
    .in('bodega_id', bodegaIds)
    .is('caja_id', null)
    .eq('producto.activo', true)

  if (error) {
    console.error('Error fetchStockHistoricoFilas:', error.message)
    return { filas: [], productos: new Map() }
  }

  const filas: StockRow[] = []
  const productos = new Map<number, ProductoMeta>()

  for (const raw of (data ?? []) as unknown as FilaStockCruda[]) {
    filas.push({
      bodega_id: Number(raw.bodega_id),
      producto_id: Number(raw.producto_id),
      cajas: Number(raw.cajas) || 0,
      updated_at: raw.updated_at ?? null,
      updated_by: raw.updated_by ?? null,
    })

    const prod = Array.isArray(raw.producto) ? raw.producto[0] : raw.producto
    if (!prod) continue
    const marca = prod.marca ? (Array.isArray(prod.marca) ? prod.marca[0] : prod.marca) : null
    if (!productos.has(Number(prod.id))) {
      productos.set(Number(prod.id), {
        sku: prod.sku_base || '',
        descripcion: prod.descripcion || prod.nombre || null,
        familia: prod.familia || null,
        marca: marca?.nombre || null,
        pz_en_caja: prod.pz_en_caja ?? null,
      })
    }
  }

  return { filas, productos }
}

/**
 * Movimientos confirmados (CONF/MODF, `activo = true`) con su detalle de producto.
 * `desde`/`hasta` son límites INCLUSIVOS en formato ISO naive.
 *
 * Estrategia (presupuesto de queries, AGENTS.md 3.7.2):
 *   1) Cabeceras de notas (pocos campos, sin joins embebidos).
 *   2) Detalles en chunks de 200 `nota_id` (evita el embed `notas_inventario!inner`,
 *      que multiplica el coste del join).
 *   3) Join en memoria.
 */
export async function fetchMovimientosConfirmados(opts: {
  desde?: string | null
  hasta?: string | null
  desdeExclusivo?: boolean
  hastaExclusivo?: boolean
  bodegaIds?: number[] | null
}): Promise<MovimientoHistorico[]> {
  const supabase = await createClient()
  const estadoIds = await fetchEstadoIdsAplicables()
  if (estadoIds.length === 0) return []

  // ── 1) Cabeceras ──
  let q = supabase
    .from('notas_inventario')
    .select(
      'id, numero_nota, fecha_nota, fecha_confirmacion, bodega_origen_id, bodega_destino_id, estado_id, tipo_movimiento_id, activo'
    )
    .in('estado_id', estadoIds)
    .eq('activo', true)

  if (opts.desde) {
    q = opts.desdeExclusivo ? q.gt('fecha_nota', opts.desde) : q.gte('fecha_nota', opts.desde)
  }
  if (opts.hasta) {
    q = opts.hastaExclusivo ? q.lt('fecha_nota', opts.hasta) : q.lte('fecha_nota', opts.hasta)
  }
  if (opts.bodegaIds && opts.bodegaIds.length > 0) {
    const ids = opts.bodegaIds.join(',')
    q = q.or(`bodega_origen_id.in.(${ids}),bodega_destino_id.in.(${ids})`)
  }

  const { data: notasRaw, error } = await q
  if (error) {
    console.error('Error fetchMovimientosConfirmados (cabeceras):', error.message)
    return []
  }

  const cat = await fetchCatalogosMovimiento()
  const notas = new Map<number, MovimientoHistorico>()
  for (const n of (notasRaw ?? []) as any[]) {
    const tipo = cat.tipos.get(Number(n.tipo_movimiento_id))
    const tipoCodigo = normalizaTipo(tipo?.codigo)
    if (!tipoCodigo) continue
    const estadoCodigo = cat.estados.get(Number(n.estado_id)) ?? ''
    if (estadoCodigo !== 'CONF' && estadoCodigo !== 'MODF') continue
    notas.set(Number(n.id), {
      nota_id: Number(n.id),
      numero_nota: String(n.numero_nota || ''),
      fecha_nota: n.fecha_nota || '',
      fecha_confirmacion: n.fecha_confirmacion || null,
      tipo_codigo: tipoCodigo,
      afecta_inventario: Number(tipo?.afecta ?? 0),
      estado_codigo: estadoCodigo,
      activo: true,
      bodega_origen_id: Number(n.bodega_origen_id),
      bodega_destino_id: n.bodega_destino_id != null ? Number(n.bodega_destino_id) : null,
      producto_id: -1,
      cajas: 0,
    })
  }

  const notaIds = Array.from(notas.keys())
  if (notaIds.length === 0) return []

  // ── 2) Detalles en chunks de 200 ──
  const detalles: any[] = []
  for (let i = 0; i < notaIds.length; i += 200) {
    const chunk = notaIds.slice(i, i + 200)
    const { data, error: errDet } = await supabase
      .from('nota_detalle_productos')
      .select('nota_id, producto_id, cajas')
      .in('nota_id', chunk)
    if (errDet) {
      console.error('Error fetchMovimientosConfirmados (detalles):', errDet.message)
      continue
    }
    detalles.push(...(data ?? []))
  }

  // ── 3) Join ──
  const out: MovimientoHistorico[] = []
  for (const d of detalles) {
    const base = notas.get(Number(d.nota_id))
    if (!base) continue
    out.push({
      ...base,
      producto_id: Number(d.producto_id),
      cajas: Number(d.cajas) || 0,
    })
  }
  return out
}

/**
 * Cabeceras de notas confirmadas (sin detalle) — para detectar ajustes directos.
 *
 * INCLUYE notas con `activo = false`: una nota desactivada (borrado suave) YA movió
 * el stock cuando se confirmó, así que su UPDATE no es un "ajuste directo". Excluirlas
 * generaba falsos positivos en las bodegas con importaciones masivas.
 */
export async function fetchNotasConfirmadasHeaders(bodegaIds: number[]): Promise<MovimientoHistorico[]> {
  if (bodegaIds.length === 0) return []
  const estadoIds = await fetchEstadoIdsAplicables()
  if (estadoIds.length === 0) return []
  const supabase = await createClient()
  const ids = bodegaIds.join(',')

  const { data, error } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, fecha_nota, fecha_confirmacion,
      bodega_origen_id, bodega_destino_id, activo, estado_id, tipo_movimiento_id
    `)
    .in('estado_id', estadoIds)
    .or(`bodega_origen_id.in.(${ids}),bodega_destino_id.in.(${ids})`)

  if (error) {
    console.error('Error fetchNotasConfirmadasHeaders:', error.message)
    return []
  }

  const out: MovimientoHistorico[] = []
  const cat = await fetchCatalogosMovimiento()
  for (const n of (data ?? []) as any[]) {
    const tipo = cat.tipos.get(Number(n.tipo_movimiento_id))
    const tipoCodigo = normalizaTipo(tipo?.codigo)
    if (!tipoCodigo) continue
    const estadoCodigo = cat.estados.get(Number(n.estado_id)) ?? ''
    if (estadoCodigo !== 'CONF' && estadoCodigo !== 'MODF') continue
    out.push({
      nota_id: Number(n.id),
      numero_nota: String(n.numero_nota || ''),
      fecha_nota: n.fecha_nota || '',
      fecha_confirmacion: n.fecha_confirmacion || null,
      tipo_codigo: tipoCodigo,
      afecta_inventario: Number(tipo?.afecta ?? 0),
      estado_codigo: estadoCodigo,
      activo: n.activo !== false,
      bodega_origen_id: Number(n.bodega_origen_id),
      bodega_destino_id: n.bodega_destino_id != null ? Number(n.bodega_destino_id) : null,
      producto_id: -1,
      cajas: 0,
    })
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista A — Corte (stock a la fecha)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchStockHistorico(opts: {
  fechaCorte: string
  bodegaIds: number[]
  bodegas: BodegaRow[]
  q?: string
  page?: number
  limit?: number
}): Promise<StockHistoricoResultado> {
  const corte = corteHasta(opts.fechaCorte)
  const bodegaIds = opts.bodegaIds
  const metaBod = metaBodegas(opts.bodegas)

  const [stockRes, movimientos, cabeceras] = await Promise.all([
    fetchStockHistoricoFilas(bodegaIds),
    // TODOS los movimientos activos: sirven para el rollback (se filtra por fecha)
    // y para la reconciliación por bodega (histórico completo).
    fetchMovimientosConfirmados({ bodegaIds }),
    fetchNotasConfirmadasHeaders(bodegaIds),
  ])

  const rollback = calcularRollback(movimientos, corte)
  const base = aplicarRollback(stockRes.filas, rollback)

  let filas: StockHistoricoFila[] = base.map((f) => {
    const prod = stockRes.productos.get(f.producto_id)
    const bod = metaBod.get(f.bodega_id)
    return {
      bodega_id: f.bodega_id,
      bodega_nombre: bod?.nombre ?? `Bodega ${f.bodega_id}`,
      ciudad: bod?.ciudad ?? 'VIRTUAL',
      producto_id: f.producto_id,
      producto_sku: prod?.sku ?? '',
      producto_descripcion: prod?.descripcion ?? null,
      producto_familia: prod?.familia ?? null,
      marca_nombre: prod?.marca ?? null,
      pz_en_caja: prod?.pz_en_caja ?? null,
      cajas_hoy: f.cajas_hoy,
      ajuste: f.ajuste,
      cajas_historicas: f.cajas_historicas,
      n_notas: f.n_notas,
      valor_inconsistente: f.valor_inconsistente,
    }
  })

  // Filtro por texto (SKU / descripción / familia / bodega) antes de paginar.
  const q = (opts.q ?? '').trim().toLowerCase()
  if (q) {
    filas = filas.filter((f) =>
      f.producto_sku.toLowerCase().includes(q) ||
      (f.producto_descripcion ?? '').toLowerCase().includes(q) ||
      (f.producto_familia ?? '').toLowerCase().includes(q) ||
      f.bodega_nombre.toLowerCase().includes(q)
    )
  }

  // Orden canónico: familia A→Z (F000-000C al final) → SKU → bodega.
  filas.sort((a, b) => {
    const fam = compareFamiliaAsc(a.producto_familia || 'Sin Familia', b.producto_familia || 'Sin Familia')
    if (fam !== 0) return fam
    const sku = compareSkuAsc(a.producto_sku, b.producto_sku)
    if (sku !== 0) return sku
    return a.bodega_id - b.bodega_id
  })

  const totales = filas.reduce(
    (acc, f) => ({
      hoy: acc.hoy + f.cajas_hoy,
      ajuste: acc.ajuste + f.ajuste,
      historico: acc.historico + f.cajas_historicas,
    }),
    { hoy: 0, ajuste: 0, historico: 0 }
  )

  const porBodegaMap = new Map<number, { bodega_id: number; bodega_nombre: string; ciudad: string; hoy: number; ajuste: number; historico: number }>()
  const porCiudadMap = new Map<string, { ciudad: string; hoy: number; ajuste: number; historico: number }>()
  for (const f of filas) {
    const b = porBodegaMap.get(f.bodega_id) ?? {
      bodega_id: f.bodega_id,
      bodega_nombre: f.bodega_nombre,
      ciudad: f.ciudad,
      hoy: 0,
      ajuste: 0,
      historico: 0,
    }
    b.hoy += f.cajas_hoy
    b.ajuste += f.ajuste
    b.historico += f.cajas_historicas
    porBodegaMap.set(f.bodega_id, b)

    const c = porCiudadMap.get(f.ciudad) ?? { ciudad: f.ciudad, hoy: 0, ajuste: 0, historico: 0 }
    c.hoy += f.cajas_hoy
    c.ajuste += f.ajuste
    c.historico += f.cajas_historicas
    porCiudadMap.set(f.ciudad, c)
  }

  const ajustesDetectados = detectarAjustesDirectos(stockRes.filas, cabeceras, { corte })
  const ajustesDirectos: AjusteDirectoHistorico[] = ajustesDetectados.map((a) => ({
    bodega_id: a.bodega_id,
    bodega_nombre: metaBod.get(a.bodega_id)?.nombre ?? `Bodega ${a.bodega_id}`,
    fecha: a.fecha,
    filas_afectadas: a.filas_afectadas,
    usuario_id: a.usuario_id,
  }))

  // Reconciliación: stock actual vs suma de efectos de las notas activas.
  const reconciliacion = reconciliarPorBodega(stockRes.filas, movimientos)
  const conAjustePostCorte = new Set(ajustesDetectados.map((a) => a.bodega_id))
  const descuadres: DescuadreBodega[] = Array.from(reconciliacion.values())
    .filter((r) => Math.abs(r.dif) > 0.0001)
    .map((r) => ({
      bodega_id: r.bodega_id,
      bodega_nombre: metaBod.get(r.bodega_id)?.nombre ?? `Bodega ${r.bodega_id}`,
      ciudad: metaBod.get(r.bodega_id)?.ciudad ?? 'VIRTUAL',
      dif: r.dif,
      claves_descuadradas: r.claves_descuadradas,
      tieneAjusteDirectoPostCorte: conAjustePostCorte.has(r.bodega_id),
    }))
    .sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif))

  const notasRevertidas = new Set<number>()
  const movimientosRevertidos: MovimientoRevertido[] = []
  for (const [clave, entry] of rollback.entries()) {
    const bodegaId = Number(clave.split('|')[0])
    for (const n of entry.notas) {
      notasRevertidas.add(n.nota_id)
      movimientosRevertidos.push({
        nota_id: n.nota_id,
        numero_nota: n.numero_nota,
        fecha_nota: n.fecha_nota,
        fecha_confirmacion: n.fecha_confirmacion,
        tipo_codigo: n.tipo_codigo,
        estado_codigo: n.estado_codigo,
        bodega_origen_id: n.bodega_origen_id,
        bodega_destino_id: n.bodega_destino_id,
        producto_id: n.producto_id,
        cajas: n.cajas,
        efecto: efectoEnBodega(n, bodegaId),
      })
    }
  }

  const conStock = new Set(filas.map((f) => f.bodega_id))
  const totalFilas = filas.length
  const limit = Math.max(opts.limit ?? 50, 1)
  const page = Math.max(opts.page ?? 1, 1)
  const filasPagina = filas.slice((page - 1) * limit, page * limit)

  return {
    fechaCorte: opts.fechaCorte,
    filas: filasPagina,
    totalFilas,
    pagina: page,
    limite: limit,
    totales,
    porBodega: Array.from(porBodegaMap.values()).sort((a, b) => a.bodega_id - b.bodega_id),
    porCiudad: Array.from(porCiudadMap.values()).sort((a, b) => a.ciudad.localeCompare(b.ciudad)),
    ajustesDirectos,
    descuadres,
    negativos: filas.filter((f) => f.valor_inconsistente).length,
    notasRevertidas: notasRevertidas.size,
    movimientosRevertidos,
    nMovimientos: movimientos.length,
    bodegasSinStock: bodegaIds.filter((id) => !conStock.has(id)).length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista B — Kardex (movimientos del periodo con saldo)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchKardexHistorico(opts: {
  desde: string
  hasta: string
  bodegaIds: number[]
  bodegas: BodegaRow[]
  q?: string
  page?: number
  limit?: number
}): Promise<KardexResultado> {
  const metaBod = metaBodegas(opts.bodegas)
  const desdeIso = inicioDesde(opts.desde)
  const hastaIso = corteHasta(opts.hasta)
  // Movimientos posteriores al día previo del periodo: sirven para el saldo inicial
  // (stock al cierre de `desde - 1`) y para el saldo final.
  const desdePrevio = corteHasta(diaAnterior(opts.desde))

  const [stockRes, movimientos] = await Promise.all([
    fetchStockHistoricoFilas(opts.bodegaIds),
    fetchMovimientosConfirmados({ desde: desdePrevio, desdeExclusivo: true, bodegaIds: opts.bodegaIds }),
  ])

  const rollbackInicial = calcularRollback(movimientos, desdePrevio)
  const rollbackFinal = calcularRollback(movimientos, hastaIso)

  const saldoInicial = new Map<string, number>()
  for (const f of stockRes.filas) {
    const clave = `${f.bodega_id}|${f.producto_id}`
    const delta = rollbackInicial.get(clave)?.delta ?? 0
    saldoInicial.set(clave, (Number(f.cajas) || 0) - delta)
  }

  const metaProducto = new Map<number, { sku: string | null; descripcion: string | null }>()
  for (const [id, p] of stockRes.productos.entries()) {
    metaProducto.set(id, { sku: p.sku || null, descripcion: p.descripcion || null })
  }

  const k = construirKardex(
    movimientos,
    { desde: desdeIso, hasta: hastaIso },
    saldoInicial,
    metaProducto
  )

  const filas: KardexFila[] = k.map((f) => {
    const bod = metaBod.get(f.bodega_id)
    const prod = stockRes.productos.get(f.producto_id)
    return {
      clave: f.clave,
      bodega_id: f.bodega_id,
      bodega_nombre: bod?.nombre ?? `Bodega ${f.bodega_id}`,
      ciudad: bod?.ciudad ?? 'VIRTUAL',
      producto_id: f.producto_id,
      producto_sku: prod?.sku ?? f.producto_sku ?? '',
      producto_descripcion: prod?.descripcion ?? f.producto_descripcion ?? null,
      producto_familia: prod?.familia ?? null,
      nota_id: f.nota_id,
      numero_nota: f.numero_nota,
      fecha_nota: f.fecha_nota,
      fecha_confirmacion: f.fecha_confirmacion,
      tipo_codigo: f.tipo_codigo,
      tipo_nombre: f.tipo_codigo,
      estado_codigo: f.estado_codigo,
      bodega_origen_id: f.bodega_origen_id,
      bodega_origen_nombre: metaBod.get(f.bodega_origen_id)?.nombre ?? `Bodega ${f.bodega_origen_id}`,
      bodega_destino_id: f.bodega_destino_id,
      bodega_destino_nombre: f.bodega_destino_id != null ? (metaBod.get(f.bodega_destino_id)?.nombre ?? null) : null,
      cajas: f.cajas,
      efecto: f.efecto,
      saldo: f.saldo,
    }
  })

  const q = (opts.q ?? '').trim().toLowerCase()
  const filasFiltradas = q
    ? filas.filter((f) =>
        f.producto_sku.toLowerCase().includes(q) ||
        (f.producto_descripcion ?? '').toLowerCase().includes(q) ||
        (f.producto_familia ?? '').toLowerCase().includes(q) ||
        f.numero_nota.toLowerCase().includes(q)
      )
    : filas

  let entradas = 0
  let salidas = 0
  for (const f of filas) {
    if (f.efecto > 0) entradas += f.efecto
    else if (f.efecto < 0) salidas += Math.abs(f.efecto)
  }

  // Saldo inicial y final (nivel alcance) con el mismo motor.
  let saldoInicialTotal = 0
  let saldoFinalTotal = 0
  for (const f of stockRes.filas) {
    const clave = `${f.bodega_id}|${f.producto_id}`
    saldoInicialTotal += saldoInicial.get(clave) ?? 0
    saldoFinalTotal += (Number(f.cajas) || 0) - (rollbackFinal.get(clave)?.delta ?? 0)
  }

  const limit = Math.max(opts.limit ?? 50, 1)
  const page = Math.max(opts.page ?? 1, 1)

  return {
    desde: opts.desde,
    hasta: opts.hasta,
    filas: filasFiltradas.slice((page - 1) * limit, page * limit),
    totalFilas: filasFiltradas.length,
    pagina: page,
    limite: limit,
    totales: {
      entradas,
      salidas,
      saldoInicial: saldoInicialTotal,
      saldoFinal: saldoFinalTotal,
    },
    notasDistintas: new Set(filas.map((f) => f.nota_id)).size,
  }
}
