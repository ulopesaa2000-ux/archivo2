// C:\Users\uriel\Downloads\enero 26\archivo2\lib\orden-rapida-cajas.ts
// Logica pura de cajas del wizard de orden rapida (testeable, sin React).
// Los tipos son estructurales minimos: WizardCaja/WizardProducto son asignables.
import { normalizeColorKey } from '@/lib/color-match'

export interface CajaEditable {
  codigo_caja_temporal?: string
  codigo_caja: string
  sku_base?: string
  sku_raw?: string
  nombre_pack: string
  piezas_por_caja: number
  cantidad_cajas: number
  total_piezas: number
  peso_bruto_kg: number
  peso_bruto_total_kg: number
  peso_neto_kg: number
  peso_neto_total_kg: number
  largo_cm: number
  ancho_cm: number
  alto_cm: number
  cbm: number
  cbm_por_caja: number
  cbm_total_linea: number
  tallas: string[]
  colores: string[]
  matriz: {
    tallas: string[]
    colores: string[]
    valores: Record<string, Record<string, number>>
  }
  estado_temporal?: string
  tipo_caja?: string
  producto_temp_id?: string
  producto_id?: number | null
  costo_promedio?: number
  [key: string]: unknown
}

export interface ProductoEditable {
  temp_id?: string
  producto_id?: number | null
  sku_base: string
  [key: string]: unknown
}

export interface CajaEditPayload {
  base: Record<string, any>
  detalles: { talla_id: number; color_id: number; cantidad: number; talla_nombre?: string; color_nombre?: string }[]
}

function normSku(v: unknown): string {
  return String(v || '').trim().toUpperCase()
}

/**
 * Agrupa cajas por producto (temp_id, luego SKU). Pura: nunca muta entradas.
 * Las cajas sin producto van a un grupo huerfano `orphan_<SKU>`.
 */
export function agruparCajasPorProducto<
  C extends Pick<CajaEditable, 'sku_base' | 'producto_temp_id'>,
  P extends Pick<ProductoEditable, 'temp_id' | 'sku_base'>,
>(
  cajas: C[],
  productos: P[],
): Array<{ producto: P; cajas: C[] }> {
  const cajasPorTempId = new Map<string, C[]>()
  const cajasPorSku = new Map<string, C[]>()

  for (const caja of cajas) {
    if (caja.producto_temp_id) {
      const list = cajasPorTempId.get(caja.producto_temp_id) ?? []
      list.push(caja)
      cajasPorTempId.set(caja.producto_temp_id, list)
    }
    const sku = normSku(caja.sku_base)
    if (sku) {
      const list = cajasPorSku.get(sku) ?? []
      list.push(caja)
      cajasPorSku.set(sku, list)
    }
  }

  const result: Array<{ producto: P; cajas: C[] }> = []
  const asignadas = new Set<C>()

  for (const producto of productos) {
    let delProducto: C[] = []
    const up = normSku(producto.sku_base)
    if (producto.temp_id && cajasPorTempId.has(producto.temp_id)) {
      delProducto = cajasPorTempId.get(producto.temp_id) || []
    } else if (up && cajasPorSku.has(up)) {
      delProducto = cajasPorSku.get(up) || []
    }
    for (const caja of delProducto) asignadas.add(caja)
    result.push({ producto, cajas: delProducto })
  }

  const restantes = new Map<string, C[]>()
  for (const c of cajas) {
    if (asignadas.has(c)) continue
    const sku = normSku(c.sku_base) || '__sin_sku__'
    const list = restantes.get(sku) ?? []
    list.push(c)
    restantes.set(sku, list)
  }
  for (const [sku, list] of restantes) {
    if (list.length > 0) {
      // Mismo shape que antes del refactor (el wizard lo trata como display-only)
      const huerfano = {
        temp_id: `orphan_${sku}`,
        sku_base: sku,
        nombre: `SKU sin producto: ${sku}`,
        estado_temporal: 'sin_producto',
      } as unknown as P
      result.push({ producto: huerfano, cajas: list })
    }
  }
  return result
}

