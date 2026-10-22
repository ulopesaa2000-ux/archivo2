// lib/inventario/validacion-stock.ts
/**
 * Motor puro de validación de disponibilidad de stock para notas de inventario.
 *
 * SIN React, SIN Supabase: solo funciones y tipos (AGENTS.md 3.7.1).
 *
 * POR QUÉ EXISTE
 * --------------
 * El trigger de base de datos `inv-tienda.fn_procesar_nota_inventario()` procesa
 * `nota_detalle_productos` Renglón por renglón:
 *
 *   FOR v_det IN (SELECT * FROM nota_detalle_productos WHERE nota_id = NEW.id) LOOP
 *     SELECT * INTO v_stock FROM inventario_stock WHERE ... AND producto_id = v_det.producto_id ...
 *     IF v_stock.cajas < v_det.cajas THEN RAISE EXCEPTION 'Stock insuficiente...'
 *     UPDATE inventario_stock SET cajas = cajas - v_det.cajas ...
 *
 * Como NO agrupa, una nota con el mismo producto en dos renglones (p. ej. 6 + 1)
 * pasa el renglón 1 (6 <= 6, el stock baja a 0) y revienta en el renglón 2
 * (0 < 1) con un mensaje que NO menciona el SKU:
 *
 *   'Stock insuficiente en origen. Disponible: 0 cajas y 0 piezas. Intento de salida: 1 cajas y 0 piezas.'
 *
 * Este motor replica EXACTAMENTE la semántica del trigger (misma clave
 * producto_id + caja_id, NULL ≡ NULL) pero AGREGANDO los renglones de la nota,
 * de modo que el total real (6 + 1 = 7) se compara contra el disponible (6)
 * antes de tocar la base de datos.
 */

/** Clave de agrupación: producto + caja física (0 = sin caja, equivalente a NULL en BD). */
export type ClaveStock = string

/** Renglón de consumo tal como viaja en el draft de la nota. */
export type LineaStock = {
  producto_id: number
  producto_sku?: string | null
  producto_nombre?: string | null
  caja_id?: number | null
  caja_codigo?: string | null
  /** Cajas de la línea (negativo solo en tipo Ajuste). */
  cajas: number
  /** Piezas sueltas de la línea. */
  piezas_sueltas?: number | null
}

/** Línea agregada por clave producto + caja (valores ya resueltos). */
export type LineaAgregada = {
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  caja_id: number | null
  caja_codigo: string | null
  cajas: number
  piezas_sueltas: number
  /** Número de renglones de la nota que comparten esta clave. */
  renglones: number
}

/** Stock disponible en la bodega origen para una clave producto + caja. */
export type StockDisponible = {
  cajas: number
  piezas_sueltas: number
}

/**
 * Modo de consumo:
 * - `salida`          → SAL (afecta_inventario = -1) y TRF (afecta = 0 + requiere_destino)
 * - `ajuste_negativo` → AJU con cajas negativas
 * - `entrada`         → ENT / DEV (no consumen stock: la validación siempre pasa)
 */
export type ModoConsumo = 'salida' | 'ajuste_negativo' | 'entrada'

/** Producto que no alcanza con el stock de la bodega origen. */
export type FaltanteStock = {
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  caja_id: number | null
  caja_codigo: string | null
  /** Renglones de la nota que suman este producto (p. ej. 2 para 6 + 1). */
  renglones: number
  solicitado_cajas: number
  solicitado_piezas: number
  disponible_cajas: number
  disponible_piezas: number
  faltan_cajas: number
  faltan_piezas: number
}

/** Aviso informativo que no bloquea (no es un faltante). */
export type AdvertenciaStock = {
  tipo: 'renglones_duplicados'
  producto_id: number
  producto_sku: string
  producto_nombre: string | null
  renglones: number
  total_cajas: number
  mensaje: string
}

export type ResultadoValidacionStock = {
  /** true = la nota puede consumirse sin rechistar en el trigger. */
  ok: boolean
  faltantes: FaltanteStock[]
  advertencias: AdvertenciaStock[]
  modo: ModoConsumo
}

// ════════════════════════════════════════════════════════════
// Utilidades de clave
// ════════════════════════════════════════════════════════════

