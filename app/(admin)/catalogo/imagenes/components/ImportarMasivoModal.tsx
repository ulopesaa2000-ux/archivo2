// app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import Papa from 'papaparse'
import { Upload, X, ImageIcon, Loader2, Check, AlertCircle, Search, ChevronRight, FileSpreadsheet, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { importarImagenesDesdeExcelAction, uploadSingleImagenConSkuAction } from '@/modules/catalogo/imagenes/actions'
import { buscarProductosPorSkuBatch } from '@/modules/inventario/import-queries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BuscadorSku } from './BuscadorSku'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'files' | 'excel'
}

const MAX_FILES = 40
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const CHUNK_SIZE = 12
const PARALLEL_CHUNKS = 2
const PARALLEL_UPLOADS = 3
const MIN_SCORE = 0.60

interface FilePreview {
  file: File
  preview: string
  sku: string
  alt_text: string
  uso: string
  es_principal: boolean
  productoId?: number
  productoNombre?: string
  status: 'pending' | 'detected' | 'not_found' | 'assigned'
}

export function ImportarMasivoModal({ open, onOpenChange, mode }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const [files, setFiles] = useState<FilePreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const [detectionProgress, setDetectionProgress] = useState<{ current: number; total: number } | null>(null)

  // ── Estado para modo Excel/CSV ──────────────────────────────────────
  const [csvText, setCsvText] = useState('')
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [csvRows, setCsvRows] = useState<{
    sku: string
    url: string
    es_principal: boolean
    alt_text: string
    uso: string
    orden: number
    productoId?: number
    productoNombre?: string
    status: 'pending' | 'found' | 'not_found'
  }[]>([])

  /**
   * Detecta SKUs usando el RPC fn_buscar_candidatos_sku_ocr del módulo de inventario.
   * Procesa en chunks paralelos para no saturar.
   */
  const runDetectionForFiles = async (currentFiles: FilePreview[]) => {
    setDetecting(true)
    setDetectionProgress({ current: 0, total: currentFiles.length })
    try {
      // Extraer nombres de archivo sin extensión como candidatos de SKU
      const filenames = currentFiles.map(f => f.file.name.replace(/\.[^.]+$/, '').trim())

      // Dividir en chunks y procesar en paralelo limitado
      const chunks: string[][] = []
      for (let i = 0; i < filenames.length; i += CHUNK_SIZE) {
        chunks.push(filenames.slice(i, i + CHUNK_SIZE))
      }

      const allMatches = new Map<string, { producto_id: number; sku_base: string; nombre: string | null }>()

      for (let i = 0; i < chunks.length; i += PARALLEL_CHUNKS) {
        const batch = chunks.slice(i, i + PARALLEL_CHUNKS)
        const results = await Promise.all(
          batch.map(chunk => buscarProductosPorSkuBatch(chunk))
        )
        for (const map of results) {
          for (const [key, value] of map) {
            allMatches.set(key, value)
          }
        }
        setDetectionProgress({
          current: Math.min((i + PARALLEL_CHUNKS) * CHUNK_SIZE, filenames.length),
          total: filenames.length,
        })
      }

      // Mapear resultados de vuelta a los archivos
      const updated = currentFiles.map((f, idx) => {
        const filename = filenames[idx]
        const match = allMatches.get(filename)
        if (match && match.sku_base) {
          return {
            ...f,
            sku: match.sku_base,
            productoId: match.producto_id,
            productoNombre: match.nombre ?? undefined,
            alt_text: `Imagen de ${match.nombre ?? match.sku_base}`,
            status: 'detected' as const,
            es_principal: true,
          }
        }
        return { ...f, sku: filename.replace(/[-_]/g, '/').toUpperCase(), status: 'not_found' as const, es_principal: false }
      })
      setFiles(updated)
    } catch (e) {
      console.error('Error detectando SKUs:', e)
    } finally {
      setDetecting(false)
      setDetectionProgress(null)
    }
  }

  const handleSkuChange = async (index: number, newSku: string) => {
    const updated = [...files]
    updated[index].sku = newSku.toUpperCase()
    if (!newSku) {
      updated[index].status = 'pending'
      updated[index].productoId = undefined
      updated[index].productoNombre = undefined
    } else {
      // Buscar via RPC para validar el SKU
      const matches = await buscarProductosPorSkuBatch([newSku])
      const match = matches.get(newSku)
      if (match && match.sku_base) {
        updated[index].status = 'assigned'
        updated[index].productoId = match.producto_id
        updated[index].productoNombre = match.nombre ?? undefined
        updated[index].alt_text = `Imagen de ${match.nombre ?? match.sku_base}`
      } else {
        updated[index].status = 'not_found'
        updated[index].productoId = undefined
        updated[index].productoNombre = undefined
      }
    }
    setFiles(updated)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setError(null)
    if (selected.length > MAX_FILES) { setError(`El límite máximo es de ${MAX_FILES} imágenes`); return }
    const valid: FilePreview[] = selected
      .filter(f => f.type.startsWith('image/') && f.size <= MAX_SIZE_BYTES)
      .map(f => ({ file: f, preview: URL.createObjectURL(f), sku: '', alt_text: '', uso: 'galeria_secundaria', es_principal: false, status: 'pending' as const }))
    setFiles(valid)
    setStep(2)
    runDetectionForFiles(valid)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Handlers para modo Excel/CSV ────────────────────────────────────────

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data as any[]).filter((r: any) => r.sku && r.url)
        if (rows.length === 0) {
          setError('El CSV debe tener columnas "sku" y "url" con datos')
          return
        }
        setCsvText(rows.map(r => `${r.sku},${r.url}`).join('\n'))
        parseCsvRowsFromText()
      },
      error: (err) => setError(err.message),
    })
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const downloadCsvTemplate = () => {
    const template = 'sku,url,es_principal,alt_text,uso\nAND250016,https://ejemplo.com/imagen.jpg,true,Imagen principal,principal_ecommerce\nJA2517HC,https://ejemplo.com/otra.jpg,false,,galeria_secundaria\n'
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plantilla_imagenes.csv'
    link.click()
  }

  const parseCsvRowsFromText = () => {
    const lines = csvText.split('\n').filter(l => l.trim())
    const parsed: typeof csvRows = lines.map(line => {
      const [sku = '', url = ''] = line.split(',').map(s => s.trim())
      return { sku, url, es_principal: false, alt_text: '', uso: 'galeria_secundaria', orden: 0, status: 'pending' as const }
    }).filter(r => r.sku && r.url)
    setCsvRows(parsed)
  }

  const resolveCsvSkus = async () => {
    const skus = csvRows.map(r => r.sku.toUpperCase()).filter(Boolean)
    if (skus.length === 0) return
    const matches = await buscarProductosPorSkuBatch(skus)
    const updated = csvRows.map(r => {
      const match = matches.get(r.sku.toUpperCase())
      return {
        ...r,
        productoId: match?.producto_id,
        productoNombre: match?.nombre ?? undefined,
        status: match ? 'found' as const : 'not_found' as const,
        alt_text: match?.nombre ? `Imagen de ${match.nombre}` : '',
      }
    })
    setCsvRows(updated)
  }

  const handleCsvImport = () => {
    const validRows = csvRows.filter(r => r.status === 'found')
    if (validRows.length === 0) { setError('No hay filas con SKU válido'); return }
    startTransition(async () => {
      const result = await importarImagenesDesdeExcelAction(
        validRows.map(r => ({
          sku: r.sku,
          url: r.url,
          es_principal: r.es_principal,
          alt_text: r.alt_text,
          uso: r.uso,
          orden: r.orden,
        }))
      )
      if (result.success > 0) toast.success(`${result.success} imagen${result.success > 1 ? 'es' : ''} importada${result.success > 1 ? 's' : ''}`)
      if (result.failed > 0) toast.error(`${result.failed} fallaron`)
      handleClose()
    })
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const next = [...prev]
      URL.revokeObjectURL(next[index].preview)
      next.splice(index, 1)
      return next
    })
  }

  const handleClose = () => {
    files.forEach(f => URL.revokeObjectURL(f.preview))
    setFiles([])
    setCsvRows([])
    setCsvText('')
    setStep(1)
    setError(null)
    onOpenChange(false)
  }

  const handleBack = () => {
    if (step === 2) setStep(1)
    else handleClose()
  }

  const allValid = files.length > 0 && files.every(f => f.status === 'detected' || f.status === 'assigned')

  const handleUpload = () => {
    if (!allValid) { setError('Todas las imágenes deben tener un SKU válido'); return }
    startTransition(async () => {
      setError(null)
      setUploadProgress({ current: 0, total: files.length, name: 'Iniciando subida...' })

      let successCount = 0
      let failCount = 0

      // Subir en paralelo limitado (PARALLEL_UPLOADS a la vez)
      for (let i = 0; i < files.length; i += PARALLEL_UPLOADS) {
        const batch = files.slice(i, i + PARALLEL_UPLOADS)
        const results = await Promise.allSettled(
          batch.map(async (f) => {
            const formData = new FormData()
            formData.append('file', f.file)
            formData.append('producto_id', String(f.productoId))
            formData.append('sku_base', f.sku)
            formData.append('alt_text', f.alt_text)
            formData.append('uso_imagen', f.uso)
            formData.append('es_principal', String(f.es_principal))
            return uploadSingleImagenConSkuAction(formData)
          })
        )
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.success) successCount++
          else failCount++
        }
        setUploadProgress({
          current: Math.min(i + PARALLEL_UPLOADS, files.length),
          total: files.length,
          name: batch.map(f => f.file.name).join(', '),
        })
      }

      setUploadProgress(null)
      if (successCount > 0) toast.success(`${successCount} imagen${successCount > 1 ? 'es' : ''} subida${successCount > 1 ? 's' : ''} con éxito.`)
      if (failCount > 0) toast.error(`${failCount} imagen${failCount > 1 ? 'es' : ''} fallaron.`)
      handleClose()
    })
  }

  if (!open) return null

  const detected = files.filter(f => f.status === 'detected' || f.status === 'assigned').length
  const pending = files.filter(f => f.status === 'not_found' || f.status === 'pending').length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 overflow-hidden border bg-background [&>button]:hidden"
        style={{ maxWidth: '96vw', width: '1100px', maxHeight: '92vh', height: '88vh', display: 'flex', flexDirection: 'column' }}
        aria-describedby={undefined}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
          <button onClick={handleBack} className="p-1.5 rounded hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
          <DialogTitle className="text-lg font-bold flex-1">
            {mode === 'files'
              ? step === 1 ? 'Paso 1 — Seleccionar imágenes' : `Paso 2 — Asignar SKUs (${files.length})`
              : step === 1 ? 'Paso 1 — Pegar CSV con URLs' : `Paso 2 — Revisar (${csvRows.length} filas)`}
          </DialogTitle>
          {/* Indicador de pasos */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>1</span>
            <ChevronRight className="h-4 w-4" />
            <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>2</span>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        {uploadProgress && (
          <div className="bg-primary/5 border-b px-5 py-2.5 shrink-0 space-y-1.5 animate-in fade-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-primary animate-pulse">Subiendo archivo {uploadProgress.current} de {uploadProgress.total}...</span>
              <span className="text-muted-foreground truncate max-w-[250px]">{uploadProgress.name}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mx-5 mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive flex items-center gap-2 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Contenido ── */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {/* PASO 1 */}
          {step === 1 && mode === 'files' && (
            <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto">
              <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold">¿Cómo funciona?</p>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Sube hasta 25 imágenes desde tu equipo (PNG, JPG, WebP, máx. 5 MB c/u)</li>
                  <li>• El sistema detectará el SKU desde el nombre del archivo automáticamente</li>
                  <li>• En el paso 2 podrás corregir o asignar el producto manualmente</li>
                </ul>
              </div>

              {files.length > 0 ? (
                <>
                  <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-lg border overflow-hidden group bg-muted">
                        <Image src={f.preview} alt={f.file.name} fill unoptimized className="object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5">
                          <span className="text-[8px] text-white block truncate">{f.file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {files.length < MAX_FILES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 hover:bg-muted/40 transition-all"
                      >
                        <Upload className="h-5 w-5 mb-1 opacity-50" />
                        <span className="text-[9px]">Agregar</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{files.length} imágenes seleccionadas</p>
                </>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all text-muted-foreground"
                >
                  <ImageIcon className="h-14 w-14 opacity-30" />
                  <div className="text-center">
                    <p className="font-semibold text-base">Haz clic para seleccionar imágenes</p>
                    <p className="text-xs opacity-70 mt-1">PNG, JPG, WebP · Máx 5 MB · Hasta 25 archivos</p>
                  </div>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* PASO 1 — Excel/CSV */}
          {step === 1 && mode === 'excel' && (
            <div className="h-full flex flex-col p-6 gap-4">
              {/* Encabezado tipo tarjeta */}
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-lg">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Importar imágenes desde URLs</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pegá un CSV con <strong>sku,url</strong> por línea o subí un archivo
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                    <Download className="h-4 w-4 mr-1.5" /> Plantilla
                  </Button>
                </div>
              </div>

              {/* Botón subir CSV grande */}
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  className="h-12 px-8 text-base gap-3"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-5 w-5" />
                  Subir archivo CSV
                </Button>
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFileChange} />
              </div>

              {/* Zona de pegado directo */}
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between shrink-0 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    O pegalo directamente aquí:
                  </span>
                  {csvText.trim() && (
                    <span className="text-xs text-muted-foreground">
                      {csvText.split('\n').filter(l => l.trim()).length} líneas
                    </span>
                  )}
                </div>
                <Textarea
                  placeholder={`sku,url\nAND250016,https://ejemplo.com/imagen.jpg\nJA2517HC,https://ejemplo.com/otra.jpg`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  className="flex-1 min-h-[120px] font-mono text-xs resize-none"
                />
              </div>
            </div>
          )}

          {/* PASO 2 — Files */}
          {step === 2 && mode === 'files' && (
            <div className="h-full flex flex-col">
              {/* Sub-header stats */}
              <div className="flex items-center gap-4 px-5 py-2 border-b bg-muted/20 shrink-0 text-xs flex-wrap">
                {detecting && (
                  <span className="flex items-center gap-1 text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Detectando SKUs...{detectionProgress ? ` ${detectionProgress.current}/${detectionProgress.total}` : ''}
                  </span>
                )}
                <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" />{detected} detectadas</span>
                <span className="flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />{pending} sin SKU</span>
                <div className="ml-auto">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setFiles(f => f.map(i => ({...i, es_principal: i.status === 'detected' || i.status === 'assigned'})))}>
                    <Check className="h-3 w-3 mr-1" />Hacer principales todas
                  </Button>
                </div>
              </div>

              {/* Grid scrolleable */}
              <div className="flex-1 overflow-auto p-4">
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
                >
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded-xl border-2 flex flex-col overflow-hidden bg-card',
                        f.status === 'detected' || f.status === 'assigned'
                          ? 'border-green-400/60'
                          : 'border-red-400/60'
                      )}
                    >
                      {/* Imagen contenida */}
                      <div className="relative w-full aspect-[4/3] bg-muted shrink-0 overflow-hidden">
                        <Image
                          src={f.preview}
                          alt={f.file.name}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                        {f.es_principal && (
                          <div className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-[10px] font-bold rounded px-2 py-0.5">
                            ★ Principal
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-2 right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1">
                          <span className="text-[9px] text-white block truncate">{f.file.name}</span>
                        </div>
                      </div>

                      {/* Controles */}
                      <div className="p-3 space-y-2 flex flex-col flex-1">
                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">SKU Producto</Label>
                          <BuscadorSku
                            value={f.sku}
                            onChange={(sku) => handleSkuChange(i, sku)}
                            status={f.status}
                          />
                        </div>

                        {f.productoNombre && (
                          <p className="text-[10px] text-green-700 dark:text-green-400 font-medium truncate bg-green-50 dark:bg-green-950/30 rounded px-2 py-1">
                            {f.productoNombre}
                          </p>
                        )}
                        {f.status === 'not_found' && f.sku && (
                          <p className="text-[10px] text-red-500 font-medium">SKU no encontrado</p>
                        )}

                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Uso</Label>
                          <Select value={f.uso} onValueChange={(v) => { const u = [...files]; u[i].uso = v ?? 'galeria_secundaria'; setFiles(u) }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="galeria_principal">Galería Principal</SelectItem>
                              <SelectItem value="galeria_secundaria">Galería Secundaria</SelectItem>
                              <SelectItem value="thumbnails">Thumbnail</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Alt Text</Label>
                          <Input
                            value={f.alt_text}
                            onChange={(e) => { const u = [...files]; u[i].alt_text = e.target.value; setFiles(u) }}
                            placeholder="Descripción de la imagen..."
                            className="h-7 text-xs"
                          />
                        </div>

                        <label className="flex items-center gap-2 text-xs cursor-pointer font-medium mt-auto pt-1">
                          <input
                            type="checkbox"
                            checked={f.es_principal}
                            onChange={() => { const u = [...files]; u[i].es_principal = !u[i].es_principal; setFiles(u) }}
                            className="h-3.5 w-3.5"
                          />
                          <span>Marcar como principal</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2 — Excel/CSV */}
          {step === 2 && mode === 'excel' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-4 px-5 py-2 border-b bg-muted/20 shrink-0 text-xs flex-wrap">
                <span className="flex items-center gap-1 text-green-600"><Check className="h-3 w-3" />{csvRows.filter(r => r.status === 'found').length} encontrados</span>
                <span className="flex items-center gap-1 text-red-500"><AlertCircle className="h-3 w-3" />{csvRows.filter(r => r.status === 'not_found').length} sin SKU</span>
                {csvRows.filter(r => r.status === 'pending').length > 0 && (
                  <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={resolveCsvSkus}>
                    <Search className="h-3 w-3 mr-1" />Resolver SKUs
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5 text-left">SKU</th>
                        <th className="px-3 py-2.5 text-left">URL</th>
                        <th className="px-3 py-2.5 text-left">Producto</th>
                        <th className="px-3 py-2.5 text-center w-20">Principal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {csvRows.map((r, i) => (
                        <tr key={i} className={cn(
                          'hover:bg-muted/30 transition-colors',
                          r.status === 'found' ? '' : 'opacity-50'
                        )}>
                          <td className="px-3 py-2 font-mono text-xs">{r.sku}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[300px]" title={r.url}>{r.url}</td>
                          <td className="px-3 py-2 text-xs">
                            {r.status === 'found' ? (
                              <span className="text-green-600 font-medium">{r.productoNombre}</span>
                            ) : r.status === 'not_found' ? (
                              <span className="text-red-500">SKU no encontrado</span>
                            ) : (
                              <span className="text-muted-foreground">Pendiente</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={r.es_principal}
                              onChange={() => {
                                const updated = [...csvRows]
                                updated[i] = { ...updated[i], es_principal: !updated[i].es_principal }
                                setCsvRows(updated)
                              }}
                              className="h-3.5 w-3.5"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t bg-background">
          <Button variant="outline" onClick={handleBack} disabled={isPending}>
            {step === 1 ? 'Cancelar' : '← Volver'}
          </Button>
          <div className="flex items-center gap-2">
            {step === 1 && mode === 'files' && (
              <Button onClick={() => {
                if (files.length === 0) {
                  fileInputRef.current?.click()
                } else {
                  setStep(2)
                  if (files[0] && files[0].status === 'pending') {
                    runDetectionForFiles(files)
                  }
                }
              }} disabled={false}>
                {files.length === 0 ? 'Seleccionar imágenes' : `Continuar con ${files.length} imagen${files.length !== 1 ? 'es' : ''} →`}
              </Button>
            )}
            {step === 1 && mode === 'excel' && (
              <Button onClick={() => { parseCsvRowsFromText(); setStep(2) }} disabled={!csvText.trim()}>
                {`Revisar ${csvText.split('\n').filter(l => l.trim()).length} filas →`}
              </Button>
            )}
            {step === 2 && mode === 'files' && (
              <Button onClick={handleUpload} disabled={isPending || !allValid || files.length === 0}>
                {isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Subiendo...</>
                  : <><Upload className="h-4 w-4 mr-2" />Subir {files.length} imagen{files.length !== 1 ? 'es' : ''}</>
                }
              </Button>
            )}
            {step === 2 && mode === 'excel' && (
              <Button onClick={handleCsvImport} disabled={isPending || csvRows.filter(r => r.status === 'found').length === 0}>
                {isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
                  : <><Upload className="h-4 w-4 mr-2" />Importar {csvRows.filter(r => r.status === 'found').length} imagen{ csvRows.filter(r => r.status === 'found').length !== 1 ? 'es' : ''}</>
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
