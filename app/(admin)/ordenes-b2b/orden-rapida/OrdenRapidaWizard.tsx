// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ordenes-b2b\orden-rapida\OrdenRapidaWizard.tsx
'use client'

import { useState, useTransition, useMemo, memo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronsUpDown, ClipboardCheck, ChevronDown, ChevronRight, ChevronUp, Database, FileSpreadsheet, FileUp, GripVertical, Hand, HelpCircle, Loader2, Package, Scale, Sparkles, AlertTriangle, ExternalLink, Plus, Trash2, X, Pencil, Calculator, RefreshCw, Search, ScanSearch, ShieldCheck, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { ADMIN_ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PersonaRow } from '@/lib/types/tables'
import type { SharedCajaData } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import { createColorAction, resolverHexColorAction } from '@/modules/catalogo/actions'
import { guardarOrdenRapidaB2BAction, verificarSkusEnBDAction, obtenerDatosProductosDeBDAction, buscarSkuEnBDAction, obtenerColoresActivosAction } from '@/modules/ordenes-b2b/actions'
import type { CatalogoColorOrdenRapida } from '@/modules/ordenes-b2b/actions'
import { resolveColor, buildColorDraft, suggestEs, claveColor, dedupPorClave, filtrarColoresCatalogo, normalizeColorKey, esColorIgnorable } from '@/lib/color-match'
import { aMayusculasDescripcion } from '@/lib/descripcion'
import type { CatalogColor } from '@/lib/color-match'
import { seedColoresPorConfirmar, siguienteLetraPack, partirRangosCarton, stagingMinFilaPorCodigo, calcularDestinos, dedupSeparaciones, mapaNombresResueltos } from '@/lib/orden-rapida-colores'
import { agruparCajasPorProducto, aplicarEdicionCaja, detallesDesdeMatriz, fijarPzMinima, aplicarRepartoSeparacion, aplicarMapaColoresACajas, enriquecerDetallesConMapa } from '@/lib/orden-rapida-cajas'
import type { CajaEditPayload } from '@/lib/orden-rapida-cajas'
import type { SkuProbable } from '@/modules/ordenes-b2b/actions'
import { compararCajasLineasVsFisico } from '@/modules/contenedores/match-cajas'
import { detectProductAttributesFromText, inferEdadFromGeneroAndText, type DetectorCatalogos } from '@/modules/catalogo/utils/detector'


type ContainerMock = {
  id: number
  codigo_contenedor: string
  numero_contenedor: string | null
  estado: string | null
  activo?: boolean | null
}

type CatalogItemOption = { id: number; nombre: string }

type WizardProps = {
  proveedores: PersonaRow[]
  clientes: PersonaRow[]
  contenedores: ContainerMock[]
  marcas?: CatalogItemOption[]
  generos?: CatalogItemOption[]
  edades?: CatalogItemOption[]
  tipos_prenda?: CatalogItemOption[]
}

type WizardWarning = {
  codigo?: string
  mensaje?: string
  detalle?: string
}

type WizardProducto = {
  temp_id?: string
  producto_id?: number | null
  sku_base: string
  sku_raw?: string
  nombre?: string
  marca?: string
  marca_id?: number | null
  genero?: string
  genero_id?: number | null
  edad?: string
  edad_id?: number | null
  tipo_prenda?: string
  tipo_prenda_id?: number | null
  json_marca?: string
  descripcion?: string
  composicion?: string
  precio_yuan?: number
  precio_unitario_usd?: number
  estado_temporal?: string
  es_nuevo?: boolean
  force_new?: boolean
  costo_promedio?: number
  [key: string]: unknown
}

type WizardCaja = {
  producto_temp_id?: string
  producto_id?: number | null
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
  validacion?: string | Record<string, unknown> | null
  tipo_caja?: string
  costo_promedio?: number
  [key: string]: unknown
}

type OrdenProductoResumen = {
  sku: string
  nombre?: string
  marca?: string
  cantidad_total: number
  numero_cajas_reales: number
  cbm_total: number
  peso_bruto_total: number
}

type OrdenProductoPack = {
  sku_base: string
  nombre_pack: string
  cajas_pedidas: number
  piezas_pedidas: number
  fuente?: string
}

// Fase 2: separacion sugerida por n8n (MOTI pegados / packs duplicados)
type SeparacionSugerida = {
  tipo?: string
  sku_base_original?: string
  header_row?: number | null
  productos_candidatos?: Array<{ sku_base: string; alias?: string | null; filas?: number[]; cartones?: string[] }>
  packs_candidatos?: Array<{ nombre_actual: string; sugerido?: string | null; cartones?: string[] }>
  reparto_exacto?: Array<{ codigo_caja_temporal: string; sku_base_sugerido: string; motivo?: string }>
  cajas_para_revisar?: string[]
  confianza?: string
  motivo?: string
  fuente?: string
}

// Fase 2: color por confirmar (match contra cat_colores / crear)
type ColorPorConfirmar = {
  raw: string
  en?: string | null
  es?: string | null
  cajas?: string[]
  fuente?: string
  estado: 'nuevo' | 'mapeado' | 'creado' | 'omitido' | 'existente'
  color_id?: number | null
  via?: string | null
}

// Fase 2: borrador editable del modal de colores nuevos
type ColorDraft = {
  nombre: string
  nombre_intern: string
  codigo: string
  hex_code: string
  tipo_color: string
  mapear_a_id: number | null
}

type WizardParsedData = {
  orden: {
    estado: string
    total_productos: number
    total_cajas: number
    total_piezas: number
    cbm_estimado: number
    peso_bruto_total_kg: number
    costo_estimado_usd: number
    moneda: string
    orden_productos: OrdenProductoResumen[]
  }
  productos: WizardProducto[]
  cajas: WizardCaja[]
  detalles: Array<Record<string, unknown>>
  warnings: WizardWarning[]
  orden_productos_pack: OrdenProductoPack[]
  separacion_sugerida: SeparacionSugerida[]
  colores_por_confirmar: Array<{ raw: string; en?: string | null; es?: string | null; cajas?: string[]; fuente?: string }>
  colores_traducidos: Array<{ raw: string; en?: string | null; es?: string | null; motivo?: string }>
  requiere_revision_manual: boolean
  staging_por_codigo: Record<string, number>
  raw: unknown
}

type N8nDebugInfo = {
  topLevelType: string
  topLevelKeys: string[]
  productosCount: number
  cajasCount: number
  detallesCount: number
  warningsCount: number
  rawPreview: string
  unwrappedPreview: string
}

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
    return value.split('|').map(s => s.trim()).filter(Boolean)
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
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }

  return value
}

