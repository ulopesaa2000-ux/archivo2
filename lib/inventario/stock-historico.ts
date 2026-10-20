// lib/inventario/stock-historico.ts
/**
 * Motor puro del Stock Histórico.
 *
 * SIN React, SIN Supabase: solo funciones y tipos (AGENTS.md 3.7.1).
 * Es la única fuente de verdad de la REGLA DE SIGNOS por tipo de movimiento.
 *
 * Modelo:
 *   stock_a_fecha(D) = stock_actual − Σ(efecto de notas CONF con fecha_nota > D)
 *
 * Reglas (modelo MD `stock-historico.md`):
 *   - Unidad única: CAJAS. `piezas_sueltas` no entra en ningún cálculo.
 *   - Solo notas CONF / MODF con `activo = true` (nunca CANC, PEND, PROC ni ocultas).
 *   - Granularidad: producto × bodega (la unidad de stock es `inventario_stock.producto_id`).
 *   - Corte por `fecha_nota` (fecha del documento), fallback `fecha_confirmacion`.
 *   - Comparación de fechas por convención naive: los timestamps se guardan UTC naive
 *     en Supabase y el resto de la app los compara como strings `YYYY-MM-DDTHH:mm:ss`
 *     (mismo criterio que `fetchNotas` en modules/inventario/queries.ts).
 */

export type TipoMovCodigo = 'ENT' | 'SAL' | 'TRF' | 'AJU' | 'DEV'

/** Estados que aplicaron stock (dispararon el trigger `fn_procesar_nota_inventario`). */
export const ESTADOS_APLICADOS = ['CONF', 'MODF'] as const

export type MovimientoHistorico = {
  nota_id: number
  numero_nota: string
  fecha_nota: string
  fecha_confirmacion: string | null
  tipo_codigo: TipoMovCodigo
  afecta_inventario: number
  estado_codigo: string
  activo: boolean
  bodega_origen_id: number
  bodega_destino_id: number | null
  producto_id: number
  /** Solo cajas (el motor ignora `piezas_sueltas` por diseño del modelo). */
  cajas: number
}

export type StockRow = {
  bodega_id: number
  producto_id: number
  cajas: number
  updated_at?: string | null
  updated_by?: number | null
}

export type DeltaEntry = {
  /** Efecto firmado acumulado (+ entra, − sale) sobre la bodega. */
  delta: number
  notas: MovimientoHistorico[]
}

export type Ventana = {
  /** inclusivo (string `YYYY-MM-DD` o ISO) */
  desde?: string | null
  /** inclusivo (string `YYYY-MM-DD` o ISO) */
  hasta?: string | null
}

export type FilaStockHistorico = {
  bodega_id: number
  producto_id: number
  cajas_hoy: number
  /** Ajuste aplicado para llegar a la fecha de corte (se suma a `cajas_hoy`). */
  ajuste: number
  cajas_historicas: number
  n_notas: number
  notas: MovimientoHistorico[]
  /** El corte documental dejó la fila en negativo → inconsistencia a señalar. */
  valor_inconsistente: boolean
}

export type FilaKardex = {
  clave: string
  bodega_id: number
  producto_id: number
  nota_id: number
  numero_nota: string
  fecha_nota: string
  fecha_confirmacion: string | null
  tipo_codigo: TipoMovCodigo
  estado_codigo: string
  bodega_origen_id: number
  bodega_destino_id: number | null
  producto_sku: string | null
  producto_descripcion: string | null
  cajas: number
  /** Efecto firmado sobre la bodega del alcance. */
  efecto: number
  /** Saldo acumulado del producto × bodega después de este movimiento. */
  saldo: number
}

export type AjusteDirecto = {
  bodega_id: number
  fecha: string
  filas_afectadas: number
  usuario_id: number | null
}

/**
 * Reconciliación por bodega: stock actual vs suma de efectos de las notas activas.
 * `dif` ≠ 0 ⇒ hay movimiento de stock que las notas activas no explican.
 */
export type ReconciliacionBodega = {
  bodega_id: number
  stock_actual: number
  notas: number
  dif: number
  claves_descuadradas: number
}

