// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ordenes-b2b\orden-rapida\OrdenRapidaWizard.tsx
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, ChevronDown, ChevronRight, Database, FileSpreadsheet, FileUp, HelpCircle, Info, Loader2, Package, Scale, Sparkles, AlertTriangle, ExternalLink, Plus, Trash2, X, Pencil, Calculator, RefreshCw } from 'lucide-react'
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
import { guardarOrdenRapidaB2BAction, verificarSkusEnBDAction, obtenerDatosProductosDeBDAction } from '@/modules/ordenes-b2b/actions'
import { detectProductAttributesFromText, inferEdadFromGeneroAndText, type DetectorCatalogos } from '@/modules/catalogo/utils/detector'


type ContainerMock = {
  id: number
  codigo_contenedor: string
  numero_contenedor: string | null
  estado: string | null
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
    proveedoresEjemplo: 'Jackie, Jacky, Venkat, Vencart, camisería multi-hoja',
    badgeColor: 'border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
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
    normalized.includes('jackie') ||
    normalized.includes('jacky') ||
    normalized.includes('venkat') ||
    normalized.includes('vencart')
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
    descripcion: toText(producto.descripcion),
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
    const colores = Array.from(
      new Set(detallesCaja.map((detalle: Record<string, any>) => detalle.color_raw).filter(Boolean)),
    ) as string[]
    const valores: Record<string, Record<string, number>> = {}

    for (const color of colores) {
      valores[color] = {}
      for (const talla of tallas) {
        const detalle = detallesCaja.find(
          (item: Record<string, any>) => item.color_raw === color && item.talla_codigo === talla,
        )
        valores[color][talla] = toNumber(detalle?.cantidad_por_caja)
      }
    }

    const cajaTallas = parsePipeDelimited(caja.tallas)
    const cajaColores = parsePipeDelimited(caja.colores)
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

  const resumen = data.orden_preview ?? data.resumen ?? {}
  const ordenProductosRaw = Array.isArray(resumen.orden_productos) ? resumen.orden_productos : []
  const ordenProductos: OrdenProductoResumen[] = ordenProductosRaw.map((op: Record<string, any>) => ({
    sku: String(op.sku ?? ''),
    nombre: toText(op.nombre),
    marca: toText(op.marca),
    cantidad_total: toNumber(op.cantidad_total),
    numero_cajas_reales: toNumber(op.numero_cajas_reales),
    cbm_total: toNumber(op.cbm_total),
    peso_bruto_total: toNumber(op.peso_bruto_total),
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
  return items.map((item, idx) => ({
    id: idx + 1,
    nombre: item,
    codigo: item,
  }))
}

function groupCajasByProduct(
  cajas: WizardCaja[],
  productos: WizardProducto[],
): Array<{ producto: WizardProducto; cajas: WizardCaja[] }> {
  const cajasPorSku = new Map<string, WizardCaja[]>()
  for (const caja of cajas) {
    const sku = caja.sku_base || '__sin_sku__'
    if (!cajasPorSku.has(sku)) cajasPorSku.set(sku, [])
    cajasPorSku.get(sku)!.push(caja)
  }

  const result: Array<{ producto: WizardProducto; cajas: WizardCaja[] }> = []
  for (const producto of productos) {
    const cajasDelProducto = cajasPorSku.get(producto.sku_base) || []
    if (cajasDelProducto.length > 0) {
      for (const caja of cajasDelProducto) {
        if (!caja.sku_base) caja.sku_base = producto.sku_base
      }
      result.push({ producto, cajas: cajasDelProducto })
      cajasPorSku.delete(producto.sku_base)
    }
  }

  for (const [sku, cajasRestantes] of cajasPorSku) {
    if (cajasRestantes.length > 0) {
      result.push({
        producto: {
          sku_base: sku,
          nombre: `SKU sin producto: ${sku}`,
          estado_temporal: 'sin_producto',
        },
        cajas: cajasRestantes,
      })
    }
  }

  return result
}

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
      [...contenedores].sort((a, b) => {
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const [dbSkusSet, setDbSkusSet] = useState<Set<string>>(new Set())
  const [isCheckingDbSkus, setIsCheckingDbSkus] = useState(false)
  const [isSyncingDbProducts, setIsSyncingDbProducts] = useState(false)

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
  const [isConfirmFinalModalOpen, setIsConfirmFinalModalOpen] = useState(false)

  const resetParsedState = () => {
    setParsedData(null)
    setRawN8nResponse(null)
    setDebugInfo(null)
    setWarnings([])
    setEditableProductos([])
    setEditableCajas([])
    setExpandedProducts(new Set())
    setDbSkusSet(new Set())
    setProgress(0)
    setProgressMsg('')
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
    verificarSkusEnBDAction([cleanSku], proveedorActual?.nombre_completo).then((res) => {
      if (res.success && res.skusExistentes.length > 0) {
        setDbSkusSet((prev) => new Set([...Array.from(prev), cleanSku.toUpperCase()]))
        if (res.skuMap && res.skuMap[cleanSku.toUpperCase()]) {
          const matchedDbSku = res.skuMap[cleanSku.toUpperCase()]
          setDbSkusSet((prev) => new Set([...Array.from(prev), matchedDbSku.toUpperCase()]))
          setEditableProductos((prev) =>
            prev.map((p) =>
              p.sku_base.toUpperCase() === cleanSku.toUpperCase()
                ? { ...p, sku_base: matchedDbSku, es_nuevo: false }
                : p,
            ),
          )
        }
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
      const res = await obtenerDatosProductosDeBDAction(skus)
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

              return {
                ...item,
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
          toast.success(`Se sincronizaron ${syncCount} productos directamente desde la base de datos.`)
        } else {
          toast.info('Ninguno de los SKUs de la lista tiene registro completo en la base de datos.')
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
    () => groupCajasByProduct(editableCajas, editableProductos),
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

  const handleCajaEdit = async (
    cajaIndex: number,
    data: {
      base: Partial<SharedCajaData>
      detalles: { talla_id: number; color_id: number; cantidad: number; talla_nombre?: string; color_nombre?: string }[]
    },
  ) => {
    setEditableCajas((prev) =>
      prev.map((caja, idx) => {
        if (idx !== cajaIndex) return caja

        const base = data.base
        const tallas = base.tallas ? base.tallas.split('|').filter(Boolean) : caja.tallas
        const colores = base.colores ? base.colores.split('|').filter(Boolean) : caja.colores

        const matriz = { ...caja.matriz }
        if (data.detalles.length > 0) {
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

            if (!newValores[colorStr]) {
              newValores[colorStr] = {}
            }
            newValores[colorStr][tallaStr] = det.cantidad
          }
          matriz.tallas = tallas
          matriz.colores = colores
          matriz.valores = newValores
        }

        const totalPiezasCalculadoMatriz = data.detalles.reduce((sum, d) => sum + (d.cantidad || 0), 0)

        return {
          ...caja,
          ...base,
          tallas,
          colores,
          matriz,
          piezas_por_caja: totalPiezasCalculadoMatriz > 0 ? totalPiezasCalculadoMatriz : (base.piezas_por_caja ?? caja.piezas_por_caja),
          cantidad_cajas: base.cantidad_cajas ?? caja.cantidad_cajas,
          cbm: base.cbm ?? caja.cbm,
          peso_bruto_kg: base.peso_bruto_kg ?? caja.peso_bruto_kg,
          peso_neto_kg: base.peso_neto ?? caja.peso_neto_kg,
          largo_cm: base.largo_cm ?? caja.largo_cm,
          ancho_cm: base.ancho_cm ?? caja.ancho_cm,
          alto_cm: base.alto_cm ?? caja.alto_cm,
          nombre_pack: base.nombre_pack ?? caja.nombre_pack,
          codigo_caja: base.codigo_caja ?? caja.codigo_caja,
        }
      }),
    )
    toast.success('Caja actualizada localmente.')
  }

  const handleCajaRemove = (cajaIndex: number) => {
    setEditableCajas((prev) => prev.filter((_, idx) => idx !== cajaIndex))
    toast.success('Caja eliminada de la vista.')
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
      console.group('OrdenRapida n8n debug')
      console.log('Fetch result completo:', result)
      console.log('result.data crudo:', result.data)
      console.log('payload desenvuelto:', payload)
      console.log('debugInfo:', nextDebugInfo)
      console.groupEnd()
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

      // Auto-detección inicial de atributos a partir del texto de cada producto
      const enrichedProductos = deduplicatedProductos.map((p) => {
        const text = `${p.sku_base || ''} ${p.descripcion || p.nombre || ''}`.trim()
        const detected = detectProductAttributesFromText(text, { marcas, generos, edades, tipos_prenda })
        const matchedBrand = marcas.find(
          (m) =>
            (p.marca_id && m.id === p.marca_id) ||
            (p.marca && m.nombre.toUpperCase() === p.marca.toUpperCase()),
        )
        return {
          ...p,
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

      setWarnings(wizardData.warnings)
      setParsedData({ ...wizardData, productos: enrichedProductos })
      setEditableProductos(structuredClone(enrichedProductos))
      setEditableCajas(structuredClone(wizardData.cajas))

      // Verificar existencia de SKUs en Supabase DB para resaltado verde
      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
      const skusToCheck = enrichedProductos.map(p => p.sku_base)
      if (skusToCheck.length > 0) {
        setIsCheckingDbSkus(true)
        verificarSkusEnBDAction(skusToCheck, proveedorActual?.nombre_completo).then((res) => {
          if (res.success && res.skusExistentes) {
            const allMatched = new Set(res.skusExistentes.map(s => s.toUpperCase()))
            if (res.skuMap) {
              Object.values(res.skuMap).forEach(s => allMatched.add(s.toUpperCase()))
            }
            setDbSkusSet(allMatched)

            if (res.skuMap && Object.keys(res.skuMap).length > 0) {
              const skuMap = res.skuMap
              setEditableProductos(prev =>
                prev.map(p => {
                  const matchedDbSku = skuMap[p.sku_base.toUpperCase()]
                  if (matchedDbSku && matchedDbSku !== p.sku_base) {
                    return { ...p, sku_base: matchedDbSku, sku_raw: p.sku_raw || p.sku_base, es_nuevo: false }
                  }
                  if (matchedDbSku) {
                    return { ...p, es_nuevo: false }
                  }
                  return p
                })
              )
              setEditableCajas(prev =>
                prev.map(c => {
                  const matchedDbSku = c.sku_base ? skuMap[c.sku_base.toUpperCase()] : null
                  if (matchedDbSku && matchedDbSku !== c.sku_base) {
                    return { ...c, sku_base: matchedDbSku, sku_raw: c.sku_raw || c.sku_base }
                  }
                  return c
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

  const handleConfirmReview = () => {
    startTransition(async () => {
      try {
        if (!selectedProveedor || !selectedCliente) {
          toast.error('Faltan socios comerciales.')
          return
        }

        const res = await guardarOrdenRapidaB2BAction({
          proveedorId: Number(selectedProveedor),
          clienteB2bId: Number(selectedCliente),
          contenedorId: selectedContenedor === 'new' ? null : Number(selectedContenedor),
          newContainerCode: selectedContenedor === 'new' ? newContainerCode : null,
          productos: editableProductos,
          cajas: editableCajas,
          detalles: parsedData?.detalles || [],
        })

        if (!res.success) {
          toast.error(res.error || 'Error al guardar la orden.')
          return
        }

        toast.success('Orden guardada exitosamente en Supabase.')
        setStep(5)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al guardar la orden.')
      }
    })
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
                    <Select value={selectedContenedor} onValueChange={(value) => setSelectedContenedor(value || '')}>
                      <SelectTrigger id="contenedor-sel" className="h-9">
                        <SelectValue placeholder="Selecciona el contenedor...">
                          {selectedContenedor === 'new'
                            ? '+ Crear nuevo contenedor'
                            : selectedContenedorObj
                              ? `${selectedContenedorObj.codigo_contenedor} (${selectedContenedorObj.numero_contenedor ?? 'S/N'}) - ${selectedContenedorObj.estado}`
                              : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Crear nuevo contenedor</SelectItem>
                        {sortedContenedores.map((contenedor) => (
                          <SelectItem key={contenedor.id} value={String(contenedor.id)}>
                            {contenedor.codigo_contenedor} ({contenedor.numero_contenedor ?? 'S/N'}) - {contenedor.estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedContenedor === 'new' ? (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="nuevo-cont-cod" className="text-xs">Codigo de identificacion del contenedor</Label>
                      <Input
                        id="nuevo-cont-cod"
                        placeholder="Ej. CONT-K24-MX01"
                        value={newContainerCode}
                        onChange={(event) => setNewContainerCode(event.target.value)}
                        className="h-9 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded border bg-muted/40 p-3 text-xs text-muted-foreground md:col-span-2">
                      <Info className="h-4 w-4 shrink-0 text-primary" />
                      <span>La revision quedara asociada al contenedor seleccionado cuando se implemente la fase de guardado.</span>
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
                        const dbMatch = dbSkusSet.has(producto.sku_base.trim().toUpperCase())
                        const isForcedNew = Boolean(producto.force_new)
                        const isMatch = dbMatch && !isForcedNew

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
                            key={`${producto.sku_base}-${index}`}
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
                                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                                    <CheckCircle2 className="h-3 w-3" /> En Catálogo BD
                                  </Badge>
                                ) : isForcedNew ? (
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] gap-1 shadow-sm">
                                    <Sparkles className="h-3 w-3" /> Nuevo (Forzado)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 font-bold text-[10px]">
                                    Nuevo / No registrado
                                  </Badge>
                                )}

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
                              {(!isMatch || isForcedNew) ? (
                                <Textarea
                                  rows={2}
                                  value={producto.sku_base}
                                  onChange={(e) => {
                                    const newSkuVal = e.target.value
                                    setEditableProductos((prev) =>
                                      prev.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, sku_base: newSkuVal } : item
                                      )
                                    )
                                  }}
                                  placeholder="SKU Base..."
                                  className="min-h-[52px] w-full min-w-[130px] font-mono text-xs font-bold bg-background/80 resize-none py-1.5 leading-snug"
                                />
                              ) : (
                                <span className="text-foreground block break-words">{producto.sku_base}</span>
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
                        onClick={() => {
                          const val = window.prompt("Ingresa el total de Productos de la Nota:", String(overrideProductos ?? parsedData?.orden.total_productos ?? cajasAgrupadas.length))
                          if (val !== null) {
                            const parsed = parseInt(val, 10)
                            setOverrideProductos(isNaN(parsed) ? null : parsed)
                          }
                        }}
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
                        onClick={() => {
                          const val = window.prompt("Ingresa el total de Cajas de la Nota:", String(overrideCajas ?? parsedData?.orden.total_cajas ?? totalCajasCount))
                          if (val !== null) {
                            const parsed = parseInt(val, 10)
                            setOverrideCajas(isNaN(parsed) ? null : parsed)
                          }
                        }}
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
                        onClick={() => {
                          const val = window.prompt("Ingresa el total de Piezas de la Nota:", String(overridePiezas ?? parsedData?.orden.total_piezas ?? totalPiezasCount))
                          if (val !== null) {
                            const parsed = parseInt(val, 10)
                            setOverridePiezas(isNaN(parsed) ? null : parsed)
                          }
                        }}
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
                        onClick={() => {
                          const val = window.prompt("Ingresa el CBM Total de la Nota:", String(overrideCbm ?? parsedData?.orden.cbm_estimado ?? totalCbm.toFixed(3)))
                          if (val !== null) {
                            const parsed = parseFloat(val)
                            setOverrideCbm(isNaN(parsed) ? null : parsed)
                          }
                        }}
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
                        onClick={() => {
                          const targetVal = overridePesoNeto ?? (parsedData?.orden as any)?.peso_neto_total_kg ?? (parsedData?.orden as any)?.peso_neto_estimado ?? totalPesoNeto.toFixed(1)
                          const val = window.prompt("Ingresa el Peso Neto Total (kg) de la Nota:", String(targetVal))
                          if (val !== null) {
                            const parsed = parseFloat(val)
                            setOverridePesoNeto(isNaN(parsed) ? null : parsed)
                          }
                        }}
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
                        onClick={() => {
                          const val = window.prompt("Ingresa el Peso Bruto Total (kg) de la Nota:", String(overridePeso ?? parsedData?.orden.peso_bruto_total_kg ?? totalPesoBruto.toFixed(1)))
                          if (val !== null) {
                            const parsed = parseFloat(val)
                            setOverridePeso(isNaN(parsed) ? null : parsed)
                          }
                        }}
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
                      <div key={producto.sku_base} className="rounded-lg border border-border/80 overflow-hidden">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleProduct(producto.sku_base || '__sin_sku__')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleProduct(producto.sku_base || '__sin_sku__')
                            }
                          }}
                          className="flex w-full items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer select-none"
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
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {producto.descripcion || producto.nombre || 'Sin descripcion'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-muted-foreground flex-wrap">
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
                              {cajasReales.map((caja) => {
                                const cajaIndex = editableCajas.indexOf(caja)
                                const sharedCaja = wizardCajaToSharedCajaData(caja, cajaIndex)
                                const tallasCatalogo = buildCatalogoItemsFromStrings(cpTallas.length > 0 ? cpTallas : (caja.matriz?.tallas || caja.tallas || []))
                                const coloresCatalogo = buildCatalogoItemsFromStrings(cpColores.length > 0 ? cpColores : (caja.matriz?.colores || caja.colores || []))

                                return (
                                  <CajaCard
                                    key={caja.codigo_caja_temporal || caja.codigo_caja}
                                    caja={sharedCaja}
                                    layout="horizontal"
                                    canEdit={true}
                                    canDelete={true}
                                    canEditOrden={true}
                                    tallasDisponibles={tallasCatalogo}
                                    coloresDisponibles={coloresCatalogo}
                                    onEdit={async (id, data) => handleCajaEdit(cajaIndex, data)}
                                    onRemove={() => handleCajaRemove(cajaIndex)}
                                    isPending={false}
                                  />
                                )
                              })}
                            </div>

                            {cajasReales.length === 0 && (
                              <p className="text-xs text-muted-foreground italic text-center py-4">
                                No hay cajas reales (CC/CR) para este producto.
                              </p>
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
                      ? `${newContainerCode} (Nuevo contenedor)`
                      : contenedores.find((item) => String(item.id) === selectedContenedor)?.codigo_contenedor}
                  </p>
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
                <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-4">
                  <p className="mb-2 text-sm font-semibold text-yellow-900">Warnings del sistema</p>
                  <div className="space-y-1">
                    {warnings.map((warning, index) => (
                      <p key={`summary-warning-${index}`} className="text-xs text-yellow-900">
                        {warning.mensaje ?? warning.detalle ?? 'n8n devolvio una advertencia sin detalle.'}
                      </p>
                    ))}
                  </div>
                </div>
              )}
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
                <h2 className="text-xl font-bold text-foreground">Revision completada</h2>
                <p className="text-sm text-muted-foreground">
                  El Packing List ya fue procesado por n8n y la revision visual quedo lista. El guardado definitivo en Supabase se implementara en la siguiente fase.
                </p>
              </div>

              <div className="mx-auto flex max-w-sm flex-col justify-center gap-3 pt-4 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-10 w-full gap-1.5"
                  onClick={() => router.push(ADMIN_ROUTES.ordenesB2B.lista)}
                >
                  Ir a Ordenes B2B <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  className="h-10 w-full gap-1.5"
                  onClick={() => router.push(ADMIN_ROUTES.contenedores.lista)}
                >
                  Ir a Contenedores <ExternalLink className="h-4 w-4" />
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
              <div className="space-y-3 text-xs text-muted-foreground pt-2">
                <p>
                  Se encontraron diferencias entre la cantidad total de piezas del producto y el total físico desglosado en las cajas:
                </p>
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
                <p className="text-[11px] italic">
                  ¿Deseas regresar a revisar los datos o continuar a la sección de cajas de todos modos?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
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

      {/* Modal 4: Corroborar Proveedor y Confirmación Definitiva de la Orden B2B */}
      <Dialog open={isConfirmFinalModalOpen} onOpenChange={setIsConfirmFinalModalOpen}>
        <DialogContent className="w-[98vw] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Corroborar Proveedor y Guardar Orden B2B
            </DialogTitle>
            <DialogDescription className="text-xs">
              Antes de registrar la orden en Supabase, corrobora la asignación de socios comerciales para los productos, cajas y orden de compra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
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
                    ? `${newContainerCode} (Nuevo)`
                    : (selectedContenedorObj?.codigo_contenedor ?? 'Sin asignar')}
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

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
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
              disabled={isPending || !selectedProveedor || !selectedCliente}
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