/**
 * Aplica la edicion de CajaCard sobre una caja (nuevo objeto, sin mutar).
 * Si se fija valor real de piezas o hay detalle con cantidad, limpia la
 * marca de estimado.
 */
export function aplicarEdicionCaja<T extends CajaEditable>(caja: T, data: CajaEditPayload): T {
  const base = data.base || {}
  const tallas = base.tallas ? String(base.tallas).split('|').filter(Boolean) : caja.tallas
  const colores = base.colores ? String(base.colores).split('|').filter(Boolean) : caja.colores

  const matriz = { ...caja.matriz }
  if ((data.detalles || []).length > 0) {
    const newValores: Record<string, Record<string, number>> = {}
    for (const color of colores) {
      newValores[color] = {}
      for (const talla of tallas) {
        newValores[color][talla] = 0
      }
    }
    for (const det of data.detalles) {
      const colorStr = det.color_nombre || colores.find((c) => c === String(det.color_id)) || colores[det.color_id - 1] || String(det.color_id)
      const tallaStr = det.talla_nombre || tallas.find((t) => t === String(det.talla_id)) || tallas[det.talla_id - 1] || String(det.talla_id)
      if (!newValores[colorStr]) newValores[colorStr] = {}
      newValores[colorStr][tallaStr] = det.cantidad
    }
    matriz.tallas = tallas
    matriz.colores = colores
    matriz.valores = newValores
  }

  const totalMatriz = (data.detalles || []).reduce((sum, d) => sum + (d.cantidad || 0), 0)
  const valorReal = base.piezas_por_caja != null || totalMatriz > 0

  return {
    ...caja,
    ...base,
    tallas,
    colores,
    matriz,
    piezas_por_caja: totalMatriz > 0 ? totalMatriz : (base.piezas_por_caja ?? caja.piezas_por_caja),
    cantidad_cajas: base.cantidad_cajas ?? caja.cantidad_cajas,
    cbm: base.cbm ?? caja.cbm,
    peso_bruto_kg: base.peso_bruto_kg ?? caja.peso_bruto_kg,
    peso_neto_kg: base.peso_neto ?? caja.peso_neto_kg,
    largo_cm: base.largo_cm ?? caja.largo_cm,
    ancho_cm: base.ancho_cm ?? caja.ancho_cm,
    alto_cm: base.alto_cm ?? caja.alto_cm,
    nombre_pack: base.nombre_pack ?? caja.nombre_pack,
    codigo_caja: base.codigo_caja ?? caja.codigo_caja,
    ...(valorReal ? { piezas_estimadas: false } : {}),
  }
}

/**
 * Deriva detalles con shape de n8n desde la matriz editable.
 * Fuente unica al guardar (reemplaza parsedData.detalles obsoleto).
 */
export function detallesDesdeMatriz(caja: Pick<CajaEditable, 'codigo_caja_temporal' | 'codigo_caja' | 'sku_base' | 'nombre_pack' | 'matriz'>): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  const codigo = String(caja.codigo_caja_temporal || caja.codigo_caja || '')
  if (!codigo) return out
  for (const color of caja.matriz?.colores || []) {
    for (const talla of caja.matriz?.tallas || []) {
      const cantidad = Number(caja.matriz.valores[color]?.[talla] || 0)
      if (!(cantidad > 0)) continue
      out.push({
        codigo_caja_temporal: codigo,
        sku_base: caja.sku_base,
        nombre_pack: caja.nombre_pack,
        color_raw: color,
        color_id: null,
        talla_codigo: talla,
        talla_id: null,
        cantidad_por_caja: cantidad,
        estado_temporal: 'pendiente_match_color',
      })
    }
  }
  return out
}

/**
 * Destino de un color resuelto: id FK de cat_colores + nombre a mostrar en caja.
 */
export interface DestinoColorCaja {
  color_id: number
  nombre: string
}