/** `producto_id:caja_id` (0 = sin caja física). */
export function claveStock(producto_id: number, caja_id?: number | null): ClaveStock {
  return `${producto_id}:${caja_id ?? 0}`
}

// ════════════════════════════════════════════════════════════
// Agregación
// ════════════════════════════════════════════════════════════

/**
 * Agrupa renglones por producto + caja y suma cajas y piezas.
 * Es el paso que el trigger NO hace y que provoca el error sin código.
 */
export function agregarLineasPorClave(lineas: LineaStock[]): Map<ClaveStock, LineaAgregada> {
  const mapa = new Map<ClaveStock, LineaAgregada>()

  for (const linea of lineas) {
    const clave = claveStock(linea.producto_id, linea.caja_id)
    const actual = mapa.get(clave)

    if (!actual) {
      mapa.set(clave, {
        producto_id: linea.producto_id,
        producto_sku: linea.producto_sku ?? '',
        producto_nombre: linea.producto_nombre ?? null,
        caja_id: linea.caja_id ?? null,
        caja_codigo: linea.caja_codigo ?? null,
        cajas: Number(linea.cajas) || 0,
        piezas_sueltas: Number(linea.piezas_sueltas) || 0,
        renglones: 1,
      })
      continue
    }

    actual.cajas += Number(linea.cajas) || 0
    actual.piezas_sueltas += Number(linea.piezas_sueltas) || 0
    actual.renglones += 1
    // Conserva el primer SKU/nombre conocido (las líneas repetidas traen el mismo).
    if (!actual.producto_sku && linea.producto_sku) actual.producto_sku = linea.producto_sku
    if (!actual.producto_nombre && linea.producto_nombre) actual.producto_nombre = linea.producto_nombre
    if (!actual.caja_codigo && linea.caja_codigo) actual.caja_codigo = linea.caja_codigo
  }

  return mapa
}

/**
 * Cuánto consume la nota por clave, según el modo:
 * - salida → cajas positivas (el trigger solo resta lo que se pide)
 * - ajuste_negativo → valor absoluto de las cajas negativas
 */
function consumoPorClave(
  agregadas: Map<ClaveStock, LineaAgregada>,
  modo: ModoConsumo
): Map<ClaveStock, { cajas: number; piezas: number }> {
  const consumo = new Map<ClaveStock, { cajas: number; piezas: number }>()

  for (const [clave, linea] of agregadas) {
    const cajas = modo === 'ajuste_negativo'
      ? Math.abs(Math.min(0, linea.cajas))
      : Math.max(0, linea.cajas)
    const piezas = Math.max(0, linea.piezas_sueltas)

    consumo.set(clave, { cajas, piezas })
  }

  return consumo
}

// ════════════════════════════════════════════════════════════
// Evaluación
// ════════════════════════════════════════════════════════════

/**
 * Compara el consumo agregado de la nota contra el stock disponible.
 *
 * `stockPorClave` debe venir leído de `inventario_stock` (bodega origen),
 * indexado por `claveStock(producto_id, caja_id)`.
 */