export type ResumenBodega = {
  hoy: number
  ajuste: number
  historico: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Matriz (vista agrupada): producto × columnas (bodega o ciudad)
// ─────────────────────────────────────────────────────────────────────────────

/** Fila plana que devuelve la capa de datos: un producto en una bodega. */
export type FilaPlanaHistorico = {
  bodega_id: number
  bodega_nombre: string
  ciudad: string
  producto_id: number
  producto_sku: string
  producto_descripcion: string | null
  producto_familia: string | null
  marca_nombre: string | null
  pz_en_caja: number | null
  cajas_hoy: number
  /** Ajuste aplicado para llegar al corte (se suma a `cajas_hoy`). */
  ajuste: number
  cajas_historicas: number
  /** Cajas que ENTRARON después del corte (se revierten → restan). */
  entradas_posteriores: number
  /** Cajas que SALIERON después del corte (se revierten → suman). */
  salidas_posteriores: number
  n_notas: number
  valor_inconsistente: boolean
}

export type TipoAgrupacionMatriz = 'bodega' | 'ciudad'

export type DefinicionColumnaMatriz = {
  /** `b:<id>` para bodega, `c:<ciudad>` para ciudad. */
  key: string
  tipo: TipoAgrupacionMatriz
  id: number | string
  nombre: string
  ciudad: string | null
  orden: number
}

export type CeldaMatriz = {
  cajas_hoy: number
  ajuste: number
  cajas_historicas: number
  entradas_posteriores: number
  salidas_posteriores: number
  n_notas: number
  valor_inconsistente: boolean
}

export type FilaMatriz = {
  producto_id: number
  producto_sku: string
  producto_descripcion: string | null
  producto_familia: string | null
  marca_nombre: string | null
  pz_en_caja: number | null
  celdas: Record<string, CeldaMatriz>
  total_hoy: number
  total_ajuste: number
  total_historicas: number
  total_entradas: number
  total_salidas: number
  n_notas: number
  valor_inconsistente: boolean
}

export type ColumnaMatriz = DefinicionColumnaMatriz & {
  total_hoy: number
  total_ajuste: number
  total_historicas: number
  total_entradas: number
  total_salidas: number
}

export type MatrizHistorica = {
  filas: FilaMatriz[]
  columnas: ColumnaMatriz[]
  totales: {
    hoy: number
    ajuste: number
    historicas: number
    entradas: number
    salidas: number
  }
}

/** Columna a la que pertenece una fila, según la agrupación pedida. */
export function claveColumnaMatriz(
  fila: Pick<FilaPlanaHistorico, 'bodega_id' | 'ciudad'>,
  tipo: TipoAgrupacionMatriz
): string {
  return tipo === 'ciudad' ? `c:${fila.ciudad}` : `b:${fila.bodega_id}`
}

/**
 * Convierte las filas planas (producto × bodega) en una matriz producto × columnas.
 *
 * - La agrupación decide si cada columna es una bodega o una ciudad.
 * - Las celdas acumulan: cajas de hoy, ajuste, cajas al corte y el desglose de
 *   movimientos posteriores (entradas/salidas revertidas).
 * - Las columnas se devuelven con sus totales (pie de la tabla).
 */
export function pivotarMatriz(
  filas: FilaPlanaHistorico[],
  definiciones: DefinicionColumnaMatriz[],
  tipo: TipoAgrupacionMatriz
): MatrizHistorica {
  const columnasPorKey = new Map<string, ColumnaMatriz>()
  for (const d of definiciones) {
    columnasPorKey.set(d.key, {
      ...d,
      total_hoy: 0,
      total_ajuste: 0,
      total_historicas: 0,
      total_entradas: 0,
      total_salidas: 0,
    })
  }

  const porProducto = new Map<number, FilaMatriz>()
  const ordenProductos: number[] = []

  for (const f of filas) {
    const key = claveColumnaMatriz(f, tipo)
    const columna = columnasPorKey.get(key)
    if (!columna) continue

    let fila = porProducto.get(f.producto_id)
    if (!fila) {
      fila = {
        producto_id: f.producto_id,
        producto_sku: f.producto_sku,
        producto_descripcion: f.producto_descripcion,
        producto_familia: f.producto_familia,
        marca_nombre: f.marca_nombre,
        pz_en_caja: f.pz_en_caja,
        celdas: {},
        total_hoy: 0,
        total_ajuste: 0,
        total_historicas: 0,
        total_entradas: 0,
        total_salidas: 0,
        n_notas: 0,
        valor_inconsistente: false,
      }
      porProducto.set(f.producto_id, fila)
      ordenProductos.push(f.producto_id)
    }

    const celda = fila.celdas[key] ?? {
      cajas_hoy: 0,
      ajuste: 0,
      cajas_historicas: 0,
      entradas_posteriores: 0,
      salidas_posteriores: 0,
      n_notas: 0,
      valor_inconsistente: false,
    }
    celda.cajas_hoy += f.cajas_hoy
    celda.ajuste += f.ajuste
    celda.cajas_historicas += f.cajas_historicas
    celda.entradas_posteriores += f.entradas_posteriores
    celda.salidas_posteriores += f.salidas_posteriores
    celda.n_notas += f.n_notas
    celda.valor_inconsistente = celda.valor_inconsistente || f.valor_inconsistente
    fila.celdas[key] = celda

    fila.total_hoy += f.cajas_hoy
    fila.total_ajuste += f.ajuste
    fila.total_historicas += f.cajas_historicas
    fila.total_entradas += f.entradas_posteriores
    fila.total_salidas += f.salidas_posteriores
    fila.n_notas += f.n_notas
    fila.valor_inconsistente = fila.valor_inconsistente || f.valor_inconsistente

    columna.total_hoy += f.cajas_hoy
    columna.total_ajuste += f.ajuste
    columna.total_historicas += f.cajas_historicas
    columna.total_entradas += f.entradas_posteriores
    columna.total_salidas += f.salidas_posteriores
  }

  const filasMatriz = ordenProductos.map((id) => porProducto.get(id)!)
  const columnas = Array.from(columnasPorKey.values()).sort((a, b) => a.orden - b.orden)

  const totales = filasMatriz.reduce(
    (acc, f) => ({
      hoy: acc.hoy + f.total_hoy,
      ajuste: acc.ajuste + f.total_ajuste,
      historicas: acc.historicas + f.total_historicas,
      entradas: acc.entradas + f.total_entradas,
      salidas: acc.salidas + f.total_salidas,
    }),
    { hoy: 0, ajuste: 0, historicas: 0, entradas: 0, salidas: 0 }
  )

  return { filas: filasMatriz, columnas, totales }
}

/**
 * Totales por columna sobre el conjunto COMPLETO de filas (sin materializar la
 * matriz completa). Se usa para que el pie de la tabla muestre los totales de
 * todo el alcance y no solo los de la página visible.
 */
export function totalesPorColumna(
  filas: FilaPlanaHistorico[],
  definiciones: DefinicionColumnaMatriz[],
  tipo: TipoAgrupacionMatriz
): { columnas: ColumnaMatriz[]; totales: MatrizHistorica['totales'] } {
  const columnasPorKey = new Map<string, ColumnaMatriz>()
  for (const d of definiciones) {
    columnasPorKey.set(d.key, {
      ...d,
      total_hoy: 0,
      total_ajuste: 0,
      total_historicas: 0,
      total_entradas: 0,
      total_salidas: 0,
    })
  }

  const totales = { hoy: 0, ajuste: 0, historicas: 0, entradas: 0, salidas: 0 }

  for (const f of filas) {
    const columna = columnasPorKey.get(claveColumnaMatriz(f, tipo))
    if (!columna) continue
    columna.total_hoy += f.cajas_hoy
    columna.total_ajuste += f.ajuste
    columna.total_historicas += f.cajas_historicas
    columna.total_entradas += f.entradas_posteriores
    columna.total_salidas += f.salidas_posteriores
    totales.hoy += f.cajas_hoy
    totales.ajuste += f.ajuste
    totales.historicas += f.cajas_historicas
    totales.entradas += f.entradas_posteriores
    totales.salidas += f.salidas_posteriores
  }

  const columnas = Array.from(columnasPorKey.values()).sort((a, b) => a.orden - b.orden)
  return { columnas, totales }
}

/**
 * Agrupa las filas planas por producto (para paginar por producto y no por
 * producto×bodega). Devuelve los ids de producto en el orden de aparición.
 */
export function idsProductosUnicos(filas: { producto_id: number }[]): number[] {
  const vistos = new Set<number>()
  const out: number[] = []
  for (const f of filas) {
    if (vistos.has(f.producto_id)) continue
    vistos.add(f.producto_id)
    out.push(f.producto_id)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Fechas
// ─────────────────────────────────────────────────────────────────────────────

/** Límite superior inclusivo (naive) del día local `YYYY-MM-DD`. */
export function corteHasta(fechaLocal: string): string {
  return `${fechaLocal}T23:59:59.999`
}

/** Límite inferior inclusivo (naive) del día local `YYYY-MM-DD`. */
export function inicioDesde(fechaLocal: string): string {
  return `${fechaLocal}T00:00:00`
}

/** Normaliza un `YYYY-MM-DD` a ISO naive comparable; si ya viene ISO, se respeta. */
export function normalizaFecha(fecha: string | null | undefined): string {
  if (!fecha) return ''
  const t = fecha.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return inicioDesde(t)
  return t
}

/** Normaliza el límite SUPERIOR de una ventana: un `YYYY-MM-DD` incluye todo el día. */
export function normalizaHasta(fecha: string | null | undefined): string {
  if (!fecha) return ''
  const t = fecha.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return corteHasta(t)
  return t
}

/** Día anterior en `YYYY-MM-DD` (para calcular el saldo inicial de una ventana). */
export function diaAnterior(fecha: string): string {
  const t = (fecha || '').trim()
  const base = /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00Z` : t
  const d = new Date(base)
  if (Number.isNaN(d.getTime())) return t
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** ¿El movimiento cae dentro de la ventana (ambos límites inclusivos)? */
export function enVentana(fecha: string, ventana: Ventana): boolean {
  const f = fecha || ''
  if (ventana.desde) {
    const d = normalizaFecha(ventana.desde)
    if (f < d) return false
  }
  if (ventana.hasta) {
    const h = normalizaHasta(ventana.hasta)
    if (f > h) return false
  }
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Regla de signos
// ─────────────────────────────────────────────────────────────────────────────

/** ¿La nota aplicó stock? (CONF/MODF y visible). */
export function esMovimientoAplicable(m: Pick<MovimientoHistorico, 'estado_codigo' | 'activo'>): boolean {
  if (m.activo === false) return false
  const est = String(m.estado_codigo || '').toUpperCase()
  return (ESTADOS_APLICADOS as readonly string[]).includes(est)
}

/**
 * Efecto firmado de un movimiento sobre una bodega.
 *   ENT / DEV → +cajas en la bodega origen
 *   SAL       → −cajas en la bodega origen
 *   TRF       → −cajas en origen, +cajas en destino (neto 0 si origen = destino)
 *   AJU       → ±cajas según el signo, en la bodega origen
 */
export function efectoEnBodega(m: MovimientoHistorico, bodegaId: number): number {
  const abs = Math.abs(m.cajas || 0)
  const esOrigen = m.bodega_origen_id === bodegaId
  const esDestino = m.bodega_destino_id === bodegaId
  const tipo = String(m.tipo_codigo || '').toUpperCase()

  if (tipo === 'TRF') {
    if (esOrigen && !esDestino) return -abs
    if (esDestino && !esOrigen) return abs
    return 0
  }
  if (tipo === 'SAL') return esOrigen ? -abs : 0
  if (tipo === 'ENT' || tipo === 'DEV') return esOrigen ? abs : 0
  if (tipo === 'AJU') return esOrigen ? (m.cajas >= 0 ? abs : -abs) : 0

  // Fallback por `afecta_inventario` para tipos no previstos.
  if (esOrigen && !esDestino) return m.afecta_inventario < 0 ? -abs : abs
  if (esDestino && !esOrigen) return abs
  return 0
}

/**
 * Efecto del rollback: lo que hay que DESHACER para volver a una fecha pasada.
 * Es el inverso del efecto aplicado, por eso "entrada posterior" se resta.
 */
export function efectoRollback(m: MovimientoHistorico, bodegaId: number): number {
  return -efectoEnBodega(m, bodegaId)
}

export function claveStock(bodegaId: number, productoId: number): string {
  return `${bodegaId}|${productoId}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Agregaciones por ventana
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delta acumulado por (bodega, producto) de los movimientos DENTRO de la ventana.
 * `delta` es el efecto firmado aplicado (positivo = entró stock).
 */
export function calcularDelta(movimientos: MovimientoHistorico[], ventana: Ventana): Map<string, DeltaEntry> {
  const map = new Map<string, DeltaEntry>()
  for (const m of movimientos) {
    if (!esMovimientoAplicable(m)) continue
    if (!enVentana(m.fecha_nota, ventana)) continue
    const fecha = m.fecha_nota || m.fecha_confirmacion || ''
    const bodegas = new Set<number>()
    bodegas.add(m.bodega_origen_id)
    if (m.bodega_destino_id != null) bodegas.add(m.bodega_destino_id)
    for (const b of bodegas) {
      const efecto = efectoEnBodega(m, b)
      if (efecto === 0) continue
      const clave = claveStock(b, m.producto_id)
      const entry = map.get(clave) ?? { delta: 0, notas: [] }
      entry.delta += efecto
      entry.notas.push(m)
      map.set(clave, entry)
    }
  }
  return map
}

/**
 * Rollback: movimientos POSTERIORES al corte.
 * `delta` = suma del efecto aplicado (positivo = el stock entró después del corte
 * ⇒ hay que restarlo). El ajuste que se muestra al usuario es `-delta`.
 */
export function calcularRollback(movimientos: MovimientoHistorico[], corte: string): Map<string, DeltaEntry> {
  const map = new Map<string, DeltaEntry>()
  const limite = normalizaFecha(corte)
  for (const m of movimientos) {
    if (!esMovimientoAplicable(m)) continue
    const fecha = m.fecha_nota || m.fecha_confirmacion || ''
    if (fecha <= limite) continue
    const bodegas = new Set<number>()
    bodegas.add(m.bodega_origen_id)
    if (m.bodega_destino_id != null) bodegas.add(m.bodega_destino_id)
    for (const b of bodegas) {
      const efecto = efectoEnBodega(m, b)
      if (efecto === 0) continue
      const clave = claveStock(b, m.producto_id)
      const entry = map.get(clave) ?? { delta: 0, notas: [] }
      entry.delta += efecto
      entry.notas.push(m)
      map.set(clave, entry)
    }
  }
  return map
}

/**
 * Aplica el rollback al stock actual.
 * `cajas_historicas = cajas_hoy + ajuste`, con `ajuste = −delta`.
 */
export function aplicarRollback(
  stock: StockRow[],
  rollback: Map<string, DeltaEntry>
): FilaStockHistorico[] {
  return stock.map((s) => {
    const clave = claveStock(s.bodega_id, s.producto_id)
    const entry = rollback.get(clave)
    const delta = entry?.delta ?? 0
    const ajuste = -delta
    const cajas_hoy = Number(s.cajas) || 0
    const cajas_historicas = cajas_hoy + ajuste
    return {
      bodega_id: s.bodega_id,
      producto_id: s.producto_id,
      cajas_hoy,
      ajuste,
      cajas_historicas,
      n_notas: entry?.notas.length ?? 0,
      notas: entry?.notas ?? [],
      valor_inconsistente: cajas_historicas < 0,
    }
  })
}

/** Resumen por bodega: hoy / ajuste / histórico. */
export function resumenPorBodega(filas: FilaStockHistorico[]): Map<number, ResumenBodega> {
  const map = new Map<number, ResumenBodega>()
  for (const f of filas) {
    const r = map.get(f.bodega_id) ?? { hoy: 0, ajuste: 0, historico: 0 }
    r.hoy += f.cajas_hoy
    r.ajuste += f.ajuste
    r.historico += f.cajas_historicas
    map.set(f.bodega_id, r)
  }
  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// Kardex (running balance)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kardex por producto × bodega con saldo acumulado.
 * `saldoInicialPorClave` = stock al día anterior al inicio de la ventana.
 */
export function construirKardex(
  movimientos: MovimientoHistorico[],
  ventana: Ventana,
  saldoInicialPorClave: Map<string, number>,
  metaProducto?: Map<number, { sku: string | null; descripcion: string | null }>
): FilaKardex[] {
  const aplicables = movimientos
    .filter((m) => esMovimientoAplicable(m) && enVentana(m.fecha_nota, ventana))
    .sort((a, b) => {
      const fa = a.fecha_nota || ''
      const fb = b.fecha_nota || ''
      if (fa !== fb) return fa < fb ? -1 : 1
      if (a.nota_id !== b.nota_id) return a.nota_id - b.nota_id
      return a.producto_id - b.producto_id
    })

  const saldos = new Map<string, number>()
  for (const [clave, valor] of saldoInicialPorClave.entries()) saldos.set(clave, valor)

  const filas: FilaKardex[] = []
  for (const m of aplicables) {
    const fecha = m.fecha_nota || m.fecha_confirmacion || ''
    const bodegas = new Set<number>()
    bodegas.add(m.bodega_origen_id)
    if (m.bodega_destino_id != null) bodegas.add(m.bodega_destino_id)

    for (const b of bodegas) {
      const efecto = efectoEnBodega(m, b)
      if (efecto === 0) continue
      const clave = claveStock(b, m.producto_id)
      const saldo = (saldos.get(clave) ?? 0) + efecto
      saldos.set(clave, saldo)
      const meta = metaProducto?.get(m.producto_id)
      filas.push({
        clave,
        bodega_id: b,
        producto_id: m.producto_id,
        nota_id: m.nota_id,
        numero_nota: m.numero_nota,
        fecha_nota: fecha,
        fecha_confirmacion: m.fecha_confirmacion,
        tipo_codigo: m.tipo_codigo,
        estado_codigo: m.estado_codigo,
        bodega_origen_id: m.bodega_origen_id,
        bodega_destino_id: m.bodega_destino_id,
        producto_sku: meta?.sku ?? null,
        producto_descripcion: meta?.descripcion ?? null,
        cajas: Math.abs(m.cajas || 0),
        efecto,
        saldo,
      })
    }
  }
  return filas
}

// ─────────────────────────────────────────────────────────────────────────────
// Ajustes directos (UPDATE masivo en inventario_stock fuera de notas)
// ─────────────────────────────────────────────────────────────────────────────

export type OpcionesAjustesDirectos = {
  /** Mínimo de filas que comparten timestamp para considerarlo masivo. */
  minFilas?: number
  /** Solo considera Updates posteriores al corte (los previos no alteran el historico). */
  corte?: string | null
  /**
   * Tolerancia para emparejar el UPDATE con la nota que lo origino.
   * Por defecto: el mismo DIA (las importaciones suelen retro-datar la nota,
   * asi que el timestamp exacto no coincide).
   */
  toleranciaDias?: number
}

/**
 * Detecta Updates masivos en `inventario_stock` que NO corresponden a ninguna nota
 * confirmada de esa bodega.
 *
 * Regla: se agrupan las filas por (bodega, `updated_at`). Un grupo grande es
 * legitimo si existe una nota CONF/MODF de esa bodega confirmada en el mismo DIA
 * (+- tolerancia): las importaciones masivas suelen retro-datar la fecha de la nota
 * respecto al momento real del UPDATE, asi que el timestamp exacto no coincide.
 * Si no hay nota, es un ajuste directo.
 *
 * Solo se reportan los Updates POSTERIORES al corte: los anteriores ya estan
 * reflejados en el stock de esa fecha y no alteran la cifra historica.
 */
export function detectarAjustesDirectos(
  stock: StockRow[],
  movimientos: MovimientoHistorico[],
  opciones: OpcionesAjustesDirectos = {}
): AjusteDirecto[] {
  const minFilas = opciones.minFilas ?? 5
  const toleranciaDias = opciones.toleranciaDias ?? 1
  const limiteCorte = opciones.corte ? normalizaFecha(opciones.corte) : null

  const grupos = new Map<string, { bodega_id: number; fecha: string; filas: StockRow[] }>()
  for (const s of stock) {
    if (!s.updated_at) continue
    if (limiteCorte && s.updated_at <= limiteCorte) continue
    const clave = `${s.bodega_id}|${s.updated_at}`
    const g = grupos.get(clave) ?? { bodega_id: s.bodega_id, fecha: s.updated_at, filas: [] }
    g.filas.push(s)
    grupos.set(clave, g)
  }

  // Notas confirmadas indexadas por bodega (dia de confirmacion).
  const notasPorBodega = new Map<number, string[]>()
  for (const m of movimientos) {
    // Aqui NO se exige `activo`: una nota desactivada (borrado suave) tambien movio
    // el stock al confirmarse, asi que su UPDATE es legitimo.
    const est = String(m.estado_codigo || '').toUpperCase()
    if (est !== 'CONF' && est !== 'MODF') continue
    if (!m.fecha_confirmacion) continue
    const dia = m.fecha_confirmacion.slice(0, 10)
    if (m.bodega_origen_id) {
      const arr = notasPorBodega.get(m.bodega_origen_id) ?? []
      arr.push(dia)
      notasPorBodega.set(m.bodega_origen_id, arr)
    }
    if (m.bodega_destino_id) {
      const arr = notasPorBodega.get(m.bodega_destino_id) ?? []
      arr.push(dia)
      notasPorBodega.set(m.bodega_destino_id, arr)
    }
  }

  const out: AjusteDirecto[] = []
  for (const g of grupos.values()) {
    if (g.filas.length < minFilas) continue
    const diaUpdate = g.fecha.slice(0, 10)
    const dias = notasPorBodega.get(g.bodega_id) ?? []
    const hayNota = dias.some((d) => Math.abs(diaDiff(d, diaUpdate)) <= toleranciaDias)
    if (hayNota) continue
    const usuarios = new Set(g.filas.map((f) => f.updated_by).filter((v) => v != null))
    out.push({
      bodega_id: g.bodega_id,
      fecha: g.fecha,
      filas_afectadas: g.filas.length,
      usuario_id: usuarios.size === 1 ? [...usuarios][0] : null,
    })
  }
  return out.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.bodega_id - b.bodega_id))
}

/** Diferencia en dias entre dos fechas `YYYY-MM-DD`. */
function diaDiff(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`)
  const tb = Date.parse(`${b}T00:00:00Z`)
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY
  return Math.round((ta - tb) / 86400000)
}

/**
 * Reconciliacion por bodega: stock actual vs suma de efectos de las notas aplicadas.
 * Un `dif` distinto de 0 indica movimiento de stock que las notas activas no
 * explican (ajustes directos, notas desactivadas u omitidas).
 */
export function reconciliarPorBodega(
  stock: StockRow[],
  movimientos: MovimientoHistorico[]
): Map<number, ReconciliacionBodega> {
  const porClave = new Map<string, { bodega_id: number; efecto: number }>()
  for (const m of movimientos) {
    if (!esMovimientoAplicable(m)) continue
    const bodegas = new Set<number>()
    bodegas.add(m.bodega_origen_id)
    if (m.bodega_destino_id != null) bodegas.add(m.bodega_destino_id)
    for (const b of bodegas) {
      const efecto = efectoEnBodega(m, b)
      if (efecto === 0) continue
      const clave = claveStock(b, m.producto_id)
      const entry = porClave.get(clave) ?? { bodega_id: b, efecto: 0 }
      entry.efecto += efecto
      porClave.set(clave, entry)
    }
  }

  const out = new Map<number, ReconciliacionBodega>()
  for (const s of stock) {
    const clave = claveStock(s.bodega_id, s.producto_id)
    const efecto = porClave.get(clave)?.efecto ?? 0
    const dif = (Number(s.cajas) || 0) - efecto
    const r = out.get(s.bodega_id) ?? {
      bodega_id: s.bodega_id,
      stock_actual: 0,
      notas: 0,
      dif: 0,
      claves_descuadradas: 0,
    }
    r.stock_actual += Number(s.cajas) || 0
    r.notas += efecto
    r.dif += dif
    if (Math.abs(dif) > 0.0001) r.claves_descuadradas++
    out.set(s.bodega_id, r)
  }
  return out
}
