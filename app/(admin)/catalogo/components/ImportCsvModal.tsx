// app/(admin)/catalogo/components/ImportCsvModal.tsx
'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import Papa from 'papaparse'
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Check,
  Download,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  SkipForward,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  CsvProductoRow,
  ImportItem,
  ImportBatchResult,
  FieldDiff,
} from '@/modules/catalogo/import/actions'
import {
  importProductsFromCsvAction,
  validateCsvBeforeImportAction,
} from '@/modules/catalogo/import/actions'
import { getCsvTemplate } from '@/modules/catalogo/import/utils'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3 | 4
type FilterTab = 'todos' | 'nuevos' | 'duplicados' | 'cambios' | 'errores'

export function ImportCsvModal({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [isPending, setIsPending] = useState(false)
  const [items, setItems] = useState<ImportItem[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportBatchResult | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('todos')

  // ── Reset completo ──────────────────────────────────────────────────
  const reset = () => {
    setStep(1)
    setItems([])
    setParseError(null)
    setResult(null)
    setFilterTab('todos')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  // ── Descargar plantilla ────────────────────────────────────────────
  const downloadTemplate = () => {
    const template = getCsvTemplate()
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plantilla_productos_catalogo.csv'
    link.click()
  }

  // ── Parsear CSV ────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setParseError(null)

      if (file.size > MAX_FILE_SIZE) {
        setParseError('Archivo demasiado grande. Tamaño máximo: 4 MB')
        return
      }

      Papa.parse<CsvProductoRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.data.length === 0) {
            setParseError('El CSV está vacío o tiene un formato incorrecto')
            return
          }
          const validRows = results.data.filter((r) => r.sku_base && r.sku_base.trim())
          if (validRows.length === 0) {
            setParseError('El CSV no tiene la columna "sku_base" o todas las filas están vacías')
            return
          }

          setIsPending(true)
          try {
            const res = await validateCsvBeforeImportAction(validRows)
            setItems(res.items)
            setStep(2)
          } catch (err) {
            setParseError(err instanceof Error ? err.message : 'Error validando CSV')
          } finally {
            setIsPending(false)
          }
        },
        error: (err: Error) => {
          setParseError(err.message)
        },
      })
    },
    []
  )

  // ── Acciones por fila ─────────────────────────────────────────────
  const setRowAction = (index: number, action: 'crear' | 'omitir' | 'actualizar') => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, action } : it))
    )
  }

  // ── Acciones masivas para duplicados / existentes ─────────────────
  const setBulkActionForDuplicates = (action: 'actualizar' | 'omitir' | 'crear') => {
    setItems((prev) =>
      prev.map((it) => (it.status === 'duplicado' ? { ...it, action } : it))
    )
    const label = action === 'actualizar' ? 'actualizar datos' : action === 'omitir' ? 'omitir' : 'crear nuevo'
    toast.info(`Se seleccionó "${label}" para todos los productos existentes`)
  }

  // ── Probar AND para SKUs con advertencia ADN ──────────────────────
  const handleTryAnd = async (index: number) => {
    const item = items[index]
    if (!item) return
    const adnSku = item.sku
    const andSku = adnSku.replace(/\bADN/i, 'AND')

    setIsPending(true)
    try {
      const res = await validateCsvBeforeImportAction([{ ...item.data, sku_base: andSku }])
      if (res.items.length > 0) {
        const validated = res.items[0]
        setItems((prev) =>
          prev.map((it, i) => (i === index ? validated : it))
        )
        if (validated.status === 'duplicado') {
          toast.success(`SKU "${andSku}" encontrado en BD (ID: ${validated.existingId})`)
        }
      }
    } catch {
      toast.error('Error al revalidar SKU')
    } finally {
      setIsPending(false)
    }
  }

  // ── Ejecutar importación ───────────────────────────────────────────
  const handleImport = async () => {
    setIsPending(true)
    try {
      const res = await importProductsFromCsvAction(items)
      setResult(res)
      setStep(4)
      toast.success(
        `Completado: ${res.creados} creados, ${res.actualizados} actualizados, ${res.omitidos} omitidos`
      )
      if (res.fallidos > 0) {
        toast.error(`${res.fallidos} registros fallaron`)
      }
    } catch (err: any) {
      toast.error('Error importando', { description: err.message })
    } finally {
      setIsPending(false)
    }
  }

  // ── Contadores y métricas ──────────────────────────────────────────
  const nuevos = useMemo(() => items.filter((i) => i.status === 'nuevo'), [items])
  const duplicados = useMemo(() => items.filter((i) => i.status === 'duplicado'), [items])
  const conCambios = useMemo(
    () => items.filter((i) => i.status === 'duplicado' && (i.diffs?.length ?? 0) > 0),
    [items]
  )
  const errores = useMemo(() => items.filter((i) => i.status === 'error'), [items])

  const aCrear = useMemo(() => items.filter((i) => i.action === 'crear' && i.status !== 'error'), [items])
  const aActualizar = useMemo(() => items.filter((i) => i.action === 'actualizar' && i.status !== 'error'), [items])
  const aOmitir = useMemo(() => items.filter((i) => i.action === 'omitir'), [items])

  const puedeImportar = aCrear.length > 0 || aActualizar.length > 0

  // ── Filtrado de filas en paso 2 ───────────────────────────────────
  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (filterTab === 'nuevos') return item.status === 'nuevo'
        if (filterTab === 'duplicados') return item.status === 'duplicado'
        if (filterTab === 'cambios') return item.status === 'duplicado' && (item.diffs?.length ?? 0) > 0
        if (filterTab === 'errores') return item.status === 'error'
        return true
      })
  }, [items, filterTab])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 overflow-hidden border bg-background sm:max-w-[94vw] lg:max-w-[1150px] w-full max-h-[92vh] h-[88vh] flex flex-col shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b bg-card/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold truncate">
              {step === 1 && 'Importar y Actualizar Productos desde CSV'}
              {step === 2 && `Revisar y Decidir Acciones (${items.length} filas)`}
              {step === 3 && 'Confirmar Proceso de Importación'}
              {step === 4 && 'Resultado de la Importación'}
            </DialogTitle>
          </div>

          {/* Indicador de pasos */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-medium transition-colors',
                step === 1
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-foreground'
              )}
            >
              1. Archivo
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-medium transition-colors',
                step === 2
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-foreground'
              )}
            >
              2. Revisión
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-medium transition-colors',
                step === 3
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-foreground'
              )}
            >
              3. Confirmar
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-medium transition-colors',
                step === 4
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'bg-muted text-foreground'
              )}
            >
              4. Fin
            </span>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {parseError && (
          <div className="mx-6 mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center gap-2.5 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{parseError}</span>
          </div>
        )}

        {/* ── Contenido según paso ── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* PASO 1: Carga de CSV */}
          {step === 1 && (
            <div className="h-full flex flex-col p-6 gap-5 overflow-y-auto">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm space-y-2">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>Importador Inteligente con Actualización Masiva</span>
                </div>
                <ul className="text-muted-foreground text-xs space-y-1.5 leading-relaxed">
                  <li>
                    • <strong>Creación o Actualización:</strong> Si un SKU ya existe en la base de datos, podrás{' '}
                    <strong className="text-foreground">actualizar sus campos masivamente</strong> (como descripción, nombre, precio, etc.) o mantenerlo intacto.
                  </li>
                  <li>
                    • <strong>Protección de datos:</strong> Al actualizar, las columnas que dejes vacías en el CSV no borrarán el valor que ya existe en la BD.
                  </li>
                  <li>
                    • <strong>Columna obligatoria:</strong> Solo <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono">sku_base</code> es requerida. Para productos nuevos se recomienda nombre o descripción.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4 text-primary" /> Descargar plantilla CSV de ejemplo
                </Button>
                <span className="text-xs text-muted-foreground">Formatos compatibles: .csv (UTF-8)</span>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex-1 min-h-[220px] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/25 bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all text-muted-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="font-semibold text-sm text-foreground">Analizando CSV y verificando catálogo existente...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-primary/10 text-primary">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-semibold text-foreground text-base">
                        Haz clic aquí o arrastra tu archivo CSV
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hasta 4 MB · Detección automática de duplicados y cambios
                      </p>
                    </div>
                  </>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* PASO 2: Revisión de Filas y Acciones */}
          {step === 2 && (
            <div className="h-full flex flex-col">
              {/* Barra superior de filtros y acciones masivas */}
              <div className="p-4 border-b bg-muted/30 shrink-0 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Tabs / Filtros */}
                  <div className="flex items-center gap-1.5 p-1 bg-background rounded-lg border text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterTab('todos')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-medium',
                        filterTab === 'todos' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'
                      )}
                    >
                      Todos ({items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('nuevos')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1',
                        filterTab === 'nuevos' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-muted text-emerald-700 dark:text-emerald-400'
                      )}
                    >
                      <PlusCircle className="h-3 w-3" /> Nuevos ({nuevos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('duplicados')}
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1',
                        filterTab === 'duplicados' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-muted text-blue-700 dark:text-blue-400'
                      )}
                    >
                      <RefreshCw className="h-3 w-3" /> Existentes ({duplicados.length})
                    </button>
                    {conCambios.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterTab('cambios')}
                        className={cn(
                          'px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1',
                          filterTab === 'cambios' ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-muted text-amber-700 dark:text-amber-400'
                        )}
                      >
                        <AlertTriangle className="h-3 w-3" /> Con cambios ({conCambios.length})
                      </button>
                    )}
                    {errores.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterTab('errores')}
                        className={cn(
                          'px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1',
                          filterTab === 'errores' ? 'bg-red-600 text-white shadow-sm' : 'hover:bg-muted text-red-700 dark:text-red-400'
                        )}
                      >
                        <AlertCircle className="h-3 w-3" /> Errores ({errores.length})
                      </button>
                    )}
                  </div>

                  {/* Acciones en lote para duplicados */}
                  {duplicados.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground font-medium mr-1">Existentes en lote:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/50"
                        onClick={() => setBulkActionForDuplicates('actualizar')}
                      >
                        <RefreshCw className="h-3 w-3" /> Actualizar todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-muted text-muted-foreground hover:bg-muted"
                        onClick={() => setBulkActionForDuplicates('omitir')}
                      >
                        <SkipForward className="h-3 w-3" /> Omitir todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300"
                        onClick={() => setBulkActionForDuplicates('crear')}
                      >
                        <PlusCircle className="h-3 w-3" /> Forzar nuevos
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de revisión de filas */}
              <div className="flex-1 overflow-auto p-4">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[140px]">SKU Base</TableHead>
                      <TableHead className="w-[120px]">Estado BD</TableHead>
                      <TableHead>Nombre / Descripción (CSV)</TableHead>
                      <TableHead className="w-[180px]">Diferencias con BD</TableHead>
                      <TableHead className="w-[110px]">Precio EC</TableHead>
                      <TableHead className="w-[160px] text-right">Acción a realizar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                          No hay registros en esta vista.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map(({ item, originalIndex }) => (
                        <TableRow
                          key={originalIndex}
                          className={cn(
                            item.status === 'nuevo' && 'bg-emerald-500/[0.03]',
                            item.status === 'duplicado' && item.action === 'actualizar' && 'bg-blue-500/[0.04]',
                            item.status === 'duplicado' && item.action === 'omitir' && 'opacity-60 bg-muted/20',
                            item.status === 'error' && 'bg-red-500/[0.05]'
                          )}
                        >
                          {/* SKU */}
                          <TableCell className="font-mono font-medium text-xs">
                            <span className="font-bold text-foreground">{item.sku}</span>
                            {item.warnings?.length > 0 && item.status === 'nuevo' && (
                              <div className="mt-1.5 flex flex-col gap-1">
                                <div className="flex items-start gap-1 text-amber-600 dark:text-amber-400 text-[10px]">
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                  <span>{item.warnings[0]}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] w-fit border-amber-300 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800"
                                  onClick={() => handleTryAnd(originalIndex)}
                                >
                                  Probar corrección AND
                                </Button>
                              </div>
                            )}
                          </TableCell>

                          {/* Estado en BD */}
                          <TableCell>
                            {item.status === 'nuevo' && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                                No existe (Nuevo)
                              </Badge>
                            )}
                            {item.status === 'duplicado' && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[10px]">
                                Ya en BD #{item.existingId}
                              </Badge>
                            )}
                            {item.status === 'error' && (
                              <Badge variant="destructive" className="text-[10px]">
                                Error
                              </Badge>
                            )}
                          </TableCell>

                          {/* Nombre / Descripción */}
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">
                              {item.data.nombre || <span className="text-muted-foreground italic">Sin nombre</span>}
                            </div>
                            <div className="text-muted-foreground line-clamp-2 mt-0.5">
                              {item.data.descripcion || <span className="italic">Sin descripción</span>}
                            </div>
                          </TableCell>

                          {/* Diferencias con BD */}
                          <TableCell>
                            {item.status === 'duplicado' ? (
                              item.diffs && item.diffs.length > 0 ? (
                                <Popover>
                                  <PopoverTrigger
                                    className="inline-flex items-center justify-center rounded-md text-[11px] font-medium transition-colors border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 h-6 px-2 gap-1.5 shadow-xs"
                                  >
                                    <Info className="h-3 w-3" />
                                    {item.diffs.length} cambio(s)
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-3 text-xs" align="start">
                                    <p className="font-semibold mb-2 text-foreground border-b pb-1">
                                      Comparativa SKU {item.sku}
                                    </p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {item.diffs.map((d, i) => (
                                        <div key={i} className="space-y-0.5 bg-muted/30 p-1.5 rounded">
                                          <div className="font-medium text-[11px] text-foreground">{d.label}:</div>
                                          <div className="flex items-center gap-1.5 text-[10px]">
                                            <span className="text-red-600 line-through truncate max-w-[110px]" title={String(d.oldValue ?? '')}>
                                              {d.oldValue === null ? '(vacío)' : String(d.oldValue)}
                                            </span>
                                            <span>➔</span>
                                            <span className="text-emerald-700 font-semibold truncate max-w-[120px]" title={String(d.newValue ?? '')}>
                                              {d.newValue === null ? '(vacío)' : String(d.newValue)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">Sin diferencias</span>
                              )
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Precio EC */}
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {item.data.precio_ec ? `$${item.data.precio_ec}` : '—'}
                          </TableCell>

                          {/* Selector de Acción */}
                          <TableCell className="text-right">
                            {item.status === 'error' ? (
                              <span className="text-[11px] text-red-600 font-medium">{item.errors[0]}</span>
                            ) : (
                              <Select
                                value={item.action}
                                onValueChange={(val) => {
                                  if (val) setRowAction(originalIndex, val as 'crear' | 'omitir' | 'actualizar')
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-[140px] ml-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  {item.status === 'duplicado' && (
                                    <SelectItem value="actualizar" className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                      🔄 Actualizar datos
                                    </SelectItem>
                                  )}
                                  <SelectItem value="crear" className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                                    ➕ {item.status === 'duplicado' ? 'Crear (forzar)' : 'Crear nuevo'}
                                  </SelectItem>
                                  <SelectItem value="omitir" className="text-xs text-muted-foreground">
                                    ⏭️ Omitir fila
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* PASO 3: Confirmación previa a importar */}
          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-6 overflow-y-auto">
              <div className="text-center space-y-2 max-w-lg">
                <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-1">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Confirma la operación de catálogo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Por favor revisa el resumen de cambios antes de persistir los datos en Supabase.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                <div className="p-4 rounded-xl border bg-emerald-500/[0.08] border-emerald-500/20 text-center space-y-1">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Nuevos a Crear</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{aCrear.length}</p>
                </div>
                <div className="p-4 rounded-xl border bg-blue-500/[0.08] border-blue-500/20 text-center space-y-1">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">A Actualizar</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{aActualizar.length}</p>
                </div>
                <div className="p-4 rounded-xl border bg-muted/40 border-border text-center space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Omitidos</p>
                  <p className="text-2xl font-black text-muted-foreground">{aOmitir.length}</p>
                </div>
              </div>

              {errores.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 max-w-xl w-full flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Hay <strong>{errores.length}</strong> registro(s) con errores de formato que no se procesarán.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: Resultados finales */}
          {step === 4 && result && (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-6 overflow-y-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-center space-y-1 max-w-md">
                <h3 className="text-xl font-bold">Proceso completado</h3>
                <p className="text-xs text-muted-foreground">
                  El catálogo ha sido actualizado y sincronizado en tiempo real.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
                <div className="p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 text-center">
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">Creados</p>
                  <p className="text-xl font-bold text-emerald-700">{result.creados}</p>
                </div>
                <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 text-center">
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium">Actualizados</p>
                  <p className="text-xl font-bold text-blue-700">{result.actualizados}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/40 text-center">
                  <p className="text-[11px] text-muted-foreground font-medium">Omitidos</p>
                  <p className="text-xl font-bold text-muted-foreground">{result.omitidos}</p>
                </div>
                <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/30 text-center">
                  <p className="text-[11px] text-red-800 dark:text-red-300 font-medium">Fallidos</p>
                  <p className="text-xl font-bold text-red-700">{result.fallidos}</p>
                </div>
              </div>

              {result.errores.length > 0 && (
                <div className="w-full max-w-xl space-y-2">
                  <h4 className="text-xs font-semibold text-destructive">Detalle de errores encontrados:</h4>
                  <div className="max-h-36 overflow-y-auto bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 text-xs space-y-1">
                    {result.errores.map((err, i) => (
                      <div key={i} className="flex items-center gap-2 text-destructive font-mono text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-bold">{err.sku}:</span>
                        <span>{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer de navegación del Wizard ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3.5 border-t bg-card/60">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                <Upload className="h-4 w-4 mr-2" /> Seleccionar CSV
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={reset} disabled={isPending}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Cargar otro archivo
              </Button>
              <Button onClick={() => setStep(3)} disabled={!puedeImportar || isPending}>
                Continuar a Confirmación ({aCrear.length + aActualizar.length}) →
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)} disabled={isPending}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver a revisar
              </Button>
              <Button onClick={handleImport} disabled={isPending || !puedeImportar} className="gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando ({aCrear.length} altas, {aActualizar.length} act.)...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Ejecutar ({aCrear.length} altas, {aActualizar.length} actualizaciones)
                  </>
                )}
              </Button>
            </>
          )}

          {step === 4 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
              <Button onClick={reset}>
                <Upload className="h-4 w-4 mr-2" /> Importar otro CSV
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
