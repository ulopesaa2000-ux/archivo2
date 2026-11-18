// app/(admin)/ordenes-b2b/orden-rapida/_hooks/orden-rapida-n8n.ts
import type { SharedCajaData } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'
import type { DbProductoData } from '@/modules/ordenes-b2b/actions'
import { claveColor, dedupPorClave } from '@/lib/color-match'
import { aMayusculasDescripcion } from '@/lib/descripcion'
import { stagingMinFilaPorCodigo } from '@/lib/orden-rapida-colores'
import type {
  CatalogItemOption,
  N8nDebugInfo,
  OrdenProductoPack,
  OrdenProductoResumen,
  SeparacionSugerida,
  WizardCaja,
  WizardParsedData,
  WizardProducto,
} from './orden-rapida-types'

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function toText(value: unknown, fallback = '') {
  if (value == null) return fallback
  return String(value)
}

function parsePipeDelimited(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string' && value.trim()) {
    return value.split('|').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function stringifyPreview(value: unknown, maxLength = 1200) {
  try {
    if (typeof value === 'string') {
      return value.slice(0, maxLength)
    }
    return JSON.stringify(value, null, 2).slice(0, maxLength)
  } catch {
    return '[no se pudo serializar preview]'
  }
}

function tryParseJsonString(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

export function parseContainerCode(code: string) {
  const match = code.trim().match(/^(\d{4})-(\d+)$/)
  if (match) {
    return {
      year: parseInt(match[1], 10),
      seq: parseInt(match[2], 10),
      isStandard: true,
    }
  }
  return {
    year: 0,
    seq: 0,
    isStandard: false,
  }
}

export function aplicarDatosDbAProducto(
  producto: WizardProducto,
  dbProd: DbProductoData,
  catalogos: {
    marcas: CatalogItemOption[]
    generos: CatalogItemOption[]
    edades: CatalogItemOption[]
    tipos_prenda: CatalogItemOption[]
  }
): WizardProducto {
  const brandMatch = dbProd.marca_id
    ? catalogos.marcas.find((m) => m.id === dbProd.marca_id)
    : dbProd.marca_nombre
      ? catalogos.marcas.find((m) => m.nombre.toUpperCase() === dbProd.marca_nombre?.toUpperCase())
      : null

  const prendaMatch = dbProd.tipo_prenda_id
    ? catalogos.tipos_prenda.find((t) => t.id === dbProd.tipo_prenda_id)
    : dbProd.tipo_prenda_nombre
      ? catalogos.tipos_prenda.find((t) => t.nombre.toUpperCase() === dbProd.tipo_prenda_nombre?.toUpperCase())
      : null

  const generoMatch = dbProd.genero_id
    ? catalogos.generos.find((g) => g.id === dbProd.genero_id)
    : dbProd.genero_nombre
      ? catalogos.generos.find((g) => g.nombre.toUpperCase() === dbProd.genero_nombre?.toUpperCase())
      : null

  const edadMatch = dbProd.edad_id
    ? catalogos.edades.find((e) => e.id === dbProd.edad_id)
    : dbProd.edad_nombre
      ? catalogos.edades.find((e) => e.nombre.toUpperCase() === dbProd.edad_nombre?.toUpperCase())
      : null

  const dbDataSnapshot: DbProductoData = {
    ...dbProd,
    marca_nombre: brandMatch?.nombre ?? dbProd.marca_nombre,
    tipo_prenda_nombre: prendaMatch?.nombre ?? dbProd.tipo_prenda_nombre,
    genero_nombre: generoMatch?.nombre ?? dbProd.genero_nombre,
    edad_nombre: edadMatch?.nombre ?? dbProd.edad_nombre,
  }

  return {
    ...producto,
    producto_id: dbProd.id ?? producto.producto_id,
    sku_base: dbProd.sku_base || producto.sku_base,
    nombre: dbProd.nombre || dbProd.descripcion || producto.nombre,
    descripcion: dbProd.descripcion || dbProd.nombre || producto.descripcion,
    composicion: dbProd.composicion || producto.composicion,
    precio_unitario_usd:
      dbProd.precio_usd && dbProd.precio_usd > 0 ? dbProd.precio_usd : producto.precio_unitario_usd,
    marca_id: brandMatch ? brandMatch.id : (dbProd.marca_id ?? producto.marca_id),
    marca: brandMatch ? brandMatch.nombre : dbProd.marca_nombre || producto.marca,
    tipo_prenda_id: prendaMatch ? prendaMatch.id : (dbProd.tipo_prenda_id ?? producto.tipo_prenda_id),
    tipo_prenda: prendaMatch ? prendaMatch.nombre : dbProd.tipo_prenda_nombre || producto.tipo_prenda,
    genero_id: generoMatch ? generoMatch.id : (dbProd.genero_id ?? producto.genero_id),
    genero: generoMatch ? generoMatch.nombre : dbProd.genero_nombre || producto.genero,
    edad_id: edadMatch ? edadMatch.id : (dbProd.edad_id ?? producto.edad_id),
    edad: edadMatch ? edadMatch.nombre : dbProd.edad_nombre || producto.edad,
    db_sincronizado: dbDataSnapshot,
    es_nuevo: false,
    force_new: false,
  }
}

export function restaurarDatosPacking(producto: WizardProducto): WizardProducto {
  if (!producto.packing_original) {
    return {
      ...producto,
      es_nuevo: true,
      force_new: true,
    }
  }

  const p = producto.packing_original
  return {
    ...producto,
    sku_base: p.sku_base,
    nombre: p.nombre,
    descripcion: p.descripcion,
    tipo_prenda_id: p.tipo_prenda_id ?? null,
    tipo_prenda: p.tipo_prenda ?? '',
    genero_id: p.genero_id ?? null,
    genero: p.genero ?? '',
    edad_id: p.edad_id ?? null,
    edad: p.edad ?? '',
    marca_id: p.marca_id ?? null,
    marca: p.marca ?? '',
    composicion: p.composicion ?? '',
    precio_unitario_usd: p.precio_unitario_usd ?? 0,
    es_nuevo: true,
    force_new: true,
  }
}

export function resolverParserSelector(proveedorNombre: string): string {
  const normalized = (proveedorNombre || '').toLowerCase()

  if (normalized.includes('bonnie') || normalized.includes('tmb')) return 'bonnie'
  if (normalized.includes('moti')) return 'moti'
  if (normalized.includes('jenny') || normalized.includes('beterlon') || normalized.includes('shishi')) {
    return 'jenny'
  }
  if (
    normalized.includes('jackie') ||
    normalized.includes('jacky') ||
    normalized.includes('venkat') ||
    normalized.includes('vencart') ||
    normalized.includes('qingqing') ||
    normalized.includes('honor')
  ) {
    return 'jackie'
  }
  if (normalized.includes('tianyi')) return 'tianyi'

  return 'auto'
}

export function unwrapN8nResponse(data: unknown) {
  let payload = data

  for (let index = 0; index < 6; index += 1) {
    const parsed = tryParseJsonString(payload)
    if (parsed !== payload) {
      payload = parsed
      continue
    }

    if (Array.isArray(payload) && payload.length === 1) {
      payload = payload[0]
      continue
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>

      if ('data' in record && record.data != null) {
        payload = record.data
        continue
      }
      if ('json' in record && record.json != null) {
        payload = record.json
        continue
      }
      if ('body' in record && record.body != null) {
        payload = record.body
        continue
      }
      if ('response' in record && record.response != null) {
        payload = record.response
        continue
      }
      if ('result' in record && record.result != null) {
        payload = record.result
        continue
      }
    }

    break
  }

  return payload
}

function findNestedValue(data: unknown, targetKeys: string[], depth = 0): unknown {
  if (depth > 5 || data == null) return undefined

  const parsed = tryParseJsonString(data)
  if (parsed !== data) {
    return findNestedValue(parsed, targetKeys, depth + 1)
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const nested = findNestedValue(item, targetKeys, depth + 1)
      if (nested !== undefined) return nested
    }
    return undefined
  }

  if (typeof data !== 'object') return undefined

  const record = data as Record<string, unknown>
  for (const key of targetKeys) {
    if (key in record) return record[key]
  }

  for (const value of Object.values(record)) {
    const nested = findNestedValue(value, targetKeys, depth + 1)
    if (nested !== undefined) return nested
  }

  return undefined
}

function extractArrayFromPayload(data: Record<string, unknown>, keys: string[]): Array<Record<string, unknown>> {
  for (const key of keys) {
    const value = data[key]
    if (Array.isArray(value)) return value as Array<Record<string, unknown>>
  }

  const nested = findNestedValue(data, keys)
  if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>

  const items = findNestedValue(data, ['items'])
  if (Array.isArray(items)) return items as Array<Record<string, unknown>>

  const rows = findNestedValue(data, ['rows'])
  if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>

  if (typeof nested === 'string') {
    const reparsed = tryParseJsonString(nested)
    if (Array.isArray(reparsed)) return reparsed as Array<Record<string, unknown>>
  }

  return []
}

export function createDebugInfo(rawData: unknown, payload: unknown): N8nDebugInfo {
  const data = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const topLevelKeys = Object.keys(data)
  const productos = extractArrayFromPayload(data, ['productos_para_editar', 'productos'])
  const cajas = extractArrayFromPayload(data, ['cajas_para_editar', 'cajas'])
  const detalles = extractArrayFromPayload(data, ['caja_detalles_para_editar', 'caja_detalles'])
  const warnings = Array.isArray(data.warnings) ? data.warnings : []

  return {
    topLevelType: Array.isArray(payload) ? 'array' : typeof payload,
    topLevelKeys,
    productosCount: productos.length,
    cajasCount: cajas.length,
    detallesCount: detalles.length,
    warningsCount: warnings.length,
    rawPreview: stringifyPreview(rawData),
    unwrappedPreview: stringifyPreview(payload),
  }
}

export function adaptarN8nAWizard(payload: unknown): WizardParsedData {
  const data = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const productosRaw = extractArrayFromPayload(data, ['productos_para_editar', 'productos'])
  const cajasRaw = extractArrayFromPayload(data, ['cajas_para_editar', 'cajas'])
  const detallesRaw = extractArrayFromPayload(data, ['caja_detalles_para_editar', 'caja_detalles'])

  const productos: WizardProducto[] = productosRaw.map((producto) => ({
    ...producto,
    sku_base: String(producto.sku_base ?? ''),
    sku_raw: String(producto.sku_raw ?? producto.sku_base ?? ''),
    nombre: toText(producto.nombre),
    marca: toText(producto.marca),
    descripcion: aMayusculasDescripcion(typeof producto.descripcion === 'string' ? producto.descripcion : ''),
    composicion: toText(producto.composicion),
    precio_yuan: toNumber(producto.precio_yuan),
    precio_unitario_usd: toNumber(producto.precio_unitario_usd),
    estado_temporal: String(producto.estado_temporal ?? 'pendiente_revision'),
    tipo_prenda: toText(producto.tipo_prenda),
    es_nuevo: Boolean(producto.es_nuevo),
    costo_promedio: toNumber(producto.costo_promedio ?? producto.precio_unitario_usd),
  }))

  const cajas: WizardCaja[] = cajasRaw.map((caja) => {
    const detallesCaja = detallesRaw.filter((detalle) => detalle.codigo_caja_temporal === caja.codigo_caja_temporal)
    const tallas = Array.from(new Set(detallesCaja.map((detalle) => String(detalle.talla_codigo || '')).filter(Boolean)))
    const coloresVistos = new Map<string, string>()
    for (const d of detallesCaja) {
      const r = d.color_raw
      if (!r) continue
      const k = claveColor(String(r))
      if (!coloresVistos.has(k)) coloresVistos.set(k, String(r))
    }
    const colores = Array.from(coloresVistos.values())
    const valores: Record<string, Record<string, number>> = {}

    for (const color of colores) {
      valores[color] = {}
      for (const talla of tallas) {
        const detalle = detallesCaja.find(
          (item) => claveColor(String(item.color_raw || '')) === claveColor(color) && item.talla_codigo === talla
        )
        valores[color][talla] = toNumber(detalle?.cantidad_por_caja)
      }
    }

    const cajaTallas = parsePipeDelimited(caja.tallas)
    const cajaColores = dedupPorClave(parsePipeDelimited(caja.colores))
    const tallasFinales = cajaTallas.length > 0 ? cajaTallas : tallas
    const coloresFinales = cajaColores.length > 0 ? cajaColores : colores

    return {
      ...caja,
      codigo_caja_temporal: String(caja.codigo_caja_temporal ?? ''),
      codigo_caja: String(caja.codigo_caja_temporal ?? caja.codigo_caja ?? ''),
      sku_base: String(caja.sku_base ?? ''),
      sku_raw: String(caja.sku_raw ?? caja.sku_base ?? ''),
      nombre_pack: String(caja.nombre_pack ?? 'PACK UNICO'),
      piezas_por_caja: toNumber(caja.piezas_por_caja),
      cantidad_cajas: toNumber(caja.cantidad_cajas),
      total_piezas: toNumber(caja.total_piezas),
      peso_bruto_kg: toNumber(caja.peso_bruto_kg),
      peso_bruto_total_kg: toNumber(caja.peso_bruto_total_kg),
      peso_neto_kg: toNumber(caja.peso_neto_kg),
      peso_neto_total_kg: toNumber(caja.peso_neto_total_kg),
      largo_cm: toNumber(caja.largo_cm),
      ancho_cm: toNumber(caja.ancho_cm),
      alto_cm: toNumber(caja.alto_cm),
      cbm: toNumber(caja.cbm_por_caja ?? caja.cbm),
      cbm_por_caja: toNumber(caja.cbm_por_caja ?? caja.cbm),
      cbm_total_linea: toNumber(caja.cbm_total_linea),
      tallas: tallasFinales,
      colores: coloresFinales,
      matriz: {
        tallas: tallasFinales,
        colores: coloresFinales,
        valores,
      },
      estado_temporal: String(caja.estado_temporal ?? 'pendiente_revision'),
      validacion: (caja.validacion as string | Record<string, unknown> | null) ?? null,
      tipo_caja: String(caja.tipo_caja ?? 'completa'),
    }
  })

  // Herencia de piezas: la caja sin valor la toma de su principal (SKU, pack)
  const cajasPorSkuPackHeredar = new Map<string, WizardCaja[]>()
  for (const c of cajas) {
    if (c.tipo_caja === 'padre_resumen') continue
    const k = `${String(c.sku_base || '').trim().toUpperCase()}||${String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase()}`
    if (!cajasPorSkuPackHeredar.has(k)) cajasPorSkuPackHeredar.set(k, [])
    cajasPorSkuPackHeredar.get(k)!.push(c)
  }
  for (const [, grupo] of cajasPorSkuPackHeredar) {
    const principal = [...grupo].sort(
      (a, b) =>
        Number(b.cantidad_cajas ?? 0) - Number(a.cantidad_cajas ?? 0) ||
        Number(b.piezas_por_caja ?? 0) - Number(a.piezas_por_caja ?? 0)
    )[0]
    const pz = principal ? Number(principal.piezas_por_caja ?? 0) : 0
    if (!(pz > 0)) continue
    const codPrin = String(principal.codigo_caja || principal.codigo_caja_temporal || '')
    for (const c of grupo) {
      if (!(Number(c.piezas_por_caja ?? 0) > 0)) {
        c.piezas_por_caja = pz
        ;(c as Record<string, unknown>).piezas_heredadas = true
        ;(c as Record<string, unknown>).piezas_heredadas_de = codPrin
      }
    }
  }

  const resumen = ((data.orden_preview ?? data.resumen ?? {}) as Record<string, unknown>) || {}
  const ordenProductosRaw = Array.isArray(resumen.orden_productos)
    ? (resumen.orden_productos as Array<Record<string, unknown>>)
    : []
  const ordenProductos: OrdenProductoResumen[] = ordenProductosRaw.map((op) => ({
    sku: String(op.sku ?? op.sku_base ?? ''),
    nombre: toText(op.nombre),
    marca: toText(op.marca),
    cantidad_total: toNumber(op.cantidad_total ?? op.piezas_pedidas),
    numero_cajas_reales: toNumber(op.numero_cajas_reales ?? op.cajas_pedidas),
    cbm_total: toNumber(op.cbm_total ?? op.cbm_detalle),
    peso_bruto_total: toNumber(op.peso_bruto_total ?? op.peso_bruto_kg),
  }))

  return {
    orden: {
      estado: String(resumen.estado ?? 'Requiere revision'),
      total_productos: toNumber(resumen.total_productos ?? productos.length),
      total_cajas: toNumber(resumen.total_cajas ?? cajas.length),
      total_piezas: toNumber(resumen.total_piezas),
      cbm_estimado: toNumber(resumen.cbm_orden),
      peso_bruto_total_kg: toNumber(resumen.peso_bruto_total_kg),
      costo_estimado_usd: 0,
      moneda: 'USD',
      orden_productos: ordenProductos,
    },
    productos,
    cajas,
    detalles: detallesRaw,
    warnings: Array.isArray(data.warnings) ? (data.warnings as WizardParsedData['warnings']) : [],
    orden_productos_pack: Array.isArray(data.orden_productos_pack)
      ? (data.orden_productos_pack as Array<Record<string, unknown>>)
          .map((op) => ({
            sku_base: String(op.sku_base ?? op.sku ?? ''),
            nombre_pack: String(op.nombre_pack ?? 'PACK UNICO'),
            cajas_pedidas: toNumber(op.cajas_pedidas),
            piezas_pedidas: toNumber(op.piezas_pedidas),
            fuente: toText(op.fuente),
          }))
          .filter((op: OrdenProductoPack) => op.sku_base)
      : [],
    separacion_sugerida: Array.isArray(data.separacion_sugerida) ? (data.separacion_sugerida as SeparacionSugerida[]) : [],
    colores_por_confirmar: Array.isArray(data.colores_por_confirmar)
      ? (data.colores_por_confirmar as WizardParsedData['colores_por_confirmar'])
      : [],
    colores_traducidos: Array.isArray(data.colores_traducidos)
      ? (data.colores_traducidos as WizardParsedData['colores_traducidos'])
      : [],
    requiere_revision_manual: Boolean((data.metadata as Record<string, unknown> | undefined)?.requiere_revision_manual),
    staging_por_codigo: stagingMinFilaPorCodigo(
      ((data.staging_sugerido as Record<string, unknown> | undefined)?.packing_lineas_staging ??
        data.packing_lineas_staging ??
        []) as Array<{ codigo_caja_temporal?: string; fila_origen?: number }>
    ),
    raw: payload,
  }
}

export function wizardCajaToSharedCajaData(caja: WizardCaja, index: number): SharedCajaData {
  const contenidoMap =
    caja.matriz && caja.matriz.tallas.length > 0 && caja.matriz.colores.length > 0
      ? {
          tallas: caja.matriz.tallas,
          colores: caja.matriz.colores,
          matriz: caja.matriz.valores,
          totalPiezas: caja.matriz.colores.reduce((sum, color) => {
            return sum + caja.matriz.tallas.reduce((s, talla) => s + (caja.matriz.valores[color]?.[talla] || 0), 0)
          }, 0),
        }
      : null

  return {
    id: index + 1,
    codigo_caja: caja.codigo_caja,
    nombre_pack: caja.nombre_pack,
    producto_sku: caja.sku_base || null,
    piezas_por_caja: caja.piezas_por_caja,
    cbm: caja.cbm,
    peso_bruto_kg: caja.peso_bruto_kg,
    peso_neto: caja.peso_neto_kg,
    largo_cm: caja.largo_cm,
    ancho_cm: caja.ancho_cm,
    alto_cm: caja.alto_cm,
    costo_total_caja: caja.costo_promedio ?? null,
    tallas: caja.tallas?.join('|') || null,
    colores: caja.colores?.join('|') || null,
    contenidoMap,
    cantidad_cajas: caja.cantidad_cajas,
    es_principal: null,
  }
}

export function buildCatalogoItemsFromStrings(items: string[]): CatalogoItem[] {
  return items.map((item, idx) => ({
    id: -(100000 + idx),
    nombre: item,
    codigo: item,
  }))
}