export function evaluarDisponibilidad(
  lineas: LineaStock[],
  stockPorClave: Map<ClaveStock, StockDisponible>,
  modo: ModoConsumo = 'salida'
): ResultadoValidacionStock {
  if (modo === 'entrada') {
    return { ok: true, faltantes: [], advertencias: [], modo }
  }

  const agregadas = agregarLineasPorClave(lineas)
  const consumo = consumoPorClave(agregadas, modo)
  const faltantes: FaltanteStock[] = []
  const advertencias: AdvertenciaStock[] = []

  for (const [clave, agregada] of agregadas) {
    const consumoLinea = consumo.get(clave)!
    const disponible = stockPorClave.get(clave) ?? { cajas: 0, piezas_sueltas: 0 }

    // Un mismo producto en varios renglones no es error: solo se avisa.
    if (agregada.renglones > 1) {
      advertencias.push({
        tipo: 'renglones_duplicados',
        producto_id: agregada.producto_id,
        producto_sku: agregada.producto_sku,
        producto_nombre: agregada.producto_nombre,
        renglones: agregada.renglones,
        total_cajas: Math.abs(agregada.cajas),
        mensaje: `${agregada.producto_sku} aparece en ${agregada.renglones} renglones (${Math.abs(agregada.cajas)} cajas en total).`,
      })
    }

    if (consumoLinea.cajas <= 0 && consumoLinea.piezas <= 0) continue

    const faltanCajas = Math.max(0, consumoLinea.cajas - disponible.cajas)
    const faltanPiezas = Math.max(0, consumoLinea.piezas - disponible.piezas_sueltas)

    if (faltanCajas > 0 || faltanPiezas > 0) {
      faltantes.push({
        producto_id: agregada.producto_id,
        producto_sku: agregada.producto_sku,
        producto_nombre: agregada.producto_nombre,
        caja_id: agregada.caja_id,
        caja_codigo: agregada.caja_codigo,
        renglones: agregada.renglones,
        solicitado_cajas: consumoLinea.cajas,
        solicitado_piezas: consumoLinea.piezas,
        disponible_cajas: disponible.cajas,
        disponible_piezas: disponible.piezas_sueltas,
        faltan_cajas: faltanCajas,
        faltan_piezas: faltanPiezas,
      })
    }
  }

  faltantes.sort((a, b) => b.faltan_cajas - a.faltan_cajas || a.producto_sku.localeCompare(b.producto_sku))

  return { ok: faltantes.length === 0, faltantes, advertencias, modo }
}

/**
 * Recorta las líneas para que el consumo agregado quepa en el disponible.
 * Regla determinista: el disponible se llena en el primer renglón del producto
 * y los renglones sobrantes quedan en 0 (se pueden eliminar con `consolidarLineas`).
 */
export function ajustarLineasADisponible(
  lineas: LineaStock[],
  faltantes: FaltanteStock[]
): LineaStock[] {
  if (faltantes.length === 0) return lineas

  //Disponible por clave (cajas y piezas sueltas admitidas por el trigger)
  const disponiblePorClave = new Map<ClaveStock, { cajas: number; piezas: number }>()
  for (const f of faltantes) {
    disponiblePorClave.set(claveStock(f.producto_id, f.caja_id), {
      cajas: f.disponible_cajas,
      piezas: f.disponible_piezas,
    })
  }

  const usadoPorClave = new Map<ClaveStock, { cajas: number; piezas: number }>()
  const resultado: LineaStock[] = []

  for (const linea of lineas) {
    const clave = claveStock(linea.producto_id, linea.caja_id)
    const limite = disponiblePorClave.get(clave)

    if (!limite) {
      resultado.push({ ...linea })
      continue
    }

    const usado = usadoPorClave.get(clave) ?? { cajas: 0, piezas: 0 }
    const cajas = Math.min(
      Math.max(0, Number(linea.cajas) || 0),
      Math.max(0, limite.cajas - usado.cajas)
    )
    const piezas = Math.min(
      Math.max(0, Number(linea.piezas_sueltas) || 0),
      Math.max(0, limite.piezas - usado.piezas)
    )
    usadoPorClave.set(clave, { cajas: usado.cajas + cajas, piezas: usado.piezas + piezas })

    resultado.push({ ...linea, cajas, piezas_sueltas: piezas })
  }

  return resultado
}

/**
 * Fusiona renglones del mismo producto + caja en uno solo (suma cajas y piezas).
 * Útil tras sincronizar un OCR donde el mismo modelo aparece en varias filas del papel.
 */
export function consolidarLineas(lineas: LineaStock[]): LineaStock[] {
  const agregadas = agregarLineasPorClave(lineas)
  const salida: LineaStock[] = []

  for (const [clave, agregada] of agregadas) {
    // Reconstruye la clave original por si el mapa cambió el orden.
    const original = lineas.find(
      (l) => claveStock(l.producto_id, l.caja_id) === clave
    )
    salida.push({
      producto_id: agregada.producto_id,
      producto_sku: original?.producto_sku ?? agregada.producto_sku,
      producto_nombre: original?.producto_nombre ?? agregada.producto_nombre,
      caja_id: agregada.caja_id,
      caja_codigo: original?.caja_codigo ?? agregada.caja_codigo,
      cajas: agregada.cajas,
      piezas_sueltas: agregada.piezas_sueltas,
    })
  }

  return salida
}