function parseContainerCode(code: string) {
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

export type ParserFormatOption = {
  id: string
  label: string
  shortDesc: string
  fullDesc: string
  headerPreview: string
  proveedoresEjemplo: string
  badgeColor: string
}

export const PARSER_FORMATS: ParserFormatOption[] = [
  {
    id: 'auto',
    label: '✨ Auto (Detectar por Proveedor)',
    shortDesc: 'Selecciona automáticamente la rama según el proveedor origen',
    fullDesc: 'Analiza el nombre del socio comercial y elige la plantilla más adecuada (MOTI, Bonnie, Jackie, Tianyi o General).',
    headerPreview: 'Auto-detección basada en el socio comercial',
    proveedoresEjemplo: 'Cualquier proveedor',
    badgeColor: 'border-primary/40 bg-primary/10 text-primary',
  },
  {
    id: 'bonnie',
    label: '🏷️ Formato Bonnie / TMB',
    shortDesc: 'Tallas en columnas (CH/S, M/M, G/L) con PACK A/B y triple QTY',
    fullDesc: 'Para archivos con encabezados STYLE NO | COLOR | SIZE (C/NO) y tallas en columnas horizontales, seguidas de columnas triples: QTY (cajas), PACKING (pzs/caja), QTY (total). Soporta packs (PACK A, PACK B) y cajas sueltas/remanentes.',
    headerPreview: 'STYLE NO | COLOR | SIZE (C/NO) | CH/S | M/M | G/L | EG/XL | QTY | PACKING | QTY',
    proveedoresEjemplo: 'Bonnie, TMB, fabricantes de conjuntos y sets deportivos',
    badgeColor: 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    id: 'moti',
    label: '📦 Formato MOTI Bloques',
    shortDesc: 'Bloques matriciales repetidos con encabezados de 2 filas y subtotales',
    fullDesc: 'Para archivos estructurados en bloques separados por filas vacías, con encabezados de 2 filas (CTN NO., OF CTNS, STYLE NO.) y tablas de subtotales al pie de cada bloque (TTL CBM, TTL G.W.).',
    headerPreview: 'CTN. NO. | QTY OF CTNS | STYLE NO. | BRAND NAME | COMPOSICION | PRECIO | S/CH | M/M...',
    proveedoresEjemplo: 'MOTI, Movamoda, confecciones en bloques',
    badgeColor: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    id: 'jackie',
    label: '📑 Formato Jackie / Venkat',
    shortDesc: 'Libros de Excel con múltiples hojas/pestañas de modelos',
    fullDesc: 'Para archivos que desglosan cada estilo o modelo en pestañas independientes dentro del mismo libro de Excel.',
    headerPreview: '[Hoja 1: Estilo A] [Hoja 2: Estilo B] [Hoja 3: Desglose Cajas]',
    proveedoresEjemplo: 'Jackie, Jacky, Venkat, Vencart, QingQing, Honor, camisería multi-hoja',
    badgeColor: 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
  },
  {
    id: 'jenny',
    label: '🧵 Formato Jenny / Beterlon',
    shortDesc: 'Multi-hoja con Style No. como verdad, PACK opcional y cartones únicos por rango',
    fullDesc: 'Para archivos SHISHI BETERLON con varias hojas: toma la columna Style No. (nunca el nombre de hoja), agrupa por pack y cuenta cartones únicos del rango. Sin cajas remanente.',
    headerPreview: 'Style No. | PACK | Color | tallas... | Pcs/Ctn | Ctn no. | Ctns',
    proveedoresEjemplo: 'Jenny, Shishi Beterlon',
    badgeColor: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  },
  {
    id: 'tianyi',
    label: '📊 Formato Tianyi Resumen',
    shortDesc: 'Tabla con cabecera de resumen consolidado superior',
    fullDesc: 'Para archivos con un cuadro resumen superior de totales y desglose continuo de cajas en la parte inferior.',
    headerPreview: 'RESUMEN: [TOTAL CTNS | TOTAL PCS | TOTAL CBM] ... DETALLE: [CTN 1..N]',
    proveedoresEjemplo: 'Tianyi, exportadores textiles consolidados',
    badgeColor: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  {
    id: 'general',
    label: '📄 Formato General Estándar',
    shortDesc: 'Plantilla tabular clásica de fila por variante',
    fullDesc: 'Para plantillas sencillas donde cada fila representa una combinación de producto, color y talla con columnas de piezas y cajas.',
    headerPreview: 'SKU | DESCRIPCION | COLOR | TALLA | PIEZAS_POR_CAJA | TOTAL_CAJAS',
    proveedoresEjemplo: 'Proveedores genéricos, plantillas estándar',
    badgeColor: 'border-gray-300 bg-gray-50 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300',
  },
]

function resolverParserSelector(proveedorNombre: string): string {
  const normalized = (proveedorNombre || '').toLowerCase()

  if (normalized.includes('bonnie') || normalized.includes('tmb')) return 'bonnie'
  if (normalized.includes('moti')) return 'moti'
  if (
    normalized.includes('jenny') ||
    normalized.includes('beterlon') ||
    normalized.includes('shishi')
  ) {
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

function unwrapN8nResponse(data: unknown) {
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

function extractArrayFromPayload(data: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = data[key]
    if (Array.isArray(value)) return value
  }

  const nested = findNestedValue(data, keys)
  if (Array.isArray(nested)) return nested

  const items = findNestedValue(data, ['items'])
  if (Array.isArray(items)) return items

  const rows = findNestedValue(data, ['rows'])
  if (Array.isArray(rows)) return rows

  if (typeof nested === 'string') {
    const reparsed = tryParseJsonString(nested)
    if (Array.isArray(reparsed)) return reparsed
  }

  return []
}

function createDebugInfo(rawData: unknown, payload: unknown): N8nDebugInfo {
  const data = payload && typeof payload === 'object' ? (payload as Record<string, any>) : {}
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

function adaptarN8nAWizard(payload: unknown): WizardParsedData {
  const data = payload && typeof payload === 'object' ? (payload as Record<string, any>) : {}
  const productosRaw = extractArrayFromPayload(data, ['productos_para_editar', 'productos'])
  const cajasRaw = extractArrayFromPayload(data, ['cajas_para_editar', 'cajas'])
  const detallesRaw = extractArrayFromPayload(data, ['caja_detalles_para_editar', 'caja_detalles'])

  const productos = productosRaw.map((producto: Record<string, any>) => ({
    ...producto,
    sku_base: String(producto.sku_base ?? ''),
    sku_raw: String(producto.sku_raw ?? producto.sku_base ?? ''),
    nombre: toText(producto.nombre),
    marca: toText(producto.marca),
    descripcion: aMayusculasDescripcion(producto.descripcion),
    composicion: toText(producto.composicion),
    precio_yuan: toNumber(producto.precio_yuan),
    precio_unitario_usd: toNumber(producto.precio_unitario_usd),
    estado_temporal: String(producto.estado_temporal ?? 'pendiente_revision'),
    tipo_prenda: toText(producto.tipo_prenda),
    es_nuevo: Boolean(producto.es_nuevo),
    costo_promedio: toNumber(producto.costo_promedio ?? producto.precio_unitario_usd),
  }))

  const cajas = cajasRaw.map((caja: Record<string, any>) => {
    const detallesCaja = detallesRaw.filter(
      (detalle: Record<string, any>) => detalle.codigo_caja_temporal === caja.codigo_caja_temporal,
    )
    const tallas = Array.from(
      new Set(detallesCaja.map((detalle: Record<string, any>) => detalle.talla_codigo).filter(Boolean)),
    ) as string[]
    // Colores deduplicados por clave insensible (case/acentos/espacios),
    // conservando el primer raw como display.
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
          (item: Record<string, any>) => claveColor(String(item.color_raw || '')) === claveColor(color) && item.talla_codigo === talla,
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
      validacion: caja.validacion ?? null,
      tipo_caja: String(caja.tipo_caja ?? 'completa'),
    }
  })

  // Herencia de piezas: la caja sin valor la toma de su principal (SKU, pack)
  // y se marca para badge visible. Sin principal con valor, queda en 0 y
  // el bloqueo sinPz existente impide guardar.
  const cajasPorSkuPackHeredar = new Map<string, WizardCaja[]>()
  for (const c of cajas) {
    if (c.tipo_caja === 'padre_resumen') continue
    const k = `${String(c.sku_base || '').trim().toUpperCase()}||${String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase()}`
    if (!cajasPorSkuPackHeredar.has(k)) cajasPorSkuPackHeredar.set(k, [])
    cajasPorSkuPackHeredar.get(k)!.push(c)
  }
  for (const [, grupo] of cajasPorSkuPackHeredar) {
    const principal = [...grupo].sort((a, b) =>
      (Number(b.cantidad_cajas ?? 0) - Number(a.cantidad_cajas ?? 0))
      || (Number(b.piezas_por_caja ?? 0) - Number(a.piezas_por_caja ?? 0)),
    )[0]
    const pz = principal ? Number(principal.piezas_por_caja ?? 0) : 0
    if (!(pz > 0)) continue
    const codPrin = String(principal.codigo_caja || principal.codigo_caja_temporal || '')
    for (const c of grupo) {
      if (!(Number(c.piezas_por_caja ?? 0) > 0)) {
        c.piezas_por_caja = pz
        ;(c as unknown as Record<string, unknown>).piezas_heredadas = true
        ;(c as unknown as Record<string, unknown>).piezas_heredadas_de = codPrin
      }
    }
  }

  const resumen = data.orden_preview ?? data.resumen ?? {}
  const ordenProductosRaw = Array.isArray(resumen.orden_productos) ? resumen.orden_productos : []
  // Tolerante a ambos shapes de n8n: {sku, cantidad_total, numero_cajas_reales, ...}
  // y {sku_base, piezas_pedidas, cajas_pedidas, ...} (parser sku-style v1).
  const ordenProductos: OrdenProductoResumen[] = ordenProductosRaw.map((op: Record<string, any>) => ({
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
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
    separacion_sugerida: Array.isArray(data.separacion_sugerida) ? (data.separacion_sugerida as SeparacionSugerida[]) : [],
    colores_por_confirmar: Array.isArray(data.colores_por_confirmar) ? data.colores_por_confirmar : [],
    colores_traducidos: Array.isArray(data.colores_traducidos) ? data.colores_traducidos : [],
    requiere_revision_manual: Boolean(
      (data.metadata as Record<string, unknown> | undefined)?.requiere_revision_manual,
    ),
    staging_por_codigo: stagingMinFilaPorCodigo(
      ((data.staging_sugerido as Record<string, unknown> | undefined)?.packing_lineas_staging
        ?? (data as Record<string, unknown>).packing_lineas_staging
        ?? []) as Array<{ codigo_caja_temporal?: string; fila_origen?: number }>,
    ),
    orden_productos_pack: Array.isArray((data as any).orden_productos_pack)
      ? (data as any).orden_productos_pack.map((op: Record<string, any>) => ({
        sku_base: String(op.sku_base ?? op.sku ?? ''),
        nombre_pack: String(op.nombre_pack ?? 'PACK UNICO'),
        cajas_pedidas: toNumber(op.cajas_pedidas),
        piezas_pedidas: toNumber(op.piezas_pedidas),
        fuente: toText((op as any).fuente),
      })).filter((op: OrdenProductoPack) => op.sku_base)
      : [],
    raw: payload,
  }
}

// --- Helpers para adaptar WizardCaja a CajaCard (SharedCajaData) ---

function wizardCajaToSharedCajaData(caja: WizardCaja, index: number): SharedCajaData {
  const contenidoMap = caja.matriz && caja.matriz.tallas.length > 0 && caja.matriz.colores.length > 0
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

function buildCatalogoItemsFromStrings(items: string[]): CatalogoItem[] {
  // IDs temporales negativos: jamas colisionan con ids reales del catalogo.
  return items.map((item, idx) => ({
    id: -(100000 + idx),
    nombre: item,
    codigo: item,
  }))
}

type AlertaCajaRow = {
  tipo?: string; severidad?: string; detalle?: string; issue?: string
}

type ColorMatchRow = { raw: string; found: boolean; via: string | null; nombre: string }

type WizardCajaRowProps = {
  caja: WizardCaja
  cpTallas: string[]
  cpColores: string[]
  catalogo: CatalogoColorOrdenRapida[]
  matchColores: ColorMatchRow[]
  alertasCaja: AlertaCajaRow[]
  nDetalles: number
  modoArrastre: boolean
  esArrastrada: boolean
  onToggleArrastrada: (codigo: string) => void
  onDragStartArrastrada: (codigo: string, e: React.DragEvent) => void
  onDragEndArrastrada: () => void
  onEditCodigo: (codigo: string, data: CajaEditPayload) => Promise<void>
  onRemoveCodigo: (codigo: string) => void
  onAbrirColores: (raw?: string) => void
  mapaResueltos: Record<string, { id: number; nombre: string }>
}

// Fila memoizada: solo re-renderiza si su caja o sus props cambian.
// (Antes, cada edicion reconstruia las N tarjetas del wizard.)
const WizardCajaRow = memo(function WizardCajaRow({
  caja, cpTallas, cpColores, catalogo, matchColores, alertasCaja, nDetalles,
  modoArrastre, esArrastrada, onToggleArrastrada, onDragStartArrastrada,
  onDragEndArrastrada, onEditCodigo, onRemoveCodigo, onAbrirColores, mapaResueltos,
}: WizardCajaRowProps) {
  const codTmp = String(caja.codigo_caja_temporal || '')
  const sharedCaja = useMemo(() => wizardCajaToSharedCajaData(caja, 0), [caja])
  const tallasCatalogo = useMemo(
    () => buildCatalogoItemsFromStrings(cpTallas.length > 0 ? cpTallas : (caja.matriz?.tallas || caja.tallas || [])),
    [cpTallas, caja],
  )
  const coloresCatalogo = useMemo((): CatalogoItem[] => {
    // Tabla completa primero (ids reales + EN visible); luego packing no
    // cubierto con ids temporales negativos (jamas colisionan).
    const reales: CatalogoItem[] = (catalogo || []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      codigo: c.codigo ?? c.nombre,
      nombre_intern: c.nombre_intern ?? null,
    }))
    const cubiertas = new Set<string>()
    for (const c of reales) {
      cubiertas.add(claveColor(c.nombre))
      if (c.nombre_intern) cubiertas.add(claveColor(c.nombre_intern))
      if (c.codigo) cubiertas.add(claveColor(c.codigo))
    }
    const packingCols = (caja.matriz?.colores || caja.colores || []) as string[]
    // Union deduplicada (el packing nunca desaparece): catalogo + packing no cubierto.
    const unionCols = dedupPorClave([...(cpColores.length > 0 ? cpColores : []), ...packingCols])
    const extra: CatalogoItem[] = []
    unionCols.forEach((col, idx) => {
      if (!cubiertas.has(claveColor(col))) {
        cubiertas.add(claveColor(col))
        extra.push({ id: -(200000 + idx), nombre: col, codigo: col })
      }
    })
    return [...reales, ...extra]
  }, [catalogo, cpColores, caja])
  const handleEditRow = useCallback((id: number, data: CajaEditPayload) => onEditCodigo(codTmp, data), [onEditCodigo, codTmp])
  const handleRemoveRow = useCallback(() => onRemoveCodigo(codTmp), [onRemoveCodigo, codTmp])

  return (
    <div key={caja.codigo_caja_temporal || caja.codigo_caja} className={`space-y-1.5 rounded-md p-1 transition-colors ${modoArrastre && esArrastrada ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
      {modoArrastre && (
        <span
          draggable
          onDragStart={(e) => onDragStartArrastrada(codTmp, e)}
          onDragEnd={onDragEndArrastrada}
          onClick={(e) => {
            e.stopPropagation()
            onToggleArrastrada(codTmp)
          }}
          title="Arrastra a otro producto o tócala y luego toca el destino"
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold cursor-grab active:cursor-grabbing select-none ${esArrastrada ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/60 text-muted-foreground hover:text-foreground'}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
          {esArrastrada ? 'Moviendo… toca destino' : 'Mover'}
        </span>
      )}
      {((caja as any).piezas_heredadas || (caja as any).piezas_estimadas || alertasCaja.length > 0 || nDetalles > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {(caja as any).piezas_heredadas && (
            <Badge
              variant="outline"
              className="border-sky-400 bg-sky-50 text-sky-800 font-bold"
              title={`Piezas por caja heredadas de ${(caja as any).piezas_heredadas_de || 'principal'}`}
            >
              ↩ {Number(caja.piezas_por_caja || 0)} pz heredadas
            </Badge>
          )}
          {(caja as any).piezas_estimadas && (
            <Badge
              variant="outline"
              className="border-amber-400 bg-amber-50 text-amber-800 font-bold"
              title="1 pza/caja temporal (botón Fijar 1 pza). Corrige el valor real editando la caja."
            >
              ⚠ 1 pz estimada
            </Badge>
          )}
          {nDetalles > 0 && (
            <Badge variant="secondary" title="Renglones de desglose talla/color en esta caja">
              🧵 {nDetalles} detalle{nDetalles !== 1 ? 's' : ''}
            </Badge>
          )}
          {matchColores.map((mc, mi) => (
            <Badge
              key={`${mc.raw}-${mi}`}
              variant="outline"
              className={`font-bold ${mc.found ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300' : 'border-amber-400 bg-amber-50 text-amber-800'}`}
              title={mc.found
                ? `"${mc.raw}" → ${mc.nombre} en catálogo (${mc.via ?? 'match'})`
                : `"${mc.raw}" sin match en catálogo: se propone crear "${mc.nombre}". Abre el panel de colores.`}
              onClick={() => { if (!mc.found) onAbrirColores() }}
              style={mc.found ? undefined : { cursor: 'pointer' }}
            >
              {mc.found ? '✔' : '⚠'} {mc.raw}{mc.found && claveColor(mc.nombre) !== claveColor(mc.raw) ? ` → ${mc.nombre}` : ''}
            </Badge>
          ))}
          {alertasCaja.map((a, i) => (
            <Badge
              key={i}
              variant="outline"
              className={a.severidad === 'alta' ? 'border-red-400 bg-red-50 text-red-800' : 'border-amber-400 bg-amber-50 text-amber-800'}
              title={a.detalle || a.issue || a.tipo || 'aviso n8n'}
            >
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {a.tipo === 'ia_calidad' ? 'IA: ' : ''}{String(a.detalle || a.issue || a.tipo || '').slice(0, 90)}
            </Badge>
          ))}
        </div>
      )}
      <CajaCard
        caja={sharedCaja}
        layout="horizontal"
        canEdit={true}
        canDelete={true}
        canEditOrden={true}
        tallasDisponibles={tallasCatalogo}
        coloresDisponibles={coloresCatalogo}
        onAbrirColores={(raw) => onAbrirColores(raw)}
        mapaResueltos={mapaResueltos}
        onEdit={handleEditRow}
        onRemove={handleRemoveRow}
        isPending={false}
      />
    </div>
  )
})

// Combobox buscable para mapear un color nuevo a uno existente del catalogo.
// Filtra insensible a case/acentos por nombre+codigo+intern. Estado local por
// tarjeta: no re-renderiza el resto del modal al escribir.
const MapearColorCombobox = memo(function MapearColorCombobox({ catalogo, onSelect }: {
  catalogo: CatalogoColorOrdenRapida[]
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const resultados = useMemo(() => filtrarColoresCatalogo(catalogo, q, 50), [catalogo, q])
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ('') }}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="h-7 w-44 justify-between text-[11px]"
          />
        }
      >
        <span className="truncate text-muted-foreground">Mapear a existente…</span>
        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar color…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              Sin resultados para &quot;{q}&quot;.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { onSelect(null); setOpen(false) }}>
                <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                Sin mapear
              </CommandItem>
              {resultados.map((cc) => (
                <CommandItem
                  key={cc.id}
                  value={`${cc.nombre} ${cc.codigo ?? ''} ${cc.nombre_intern ?? ''}`}
                  onSelect={() => { onSelect(cc.id); setOpen(false) }}
                >
                  <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                  <span className="truncate">{cc.nombre}</span>
                  {cc.nombre_intern ? (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{cc.nombre_intern}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

function ComparisonBadge({
  calculated,
  json,
  label,
  onSync,
}: {
  calculated: number
  json: number
  label?: string
  onSync?: () => void
}) {
  if (!json && json !== 0) return null
  const diffVal = calculated - json
  const absDiff = Math.abs(diffVal)
  const match = absDiff < 0.001
  const color = match
    ? 'text-emerald-600 font-semibold'
    : absDiff <= 1
    ? 'text-amber-600 font-bold'
    : 'text-red-600 font-bold'

  return (
    <div className="flex flex-col gap-0.5 mt-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] py-0 h-4 font-mono',
            match
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold'
              : 'border-amber-300 bg-amber-50 text-amber-900 font-bold',
          )}
        >
          {match ? '✓ Coincide con nota' : `Nota: ${json.toLocaleString(undefined, { maximumFractionDigits: 3 })}`}
        </Badge>
        {!match && onSync && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 px-1.5 text-[9px] text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 font-bold underline"
            onClick={(e) => {
              e.stopPropagation()
              onSync()
            }}
            title="Igualar valor objetivo de la nota al calculado en vivo por cajas"
          >
            Ajustar
          </Button>
        )}
      </div>
      {!match && (
        <span className={cn('text-[10px]', color)}>
          Diferencia: {diffVal > 0 ? `+${diffVal.toLocaleString(undefined, { maximumFractionDigits: 3 })}` : diffVal.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </span>
      )}
    </div>
  )
}

// Celda de edición SKU con estado local: teclea letra por letra sin re-render
// del wizard (el padre solo recibe el valor al confirmar con blur/Enter).
const SkuEditCell = memo(function SkuEditCell({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const committedRef = useRef(value)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (inputRef.current && inputRef.current === document.activeElement) return
    committedRef.current = value
    setDraft(value)
  }, [value])
  return (
    <Textarea
      ref={inputRef}
      rows={2}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== committedRef.current) {
          committedRef.current = draft
          onCommit(draft)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(committedRef.current)
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  )
})

export function OrdenRapidaWizard({
  proveedores,
  clientes,
  contenedores,
  marcas = [],
  generos = [],
  edades = [],
  tipos_prenda = [],
}: WizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()

  const [selectedProveedor, setSelectedProveedor] = useState(() => {
    const p18 = proveedores.find((p) => String(p.id) === '18')
    return p18 ? '18' : (proveedores[0] ? String(proveedores[0].id) : '')
  })
  const [selectedCliente, setSelectedCliente] = useState(() => {
    const c27 = clientes.find((c) => String(c.id) === '27')
    return c27 ? '27' : (clientes[0] ? String(clientes[0].id) : '')
  })
  const [selectedContenedor, setSelectedContenedor] = useState('new')
  const [newContainerCode, setNewContainerCode] = useState('')
  const [newContainerNumber, setNewContainerNumber] = useState('')

  const selectedProveedorObj = useMemo(
    () => proveedores.find((p) => String(p.id) === selectedProveedor),
    [proveedores, selectedProveedor],
  )

  const selectedClienteObj = useMemo(
    () => clientes.find((c) => String(c.id) === selectedCliente),
    [clientes, selectedCliente],
  )

  const sortedContenedores = useMemo(
    () =>
      // Fijo solo activos (borrado lógico del CRUD): los inactivos ni aparecen
      // en el buscador de Destino de carga. `activo` ausente se trata como activo.
      [...contenedores]
        .filter((c) => (c as ContainerMock).activo !== false)
        .sort((a, b) => {
        const aParsed = parseContainerCode(a.codigo_contenedor)
        const bParsed = parseContainerCode(b.codigo_contenedor)

        if (aParsed.isStandard && bParsed.isStandard) {
          if (bParsed.year !== aParsed.year) {
            return bParsed.year - aParsed.year
          }
          return bParsed.seq - aParsed.seq
        }

        if (aParsed.isStandard && !bParsed.isStandard) return -1
        if (!aParsed.isStandard && bParsed.isStandard) return 1

        return b.codigo_contenedor.localeCompare(a.codigo_contenedor, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      }),
    [contenedores],
  )

  const selectedContenedorObj = useMemo(
    () => sortedContenedores.find((c) => String(c.id) === selectedContenedor),
    [sortedContenedores, selectedContenedor],
  )

  // ── Selector de contenedor buscable + aviso de surtido ──────────────
  // Estados que ya pasaron por surtido: se muestran en amarillo y con modal
  // de advertencia, pero se permite seleccionarlos para trazabilidad.
  const [contenedorPopoverOpen, setContenedorPopoverOpen] = useState(false)
  const [contenedorSearch, setContenedorSearch] = useState('')
  const [isSurtidoModalOpen, setIsSurtidoModalOpen] = useState(false)

  const isContenedorSurtidoLike = useCallback((estado: string | null | undefined) => {
    return estado === 'surtido' || estado === 'completo' || estado === 'cerrado'
  }, [])

  const selectedContenedorEsSurtido = isContenedorSurtidoLike(selectedContenedorObj?.estado)

  const filteredContenedores = useMemo(() => {
    const q = contenedorSearch.trim().toLowerCase()
    if (!q) return sortedContenedores
    return sortedContenedores.filter((c) =>
      `${c.codigo_contenedor} ${c.numero_contenedor ?? ''} ${c.estado ?? ''}`.toLowerCase().includes(q),
    )
  }, [sortedContenedores, contenedorSearch])

  const handleContenedorSelect = useCallback(
    (value: string) => {
      setSelectedContenedor(value)
      setContenedorPopoverOpen(false)
      setContenedorSearch('')
      if (value !== 'new') {
        const picked = sortedContenedores.find((c) => String(c.id) === value)
        if (picked && isContenedorSurtidoLike(picked.estado)) {
          setIsSurtidoModalOpen(true)
        }
      }
    },
    [sortedContenedores, isContenedorSurtidoLike],
  )

  // Si el seleccionado resulta inactivo (ya no viene en la lista de activos),
  // limpiar la selección para obligar a elegir uno activo o crear uno nuevo.
  useEffect(() => {
    if (selectedContenedor === 'new' || selectedContenedor === '') return
    const sigueActivo = sortedContenedores.some((c) => String(c.id) === selectedContenedor)
    if (!sigueActivo) {
      setSelectedContenedor('')
      toast.info('El contenedor seleccionado está inactivo: elige uno activo o crea uno nuevo.')
    }
  }, [sortedContenedores, selectedContenedor])

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [parsedData, setParsedData] = useState<WizardParsedData | null>(null)
  const [rawN8nResponse, setRawN8nResponse] = useState<unknown>(null)
  const [debugInfo, setDebugInfo] = useState<N8nDebugInfo | null>(null)
  const [warnings, setWarnings] = useState<WizardWarning[]>([])
  const [editableProductos, setEditableProductos] = useState<WizardProducto[]>([])
  const [editableCajas, setEditableCajas] = useState<WizardCaja[]>([])

  // Sobrescritura manual de metas/totales de la nota para los 6 KPIs
  const [overrideProductos, setOverrideProductos] = useState<number | null>(null)
  const [overrideCajas, setOverrideCajas] = useState<number | null>(null)
  const [overridePiezas, setOverridePiezas] = useState<number | null>(null)
  const [overrideCbm, setOverrideCbm] = useState<number | null>(null)
  const [overridePesoNeto, setOverridePesoNeto] = useState<number | null>(null)
  const [overridePeso, setOverridePeso] = useState<number | null>(null)
  // Dialogo compartido para editar valores objetivo de la nota (reemplaza window.prompt)
  const [overrideModal, setOverrideModal] = useState<{ key: 'productos' | 'cajas' | 'piezas' | 'cbm' | 'pesoNeto' | 'peso'; label: string } | null>(null)
  const [overrideValor, setOverrideValor] = useState('')
  const abrirOverride = (key: NonNullable<typeof overrideModal>['key'], label: string, actual: unknown) => {
    setOverrideValor(String(actual ?? ''))
    setOverrideModal({ key, label })
  }
  const aplicarOverride = () => {
    if (!overrideModal) return
    const esEntero = overrideModal.key === 'productos' || overrideModal.key === 'cajas' || overrideModal.key === 'piezas'
    const parsed = esEntero ? parseInt(overrideValor, 10) : parseFloat(overrideValor)
    const val = overrideValor.trim() === '' || isNaN(parsed) ? null : parsed
    if (overrideModal.key === 'productos') setOverrideProductos(val)
    else if (overrideModal.key === 'cajas') setOverrideCajas(val)
    else if (overrideModal.key === 'piezas') setOverridePiezas(val)
    else if (overrideModal.key === 'cbm') setOverrideCbm(val)
    else if (overrideModal.key === 'pesoNeto') setOverridePesoNeto(val)
    else setOverridePeso(val)
    setOverrideModal(null)
  }
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const [dbSkusSet, setDbSkusSet] = useState<Set<string>>(new Set())
  const [isCheckingDbSkus, setIsCheckingDbSkus] = useState(false)
  const [isSyncingDbProducts, setIsSyncingDbProducts] = useState(false)
  // Probables ámbar (sin auto-vínculo) + vínculos manuales uno por uno
  const [probablesDb, setProbablesDb] = useState<SkuProbable[]>([])
  const [vinculosDb, setVinculosDb] = useState<Record<string, { dbId: number; dbSku: string }>>({})
  // Comparativa n8n vs sistema por SKU (string detectado por n8n)
  const [skuN8nPorSku, setSkuN8nPorSku] = useState<Record<string, string>>({})
  const [alertaAmbarOpen, setAlertaAmbarOpen] = useState(false)

  const [deleteProductModal, setDeleteProductModal] = useState<{ open: boolean; index: number; sku: string } | null>(null)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [newSku, setNewSku] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newMarca, setNewMarca] = useState('')
  const [newPrecio, setNewPrecio] = useState('')

  const [selectedParserFormat, setSelectedParserFormat] = useState<string>(() => {
    const p18 = proveedores.find((p) => String(p.id) === '18') || proveedores[0]
    return p18 ? resolverParserSelector(p18.nombre_completo) : 'auto'
  })
  const [isParserGuideOpen, setIsParserGuideOpen] = useState(false)

  const handleProveedorChange = (newProvId: string) => {
    setSelectedProveedor(newProvId)
    const prov = proveedores.find((p) => String(p.id) === newProvId)
    if (prov) {
      const autoFormat = resolverParserSelector(prov.nombre_completo)
      setSelectedParserFormat(autoFormat)
    }
  }

  const [discrepancyModal, setDiscrepancyModal] = useState<{
    open: boolean
    items: Array<{ sku: string; piezasProducto: number; piezasCajas: number; diferencia: number }>
  } | null>(null)
  // Bloqueo absoluto modo solo cajas: cajas esperadas vs cajas armadas (sin continuar)
  // En paso 3 actúa como AVISO (blocking=false): se puede continuar al paso 4
  // a corregirlo. Solo al confirmar/guardar es bloqueo absoluto (blocking=true).
  const [cajasBlockModal, setCajasBlockModal] = useState<{
    open: boolean
    blocking: boolean
    items: Array<{ sku: string; cajasEsperadas: number; cajasArmadas: number; diferencia: number }>
  } | null>(null)
  // Huecos rellenados desde físico (SKUs en mayúsculas) — indicadores
  const [huecosRellenados, setHuecosRellenados] = useState<string[]>([])
  // Línea editada por producto (skuUpper -> cajas esperadas corregidas).
  // La verdad es lo editado: prevalece sobre el JSON al validar el match.
  const [lineaEditadaPorSku, setLineaEditadaPorSku] = useState<Record<string, number>>({})
  const [editLineaSku, setEditLineaSku] = useState<string | null>(null)
  const [editLineaVal, setEditLineaVal] = useState('')
  // Línea editada por pack (skuUpper||packUpper -> cajas esperadas del pack).
  const [lineaEditadaPorPack, setLineaEditadaPorPack] = useState<Record<string, number>>({})
  const [editPackSku, setEditPackSku] = useState<string | null>(null)
  const [editPackVal, setEditPackVal] = useState('')
  // Fase 2: renombrar pack (packKey -> nombre en edicion + valor)
  const [editPackNombre, setEditPackNombre] = useState<string | null>(null)
  const [editPackNombreVal, setEditPackNombreVal] = useState('')
  // Caja principal por producto (skuUpper -> codigo_caja elegido; default = mayor cantidad)
  const [principalPorSku, setPrincipalPorSku] = useState<Record<string, string>>({})
  const [isConfirmFinalModalOpen, setIsConfirmFinalModalOpen] = useState(false)
  // Verificación local pre-subida: snapshot + errores en tiempo real para habilitar carga a DB
  const [verificacionManual, setVerificacionManual] = useState<{ hash: string; ok: boolean; fecha: number } | null>(null)
  const [mostrarErroresSubida, setMostrarErroresSubida] = useState(false)
  const [codigoRenameDrafts, setCodigoRenameDrafts] = useState<Record<string, string>>({})
  const [modalLineaDrafts, setModalLineaDrafts] = useState<Record<string, string>>({})
  const [modalPackDrafts, setModalPackDrafts] = useState<Record<string, string>>({})
  const [modalCajaNumDrafts, setModalCajaNumDrafts] = useState<Record<string, string>>({})
  // Búsqueda BD bajo demanda por fila (lápiz 🔍): temp_id en curso
  const [buscandoDb, setBuscandoDb] = useState<Set<string>>(new Set())
  const [editandoSku, setEditandoSku] = useState<string | null>(null)
  // Modo arrastre paso 4: grips visibles, tap-to-move en móvil, amarillos atenuados
  const [modoArrastre, setModoArrastre] = useState(false)
  // Caja seleccionada para mover (codigo_caja_temporal) en modo arrastre/tap
  const [cajaArrastrada, setCajaArrastrada] = useState<string | null>(null)
  // Producto resaltado como destino durante drag (skuUpper)
  const [dragOverProducto, setDragOverProducto] = useState<string | null>(null)
  // Amarillos colapsados: una fila + expandir
  const [showWarnings, setShowWarnings] = useState(false)
  const [showHuecos, setShowHuecos] = useState(false)
  // Fase 2: separacion sugerida (MOTI/packs) + colores por confirmar
  const [catalogoColores, setCatalogoColores] = useState<CatalogoColorOrdenRapida[]>([])
  const [coloresPorConfirmar, setColoresPorConfirmar] = useState<ColorPorConfirmar[]>([])
  const [separacionIgnorada, setSeparacionIgnorada] = useState(false)
  const [coloresModalOpen, setColoresModalOpen] = useState(false)
  const [colorDrafts, setColorDrafts] = useState<Record<string, ColorDraft>>({})
  const [filtroPendientes, setFiltroPendientes] = useState('')
  // Fase 2: filas con sugerencia HEX en curso (evita doble clic).
  const [hexSugiriendo, setHexSugiriendo] = useState<Set<string>>(new Set())

  const resetParsedState = () => {
    setParsedData(null)
    setRawN8nResponse(null)
    setDebugInfo(null)
    setWarnings([])
    setEditableProductos([])
    setEditableCajas([])
    setExpandedProducts(new Set())
    setDbSkusSet(new Set())
    setProbablesDb([])
    setVinculosDb({})
    setSkuN8nPorSku({})
    setHuecosRellenados([])
    setLineaEditadaPorSku({})
    setEditLineaSku(null)
    setLineaEditadaPorPack({})
    setEditPackSku(null)
    setEditPackVal('')
    setPrincipalPorSku({})
    setBuscandoDb(new Set())
    setEditandoSku(null)
    setModoArrastre(false)
    setCajaArrastrada(null)
    setDragOverProducto(null)
    setShowWarnings(false)
    setShowHuecos(false)
    setCatalogoColores([])
    setColoresPorConfirmar([])
    setSeparacionIgnorada(false)
    setColoresModalOpen(false)
    setColorDrafts({})
    setFiltroPendientes('')
    setOverrideModal(null)
    setOverrideValor('')
    setVerificacionManual(null)
    setMostrarErroresSubida(false)
    setCodigoRenameDrafts({})
    setModalLineaDrafts({})
    setModalPackDrafts({})
    setModalCajaNumDrafts({})
    coloresAutoOpenedRef.current = false
    setProgress(0)
    setProgressMsg('')
  }

  // Reinicio total para una nueva orden (paso 5: solo botón Nueva orden)
  const handleNuevaOrden = () => {
    resetParsedState()
    setSelectedFile(null)
    setCajasBlockModal(null)
    setDiscrepancyModal(null)
    setAlertaAmbarOpen(false)
    setIsConfirmFinalModalOpen(false)
    setStep(1)
    toast.info('Lista para una nueva orden: sube otro Packing List.')
  }

  const handleConfirmDeleteProduct = () => {
    if (!deleteProductModal) return
    const { sku, index } = deleteProductModal
    setEditableProductos((prev) => prev.filter((_, i) => i !== index))
    setEditableCajas((prev) => prev.filter(c => String(c.sku_base || '').trim().toUpperCase() !== sku.toUpperCase()))
    toast.success(`Producto "${sku}" y sus cajas asociadas fueron eliminados de la revisión.`)
    setDeleteProductModal(null)
  }

  const handleAddProduct = () => {
    const cleanSku = newSku.trim()
    if (!cleanSku) {
      toast.error('El SKU base es obligatorio.')
      return
    }
    const skuUpper = cleanSku.toUpperCase()
    if (editableProductos.some(p => p.sku_base.toUpperCase() === skuUpper)) {
      toast.error(`El SKU "${cleanSku}" ya existe en la lista.`)
      return
    }

    const newProd: WizardProducto = {
      temp_id: `temp_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sku_base: cleanSku,
      sku_raw: cleanSku,
      nombre: newDesc.trim() || cleanSku,
      descripcion: newDesc.trim(),
      marca: newMarca.trim() || 'General',
      precio_unitario_usd: Number(newPrecio) || 0,
      precio_yuan: 0,
      estado_temporal: 'nuevo_manual',
      es_nuevo: true,
    }

    setEditableProductos((prev) => [...prev, newProd])
    setIsAddProductOpen(false)
    setNewSku('')
    setNewDesc('')
    setNewMarca('')
    setNewPrecio('')

    const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
    verificarSkusEnBDAction([cleanSku], proveedorActual?.nombre_completo, proveedorActual ? Number(proveedorActual.id) : null).then((res) => {
      if (res.success && res.skusExistentes.length > 0) {
        setDbSkusSet((prev) => new Set([...Array.from(prev), cleanSku.toUpperCase()]))
        if (res.skuMap && res.skuMap[cleanSku.toUpperCase()]) {
          const matchedDbSku = res.skuMap[cleanSku.toUpperCase()]
          setDbSkusSet((prev) => new Set([...Array.from(prev), matchedDbSku.toUpperCase()]))
          setEditableProductos((prev) =>
            prev.map((p) =>
              p.sku_base.toUpperCase() === cleanSku.toUpperCase()
                ? { ...p, es_nuevo: false }
                : p,
            ),
          )
        }
      }
      // Probables del producto agregado (sin auto-vínculo)
      if (res.success && (res.probables ?? []).length > 0) {
        setProbablesDb((prev) => {
          const sin = new Set(prev.map((p) => String(p.inputSku).trim().toUpperCase()))
          const nuevos = (res.probables ?? []).filter((p) => !sin.has(String(p.inputSku).trim().toUpperCase()))
          return [...prev, ...nuevos]
        })
      }
    })

    toast.success(`Producto "${cleanSku}" agregado manualmente.`)
  }

  // Handler para sincronizar la información completa de los productos desde la tabla productos de Supabase
  const handleSyncProductsFromDb = async () => {
    const skus = editableProductos.map((p) => p.sku_base).filter(Boolean)
    if (skus.length === 0) {
      toast.info('No hay productos en la lista para sincronizar.')
      return
    }

    setIsSyncingDbProducts(true)
    try {
      const selectedProveedorId = selectedProveedor ? Number(selectedProveedor) : undefined
      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)

      const res = await obtenerDatosProductosDeBDAction(
        skus,
        selectedProveedorId,
        proveedorActual?.nombre_completo,
      )

      if (res.success && res.productosMap) {
        let syncCount = 0
        setEditableProductos((prev) =>
          prev.map((item) => {
            const key = item.sku_base.trim().toUpperCase()
            const dbProd = res.productosMap?.[key]
            if (dbProd) {
              syncCount++
              const selectedBrand = dbProd.marca_id
                ? marcas.find((m) => m.id === dbProd.marca_id)
                : dbProd.marca_nombre
                ? marcas.find((m) => m.nombre.toUpperCase() === dbProd.marca_nombre?.toUpperCase())
                : null

              if (dbProd.esNuevoLoteMoti) {
                toast.info(`El SKU "${item.sku_base}" heredó metadatos del modelo MOTI (${dbProd.skuHeredado}).`)
              } else if (dbProd.esVersionAnterior) {
                toast.info(`El SKU "${item.sku_base}" heredó metadatos de la versión previa de proveedor (${dbProd.skuHeredado}).`)
              }

              return {
                ...item,
                producto_id: dbProd.id || item.producto_id,
                descripcion: dbProd.descripcion || dbProd.nombre || item.descripcion,
                nombre: dbProd.nombre || dbProd.descripcion || item.nombre,
                composicion: dbProd.composicion || item.composicion,
                precio_unitario_usd: dbProd.precio_usd || item.precio_unitario_usd,
                marca_id: selectedBrand ? selectedBrand.id : dbProd.marca_id || item.marca_id,
                marca: selectedBrand ? selectedBrand.nombre : dbProd.marca_nombre || item.marca,
              }
            }
            return item
          }),
        )
        if (syncCount > 0) {
          toast.success(`Se sincronizaron ${syncCount} productos con la información de la base de datos.`)
        } else {
          toast.info('Ninguno de los SKUs de la lista tiene coincidencia directa en la base de datos.')
        }
      } else {
        toast.error(res.error || 'Error al consultar productos de la base de datos')
      }
    } catch (e: any) {
      toast.error('Error inesperado al sincronizar productos desde BD')
    } finally {
      setIsSyncingDbProducts(false)
    }
  }

  const detectorCatalogos: DetectorCatalogos = useMemo(
    () => ({
      marcas,
      generos,
      edades,
      tipos_prenda,
    }),
    [marcas, generos, edades, tipos_prenda],
  )

  const handleAutoDetectProduct = (index: number) => {
    const prod = editableProductos[index]
    if (!prod) return
    const text = `${prod.sku_base || ''} ${prod.descripcion || prod.nombre || ''}`.trim()
    if (!text) {
      toast.info('Ingresa una descripción o SKU para autodetectar atributos.')
      return
    }

    const detected = detectProductAttributesFromText(text, detectorCatalogos)
    if (detected.detectedCount === 0) {
      toast.info('No se detectaron coincidencias en el texto (Prenda, Género o Marca).')
      return
    }

    setEditableProductos((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return {
          ...item,
          ...(detected.tipo_prenda_id ? { tipo_prenda_id: detected.tipo_prenda_id, tipo_prenda: detected.tipo_prenda_nombre } : {}),
          ...(detected.genero_id ? { genero_id: detected.genero_id, genero: detected.genero_nombre } : {}),
          ...(detected.edad_id ? { edad_id: detected.edad_id, edad: detected.edad_nombre } : {}),
          ...(detected.marca_id ? { marca_id: detected.marca_id, marca: detected.marca_nombre } : {}),
        }
      })
    )

    const parts: string[] = []
    if (detected.tipo_prenda_nombre) parts.push(`Prenda: ${detected.tipo_prenda_nombre}`)
    if (detected.genero_nombre) parts.push(`Género: ${detected.genero_nombre}`)
    if (detected.marca_nombre) parts.push(`Marca: ${detected.marca_nombre}`)
    toast.success(`Atributos detectados (${detected.detectedCount}): ${parts.join(', ')}`)
  }

  const handleAutoDetectAllProducts = () => {
    let updatedCount = 0
    setEditableProductos((prev) =>
      prev.map((item) => {
        const text = `${item.sku_base || ''} ${item.descripcion || item.nombre || ''}`.trim()
        if (!text) return item
        const detected = detectProductAttributesFromText(text, detectorCatalogos)
        if (detected.detectedCount > 0) {
          updatedCount++
          return {
            ...item,
            ...(detected.tipo_prenda_id ? { tipo_prenda_id: detected.tipo_prenda_id, tipo_prenda: detected.tipo_prenda_nombre } : {}),
            ...(detected.genero_id ? { genero_id: detected.genero_id, genero: detected.genero_nombre } : {}),
            ...(detected.edad_id ? { edad_id: detected.edad_id, edad: detected.edad_nombre } : {}),
            ...(detected.marca_id ? { marca_id: detected.marca_id, marca: detected.marca_nombre } : {}),
          }
        }
        return item
      })
    )
    if (updatedCount > 0) {
      toast.success(`Atributos detectados y actualizados en ${updatedCount} producto${updatedCount > 1 ? 's' : ''}`)
    } else {
      toast.info('No se detectaron nuevos atributos en las descripciones de la lista.')
    }
  }


  const toggleProduct = (sku: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(sku)) next.delete(sku)
      else next.add(sku)
      return next
    })
  }

  const expandAllProducts = () => {
    const allSku = editableCajas.map((c) => c.sku_base || '__sin_sku__')
    setExpandedProducts(new Set(allSku))
  }

  const collapseAllProducts = () => {
    setExpandedProducts(new Set())
  }

  const cajasAgrupadas = useMemo(
    () => agruparCajasPorProducto(editableCajas, editableProductos),
    [editableCajas, editableProductos],
  )

  const cajasRealesMemo = useMemo(
    () => editableCajas.filter(c => c.tipo_caja !== 'padre_resumen'),
    [editableCajas],
  )

  const totalCajasCount = useMemo(
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.cantidad_cajas || 1), 0),
    [cajasRealesMemo],
  )

  const totalPiezasCount = useMemo(
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.total_piezas || c.piezas_por_caja * (c.cantidad_cajas || 1)), 0),
    [cajasRealesMemo],
  )

  const totalCbm = useMemo(
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.cbm_total_linea || c.cbm * (c.cantidad_cajas || 1)), 0),
    [cajasRealesMemo],
  )

  const totalPesoBruto = useMemo(
    () =>
      cajasRealesMemo.reduce((sum, c: any) => {
        const pBrutoSingle = Number(c.peso_bruto_kg ?? 0)
        const qty = Number(c.cantidad_cajas || 1)
        const lineTotal = Number(c.peso_bruto_total_kg ?? (pBrutoSingle * qty))
        return sum + (isNaN(lineTotal) ? 0 : lineTotal)
      }, 0),
    [cajasRealesMemo],
  )

  const totalPesoNeto = useMemo(
    () =>
      cajasRealesMemo.reduce((sum, c: any) => {
        const pNetoSingle = Number(c.peso_neto_kg ?? c.peso_neto ?? 0)
        const qty = Number(c.cantidad_cajas || 1)
        const lineTotal = Number(c.peso_neto_total_kg ?? (pNetoSingle * qty))
        return sum + (isNaN(lineTotal) ? 0 : lineTotal)
      }, 0),
    [cajasRealesMemo],
  )

  const jsonTotalesPorSku = useMemo(() => {
    const map = new Map<string, { piezas: number; cajas: number; cbm: number; peso: number; pesoNeto?: number }>()
    if (parsedData?.orden.orden_productos) {
      for (const op of parsedData.orden.orden_productos) {
        map.set(op.sku, {
          piezas: op.cantidad_total,
          cajas: op.numero_cajas_reales,
          cbm: op.cbm_total,
          peso: op.peso_bruto_total,
          pesoNeto: (op as any).peso_neto_total || (op as any).peso_neto,
        })
      }
    }
    return map
  }, [parsedData])

  // Líneas esperadas por (SKU, pack) del parser (portada) para revisión pack a pack.
  const jsonPackPorSkuPack = useMemo(() => {
    const map = new Map<string, { cajas: number; piezas: number; fuente: string }>()
    const arr = (parsedData as any)?.orden_productos_pack
    if (Array.isArray(arr)) {
      for (const op of arr) {
        const up = String(op?.sku_base || '').trim().toUpperCase()
        const pp = String(op?.nombre_pack || 'PACK UNICO').trim().toUpperCase() || 'PACK UNICO'
        if (!up) continue
        map.set(`${up}||${pp}`, {
          cajas: Number(op?.cajas_pedidas) || 0,
          piezas: Number(op?.piezas_pedidas) || 0,
          fuente: String(op?.fuente || ''),
        })
      }
    }
    return map
  }, [parsedData])

  const handleCajaEdit = useCallback(async (codigo: string, data: CajaEditPayload) => {
    setEditableCajas((prev) =>
      prev.map((caja) => {
        if (String(caja.codigo_caja_temporal || caja.codigo_caja || '') !== codigo) return caja
        return aplicarEdicionCaja(caja, data)
      }),
    )
    toast.success('Caja actualizada localmente.')
  }, [])

  const handleCajaRemove = useCallback((codigo: string) => {
    setEditableCajas((prev) => prev.filter((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigo))
    toast.success('Caja eliminada de la vista.')
  }, [])

  // Bulk-fix 0→1 pza: asigna 1 pza/caja temporal a las cajas sin dato para no
  // romper logica (match/herencia/guardado). Marcadas como estimadas.
  const handleFijarPzMinima = useCallback(() => {
    setEditableCajas((prev) => {
      const { cajas, fijadas } = fijarPzMinima(prev)
      if (fijadas > 0) {
        toast.warning(`${fijadas} caja(s) con 1 pza temporal: corrige el valor real en su tarjeta.`)
      } else {
        toast.info('No hay cajas sin piezas por caja.')
      }
      return cajas
    })
  }, [])

  // Callbacks estables para las filas memoizadas (modo arrastre + colores)
  // (sin toast: la etiqueta "Moviendo… toca destino" ya guia; evita efectos en updaters)
  const handleToggleArrastrada = useCallback((codigo: string) => {
    setCajaArrastrada((prev) => (prev === codigo ? null : codigo))
  }, [])
  const handleDragStartArrastrada = useCallback((codigo: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', codigo)
    e.dataTransfer.effectAllowed = 'move'
    setCajaArrastrada(codigo)
  }, [])
  const handleDragEndArrastrada = useCallback(() => {
    setCajaArrastrada(null)
  }, [])
  const handleAbrirColores = useCallback(() => {
    setFiltroPendientes('')
    setColoresModalOpen(true)
  }, [])

  // Icono rojo SIN ID de la matriz: abre el modal filtrado por ese raw.
  const handleAbrirColoresRaw = useCallback((raw?: string) => {
    setFiltroPendientes(raw ? String(raw) : '')
    setColoresModalOpen(true)
  }, [])

  // Renombra el código al cambiar de SKU: conserva el sufijo (pack/contador)
  // si el código empieza con el SKU origen; si no, lo prefija. Evita
  // duplicados con (2), (3)... La referencia al SKU nunca se pierde.
  const renombrarCodigoCaja = (
    codigoViejo: string,
    skuOrigen: string,
    skuDestino: string,
    usados: Set<string>,
  ): string => {
    const viejo = String(codigoViejo || '').trim()
    const normDest = String(skuDestino || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const prefOrigen = String(skuOrigen || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    let base: string
    if (prefOrigen && viejo.toUpperCase().startsWith(prefOrigen)) {
      base = normDest + viejo.slice(prefOrigen.length)
    } else if (viejo) {
      base = normDest ? `${normDest}--${viejo}` : viejo
    } else {
      base = normDest || 'CAJA'
    }
    base = base.replace(/\s*\(\d+\)$/, '')
    let candidato = base
    let n = 2
    while (usados.has(candidato.toUpperCase())) { candidato = `${base} (${n})`; n++ }
    return candidato
  }

  // Mover caja completa a otro producto (drag & drop o tap): reasigna SKU,
  // renombra el código al nuevo SKU y remapea detalles/vínculos.
  const handleMoverCaja = (codigoOrigen: string, skuDestino: string) => {
    const upDest = String(skuDestino || '').trim().toUpperCase()
    if (!codigoOrigen || !upDest) return
    const caja = editableCajas.find((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') === codigoOrigen)
    if (!caja) { toast.error('Caja no encontrada.'); return }
    const upOrigen = String(caja.sku_base || '').trim().toUpperCase()
    if (upOrigen === upDest) { toast.info('La caja ya está en ese producto.'); return }
    const prodDestino = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === upDest)
    if (!prodDestino) { toast.error('Producto destino no encontrado.'); return }
    const usados = new Set(
      editableCajas
        .filter((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigoOrigen)
        .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '').toUpperCase()),
    )
    const nuevoCodigo = renombrarCodigoCaja(codigoOrigen, caja.sku_base || '', prodDestino.sku_base || '', usados)
    setEditableCajas((prev) => prev.map((c) => {
      if (String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigoOrigen) return c
      return {
        ...c,
        sku_base: prodDestino.sku_base,
        producto_temp_id: prodDestino.temp_id,
        codigo_caja_temporal: nuevoCodigo,
        codigo_caja: nuevoCodigo,
      }
    }))
    setParsedData((prev: any) => {
      if (!prev || !Array.isArray(prev.detalles)) return prev
      return {
        ...prev,
        detalles: prev.detalles.map((d: any) => (
          String(d?.codigo_caja_temporal || '') === codigoOrigen
            ? { ...d, codigo_caja_temporal: nuevoCodigo }
            : d
        )),
      }
    })
    setPrincipalPorSku((prev) => {
      let changed = false
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) {
        if (v === codigoOrigen) { next[k] = nuevoCodigo; changed = true } else next[k] = v
      }
      return changed ? next : prev
    })
    setCajaArrastrada(null)
    setDragOverProducto(null)
    toast.success(`Caja ${codigoOrigen} → ${nuevoCodigo} en ${prodDestino.sku_base}.`)
  }

  // ── Fase 2: separar pegados y dividir/renombrar packs ──
  // Renombra el pack de todas las cajas de un (SKU, pack). No toca codigo_caja.
  const handleRenombrarPack = (skuBase: string, packViejo: string, packNuevo: string) => {
    const upSku = String(skuBase || '').trim().toUpperCase()
    const upViejo = String(packViejo || 'PACK UNICO').trim().toUpperCase()
    const nuevo = String(packNuevo || '').trim().toUpperCase()
    if (!upSku || !nuevo || nuevo === upViejo) return
    const cods = new Set(
      editableCajas
        .filter((c) => String(c.sku_base || '').trim().toUpperCase() === upSku
          && String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() === upViejo)
        .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '')),
    )
    setEditableCajas((prev) => prev.map((c) => {
      if (String(c.sku_base || '').trim().toUpperCase() !== upSku) return c
      if (String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() !== upViejo) return c
      return { ...c, nombre_pack: nuevo }
    }))
    setParsedData((prev: WizardParsedData | null) => {
      if (!prev || !Array.isArray(prev.detalles)) return prev
      return {
        ...prev,
        detalles: prev.detalles.map((d) => (
          cods.has(String(d?.codigo_caja_temporal || '')) ? { ...d, nombre_pack: nuevo } : d
        )),
      }
    })
    setEditPackNombre(null)
    toast.success(`Pack ${packViejo} → ${nuevo} en ${skuBase} (códigos intactos).`)
  }

  // Divide un pack en dos por rangos de carton: usa cartonesSugeridos
  // (leidos en render desde warnings n8n) si existen, si no los del grupo.
  // NOTA: no leer alertasPorSku aqui (memo declarado despues): el React
  // Compiler no modela referencias hacia adelante y aborta el componente.
  const handleDividirPack = (skuBase: string, pack: string, cartonesSugeridos?: string[]) => {
    const upSku = String(skuBase || '').trim().toUpperCase()
    const upPack = String(pack || 'PACK UNICO').trim().toUpperCase()
    const grupo = editableCajas.filter(
      (c) => c.tipo_caja !== 'padre_resumen'
        && String(c.sku_base || '').trim().toUpperCase() === upSku
        && String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() === upPack,
    )
    if (grupo.length < 2) { toast.error('Se necesitan 2+ cajas para dividir el pack.'); return }
    const wCartones = (cartonesSugeridos || []).map((x) => String(x).trim()).filter(Boolean)
    const enOrden = wCartones.length >= 2 ? wCartones : Array.from(new Set(
      grupo.map((c) => String((c as unknown as Record<string, unknown>).carton_no_raw || '').trim()).filter(Boolean),
    ))
    const { mover } = partirRangosCarton(enOrden)
    if (mover.length === 0) { toast.error('No hay rangos de cartón distintos para dividir.'); return }
    const segundaMitad = new Set(mover)
    const nuevo = siguienteLetraPack(pack)
    const codsSegunda = new Set(
      grupo
        .filter((c) => segundaMitad.has(String((c as unknown as Record<string, unknown>).carton_no_raw || '').trim()))
        .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '')),
    )
    setEditableCajas((prev) => prev.map((c) => {
      if (c.tipo_caja === 'padre_resumen') return c
      if (String(c.sku_base || '').trim().toUpperCase() !== upSku) return c
      if (String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() !== upPack) return c
      const cod = String(c.codigo_caja_temporal || c.codigo_caja || '')
      if (!codsSegunda.has(cod)) return c
      return { ...c, nombre_pack: nuevo }
    }))
    setParsedData((prev: WizardParsedData | null) => {
      if (!prev || !Array.isArray(prev.detalles)) return prev
      return {
        ...prev,
        detalles: prev.detalles.map((d) => (
          codsSegunda.has(String(d?.codigo_caja_temporal || '')) ? { ...d, nombre_pack: nuevo } : d
        )),
      }
    })
    toast.success(`Pack ${pack} dividido: ${codsSegunda.size} caja(s) → ${nuevo}. Renómbralo si hace falta.`)
  }

  // Separa un producto pegado (sku_conjoinado_dudoso) en N productos usando
  // los candidatos de n8n. El 1er candidato conserva producto y cajas; el resto
  // se crea y recibe sus cajas por carton (sin solapar rangos compartidos).
  const handleSepararSugerido = (sep: SeparacionSugerida, opts?: { soloCrear?: boolean }) => {
    const cands = (sep.productos_candidatos || []).map((c) => ({
      sku: String(c.sku_base || '').trim(),
      alias: String(c.alias || '').trim(),
      cartones: (c.cartones || []).map((x) => String(x).trim()).filter(Boolean),
      filas: (c.filas || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)),
    })).filter((c) => c.sku)
    if (cands.length < 2) { toast.error('La sugerencia no trae 2+ candidatos: agrega el producto a mano.'); return }
    const originalUp = String(sep.sku_base_original || '').trim().toUpperCase()
    const prodA = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === originalUp)
    if (!prodA || !prodA.temp_id) { toast.error('Producto original no encontrado en la revisión.'); return }
    const skuA = cands[0].sku
    const nuevos: WizardProducto[] = cands.slice(1).map((c, idx) => ({
      temp_id: `temp_split_${Date.now()}_${idx}`,
      producto_id: null,
      sku_base: c.sku,
      sku_raw: [c.sku, c.alias].filter(Boolean).join(' '),
      nombre: c.sku,
      descripcion: prodA.descripcion,
      marca: prodA.marca,
      precio_yuan: prodA.precio_yuan,
      precio_unitario_usd: prodA.precio_unitario_usd,
      estado_temporal: 'separado_sugerido',
      es_nuevo: true,
    }))
    const tempPorSku = new Map<string, string>([[skuA.toUpperCase(), prodA.temp_id]])
    for (const n of nuevos) tempPorSku.set(n.sku_base.toUpperCase(), n.temp_id!)
    const cajasOrigen = editableCajas.filter((cj) => cj.tipo_caja !== 'padre_resumen'
      && String(cj.sku_base || '').trim().toUpperCase() === originalUp)
    const destinoPorCodigo = new Map<string, string>()
    let exactas = 0
    if (!opts?.soloCrear) {
      const { destinos, exactas: ex } = calcularDestinos(
        cajasOrigen.map((cj) => ({
          codigo: String(cj.codigo_caja_temporal || cj.codigo_caja || ''),
          carton: String((cj as unknown as Record<string, unknown>).carton_no_raw || '').trim(),
        })),
        parsedData?.staging_por_codigo || {},
        cands.map((c) => ({ sku_base: c.sku, filas: c.filas, cartones: c.cartones })),
        sep.reparto_exacto || [],
        (skuD) => tempPorSku.has(skuD.toUpperCase()),
      )
      for (const [cod, skuD] of destinos) destinoPorCodigo.set(cod, skuD)
      exactas = ex
    }
    if (!opts?.soloCrear && destinoPorCodigo.size === 0 && cajasOrigen.length > 0) {
      toast.error('Sin datos de posición para repartir (la sugerencia no trae filas ni cartones). Usa "Crear productos" y arrastra las cajas a mano.')
      return
    }
    const usados = new Set(editableCajas.map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '').toUpperCase()))
    void usados
    const aplicado = aplicarRepartoSeparacion({
      productos: editableProductos,
      cajas: editableCajas,
      detalles: (parsedData?.detalles || []) as Array<Record<string, unknown>>,
      prodATempId: prodA.temp_id,
      skuA,
      skuRawA: [skuA, cands[0].alias].filter(Boolean).join(' '),
      nuevos,
      tempPorSku: Object.fromEntries(tempPorSku),
      destinoPorCodigo,
      originalUp,
      renombrar: (cod, skuD, usadosSet) => renombrarCodigoCaja(cod, sep.sku_base_original || '', skuD, usadosSet),
    })
    const remapSize = aplicado.movidas
    setEditableProductos(aplicado.productos as WizardProducto[])
    setEditableCajas(aplicado.cajas as WizardCaja[])
    setParsedData((prev: WizardParsedData | null) => {
      if (!prev) return prev
      return { ...prev, detalles: aplicado.detalles }
    })
    setExpandedProducts((prev) => {
      const next = new Set(prev)
      next.add(skuA)
      for (const n of nuevos) next.add(n.sku_base)
      return next
    })
    setSeparacionIgnorada(true)
    // Verificar SKUs nuevos en BD (mismo patron que agregar manual)
    const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
    verificarSkusEnBDAction(nuevos.map((n) => n.sku_base), proveedorActual?.nombre_completo, proveedorActual ? Number(proveedorActual.id) : null).then((res) => {
      if (res.success && res.skusExistentes.length > 0) {
        setDbSkusSet((prev) => new Set([...Array.from(prev), ...res.skusExistentes.map((s) => s.toUpperCase())]))
      }
      if (res.success && (res.probables ?? []).length > 0) {
        setProbablesDb((prev) => [...prev, ...(res.probables ?? [])])
      }
    })
    const estimadas = remapSize - Math.min(exactas, remapSize)
    if (opts?.soloCrear) {
      setModoArrastre(true)
      toast.info(`Productos creados (${[skuA, ...nuevos.map((n) => n.sku_base)].join(' + ')}). Modo arrastre activado: mueve cada caja a su producto.`)
    } else {
      toast.success(
        `Separado: ${skuA} conserva sus cajas; ${remapSize} caja(s) movidas`
        + (exactas > 0 ? ` (${exactas} exactas por documento${estimadas > 0 ? `, ${estimadas} por cartón` : ''})` : '')
        + `. Ajusta líneas esperadas${remapSize < cajasOrigen.length ? ' y arrastra el resto a mano' : ''}.`,
      )
    }
  }

  // Agregar caja manual a un producto (corrige packing cuando no se detectó una caja).
  // Hereda piezas_por_caja de la caja principal del SKU; el usuario la edita en la tarjeta.
  const handleCajaAdd = (producto: WizardProducto) => {
    const sku = String(producto.sku_base || '').trim()
    if (!sku) { toast.error('El producto no tiene SKU.'); return }
    const up = sku.toUpperCase()
    const hermanas = editableCajas.filter(
      (c) => String(c.sku_base || '').trim().toUpperCase() === up && c.tipo_caja !== 'padre_resumen'
    )
    const principal = cajaPrincipalDe(up, hermanas)
    const n = hermanas.length + 1
    const codigo = `${sku.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-MANUAL-${n}`
    const nueva: WizardCaja = {
      producto_temp_id: producto.temp_id,
      producto_id: producto.producto_id ?? null,
      codigo_caja_temporal: codigo,
      codigo_caja: codigo,
      sku_base: sku,
      sku_raw: sku,
      nombre_pack: principal?.nombre_pack || 'PACK UNICO',
      piezas_por_caja: principal?.piezas_por_caja ?? 0,
      cantidad_cajas: 1,
      total_piezas: principal?.piezas_por_caja ?? 0,
      peso_bruto_kg: principal?.peso_bruto_kg ?? 0,
      peso_bruto_total_kg: principal?.peso_bruto_kg ?? 0,
      peso_neto_kg: principal?.peso_neto_kg ?? 0,
      peso_neto_total_kg: principal?.peso_neto_kg ?? 0,
      largo_cm: principal?.largo_cm ?? 0,
      ancho_cm: principal?.ancho_cm ?? 0,
      alto_cm: principal?.alto_cm ?? 0,
      cbm: principal?.cbm ?? 0,
      cbm_por_caja: principal?.cbm_por_caja ?? principal?.cbm ?? 0,
      cbm_total_linea: principal?.cbm ?? 0,
      tallas: principal?.tallas ? [...principal.tallas] : [],
      colores: principal?.colores ? [...principal.colores] : [],
      matriz: { tallas: principal?.tallas ? [...principal.tallas] : [], colores: principal?.colores ? [...principal.colores] : [], valores: {} },
      estado_temporal: 'manual',
      tipo_caja: 'completa',
    }
    setEditableCajas((prev) => [...prev, nueva])
    setExpandedProducts((prev) => new Set(prev).add(sku))
    toast.success(`Caja ${codigo} agregada a ${sku}. Edítala en su tarjeta.`)
  }

  const procesarPackingList = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo Excel primero.')
      return
    }

    const proveedor = proveedores.find((item) => String(item.id) === selectedProveedor)
    const cliente = clientes.find((item) => String(item.id) === selectedCliente)

    if (!proveedor) {
      toast.error('Selecciona proveedor origen.')
      return
    }

    if (!cliente) {
      toast.error('Selecciona cliente B2B destino.')
      return
    }

    setProcessing(true)
    setProgress(10)
    setProgressMsg('Preparando archivo...')

    try {
      const formData = new FormData()
      formData.append('archivo', selectedFile)
      formData.append('proveedor_id', String(proveedor.id))
      formData.append('proveedor', proveedor.nombre_completo ?? 'Auto')
      formData.append('cliente_b2b_id', String(cliente.id))
      formData.append(
        'parser_selector',
        selectedParserFormat === 'auto'
          ? resolverParserSelector(proveedor.nombre_completo ?? '')
          : selectedParserFormat,
      )
      formData.append('contenedor_id', selectedContenedor === 'new' ? '' : selectedContenedor)
      formData.append('contenedor_codigo', selectedContenedor === 'new' ? newContainerCode.trim() : '')
      formData.append('orden_id', '')
      formData.append('celda_encabezado', '')
      formData.append('columnas_leer', '')
      formData.append('fila_inicio_datos', '')
      formData.append('fila_fin_datos', '')

      setProgress(35)
      setProgressMsg('Enviando a n8n...')

      const response = await fetch('/api/packing/parse', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Error al procesar Packing List.')
      }

      setProgress(70)
      setProgressMsg('Adaptando respuesta de n8n...')

      const payload = unwrapN8nResponse(result.data)
      const nextDebugInfo = createDebugInfo(result.data, payload)
      setRawN8nResponse(payload)
      setDebugInfo(nextDebugInfo)
      const wizardData = adaptarN8nAWizard(payload)

      if (wizardData.productos.length === 0) {
        throw new Error(
          `n8n respondio, pero no se pudieron detectar productos. Productos: ${nextDebugInfo.productosCount}, cajas: ${nextDebugInfo.cajasCount}, detalles: ${nextDebugInfo.detallesCount}.`,
        )
      }

      if (wizardData.cajas.length === 0) {
        throw new Error(
          `n8n respondio, pero no se pudieron detectar cajas. Productos: ${nextDebugInfo.productosCount}, cajas: ${nextDebugInfo.cajasCount}, detalles: ${nextDebugInfo.detallesCount}.`,
        )
      }

      // Deduplicar productos por SKU base para asegurar 1 sola entrada por SKU
      const uniqueMap = new Map<string, WizardProducto>()
      let duplicatesFound = false

      for (const p of wizardData.productos) {
        const cleanSku = String(p.sku_base || '').trim()
        if (!cleanSku) continue
        const key = cleanSku.toUpperCase()
        if (uniqueMap.has(key)) {
          duplicatesFound = true
          const existing = uniqueMap.get(key)!
          if (!existing.descripcion && p.descripcion) existing.descripcion = p.descripcion
          if (!existing.nombre && p.nombre) existing.nombre = p.nombre
        } else {
          uniqueMap.set(key, { ...p, sku_base: cleanSku })
        }
      }

      const deduplicatedProductos = Array.from(uniqueMap.values())

      if (duplicatesFound) {
        toast.info('Se verificaron los SKUs detectados: las entradas duplicadas fueron unificadas automáticamente para asegurar 1 fila por SKU.')
      }

      // Auto-detección inicial de atributos a partir del texto de cada producto y asignación de temp_id
      const enrichedProductos = deduplicatedProductos.map((p, idx) => {
        const tempId = p.temp_id || `temp_prod_${p.sku_base.toUpperCase()}_${idx}_${Date.now()}`
        const text = `${p.sku_base || ''} ${p.descripcion || p.nombre || ''}`.trim()
        const detected = detectProductAttributesFromText(text, { marcas, generos, edades, tipos_prenda })
        const matchedBrand = marcas.find(
          (m) =>
            (p.marca_id && m.id === p.marca_id) ||
            (p.marca && m.nombre.toUpperCase() === p.marca.toUpperCase()),
        )
        return {
          ...p,
          temp_id: tempId,
          marca_id: matchedBrand ? matchedBrand.id : (detected.marca_id ?? p.marca_id ?? null),
          marca: matchedBrand ? matchedBrand.nombre : (detected.marca_nombre ?? p.marca ?? ''),
          tipo_prenda_id: detected.tipo_prenda_id ?? p.tipo_prenda_id ?? null,
          tipo_prenda: detected.tipo_prenda_nombre ?? p.tipo_prenda ?? '',
          genero_id: detected.genero_id ?? p.genero_id ?? null,
          genero: detected.genero_nombre ?? p.genero ?? '',
          edad_id: detected.edad_id ?? p.edad_id ?? null,
          edad: detected.edad_nombre ?? p.edad ?? '',
        }
      })

      // Mapa auxiliar para asociar producto_temp_id a las cajas según su SKU inicial
      const skuToTempIdMap = new Map<string, string>()
      enrichedProductos.forEach((p) => {
        if (p.sku_base && p.temp_id) {
          skuToTempIdMap.set(p.sku_base.trim().toUpperCase(), p.temp_id)
        }
      })

      const enrichedCajas = wizardData.cajas.map((c) => {
        const normSku = (c.sku_base || '').trim().toUpperCase()
        const matchedTempId = normSku ? skuToTempIdMap.get(normSku) : undefined
        return {
          ...c,
          producto_temp_id: matchedTempId || c.producto_temp_id,
        }
      })

      setWarnings(wizardData.warnings)
      setSeparacionIgnorada(false)
      setColoresModalOpen(false)
      setColorDrafts({})
      // Fase 2: catalogo de colores + siembra de pendientes (n8n + barrido local)
      obtenerColoresActivosAction().then((resColores) => {
        const catalogo = resColores.success ? resColores.colores : []
        setCatalogoColores(catalogo)
        setColoresPorConfirmar(seedColoresPorConfirmar(
          wizardData.colores_por_confirmar || [],
          (wizardData.detalles || []) as Array<{ color_raw?: string; codigo_caja_temporal?: string }>,
          catalogo as CatalogColor[],
        ))
      })
      setParsedData({ ...wizardData, productos: enrichedProductos, cajas: enrichedCajas })
      setEditableProductos(structuredClone(enrichedProductos))
      setEditableCajas(structuredClone(enrichedCajas))

      // Verificar existencia de SKUs en Supabase DB para resaltado verde
      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
      const skusToCheck = enrichedProductos.map(p => p.sku_base)
      if (skusToCheck.length > 0) {
        setIsCheckingDbSkus(true)
        verificarSkusEnBDAction(skusToCheck, proveedorActual?.nombre_completo, proveedorActual ? Number(proveedorActual.id) : null).then((res) => {
          if (res.success && res.skusExistentes) {
            const allMatched = new Set(res.skusExistentes.map(s => s.toUpperCase()))
            if (res.skuMap) {
              Object.values(res.skuMap).forEach(s => allMatched.add(s.toUpperCase()))
            }
            setDbSkusSet(allMatched)

            // Probables ámbar (sin auto-vínculo): nacen como nuevos
            const probs = res.probables ?? []
            setProbablesDb(probs)
            // Comparativa n8n vs sistema: string detectado por n8n (sku_raw) por SKU
            setSkuN8nPorSku((prev) => {
              const next = { ...prev }
              for (const p of enrichedProductos) {
                const up = String(p.sku_base || '').trim().toUpperCase()
                if (up && p.sku_raw) next[up] = String(p.sku_raw)
              }
              return next
            })
            // Podar vínculos de SKUs que ya no son probables ni exactos
            setVinculosDb((prev) => {
              const validos = new Set([
                ...probs.map((p) => String(p.inputSku).trim().toUpperCase()),
                ...allMatched,
              ])
              const next: Record<string, { dbId: number; dbSku: string }> = {}
              for (const [k, v] of Object.entries(prev)) {
                if (validos.has(k)) next[k] = v
              }
              return next
            })

            if (res.skuMap && Object.keys(res.skuMap).length > 0) {
              const skuMap = res.skuMap
              setEditableProductos(prev =>
                prev.map(p => {
                  const matchedDbSku = skuMap[p.sku_base.toUpperCase()]
                  if (matchedDbSku) {
                    return { ...p, es_nuevo: false }
                  }
                  return p
                })
              )
            }
          }
        }).finally(() => {
          setIsCheckingDbSkus(false)
        })
      }

      setProgress(100)
      setProgressMsg('Archivo procesado correctamente.')
      toast.success('Packing List procesado correctamente.')

    } catch (error) {
      resetParsedState()
      toast.error(error instanceof Error ? error.message : 'Error desconocido.')
    } finally {
      setProcessing(false)
    }
  }

  // ── Sincronización manual ámbar uno por uno (sin auto-vínculo) ──
  const probablesSinResolver = probablesDb.filter(
    (p) => !vinculosDb[String(p.inputSku).trim().toUpperCase()]
  )

  const handleSincronizarProbable = (prob: SkuProbable) => {
    const up = String(prob.inputSku).trim().toUpperCase()
    setVinculosDb((prev) => ({ ...prev, [up]: { dbId: prob.dbId, dbSku: prob.dbSku } }))
    setEditableProductos((prev) =>
      prev.map((p) =>
        String(p.sku_base || '').trim().toUpperCase() === up
          ? { ...p, es_nuevo: false, force_new: false }
          : p
      )
    )
    toast.success(`"${prob.inputSku}" sincronizado con ${prob.dbSku}.`)
  }

  const handleQuitarVinculo = (inputSku: string) => {
    const up = String(inputSku).trim().toUpperCase()
    setVinculosDb((prev) => {
      const next = { ...prev }
      delete next[up]
      return next
    })
    setEditableProductos((prev) =>
      prev.map((p) =>
        String(p.sku_base || '').trim().toUpperCase() === up ? { ...p, es_nuevo: true } : p
      )
    )
  }

  // Commit de edición SKU (desde SkuEditCell): un solo update + cascada por temp_id.
  const commitSkuEdit = (producto: WizardProducto, index: number, newSkuVal: string) => {
    const oldSku = producto.sku_base
    const targetTempId = producto.temp_id
    setEditandoSku(null)
    if (newSkuVal === oldSku) return
    setEditableProductos((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, sku_base: newSkuVal } : item
      )
    )
    setEditableCajas((prev) =>
      prev.map((c) => {
        if ((targetTempId && c.producto_temp_id === targetTempId) || (oldSku && c.sku_base === oldSku)) {
          return { ...c, sku_base: newSkuVal, producto_temp_id: targetTempId || c.producto_temp_id }
        }
        return c
      })
    )
    const oldUp = String(oldSku || '').trim().toUpperCase()
    const newUp = String(newSkuVal || '').trim().toUpperCase()
    if (oldUp === newUp || !newUp) return
    setVinculosDb((prev) => {
      if (!(oldUp in prev)) return prev
      const next = { ...prev }
      delete next[oldUp]
      return next
    })
    // Re-verificación inmediata del SKU corregido (p.ej. H026/07HC -> HO26/07HC)
    const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
    verificarSkusEnBDAction([newSkuVal], proveedorActual?.nombre_completo, proveedorActual ? Number(proveedorActual.id) : null).then((res) => {
      if (!res.success) return
      setDbSkusSet((prev) => {
        const next = new Set(prev)
        next.delete(oldUp)
        for (const s of res.skusExistentes) next.add(String(s).toUpperCase())
        if (res.skuMap) Object.values(res.skuMap).forEach((s) => next.add(String(s).toUpperCase()))
        return next
      })
      setProbablesDb((prev) => {
        const sin = new Set([oldUp, newUp])
        const base = prev.filter((p) => !sin.has(String(p.inputSku).trim().toUpperCase()))
        return [...base, ...(res.probables ?? [])]
      })
      if (res.skusExistentes.length > 0) {
        toast.success(`"${newSkuVal}" encontrado en BD. Vinculado.`)
      }
    })
  }

  // Lápiz 🔍: búsqueda bajo demanda del SKU de la fila directo en BD.
  const handleBuscarSkuEnBD = async (producto: WizardProducto, index: number) => {
    void index
    const rowKey = producto.temp_id || String(producto.sku_base || '').trim().toUpperCase() || `idx-${index}`
    const skuActual = String(producto.sku_base || '').trim()
    if (!skuActual || buscandoDb.has(rowKey)) return
    setBuscandoDb((prev) => new Set(prev).add(rowKey))
    try {
      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
      const res = await buscarSkuEnBDAction(
        skuActual,
        proveedorActual?.nombre_completo,
        proveedorActual ? Number(proveedorActual.id) : null,
      )
      const up = skuActual.toUpperCase()
      if (res.exacto) {
        const ex = res.exacto
        setDbSkusSet((prev) => new Set([...prev, up, String(ex.dbSku).toUpperCase()]))
        setProbablesDb((prev) => prev.filter((p) => String(p.inputSku).trim().toUpperCase() !== up))
        const marcaMatch = marcas.find((m) =>
          (ex.marca_id && m.id === ex.marca_id) ||
          (ex.marca_nombre && m.nombre.toUpperCase() === ex.marca_nombre.toUpperCase()),
        )
        setEditableProductos((prev) =>
          prev.map((p) =>
            (p.temp_id || String(p.sku_base || '')) === (producto.temp_id || String(producto.sku_base || ''))
              ? {
                ...p,
                producto_id: ex.id,
                descripcion: ex.descripcion || p.descripcion,
                nombre: ex.nombre || p.nombre,
                composicion: ex.composicion || p.composicion,
                precio_unitario_usd: ex.precio_usd || p.precio_unitario_usd,
                marca_id: marcaMatch ? marcaMatch.id : (ex.marca_id ?? p.marca_id),
                marca: marcaMatch ? marcaMatch.nombre : (ex.marca_nombre || p.marca),
                es_nuevo: false,
                force_new: false,
              }
              : p,
          ),
        )
        toast.success(
          ex.mismaPersona === false
            ? `"${skuActual}" existe en BD como ${ex.dbSku} (otro proveedor). Vinculado.`
            : `"${skuActual}" encontrado en BD (${ex.metodo}). Vinculado.`,
        )
      } else if (res.probables.length > 0) {
        setProbablesDb((prev) => {
          const base = prev.filter((p) => String(p.inputSku).trim().toUpperCase() !== up)
          const nuevos = res.probables.filter(
            (r) => !base.some((b) => String(b.inputSku).trim().toUpperCase() === up && b.dbId === r.dbId),
          )
          return [...base, ...nuevos]
        })
        toast.info(`"${skuActual}" sin exacto: ${res.probables.length} parecido(s) en BD. Elige uno con Sincronizar.`)
      } else {
        toast.info(`Sin coincidencias en BD para "${skuActual}" (motivo: ${res.motivo ?? 'SIN_CANDIDATOS'}). Se guardará como nuevo.`)
      }
    } catch {
      toast.error('Error al buscar el SKU en la base de datos.')
    } finally {
      setBuscandoDb((prev) => {
        const next = new Set(prev)
        next.delete(rowKey)
        return next
      })
    }
  }

  const handleConfirmReview = () => {
    // Alerta saltable ámbar: probables sin resolver antes de guardar
    if (probablesSinResolver.length > 0) {
      setAlertaAmbarOpen(true)
      return
    }
    doGuardarOrden()
  }

  const doGuardarOrden = () => {
    // Barrera final espejo DB: si la verificación local detecta bloqueantes, no subir.
    if (erroresBloqueantes.length > 0) {
      setMostrarErroresSubida(true)
      setIsConfirmFinalModalOpen(true)
      toast.error(`${erroresBloqueantes.length} bloqueo(s) pendientes: verifica en local y corrígelos antes de subir.`)
      return
    }
    // Fase 2: colores sin resolver bloquean antes del servidor (mapear o crear en el modal).
    const coloresPendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido')
    if (coloresPendientes.length > 0) {
      setColoresModalOpen(true)
      toast.error(`${coloresPendientes.length} color(es) sin resolver (${coloresPendientes.slice(0, 5).map((c) => c.raw).join(', ')}): mapea a existente o créalos antes de guardar.`)
      return
    }
    // Bloqueo absoluto modo solo cajas: revalidar match de cajas (pudo editarse en paso 4)
    const matchFinal = calcularMatchCajasOrdenRapida()
    const matchPacksFinal = calcularMatchPacks()
    const fallasPacksFinal = matchPacksFinal.diffs.filter((d) => d.estado !== 'OK')
    if (!matchFinal.ok || !matchPacksFinal.ok) {
      setCajasBlockModal({
        open: true,
        blocking: true,
        items: [
          ...matchFinal.diffs
            .filter((d) => d.estado !== 'OK')
            .map((d) => ({ sku: d.sku, cajasEsperadas: d.cajasLinea, cajasArmadas: d.cajasFisicas, diferencia: d.dif })),
          ...fallasPacksFinal.map((d) => ({
            sku: `${d.sku} · ${d.pack}`,
            cajasEsperadas: d.linea,
            cajasArmadas: d.armadas,
            diferencia: d.dif,
          })),
        ],
      })
      toast.error('Bloqueo modo cajas: hay líneas sin match con las cajas armadas (SKU o pack).')
      return
    }
    startTransition(async () => {
      try {
        if (!selectedProveedor || !selectedCliente) {
          toast.error('Faltan socios comerciales.')
          return
        }

        // Fuente unica: detalles derivados de la matriz editable (lo que se ve
        // en las tarjetas). parsedData.detalles es el crudo de n8n y quedaria
        // obsoleto tras cualquier edicion de matriz.
        // Cada detalle lleva color_id resuelto (panel mapeado/creado/existente o
        // resolve directo incl. parcial auto) para que el servidor no re-derive.
        const baseDetalles = editableCajas.flatMap((c) => detallesDesdeMatriz(c))
        const mapaIds = new Map<string, number>()
        for (const cc of coloresPorConfirmar) {
          if ((cc.estado === 'existente' || cc.estado === 'mapeado' || cc.estado === 'creado') && typeof cc.color_id === 'number') {
            mapaIds.set(claveColor(cc.raw), cc.color_id)
          }
        }
        for (const dd of baseDetalles) {
          const k = claveColor(String(dd?.color_raw || ''))
          if (!mapaIds.has(k)) {
            // Fase 1: reintento con tripletes IA del seed (en/es), no solo raw.
            const seed = coloresPorConfirmar.find((cc) => claveColor(cc.raw) === k)
            const mm = resolveColor(String(dd?.color_raw || ''), catalogoColores as CatalogColor[], seed?.en ?? null, seed?.es ?? null)
            if (mm.found && typeof mm.id === 'number') mapaIds.set(k, mm.id)
          }
        }
        const detallesEditados = enriquecerDetallesConMapa(baseDetalles, mapaIds)
        const res = await guardarOrdenRapidaB2BAction({
          proveedorId: Number(selectedProveedor),
          clienteB2bId: Number(selectedCliente),
          contenedorId: selectedContenedor === 'new' ? null : Number(selectedContenedor),
          newContainerCode: selectedContenedor === 'new' ? newContainerCode : null,
          newContainerNumber: selectedContenedor === 'new' ? (newContainerNumber.trim() ? newContainerNumber.trim().toUpperCase() : null) : null,
          productos: editableProductos,
          cajas: editableCajas,
          detalles: detallesEditados,
          vinculosDb: Object.fromEntries(
            Object.entries(vinculosDb).map(([k, v]) => [k, v.dbId])
          ),
          principalPorSku,
        })

        if (!res.success) {
          toast.error(res.error || 'Error al guardar la orden.')
          return
        }

        // NULL tolerado: avisa lo pendiente sin trabar (ya quedó en nuevos).
        if (res.warnings && res.warnings.length > 0) {
          for (const w of res.warnings) toast.warning(w, { duration: 9000 })
        }
        toast.success('Orden guardada exitosamente en Supabase.')
        setStep(5)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al guardar la orden.')
      }
    })
  }

  // ── Línea esperada efectiva: lo editado prevalece sobre el JSON ──
  // useCallback para que los memos de verificación sean en tiempo real sin
  // falsos positivos del linter (toda la cadena comparte las mismas deps).
  const buscarEsperadasJson = useCallback((skuBase: string): number => {
    const direct = jsonTotalesPorSku.get(skuBase)?.cajas
    if (typeof direct === 'number') return direct
    const up = String(skuBase || '').trim().toUpperCase()
    for (const [k, v] of jsonTotalesPorSku) {
      if (String(k || '').trim().toUpperCase() === up) return Number(v.cajas) || 0
    }
    return 0
  }, [jsonTotalesPorSku])
  const lineaEsperada = useCallback((skuBase: string): number => {
    const up = String(skuBase || '').trim().toUpperCase()
    if (lineaEditadaPorSku[up] != null) return lineaEditadaPorSku[up]
    return buscarEsperadasJson(skuBase)
  }, [lineaEditadaPorSku, buscarEsperadasJson])

  // ── Líneas y match por (SKU, pack): una línea por SKU, packs separados ──
  // Lo editado prevalece sobre el JSON; sin datos de pack en el JSON no se evalúa.
  const packKeyOf = (skuBase: string, pack: string): string =>
    `${String(skuBase || '').trim().toUpperCase()}||${String(pack || 'PACK UNICO').trim().toUpperCase() || 'PACK UNICO'}`
  const lineaPackEsperada = useCallback((skuBase: string, pack: string): number => {
    const k = packKeyOf(skuBase, pack)
    if (lineaEditadaPorPack[k] != null) return lineaEditadaPorPack[k]
    return jsonPackPorSkuPack.get(k)?.cajas ?? 0
  }, [lineaEditadaPorPack, jsonPackPorSkuPack])
  const jsonPackTieneSku = useCallback((skuBase: string): boolean => {
    const up = String(skuBase || '').trim().toUpperCase() + '||'
    for (const k of jsonPackPorSkuPack.keys()) if (k.startsWith(up)) return true
    return false
  }, [jsonPackPorSkuPack])
  type PackMatchDif = { sku: string; pack: string; linea: number; armadas: number; piezas: number; dif: number; estado: 'OK' | 'DIF' | 'SIN_CAJAS' | 'SIN_LINEA' }
  const calcularMatchPacks = useCallback((): { ok: boolean; diffs: PackMatchDif[] } => {
    const armados = new Map<string, { sku: string; pack: string; cajas: number; piezas: number }>()
    for (const c of editableCajas) {
      if (c.tipo_caja === 'padre_resumen') continue
      const sku = String(c.sku_base || '').trim()
      if (!sku) continue
      const pack = String(c.nombre_pack || 'PACK UNICO')
      const k = packKeyOf(sku, pack)
      const prev = armados.get(k) ?? { sku, pack, cajas: 0, piezas: 0 }
      prev.cajas += Number(c.cantidad_cajas ?? 0) || 0
      prev.piezas += Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0))
      armados.set(k, prev)
    }
    const keys = new Set<string>([...armados.keys()])
    for (const k of jsonPackPorSkuPack.keys()) keys.add(k)
    for (const k of Object.keys(lineaEditadaPorPack)) keys.add(k)
    const diffs: PackMatchDif[] = []
    for (const k of keys) {
      const sep = k.indexOf('||')
      const up = k.slice(0, sep)
      const packUp = k.slice(sep + 2)
      const arm = armados.get(k)
      const armadas = arm?.cajas ?? 0
      const piezas = arm?.piezas ?? 0
      const skuLabel = arm?.sku || up
      const packLabel = arm?.pack || packUp
      const linea = lineaPackEsperada(skuLabel, packLabel)
      if (linea <= 0 && !jsonPackTieneSku(skuLabel)) continue
      const dif = linea - armadas
      diffs.push({
        sku: skuLabel, pack: packLabel, linea, armadas, piezas, dif,
        estado: dif === 0 ? 'OK' : armadas === 0 && linea > 0 ? 'SIN_CAJAS' : linea === 0 ? 'SIN_LINEA' : 'DIF',
      })
    }
    diffs.sort((a, b) => (a.estado === 'OK' ? 1 : 0) - (b.estado === 'OK' ? 1 : 0) || String(a.sku).localeCompare(String(b.sku)))
    return { ok: diffs.every((d) => d.estado === 'OK'), diffs }
  }, [editableCajas, jsonPackPorSkuPack, lineaEditadaPorPack, lineaPackEsperada, jsonPackTieneSku])

  // ── Match base modo solo cajas: cajas esperadas (línea) vs cajas armadas ──
  // Bloqueo absoluto y exacto (sin tolerancia): las cajas son enteras.
  // La línea editada por el usuario es la verdad y prevalece sobre el JSON.
  const calcularMatchCajasOrdenRapida = useCallback(() => {
    const lineas = editableProductos
      .map((p) => ({ sku: String(p.sku_base || '').trim(), cajas: lineaEsperada(String(p.sku_base || '')) }))
      .filter((l) => l.sku && l.cajas > 0)
    const fisicos = editableCajas
      .filter((c) => c.tipo_caja !== 'padre_resumen')
      .map((c) => ({ sku: String(c.sku_base || ''), cajas: Number(c.cantidad_cajas ?? 0) }))
    return compararCajasLineasVsFisico(lineas, fisicos)
  }, [editableProductos, editableCajas, lineaEsperada])

  // ── Huecos: SKUs con cajas físicas pero sin línea esperada (ni editada) ──
  const huecosFisico = useMemo(() => {
    const porSku = new Map<string, { sku: string; cajas: number; piezas: number }>()
    for (const c of editableCajas) {
      if (c.tipo_caja === 'padre_resumen') continue
      const up = String(c.sku_base || '').trim().toUpperCase()
      if (!up) continue
      const prev = porSku.get(up) ?? { sku: String(c.sku_base || '').trim(), cajas: 0, piezas: 0 }
      prev.cajas += Number(c.cantidad_cajas ?? 0)
      prev.piezas += Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0))
      porSku.set(up, prev)
    }
    return Array.from(porSku.entries())
      .filter(([up, g]) => g.cajas > 0 && lineaEsperada(g.sku) <= 0 && !huecosRellenados.includes(up))
      .map(([up, g]) => ({ key: up, ...g }))
  }, [editableCajas, lineaEsperada, huecosRellenados])

  const handleRellenarHuecos = () => {
    if (huecosFisico.length === 0 || !parsedData) return
    const nuevos = huecosFisico.map((h) => ({
      sku: h.sku,
      nombre: '',
      marca: '',
      cantidad_total: h.piezas,
      numero_cajas_reales: h.cajas,
      cbm_total: 0,
      peso_bruto_total: 0,
    }))
    setParsedData((prev: any) => {
      if (!prev) return prev
      return {
        ...prev,
        orden: {
          ...prev.orden,
          orden_productos: [...(prev.orden?.orden_productos ?? []), ...nuevos],
        },
      }
    })
    setHuecosRellenados((prev) => [...prev, ...huecosFisico.map((h) => h.key)])
    toast.success(`Se rellenaron ${huecosFisico.length} líneas desde el físico. Verifica el match antes de guardar.`)
  }

  // ── Caja principal por producto (default = mayor cantidad en la orden) ──
  const cajaPrincipalDe = useCallback((skuUpper: string, cajas: WizardCaja[]): WizardCaja | null => {
    const reales = (cajas || []).filter((c) => c.tipo_caja !== 'padre_resumen')
    if (reales.length === 0) return null
    const elegido = principalPorSku[skuUpper]
    if (elegido) {
      const found = reales.find((c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === elegido)
      if (found) return found
    }
    return [...reales].sort((a, b) => {
      const qa = Number(a.cantidad_cajas ?? 0)
      const qb = Number(b.cantidad_cajas ?? 0)
      if (qb !== qa) return qb - qa
      const pa = Number(a.total_piezas || (a.piezas_por_caja || 0) * (a.cantidad_cajas || 0))
      const pb = Number(b.total_piezas || (b.piezas_por_caja || 0) * (b.cantidad_cajas || 0))
      return pb - pa
    })[0]
  }, [principalPorSku])

    // ── Alertas n8n por producto/caja + autocompletados de auditoría ──
  // Lee el JSON tal como llega: warnings tipificados y auditoria_n8n.
  type AlertaN8nLocal = {
    tipo?: string; severidad?: string; sku_base?: string | null
    codigo_caja_temporal?: string | null; detalle?: string; issue?: string
  }
  const alertasN8n = useMemo<AlertaN8nLocal[]>(() => {
    const raw = (parsedData as any)?.warnings
    return Array.isArray(raw) ? (raw as AlertaN8nLocal[]) : []
  }, [parsedData])
  const alertasPorSku = useMemo(() => {
    const map = new Map<string, AlertaN8nLocal[]>()
    for (const a of alertasN8n) {
      const up = String(a.sku_base || '').trim().toUpperCase()
      if (!up) continue
      const list = map.get(up) ?? []
      list.push(a)
      map.set(up, list)
    }
    return map
  }, [alertasN8n])
  const alertasPorCaja = useMemo(() => {
    const map = new Map<string, AlertaN8nLocal[]>()
    for (const a of alertasN8n) {
      const cod = String(a.codigo_caja_temporal || '').trim()
      if (!cod) continue
      const list = map.get(cod) ?? []
      list.push(a)
      map.set(cod, list)
    }
    return map
  }, [alertasN8n])
  // Fase 2: separaciones sugeridas por SKU (MOTI pegados / packs duplicados).
  // Si el array separacion_sugerida no llego, se reconstruye la accion desde warnings tipificados.
  const separacionPorSku = useMemo(() => {
    const map = new Map<string, SeparacionSugerida[]>()
    const push = (sku: string | undefined | null, s: SeparacionSugerida) => {
      const up = String(sku || '').trim().toUpperCase()
      if (!up) return
      const list = map.get(up) ?? []
      list.push(s)
      map.set(up, list)
    }
    for (const s of (parsedData?.separacion_sugerida || [])) push(s.sku_base_original, s)
    for (const a of alertasN8n) {
      if (a.tipo === 'sku_conjoinado_dudoso' || a.tipo === 'pack_duplicado_dudoso') {
        const up = String(a.sku_base || '').trim().toUpperCase()
        if (up && !(map.get(up) || []).length) {
          map.set(up, [{ tipo: a.tipo, sku_base_original: a.sku_base || undefined, motivo: a.detalle }])
        }
      }
    }
    // Dedupe: el workflow puede traer la rica del parser + una pobre duplicada
    // del fallback IA; quedarse con la mas rica por tipo (la pobre mueve 0 cajas).
    for (const [key, list] of map) {
      if (list.length > 1) map.set(key, dedupSeparaciones(list))
    }
    return map
  }, [parsedData, alertasN8n])
  const auditoriaN8n = useMemo(() => (parsedData as any)?.auditoria_n8n ?? null, [parsedData])
  const rellenadosN8n = useMemo(
    () => new Set<string>((auditoriaN8n?.rellenados ?? []).map((r: any) => String(r.sku || '').trim().toUpperCase())),
    [auditoriaN8n]
  )
  // Desglose talla/color por caja (parsedData.detalles) para señalar qué cajas tienen detalles
  const detallesPorCaja = useMemo(() => {
    const det = (parsedData as any)?.detalles
    const map = new Map<string, number>()
    if (Array.isArray(det)) {
      for (const d of det) {
        const cod = String(d?.codigo_caja_temporal || '').trim()
        if (!cod) continue
        map.set(cod, (map.get(cod) ?? 0) + 1)
      }
    }
    return map
  }, [parsedData])

  // Fase 2: conteos de colores por estado + borradores del modal
  const coloresNuevos = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'nuevo'),
    [coloresPorConfirmar],
  )
  const coloresOmitidos = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'omitido'),
    [coloresPorConfirmar],
  )
  const coloresSinResolver = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido'),
    [coloresPorConfirmar],
  )
  // Revision ambar no bloqueante: match parcial automatico por debajo.
  // Lleva id y permite guardar; solo se lista para revision opcional.
  const coloresAmbar = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'existente' && c.via === 'parcial'),
    [coloresPorConfirmar],
  )
  // Mapa vivo raw->destino (existente/mapeado/creado con id) para badges,
  // validacion y guardado. Incluye tambien el nombre destino ya renombrado.
  const mapaColoresResueltos = useMemo(() => {
    const m = new Map<string, { color_id: number; nombre: string; via: string | null; estado: string }>()
    for (const c of coloresPorConfirmar) {
      if ((c.estado === 'existente' || c.estado === 'mapeado' || c.estado === 'creado') && typeof c.color_id === 'number') {
        const cat = catalogoColores.find((cc) => cc.id === c.color_id)
        m.set(claveColor(c.raw), {
          color_id: c.color_id,
          nombre: (cat?.nombre || c.raw).trim().toUpperCase(),
          via: c.via ?? null,
          estado: c.estado,
        })
      }
    }
    return m
  }, [coloresPorConfirmar, catalogoColores])
  // Display de matrices: raw resuelto -> ES (rojo solo para nuevos sin id).
  // Al mapear/crear en el modal, el id automatico se intercambia solo.
  const mapaNombres = useMemo(
    () => mapaNombresResueltos(coloresPorConfirmar, catalogoColores),
    [coloresPorConfirmar, catalogoColores],
  )
  // Auto-siembra: si una edicion de matriz introduce un color_raw nuevo que no
  // esta en el seed inicial, agregarlo (resuelto o nuevo) para que el panel y
  // la validacion en tiempo real lo vean. Preserva lo ya mapeado/creado.
  useEffect(() => {
    if (editableCajas.length === 0 || catalogoColores.length === 0) return
    const vistos = new Set<string>()
    const nuevosRaws: string[] = []
    for (const c of editableCajas) {
      for (const col of c.matriz?.colores || []) {
        const raw = String(col || '').trim()
        if (!raw) continue
        const k = claveColor(raw)
        if (vistos.has(k)) continue
        vistos.add(k)
        nuevosRaws.push(raw)
      }
    }
    if (nuevosRaws.length === 0) return
    setColoresPorConfirmar((prev) => {
      const tenidos = new Set(prev.map((c) => claveColor(c.raw)))
      const faltantes = nuevosRaws.filter((r) => !tenidos.has(claveColor(r)))
      if (faltantes.length === 0) return prev
      const tris = new Map(
        (parsedData?.colores_traducidos || []).map((t) => [claveColor(String(t.raw || '')), t]),
      )
      const add = faltantes.map((raw) => {
        const t = tris.get(claveColor(raw))
        // Fase 1: el match usa tripletes IA (en/es), no solo el raw.
        const m = resolveColor(raw, catalogoColores as CatalogColor[], t?.en ?? null, t?.es ?? null)
        return {
          raw,
          en: t?.en ?? null,
          es: t?.es ?? null,
          cajas: editableCajas
            .filter((c) => (c.matriz?.colores || []).some((cc) => claveColor(String(cc)) === claveColor(raw)))
            .map((c) => String(c.codigo_caja || c.codigo_caja_temporal || ''))
            .filter(Boolean)
            .slice(0, 25),
          fuente: 'matriz',
          estado: (m.found ? 'existente' : 'nuevo') as ColorPorConfirmar['estado'],
          color_id: m.id ?? null,
          via: m.via,
        }
      })
      return [...prev, ...add]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- parsedData solo aporta tripletes IA; el seed vive de cajas+catalogo
  }, [editableCajas, catalogoColores])
  // Filtro de la lista de pendientes del modal (insensible a case/acentos,
  // todos los tokens deben aparecer en raw/en/es).
  const pendientesFiltrados = useMemo(() => {
    const toks = String(filtroPendientes || '')
      .split(/\s+/)
      .map((t) => normalizeColorKey(t))
      .filter((t) => t.length > 0)
    if (toks.length === 0) return coloresNuevos
    return coloresNuevos.filter((c) => {
      const hay = [c.raw, c.en ?? '', c.es ?? ''].map((s) => normalizeColorKey(s || '')).join(' ')
      return toks.every((t) => hay.includes(t))
    })
  }, [coloresNuevos, filtroPendientes])
  const ensureDrafts = useCallback((nuevos: ColorPorConfirmar[]) => {
    const tris = new Map(
      (parsedData?.colores_traducidos || []).map((t) => [claveColor(String(t.raw || '')), t]),
    )
    setColorDrafts((prev) => {
      const next = { ...prev }
      for (const c of nuevos) {
        const key = claveColor(c.raw)
        if (!next[key]) {
          const t = tris.get(key)
          const d = buildColorDraft(c.raw, t?.en ?? c.en ?? null, t?.es ?? c.es ?? null)
          next[key] = { ...d, mapear_a_id: null }
        }
      }
      return next
    })
  }, [parsedData])
  const coloresAutoOpenedRef = useRef(false)
  useEffect(() => {
    if (step === 4 && !coloresAutoOpenedRef.current && coloresNuevos.length > 0) {
      coloresAutoOpenedRef.current = true
      ensureDrafts(coloresNuevos)
      setColoresModalOpen(true)
    }
  }, [step, coloresNuevos, ensureDrafts])

  const handleMapearColor = (raw: string, colorId: number | null) => {
    const key = claveColor(raw)
    if (colorId == null) {
      setColoresPorConfirmar((prev) => prev.map((c) => (
        claveColor(c.raw) === key ? { ...c, estado: 'nuevo' as const, color_id: null, via: null } : c
      )))
      return
    }
    setColoresPorConfirmar((prev) => prev.map((c) => (
      claveColor(c.raw) === key ? { ...c, estado: 'mapeado' as const, color_id: colorId, via: 'manual' } : c
    )))
    const cat = catalogoColores.find((c) => c.id === colorId)
    const destino = (cat?.nombre || '').trim().toUpperCase()
    if (destino) {
      // ID + renombrar: las cajas que contenian el raw pasan al nombre del catalogo.
      setEditableCajas((prev) => {
        const { cajas: next, tocadas } = aplicarMapaColoresACajas(
          prev as Parameters<typeof aplicarMapaColoresACajas>[0],
          new Map([[key, { color_id: colorId, nombre: destino }]]),
        )
        if (tocadas > 0) toast.success(`"${raw}" mapeado a ${destino}: ${tocadas} caja(s) actualizadas.`)
        else toast.success(`"${raw}" mapeado a ${destino}.`)
        return next as typeof prev
      })
    } else {
      toast.success(`"${raw}" mapeado a ${colorId}.`)
    }
  }

  // Fase 2: sugiere HEX (biblioteca -> API gratuita -> negro sin trabar).
  const handleSugerirHex = async (raw: string) => {
    const key = claveColor(raw)
    const d = colorDrafts[key]
    if (!d || hexSugiriendo.has(key)) return
    setHexSugiriendo((prev) => new Set(prev).add(key))
    try {
      const r = await resolverHexColorAction(d.nombre, d.nombre_intern)
      setColorDrafts((prev) => ({
        ...prev,
        [key]: { ...(prev[key] ?? d), hex_code: r.hex },
      }))
      if (r.fuente === 'api') toast.success(`HEX ${r.hex} sugerido por API (${r.nombreApi ?? d.nombre_intern}).`)
      else if (r.fuente === 'biblioteca') toast.success(`HEX ${r.hex} desde biblioteca.`)
      else toast.warning('Sin match exacto de HEX: quedó negro, ajústalo manual.')
    } catch {
      toast.error('No se pudo sugerir HEX (red). Quedó el valor actual.')
    } finally {
      setHexSugiriendo((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleCrearColorFila = async (raw: string): Promise<boolean> => {
    const key = claveColor(raw)
    const tri = (parsedData?.colores_traducidos || []).find((t) => claveColor(String(t.raw || '')) === key)
    const seed = coloresPorConfirmar.find((c) => claveColor(c.raw) === key)
    const d = colorDrafts[key] ?? {
      ...buildColorDraft(raw, tri?.en ?? seed?.en ?? null, tri?.es ?? seed?.es ?? null),
      mapear_a_id: null,
    }
    if (!d.nombre.trim() || !d.codigo.trim()) {
      toast.error(`Completa nombre y código para "${raw}".`)
      return false
    }
    const res = await createColorAction(d.nombre.trim(), d.codigo.trim(), d.hex_code, d.tipo_color, d.nombre_intern.trim())
    if (!res.success || res.id == null) {
      toast.error(res.error || `No se pudo crear "${raw}".`)
      return false
    }
    const newId = Number(res.id)
    const nombreFinal = d.nombre.trim().toUpperCase()
    setCatalogoColores((prev) => (prev.some((c) => c.id === newId)
      ? prev
      : [...prev, {
        id: newId,
        nombre: nombreFinal,
        codigo: d.codigo.trim().toUpperCase(),
        nombre_intern: d.nombre_intern.trim().toUpperCase() || null,
      }]))
    setColoresPorConfirmar((prev) => prev.map((c) => (
      claveColor(c.raw) === key ? { ...c, estado: 'creado' as const, color_id: newId, via: 'creado' } : c
    )))
    // ID + renombrar: las cajas con el raw adoptan el nombre recien creado.
    setEditableCajas((prev) => {
      const { cajas: next, tocadas } = aplicarMapaColoresACajas(
        prev as Parameters<typeof aplicarMapaColoresACajas>[0],
        new Map([[key, { color_id: newId, nombre: nombreFinal }]]),
      )
      if (tocadas > 0) toast.success(`Color "${nombreFinal}" creado (id ${newId}): ${tocadas} caja(s) actualizadas.`)
      else toast.success(`Color "${nombreFinal}" creado (id ${newId}).`)
      return next as typeof prev
    })
    return true
  }

  const handleCrearTodosColores = async () => {
    const pendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo')
    let ok = 0
    const fallos: string[] = []
    for (const c of pendientes) {
      const r = await handleCrearColorFila(c.raw)
      if (r) ok++
      else fallos.push(c.raw)
    }
    if (fallos.length === 0) toast.success(`${ok} color(es) creados.`)
    else toast.error(`${ok} creados, fallaron: ${fallos.join(', ')}`)
  }

  // Ambar -> nuevo: el auto no cuadro y mapear tampoco; pasa al flujo de
  // creacion (borrador limpio + HEX Fase 2). Desde aqui si bloquea el guardado
  // hasta crearlo o mapearlo, igual que Omitir.
  const handleCrearNuevoDesdeAmbar = (raw: string) => {
    const key = claveColor(raw)
    setColoresPorConfirmar((prev) => prev.map((c) => (
      claveColor(c.raw) === key ? { ...c, estado: 'nuevo' as const, color_id: null, via: null } : c
    )))
    setColorDrafts((prev) => {
      if (prev[key]) return prev
      const tri = (parsedData?.colores_traducidos || []).find((t) => claveColor(String(t.raw || '')) === key)
      const seed = coloresPorConfirmar.find((c) => claveColor(c.raw) === key)
      return { ...prev, [key]: { ...buildColorDraft(raw, tri?.en ?? seed?.en ?? null, tri?.es ?? seed?.es ?? null), mapear_a_id: null } }
    })
    toast.info(`"${raw}" pasó a colores nuevos: créalo en el panel.`)
  }

  const handleOmitirColor = (raw: string) => {
    const key = claveColor(raw)
    setColoresPorConfirmar((prev) => prev.map((c) => (
      claveColor(c.raw) === key ? { ...c, estado: 'omitido' as const } : c
    )))
    toast.warning(`"${raw}" omitido: bloqueará el guardado hasta resolverlo.`)
  }

  const handleReabrirColor = (raw: string) => {
    const key = claveColor(raw)
    setColoresPorConfirmar((prev) => prev.map((c) => (
      claveColor(c.raw) === key ? { ...c, estado: 'nuevo' as const } : c
    )))
  }

  // Fase 2: match de colores por caja (verde = en catálogo, ámbar = parcial auto o por confirmar)
  // Fuente viva: matrices editables (no parsedData obsoleto). Prioriza el mapa
  // resuelto del panel (mapeado/creado/existente) para que el badge cambie en
  // cuanto se mapea o crea.
  const matchColoresPorCaja = useMemo(() => {
    const porCaja = new Map<string, string[]>()
    for (const c of editableCajas) {
      const cod = String(c.codigo_caja_temporal || c.codigo_caja || '')
      if (!cod) continue
      for (const raw of c.matriz?.colores || []) {
        const r = String(raw || '').trim()
        if (!r) continue
        const list = porCaja.get(cod) ?? []
        if (!list.some((x) => claveColor(x) === claveColor(r))) list.push(r)
        porCaja.set(cod, list)
      }
    }
    const map = new Map<string, Array<{ raw: string; found: boolean; via: string | null; nombre: string }>>()
    // Fase 1: tripletes IA disponibles para el reintento por raw.
    const tris = new Map((parsedData?.colores_traducidos || []).map((t) => [claveColor(String(t.raw || '')), t]))
    for (const [cod, raws] of porCaja) {
      map.set(cod, raws.map((raw) => {
        const res = mapaColoresResueltos.get(claveColor(raw))
        if (res) return { raw, found: true, via: res.via, nombre: res.nombre }
        const t = tris.get(claveColor(raw))
        const m = resolveColor(raw, catalogoColores as CatalogColor[], t?.en ?? null, t?.es ?? null)
        return { raw, found: m.found, via: m.via, nombre: m.catalog?.nombre || suggestEs(raw) }
      }))
    }
    return map
  }, [editableCajas, catalogoColores, mapaColoresResueltos])

  // ── Checklist de verificación pre-confirmación (TIEMPO REAL) ──
  // Lee las líneas efectivas (lineaEditadaPorSku prevalece sobre el JSON),
  // así que DEBE recalcularse al editar líneas: sin lineaEditadaPorSku en
  // deps, el botón Confirmar quedaba bloqueado con el JSON viejo aunque el
  // panel lateral ya cuadrara.
  const verificacionPrevia = useMemo(() => {
    const match = calcularMatchCajasOrdenRapida()
    const matchPacks = calcularMatchPacks()
    const sinPz = editableCajas
      .filter((c) => c.tipo_caja !== 'padre_resumen' && !(Number(c.piezas_por_caja ?? 0) > 0))
      .map((c) => String(c.codigo_caja || c.codigo_caja_temporal || 's/código'))
    const conPrincipal = editableProductos.filter((p) => {
      const up = String(p.sku_base || '').trim().toUpperCase()
      const reales = editableCajas.filter(
        (c) => c.tipo_caja !== 'padre_resumen' && String(c.sku_base || '').trim().toUpperCase() === up
      )
      return reales.length > 0 && cajaPrincipalDe(up, reales) !== null
    }).length
    const fallasPacks = matchPacks.diffs.filter((d) => d.estado !== 'OK')
    // Colores: solo nuevo/omitido bloquean (parcial ambar lleva id automatico).
    // Se expone aqui para que el checklist no quede todo verde con colores pendientes.
    const coloresPendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido').length
    return {
      matchOk: match.ok,
      fallasMatch: match.diffs.filter((d) => d.estado !== 'OK').length,
      matchPacksOk: matchPacks.ok,
      fallasPacks: fallasPacks.length,
      sinPz,
      conPrincipal,
      totalProductos: editableProductos.length,
      totalCajas: totalCajasCount,
      coloresPendientes,
      todoOk: match.ok && matchPacks.ok && sinPz.length === 0 && editableProductos.length > 0 && totalCajasCount > 0 && coloresPendientes === 0,
    }
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- el compilador no puede preservar este memo por la cadena de deps (callbacks de match); agruparCajasPorProducto ya es puro y no muta en render
  }, [editableProductos, editableCajas, calcularMatchCajasOrdenRapida, calcularMatchPacks, cajaPrincipalDe, totalCajasCount, coloresPorConfirmar])

  // Rellenar huecos desde el aviso (paso 3): completa líneas y revalida con
  // los valores recién rellenados (sin esperar el re-render). Si solo quedan
  // DIF reales, actualiza la lista; si ya cuadra, avanza al paso 4.
  const handleRellenarDesdeAviso = () => {
    const ups = new Set(huecosFisico.map((h) => h.key))
    if (ups.size === 0) return
    handleRellenarHuecos()
    const restantes = calcularMatchCajasOrdenRapida().diffs.filter(
      (d) => d.estado !== 'OK' && !ups.has(d.sku.trim().toUpperCase())
    )
    if (restantes.length === 0) {
      setCajasBlockModal(null)
      setStep(4)
    } else {
      setCajasBlockModal({
        open: true,
        blocking: false,
        items: restantes.map((d) => ({ sku: d.sku, cajasEsperadas: d.cajasLinea, cajasArmadas: d.cajasFisicas, diferencia: d.dif })),
      })
      toast.error('Aún quedan diferencias reales: corrígelas en el paso 4.')
    }
  }

  // ── Resumen por SKU para el panel lateral de confirmación ──
  // Misma fuente que el match: línea efectiva, suma armada y principal.
  // Incluye desglose por pack (una línea por SKU, packs separados).
  const resumenSku = useMemo(() => {
    const filas = editableProductos.map((p) => {
      const sku = String(p.sku_base || '').trim()
      const up = sku.toUpperCase()
      const reales = editableCajas.filter(
        (c) => c.tipo_caja !== 'padre_resumen' && String(c.sku_base || '').trim().toUpperCase() === up
      )
      const armadas = reales.reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
      const linea = lineaEsperada(sku)
      const principal = cajaPrincipalDe(up, reales)
      const pzc = principal ? Number(principal.piezas_por_caja ?? 0) : 0
      const porPack = new Map<string, { pack: string; armadas: number; piezas: number }>()
      for (const c of reales) {
        const pack = String(c.nombre_pack || 'PACK UNICO')
        const prev = porPack.get(pack) ?? { pack, armadas: 0, piezas: 0 }
        prev.armadas += Number(c.cantidad_cajas ?? 0) || 0
        prev.piezas += Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0))
        porPack.set(pack, prev)
      }
      const packs = [...porPack.values()].map((g) => {
        const lineaP = lineaPackEsperada(sku, g.pack)
        const tieneLinea = lineaP > 0 || jsonPackTieneSku(sku)
        return {
          pack: g.pack, linea: lineaP, armadas: g.armadas, piezas: g.piezas,
          dif: lineaP - g.armadas, ok: !tieneLinea || lineaP === g.armadas,
          editada: lineaEditadaPorPack[packKeyOf(sku, g.pack)] != null,
        }
      })
      return {
        sku, pzc, linea, armadas,
        dif: linea - armadas,
        ok: linea === armadas,
        editada: lineaEditadaPorSku[up] != null,
        principalCodigo: principal ? String(principal.codigo_caja || principal.codigo_caja_temporal || '') : null,
        packs,
      }
    })
    const totalCajas = filas.reduce((s, f) => s + f.armadas, 0)
    const todoOk = filas.length > 0 && filas.every((f) => f.ok)
    return { filas, totalCajas, todoOk }
  }, [editableProductos, editableCajas, lineaEsperada, lineaEditadaPorSku, lineaPackEsperada, lineaEditadaPorPack, jsonPackTieneSku, cajaPrincipalDe])

  // ── Validación exhaustiva pre-subida DB (TIEMPO REAL) ──
  // Espejo de guardarOrdenRapidaB2BAction + restricciones UNIQUE/NOT NULL/FK/CHECK.
  // Cada error trae paso destino para "Ir a corregir" y corrección inline en el modal.
  type ErrorSubida = {
    id: string
    codigo:
      | 'SOCIO_PROVEEDOR_FALTANTE' | 'SOCIO_CLIENTE_FALTANTE' | 'CONTENEDOR_CODIGO_VACIO'
      | 'ORDEN_SIN_PRODUCTOS' | 'ORDEN_SIN_CAJAS'
      | 'SKU_VACIO' | 'SKU_DUPLICADO' | 'PRODUCTO_SIN_CAJAS'
      | 'CODIGO_VACIO' | 'CODIGO_DUPLICADO' | 'SIN_PZ' | 'CANTIDAD_INVALIDA' | 'MATRIZ_VACIA'
      | 'COLOR_SIN_RESOLVER' | 'MATCH_CAJAS_DIF' | 'MATCH_PACK_DIF'
    mensaje: string
    detalle?: string
    sku?: string
    codigoCaja?: string
    pack?: string
    paso: 1 | 3 | 4
    fix: string
  }
  const erroresSubida = useMemo<ErrorSubida[]>(() => {
    const out: ErrorSubida[] = []
    if (!selectedProveedor) out.push({ id: 'soc-prov', codigo: 'SOCIO_PROVEEDOR_FALTANTE', mensaje: 'Falta proveedor origen (persona_id / proveedor_id).', paso: 1, fix: 'Elige proveedor en paso 1 o en el modal.' })
    if (!selectedCliente) out.push({ id: 'soc-cli', codigo: 'SOCIO_CLIENTE_FALTANTE', mensaje: 'Falta cliente B2B destino (cliente_b2b_id).', paso: 1, fix: 'Elige cliente en paso 1.' })
    if (selectedContenedor === 'new' && !newContainerCode.trim()) out.push({ id: 'cont-cod', codigo: 'CONTENEDOR_CODIGO_VACIO', mensaje: 'Contenedor nuevo sin código (codigo_contenedor UNIQUE NOT NULL).', paso: 1, fix: 'Escribe el código del contenedor.' })
    if (editableProductos.length === 0) out.push({ id: 'ord-sin-prod', codigo: 'ORDEN_SIN_PRODUCTOS', mensaje: 'La orden no tiene productos (ordenes_b2b_detalles quedaría vacía).', paso: 3, fix: 'Agrega al menos un producto.' })
    // SKU vacío / duplicado (productos.sku_base UNIQUE NOT NULL)
    const vistosSku = new Map<string, number>()
    editableProductos.forEach((p) => {
      const sku = String(p.sku_base || '').trim()
      const up = sku.toUpperCase()
      if (!sku) out.push({ id: `sku-vacio-${p.temp_id || sku}`, codigo: 'SKU_VACIO', mensaje: 'Producto con SKU vacío (NOT NULL).', paso: 3, fix: 'Edita el SKU en paso 3.' })
      else vistosSku.set(up, (vistosSku.get(up) || 0) + 1)
    })
    for (const [up, n] of vistosSku) {
      if (n > 1) out.push({ id: `sku-dup-${up}`, codigo: 'SKU_DUPLICADO', mensaje: `SKU duplicado "${up}" ×${n} (UNIQUE). Solo se insertaría uno y fallaría el 2do.`, sku: up, paso: 3, fix: 'Unifica o renombra el SKU en paso 3.' })
    }
    // Producto sin cajas reales (bloqueo servidor sinCajasArmadas)
    for (const p of editableProductos) {
      const sku = String(p.sku_base || '').trim()
      const up = sku.toUpperCase()
      if (!up) continue
      const armadas = editableCajas.filter((c) => c.tipo_caja !== 'padre_resumen' && String(c.sku_base || '').trim().toUpperCase() === up).reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
      if (armadas <= 0) out.push({ id: `prod-sin-caja-${up}`, codigo: 'PRODUCTO_SIN_CAJAS', mensaje: `Producto "${sku}" sin cajas armadas (bloqueo modo cajas).`, sku, paso: 4, fix: 'Agrega/mueve cajas a este SKU en paso 4.' })
    }
    // Cajas: código vacío/duplicado (codigo_caja UNIQUE NOT NULL), pz, cantidad, matriz
    const vistosCod = new Map<string, string[]>()
    const reales = editableCajas.filter((c) => c.tipo_caja !== 'padre_resumen')
    reales.forEach((c, idx) => {
      const cod = String(c.codigo_caja || c.codigo_caja_temporal || '').trim()
      const up = cod.toUpperCase()
      if (!cod) {
        out.push({ id: `cod-vacio-${String(c.sku_base || 'sinsku')}-${idx}`, codigo: 'CODIGO_VACIO', mensaje: `Caja sin código en SKU "${String(c.sku_base || '').trim()}" (NOT NULL).`, sku: String(c.sku_base || '').trim(), paso: 4, fix: 'Renombra el código de la caja.' })
      } else {
        const l = vistosCod.get(up) || []
        l.push(cod)
        vistosCod.set(up, l)
      }
      if (!(Number(c.piezas_por_caja ?? 0) > 0)) out.push({ id: `sinpz-${cod || c.sku_base}`, codigo: 'SIN_PZ', mensaje: `Caja "${cod || '(s/código)'}" sin piezas por caja (>0 requerido).`, sku: String(c.sku_base || '').trim(), codigoCaja: cod, paso: 4, fix: 'Edita pz/caja en su tarjeta o usa Fijar 1 pza.' })
      if (!(Number(c.cantidad_cajas ?? 0) > 0)) out.push({ id: `cant-${cod || c.sku_base}`, codigo: 'CANTIDAD_INVALIDA', mensaje: `Caja "${cod || '(s/código)'}" con cantidad ${String(c.cantidad_cajas ?? 0)} (debe ser >0).`, sku: String(c.sku_base || '').trim(), codigoCaja: cod, paso: 4, fix: 'Corrige cantidad de cajas en su tarjeta.' })
      try {
        const dets = detallesDesdeMatriz(c as Parameters<typeof detallesDesdeMatriz>[0])
        if (dets.length === 0) out.push({ id: `matriz-${cod || c.sku_base}`, codigo: 'MATRIZ_VACIA', mensaje: `Caja "${cod || '(s/código)'}" con matriz vacía (0 detalles talla/color).`, sku: String(c.sku_base || '').trim(), codigoCaja: cod, paso: 4, fix: 'Edita la matriz en su tarjeta.' })
      } catch { /* matriz inválida se reporta como vacía */ }
    })
    for (const [up, lista] of vistosCod) {
      if (lista.length > 1) out.push({ id: `cod-dup-${up}`, codigo: 'CODIGO_DUPLICADO', mensaje: `Código duplicado "${lista[0]}" ×${lista.length} (UNIQUE: haría upsert y mezclaría cajas).`, codigoCaja: lista[0], paso: 4, fix: 'Renómbralo aquí mismo con el editor inline.' })
    }
    if (editableProductos.length > 0 && reales.length === 0) out.push({ id: 'ord-sin-caja', codigo: 'ORDEN_SIN_CAJAS', mensaje: 'La orden no tiene cajas físicas (totalCajas<=0).', paso: 4, fix: 'Agrega cajas en paso 4.' })
    // Colores sin resolver (bloqueo servidor coloresSinMatch + modal).
    // 1) Pendientes del panel (nuevo/omitido). El ambar parcial no bloquea: lleva id auto.
    const pendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido')
    if (pendientes.length > 0) out.push({ id: 'col-pend', codigo: 'COLOR_SIN_RESOLVER', mensaje: `${pendientes.length} color(es) sin resolver: ${pendientes.slice(0, 4).map((c) => c.raw).join(', ')}${pendientes.length > 4 ? ` +${pendientes.length - 4}` : ''} (FK cat_colores).`, paso: 4, fix: 'Mapea a existente o créalos en el panel de colores.' })
    // 2) Cada detalle vivo de cajas debe tener color_id (mapa panel o resolve directo).
    // Cubre raws introducidos por edicion de matriz que aun no entraron al seed.
    try {
      const resueltos = new Map<string, number>()
      for (const c of coloresPorConfirmar) {
        if ((c.estado === 'existente' || c.estado === 'mapeado' || c.estado === 'creado') && typeof c.color_id === 'number') {
          resueltos.set(claveColor(c.raw), c.color_id)
        }
      }
      const sinId = new Map<string, Set<string>>()
      for (const c of reales) {
        const cod = String(c.codigo_caja || c.codigo_caja_temporal || 's/código')
        for (const col of c.matriz?.colores || []) {
          const raw = String(col || '').trim()
          if (!raw) continue
          const k = claveColor(raw)
          if (resueltos.has(k)) continue
          // Fase 1: tela/material o patron puro no bloquea la validacion.
          if (esColorIgnorable(raw)) continue
          const seed = coloresPorConfirmar.find((c) => claveColor(c.raw) === k)
          const m = resolveColor(raw, catalogoColores as CatalogColor[], seed?.en ?? null, seed?.es ?? null)
          if (m.found && typeof m.id === 'number') { resueltos.set(k, m.id); continue }
          if (!sinId.has(raw)) sinId.set(raw, new Set())
          sinId.get(raw)!.add(cod)
        }
      }
      if (sinId.size > 0) {
        const lista = [...sinId.entries()].map(([raw, cods]) => `"${raw}" (${cods.size} caja(s): ${[...cods].slice(0, 3).join(', ')})`).join(', ')
        out.push({ id: 'col-detalle', codigo: 'COLOR_SIN_RESOLVER', mensaje: `Detalles sin color_id: ${lista} (FK cat_colores).`, paso: 4, fix: 'Mapea a existente o créalos en el panel de colores.' })
      }
    } catch { /* sin catalogo no se valida detalle */ }
    // Match exacto líneas vs armadas + packs
    try {
      const m = calcularMatchCajasOrdenRapida()
      for (const d of m.diffs.filter((x) => x.estado !== 'OK')) {
        out.push({ id: `match-${d.sku}`, codigo: 'MATCH_CAJAS_DIF', mensaje: `"${d.sku}": línea ${d.cajasLinea} vs armadas ${d.cajasFisicas} (dif ${d.dif > 0 ? `+${d.dif}` : d.dif}).`, sku: d.sku, paso: 4, fix: 'Ajusta línea esperada o mueve/agrega cajas.' })
      }
    } catch { /* match no disponible sin datos */ }
    try {
      const mp = calcularMatchPacks()
      for (const d of mp.diffs.filter((x) => x.estado !== 'OK')) {
        out.push({ id: `pack-${d.sku}-${d.pack}`, codigo: 'MATCH_PACK_DIF', mensaje: `"${d.sku} · ${d.pack}": línea ${d.linea} vs armadas ${d.armadas} (dif ${d.dif > 0 ? `+${d.dif}` : d.dif}).`, sku: d.sku, pack: d.pack, paso: 4, fix: 'Ajusta línea del pack o renombra/divide packs.' })
      }
    } catch { /* sin packs */ }
    return out
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- cadena de match con callbacks; mismo patrón que verificacionPrevia
  }, [selectedProveedor, selectedCliente, selectedContenedor, newContainerCode, editableProductos, editableCajas, coloresPorConfirmar, catalogoColores, calcularMatchCajasOrdenRapida, calcularMatchPacks])
  const erroresBloqueantes = erroresSubida
  // Hash de verificación: cualquier cambio invalida el "Verificado OK"
  const hashVerificacion = useMemo(() => {
    try {
      return JSON.stringify({
        p: editableProductos.map((p) => [p.temp_id || p.sku_base, p.sku_base]),
        c: editableCajas.map((c) => [c.codigo_caja || c.codigo_caja_temporal, c.sku_base, c.cantidad_cajas, c.piezas_por_caja, c.nombre_pack]),
        le: lineaEditadaPorSku, lp: lineaEditadaPorPack, pr: principalPorSku,
        s: [selectedProveedor, selectedCliente, selectedContenedor, newContainerCode, newContainerNumber],
        col: coloresPorConfirmar.map((c) => [c.raw, c.estado, c.color_id]),
      })
    } catch { return 'hash-error' }
  }, [editableProductos, editableCajas, lineaEditadaPorSku, lineaEditadaPorPack, principalPorSku, selectedProveedor, selectedCliente, selectedContenedor, newContainerCode, newContainerNumber, coloresPorConfirmar])
  const necesitaReverificar = !verificacionManual || verificacionManual.hash !== hashVerificacion
  const verificadoOk = !!verificacionManual?.ok && !necesitaReverificar && erroresBloqueantes.length === 0

  const handleVerificarLocal = () => {
    if (erroresBloqueantes.length === 0) {
      setVerificacionManual({ hash: hashVerificacion, ok: true, fecha: Date.now() })
      setMostrarErroresSubida(false)
      toast.success('Verificación local OK: sin bloqueantes. Ya puedes cargar a DB.')
    } else {
      setVerificacionManual({ hash: hashVerificacion, ok: false, fecha: Date.now() })
      setMostrarErroresSubida(true)
      toast.error(`${erroresBloqueantes.length} bloqueo(s): corrígelos aquí mismo o con Ir a corregir.`)
    }
  }

  // Ir a corregir: cierra modal, va al paso y expande el SKU/caja objetivo
  const handleIrACorregir = (e: ErrorSubida) => {
    setIsConfirmFinalModalOpen(false)
    setMostrarErroresSubida(true)
    if (e.paso === 1) { setStep(1); return }
    if (e.paso === 3) {
      setStep(3)
      if (e.sku) {
        const prod = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === String(e.sku || '').trim().toUpperCase())
        if (prod?.sku_base) setExpandedProducts((prev) => new Set(prev).add(String(prod.sku_base)))
        if (prod?.temp_id) { setEditandoSku(prod.temp_id) }
      }
      return
    }
    setStep(4)
    if (e.sku) {
      setExpandedProducts((prev) => new Set(prev).add(String(e.sku)))
      // también prueba con upper exacto del grupo
      const up = String(e.sku || '').trim().toUpperCase()
      const prod = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === up)
      if (prod?.sku_base) setExpandedProducts((prev) => new Set(prev).add(String(prod.sku_base)))
    }
  }

  // Renombrar código duplicado/vacío directo en el modal
  const handleRenombrarCodigoEnModal = (viejo: string, nuevoRaw: string) => {
    const nuevo = String(nuevoRaw || '').trim()
    if (!viejo || !nuevo) { toast.error('Escribe el nuevo código.'); return }
    if (nuevo.toUpperCase() === String(viejo).trim().toUpperCase()) return
    const usados = new Set(editableCajas.filter((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') !== viejo).map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '').toUpperCase()))
    if (usados.has(nuevo.toUpperCase())) { toast.error(`"${nuevo}" ya existe: elige otro.`); return }
    setEditableCajas((prev) => prev.map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') === viejo
      ? { ...c, codigo_caja_temporal: nuevo, codigo_caja: nuevo } : c))
    setParsedData((prev: WizardParsedData | null) => {
      if (!prev || !Array.isArray(prev.detalles)) return prev
      return { ...prev, detalles: prev.detalles.map((d) => String(d?.codigo_caja_temporal || '') === viejo ? { ...d, codigo_caja_temporal: nuevo } : d) }
    })
    setPrincipalPorSku((prev) => {
      let ch = false
      const nx: Record<string, string> = {}
      for (const [k, v] of Object.entries(prev)) { if (v === viejo) { nx[k] = nuevo; ch = true } else nx[k] = v }
      return ch ? nx : prev
    })
    setCodigoRenameDrafts((prev) => { const nx = { ...prev }; delete nx[viejo]; return nx })
    toast.success(`Código ${viejo} → ${nuevo}. Vuelve a Verificar local.`)
  }

  // Ajuste rápido cantidad / piezas por caja directo en el modal
  const handleAjustarCajaNumero = (codigo: string, campo: 'cantidad_cajas' | 'piezas_por_caja', valorRaw: string) => {
    const v = campo === 'cantidad_cajas' ? parseInt(valorRaw, 10) : Number(valorRaw)
    if (!codigo || isNaN(v) || v < 0 || (campo === 'cantidad_cajas' && !Number.isInteger(v))) { toast.error('Ingresa un número válido (entero ≥0 para cajas).'); return }
    if (campo === 'cantidad_cajas' && v === 0) { toast.error('La cantidad debe ser >0 (CHECK DB + bloqueo modo cajas).'); return }
    if (campo === 'piezas_por_caja' && !(v > 0)) { toast.error('Piezas por caja debe ser >0.'); return }
    setEditableCajas((prev) => prev.map((c) => {
      if (String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigo) return c
      if (campo === 'cantidad_cajas') {
        const pz = Number(c.piezas_por_caja || 0)
        return { ...c, cantidad_cajas: v, total_piezas: pz * v, cbm_total_linea: Number(c.cbm_por_caja ?? c.cbm ?? 0) * v, peso_bruto_total_kg: Number(c.peso_bruto_kg ?? 0) * v, peso_neto_total_kg: Number((c as unknown as Record<string, unknown>).peso_neto_kg ?? (c as unknown as Record<string, unknown>).peso_neto ?? 0) * v, piezas_estimadas: false } as WizardCaja
      }
      const qty = Number(c.cantidad_cajas || 0)
      return { ...c, piezas_por_caja: v, total_piezas: v * qty, piezas_estimadas: false, piezas_heredadas: false } as unknown as WizardCaja
    }))
    setModalCajaNumDrafts((prev) => { const nx = { ...prev }; delete nx[`${codigo}||${campo}`]; return nx })
    toast.success(`Caja ${codigo}: ${campo === 'cantidad_cajas' ? 'cantidad' : 'pz/caja'} = ${v}. Vuelve a Verificar local.`)
  }

  const handleNext = () => {
    if (step === 1) {
      if (!selectedProveedor || !selectedCliente) {
        toast.error('Selecciona proveedor y cliente B2B.')
        return
      }
      if (selectedContenedor === 'new' && !newContainerCode.trim()) {
        toast.error('Escribe un codigo para el nuevo contenedor.')
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!parsedData || parsedData.productos.length === 0) {
        toast.error('Procesa un Packing List antes de continuar.')
        return
      }
      setStep(3)
      return
    }

    if (step === 3) {
      if (editableProductos.length === 0) {
        toast.error('Debe haber al menos un producto en la lista para continuar.')
        return
      }

      // Comprobar diferencia entre cantidad esperada del producto y la suma de piezas en cajas
      const discrepancias: Array<{ sku: string; piezasProducto: number; piezasCajas: number; diferencia: number }> = []

      for (const prod of editableProductos) {
        const skuUpper = prod.sku_base.trim().toUpperCase()
        const cajasDelSku = editableCajas.filter(c => String(c.sku_base || '').trim().toUpperCase() === skuUpper && c.tipo_caja !== 'padre_resumen')
        const piezasEnCajas = cajasDelSku.reduce((sum, c) => sum + (c.total_piezas || ((c.cantidad_cajas || 0) * (c.piezas_por_caja || 0))), 0)

        const jsonInfo = jsonTotalesPorSku.get(prod.sku_base)
        const piezasEsperadas = jsonInfo?.piezas || Number((prod as any).piezas_pedidas || 0) || 0

        if (piezasEsperadas > 0 && piezasEnCajas > 0 && Math.abs(piezasEsperadas - piezasEnCajas) > 0.01) {
          discrepancias.push({
            sku: prod.sku_base,
            piezasProducto: piezasEsperadas,
            piezasCajas: piezasEnCajas,
            diferencia: piezasEnCajas - piezasEsperadas
          })
        }
      }

      if (discrepancias.length > 0) {
        setDiscrepancyModal({ open: true, items: discrepancias })
        return
      }

      // Aviso modo solo cajas en paso 3: las cajas y líneas se revisan en el paso 4.
      // No bloquea: permite continuar a Cajas para corregirlo o rellenar aquí mismo.
      const matchCajas = calcularMatchCajasOrdenRapida()
      if (!matchCajas.ok) {
        setCajasBlockModal({
          open: true,
          blocking: false,
          items: matchCajas.diffs
            .filter((d) => d.estado !== 'OK')
            .map((d) => ({ sku: d.sku, cajasEsperadas: d.cajasLinea, cajasArmadas: d.cajasFisicas, diferencia: d.dif })),
        })
        return
      }

      setStep(4)
      return
    }


    if (step === 4) {
      setIsConfirmFinalModalOpen(true)
      return
    }
  }

  const handleBack = () => {
    if (step > 1 && step < 5) {
      setStep(step - 1)
    }
  }

  const steps = [
    { number: 1, label: 'Config' },
    { number: 2, label: 'Carga' },
    { number: 3, label: 'Productos' },
    { number: 4, label: 'Cajas' },
    { number: 5, label: 'Revision' },
  ]

  return (
    <div className="space-y-6">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
        {steps.map((item, index) => (
          <div key={item.number} className="flex flex-1 items-center last:flex-none">
            <div className="z-10 flex flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === item.number
                    ? 'scale-110 bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md'
                    : step > item.number
                      ? 'bg-green-600 text-white'
                      : 'border border-border/80 bg-muted text-muted-foreground'
                }`}
              >
                {step > item.number ? 'OK' : item.number}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  step === item.number ? 'font-bold text-primary' : 'text-muted-foreground/80'
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 rounded transition-colors ${
                  step > item.number ? 'bg-green-600' : 'bg-border/60'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Card className="overflow-hidden border-border/60 bg-card/65 shadow-md">
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">1. Configuracion de socios comerciales y destino</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="proveedor" className="text-sm font-semibold">Proveedor origen</Label>
                  <Select value={selectedProveedor} onValueChange={(value) => handleProveedorChange(value || '')}>
                    <SelectTrigger id="proveedor" className="h-10">
                      <SelectValue placeholder="Selecciona el proveedor extranjero...">
                        {selectedProveedorObj?.nombre_completo}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={String(proveedor.id)}>
                          {proveedor.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Entidad emisora del Packing List.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente" className="text-sm font-semibold">Cliente B2B destino</Label>
                  <Select value={selectedCliente} onValueChange={(value) => setSelectedCliente(value || '')}>
                    <SelectTrigger id="cliente" className="h-10">
                      <SelectValue placeholder="Selecciona el comprador...">
                        {selectedClienteObj?.nombre_completo}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={String(cliente.id)}>
                          {cliente.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Cliente final para la orden B2B.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="block text-sm font-semibold">Asignacion de contenedor de importacion</Label>

                <div className="grid grid-cols-1 items-end gap-6 rounded-lg border bg-muted/20 p-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="contenedor-sel" className="text-xs">Destino de carga</Label>
                    <Popover open={contenedorPopoverOpen} onOpenChange={setContenedorPopoverOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            id="contenedor-sel"
                            variant="outline"
                            role="combobox"
                            aria-expanded={contenedorPopoverOpen}
                            className={cn(
                              'h-9 w-full justify-between truncate text-left font-normal',
                              selectedContenedorEsSurtido &&
                                'border-yellow-400 bg-yellow-100/70 text-yellow-950 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-100',
                            )}
                          />
                        }
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                          <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          {selectedContenedor === 'new' ? (
                            <span className="truncate">+ Crear nuevo contenedor</span>
                          ) : selectedContenedorObj ? (
                            <span className="truncate font-mono text-xs">
                              {selectedContenedorObj.codigo_contenedor} (
                              {selectedContenedorObj.numero_contenedor ?? 'S/N'}) - {selectedContenedorObj.estado}
                              {selectedContenedorEsSurtido ? ' (ya surtido)' : ''}
                            </span>
                          ) : (
                            <span className="truncate text-muted-foreground">Buscar contenedor...</span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-[380px] max-w-[90vw] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por 2026-XX o código..."
                            value={contenedorSearch}
                            onValueChange={setContenedorSearch}
                          />
                          <CommandList>
                            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                              Sin resultados para &quot;{contenedorSearch}&quot;.
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="new"
                                onSelect={() => handleContenedorSelect('new')}
                                className="font-semibold"
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4 shrink-0 text-primary',
                                    selectedContenedor === 'new' ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                + Crear nuevo contenedor
                              </CommandItem>
                              {filteredContenedores.map((contenedor) => {
                                const esSurtido = isContenedorSurtidoLike(contenedor.estado)
                                const isSelected = String(contenedor.id) === selectedContenedor
                                return (
                                  <CommandItem
                                    key={contenedor.id}
                                    value={`${contenedor.codigo_contenedor} ${contenedor.numero_contenedor ?? ''}`}
                                    onSelect={() => handleContenedorSelect(String(contenedor.id))}
                                    className={cn(
                                      esSurtido &&
                                        'border-l-4 border-yellow-400 bg-yellow-100/70 text-yellow-950 data-[selected=true]:bg-yellow-200/80 dark:bg-yellow-900/30 dark:text-yellow-100',
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4 shrink-0',
                                        isSelected ? 'opacity-100' : 'opacity-0',
                                        esSurtido ? 'text-yellow-700 dark:text-yellow-300' : 'text-primary',
                                      )}
                                    />
                                    {esSurtido && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-300" />}
                                    <span className="truncate font-mono text-xs">
                                      {contenedor.codigo_contenedor} ({contenedor.numero_contenedor ?? 'S/N'}) -{' '}
                                      {contenedor.estado}
                                      {esSurtido ? ' · ya surtido' : ''}
                                    </span>
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedContenedorEsSurtido && selectedContenedorObj && (
                      <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-[11px] text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-600 dark:text-yellow-300" />
                        <span>
                          El contenedor <strong className="font-mono">{selectedContenedorObj.codigo_contenedor}</strong>{' '}
                          ya está surtido ({selectedContenedorObj.estado}). Se muestra en amarillo para ubicar los
                          recientes; puedes usarlo igual o elegir otro.
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedContenedor === 'new' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-2">
                      <div className="space-y-2">
                        <Label htmlFor="nuevo-cont-cod" className="text-xs">Codigo de identificacion del contenedor</Label>
                        <Input
                          id="nuevo-cont-cod"
                          placeholder="Ej. CONT-K24-MX01"
                          value={newContainerCode}
                          onChange={(event) => setNewContainerCode(event.target.value)}
                          className="h-9 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nuevo-cont-num" className="text-xs">No. de contenedor (opcional)</Label>
                        <Input
                          id="nuevo-cont-num"
                          placeholder="Ej. HAMU1553617 (opcional)"
                          value={newContainerNumber}
                          onChange={(event) => setNewContainerNumber(event.target.value.toUpperCase())}
                          className="h-9 font-mono uppercase"
                        />
                        <p className="text-[10px] text-muted-foreground">Físico. Se guarda tal cual; si va vacío queda como S/N.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 rounded border bg-muted/40 p-3 text-xs text-muted-foreground md:col-span-2">
                      <p className="font-mono font-bold text-foreground">
                        {selectedContenedorObj?.codigo_contenedor ?? 'Sin asignar'} ({selectedContenedorObj?.numero_contenedor ?? 'S/N'}) - {selectedContenedorObj?.estado ?? ''}
                      </p>
                      <p>La revision quedara asociada a este contenedor al guardar.</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Sección de Selección de Formato / Plantilla de Packing List */}
              <div className="space-y-3 rounded-xl border border-primary/20 bg-muted/20 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="parser-format-sel" className="text-sm font-semibold flex items-center gap-2">
                      <span>Plantilla / Formato de Packing List (Parser n8n)</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Define la estructura del Excel para que n8n ejecute la rama especializada adecuada.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsParserGuideOpen(true)}
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 self-start sm:self-auto"
                  >
                    <HelpCircle className="h-3.5 w-3.5" /> Guía visual de formatos
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div className="md:col-span-2">
                    <Select value={selectedParserFormat} onValueChange={(val) => setSelectedParserFormat(val || 'auto')}>
                      <SelectTrigger id="parser-format-sel" className="h-10">
                        <SelectValue placeholder="Selecciona el formato...">
                          {PARSER_FORMATS.find((f) => f.id === selectedParserFormat)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {PARSER_FORMATS.map((f) => (
                          <SelectItem key={f.id} value={f.id} className="py-2">
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="font-semibold text-xs">{f.label}</span>
                              <span className="text-[10px] text-muted-foreground line-clamp-1">{f.shortDesc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-1">
                    {selectedParserFormat === 'auto' ? (
                      <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
                        <span className="block font-semibold text-primary text-[11px]">Detección Automática</span>
                        <span className="text-[10px] text-muted-foreground">
                          {selectedProveedorObj?.nombre_completo
                            ? `Para "${selectedProveedorObj.nombre_completo}": Formato ${resolverParserSelector(selectedProveedorObj.nombre_completo).toUpperCase()}`
                            : 'Basada en el socio seleccionado'}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-md border border-emerald-300 bg-emerald-50/60 p-2 text-xs dark:bg-emerald-950/30">
                        <span className="block font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">Formato Forzado</span>
                        <span className="text-[10px] text-muted-foreground">
                          Se procesará explícitamente con la rama seleccionada
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="mb-2 flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">2. Subida y analisis inteligente</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  {/* Selector rápido de formato en Step 2 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">Formato n8n:</span>
                      <Badge variant="outline" className={PARSER_FORMATS.find(f => f.id === selectedParserFormat)?.badgeColor || ''}>
                        {PARSER_FORMATS.find(f => f.id === selectedParserFormat)?.label || selectedParserFormat}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={selectedParserFormat} onValueChange={(val) => setSelectedParserFormat(val || 'auto')}>
                        <SelectTrigger className="h-7 text-xs w-[190px]">
                          <SelectValue placeholder="Cambiar formato..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PARSER_FORMATS.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsParserGuideOpen(true)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        title="Ver guía visual de formatos"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-8 text-center transition-colors hover:border-primary/50">
                    <FileSpreadsheet className="mb-4 h-12 w-12 animate-bounce text-muted-foreground/60 duration-1000" />
                    <p className="text-sm font-semibold">Selecciona tu archivo Packing List</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Soporta archivos .xls y .xlsx. PDF se agregara en una fase posterior.
                    </p>

                    <input
                      id="packing-file-input"
                      type="file"
                      accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null
                        setSelectedFile(file)
                        setFileName(file?.name ?? null)
                        resetParsedState()
                      }}
                    />

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => document.getElementById('packing-file-input')?.click()}
                        disabled={processing}
                      >
                        Examinar archivos
                      </Button>
                      <Button type="button" size="sm" onClick={procesarPackingList} disabled={processing || !selectedFile}>
                        {processing ? 'Procesando...' : 'Procesar con n8n'}
                      </Button>
                    </div>
                  </div>

                  {fileName && (
                    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />
                        <span className="font-mono text-xs font-medium">{fileName}</span>
                      </div>
                      {!processing && (
                        <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">
                          Archivo listo
                        </Badge>
                      )}
                    </div>
                  )}

                  {processing && (
                    <div className="space-y-2.5 rounded-lg border bg-muted/30 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-primary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {progressMsg}
                        </span>
                        <span className="font-mono">{progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {!processing && warnings.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-yellow-200 bg-yellow-50/80 p-4">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p className="text-sm font-semibold">Warnings de validacion</p>
                      </div>
                      {warnings.map((warning, index) => (
                        <p key={`${warning.codigo ?? 'warning'}-${index}`} className="text-xs text-yellow-900">
                          {warning.mensaje ?? warning.detalle ?? 'n8n devolvio una advertencia sin detalle.'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-3.5 rounded-xl border border-border/80 bg-muted/40 p-4">
                    <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Conexion real a n8n
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      El archivo se envia desde el servidor por <code className="font-mono">/api/packing/parse</code>
                      {' '}y solo el backend conoce <code className="font-mono">N8N_PACKING_WEBHOOK_URL</code>.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      La respuesta se conserva en memoria para revisar productos, cajas y resumen sin insertar todavia en Supabase.
                    </p>
                    {Boolean(rawN8nResponse) && (
                      <div className="space-y-2">
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                          Respuesta real recibida desde n8n
                        </Badge>
                        {debugInfo && (
                          <div className="rounded-lg border border-green-200 bg-green-50/70 p-3 text-xs text-green-900">
                            <p>Tipo recibido: {debugInfo.topLevelType}</p>
                            <p>Productos detectados: {debugInfo.productosCount}</p>
                            <p>Cajas detectadas: {debugInfo.cajasCount}</p>
                            <p>Detalles detectados: {debugInfo.detallesCount}</p>
                            <p>Warnings detectados: {debugInfo.warningsCount}</p>
                            <p className="break-all">Llaves: {debugInfo.topLevelKeys.join(', ') || 'sin llaves'}</p>
                            <div className="space-y-1">
                              <p className="font-semibold">Preview crudo de Next.js:</p>
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-green-200 bg-white/70 p-2 text-[10px] leading-4">
                                {debugInfo.rawPreview || 'sin preview'}
                              </pre>
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold">Preview desenvuelto para adaptar:</p>
                              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-green-200 bg-white/70 p-2 text-[10px] leading-4">
                                {debugInfo.unwrappedPreview || 'sin preview'}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">3. Productos detectados</h2>
                  {isCheckingDbSkus && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Verificando catálogo Supabase...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoDetectAllProducts}
                    className="h-8 gap-1.5 border-amber-400/50 bg-amber-50 text-xs text-amber-900 hover:bg-amber-100 font-bold dark:bg-amber-950/40 dark:text-amber-300"
                    title="Detectar automáticamente Prenda, Género, Edad y Marca para todos los productos de la lista"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                    Auto-detectar atributos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncProductsFromDb}
                    disabled={isSyncingDbProducts}
                    className="h-8 gap-1.5 border-emerald-400/50 bg-emerald-50 text-xs text-emerald-800 hover:bg-emerald-100 font-bold dark:bg-emerald-950/40 dark:text-emerald-300"
                    title="Traer descripción, marca, composición y precio de la base de datos para todos los productos de la lista"
                  >
                    {isSyncingDbProducts ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    Sincronizar datos con BD
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddProductOpen(true)}
                    className="h-8 gap-1.5 border-primary/40 bg-primary/5 text-xs text-primary hover:bg-primary/10 font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar producto
                  </Button>
                  {warnings.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-md border border-yellow-200/50 bg-yellow-100/50 px-3 py-1 text-xs text-yellow-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>La revision puede continuar aunque existan warnings.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-1 text-sm font-semibold">
                  <Package className="h-4 w-4 text-primary" /> Revision local de SKUs ({editableProductos.length} SKUs unicos)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/60 text-left font-bold text-muted-foreground uppercase text-[10px]">
                        <th className="p-3">Verificación BD</th>
                        <th className="p-3 w-40 min-w-[140px]">SKU Base</th>
                        <th className="p-3 min-w-[260px]">Descripción / Nombre</th>
                        <th className="p-3 min-w-[140px]">Prenda</th>
                        <th className="p-3 min-w-[130px]">Género</th>
                        <th className="p-3 min-w-[150px]">Marca (Catálogo)</th>
                        <th className="p-3 min-w-[120px]">Composición</th>
                        <th className="p-3 text-right">Precio USD</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {editableProductos.map((producto, index) => {
                        const skuUp = String(producto.sku_base || '').trim().toUpperCase()
                        const rowSkuKey = producto.temp_id || `idx-${index}`
                        const dbMatch = dbSkusSet.has(skuUp)
                        const isForcedNew = Boolean(producto.force_new)
                        const isMatch = dbMatch && !isForcedNew
                        const vinculo = vinculosDb[skuUp]
                        const probable = probablesDb.find((p) => String(p.inputSku).trim().toUpperCase() === skuUp)
                        const n8nStr = skuN8nPorSku[skuUp] || (producto as any).sku_raw || ''

                        const currentBrandObj = marcas.find(
                          (m) =>
                            (producto.marca_id && m.id === producto.marca_id) ||
                            (producto.marca && m.nombre.toUpperCase() === producto.marca.toUpperCase()),
                        )
                        const currentBrandValue = currentBrandObj ? currentBrandObj.id.toString() : ''
                        const displayBrandName = currentBrandObj ? currentBrandObj.nombre : producto.marca || ''
                        const jsonMarca = (producto.json_marca || producto.marca_raw || '') as string

                        return (
                          <tr
                            key={producto.temp_id || `idx-${index}`}
                            className={cn(
                              "transition-colors",
                              isMatch
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 hover:bg-emerald-100/50"
                                : isForcedNew
                                ? "bg-blue-50/40 dark:bg-blue-950/20 border-l-4 border-l-blue-500 hover:bg-blue-100/40"
                                : "bg-amber-50/30 dark:bg-amber-950/20 border-l-4 border-l-amber-400 hover:bg-amber-100/30"
                            )}
                          >
                            {/* 1. Verificación BD / Estado */}
                            <td className="p-3 align-top">
                              <div className="flex flex-col gap-1.5 items-start">
                                {isMatch ? (
                                  <>
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                                      <CheckCircle2 className="h-3 w-3" /> En Catálogo BD
                                    </Badge>
                                    <span className="text-[10px] font-mono text-muted-foreground" title="Comparativa n8n vs sistema (match 100)">
                                      n8n: <strong className="text-foreground">{n8nStr || producto.sku_base}</strong>
                                      <br />BD: <strong className="text-foreground">{producto.sku_base}</strong>
                                    </span>
                                  </>
                                ) : vinculo ? (
                                  <>
                                    <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                                      <CheckCircle2 className="h-3 w-3" /> Sincronizado: {vinculo.dbSku}
                                    </Badge>
                                    <span className="text-[10px] font-mono text-muted-foreground" title="Vínculo manual del usuario">
                                      n8n: <strong className="text-foreground">{n8nStr || producto.sku_base}</strong>
                                      <br />BD: <strong className="text-foreground">{vinculo.dbSku}</strong>
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-[9px] px-1.5 font-bold text-muted-foreground hover:text-destructive underline"
                                      onClick={() => handleQuitarVinculo(producto.sku_base)}
                                      title="Quitar vínculo y volver a nuevo"
                                    >
                                      Quitar vínculo
                                    </Button>
                                  </>
                                ) : probable ? (
                                  <div className="rounded-lg border border-amber-400/60 bg-amber-50/70 dark:bg-amber-950/30 p-2 space-y-1.5 max-w-[220px]">
                                    <Badge variant="outline" className="border-amber-500 text-amber-800 dark:text-amber-300 font-bold text-[10px] gap-1">
                                      <AlertTriangle className="h-3 w-3" /> ¿Mismo código? ({probable.score})
                                    </Badge>
                                    <p className="text-[10px] font-mono leading-relaxed">
                                      n8n: <strong>{n8nStr || probable.inputSku}</strong>
                                      <br />BD: <strong>{probable.dbSku}</strong>
                                      <br /><span className="text-muted-foreground">vía {probable.metodo}</span>
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] font-bold border-teal-500/50 text-teal-700 hover:bg-teal-50 dark:text-teal-300"
                                      onClick={() => handleSincronizarProbable(probable)}
                                    >
                                      🔗 Sincronizar con {probable.dbSku}
                                    </Button>
                                  </div>
                                ) : isForcedNew ? (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                                    <Sparkles className="h-3 w-3" /> Nuevo (Forzado)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 font-bold text-[10px]">
                                    Nuevo / No registrado
                                  </Badge>
                                )}

                                {(() => {
                                  const up = String(producto.sku_base || '').trim().toUpperCase()
                                  const alertas = alertasPorSku.get(up) ?? []
                                  const rellenado = rellenadosN8n.has(up)
                                  if (alertas.length === 0 && !rellenado) return null
                                  const altas = alertas.filter((a) => a.severidad === 'alta').length
                                  const title = [
                                    ...alertas.map((a) => `• [${a.tipo ?? 'aviso'}${a.severidad ? `/${a.severidad}` : ''}] ${a.detalle || a.issue || ''}`),
                                    ...(rellenado ? ['• Línea autocompletada por auditoría n8n desde el físico'] : []),
                                  ].join('\n')
                                  return (
                                    <div className="flex flex-wrap gap-1" title={title}>
                                      {alertas.length > 0 && (
                                        <Badge
                                          variant="outline"
                                          className={`font-bold text-[10px] ${altas > 0 ? 'border-red-400 bg-red-50 text-red-800' : 'border-amber-400 bg-amber-50 text-amber-800'}`}
                                        >
                                          <AlertTriangle className="h-3 w-3 mr-0.5" /> {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} n8n
                                        </Badge>
                                      )}
                                      {rellenado && (
                                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                          🤖 Corregido por n8n
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                })()}

                                {(() => {
                                  if (separacionIgnorada) return null
                                  const up2 = String(producto.sku_base || '').trim().toUpperCase()
                                  const seps = separacionPorSku.get(up2) ?? []
                                  if (seps.length === 0) return null
                                  return (
                                    <div className="flex flex-col gap-1.5 rounded-md border border-amber-400/60 bg-amber-50/70 px-2 py-1.5 dark:bg-amber-950/30">
                                      {seps.map((sep, si) => {
                                        const cands = (sep.productos_candidatos || []).map((c) => String(c.sku_base || '')).filter(Boolean)
                                        const packs = (sep.packs_candidatos || []).map((p) => String(p.nombre_actual || '')).filter(Boolean)
                                        const upSep = String(sep.sku_base_original || '').trim().toUpperCase()
                                        const cajasSep = editableCajas.filter((cj) => cj.tipo_caja !== 'padre_resumen'
                                          && String(cj.sku_base || '').trim().toUpperCase() === upSep)
                                        const prevision = sep.tipo !== 'pack_duplicado_dudoso' && cands.length >= 2
                                          ? calcularDestinos(
                                            cajasSep.map((cj) => ({
                                              codigo: String(cj.codigo_caja_temporal || cj.codigo_caja || ''),
                                              carton: String((cj as unknown as Record<string, unknown>).carton_no_raw || '').trim(),
                                            })),
                                            parsedData?.staging_por_codigo || {},
                                            (sep.productos_candidatos || []).map((c) => ({
                                              sku_base: String(c.sku_base || ''),
                                              filas: (c.filas || []).map((x) => Number(x)),
                                              cartones: (c.cartones || []).map((x) => String(x)),
                                            })),
                                            sep.reparto_exacto || [],
                                          )
                                          : null
                                        const skuADest = String((sep.productos_candidatos || [])[0]?.sku_base || '').trim().toUpperCase()
                                        const muevenPrevistos = prevision
                                          ? [...prevision.destinos.values()].filter((s) => s.trim().toUpperCase() !== skuADest).length
                                          : 0
                                        const sinDatosPosicion = prevision !== null && cajasSep.length > 0 && muevenPrevistos === 0
                                        return (
                                          <div key={si} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                            <span className="font-bold text-amber-900 dark:text-amber-200">
                                              {sep.tipo === 'pack_duplicado_dudoso'
                                                ? `Pack duplicado${packs.length > 0 ? `: ${packs.join(', ')}` : ''}`
                                                : `Posible pegado: ${cands.length > 0 ? cands.join(' + ') : (sep.sku_base_original || '')}`}
                                            </span>
                                            {sep.tipo !== 'pack_duplicado_dudoso' && cands.length >= 2 && !sinDatosPosicion && (
                                              <Button
                                                type="button" variant="outline" size="sm"
                                                className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100"
                                                onClick={() => handleSepararSugerido(sep)}
                                                title={`Crea los productos candidatos y reparte sus cajas (moverá ${muevenPrevistos} a ${cands.slice(1).join(', ')})`}
                                              >
                                                Separar en {cands.length} (mueve {muevenPrevistos})
                                              </Button>
                                            )}
                                            {sep.tipo !== 'pack_duplicado_dudoso' && cands.length >= 2 && sinDatosPosicion && (
                                              <Button
                                                type="button" variant="outline" size="sm"
                                                className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100"
                                                onClick={() => handleSepararSugerido(sep, { soloCrear: true })}
                                                title="La sugerencia no trae filas ni cartones: crea los productos y mueve las cajas a mano con arrastre"
                                              >
                                                Crear productos (mover a mano)
                                              </Button>
                                            )}
                                            {sep.tipo === 'pack_duplicado_dudoso' && packs.map((pk) => (
                                              <Button
                                                key={pk} type="button" variant="outline" size="sm"
                                                className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100"
                                                onClick={() => {
                                                  const upB = String(producto.sku_base || '').trim().toUpperCase()
                                                  const wB = (alertasPorSku.get(upB) ?? []).find((a) => a.tipo === 'pack_duplicado_dudoso') as unknown as { cartones?: unknown } | undefined
                                                  const wcB = Array.isArray(wB?.cartones) ? (wB!.cartones as unknown[]).map((x) => String(x)) : undefined
                                                  const pcB = (sep.packs_candidatos || []).find((p) => String(p.nombre_actual || '') === pk)?.cartones
                                                  handleDividirPack(producto.sku_base || '', pk, wcB && wcB.length >= 2 ? wcB : pcB)
                                                }}
                                                title={`Divide ${pk} en dos por rangos de cartón`}
                                              >
                                                Dividir {pk}
                                              </Button>
                                            ))}
                                            <Button
                                              type="button" variant="ghost" size="sm"
                                              className="h-6 text-[10px] text-muted-foreground"
                                              onClick={() => setSeparacionIgnorada(true)}
                                            >
                                              Ignorar
                                            </Button>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )
                                })()}

                                {dbMatch && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      "h-5 text-[9px] px-1.5 font-bold transition-all",
                                      isForcedNew
                                        ? "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/70 underline"
                                        : "text-blue-700 hover:text-blue-900 hover:bg-blue-100/70 underline"
                                    )}
                                    onClick={() => {
                                      setEditableProductos((prev) =>
                                        prev.map((p, i) =>
                                          i === index ? { ...p, force_new: !isForcedNew, es_nuevo: !isForcedNew } : p
                                        )
                                      )
                                      if (!isForcedNew) {
                                        toast.info(`El SKU "${producto.sku_base}" se creará como un NUEVO producto separado en la base de datos.`)
                                      } else {
                                        toast.success(`El SKU "${producto.sku_base}" se vinculó nuevamente al producto existente en el catálogo.`)
                                      }
                                    }}
                                    title={isForcedNew ? "Vincular a producto existente en BD" : "Forzar creación como nuevo producto separado"}
                                  >
                                    {isForcedNew ? "🔗 Vincular a Catálogo" : "✨ Crear como Nuevo"}
                                  </Button>
                                )}
                              </div>
                            </td>

                              {/* 2. SKU Base (Textarea de 2 filas para SKUs largos) */}
                              <td className="p-3 font-mono text-xs font-bold align-top">
                                {(!isMatch || isForcedNew || editandoSku === rowSkuKey) ? (
                                  <div className="space-y-1.5">
                                    <SkuEditCell
                                      value={producto.sku_base}
                                      onCommit={(v) => commitSkuEdit(producto, index, v)}
                                      placeholder="SKU Base..."
                                      className="min-h-[52px] w-full min-w-[130px] font-mono text-xs font-bold bg-background/80 resize-none py-1.5 leading-snug"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10 font-bold"
                                      onClick={() => handleBuscarSkuEnBD(producto, index)}
                                      disabled={buscandoDb.has(rowSkuKey)}
                                      title="Buscar este código directamente en la base de datos"
                                    >
                                      {buscandoDb.has(rowSkuKey)
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <Search className="h-3 w-3" />}
                                      <span>{buscandoDb.has(rowSkuKey) ? 'Buscando...' : 'Buscar en BD'}</span>
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <span className="text-foreground block break-words">{producto.sku_base}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground font-bold underline"
                                      onClick={() => setEditandoSku(rowSkuKey)}
                                      title="Editar SKU manualmente"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      <span>Editar</span>
                                    </Button>
                                  </div>
                                )}
                              </td>

                            {/* 3. Descripción / Nombre con Botón Auto-detectar */}
                            <td className="p-3 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:bg-primary/10 font-bold"
                                    onClick={() => handleAutoDetectProduct(index)}
                                    title="Detectar Prenda, Género, Edad y Marca desde el texto"
                                  >
                                    <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                                    <span>Auto-detectar</span>
                                  </Button>
                                </div>
                                <Textarea
                                  rows={2}
                                  value={producto.descripcion ?? producto.nombre ?? ''}
                                  onChange={(event) => {
                                    const value = event.target.value
                                    setEditableProductos((prev) =>
                                      prev.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, descripcion: value, nombre: value } : item
                                      )
                                    )
                                  }}
                                  placeholder="Descripción del producto..."
                                  className="min-h-[52px] resize-y text-xs bg-background/90 font-medium py-1.5 leading-snug w-full min-w-[240px]"
                                />
                              </div>
                            </td>

                            {/* 4. Selector de Tipo de Prenda */}
                            <td className="p-3 align-top">
                              <Select
                                value={producto.tipo_prenda_id ? String(producto.tipo_prenda_id) : ''}
                                onValueChange={(val) => {
                                  const found = tipos_prenda.find((t) => String(t.id) === val)
                                  setEditableProductos((prev) =>
                                    prev.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            tipo_prenda: found ? found.nombre : item.tipo_prenda,
                                            tipo_prenda_id: found ? found.id : null,
                                          }
                                        : item
                                    )
                                  )
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background/90 w-36 font-semibold">
                                  <span className="truncate text-left flex-1">
                                    {tipos_prenda.find((t) => String(t.id) === String(producto.tipo_prenda_id))?.nombre || producto.tipo_prenda || 'Seleccionar...'}
                                  </span>
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {tipos_prenda.map((t) => (
                                    <SelectItem key={t.id} value={t.id.toString()} className="text-xs">
                                      {t.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>

                            {/* 5. Selector de Género (con auto-inferencia de Edad en segundo plano) */}
                            <td className="p-3 align-top">
                              <Select
                                value={producto.genero_id ? String(producto.genero_id) : ''}
                                onValueChange={(val) => {
                                  const found = generos.find((g) => String(g.id) === val)
                                  const inferredEdad = inferEdadFromGeneroAndText(val, producto.descripcion ?? producto.nombre ?? '', detectorCatalogos)
                                  setEditableProductos((prev) =>
                                    prev.map((item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            genero: found ? found.nombre : item.genero,
                                            genero_id: found ? found.id : null,
                                            ...(inferredEdad?.id ? { edad_id: inferredEdad.id, edad: inferredEdad.nombre } : {}),
                                          }
                                        : item
                                    )
                                  )
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background/90 w-32 font-semibold">
                                  <span className="truncate text-left flex-1">
                                    {generos.find((g) => String(g.id) === String(producto.genero_id))?.nombre || producto.genero || 'Seleccionar...'}
                                  </span>
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                  {generos.map((g) => (
                                    <SelectItem key={g.id} value={g.id.toString()} className="text-xs">
                                      {g.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>

                            {/* 6. Selector de Marca de Catálogo (muestra cat_marcas.nombre) */}
                            <td className="p-3 align-top">
                              <div className="space-y-1">
                                {jsonMarca && jsonMarca.toUpperCase() !== displayBrandName.toUpperCase() && (
                                  <span className="block text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                                    JSON: &quot;{jsonMarca}&quot;
                                  </span>
                                )}
                                <Select
                                  value={currentBrandValue}
                                  onValueChange={(val) => {
                                    const selectedBrand = marcas.find((m) => m.id.toString() === val)
                                    setEditableProductos((prev) =>
                                      prev.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              marca: selectedBrand ? selectedBrand.nombre : item.marca,
                                              marca_id: selectedBrand ? selectedBrand.id : null,
                                            }
                                          : item
                                      )
                                    )
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-xs bg-background/90 w-36 font-semibold">
                                    <span className="truncate text-left flex-1">
                                      {displayBrandName || 'Seleccionar marca...'}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {marcas.map((m) => (
                                      <SelectItem key={m.id} value={m.id.toString()} className="text-xs">
                                        {m.nombre}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>

                            {/* 7. Composición */}
                            <td className="p-3 align-top">
                              <Input
                                value={producto.composicion ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setEditableProductos((prev) =>
                                    prev.map((item, itemIndex) =>
                                      itemIndex === index ? { ...item, composicion: value } : item
                                    )
                                  )
                                }}
                                placeholder="ej: 100% Algodón"
                                className="h-9 w-32 text-xs bg-background/90"
                              />
                            </td>

                            {/* 8. Precio USD con Incremento ± 0.5 */}
                            <td className="p-3 text-right font-mono text-xs align-top">
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={producto.precio_unitario_usd ?? ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0
                                    setEditableProductos((prev) =>
                                      prev.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, precio_unitario_usd: value } : item
                                      )
                                    )
                                  }}
                                  className="h-9 w-20 text-right font-mono text-xs font-bold bg-background/90"
                                />
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = Number(producto.precio_unitario_usd || 0)
                                      const next = Math.max(0, Math.round((current + 0.5) * 10) / 10)
                                      setEditableProductos((prev) =>
                                        prev.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, precio_unitario_usd: next } : item
                                        )
                                      )
                                    }}
                                    className="h-4 px-1.5 bg-muted hover:bg-primary/20 hover:text-primary text-[9px] font-bold rounded flex items-center justify-center text-foreground transition-colors border"
                                    title="Incrementar +0.50 USD"
                                  >
                                    +0.5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = Number(producto.precio_unitario_usd || 0)
                                      const next = Math.max(0, Math.round((current - 0.5) * 10) / 10)
                                      setEditableProductos((prev) =>
                                        prev.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, precio_unitario_usd: next } : item
                                        )
                                      )
                                    }}
                                    className="h-4 px-1.5 bg-muted hover:bg-primary/20 hover:text-primary text-[9px] font-bold rounded flex items-center justify-center text-foreground transition-colors border"
                                    title="Disminuir -0.50 USD"
                                  >
                                    -0.5
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* 7. Acciones */}
                            <td className="p-3 text-center align-top">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteProductModal({ open: true, index, sku: producto.sku_base })}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Eliminar producto de la revisión"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {step === 4 && (
            <div className="space-y-6">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">4. Cajas, logistica y confirmacion</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={modoArrastre ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-[10px] gap-1 font-bold"
                    onClick={() => {
                      setModoArrastre((prev) => {
                        if (!prev) {
                          setShowWarnings(false)
                          setShowHuecos(false)
                          toast.info('Modo arrastre: usa el grip ✋ de cada caja o tócala y luego toca el producto destino.')
                        }
                        return !prev
                      })
                      setCajaArrastrada(null)
                      setDragOverProducto(null)
                    }}
                    title="Modo arrastre: mover cajas entre productos (colapsa avisos)"
                  >
                    <Hand className="h-3.5 w-3.5" /> {modoArrastre ? 'Arrastre ON' : 'Arrastre'}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={expandAllProducts}>
                    Expandir todo
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={collapseAllProducts}>
                    Colapsar todo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Card className="border border-border/80 bg-muted/10 relative group">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Productos</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => abrirOverride('productos', 'Productos', overrideProductos ?? parsedData?.orden.total_productos ?? cajasAgrupadas.length)}
                        title="Editar valor objetivo de la nota (Productos)"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-2xl font-black tracking-tight">{cajasAgrupadas.length}</p>
                    {((overrideProductos ?? parsedData?.orden.total_productos) != null) && (
                      <ComparisonBadge
                        calculated={cajasAgrupadas.length}
                        json={overrideProductos ?? parsedData!.orden.total_productos!}
                        label="Productos"
                        onSync={() => setOverrideProductos(cajasAgrupadas.length)}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10 relative group">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cajas</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => abrirOverride('cajas', 'Cajas', overrideCajas ?? parsedData?.orden.total_cajas ?? totalCajasCount)}
                        title="Editar valor objetivo de la nota (Cajas)"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-2xl font-black tracking-tight">{totalCajasCount}</p>
                    {((overrideCajas ?? parsedData?.orden.total_cajas) != null) && (
                      <ComparisonBadge
                        calculated={totalCajasCount}
                        json={overrideCajas ?? parsedData!.orden.total_cajas!}
                        label="Cajas"
                        onSync={() => setOverrideCajas(totalCajasCount)}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10 relative group">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Piezas</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => abrirOverride('piezas', 'Piezas', overridePiezas ?? parsedData?.orden.total_piezas ?? totalPiezasCount)}
                        title="Editar valor objetivo de la nota (Piezas)"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-2xl font-black tracking-tight text-primary">{totalPiezasCount.toLocaleString()}</p>
                    {((overridePiezas ?? parsedData?.orden.total_piezas) != null) && (
                      <ComparisonBadge
                        calculated={totalPiezasCount}
                        json={overridePiezas ?? parsedData!.orden.total_piezas!}
                        label="Piezas"
                        onSync={() => setOverridePiezas(totalPiezasCount)}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10 relative group">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CBM total</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => abrirOverride('cbm', 'CBM Total', overrideCbm ?? parsedData?.orden.cbm_estimado ?? totalCbm.toFixed(3))}
                        title="Editar valor objetivo de la nota (CBM)"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-2xl font-black tracking-tight italic">{totalCbm.toFixed(3)}</p>
                    {((overrideCbm ?? parsedData?.orden.cbm_estimado) != null) && (
                      <ComparisonBadge
                        calculated={totalCbm}
                        json={overrideCbm ?? parsedData!.orden.cbm_estimado!}
                        label="CBM"
                        onSync={() => setOverrideCbm(Number(totalCbm.toFixed(3)))}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10 relative group">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso neto</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => abrirOverride('pesoNeto', 'Peso Neto Total (kg)', overridePesoNeto ?? (parsedData?.orden as any)?.peso_neto_total_kg ?? (parsedData?.orden as any)?.peso_neto_estimado ?? totalPesoNeto.toFixed(1))}
                        title="Editar valor objetivo de la nota (Peso Neto)"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-800 dark:text-slate-200">{totalPesoNeto.toFixed(1)} kg</p>
                    {((overridePesoNeto ?? (parsedData?.orden as any)?.peso_neto_total_kg ?? (parsedData?.orden as any)?.peso_neto_estimado) != null) && (
                      <ComparisonBadge
                        calculated={totalPesoNeto}
                        json={overridePesoNeto ?? ((parsedData?.orden as any)?.peso_neto_total_kg || (parsedData?.orden as any)?.peso_neto_estimado)!}
                        label="Peso Neto"
                        onSync={() => setOverridePesoNeto(Number(totalPesoNeto.toFixed(1)))}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10 relative group">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso bruto</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => abrirOverride('peso', 'Peso Bruto Total (kg)', overridePeso ?? parsedData?.orden.peso_bruto_total_kg ?? totalPesoBruto.toFixed(1))}
                        title="Editar valor objetivo de la nota (Peso Bruto)"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-2xl font-black tracking-tight">{totalPesoBruto.toFixed(1)} kg</p>
                    {((overridePeso ?? parsedData?.orden.peso_bruto_total_kg) != null) && (
                      <ComparisonBadge
                        calculated={totalPesoBruto}
                        json={overridePeso ?? parsedData!.orden.peso_bruto_total_kg!}
                        label="Peso Bruto"
                        onSync={() => setOverridePeso(Number(totalPesoBruto.toFixed(1)))}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {/* Huecos: cajas físicas sin línea esperada */}
                {huecosFisico.length > 0 && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        {huecosFisico.length} producto(s) con cajas físicas sin línea
                      </span>
                      <Button type="button" size="sm" onClick={handleRellenarHuecos} className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-6 text-[10px] ml-auto">
                        Rellenar desde físico
                      </Button>
                      <Button
                        type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
                        onClick={() => setShowHuecos((prev) => !prev)}
                        title={showHuecos ? 'Ocultar detalle' : 'Ver detalle'}
                      >
                        {showHuecos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showHuecos && (
                      <div className="space-y-1">
                        {huecosFisico.map((h) => (
                          <p key={h.key} className="text-xs font-mono text-amber-900 dark:text-amber-200">
                            {h.sku}: línea 0 → propuesta <strong>{h.cajas} cajas</strong> ({h.piezas.toLocaleString()} pz)
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {huecosRellenados.length > 0 && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    ✓ {huecosRellenados.length} línea(s) rellenada(s) desde el físico — verifica el match antes de guardar.
                  </p>
                )}
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Cajas agrupadas por producto (editable)
                </h3>

                <div className="space-y-3">
                  {cajasAgrupadas.map(({ producto, cajas: cajasGrupo }) => {
                    const isExpanded = expandedProducts.has(producto.sku_base || '__sin_sku__')
                    const cajasReales = cajasGrupo.filter(c => c.tipo_caja !== 'padre_resumen')
                    const cpEntry = cajasGrupo.find(c => c.tipo_caja === 'padre_resumen')
                    const cpTallas = cpEntry?.tallas || []
                    const cpColores = cpEntry?.colores || []
                    const grupoPiezas = cajasReales.reduce((s, c) => s + (c.total_piezas || c.piezas_por_caja * (c.cantidad_cajas || 1)), 0)
                    const grupoCajas = cajasReales.reduce((s, c) => s + (c.cantidad_cajas || 1), 0)
                    const grupoCbm = cajasReales.reduce((s, c) => s + (c.cbm_total_linea || c.cbm * (c.cantidad_cajas || 1)), 0)
                    const grupoPesoBruto = cajasReales.reduce((s, c: any) => {
                      const pBrutoSingle = Number(c.peso_bruto_kg ?? 0)
                      const qty = Number(c.cantidad_cajas || 1)
                      const lineTotal = Number(c.peso_bruto_total_kg ?? (pBrutoSingle * qty))
                      return s + (isNaN(lineTotal) ? 0 : lineTotal)
                    }, 0)
                    const grupoPesoNeto = cajasReales.reduce((s, c: any) => {
                      const pNetoSingle = Number(c.peso_neto_kg ?? c.peso_neto ?? 0)
                      const qty = Number(c.cantidad_cajas || 1)
                      const lineTotal = Number(c.peso_neto_total_kg ?? (pNetoSingle * qty))
                      return s + (isNaN(lineTotal) ? 0 : lineTotal)
                    }, 0)
                    const jsonSku = jsonTotalesPorSku.get(producto.sku_base)

                    return (
                      <div
                        key={producto.sku_base}
                        className={`rounded-lg border border-border/80 overflow-hidden transition-shadow ${modoArrastre && dragOverProducto === String(producto.sku_base || '').trim().toUpperCase() ? 'ring-2 ring-primary shadow-lg' : ''}`}
                        onDragOver={(e) => {
                          if (!modoArrastre) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          const up = String(producto.sku_base || '').trim().toUpperCase()
                          setDragOverProducto((prev) => (prev === up ? prev : up))
                        }}
                        onDragLeave={() => setDragOverProducto(null)}
                        onDrop={(e) => {
                          if (!modoArrastre) return
                          e.preventDefault()
                          const cod = e.dataTransfer.getData('text/plain')
                          setDragOverProducto(null)
                          if (cod) handleMoverCaja(cod, String(producto.sku_base || ''))
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (modoArrastre && cajaArrastrada) {
                              handleMoverCaja(cajaArrastrada, String(producto.sku_base || ''))
                              return
                            }
                            toggleProduct(producto.sku_base || '__sin_sku__')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleProduct(producto.sku_base || '__sin_sku__')
                            }
                          }}
                          className="flex w-full flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer select-none"
                          title={modoArrastre && cajaArrastrada ? `Soltar aquí la caja ${cajaArrastrada}` : undefined}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary">{producto.sku_base}</span>
                                {producto.marca && (
                                  <Badge variant="secondary" className="text-[10px]">{producto.marca}</Badge>
                                )}
                                {producto.es_nuevo && (
                                  <Badge variant="default" className="bg-emerald-500 text-[10px]">NUEVO</Badge>
                                )}
                                {huecosRellenados.includes(String(producto.sku_base || '').trim().toUpperCase()) && (
                                  <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-700 dark:text-emerald-300">Rellenado</Badge>
                                )}
                                {(() => {
                                  const up = String(producto.sku_base || '').trim().toUpperCase()
                                  const alertas = alertasPorSku.get(up) ?? []
                                  const nDetalles = cajasReales.reduce((s, c) => s + (detallesPorCaja.get(String(c.codigo_caja_temporal || '')) ?? 0), 0)
                                  if (alertas.length === 0 && nDetalles === 0) return null
                                  return (
                                    <span className="flex items-center gap-1">
                                      {nDetalles > 0 && (
                                        <Badge variant="secondary" className="text-[10px]" title={`${nDetalles} renglones de desglose talla/color en sus cajas`}>
                                          🧵 {nDetalles} detalles
                                        </Badge>
                                      )}
                                      {alertas.length > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-300"
                                          title={alertas.map((a) => `• [${a.tipo ?? 'aviso'}] ${a.detalle || a.issue || ''}`).join('\n')}
                                        >
                                          <AlertTriangle className="h-3 w-3 mr-0.5" /> {alertas.length} en n8n
                                        </Badge>
                                      )}
                                    </span>
                                  )
                                })()}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {producto.descripcion || producto.nombre || 'Sin descripcion'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase text-muted-foreground flex-wrap">
                            <span>{cajasReales.length} {cajasReales.length === 1 ? 'caja' : 'cajas'} ({grupoCajas} und)</span>
                            <span className="flex items-center gap-1">
                              {grupoPiezas.toLocaleString()} pz
                              {jsonSku && <ComparisonBadge calculated={grupoPiezas} json={jsonSku.piezas} label="Piezas" />}
                            </span>
                            <span className="flex items-center gap-1">
                              {grupoCbm.toFixed(3)} m3
                              {jsonSku && <ComparisonBadge calculated={grupoCbm} json={jsonSku.cbm} label="CBM" />}
                            </span>
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              Neto: {grupoPesoNeto.toFixed(1)} kg
                              {jsonSku?.pesoNeto != null ? <ComparisonBadge calculated={grupoPesoNeto} json={jsonSku.pesoNeto} label="P.Neto" /> : null}
                            </span>
                            <span className="flex items-center gap-1">
                              Bruto: {grupoPesoBruto.toFixed(1)} kg
                              {jsonSku && <ComparisonBadge calculated={grupoPesoBruto} json={jsonSku.peso} label="P.Bruto" />}
                            </span>
                            {(() => {
                              const up = String(producto.sku_base || '').trim().toUpperCase()
                              const principal = cajaPrincipalDe(up, cajasReales)
                              if (!principal) return null
                              const cod = (code: WizardCaja): string => String(code.codigo_caja || code.codigo_caja_temporal || '')
                              return (
                                <span className="flex items-center gap-1 normal-case" onClick={(e) => e.stopPropagation()}>
                                  <span className="font-bold text-primary">
                                    Principal: {cod(principal)} ({Number(principal.piezas_por_caja || 0)} pz/caja)
                                  </span>
                                  {cajasReales.length > 1 && (
                                    <Select
                                      value={cod(principal)}
                                      onValueChange={(v: string | null) => { if (v) setPrincipalPorSku((prev: Record<string, string>) => ({ ...prev, [up]: v })) }}
                                    >
                                      <SelectTrigger className="h-6 w-[130px] text-[10px] font-mono">
                                        <SelectValue placeholder="Cambiar caja" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {cajasReales.map((c) => (
                                          <SelectItem key={cod(c)} value={cod(c)}>
                                            {cod(c)} ({Number(c.cantidad_cajas || 0)} cjs · {Number(c.piezas_por_caja || 0)} pz)
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </span>
                              )
                            })()}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[10px] gap-1 border-primary/40 text-primary hover:bg-primary/10 font-bold bg-primary/5 ml-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toast.success(`Recalculado SKU "${producto.sku_base}": ${cajasReales.length} cajas (${grupoCajas} und), ${grupoPiezas.toLocaleString()} pz, ${grupoCbm.toFixed(3)} m³, ${grupoPesoNeto.toFixed(1)} kg neto, ${grupoPesoBruto.toFixed(1)} kg bruto.`)
                                }}
                                title="Recalcular auditoría en vivo comparando cajas de este SKU vs Nota JSON"
                              >
                                <Calculator className="h-3 w-3" />
                                Recalcular
                              </Button>
                            </div>
                          </div>

                          {/* Línea del producto en vivo: lo pedido vs lo armado */}
                          {(() => {
                            const up = String(producto.sku_base || '').trim().toUpperCase()
                            const armadas = cajasReales.reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
                            const linea = lineaEsperada(producto.sku_base || '')
                            const editada = lineaEditadaPorSku[up] != null
                            const nDetalles = cajasReales.reduce((s, c) => s + (detallesPorCaja.get(String(c.codigo_caja_temporal || '')) ?? 0), 0)
                            const cuadra = linea === armadas
                            const editando = editLineaSku === up
                            return (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-2 text-xs">
                                <span className="font-semibold">
                                  Línea: <strong className="font-mono">{linea}</strong> cjs pedidas
                                  {editada && <Badge variant="outline" className="ml-1.5 text-[10px] border-primary/40 text-primary">editada</Badge>}
                                </span>
                                <span className="tabular-nums">
                                  Suma cajas: <strong className={`font-mono ${cuadra ? 'text-emerald-600' : 'text-destructive'}`}>{armadas}</strong>
                                  {cuadra
                                    ? <span className="ml-1.5 font-bold text-emerald-600">✓ match</span>
                                    : <span className="ml-1.5 font-bold text-destructive">dif {linea - armadas > 0 ? `+${linea - armadas}` : linea - armadas}</span>}
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                  {cajasReales.length} caja(s) · {nDetalles} detalle(s) · {grupoPiezas.toLocaleString()} pz
                                </span>
                                <span className="sm:ml-auto flex items-center gap-1.5">
                                  {editando ? (
                                    <>
                                      <Input
                                        type="number" min={0} step={1}
                                        value={editLineaVal}
                                        onChange={(e) => setEditLineaVal(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-7 w-20 text-right font-mono text-xs"
                                        autoFocus
                                      />
                                      <Button
                                        type="button" size="sm" className="h-7 text-[11px] font-bold"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const v = parseInt(editLineaVal, 10)
                                          if (isNaN(v) || v < 0) { toast.error('Ingresa un número válido de cajas (0 o más).'); return }
                                          setLineaEditadaPorSku((prev) => ({ ...prev, [up]: v }))
                                          setEditLineaSku(null)
                                          toast.success(`Línea de ${producto.sku_base} fijada en ${v} cajas.`)
                                        }}
                                      >
                                        Guardar
                                      </Button>
                                      <Button
                                        type="button" variant="ghost" size="sm" className="h-7 text-[11px]"
                                        onClick={(e) => { e.stopPropagation(); setEditLineaSku(null) }}
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        type="button" variant="outline" size="sm"
                                        className="h-7 text-[11px] gap-1 font-bold"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditLineaSku(up)
                                          setEditLineaVal(String(linea))
                                        }}
                                        title="Editar línea de producto (la verdad es lo editado)"
                                      >
                                        <Pencil className="h-3 w-3" /> Editar línea
                                      </Button>
                                      {editada && (
                                        <Button
                                          type="button" variant="ghost" size="sm"
                                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setLineaEditadaPorSku((prev) => {
                                              const next = { ...prev }
                                              delete next[up]
                                              return next
                                            })
                                            toast.info('Línea revertida al valor del JSON.')
                                          }}
                                          title="Volver al valor del JSON"
                                        >
                                          Revertir
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </span>
                              </div>
                            )
                          })()}

                        {isExpanded && (
                          <div className="space-y-4 border-t bg-background p-4">
                            {cpEntry && cpTallas.length > 0 && (
                              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-primary">
                                  Variantes del SKU ({cpTallas.length} tallas × {cpColores.length} colores)
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {cpTallas.map(t => (
                                    <Badge key={t} variant="outline" className="text-[10px] py-0 h-5 font-mono">{t}</Badge>
                                  ))}
                                  <span className="text-[10px] text-muted-foreground mx-1">×</span>
                                  {cpColores.map(c => (
                                    <Badge key={c} variant="secondary" className="text-[10px] py-0 h-5">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="md:col-span-2 flex justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/10 font-bold"
                                  onClick={(e) => { e.stopPropagation(); handleCajaAdd(producto) }}
                                  title="Agregar manualmente una caja no detectada a este producto"
                                >
                                  <Plus className="h-3 w-3" /> Agregar caja
                                </Button>
                              </div>
                              {(() => {
                                const grupos = new Map<string, WizardCaja[]>()
                                for (const c of cajasReales) {
                                  const p = String(c.nombre_pack || 'PACK UNICO')
                                  if (!grupos.has(p)) grupos.set(p, [])
                                  grupos.get(p)!.push(c)
                                }
                                const listaGrupos = [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]))
                                const mostrarGrupo = listaGrupos.length > 1
                                return listaGrupos.map(([pack, items]) => {
                                  const pk = packKeyOf(producto.sku_base || '', pack)
                                  const lineaP = lineaPackEsperada(producto.sku_base || '', pack)
                                  const armP = items.reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
                                  const piezasP = items.reduce((s, c) => s + Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0)), 0)
                                  const tieneLineaP = lineaP > 0 || jsonPackTieneSku(producto.sku_base || '')
                                  const okP = !tieneLineaP || lineaP === armP
                                  const editadaP = lineaEditadaPorPack[pk] != null
                                  const editandoP = editPackSku === pk
                                  return (
                                    <div key={pack} className="md:col-span-2 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                                      {(mostrarGrupo || !okP) && (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                                          <Badge variant="secondary" className="font-mono font-bold text-[10px] self-start">📦 {pack}</Badge>
                                          <span className="tabular-nums">
                                            Línea pack: <strong className="font-mono">{lineaP}</strong>
                                            {editadaP && <Badge variant="outline" className="ml-1 text-[9px] border-primary/40 text-primary">editada</Badge>}
                                          </span>
                                          <span className="tabular-nums">
                                            Suma: <strong className={`font-mono ${okP ? 'text-emerald-600' : 'text-destructive'}`}>{armP}</strong>
                                            {okP
                                              ? <span className="ml-1 font-bold text-emerald-600">✓ match</span>
                                              : <span className="ml-1 font-bold text-destructive">dif {lineaP - armP > 0 ? `+${lineaP - armP}` : lineaP - armP}</span>}
                                          </span>
                                          <span className="text-muted-foreground tabular-nums">{items.length} caja(s) · {piezasP.toLocaleString()} pz</span>
                                          <Button
                                            type="button" variant="ghost" size="sm"
                                            className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground font-bold"
                                            onClick={(e) => { e.stopPropagation(); setEditPackNombre(pk); setEditPackNombreVal(pack) }}
                                            title="Renombrar pack (corrige error de dedo PACK A/B)"
                                          >
                                            <Pencil className="h-3 w-3" /> pack
                                          </Button>
                                          {new Set(items.map((c) => String((c as unknown as Record<string, unknown>).carton_no_raw || '').trim()).filter(Boolean)).size > 1 && (
                                            <Button
                                              type="button" variant="ghost" size="sm"
                                              className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground font-bold"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                const upD = String(producto.sku_base || '').trim().toUpperCase()
                                                const wD = (alertasPorSku.get(upD) ?? []).find((a) => a.tipo === 'pack_duplicado_dudoso') as unknown as { cartones?: unknown } | undefined
                                                const wcD = Array.isArray(wD?.cartones) ? (wD!.cartones as unknown[]).map((x) => String(x)) : undefined
                                                handleDividirPack(producto.sku_base || '', pack, wcD)
                                              }}
                                              title="Dividir pack en dos por rangos de cartón"
                                            >
                                              Dividir
                                            </Button>
                                          )}
                                          <span className="sm:ml-auto flex items-center gap-1.5">
                                            {editandoP ? (
                                              <>
                                                <Input
                                                  type="number" min={0} step={1}
                                                  value={editPackVal}
                                                  onChange={(e) => setEditPackVal(e.target.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="h-7 w-20 text-right font-mono text-xs"
                                                  autoFocus
                                                />
                                                <Button
                                                  type="button" size="sm" className="h-7 text-[11px] font-bold"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    const v = parseInt(editPackVal, 10)
                                                    if (isNaN(v) || v < 0) { toast.error('Ingresa un número válido de cajas (0 o más).'); return }
                                                    setLineaEditadaPorPack((prev) => ({ ...prev, [pk]: v }))
                                                    setEditPackSku(null)
                                                    toast.success(`Línea de ${producto.sku_base} · ${pack} fijada en ${v} cajas.`)
                                                  }}
                                                >
                                                  Guardar
                                                </Button>
                                                <Button
                                                  type="button" variant="ghost" size="sm" className="h-7 text-[11px]"
                                                  onClick={(e) => { e.stopPropagation(); setEditPackSku(null) }}
                                                >
                                                  Cancelar
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button
                                                  type="button" variant="outline" size="sm"
                                                  className="h-7 text-[11px] gap-1 font-bold"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditPackSku(pk)
                                                    setEditPackVal(String(lineaP))
                                                  }}
                                                  title="Editar línea de este pack (la verdad es lo editado)"
                                                >
                                                  <Pencil className="h-3 w-3" /> Editar línea pack
                                                </Button>
                                                {editadaP && (
                                                  <Button
                                                    type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setLineaEditadaPorPack((prev) => {
                                                        const next = { ...prev }
                                                        delete next[pk]
                                                        return next
                                                      })
                                                      toast.info('Línea de pack revertida al valor del JSON.')
                                                    }}
                                                    title="Volver al valor del JSON"
                                                  >
                                                    Revertir
                                                  </Button>
                                                )}
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                      {editPackNombre === pk && (
                                        <div className="flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-1.5">
                                          <Input
                                            value={editPackNombreVal}
                                            onChange={(e) => setEditPackNombreVal(e.target.value.toUpperCase())}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-7 font-mono text-xs uppercase"
                                            placeholder="PACK A"
                                            autoFocus
                                          />
                                          <Button
                                            type="button" size="sm" className="h-7 text-[11px] font-bold"
                                            onClick={(e) => { e.stopPropagation(); handleRenombrarPack(producto.sku_base || '', pack, editPackNombreVal) }}
                                          >
                                            Guardar
                                          </Button>
                                          <Button
                                            type="button" variant="ghost" size="sm" className="h-7 text-[11px]"
                                            onClick={(e) => { e.stopPropagation(); setEditPackNombre(null) }}
                                          >
                                            Cancelar
                                          </Button>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {items.map((caja) => {
                                          const codTmp = String(caja.codigo_caja_temporal || '')
                                          return (
                                            <WizardCajaRow
                                              key={caja.codigo_caja_temporal || caja.codigo_caja}
                                              caja={caja}
                                              cpTallas={cpTallas}
                                              cpColores={cpColores}
                                              catalogo={catalogoColores}
                                              matchColores={matchColoresPorCaja.get(codTmp) ?? []}
                                              alertasCaja={alertasPorCaja.get(codTmp) ?? []}
                                              nDetalles={detallesPorCaja.get(codTmp) ?? 0}
                                              modoArrastre={modoArrastre}
                                              esArrastrada={cajaArrastrada === codTmp}
                                              onToggleArrastrada={handleToggleArrastrada}
                                              onDragStartArrastrada={handleDragStartArrastrada}
                                              onDragEndArrastrada={handleDragEndArrastrada}
                                              onEditCodigo={handleCajaEdit}
                                              onRemoveCodigo={handleCajaRemove}
                                              onAbrirColores={handleAbrirColoresRaw}
                                              mapaResueltos={mapaNombres}
                                            />
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>

                            {cajasReales.length === 0 && (
                              <div className="text-center py-4 space-y-3">
                                <p className="text-xs text-muted-foreground italic">
                                  No hay cajas reales (CC/CR) para este producto.
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/10 font-bold"
                                  onClick={(e) => { e.stopPropagation(); handleCajaAdd(producto) }}
                                >
                                  <Plus className="h-3 w-3" /> Agregar caja manual
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-6 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">Contenedor destino</span>
                  <p className="font-mono text-base font-bold">
                    {selectedContenedor === 'new'
                      ? `${newContainerCode || '(sin código)'}${newContainerNumber.trim() ? ` (${newContainerNumber.trim().toUpperCase()})` : ' (S/N)'} (Nuevo contenedor)`
                      : sortedContenedores.find((item) => String(item.id) === selectedContenedor)?.codigo_contenedor ?? 'Sin asignar'}
                  </p>
                  {selectedContenedorEsSurtido && selectedContenedorObj && (
                    <Badge
                      variant="outline"
                      className="mt-1 border-yellow-400 bg-yellow-100 text-xs text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" /> Ya surtido ({selectedContenedorObj.estado})
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">Estado de la orden interpretada</span>
                  <p className="text-sm font-semibold text-foreground">
                    <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-800">
                      {parsedData?.orden.estado ?? 'Pendiente de revision'}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">Total piezas</span>
                  <p className="text-sm font-semibold text-foreground">
                    {totalPiezasCount.toLocaleString()}
                    {parsedData?.orden.total_piezas ? (
                      <span className="ml-2 text-[10px] text-muted-foreground">(JSON: {parsedData.orden.total_piezas.toLocaleString()})</span>
                    ) : null}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">CBM total</span>
                  <p className="text-sm font-semibold text-foreground">
                    {totalCbm.toFixed(6)} m3
                    {parsedData?.orden.cbm_estimado ? (
                      <span className="ml-2 text-[10px] text-muted-foreground">(JSON: {parsedData.orden.cbm_estimado.toFixed(6)} m3)</span>
                    ) : null}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">Peso bruto total</span>
                  <p className="text-sm font-semibold text-foreground">
                    {totalPesoBruto.toFixed(3)} kg
                    {parsedData?.orden.peso_bruto_total_kg ? (
                      <span className="ml-2 text-[10px] text-muted-foreground">(JSON: {parsedData.orden.peso_bruto_total_kg.toFixed(3)} kg)</span>
                    ) : null}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">Guardado final</span>
                  <p className="text-sm text-muted-foreground">Pendiente para la siguiente fase. Esta pantalla solo confirma la revision.</p>
                </div>
              </div>

              {/* Sección de Auditoría y Resumen de Revisión de Diferencias */}
              <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold text-foreground">Resumen de Auditoría y Control de Diferencias</h3>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
                    Comparación: Calculado por Cajas vs Nota
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px]">
                        <th className="py-2.5 px-3 text-left font-bold">Métrica</th>
                        <th className="py-2.5 px-3 text-right font-bold">Calculado por Cajas (en vivo)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Valor de la Nota (Objetivo)</th>
                        <th className="py-2.5 px-3 text-right font-bold">Diferencia</th>
                        <th className="py-2.5 px-3 text-center font-bold">Estado</th>
                        <th className="py-2.5 px-3 text-center font-bold">Acción Rápida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        { key: 'productos', label: 'Productos', calc: cajasAgrupadas.length, target: overrideProductos ?? parsedData?.orden.total_productos, fmt: (v: number) => v.toString(), sync: () => setOverrideProductos(cajasAgrupadas.length) },
                        { key: 'cajas', label: 'Cajas Totales', calc: totalCajasCount, target: overrideCajas ?? parsedData?.orden.total_cajas, fmt: (v: number) => v.toString(), sync: () => setOverrideCajas(totalCajasCount) },
                        { key: 'piezas', label: 'Piezas Totales', calc: totalPiezasCount, target: overridePiezas ?? parsedData?.orden.total_piezas, fmt: (v: number) => v.toLocaleString(), sync: () => setOverridePiezas(totalPiezasCount) },
                        { key: 'cbm', label: 'CBM Total (m³)', calc: totalCbm, target: overrideCbm ?? parsedData?.orden.cbm_estimado, fmt: (v: number) => v.toFixed(3), sync: () => setOverrideCbm(Number(totalCbm.toFixed(3))) },
                        { key: 'pesoNeto', label: 'Peso Neto Total (kg)', calc: totalPesoNeto, target: overridePesoNeto ?? ((parsedData?.orden as any)?.peso_neto_total_kg || (parsedData?.orden as any)?.peso_neto_estimado), fmt: (v: number) => `${v.toFixed(1)} kg`, sync: () => setOverridePesoNeto(Number(totalPesoNeto.toFixed(1))) },
                        { key: 'pesoBruto', label: 'Peso Bruto Total (kg)', calc: totalPesoBruto, target: overridePeso ?? parsedData?.orden.peso_bruto_total_kg, fmt: (v: number) => `${v.toFixed(1)} kg`, sync: () => setOverridePeso(Number(totalPesoBruto.toFixed(1))) },
                      ].map((m) => {
                        const hasTarget = m.target != null
                        const diff = hasTarget ? m.calc - m.target! : 0
                        const isMatch = !hasTarget || Math.abs(diff) < 0.001

                        return (
                          <tr key={m.label} className="hover:bg-muted/30">
                            <td className="py-2.5 px-3 font-semibold text-foreground">{m.label}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{m.fmt(m.calc)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{hasTarget ? m.fmt(m.target!) : '—'}</td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {!hasTarget ? '—' : (
                                <span className={isMatch ? "text-emerald-600 font-medium" : "text-amber-600 font-bold"}>
                                  {diff > 0 ? `+${m.fmt(diff)}` : m.fmt(diff)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {!hasTarget ? (
                                <Badge variant="secondary" className="text-[10px]">Sin nota</Badge>
                              ) : isMatch ? (
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                  ✓ Coincide
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-[10px] font-bold">
                                  ⚠️ Discrepancia
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {hasTarget && !isMatch ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold"
                                  onClick={m.sync}
                                >
                                  Alinear a Calculado
                                </Button>
                              ) : isMatch ? (
                                <span className="text-[10px] text-emerald-600 font-medium">✓ Alineado</span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-700" />
                    <span className="text-xs font-bold text-yellow-900">
                      {warnings.length} aviso{warnings.length !== 1 ? 's' : ''} del sistema
                      {warnings.filter((w) => (w as any).severidad === 'alta').length > 0 && (
                        <span className="ml-1.5 text-destructive">
                          ({warnings.filter((w) => (w as any).severidad === 'alta').length} altos)
                        </span>
                      )}
                    </span>
                    <Button
                      type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto"
                      onClick={() => setShowWarnings((prev) => !prev)}
                      title={showWarnings ? 'Ocultar detalle' : 'Ver detalle'}
                    >
                      {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {showWarnings && (
                    <div className="space-y-1 mt-2">
                      {warnings.map((warning, index) => (
                        <p key={`summary-warning-${index}`} className="text-xs text-yellow-900">
                          {warning.mensaje ?? warning.detalle ?? 'n8n devolvio una advertencia sin detalle.'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Fase 2: panel de colores nuevos */}
              {(coloresNuevos.length > 0 || coloresOmitidos.length > 0) && (
                <div className="rounded-lg border border-amber-400/60 bg-amber-50/70 p-3 dark:bg-amber-950/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      🎨 {coloresNuevos.length} color{coloresNuevos.length !== 1 ? 'es' : ''} nuevo{coloresNuevos.length !== 1 ? 's' : ''} por crear
                      {coloresOmitidos.length > 0 && (
                        <span className="ml-1.5 text-destructive">({coloresOmitidos.length} omitido{coloresOmitidos.length !== 1 ? 's' : ''}: bloquearán el guardado)</span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {coloresPorConfirmar.filter((c) => c.estado === 'nuevo').slice(0, 6).map((c) => c.raw).join(' · ')}
                    </span>
                    <Button
                      type="button" size="sm" className="h-7 text-[11px] font-bold ml-auto"
                      onClick={() => { ensureDrafts(coloresNuevos); setColoresModalOpen(true) }}
                    >
                      Revisar colores
                    </Button>
                  </div>
                </div>
              )}
              {/* Dialogo compartido: valor objetivo de la nota (override KPI) */}
              <Dialog open={overrideModal !== null} onOpenChange={(open) => { if (!open) setOverrideModal(null) }}>
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Valor objetivo: {overrideModal?.label}</DialogTitle>
                    <DialogDescription>
                      Sobrescribe el total de la nota para comparar contra lo calculado. Vacío = quitar override.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={overrideValor}
                    onChange={(e) => setOverrideValor(e.target.value)}
                    autoFocus
                    className="h-9 tabular-nums"
                    onKeyDown={(e) => { if (e.key === 'Enter') aplicarOverride() }}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOverrideModal(null)}>Cancelar</Button>
                    <Button type="button" onClick={aplicarOverride} className="font-bold">Guardar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* Fase 2: modal de colores nuevos */}
              <Dialog open={coloresModalOpen} onOpenChange={(open) => { if (!open) setFiltroPendientes(''); setColoresModalOpen(open) }}>
                <DialogContent className="w-full sm:max-w-[85vw] max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>🎨 Se detectaron {coloresNuevos.length} color{coloresNuevos.length !== 1 ? 'es' : ''} nuevo{coloresNuevos.length !== 1 ? 's' : ''} — se crearán en el catálogo</DialogTitle>
                    <DialogDescription>
                      Revisa nombre ES, interno EN, código, hex y tipo. Puedes mapear a un color existente en vez de crear, u omitir (bloqueará el guardado).
                    </DialogDescription>
                  </DialogHeader>
                  {coloresNuevos.length > 5 && (
                    <Input
                      placeholder="Filtrar pendientes…"
                      value={filtroPendientes}
                      onChange={(e) => setFiltroPendientes(e.target.value)}
                      className="h-8 max-w-xs text-xs"
                    />
                  )}
                  {coloresNuevos.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin colores pendientes: todo está mapeado o creado.</p>
                  )}
                  {pendientesFiltrados.length === 0 && coloresNuevos.length > 0 && (
                    <p className="text-xs text-muted-foreground">Sin coincidencias para &quot;{filtroPendientes}&quot;.</p>
                  )}
                  <div className="space-y-3">
                    {pendientesFiltrados.map((c) => {
                      const key = claveColor(c.raw)
                      const d = colorDrafts[key] ?? { ...buildColorDraft(c.raw, c.en ?? null, c.es ?? null), mapear_a_id: null }
                      const setD = (patch: Partial<ColorDraft>) => setColorDrafts((prev) => ({
                        ...prev,
                        [key]: { ...(prev[key] ?? d), ...patch },
                      }))
                      return (
                        <div key={key} className="rounded-lg border p-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono font-bold">{c.raw}</Badge>
                            {(c.en || c.es) && (
                              <span className="text-[11px] text-muted-foreground">IA: {[c.en, c.es].filter(Boolean).join(' → ')}</span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {(c.cajas || []).length} caja(s){(c.cajas || []).length > 0 ? `: ${(c.cajas || []).slice(0, 3).join(', ')}` : ''}
                            </span>
                            <span className="ml-auto flex items-center gap-1.5">
                              <MapearColorCombobox
                                catalogo={catalogoColores}
                                onSelect={(id) => handleMapearColor(c.raw, id)}
                              />
                              <Button type="button" size="sm" className="h-7 text-[11px] font-bold" onClick={() => handleCrearColorFila(c.raw)}>
                                Crear
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => handleOmitirColor(c.raw)}>
                                Omitir
                              </Button>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre ES</Label>
                              <Input value={d.nombre} onChange={(e) => setD({ nombre: e.target.value.toUpperCase() })} className="h-8 font-mono text-xs uppercase" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Interno EN</Label>
                              <Input value={d.nombre_intern} onChange={(e) => setD({ nombre_intern: e.target.value.toUpperCase() })} className="h-8 font-mono text-xs uppercase" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Código</Label>
                              <Input value={d.codigo} onChange={(e) => setD({ codigo: e.target.value.toUpperCase() })} className="h-8 font-mono text-xs uppercase" maxLength={20} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hex</Label>
                              <div className="flex gap-1.5">
                                <Input type="color" value={d.hex_code} onChange={(e) => setD({ hex_code: e.target.value })} className="w-10 h-8 p-1" />
                                <Input value={d.hex_code.toUpperCase()} onChange={(e) => setD({ hex_code: e.target.value })} className="h-8 font-mono text-xs uppercase" maxLength={7} />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  title="Sugerir HEX (biblioteca → API → negro)"
                                  className="h-8 w-8 shrink-0 p-0"
                                  disabled={hexSugiriendo.has(key)}
                                  onClick={() => handleSugerirHex(c.raw)}
                                >
                                  {hexSugiriendo.has(key) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</Label>
                              <Select value={d.tipo_color} onValueChange={(v) => setD({ tipo_color: v || 'SOLIDO' })}>
                                <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SOLIDO">SOLIDO</SelectItem>
                                  <SelectItem value="DOBLE">DOBLE</SelectItem>
                                  <SelectItem value="ESTAMPADO">ESTAMPADO</SelectItem>
                                  <SelectItem value="MEZCLA">MEZCLA</SelectItem>
                                  <SelectItem value="REFLECTANTE">REFLECTANTE</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {coloresOmitidos.length > 0 && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5">
                      <p className="text-[11px] font-bold text-destructive">Omitidos (bloquearán el guardado):</p>
                      {coloresOmitidos.map((c) => (
                        <div key={c.raw} className="flex items-center gap-2 text-[11px]">
                          <Badge variant="outline" className="font-mono">{c.raw}</Badge>
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] ml-auto" onClick={() => handleReabrirColor(c.raw)}>
                            Reabrir
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {coloresAmbar.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50/60 p-2.5 space-y-1.5 dark:bg-amber-950/30">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200">Revisión ámbar (auto, no bloquea el guardado): {coloresAmbar.length}</p>
                      {coloresAmbar.slice(0, 10).map((c) => {
                        const cat = catalogoColores.find((cc) => cc.id === c.color_id)
                        return (
                          <div key={c.raw} className="flex flex-wrap items-center gap-2 text-[11px]">
                            <Badge variant="outline" className="font-mono">{c.raw}</Badge>
                            <span className="text-muted-foreground">→ {cat?.nombre ?? c.color_id} (parcial auto)</span>
                            <span className="ml-auto flex items-center gap-1.5">
                              <MapearColorCombobox
                                catalogo={catalogoColores}
                                onSelect={(id) => handleMapearColor(c.raw, id)}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px]"
                                title="El auto no cuadró: crearlo como color nuevo"
                                onClick={() => handleCrearNuevoDesdeAmbar(c.raw)}
                              >
                                Crear nuevo
                              </Button>
                            </span>
                          </div>
                        )
                      })}
                      <p className="text-[10px] text-muted-foreground">Si no cambias nada, se guarda con el automático. Puedes mapear a otro existente si prefieres.</p>
                    </div>
                  )}
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setColoresModalOpen(false)}>
                      Resolver después
                    </Button>
                    <Button type="button" onClick={handleCrearTodosColores} disabled={coloresNuevos.length === 0} className="font-bold">
                      Crear {coloresNuevos.length} color{coloresNuevos.length !== 1 ? 'es' : ''}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 py-8 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-inner">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" />
                </div>
              </div>

              <div className="mx-auto max-w-md space-y-2">
                <h2 className="text-xl font-bold text-foreground">Orden guardada</h2>
                <p className="text-sm text-muted-foreground">
                  La orden B2B quedó registrada en Supabase con sus productos, cajas y detalles.
                </p>
              </div>

              <div className="mx-auto flex max-w-sm flex-col justify-center gap-3 pt-4 sm:flex-row">
                <Button
                  className="h-10 w-full gap-1.5"
                  onClick={handleNuevaOrden}
                >
                  <Plus className="h-4 w-4" /> Nueva orden
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {step < 5 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={step === 1 || isPending}
            className="h-9 gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Atras
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            disabled={isPending || processing || (step === 2 && (!parsedData || parsedData.productos.length === 0))}
            className="h-9 gap-1 font-semibold"
          >
            {isPending || processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                {step === 4 ? 'Confirmar revision' : 'Siguiente'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Modal 1: Confirmación de eliminación de producto */}
      <AlertDialog open={Boolean(deleteProductModal)} onOpenChange={(open) => !open && setDeleteProductModal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> ¿Eliminar producto de la revisión?
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar el producto <strong className="font-mono text-foreground">{deleteProductModal?.sku}</strong> de esta revisión?
              Esta acción también removerá las cajas asociadas a este SKU.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Sí, eliminar producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: aviso de contenedor ya surtido */}
      <Dialog open={isSurtidoModalOpen} onOpenChange={setIsSurtidoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="h-5 w-5 shrink-0" /> Este contenedor ya está surtido
            </DialogTitle>
            <DialogDescription>
              {selectedContenedorObj ? (
                <>
                  El contenedor{' '}
                  <strong className="font-mono text-foreground">
                    {selectedContenedorObj.codigo_contenedor} ({selectedContenedorObj.numero_contenedor ?? 'S/N'})
                  </strong>{' '}
                  está en estado <strong className="text-foreground">{selectedContenedorObj.estado}</strong>. Se
                  resalta en amarillo para que puedas ubicar los contenedores recientes, esten o no surtidos.
                </>
              ) : (
                'El contenedor seleccionado ya fue surtido.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100">
            Si cargas otra orden sobre este contenedor se asociará al mismo destino. Si buscabas un contenedor libre,
            elige otro de la lista.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsSurtidoModalOpen(false)
                setSelectedContenedor('')
                setContenedorPopoverOpen(true)
              }}
            >
              Elegir otro contenedor
            </Button>
            <Button onClick={() => setIsSurtidoModalOpen(false)} className="gap-1 font-bold">
              <Check className="h-4 w-4" /> Entendido, usarlo igual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Agregar nuevo producto manualmente */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Agregar nuevo producto
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos del producto para añadirlo a la lista de revisión.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-sku" className="text-xs font-bold">SKU Base *</Label>
              <Input
                id="add-sku"
                placeholder="Ej: K24-MOD-01"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                className="h-9 font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-desc" className="text-xs font-bold">Descripción</Label>
              <Input
                id="add-desc"
                placeholder="Ej: Playera estampada caballero"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-marca" className="text-xs font-bold">Marca</Label>
                <Input
                  id="add-marca"
                  placeholder="Ej: MOTY"
                  value={newMarca}
                  onChange={(e) => setNewMarca(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-precio" className="text-xs font-bold">Precio USD</Label>
                <Input
                  id="add-precio"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 5.50"
                  value={newPrecio}
                  onChange={(e) => setNewPrecio(e.target.value)}
                  className="h-9 font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddProduct} className="gap-1 font-bold">
              <Plus className="h-4 w-4" /> Guardar producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Alerta de discrepancia de cantidades antes de pasar a Cajas */}
      <AlertDialog open={Boolean(discrepancyModal?.open)} onOpenChange={(open) => !open && setDiscrepancyModal(null)}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              Diferencia detectada en cantidades (Productos vs Cajas)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Diferencias entre piezas del producto y físico en cajas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
                <div>
                  Se encontraron diferencias entre la cantidad total de piezas del producto y el total físico desglosado en las cajas:
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border border-amber-200/80 bg-amber-50/60 p-3 space-y-2">
                  {discrepancyModal?.items.map((item) => (
                    <div key={item.sku} className="flex flex-col border-b border-amber-200/60 pb-1.5 last:border-0 last:pb-0">
                      <span className="font-mono font-bold text-amber-900">{item.sku}</span>
                      <div className="flex justify-between text-[11px] text-amber-800">
                        <span>Piezas esperadas: <strong>{item.piezasProducto.toLocaleString()}</strong> pzs</span>
                        <span>En Cajas: <strong>{item.piezasCajas.toLocaleString()}</strong> pzs</span>
                        <span className={item.diferencia > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                          ({item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia} pzs)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] italic">
                  ¿Deseas regresar a revisar los datos o continuar a la sección de cajas de todos modos?
                </div>
              </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setDiscrepancyModal(null)}>
              Revisar y corregir
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscrepancyModal(null)
                setStep(4)
              }}
              className="bg-amber-600 text-white hover:bg-amber-700 font-bold"
            >
              Continuar a Cajas de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal 3b: Aviso en paso 3 / Bloqueo absoluto al confirmar */}
      <AlertDialog open={Boolean(cajasBlockModal?.open)} onOpenChange={(open) => !open && setCajasBlockModal(null)}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className={`flex items-center gap-2 ${cajasBlockModal?.blocking ? 'text-destructive' : 'text-amber-600'}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${cajasBlockModal?.blocking ? '' : 'text-amber-500'}`} />
              {cajasBlockModal?.blocking
                ? 'Bloqueo modo cajas: líneas sin match con cajas armadas'
                : 'Aviso modo cajas: líneas sin match con cajas armadas'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Líneas sin match con cajas armadas (modo solo cajas, exacto).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
                <div>
                  Cada producto debe tener las mismas cajas en línea que en cajas armadas (exacto, sin tolerancia).
                  {cajasBlockModal?.blocking
                    ? ' Corrige la orden: no se puede guardar así.'
                    : ' Las cajas y líneas se revisan en el paso 4: puedes rellenar huecos aquí o continuar a corregirlos.'}
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  {cajasBlockModal?.items.map((item) => (
                    <div key={item.sku} className="flex flex-col border-b border-destructive/20 pb-1.5 last:border-0 last:pb-0">
                      <span className="font-mono font-bold text-foreground">{item.sku}</span>
                      <div className="flex justify-between text-[11px]">
                        <span>Línea (esperadas): <strong>{item.cajasEsperadas}</strong> cjs</span>
                        <span>Armadas: <strong>{item.cajasArmadas}</strong> cjs</span>
                        <span className="font-bold text-destructive">
                          ({item.diferencia > 0 ? `+${item.diferencia}` : item.diferencia} cjs)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            {cajasBlockModal?.blocking ? (
              <AlertDialogCancel onClick={() => setCajasBlockModal(null)}>
                Revisar y corregir
              </AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel onClick={() => setCajasBlockModal(null)}>
                  Revisar
                </AlertDialogCancel>
                {huecosFisico.length > 0 && (
                  <Button
                    type="button"
                    onClick={handleRellenarDesdeAviso}
                    className="bg-amber-600 text-white hover:bg-amber-700 font-bold"
                  >
                    Rellenar desde físico
                  </Button>
                )}
                <AlertDialogAction
                  onClick={() => {
                    setCajasBlockModal(null)
                    setStep(4)
                  }}
                  className="font-bold"
                >
                  Continuar a Cajas
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal 3c: Alerta saltable ámbar (probables sin resolver) */}
      <AlertDialog open={alertaAmbarOpen} onOpenChange={(open) => !open && setAlertaAmbarOpen(false)}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              {probablesSinResolver.length} código{probablesSinResolver.length !== 1 ? 's' : ''} probablemente ya {probablesSinResolver.length !== 1 ? 'están' : 'está'} en BD
            </AlertDialogTitle>
            <AlertDialogDescription>
              Códigos probablemente existentes en BD (revisión ámbar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
                <div>Revísalos antes de continuar. Puedes sincronizar uno por uno o seguir y se guardarán como nuevos.</div>
                <div className="max-h-56 overflow-y-auto rounded-md border border-amber-200/80 bg-amber-50/60 p-3 space-y-2">
                  {probablesSinResolver.map((p) => (
                    <div key={p.inputSku} className="flex flex-col border-b border-amber-200/60 pb-1.5 last:border-0 last:pb-0 gap-1">
                      <span className="font-mono font-bold text-foreground">{p.inputSku}</span>
                      <span className="text-[11px] text-amber-800">
                        n8n: <strong>{p.inputSku}</strong> → BD: <strong>{p.dbSku}</strong> ({p.metodo}, {p.score})
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] font-bold self-start border-teal-500/50 text-teal-700"
                        onClick={() => handleSincronizarProbable(p)}
                      >
                        🔗 Sincronizar con {p.dbSku}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setAlertaAmbarOpen(false)}>
              Revisar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAlertaAmbarOpen(false)
                doGuardarOrden()
              }}
              className="font-bold"
            >
              Continuar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal 4: Corroborar Proveedor y Confirmación Definitiva de la Orden B2B */}
      <Dialog open={isConfirmFinalModalOpen} onOpenChange={setIsConfirmFinalModalOpen}>
        <DialogContent className="w-[98vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Corroborar Proveedor y Guardar Orden B2B
            </DialogTitle>
            <DialogDescription className="text-xs">
              Antes de registrar la orden en Supabase, corrobora la asignación de socios comerciales para los productos, cajas y orden de compra.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 py-2 text-xs">
          <div className="space-y-4 min-w-0">
            {/* 0. Verificación pre-guardado: la orden sube correcta */}
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Verificación: cajas correctas y pz por caja
                </p>
                <Button
                  type="button" size="sm" variant={verificadoOk ? 'default' : 'outline'}
                  onClick={handleVerificarLocal}
                  className="ml-auto h-7 text-[11px] font-bold gap-1.5"
                  title="Escanea restricciones DB (SKU/códigos/pz/cantidades/matriz/colores/match/socios) y habilita la carga final solo si no hay bloqueantes"
                >
                  <ScanSearch className="h-3.5 w-3.5" /> {verificacionManual && !necesitaReverificar ? 'Re-verificar local' : 'Verificar local'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {verificadoOk ? (
                  <Badge className="bg-emerald-600 text-white font-bold gap-1"><ShieldCheck className="h-3 w-3" /> Verificado OK · {erroresBloqueantes.length === 0 ? '0 bloqueantes' : ''}</Badge>
                ) : verificacionManual && !necesitaReverificar ? (
                  <Badge variant="destructive" className="font-bold gap-1"><AlertTriangle className="h-3 w-3" /> {erroresBloqueantes.length} bloqueo(s) · corrige abajo</Badge>
                ) : verificacionManual && necesitaReverificar ? (
                  <Badge variant="outline" className="font-bold border-amber-500 text-amber-700 gap-1"><RefreshCw className="h-3 w-3" /> Cambios detectados · vuelve a verificar</Badge>
                ) : (
                  <Badge variant="outline" className="font-bold gap-1"><ScanSearch className="h-3 w-3" /> Sin verificar · pulsa Verificar local</Badge>
                )}
                <span className="text-muted-foreground">En vivo: {erroresBloqueantes.length} bloqueo(s) ahora mismo.</span>
                {mostrarErroresSubida || erroresBloqueantes.length > 0 ? (
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] font-bold underline" onClick={() => setMostrarErroresSubida((v) => !v)}>
                    {mostrarErroresSubida ? 'Ocultar detalle' : `Ver detalle (${erroresBloqueantes.length})`}
                  </Button>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.matchOk
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <span className={verificacionPrevia.matchOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    Match líneas vs cajas armadas (exacto)
                    {!verificacionPrevia.matchOk && ` — ${verificacionPrevia.fallasMatch} sin match`}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.matchPacksOk
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <span className={verificacionPrevia.matchPacksOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    Match por pack (PACK A/B del mismo SKU)
                    {!verificacionPrevia.matchPacksOk && ` — ${verificacionPrevia.fallasPacks} sin match`}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.sinPz.length === 0
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <span className={verificacionPrevia.sinPz.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    Todas las cajas con pz por caja
                    {verificacionPrevia.sinPz.length > 0 && ` — sin dato: ${verificacionPrevia.sinPz.slice(0, 5).join(', ')}${verificacionPrevia.sinPz.length > 5 ? ` +${verificacionPrevia.sinPz.length - 5}` : ''}`}
                  </span>
                  {verificacionPrevia.sinPz.length > 0 && (
                    <Button
                      type="button" variant="outline" size="sm"
                      className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100 ml-auto"
                      onClick={handleFijarPzMinima}
                      title="Asigna 1 pza/caja temporal a las cajas sin dato para no romper la lógica (revísalas después en su tarjeta)"
                    >
                      Fijar 1 pza ({verificacionPrevia.sinPz.length})
                    </Button>
                  )}
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {alertasN8n.length === 0
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  <span className={alertasN8n.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                    Alertas n8n: {alertasN8n.length === 0 ? 'ninguna' : `${alertasN8n.length} (informativas)`}
                    {auditoriaN8n?.rellenados?.length > 0 && ` · 🤖 ${auditoriaN8n.rellenados.length} autocompletada(s) en origen`}
                    {auditoriaN8n && ` · match origen ${auditoriaN8n.match_ok ? 'OK' : 'con diffs'}`}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.totalProductos > 0 && verificacionPrevia.totalCajas > 0
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <span className={verificacionPrevia.totalProductos > 0 && verificacionPrevia.totalCajas > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    {verificacionPrevia.totalProductos} productos · {verificacionPrevia.totalCajas} cajas · principal en {verificacionPrevia.conPrincipal}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.coloresPendientes === 0
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <span className={verificacionPrevia.coloresPendientes === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    Colores con id cat_colores (FK)
                    {verificacionPrevia.coloresPendientes === 0
                      ? coloresAmbar.length > 0 ? ` — ${coloresAmbar.length} ambar auto (no bloquea)` : ' — todos vinculados'
                      : ` — ${verificacionPrevia.coloresPendientes} sin resolver`}
                  </span>
                  {verificacionPrevia.coloresPendientes > 0 && (
                    <Button
                      type="button" variant="outline" size="sm"
                      className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100 ml-auto"
                      onClick={() => setColoresModalOpen(true)}
                    >
                      Abrir colores ({verificacionPrevia.coloresPendientes})
                    </Button>
                  )}
                </p>
                {!verificacionPrevia.todoOk && (
                  <p className="text-[11px] italic text-muted-foreground">
                    Corrige lo marcado para habilitar el guardado. El match de cajas no admite diferencias.
                  </p>
                )}
              </div>
              {(mostrarErroresSubida || erroresBloqueantes.length > 0) && (
                <div className="space-y-1.5 rounded-md border border-destructive/30 bg-background/80 p-2.5 max-h-[300px] overflow-y-auto">
                  <p className="text-[10px] font-black uppercase tracking-wider text-destructive flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" /> Restricciones DB que bloquean la subida ({erroresBloqueantes.length})
                  </p>
                  {erroresBloqueantes.length === 0 ? (
                    <p className="text-[11px] font-semibold text-emerald-700">Sin bloqueantes. Pulsa Verificar local para habilitar la carga.</p>
                  ) : erroresBloqueantes.slice(0, 30).map((e) => (
                    <div key={e.id} className="rounded border border-border/60 bg-muted/20 px-2 py-1.5 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold leading-snug">{e.mensaje}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{e.codigo} · paso {e.paso} · Fix: {e.fix}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] font-bold shrink-0" onClick={() => handleIrACorregir(e)} title={`Ir a paso ${e.paso} a corregir`}>
                          Ir a corregir
                        </Button>
                      </div>
                      {(e.codigo === 'CODIGO_DUPLICADO' || e.codigo === 'CODIGO_VACIO') && e.codigoCaja ? (
                        <div className="flex items-center gap-1.5 pl-5">
                          <Input
                            value={codigoRenameDrafts[e.codigoCaja] ?? e.codigoCaja}
                            onChange={(ev) => setCodigoRenameDrafts((prev) => ({ ...prev, [e.codigoCaja as string]: ev.target.value.toUpperCase() }))}
                            className="h-7 font-mono text-[11px] uppercase"
                            placeholder="NUEVO-CODIGO"
                          />
                          <Button type="button" size="sm" className="h-7 text-[11px] font-bold" onClick={() => handleRenombrarCodigoEnModal(e.codigoCaja as string, codigoRenameDrafts[e.codigoCaja as string] ?? '')}>
                            Guardar código
                          </Button>
                        </div>
                      ) : null}
                      {(e.codigo === 'MATCH_CAJAS_DIF') && e.sku ? (
                        <div className="flex items-center gap-1.5 pl-5">
                          <Input
                            type="number" min={0} step={1}
                            value={modalLineaDrafts[e.sku.toUpperCase()] ?? String(lineaEsperada(e.sku))}
                            onChange={(ev) => setModalLineaDrafts((prev) => ({ ...prev, [String(e.sku).toUpperCase()]: ev.target.value }))}
                            className="h-7 w-20 text-right font-mono text-[11px]"
                          />
                          <Button
                            type="button" size="sm" className="h-7 text-[11px] font-bold"
                            onClick={() => {
                              const v = parseInt(modalLineaDrafts[String(e.sku).toUpperCase()] ?? '', 10)
                              if (isNaN(v) || v < 0) { toast.error('Ingresa cajas ≥0.'); return }
                              setLineaEditadaPorSku((prev) => ({ ...prev, [String(e.sku).toUpperCase()]: v }))
                              toast.success(`Línea ${e.sku} = ${v}. Vuelve a Verificar local.`)
                            }}
                          >
                            Ajustar línea
                          </Button>
                        </div>
                      ) : null}
                      {(e.codigo === 'MATCH_PACK_DIF') && e.sku && e.pack ? (
                        <div className="flex items-center gap-1.5 pl-5">
                          <Input
                            type="number" min={0} step={1}
                            value={modalPackDrafts[`${String(e.sku).toUpperCase()}||${String(e.pack).toUpperCase()}`] ?? String(lineaPackEsperada(e.sku, e.pack))}
                            onChange={(ev) => setModalPackDrafts((prev) => ({ ...prev, [`${String(e.sku).toUpperCase()}||${String(e.pack).toUpperCase()}`]: ev.target.value }))}
                            className="h-7 w-20 text-right font-mono text-[11px]"
                          />
                          <Button
                            type="button" size="sm" className="h-7 text-[11px] font-bold"
                            onClick={() => {
                              const k = `${String(e.sku).toUpperCase()}||${String(e.pack).toUpperCase()}`
                              const v = parseInt(modalPackDrafts[k] ?? '', 10)
                              if (isNaN(v) || v < 0) { toast.error('Ingresa cajas ≥0.'); return }
                              setLineaEditadaPorPack((prev) => ({ ...prev, [k]: v }))
                              toast.success(`Línea ${e.sku} · ${e.pack} = ${v}. Vuelve a Verificar local.`)
                            }}
                          >
                            Ajustar pack
                          </Button>
                        </div>
                      ) : null}
                      {(e.codigo === 'SIN_PZ' || e.codigo === 'CANTIDAD_INVALIDA' || e.codigo === 'MATRIZ_VACIA') && e.codigoCaja ? (
                        <div className="flex flex-wrap items-center gap-1.5 pl-5">
                          <span className="text-[10px] text-muted-foreground font-mono">{e.codigoCaja}</span>
                          <Input
                            type="number" min={0} step={1}
                            value={modalCajaNumDrafts[`${e.codigoCaja}||cantidad_cajas`] ?? String(editableCajas.find((c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === e.codigoCaja)?.cantidad_cajas ?? '')}
                            onChange={(ev) => setModalCajaNumDrafts((prev) => ({ ...prev, [`${e.codigoCaja}||cantidad_cajas`]: ev.target.value }))}
                            className="h-7 w-20 text-right font-mono text-[11px]"
                            placeholder="cjs"
                            title="Cantidad de cajas"
                          />
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => handleAjustarCajaNumero(e.codigoCaja as string, 'cantidad_cajas', modalCajaNumDrafts[`${e.codigoCaja}||cantidad_cajas`] ?? '')}>
                            Cantidad
                          </Button>
                          <Input
                            type="number" min={0} step={1}
                            value={modalCajaNumDrafts[`${e.codigoCaja}||piezas_por_caja`] ?? String(editableCajas.find((c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === e.codigoCaja)?.piezas_por_caja ?? '')}
                            onChange={(ev) => setModalCajaNumDrafts((prev) => ({ ...prev, [`${e.codigoCaja}||piezas_por_caja`]: ev.target.value }))}
                            className="h-7 w-20 text-right font-mono text-[11px]"
                            placeholder="pz"
                            title="Piezas por caja"
                          />
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold" onClick={() => handleAjustarCajaNumero(e.codigoCaja as string, 'piezas_por_caja', modalCajaNumDrafts[`${e.codigoCaja}||piezas_por_caja`] ?? '')}>
                            Pz/caja
                          </Button>
                        </div>
                      ) : null}
                      {e.codigo === 'COLOR_SIN_RESOLVER' ? (
                        <div className="pl-5">
                          <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] font-bold" onClick={() => setColoresModalOpen(true)}>
                            Abrir colores (mapear/crear)
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {erroresBloqueantes.length > 30 && (
                    <p className="text-[10px] text-muted-foreground italic">+{erroresBloqueantes.length - 30} más. Corrige estos primero y re-verifica.</p>
                  )}
                </div>
              )}
            </div>
            {/* 1. Selector/Confirmación de Proveedor Origen */}
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <Label htmlFor="modal-proveedor" className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <span>🏢 Proveedor Origen (Asignación obligatoria)</span>
              </Label>
              <Select value={selectedProveedor} onValueChange={(val) => setSelectedProveedor(val || '')}>
                <SelectTrigger id="modal-proveedor" className="h-9 bg-background font-semibold text-xs border-emerald-300">
                  <span className="truncate text-left flex-1">
                    {selectedProveedorObj?.nombre_completo || 'Selecciona el proveedor...'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs font-medium">
                      {p.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1 text-[11px] text-emerald-900/90 dark:text-emerald-300/90 pt-1">
                <p>✓ <strong>Productos (`persona_id`):</strong> Los <strong>{editableProductos.length}</strong> productos nuevos o actualizados se asociarán a <strong>{selectedProveedorObj?.nombre_completo}</strong> como su proveedor/fabricante.</p>
                <p>✓ <strong>Cajas (`proveedor_id`):</strong> Las <strong>{totalCajasCount}</strong> cajas quedarán registradas para este proveedor.</p>
                <p>✓ <strong>Orden B2B (`proveedor_id`):</strong> La cabecera de la orden quedará registrada a nombre de este proveedor.</p>
              </div>
            </div>

            {/* 2. Cliente B2B y Contenedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente B2B Destino</span>
                <p className="font-semibold text-foreground truncate">{selectedClienteObj?.nombre_completo || 'No seleccionado'}</p>
                <p className="text-[10px] text-muted-foreground">Guardado como <code className="font-mono">cliente_b2b_id</code> en la orden</p>
              </div>

              <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Contenedor Asignado</span>
                <p className="font-mono font-bold text-foreground truncate">
                  {selectedContenedor === 'new'
                    ? `${newContainerCode || '(sin código)'}${newContainerNumber.trim() ? ` (${newContainerNumber.trim().toUpperCase()})` : ' (S/N)'} (Nuevo)`
                    : selectedContenedorObj
                      ? `${selectedContenedorObj.codigo_contenedor} (${selectedContenedorObj.numero_contenedor ?? 'S/N'}) - ${selectedContenedorObj.estado ?? ''}`
                      : 'Sin asignar'}
                </p>
                <p className="text-[10px] text-muted-foreground">Unidad de transporte físico (multi-proveedor)</p>
              </div>
            </div>

            {/* 3. Resumen de Totales a Registrar */}
            <div className="rounded-lg border bg-card p-3 space-y-2 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Resumen de carga a registrar</span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="rounded bg-muted/50 p-2">
                  <span className="block text-[10px] text-muted-foreground">SKUs</span>
                  <span className="font-mono font-bold text-sm text-primary">{editableProductos.length}</span>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <span className="block text-[10px] text-muted-foreground">Cajas Físicas</span>
                  <span className="font-mono font-bold text-sm text-primary">{totalCajasCount}</span>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <span className="block text-[10px] text-muted-foreground">Piezas Totales</span>
                  <span className="font-mono font-bold text-sm text-primary">{totalPiezasCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Apartado lateral: resumen por SKU para detalles ordenes_b2b */}
          <aside className={`rounded-xl border p-3 space-y-2 h-fit lg:sticky lg:top-0 ${resumenSku.todoOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border bg-muted/20'}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" /> Resumen por SKU
              </p>
              {resumenSku.todoOk ? (
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Confirmado
                </Badge>
              ) : (
                <Badge variant="outline" className="font-bold text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-300">
                  Por confirmar
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Lo que irá a la tabla detalles: SKU y sus cajas.</p>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
              {resumenSku.filas.map((f) => (
                <div
                  key={f.sku}
                  className={`rounded-lg border px-2.5 py-2 ${f.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold truncate" title={f.sku}>{f.sku}</span>
                    {f.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      : <span className="text-[10px] font-black text-destructive shrink-0">{f.dif > 0 ? `+${f.dif}` : f.dif}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    <span>{f.pzc} pz/caja</span>
                    <span>línea <strong className="text-foreground">{f.linea}</strong>{f.editada ? '*' : ''}</span>
                    <span>suma <strong className={f.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>{f.armadas}</strong></span>
                  </div>
                  {!f.ok && (
                    <div className="mt-1.5 flex items-center gap-1.5 rounded border border-dashed border-destructive/30 bg-background/70 px-1.5 py-1">
                      <Input
                        type="number" min={0} step={1}
                        value={modalLineaDrafts[f.sku.toUpperCase()] ?? String(f.linea)}
                        onChange={(e) => setModalLineaDrafts((prev) => ({ ...prev, [f.sku.toUpperCase()]: e.target.value }))}
                        className="h-6 w-16 text-right font-mono text-[10px]"
                        title="Corregir línea esperada de este SKU"
                      />
                      <Button
                        type="button" size="sm" className="h-6 text-[10px] font-bold px-2"
                        onClick={() => {
                          const v = parseInt(modalLineaDrafts[f.sku.toUpperCase()] ?? '', 10)
                          if (isNaN(v) || v < 0) { toast.error('Ingresa cajas ≥0.'); return }
                          setLineaEditadaPorSku((prev) => ({ ...prev, [f.sku.toUpperCase()]: v }))
                          setModalLineaDrafts((prev) => { const nx = { ...prev }; delete nx[f.sku.toUpperCase()]; return nx })
                          toast.success(`Línea ${f.sku} = ${v}. Vuelve a Verificar local.`)
                        }}
                      >
                        Línea
                      </Button>
                      <Button
                        type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] font-bold"
                        onClick={() => handleIrACorregir({ id: `go-${f.sku}`, codigo: 'MATCH_CAJAS_DIF', mensaje: '', paso: 4, sku: f.sku, fix: '' })}
                        title="Abrir este SKU en paso 4 para mover/agregar cajas"
                      >
                        Cajas
                      </Button>
                    </div>
                  )}
                  {f.packs.length > 1 && (
                    <div className="mt-1.5 space-y-1 border-t border-border/50 pt-1.5">
                      {f.packs.map((g) => (
                        <div key={g.pack} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
                            <Badge variant="outline" className="font-mono font-bold text-[9px] px-1.5 py-0 h-4">{g.pack}</Badge>
                            <span className="text-muted-foreground">lín <strong className="text-foreground">{g.linea}</strong>{g.editada ? '*' : ''}</span>
                            <span className={g.ok ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-destructive font-bold'}>
                              Σ {g.armadas}{g.ok ? ' ✓' : ` (${g.dif > 0 ? `+${g.dif}` : g.dif})`}
                            </span>
                          </div>
                          {!g.ok && (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number" min={0} step={1}
                                value={modalPackDrafts[`${f.sku.toUpperCase()}||${g.pack.toUpperCase()}`] ?? String(g.linea)}
                                onChange={(e) => setModalPackDrafts((prev) => ({ ...prev, [`${f.sku.toUpperCase()}||${g.pack.toUpperCase()}`]: e.target.value }))}
                                className="h-6 w-16 text-right font-mono text-[10px]"
                              />
                              <Button
                                type="button" size="sm" className="h-6 text-[10px] font-bold px-2"
                                onClick={() => {
                                  const k = `${f.sku.toUpperCase()}||${g.pack.toUpperCase()}`
                                  const v = parseInt(modalPackDrafts[k] ?? '', 10)
                                  if (isNaN(v) || v < 0) { toast.error('Ingresa cajas ≥0.'); return }
                                  setLineaEditadaPorPack((prev) => ({ ...prev, [k]: v }))
                                  setModalPackDrafts((prev) => { const nx = { ...prev }; delete nx[k]; return nx })
                                  toast.success(`Línea ${f.sku} · ${g.pack} = ${v}. Vuelve a Verificar local.`)
                                }}
                              >
                                Pack
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {resumenSku.filas.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">Sin productos.</p>
              )}
            </div>
            <div className="border-t border-border/60 pt-2 text-[11px] font-bold flex items-center justify-between tabular-nums">
              <span>{resumenSku.filas.length} productos</span>
              <span>{resumenSku.totalCajas} cajas</span>
            </div>
          </aside>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <div className="mr-auto flex flex-wrap items-center gap-2 text-[10px]">
              {verificadoOk ? (
                <span className="font-bold text-emerald-700 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Listo para subir a DB</span>
              ) : necesitaReverificar && verificacionManual ? (
                <span className="font-bold text-amber-700">Corregiste datos: pulsa Verificar local de nuevo.</span>
              ) : erroresBloqueantes.length > 0 ? (
                <span className="font-bold text-destructive">{erroresBloqueantes.length} bloqueo(s): verifica y corrige.</span>
              ) : (
                <span className="text-muted-foreground">Pulsa Verificar local para habilitar la carga final.</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmFinalModalOpen(false)}
              disabled={isPending}
            >
              Regresar a revisar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsConfirmFinalModalOpen(false)
                handleConfirmReview()
              }}
              disabled={isPending || !selectedProveedor || !selectedCliente || !verificadoOk}
              title={!verificadoOk ? (necesitaReverificar ? 'Pulsa Verificar local tras cada corrección para habilitar la subida' : `Hay ${erroresBloqueantes.length} bloqueo(s): corrígelos y verifica`) : 'Subida real a Supabase'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar y Guardar en Supabase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Guía Visual de Formatos de Packing List */}
      <Dialog open={isParserGuideOpen} onOpenChange={setIsParserGuideOpen}>
        <DialogContent className="w-[98vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <HelpCircle className="h-5 w-5 text-primary" /> Guía Visual: Formatos y Plantillas de Packing List (n8n)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compara la estructura de tu archivo Excel con las plantillas soportadas para elegir el camino correcto en el procesamiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PARSER_FORMATS.filter(f => f.id !== 'auto').map((format) => (
                <div
                  key={format.id}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    selectedParserFormat === format.id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs'
                      : 'border-border/70 bg-card hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{format.label}</span>
                    <Badge variant="outline" className={`text-[10px] font-mono ${format.badgeColor}`}>
                      Ruta n8n: {format.id}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {format.fullDesc}
                  </p>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Estructura típica de columnas:</span>
                    <div className="rounded bg-muted/70 p-2 font-mono text-[10px] text-foreground border border-border/50 overflow-x-auto whitespace-nowrap">
                      {format.headerPreview}
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/30 p-2 text-[11px] space-y-1 border border-border/40">
                    <span className="font-semibold text-foreground">Proveedores / Fabricantes de ejemplo:</span>
                    <p className="text-muted-foreground text-[10px]">{format.proveedoresEjemplo}</p>
                  </div>

                  <Button
                    type="button"
                    variant={selectedParserFormat === format.id ? "default" : "outline"}
                    size="sm"
                    className="w-full h-7 text-xs font-semibold"
                    onClick={() => {
                      setSelectedParserFormat(format.id)
                      setIsParserGuideOpen(false)
                      toast.success(`Formato cambiado a ${format.label}`)
                    }}
                  >
                    {selectedParserFormat === format.id ? "✓ Formato Seleccionado" : `Usar este Formato (${format.id})`}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsParserGuideOpen(false)}>
              Cerrar Guía
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