/**
 * Propaga un mapa raw->destino a las matrices de cajas (puro, sin mutar).
 * - Renombra la llave de color al `nombre` del catalogo (ID + renombrar).
 * - Si dos raws caen al mismo destino en la misma caja, fusiona sumando por talla.
 * - Llaves insensibles a case/acentos/espacios via normalizeColorKey.
 * Retorna arreglo nuevo; cuenta cuantas cajas tocaron.
 */
export function aplicarMapaColoresACajas<T extends CajaEditable>(
  cajas: T[],
  mapa: Map<string, DestinoColorCaja> | Record<string, DestinoColorCaja>,
): { cajas: T[]; tocadas: number } {
  const get = (raw: string): DestinoColorCaja | undefined => {
    const k = normalizeColorKey(String(raw || ''))
    if (mapa instanceof Map) return mapa.get(k)
    return (mapa as Record<string, DestinoColorCaja>)[k]
  }
  let tocadas = 0
  const next = (cajas || []).map((caja) => {
    const coloresOrigen = caja.matriz?.colores || []
    if (coloresOrigen.length === 0) return caja
    let cambio = false
    // destino por color origen
    const destinoPorOrigen = new Map<string, string>()
    for (const col of coloresOrigen) {
      const d = get(col)
      if (d && String(d.nombre || '').trim()) {
        const target = String(d.nombre).trim().toUpperCase()
        destinoPorOrigen.set(col, target)
        if (target !== col) cambio = true
      } else {
        destinoPorOrigen.set(col, col)
      }
    }
    if (!cambio) return caja
    const tallas = [...(caja.matriz?.tallas || [])]
    const valoresNuevos: Record<string, Record<string, number>> = {}
    for (const col of coloresOrigen) {
      const target = destinoPorOrigen.get(col) || col
      const fila = caja.matriz?.valores?.[col] || {}
      if (!valoresNuevos[target]) {
        valoresNuevos[target] = {}
        for (const t of tallas) valoresNuevos[target][t] = 0
      }
      for (const t of tallas) {
        valoresNuevos[target][t] = Number(valoresNuevos[target][t] || 0) + Number((fila as Record<string, number>)[t] || 0)
      }
      // Conservar tallas extra no declaradas (defensa)
      for (const [t, v] of Object.entries(fila)) {
        if (!(t in valoresNuevos[target])) valoresNuevos[target][t] = Number(valoresNuevos[target][t] || 0) + Number(v || 0)
      }
    }
    // Dedup de lista de colores preservando orden de primera aparicion del destino
    const vistos = new Set<string>()
    const coloresNuevos: string[] = []
    for (const col of coloresOrigen) {
      const target = destinoPorOrigen.get(col) || col
      if (!vistos.has(target)) { vistos.add(target); coloresNuevos.push(target) }
    }
    tocadas++
    return {
      ...caja,
      colores: coloresNuevos,
      matriz: { tallas, colores: coloresNuevos, valores: valoresNuevos },
    }
  })
  return { cajas: next, tocadas }
}

/**
 * Enriquece detalles (shape detallesDesdeMatriz) con color_id desde un mapa
 * clave->id. No muta: devuelve arreglo nuevo. Los no encontrados quedan igual.
 */
export function enriquecerDetallesConMapa(
  detalles: Array<Record<string, unknown>>,
  mapaId: Map<string, number> | Record<string, number>,
): Array<Record<string, unknown>> {
  const get = (raw: string): number | undefined => {
    const k = normalizeColorKey(String(raw || ''))
    if (mapaId instanceof Map) return mapaId.get(k)
    const v = (mapaId as Record<string, number>)[k]
    return typeof v === 'number' ? v : undefined
  }
  return (detalles || []).map((d) => {
    if (typeof d?.color_id === 'number' && Number.isInteger(d.color_id as number)) return d
    const id = get(String(d?.color_raw || ''))
    if (id == null) return d
    return { ...d, color_id: id, estado_temporal: 'match_color' }
  })
}

