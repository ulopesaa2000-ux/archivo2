// app/(admin)/ordenes-b2b/cajas/components/ImportCajasModal.tsx
'use client'

import { Fragment, useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ColorCombobox } from '@/components/admin/cajas/ColorCombobox'
import type {
  ExcelCajaRow,
  ExcelDetalleRow,
  ImportCajaItem,
  ImportCajasBatchResult,
} from '@/modules/ordenes-b2b/import/actions'
import {
  validateCajasBeforeImportAction,
  importCajasBatchAction,
} from '@/modules/ordenes-b2b/import/actions'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function toPlainData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const TALLAS_GUIA_FALLBACK = [
  { id: 1, codigo: '0', categoria: 'ADULTO', nombre: 'CERO', talla_us: '0' },
  { id: 2, codigo: 'ECH', categoria: 'ADULTO', nombre: 'EXTRA CHICA', talla_us: 'XS' },
  { id: 3, codigo: 'CH', categoria: 'ADULTO', nombre: 'CHICA', talla_us: 'S' },
  { id: 4, codigo: 'M', categoria: 'ADULTO', nombre: 'MEDIANA', talla_us: 'M' },
  { id: 5, codigo: 'G', categoria: 'ADULTO', nombre: 'GRANDE', talla_us: 'L' },
  { id: 6, codigo: 'EG', categoria: 'ADULTO', nombre: 'EXTRA GRANDE', talla_us: 'XL' },
  { id: 7, codigo: '2EG', categoria: 'ADULTO', nombre: '2X EXTRA GRANDE', talla_us: '2XL' },
  { id: 8, codigo: '3EG', categoria: 'ADULTO', nombre: '3X EXTRA GRANDE', talla_us: '3XL' },
  { id: 9, codigo: '4EG', categoria: 'ADULTO', nombre: '4X EXTRA GRANDE', talla_us: '4XL' },
  { id: 10, codigo: '5EG', categoria: 'ADULTO', nombre: '5X EXTRA GRANDE', talla_us: '5XL' },
  { id: 11, codigo: '2', categoria: 'INFANTIL', nombre: 'TALLA 2', talla_us: '2' },
  { id: 13, codigo: '4', categoria: 'INFANTIL', nombre: 'TALLA 4', talla_us: '4' },
  { id: 15, codigo: '6', categoria: 'INFANTIL', nombre: 'TALLA 6', talla_us: '6' },
  { id: 16, codigo: '8', categoria: 'INFANTIL', nombre: 'TALLA 8', talla_us: '8' },
  { id: 17, codigo: '10', categoria: 'INFANTIL', nombre: 'TALLA 10', talla_us: '10' },
  { id: 18, codigo: '12', categoria: 'INFANTIL', nombre: 'TALLA 12', talla_us: '12' },
  { id: 19, codigo: '14', categoria: 'INFANTIL', nombre: 'TALLA 14', talla_us: '14' },
  { id: 20, codigo: '16', categoria: 'INFANTIL', nombre: 'TALLA 16', talla_us: '16' },
  { id: 21, codigo: 'UNITALLA', categoria: 'ADULTO', nombre: 'UNITALLA', talla_us: 'One size' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogoCajas?: {
    tallas: { id: number; codigo: string; nombre: string; categoria: string; talla_us?: string | null }[]
    colores: { id: number; nombre: string; codigo?: string | null; hex_code?: string | null }[]
  }
}

type Step = 1 | 2 | 3 | 4
type MatchTallasPor = 'codigo' | 'talla_us'

export function ImportCajasModal({ open, onOpenChange, catalogoCajas }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [isPending, startTransition] = useState(false)
  const [items, setItems] = useState<ImportCajaItem[]>([])
  const [matchTallasPor, setMatchTallasPor] = useState<MatchTallasPor>('codigo')
  const [lastCajasRows, setLastCajasRows] = useState<ExcelCajaRow[]>([])
  const [lastDetallesRows, setLastDetallesRows] = useState<ExcelDetalleRow[]>([])
  const [coloresLocales, setColoresLocales] = useState(catalogoCajas?.colores ?? [])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportCajasBatchResult | null>(null)
  const [expandedBoxId, setExpandedBoxId] = useState<number | null>(null)
  const tallasGuia = catalogoCajas?.tallas?.length ? catalogoCajas.tallas : TALLAS_GUIA_FALLBACK
  const coloresGuia = coloresLocales.length ? coloresLocales : (catalogoCajas?.colores ?? [])
  const colorOptions = coloresGuia.map(c => ({ id: c.id, nombre: c.nombre, codigo: c.codigo ?? undefined }))

  const revalidateCurrentRows = async (mode: MatchTallasPor) => {
    if (lastCajasRows.length === 0) return
    startTransition(true)
    try {
      const validationResult = await validateCajasBeforeImportAction(
        toPlainData(lastCajasRows),
        toPlainData(lastDetallesRows),
        mode
      )
      setItems(validationResult.items)
      setExpandedBoxId(null)
    } finally {
      startTransition(false)
    }
  }

  const validateDetalleClient = (detalle: ImportCajaItem['detalles'][number]) => {
    const errors: string[] = []
    if (detalle.resolvedData.cantidad <= 0) {
      errors.push('La cantidad debe ser mayor a 0')
    }
    if (!detalle.resolvedData.talla_id || !detalle.resolvedData.color_id) {
      errors.push('Debe seleccionar talla y color para importar este detalle')
    }
    return {
      ...detalle,
      status: errors.length > 0 ? 'error' as const : 'valido' as const,
      errors,
    }
  }

  const refreshItemStatus = (item: ImportCajaItem): ImportCajaItem => {
    const detailHasErrors = item.detalles.some(d => d.status === 'error')
    const ownErrors = item.errors.filter(e => e !== 'Uno o mÃ¡s detalles de la caja contienen errores')
    const errors = detailHasErrors
      ? [...ownErrors, 'Uno o mÃ¡s detalles de la caja contienen errores']
      : ownErrors

    return {
      ...item,
      errors,
      status: errors.length > 0 ? 'error' : item.existingId ? 'duplicado' : 'nuevo',
    }
  }

  const updateDetalleTalla = (itemIndex: number, detalleIndex: number, tallaId: string) => {
    const talla = tallasGuia.find(t => t.id === Number(tallaId))
    if (!talla) return
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      const detalles = item.detalles.map((detalle, dIdx) => {
        if (dIdx !== detalleIndex) return detalle
        return validateDetalleClient({
          ...detalle,
          data: {
            ...detalle.data,
            variante_sku: '',
            talla_codigo: matchTallasPor === 'talla_us' ? (talla.talla_us ?? talla.codigo) : talla.codigo,
          },
          resolvedData: { ...detalle.resolvedData, variante_id: null, talla_id: talla.id },
        })
      })
      return refreshItemStatus({ ...item, detalles })
    }))
  }

  const updateDetalleColor = (itemIndex: number, detalleIndex: number, colorId: string) => {
    const color = coloresGuia.find(c => c.id === Number(colorId))
    if (!color) return
    setItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      const detalles = item.detalles.map((detalle, dIdx) => {
        if (dIdx !== detalleIndex) return detalle
        return validateDetalleClient({
          ...detalle,
          data: { ...detalle.data, variante_sku: '', color_nombre: color.nombre },
          resolvedData: { ...detalle.resolvedData, variante_id: null, color_id: color.id },
        })
      })
      return refreshItemStatus({ ...item, detalles })
    }))
  }

  // ── Reset ──────────────────────────────────────────────────────────

  const reset = () => {
    setStep(1)
    setItems([])
    setParseError(null)
    setResult(null)
    setExpandedBoxId(null)
    setLastCajasRows([])
    setLastDetallesRows([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  // ── Descargar Plantilla Excel de Dos Hojas ─────────────────────────

  const downloadTemplate = () => {
    // Hoja 1: Cajas de Producto
    const cajasData = [
      {
        codigo_caja: 'CJ-K24-AZUL',
        nombre_pack: 'Pack Azul S-M-L 12 pzs',
        producto_sku: 'K24',
        proveedor_nombre: 'Proveedor Oficial S.A.',
        piezas_por_caja: 12,
        tallas: 'CH, M, G',
        colores: 'Azul',
        costo_total_caja: 180.50,
        peso_bruto_kg: 14.50,
        largo_cm: 50,
        ancho_cm: 40,
        alto_cm: 30,
        cbm: '', // Vacío para auto-calcular
        es_principal: 'NO',
        activo: 'SI',
      },
      {
        codigo_caja: 'CJ-M15-NEGRO',
        nombre_pack: 'Pack Negro M-L-XL 15 pzs',
        producto_sku: 'M15',
        proveedor_nombre: 'Proveedor Oficial S.A.',
        piezas_por_caja: 15,
        tallas: 'M, G, EG',
        colores: 'Negro',
        costo_total_caja: 220.00,
        peso_bruto_kg: 18.00,
        largo_cm: 60,
        ancho_cm: 45,
        alto_cm: 35,
        cbm: 0.095, // O especificado manualmente
        es_principal: 'SI',
        activo: 'SI',
      }
    ]

    // Hoja 2: Detalles (Desglose de piezas)
    const detallesData = [
      {
        codigo_caja: 'CJ-K24-AZUL',
        variante_sku: 'K24-S-AZU', // Opcional si se especifica talla_codigo y color_nombre
        talla_codigo: 'CH',
        color_nombre: 'Azul',
        cantidad: 4,
      },
      {
        codigo_caja: 'CJ-K24-AZUL',
        variante_sku: 'K24-M-AZU',
        talla_codigo: 'M',
        color_nombre: 'Azul',
        cantidad: 4,
      },
      {
        codigo_caja: 'CJ-K24-AZUL',
        variante_sku: 'K24-L-AZU',
        talla_codigo: 'G',
        color_nombre: 'Azul',
        cantidad: 4,
      },
      {
        codigo_caja: 'CJ-M15-NEGRO',
        variante_sku: 'M15-M-NEG',
        talla_codigo: 'M',
        color_nombre: 'Negro',
        cantidad: 5,
      },
      {
        codigo_caja: 'CJ-M15-NEGRO',
        variante_sku: 'M15-L-NEG',
        talla_codigo: 'G',
        color_nombre: 'Negro',
        cantidad: 5,
      },
      {
        codigo_caja: 'CJ-M15-NEGRO',
        variante_sku: 'M15-XL-NEG',
        talla_codigo: 'EG',
        color_nombre: 'Negro',
        cantidad: 5,
      }
    ]

    const instruccionesData = [
      { campo: 'talla_codigo', uso: 'Usa codigo de cat_tallas por defecto: CH, M, G, EG, 2EG. Si tu Excel viene en talla_us, selecciona talla_us antes de subir.' },
      { campo: 'color_nombre', uso: 'Puede ser nombre, id o codigo de cat_colores. Si no coincide, lo corriges en la revision antes de importar.' },
      { campo: 'variante_sku', uso: 'Opcional. Si falla el SKU de variante, puedes resolver la fila manualmente con talla y color.' },
    ]

    const tallasData = tallasGuia.map(t => ({
      id: t.id,
      codigo: t.codigo,
      categoria: t.categoria,
      nombre: t.nombre,
      talla_us: t.talla_us ?? '',
    }))

    const coloresData = coloresGuia.map(c => ({
      id: c.id,
      codigo: c.codigo ?? '',
      nombre: c.nombre,
    }))

    const wb = XLSX.utils.book_new()
    const wsCajas = XLSX.utils.json_to_sheet(cajasData)
    const wsDetalles = XLSX.utils.json_to_sheet(detallesData)
    const wsInstrucciones = XLSX.utils.json_to_sheet(instruccionesData)
    const wsTallas = XLSX.utils.json_to_sheet(tallasData)
    const wsColores = XLSX.utils.json_to_sheet(coloresData)

    XLSX.utils.book_append_sheet(wb, wsCajas, 'Cajas')
    XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalles')
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Guia')
    XLSX.utils.book_append_sheet(wb, wsTallas, 'Tallas')
    XLSX.utils.book_append_sheet(wb, wsColores, 'Colores')

    XLSX.writeFile(wb, 'plantilla_cajas_y_detalles.xlsx')
  }

  // ── Parsear Archivo Excel ──────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setParseError(null)

      if (file.size > MAX_FILE_SIZE) {
        setParseError('El archivo es demasiado grande. Máximo 5 MB')
        return
      }

      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const ab = evt.target?.result
          if (!ab) throw new Error('No se pudo leer el archivo')

          const workbook = XLSX.read(ab, { type: 'array' })

          // Leer Hoja 1: Cajas
          const sheetCajasName = workbook.SheetNames.find(n => n.toLowerCase() === 'cajas') || workbook.SheetNames[0]
          const sheetCajas = workbook.Sheets[sheetCajasName]
          const cajasRows = toPlainData(XLSX.utils.sheet_to_json<ExcelCajaRow>(sheetCajas))

          if (cajasRows.length === 0) {
            throw new Error('La pestaña "Cajas" está vacía o falta')
          }

          // Validar existencia de codigo_caja y producto_sku en cabecera
          const validCajasRows = cajasRows.filter(r => r.codigo_caja && String(r.codigo_caja).trim())
          if (validCajasRows.length === 0) {
            throw new Error('No se encontraron filas con "codigo_caja" en la pestaña "Cajas"')
          }

          // Leer Hoja 2: Detalles
          const sheetDetallesName = workbook.SheetNames.find(n => n.toLowerCase() === 'detalles') || workbook.SheetNames[1]
          const sheetDetalles = sheetDetallesName ? workbook.Sheets[sheetDetallesName] : null
          const detallesRows = sheetDetalles
            ? toPlainData(XLSX.utils.sheet_to_json<ExcelDetalleRow>(sheetDetalles))
            : []

          const safeCajasRows = toPlainData(validCajasRows)
          const safeDetallesRows = toPlainData(detallesRows)

          setLastCajasRows(safeCajasRows)
          setLastDetallesRows(safeDetallesRows)
          startTransition(true)
          const validationResult = await validateCajasBeforeImportAction(
            safeCajasRows,
            safeDetallesRows,
            matchTallasPor
          )

          setItems(validationResult.items)
          setStep(2)
        } catch (err: any) {
          setParseError(err.message || 'Error parseando el archivo Excel')
        } finally {
          startTransition(false)
        }
      }
      reader.onerror = () => setParseError('Error leyendo el archivo')
      reader.readAsArrayBuffer(file)
    },
    [matchTallasPor]
  )

  // ── Modificar Acciones de las filas ─────────────────────────────────

  const toggleRowAction = (index: number, action: 'crear' | 'omitir' | 'actualizar') => {
    setItems(prev =>
      prev.map((it, i) =>
        i === index
          ? { ...it, action }
          : it
      )
    )
  }

  const toggleSelectAllDuplicados = () => {
    const todosOmitidos = duplicados.every(d => d.action === 'omitir')
    setItems(prev =>
      prev.map(it => ({
        ...it,
        action:
          it.status === 'duplicado'
            ? todosOmitidos ? 'actualizar' : 'omitir'
            : it.action,
      }))
    )
  }

  // ── Ejecutar la Importación Batch ───────────────────────────────────

  const handleImport = async () => {
    startTransition(true)
    try {
      const res = await importCajasBatchAction(toPlainData(items))
      setResult(res)
      setStep(4)
      toast.success(`Importación completa: ${res.creados} creados, ${res.actualizados} actualizados, ${res.omitidos} omitidos`)
      if (res.fallidos > 0) {
        toast.error(`${res.fallidos} cajas fallaron al importarse`)
      }
    } catch (err: any) {
      toast.error('Error durante la importación', { description: err.message })
    } finally {
      startTransition(false)
    }
  }

  const toggleExpandBox = (idx: number) => {
    setExpandedBoxId(prev => (prev === idx ? null : idx))
  }

  // ── Stats ──────────────────────────────────────────────────────────

  const duplicados = items.filter(i => i.status === 'duplicado')
  const nuevos = items.filter(i => i.status === 'nuevo')
  const errores = items.filter(i => i.status === 'error')
  const todosOmitidos = duplicados.length > 0 && duplicados.every(d => d.action === 'omitir')
  const puedeImportar = items.some(it => it.action !== 'omitir') && items.every(it => it.action === 'omitir' || it.status !== 'error')

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 overflow-hidden border bg-background"
        style={{
          maxWidth: '96vw',
          width: '1100px',
          maxHeight: '94vh',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
          <DialogTitle className="text-lg font-bold flex-1">
            {step === 1 && 'Importar Cajas de Producto desde Excel'}
            {step === 2 && `Validación y Revisión (${items.length} cajas)`}
            {step === 3 && 'Confirmar Operación'}
            {step === 4 && 'Resultado del Proceso'}
          </DialogTitle>
          {step > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>1. Revisión</span>
              <ChevronRight className="h-4 w-4" />
              <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>2. Confirmar</span>
              <ChevronRight className="h-4 w-4" />
              <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 4 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>3. Fin</span>
            </div>
          )}
        </div>

        {/* Error de Lectura */}
        {parseError && (
          <div className="mx-5 mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        {/* Contenido Dinámico */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* PASO 1: Selector de Archivo */}
          {step === 1 && (
            <div className="h-full flex flex-col p-6 gap-6 overflow-y-auto">
              <div className="bg-muted/40 rounded-lg p-5 text-sm space-y-2">
                <p className="font-semibold text-base">¿Cómo preparar tu archivo Excel (.xlsx)?</p>
                <p className="text-muted-foreground text-xs">
                  Sube un archivo de Excel con exactamente estas dos pestañas:
                </p>
                <div className="grid md:grid-cols-2 gap-4 text-xs mt-2">
                  <div className="border bg-background p-3 rounded-md space-y-1">
                    <span className="font-semibold text-primary">Pestaña 1: "Cajas"</span>
                    <p className="text-muted-foreground">Registra el empaque. Columnas:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      <li><strong className="text-foreground">codigo_caja</strong> (único, ej: CJ-K24-AZUL)</li>
                      <li><strong className="text-foreground">producto_sku</strong> (producto base, ej: K24)</li>
                      <li>largo_cm, ancho_cm, alto_cm (calcula CBM si está vacío)</li>
                      <li>piezas_por_caja, costo_total_caja, peso_bruto_kg</li>
                    </ul>
                  </div>
                  <div className="border bg-background p-3 rounded-md space-y-1">
                    <span className="font-semibold text-primary">Pestaña 2: "Detalles"</span>
                    <p className="text-muted-foreground">Desglose de piezas. Columnas:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      <li><strong className="text-foreground">codigo_caja</strong> (conecta a la pestaña Cajas)</li>
                      <li><strong className="text-foreground">variante_sku</strong> (para variante específica)</li>
                      <li>talla_codigo y color_nombre (si no se indica variante_sku)</li>
                      <li><strong className="text-foreground">cantidad</strong> (piezas por talla/color)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2 text-green-600" /> Descargar Plantilla Excel (.xlsx)
                </Button>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                  <span className="text-xs font-semibold text-muted-foreground">Leer tallas como</span>
                  <Select
                    value={matchTallasPor}
                    onValueChange={(value) => {
                      const mode = value as MatchTallasPor
                      setMatchTallasPor(mode)
                      void revalidateCurrentRows(mode)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="codigo">codigo</SelectItem>
                      <SelectItem value="talla_us">talla_us</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className={cn(
                  "flex-1 min-h-[220px] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/10 transition-all text-muted-foreground",
                  isPending ? "opacity-60 cursor-not-allowed" : "border-muted-foreground/25 hover:bg-muted/30 hover:border-primary/40"
                )}
              >
                {isPending ? (
                  <Loader2 className="h-14 w-14 animate-spin text-primary opacity-70" />
                ) : (
                  <FileSpreadsheet className="h-14 w-14 text-green-600 opacity-40" />
                )}
                <div className="text-center">
                  <p className="font-semibold text-base">
                    {isPending ? 'Validando contenido del Excel...' : 'Haz clic para seleccionar el archivo Excel (.xlsx)'}
                  </p>
                  <p className="text-xs opacity-70 mt-1">Soporta múltiples pestañas · Máx 5 MB</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </div>
          )}

          {/* PASO 2: Visualización y Filtros */}
          {step === 2 && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-4 px-5 py-2 border-b bg-muted/20 shrink-0 text-xs flex-wrap">
                <span className="flex items-center gap-1 font-semibold text-green-600">
                  <Check className="h-3.5 w-3.5" />{nuevos.length} nuevas
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" />{duplicados.length} duplicados
                </span>
                {errores.length > 0 && (
                  <span className="flex items-center gap-1 font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    <X className="h-3.5 w-3.5" />{errores.length} con error (resuelve antes de importar)
                  </span>
                )}
                {duplicados.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-medium"
                    onClick={toggleSelectAllDuplicados}
                  >
                    {todosOmitidos ? 'Forzar actualización de duplicados' : 'Omitir todos los duplicados'}
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[11px] font-medium text-muted-foreground">Tallas:</span>
                  <Select
                    value={matchTallasPor}
                    onValueChange={(value) => {
                      const mode = value as MatchTallasPor
                      setMatchTallasPor(mode)
                      void revalidateCurrentRows(mode)
                    }}
                  >
                    <SelectTrigger className="h-7 w-[130px] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="codigo">codigo</SelectItem>
                      <SelectItem value="talla_us">talla_us</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Listado de cajas validado */}
              <div className="flex-1 overflow-auto p-4">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader className="bg-muted/40 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="w-[180px]">Código Caja</TableHead>
                        <TableHead className="w-[120px]">SKU Producto</TableHead>
                        <TableHead className="w-[100px] text-right">Pzs/Caja</TableHead>
                        <TableHead className="w-[100px] text-right">CBM</TableHead>
                        <TableHead className="w-[100px] text-right">Peso (kg)</TableHead>
                        <TableHead className="w-[130px]">Estado</TableHead>
                        <TableHead className="w-[160px]">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const isExpanded = expandedBoxId === index
                        const hasErrors = item.errors.length > 0
                        const hasWarnings = item.warnings.length > 0

                        return (
                          <Fragment key={`import-row-${item.codigo_caja}-${index}`}>
                            <TableRow
                              key={`box-${index}`}
                              className={cn(
                                hasErrors && 'bg-red-50/20 hover:bg-red-50/30',
                                item.status === 'nuevo' && !hasErrors && 'bg-green-50/20 hover:bg-green-50/30',
                                item.status === 'duplicado' && item.action === 'omitir' && 'opacity-60'
                              )}
                            >
                              <TableCell className="text-center p-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => toggleExpandBox(index)}
                                >
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono font-bold text-xs">
                                {item.codigo_caja}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.data.producto_sku}
                              </TableCell>
                              <TableCell className="text-right text-xs font-semibold">
                                {item.resolvedData.piezas_por_caja}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {item.resolvedData.cbm?.toFixed(3) ?? '—'}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {item.resolvedData.peso_bruto_kg?.toFixed(2) ?? '—'}
                              </TableCell>
                              <TableCell>
                                {item.status === 'nuevo' && (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200 text-[10px] font-semibold">
                                    Nuevo
                                  </Badge>
                                )}
                                {item.status === 'duplicado' && (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-amber-200 text-[10px] font-semibold">
                                    Duplicado
                                  </Badge>
                                )}
                                {item.status === 'error' && (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100/80 border-red-200 text-[10px] font-semibold">
                                    Error
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.status === 'duplicado' && (
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={item.action === 'actualizar'}
                                      onCheckedChange={() =>
                                        toggleRowAction(index, item.action === 'actualizar' ? 'omitir' : 'actualizar')
                                      }
                                    />
                                    <span className="text-[11px] font-medium">
                                      {item.action === 'actualizar' ? 'Actualizar' : 'Omitir'}
                                    </span>
                                  </div>
                                )}
                                {item.status === 'nuevo' && (
                                  <span className="text-[11px] text-green-600 font-semibold">Se creará nuevo</span>
                                )}
                                {item.status === 'error' && (
                                  <span className="text-[11px] text-red-600 font-semibold">Corregir en Excel</span>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* Fila desplegable con log de validaciones y desgloses */}
                            {isExpanded && (
                              <TableRow className="bg-muted/10 hover:bg-muted/10">
                                <TableCell colSpan={8} className="p-4 border-t">
                                  <div className="space-y-3">
                                    {/* Mostrar Errores */}
                                    {hasErrors && (
                                      <div className="bg-red-50 border border-red-200 rounded p-2.5 space-y-1">
                                        <h4 className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                                          <AlertCircle className="h-3.5 w-3.5" /> Errores de Validación:
                                        </h4>
                                        <ul className="list-disc pl-5 text-[11px] text-red-600 font-medium">
                                          {item.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Mostrar Advertencias */}
                                    {hasWarnings && (
                                      <div className="bg-amber-50 border border-amber-200 rounded p-2.5 space-y-1">
                                        <h4 className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                                          <AlertTriangle className="h-3.5 w-3.5" /> Advertencias:
                                        </h4>
                                        <ul className="list-disc pl-5 text-[11px] text-amber-600 font-medium">
                                          {item.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                        </ul>
                                      </div>
                                    )}

                                    {/* Desglose de piezas (talla/color) */}
                                    <div>
                                      <h4 className="text-xs font-bold text-foreground mb-1.5">
                                        Desglose de Piezas ({item.detalles.length} desgloses):
                                      </h4>
                                      {item.detalles.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">No se definieron detalles para esta caja en la hoja "Detalles".</p>
                                      ) : (
                                        <div className="border rounded overflow-hidden bg-background max-w-2xl">
                                          <Table>
                                            <TableHeader className="bg-muted/30">
                                              <TableRow className="h-8">
                                                <TableHead className="h-8 text-xs py-1">Variante SKU</TableHead>
                                                <TableHead className="h-8 text-xs py-1">Talla</TableHead>
                                                <TableHead className="h-8 text-xs py-1">Color</TableHead>
                                                <TableHead className="h-8 text-xs py-1 text-right">Cantidad</TableHead>
                                                <TableHead className="h-8 text-xs py-1">Estado</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {item.detalles.map((det, dIdx) => (
                                                <TableRow key={dIdx} className={cn("h-8", det.status === 'error' && 'bg-red-50/40')}>
                                                  <TableCell className="font-mono text-[11px] py-1">{det.data.variante_sku || '—'}</TableCell>
                                                  <TableCell className="text-[11px] py-1 min-w-[150px]">
                                                    <Select
                                                      value={det.resolvedData.talla_id ? String(det.resolvedData.talla_id) : ''}
                                                      onValueChange={(value) => {
                                                        if (value) updateDetalleTalla(index, dIdx, value)
                                                      }}
                                                    >
                                                      <SelectTrigger className={cn(
                                                        'h-8 text-[11px]',
                                                        !det.resolvedData.talla_id ? 'border-red-300 bg-red-50' : undefined
                                                      )}>
                                                        <SelectValue placeholder={det.data.talla_codigo || 'Elegir talla'} />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {tallasGuia.map(talla => (
                                                          <SelectItem key={talla.id} value={String(talla.id)}>
                                                            {matchTallasPor === 'talla_us' ? (talla.talla_us || talla.codigo) : talla.codigo} - {talla.nombre}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </TableCell>
                                                  <TableCell className="text-[11px] py-1 min-w-[190px]">
                                                    <ColorCombobox
                                                      coloresDisponibles={colorOptions}
                                                      selectedColorId={det.resolvedData.color_id ? String(det.resolvedData.color_id) : ''}
                                                      onSelect={(value) => updateDetalleColor(index, dIdx, value)}
                                                      disabledFilas={[]}
                                                      onCreateColor={(color) => {
                                                        setColoresLocales(prev => prev.some(c => c.id === color.id) ? prev : [...prev, { ...color, hex_code: null }])
                                                      }}
                                                    />
                                                  </TableCell>
                                                  <TableCell className="text-right font-bold text-[11px] py-1">{det.data.cantidad}</TableCell>
                                                  <TableCell className="py-1">
                                                    {det.status === 'valido' ? (
                                                      <span className="text-[10px] text-green-600 font-semibold">Ok</span>
                                                    ) : (
                                                      <span className="text-[10px] text-red-600 font-semibold">{det.errors[0]}</span>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: Confirmación */}
          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold tracking-tight">Confirmar Importación</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Se guardarán los cambios en la base de datos de manera definitiva. Para las cajas en "Actualizar", se eliminarán sus desgloses anteriores y se guardarán los definidos en este archivo.
                </p>
              </div>

              <div className="bg-muted/40 rounded-lg p-5 text-sm w-full max-w-md border">
                <div className="flex justify-between py-1.5 border-b font-medium">
                  <span>Cajas nuevas a crear:</span>
                  <span className="font-bold text-green-600">
                    {items.filter(i => i.action === 'crear' && i.status !== 'error').length}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b font-medium">
                  <span>Cajas existentes a actualizar:</span>
                  <span className="font-bold text-blue-600">
                    {items.filter(i => i.action === 'actualizar').length}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b font-medium">
                  <span>Cajas omitidas:</span>
                  <span className="font-bold text-muted-foreground">
                    {items.filter(i => i.action === 'omitir').length}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 font-medium">
                  <span>No importables (errores):</span>
                  <span className="font-bold text-red-600">
                    {items.filter(i => i.status === 'error').length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Resultado */}
          {step === 4 && result && (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-5 overflow-y-auto">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center border border-green-200">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold">Importación Concluida</h3>
                <p className="text-sm text-muted-foreground">
                  Se ejecutaron las operaciones de persistencia en la base de datos.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 text-xs w-full max-w-md space-y-1 border">
                <div className="flex justify-between py-1 font-medium">
                  <span>Cajas creadas:</span>
                  <span className="font-bold text-green-600">{result.creados}</span>
                </div>
                <div className="flex justify-between py-1 font-medium">
                  <span>Cajas actualizadas:</span>
                  <span className="font-bold text-blue-600">{result.actualizados}</span>
                </div>
                <div className="flex justify-between py-1 font-medium">
                  <span>Cajas omitidas:</span>
                  <span className="font-bold text-muted-foreground">{result.omitidos}</span>
                </div>
                <div className="flex justify-between py-1 font-medium">
                  <span>Cajas fallidas:</span>
                  <span className="font-bold text-red-600">{result.fallidos}</span>
                </div>
              </div>

              {result.errores.length > 0 && (
                <div className="w-full max-w-md">
                  <h4 className="text-xs font-bold text-red-600 mb-1.5">Detalle de Fallas:</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 border border-red-100 rounded-md p-2.5 text-xs font-mono space-y-1">
                    {result.errores.map((err, i) => (
                      <div key={i} className="flex gap-1.5 text-red-700">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span>
                          <strong>{err.codigo_caja}</strong>: {err.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t bg-background">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Cargar Excel
                  </>
                )}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver a subir
              </Button>
              <Button onClick={() => setStep(3)} disabled={!puedeImportar}>
                Siguiente →
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
              <Button onClick={handleImport} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Confirmar e Importar
                  </>
                )}
              </Button>
            </>
          )}

          {step === 4 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Finalizar y Cerrar
              </Button>
              <Button onClick={reset}>
                Cargar otro Excel
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
