// app/(admin)/catalogo/components/ImportCsvModal.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import {
  Upload,
  X,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Check,
  Download,
  Trash2,
  Eye,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type {
  CsvProductoRow,
  ImportItem,
  ImportBatchResult,
} from '@/modules/catalogo/import/actions'
import {
  importProductsFromCsvAction,
  validateCsvBeforeImportAction,
} from '@/modules/catalogo/import/actions'
import { getCsvTemplate } from '@/modules/catalogo/import/utils'

// ── Componente principal del Wizard ──────────────────────────────────

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 1 | 2 | 3 | 4

export function ImportCsvModal({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [isPending, startTransition] = useState(false)
  const [items, setItems] = useState<ImportItem[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportBatchResult | null>(null)

  // ── Reset completo ──────────────────────────────────────────────────

  const reset = () => {
    setStep(1)
    setItems([])
    setParseError(null)
    setResult(null)
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
    link.download = 'plantilla_productos.csv'
    link.click()
  }

  // ── Parsear CSV ────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setParseError(null)

      // Validar tipo y tamaño
      if (file.size > MAX_FILE_SIZE) {
        setParseError('Archivo demasiado grande. Tamaño máximo: 2 MB')
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
          // Validar que tenga sku_base
          const validRows = results.data.filter((r) => r.sku_base && r.sku_base.trim())
          if (validRows.length === 0) {
            setParseError('El CSV no tiene columna "sku_base" o todas están vacías')
            return
          }
          // Llamar al server para validar duplicados
          startTransition(true)
          try {
            const res = await validateCsvBeforeImportAction(validRows)
            setItems(res.items)
            setStep(2)
          } catch (err) {
            setParseError(err instanceof Error ? err.message : 'Error validando CSV')
          } finally {
            startTransition(false)
          }
        },
        error: (err: Error) => {
          setParseError(err.message)
        },
      })
    },
    []
  )

  // ── Acciones en filas de paso 2 ──────────────────────────────────

  const toggleRowAction = (index: number, action: 'crear' | 'omitir') => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, action: it.action === action ? 'crear' : action } : it
      )
    )
  }

  const toggleSelectAllDuplicados = () => {
    const todosOmitidos = duplicados.every((d) => d.action === 'omitir')
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        action:
          it.status === 'duplicado'
            ? todosOmitidos ? 'crear' : 'omitir'
            : it.action,
      }))
    )
  }

  // ── Ejecutar importación ───────────────────────────────────────────

  const handleImport = async () => {
    startTransition(true)
    try {
      const res = await importProductsFromCsvAction(items)
      setResult(res)
      setStep(4)
      toast.success(`Importación completa: ${res.creados} creados, ${res.omitidos} omitidos`)
      if (res.fallidos > 0) {
        toast.error(`${res.fallidos} registros fallaron`)
      }
    } catch (err: any) {
      toast.error('Error importando', { description: err.message })
    } finally {
      startTransition(false)
    }
  }

  // ── Contadores ─────────────────────────────────────────────────────

  const duplicados = items.filter((i) => i.status === 'duplicado')
  const nuevos = items.filter((i) => i.status === 'nuevo')
  const advertencias = items.filter((i) => i.warnings?.length > 0 && i.status === 'nuevo')
  const todosOmitidos = duplicados.length > 0 && duplicados.every((d) => d.action === 'omitir')
  const puedeImportar = items.some((it) => it.action !== 'omitir')

  // ── Probar AND para SKUs con advertencia ADN ──────────────────────

  const handleTryAnd = async (index: number) => {
    const item = items[index]
    if (!item) return
    const adnSku = item.sku
    const andSku = adnSku.replace(/\bADN/i, 'AND')

    // Actualizar el SKU localmente
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              sku: andSku,
              data: { ...it.data, sku_base: andSku },
              warnings: [],
            }
          : it
      )
    )

    // Re-validar solo este SKU contra la BD
    try {
      const res = await validateCsvBeforeImportAction([{ ...item.data, sku_base: andSku }])
      if (res.items.length > 0) {
        const validated = res.items[0]
        setItems((prev) =>
          prev.map((it, i) =>
            i === index
              ? {
                  ...it,
                  sku: validated.sku,
                  status: validated.status,
                  existingId: validated.existingId,
                  errors: validated.errors,
                  warnings: validated.warnings,
                  action: validated.action,
                }
              : it
          )
        )
        if (validated.status === 'duplicado') {
          toast.info(`SKU "${andSku}" encontrado en la base de datos (ID: ${validated.existingId})`)
        }
      }
    } catch {
      // Si falla la re-validación, al menos quedamos con el SKU modificado
    }
  }

  // =====================================================================
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 overflow-hidden border bg-background"
        style={{
          maxWidth: '96vw',
          width: '1000px',
          maxHeight: '94vh',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
          <DialogTitle className="text-lg font-bold flex-1">
            {step === 1 && 'Importar Productos desde CSV'}
            {step === 2 && `Revisar Duplicados (${items.length} productos)`}
            {step === 3 && 'Confirmar Importación'}
            {step === 4 && 'Resultado de la Importación'}
          </DialogTitle>
          {/* Indicador de pasos */}
          {step > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
              <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>1</span>
              <ChevronRight className="h-4 w-4" />
              <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>2</span>
              <ChevronRight className="h-4 w-4" />
              <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 4 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>3</span>
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {parseError && (
          <div className="mx-5 mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {parseError}
          </div>
        )}

        {/* ── Contenido ── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* PASO 1: Seleccionar CSV */}
          {step === 1 && (
            <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto">
              <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold">¿Cómo funciona?</p>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Descarga la plantilla de ejemplo o sube tu propio CSV</li>
                  <li>• El CSV debe tener columna `sku_base` y `descripcion` obligatorios</li>
                  <li>• Si un SKU ya existe, por defecto se omite; actívalo si quieres crear una copia</li>
                  <li>• Los campos opcionales: nombre, familia, precio_ec, marca_id, genero_id, estado, etc.</li>
                </ul>
              </div>

              <Button variant="outline" size="sm" className="w-fit" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" /> Descargar plantilla CSV
              </Button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all text-muted-foreground"
              >
                <Upload className="h-14 w-14 opacity-30" />
                <div className="text-center">
                  <p className="font-semibold text-base">Haz clic para seleccionar un archivo CSV</p>
                  <p className="text-xs opacity-70 mt-1">.csv · Máx 2 MB</p>
                </div>
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

          {/* PASO 2: Revisar duplicados */}
          {step === 2 && (
            <div className="h-full flex flex-col">
              {/* Stats bar */}
              <div className="flex items-center gap-4 px-5 py-2 border-b bg-muted/20 shrink-0 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" />{nuevos.length} nuevos
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" />{duplicados.length} duplicados
                </span>
                {advertencias.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />{advertencias.length} advertencias
                  </span>
                )}
                {duplicados.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={toggleSelectAllDuplicados}
                  >
                    {todosOmitidos ? 'Seleccionar todos' : 'Deseleccionar todos'}
                  </Button>
                )}
              </div>

              {/* Scrollable table */}
              <div className="flex-1 overflow-auto p-4">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[100px]">SKU</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-[100px]">Precio EC</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead className="w-[140px]">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow
                        key={index}
                        className={cn(
                          item.status === 'nuevo' && 'bg-green-50/30',
                          item.status === 'duplicado' && item.action === 'omitir' && 'opacity-50'
                        )}
                      >
                        <TableCell className="font-mono font-medium text-xs">
                          {item.sku}
                          {item.status === 'duplicado' && (
                            <Badge variant="outline" className="ml-2 text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                              Duplicado
                            </Badge>
                          )}
                          {item.status === 'nuevo' && (
                            <Badge variant="outline" className="ml-2 text-[10px] bg-green-100 text-green-800 border-green-200">
                              Nuevo
                            </Badge>
                          )}
                          {item.status === 'error' && (
                            <Badge variant="outline" className="ml-2 text-[10px] bg-red-100 text-red-800 border-red-200">
                              Error
                            </Badge>
                          )}
                          {item.warnings?.length > 0 && item.status === 'nuevo' && (
                            <div className="mt-1.5 flex items-start gap-1 text-amber-600">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span className="text-[10px] leading-tight">{item.warnings[0]}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{item.data.descripcion ?? item.data.nombre ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.data.precio_ec ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.data.estado ?? 'borrador'}
                        </TableCell>
                        <TableCell>
                          {item.status === 'duplicado' && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.action !== 'omitir'}
                                onCheckedChange={() =>
                                  toggleRowAction(index, item.action === 'crear' ? 'omitir' : 'crear')
                                }
                              />
                              <span className="text-xs">
                                {item.action === 'crear' ? 'Crear (forzar)' : 'Omitir'}
                              </span>
                            </div>
                          )}
                          {item.status === 'nuevo' && (
                            <div className="flex items-center gap-2">
                              <Badge className="text-[10px] bg-green-100 text-green-800 border-green-200">
                                Crear nuevo
                              </Badge>
                              {item.warnings?.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] text-amber-700 border-amber-300 hover:bg-amber-50"
                                  onClick={() => handleTryAnd(index)}
                                >
                                  Probar AND
                                </Button>
                              )}
                            </div>
                          )}
                          {item.status === 'error' && (
                            <span className="text-xs text-red-600">{item.errors[0]}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* PASO 3: Confirmacion */}
          {step === 3 && (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Confirma la importación</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Estás a punto de importar productos a la base de datos. Este proceso no se puede deshacer.
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4 text-sm w-full max-w-md">
                <div className="flex justify-between py-1 border-b last:border-0">
                  <span>Productos a crear:</span>
                  <span className="font-bold">{items.filter((i) => i.action === 'crear' && i.status !== 'error').length}</span>
                </div>
                <div className="flex justify-between py-1 border-b last:border-0">
                  <span>Omitidos (duplicados):</span>
                  <span className="font-bold">{items.filter((i) => i.action === 'omitir').length}</span>
                </div>
                <div className="flex justify-between py-1 border-b last:border-0">
                  <span>Con errores (no importados):</span>
                  <span className="font-bold text-red-600">
                    {items.filter((i) => i.status === 'error').length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: Resultado */}
          {step === 4 && result && (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Importación completada</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Los productos fueron importados exitosamente. Puedes verlos en el catálogo.
                </p>
              </div>
              <div className="bg-muted/40 rounded-lg p-4 text-sm w-full max-w-md space-y-1">
                <div className="flex justify-between py-1">
                  <span>Creados:</span>
                  <span className="font-bold text-green-600">{result.creados}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Omitidos:</span>
                  <span className="font-bold text-amber-600">{result.omitidos}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Fallidos:</span>
                  <span className="font-bold text-red-600">{result.fallidos}</span>
                </div>
              </div>
              {result.errores.length > 0 && (
                <div className="w-full max-w-md">
                  <h4 className="text-sm font-semibold mb-2">Errores:</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 rounded p-2 text-xs space-y-1">
                    {result.errores.map((err, i) => (
                      <div key={i} className="flex items-center gap-1 text-red-700">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{err.sku}</span>: {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t bg-background">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Seleccionar CSV
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver al inicio
              </Button>
              <Button onClick={() => setStep(3)} disabled={!puedeImportar}>
                Continuar →
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
              <Button onClick={handleImport} disabled={isPending || !puedeImportar}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Importar
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