/**
 * Bulk-fix 0→1 pza: asigna 1 pza/caja temporal a cajas sin dato y las marca
 * como estimadas. Puro (devuelve arreglo nuevo + conteo).
 */
export function fijarPzMinima<T extends Pick<CajaEditable, 'tipo_caja' | 'piezas_por_caja' | 'cantidad_cajas' | 'total_piezas'>>(cajas: T[]): { cajas: T[]; fijadas: number } {
  let fijadas = 0
  const next = cajas.map((c) => {
    if (c.tipo_caja === 'padre_resumen' || Number(c.piezas_por_caja ?? 0) > 0) return c
    fijadas++
    return {
      ...c,
      piezas_por_caja: 1,
      total_piezas: Number(c.cantidad_cajas ?? 0) > 0 ? Number(c.cantidad_cajas) : 1,
      piezas_estimadas: true,
    }
  })
  return { cajas: next, fijadas }
}

function normSkuReparto(v: unknown): string {
  return String(v || '').trim().toUpperCase()
}

/**
 * Aplica el reparto de una separacion sobre productos/cajas/detalles (puro).
 * - El producto original conserva temp_id y toma el 1er SKU candidato.
 * - Las cajas mapeadas se mueven (SKU + temp + codigo renombrado).
 * - Las cajas que se quedan heredan el SKU del 1er candidato: sin esto
 *   conservan el SKU conjunto y el match las cuenta en 0 (bug AND260030).
 */
export function aplicarRepartoSeparacion(args: {
  productos: ProductoEditable[]
  cajas: CajaEditable[]
  detalles: Array<Record<string, unknown>>
  prodATempId: string
  skuA: string
  skuRawA: string
  nuevos: ProductoEditable[]
  tempPorSku: Record<string, string>
  destinoPorCodigo: Map<string, string>
  originalUp: string
  renombrar: (codigoViejo: string, skuDestino: string, usados: Set<string>) => string
}): {
  productos: ProductoEditable[]
  cajas: CajaEditable[]
  detalles: Array<Record<string, unknown>>
  movidas: number
} {
  const usados = new Set(args.cajas.map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '').toUpperCase()))
  const remap = new Map<string, { sku: string; tempId: string; codigo: string }>()
  for (const [cod, skuD] of args.destinoPorCodigo) {
    const nuevoCodigo = args.renombrar(cod, skuD, usados)
    usados.add(nuevoCodigo.toUpperCase())
    remap.set(cod, { sku: skuD, tempId: args.tempPorSku[skuD.toUpperCase()] || '', codigo: nuevoCodigo })
  }
  const codigosQueSeQuedan = new Set(
    args.cajas
      .filter((c) => c.tipo_caja !== 'padre_resumen' && normSkuReparto(c.sku_base) === args.originalUp)
      .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || ''))
      .filter((cod) => cod && !remap.has(cod)),
  )
  const productos = [
    ...args.productos.map((p) => (p.temp_id === args.prodATempId
      ? { ...p, sku_base: args.skuA, sku_raw: args.skuRawA }
      : p)),
    ...args.nuevos,
  ]
  const cajas = args.cajas.map((c) => {
    const cod = String(c.codigo_caja_temporal || c.codigo_caja || '')
    const m = remap.get(cod)
    if (m) {
      return { ...c, sku_base: m.sku, producto_temp_id: m.tempId, codigo_caja_temporal: m.codigo, codigo_caja: m.codigo }
    }
    if (c.tipo_caja !== 'padre_resumen' && normSkuReparto(c.sku_base) === args.originalUp) {
      return { ...c, sku_base: args.skuA }
    }
    return c
  })
  const detalles = args.detalles.map((d) => {
    const cod = String(d?.codigo_caja_temporal || '')
    const m = remap.get(cod)
    if (m) return { ...d, codigo_caja_temporal: m.codigo, sku_base: m.sku }
    if (codigosQueSeQuedan.has(cod)) return { ...d, sku_base: args.skuA }
    return d
  })
  return { productos, cajas, detalles, movidas: remap.size }
}
