// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ordenes-b2b\orden-rapida\OrdenRapidaWizard.tsx
'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, ChevronDown, ChevronRight, Database, FileSpreadsheet, FileUp, Info, Loader2, Package, Scale, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { PersonaRow } from '@/lib/types/tables'
import type { SharedCajaData } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import { guardarOrdenRapidaB2BAction } from '@/modules/ordenes-b2b/actions'

type ContainerMock = {
  id: number
  codigo_contenedor: string
  numero_contenedor: string | null
  estado: string | null
}

type WizardProps = {
  proveedores: PersonaRow[]
  clientes: PersonaRow[]
  contenedores: ContainerMock[]
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
  descripcion?: string
  composicion?: string
  precio_yuan?: number
  precio_unitario_usd?: number
  estado_temporal?: string
  tipo_prenda?: string
  es_nuevo?: boolean
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

function resolverParserSelector(proveedorNombre: string) {
  const normalized = proveedorNombre.toLowerCase()

  if (normalized.includes('moti')) return 'MOTI bloques'

  if (
    normalized.includes('jackie') ||
    normalized.includes('jacky') ||
    normalized.includes('venkat') ||
    normalized.includes('vencart')
  ) {
    return 'Jackie/Venkat multi-hoja'
  }

  if (normalized.includes('tianyi')) return 'Tianyi resumen'

  return 'Auto'
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

function ComparisonBadge({ calculated, json, label }: { calculated: number; json: number; label?: string }) {
  if (!json) return null
  const diff = json !== 0 ? Math.abs(calculated - json) / Math.abs(json) : 0
  const match = diff < 0.001
  const minor = diff <= 0.01
  const color = match ? 'text-emerald-600' : minor ? 'text-yellow-600' : 'text-red-600'
  return (
    <span className={`text-[9px] font-normal ${color}`} title={`${label ?? ''} JSON: ${json.toLocaleString(undefined, { maximumFractionDigits: 3 })} | Calculado: ${calculated.toLocaleString(undefined, { maximumFractionDigits: 3 })}`}>
      ({json.toLocaleString(undefined, { maximumFractionDigits: 3 })})
    </span>
  )
}

export function OrdenRapidaWizard({ proveedores, clientes, contenedores }: WizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()

  const [selectedProveedor, setSelectedProveedor] = useState('')
  const [selectedCliente, setSelectedCliente] = useState('')
  const [selectedContenedor, setSelectedContenedor] = useState('new')
  const [newContainerCode, setNewContainerCode] = useState('')

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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const resetParsedState = () => {
    setParsedData(null)
    setRawN8nResponse(null)
    setDebugInfo(null)
    setWarnings([])
    setEditableProductos([])
    setEditableCajas([])
    setExpandedProducts(new Set())
    setProgress(0)
    setProgressMsg('')
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
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.peso_bruto_total_kg || c.peso_bruto_kg * (c.cantidad_cajas || 1)), 0),
    [cajasRealesMemo],
  )

  const jsonTotalesPorSku = useMemo(() => {
    const map = new Map<string, { piezas: number; cajas: number; cbm: number; peso: number }>()
    if (parsedData?.orden.orden_productos) {
      for (const op of parsedData.orden.orden_productos) {
        map.set(op.sku, {
          piezas: op.cantidad_total,
          cajas: op.numero_cajas_reales,
          cbm: op.cbm_total,
          peso: op.peso_bruto_total,
        })
      }
    }
    return map
  }, [parsedData])

  const handleCajaEdit = async (cajaIndex: number, data: { base: Partial<SharedCajaData>; detalles: { talla_id: number; color_id: number; cantidad: number }[] }) => {
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
            const tallaStr = tallas.find((t) => t === String(det.talla_id)) || String(det.talla_id)
            const colorStr = colores.find((c) => c === String(det.color_id)) || String(det.color_id)
            if (newValores[colorStr]) newValores[colorStr][tallaStr] = det.cantidad
          }
          matriz.tallas = tallas
          matriz.colores = colores
          matriz.valores = newValores
        }

        return {
          ...caja,
          ...base,
          tallas,
          colores,
          matriz,
          piezas_por_caja: base.piezas_por_caja ?? caja.piezas_por_caja,
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
        resolverParserSelector(proveedor.nombre_completo ?? ''),
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

      setWarnings(wizardData.warnings)
      setParsedData(wizardData)
      setEditableProductos(structuredClone(wizardData.productos))
      setEditableCajas(structuredClone(wizardData.cajas))
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
      setStep(4)
      return
    }

    if (step === 4) {
      handleConfirmReview()
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
                  <Select value={selectedProveedor} onValueChange={(value) => setSelectedProveedor(value || '')}>
                    <SelectTrigger id="proveedor" className="h-10">
                      <SelectValue placeholder="Selecciona el proveedor extranjero..." />
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
                      <SelectValue placeholder="Selecciona el comprador..." />
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
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Crear nuevo contenedor</SelectItem>
                        {contenedores.map((contenedor) => (
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
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">3. Productos detectados</h2>
                </div>
                {warnings.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-md border border-yellow-200/50 bg-yellow-100/50 px-3 py-1 text-xs text-yellow-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>La revision puede continuar aunque existan warnings.</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-1 text-sm font-semibold">
                  <Package className="h-4 w-4 text-primary" /> Revision local de SKUs y descripciones
                </h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left font-semibold text-muted-foreground">
                        <th className="p-3">SKU base</th>
                        <th className="p-3">Descripcion</th>
                        <th className="p-3">Marca</th>
                        <th className="p-3">Composicion</th>
                        <th className="p-3">Precio yuan</th>
                        <th className="p-3">Precio USD</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {editableProductos.map((producto, index) => (
                        <tr key={`${producto.sku_base}-${index}`} className="transition-colors hover:bg-accent/30">
                          <td className="p-3 font-mono text-xs font-bold">{producto.sku_base}</td>
                          <td className="p-3 font-medium">
                            <Input
                              value={producto.descripcion ?? ''}
                              onChange={(event) => {
                                const value = event.target.value
                                setEditableProductos((prev) =>
                                  prev.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, descripcion: value } : item,
                                  ),
                                )
                              }}
                              className="h-8 max-w-sm text-xs"
                            />
                          </td>
                          <td className="p-3 text-xs">{producto.marca || 'Sin marca'}</td>
                          <td className="p-3 text-xs">{producto.composicion || 'Sin composicion'}</td>
                          <td className="p-3 font-mono text-xs">{toNumber(producto.precio_yuan).toFixed(2)}</td>
                          <td className="p-3 font-mono text-xs">{toNumber(producto.precio_unitario_usd).toFixed(2)} USD</td>
                          <td className="p-3">
                            <Badge variant="outline" className="font-bold">
                              {producto.estado_temporal ?? (producto.es_nuevo ? 'pendiente_revision' : 'detectado')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
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

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Productos</span>
                    <p className="mt-1 text-2xl font-black tracking-tight">{cajasAgrupadas.length}</p>
                    {parsedData?.orden.total_productos ? (
                      <ComparisonBadge calculated={cajasAgrupadas.length} json={parsedData.orden.total_productos} label="Productos" />
                    ) : null}
                  </CardContent>
                </Card>
                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cajas</span>
                    <p className="mt-1 text-2xl font-black tracking-tight">{totalCajasCount}</p>
                    {parsedData?.orden.total_cajas ? (
                      <ComparisonBadge calculated={totalCajasCount} json={parsedData.orden.total_cajas} label="Cajas" />
                    ) : null}
                  </CardContent>
                </Card>
                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Piezas</span>
                    <p className="mt-1 text-2xl font-black tracking-tight text-primary">{totalPiezasCount.toLocaleString()}</p>
                    {parsedData?.orden.total_piezas ? (
                      <ComparisonBadge calculated={totalPiezasCount} json={parsedData.orden.total_piezas} label="Piezas" />
                    ) : null}
                  </CardContent>
                </Card>
                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CBM total</span>
                    <p className="mt-1 text-2xl font-black tracking-tight italic">{totalCbm.toFixed(3)}</p>
                    {parsedData?.orden.cbm_estimado ? (
                      <ComparisonBadge calculated={totalCbm} json={parsedData.orden.cbm_estimado} label="CBM" />
                    ) : null}
                  </CardContent>
                </Card>
                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="flex flex-col gap-1 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peso bruto</span>
                    <p className="mt-1 text-2xl font-black tracking-tight">{totalPesoBruto.toFixed(1)} kg</p>
                    {parsedData?.orden.peso_bruto_total_kg ? (
                      <ComparisonBadge calculated={totalPesoBruto} json={parsedData.orden.peso_bruto_total_kg} label="Peso" />
                    ) : null}
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
                    const grupoPesoBruto = cajasReales.reduce((s, c) => s + (c.peso_bruto_total_kg || c.peso_bruto_kg * (c.cantidad_cajas || 1)), 0)
                    const jsonSku = jsonTotalesPorSku.get(producto.sku_base)

                    return (
                      <div key={producto.sku_base} className="rounded-lg border border-border/80 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleProduct(producto.sku_base || '__sin_sku__')}
                          className="flex w-full items-center justify-between gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
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
                          <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-muted-foreground">
                            <span>{cajasReales.length} {cajasReales.length === 1 ? 'caja' : 'cajas'}</span>
                            <span>{grupoCajas} und</span>
                            <span className="flex items-center gap-1">
                              {grupoPiezas.toLocaleString()} pz
                              {jsonSku && <ComparisonBadge calculated={grupoPiezas} json={jsonSku.piezas} label="Piezas" />}
                            </span>
                            <span className="flex items-center gap-1">
                              {grupoCbm.toFixed(3)} m3
                              {jsonSku && <ComparisonBadge calculated={grupoCbm} json={jsonSku.cbm} label="CBM" />}
                            </span>
                            <span className="flex items-center gap-1">
                              {grupoPesoBruto.toFixed(1)} kg
                              {jsonSku && <ComparisonBadge calculated={grupoPesoBruto} json={jsonSku.peso} label="Peso" />}
                            </span>
                          </div>
                        </button>

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

              {warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-4">
                  <p className="mb-2 text-sm font-semibold text-yellow-900">Warnings</p>
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
    </div>
  )
}
