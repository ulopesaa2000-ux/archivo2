// app/(admin)/catalogo/imagenes/components/ImportarMasivoModal.tsx
'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { Upload, X, ImageIcon, Loader2, Check, AlertCircle, Search, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedCallback } from 'use-debounce'
import { buscarProductosParaSelector } from '@/modules/catalogo/imagenes/queries'
import { uploadImagenesConSkuAction } from '@/modules/catalogo/imagenes/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'files' | 'excel'
}

const MAX_FILES = 20
const MAX_SIZE_BYTES = 5 * 1024 * 1024

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

// ─── SKU Matching ─────────────────────────────────────────────────────────────
type SkuRecord = { id: number; sku_base: string; nombre: string }

/** Normaliza para comparar: minúsculas, _ y - → /, sin espacios */
function normalizeSku(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, '/').replace(/\s+/g, '')
}

/**
 * Busca el mejor match de SKU para un nombre de archivo.
 *
 * Estrategias (en orden de prioridad):
 * 1. Coincidencia exacta normalizada (JA25_17HC -> JA25/17HC)
 * 2. Si hay _ o - en el nombre del archivo:
 *    2a. Filtrar SKUs donde la parte DESPUES del / coincida (optimización de lista)
 *    2b. De SKUs filtrados, buscar la mejor coincidencia con la parte ANTES del /
 *    2c. Reconstruir PARTE1/PARTE2 y buscar exacto (compatibilidad)
 *    2d. Filtrar por prefijo de parte1 y refinar con parte2 (fallback)
 * 3. Prefijo simple del nombre completo (último recurso)
 */
function findBestSkuMatch(filename: string, allSkus: SkuRecord[]): SkuRecord | null {
  const nameRaw = filename.replace(/\.[^.]+$/, '').trim()
  const nameNorm = normalizeSku(nameRaw)

  // 1. Exacto
  const exact = allSkus.find(s => normalizeSku(s.sku_base) === nameNorm)
  if (exact) return exact

  // Detectar separador _ o - en el nombre del archivo
  const sep = nameRaw.match(/^([A-Z0-9]+)[_\-]([A-Z0-9].*)$/i)
  if (sep) {
    const part1 = sep[1].toUpperCase()  // ej: JA25
    const part2 = sep[2].toUpperCase()  // ej: 17HC

    // 2a. OPTIMIZACIÓN: Filtrar SKUs donde la parte DESPUES del / coincida con part2
    // Esto acorta drásticamente la lista para paso 2b
    let filteredBySuffix = allSkus.filter(s => {
      const slashParts = s.sku_base.split('/')
      if (slashParts.length < 2) return false
      // La parte final del SKU después del último /
      const skuAfterSlash = slashParts[slashParts.length - 1].toUpperCase().trim()
      const searchPart2 = part2.trim()
      return skuAfterSlash === searchPart2 ||
             skuAfterSlash.startsWith(searchPart2) ||
             searchPart2.startsWith(skuAfterSlash)
    })

    // 2b. De la lista filtrada, usar fuzzy match en la parte ANTES del /
    if (filteredBySuffix.length > 0) {
      // Primero buscar exacto en la parte anterior del /
      const exactPrefix = filteredBySuffix.find(s => {
        const skuParts = s.sku_base.split('/')
        return skuParts[0].toUpperCase().trim() === part1
      })
      if (exactPrefix) return exactPrefix

      // Luego buscar fuzzy (similar, empieza con...)
      // Usar fuzzy matching heurístico para mejorar coincidencias
      const prefixSearched = sanitized(part1)
      for (const s of filteredBySuffix) {
        if (fuzzyMatchPrefix(prefixSearched, sanitized(s.sku_base.split('/')[0] ?? ''))) {
          return s
        }
      }

      // Si solo es uno, retornarlo (confianza alta por coincidencia de sufijo)
      if (filteredBySuffix.length === 1) return filteredBySuffix[0]

      // Si son varios, retornar el primero con mayor longitud de coincidencia
      if (filteredBySuffix.length > 1) return filteredBySuffix[0]
    }

    // 2c. Reconstruir con / y buscar (estrategia anterior para compatibilidad)
    const withSlash = allSkus.find(s => normalizeSku(s.sku_base) === normalizeSku(`${part1}/${part2}`))
    if (withSlash) return withSlash

    // 2d. Prefijo parte1, afinar con parte2 (fallback tradicional)
    const byPrefix = allSkus.filter(s => normalizeSku(s.sku_base).startsWith(normalizeSku(part1)))
    if (byPrefix.length === 1) return byPrefix[0]
    if (byPrefix.length > 1) {
      const refined = byPrefix.filter(s => {
        const afterSlash = normalizeSku(s.sku_base.split('/')[1] ?? '')
        return afterSlash.includes(normalizeSku(part2))
      })
      if (refined.length >= 1) return refined[0]
      return byPrefix[0]
    }
  }

  // 3. Prefijo simple (mínimo 4 chars)
  if (nameRaw.length >= 4) {
    const prefix6 = normalizeSku(nameRaw.slice(0, 6))
    const bySimplePrefix = allSkus.filter(s => normalizeSku(s.sku_base).startsWith(prefix6))
    if (bySimplePrefix.length === 1) return bySimplePrefix[0]
  }

  return null
}

/** Remueve tildes y caracteres diacríticos + to upper */
function sanitized(texto: string): string {
  const treated = texto
    .toUpperCase()
    .replace(/[ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛ]/g, c => {
      return { 'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','À':'A','È':'E','Ì':'I','Ò':'O','Ù':'U','Ä':'A','Ë':'E','Ï':'I','Ö':'O','Ü':'U','Â':'A','Ê':'E','Î':'I','Ô':'O','Û':'U' }[c] ?? c
    })
  return treated
}

/** Heurística de fuzzy matching para prefijos: levenshtein básico o similaridad */
function fuzzyMatchPrefix(search: string, target: string): boolean {
  if (search === target) return true
  if (target.startsWith(search)) return true
  if (search.startsWith(target)) return true
  // Levenshtein tolerancia: si difieren por menos de 30% de sus longitudes
  const dist = levenshteinDistance(search, target)
  const maxLen = Math.max(search.length, target.length)
  if (maxLen === 0) return true
  return dist / maxLen < 0.3
}

/** Calcula la distancia de Levenshtein entre dos cadenas */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function ImportarMasivoModal({ open, onOpenChange, mode }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const [files, setFiles] = useState<FilePreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  // Cache de todos los SKUs: se carga UNA sola vez (1 query) al entrar al paso 2
  const allSkusRef = useRef<SkuRecord[]>([])

  const loadAllSkus = async (): Promise<SkuRecord[]> => {
    if (allSkusRef.current.length > 0) return allSkusRef.current
    const supabase = createClient()
    const { data } = await (supabase.from('productos') as any)
      .select('id, sku_base, nombre')
      .eq('activo', true)
      .order('sku_base')
    allSkusRef.current = data ?? []
    return allSkusRef.current
  }

  const runDetection = async () => {
    setDetecting(true)
    try {
      const skus = await loadAllSkus()
      const updated = files.map(f => {
        const match = findBestSkuMatch(f.file.name, skus)
        if (match) {
          return { ...f, sku: match.sku_base, productoId: match.id, productoNombre: match.nombre, alt_text: `Imagen de ${match.nombre}`, status: 'detected' as const, es_principal: true }
        }
        // Sin match: pre-rellenar SKU limpio para que el usuario lo corrija
        const cleaned = f.file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, '/').toUpperCase()
        return { ...f, sku: cleaned, status: 'not_found' as const, es_principal: false }
      })
      setFiles(updated)
    } catch (e) { console.error(e) }
    finally { setDetecting(false) }
  }

  useEffect(() => {
    if (step === 2 && files.length > 0 && files[0].status === 'pending') runDetection()
  }, [step])

  const handleSkuChange = async (index: number, newSku: string) => {
    const updated = [...files]
    updated[index].sku = newSku.toUpperCase()
    if (!newSku) {
      updated[index].status = 'pending'
      updated[index].productoId = undefined
      updated[index].productoNombre = undefined
    } else {
      // Usar cache local — sin nueva query a BD
      const skus = await loadAllSkus()
      const match = skus.find(s => normalizeSku(s.sku_base) === normalizeSku(newSku))
      if (match) {
        updated[index].status = 'assigned'
        updated[index].productoId = match.id
        updated[index].productoNombre = match.nombre
        updated[index].alt_text = `Imagen de ${match.nombre}`
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
    if (selected.length > MAX_FILES) { setError(`Máximo ${MAX_FILES} imágenes`); return }
    const valid: FilePreview[] = selected
      .filter(f => f.type.startsWith('image/') && f.size <= MAX_SIZE_BYTES)
      .map(f => ({ file: f, preview: URL.createObjectURL(f), sku: '', alt_text: '', uso: 'galeria_secundaria', es_principal: false, status: 'pending' as const }))
    setFiles(valid)
    setStep(2)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
      const result = await uploadImagenesConSkuAction(
        files.map(f => ({ file: f.file, producto_id: f.productoId!, sku_base: f.sku, alt_text: f.alt_text, uso_imagen: f.uso, orden: 0, es_principal: f.es_principal }))
      )
      if (result.success > 0) toast.success(`${result.success} imagen${result.success > 1 ? 'es' : ''} subida${result.success > 1 ? 's' : ''}`)
      if (result.failed > 0) toast.error(`${result.failed} fallaron`)
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
            {step === 1 ? 'Paso 1 — Seleccionar imágenes' : `Paso 2 — Asignar SKUs (${files.length})`}
          </DialogTitle>
          {/* Indicador de pasos */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>1</span>
            <ChevronRight className="h-4 w-4" />
            <span className={cn('px-2.5 py-1 rounded-full font-semibold text-xs', step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted')}>2</span>
          </div>
        </div>

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
          {step === 1 && (
            <div className="h-full flex flex-col p-6 gap-4 overflow-y-auto">
              <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold">¿Cómo funciona?</p>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Sube hasta {MAX_FILES} imágenes desde tu equipo (PNG, JPG, WebP, máx. 5 MB c/u)</li>
                  <li>• El sistema detectará el SKU desde el nombre del archivo automáticamente</li>
                  <li>• En el paso 2 podrás corregir o asignar el producto manualmente</li>
                </ul>
              </div>

              {files.length > 0 ? (
                <>
                  <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-lg border overflow-hidden group bg-muted">
                        <img src={f.preview} alt={f.file.name} className="w-full h-full object-cover" />
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
                  <p className="text-xs text-muted-foreground">{files.length} / {MAX_FILES} imágenes seleccionadas</p>
                </>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all text-muted-foreground"
                >
                  <ImageIcon className="h-14 w-14 opacity-30" />
                  <div className="text-center">
                    <p className="font-semibold text-base">Haz clic para seleccionar imágenes</p>
                    <p className="text-xs opacity-70 mt-1">PNG, JPG, WebP · Máx 5 MB · Hasta {MAX_FILES} archivos</p>
                  </div>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
            </div>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="h-full flex flex-col">
              {/* Sub-header stats */}
              <div className="flex items-center gap-4 px-5 py-2 border-b bg-muted/20 shrink-0 text-xs flex-wrap">
                {detecting && <span className="flex items-center gap-1 text-blue-600"><Loader2 className="h-3 w-3 animate-spin" />Detectando SKUs...</span>}
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
                        <img
                          src={f.preview}
                          alt={f.file.name}
                          className="absolute inset-0 w-full h-full object-contain"
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
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t bg-background">
          <Button variant="outline" onClick={handleBack} disabled={isPending}>
            {step === 1 ? 'Cancelar' : '← Volver'}
          </Button>
          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button onClick={() => { if (files.length === 0) { fileInputRef.current?.click() } else setStep(2) }} disabled={false}>
                {files.length === 0 ? 'Seleccionar imágenes' : `Continuar con ${files.length} imagen${files.length !== 1 ? 'es' : ''} →`}
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleUpload} disabled={isPending || !allValid || files.length === 0}>
                {isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Subiendo...</>
                  : <><Upload className="h-4 w-4 mr-2" />Subir {files.length} imagen{files.length !== 1 ? 'es' : ''}</>
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BuscadorSku({ value, onChange, status }: { value: string; onChange: (sku: string) => void; status: string }) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [results, setResults] = useState<{ id: number; sku_base: string; nombre: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  // Sincronizar cuando el padre actualiza el valor (ej: detección automática)
  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  const search = useDebouncedCallback(async (term: string) => {
    if (term.length < 2) { setResults([]); return }
    setLoading(true)
    const prods = await buscarProductosParaSelector(term, 10)
    setResults(prods)
    setLoading(false)
  }, 300)

  // Solo buscar en dropdown cuando el usuario escribe (no en auto-detección)
  const [userTyped, setUserTyped] = useState(false)
  useEffect(() => { if (userTyped) search(searchTerm) }, [searchTerm, userTyped])

  const handleSelect = (p: { sku_base: string }) => {
    setSearchTerm(p.sku_base)
    onChange(p.sku_base)
    setShowDropdown(false)
    setResults([])
  }

  const isError = status === 'not_found' || status === 'pending'

  return (
    <div className="relative">
      <Input
        value={searchTerm}
        onChange={(e) => { setUserTyped(true); setSearchTerm(e.target.value); onChange(e.target.value); setShowDropdown(true) }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Buscar SKU..."
        className={cn('h-7 text-xs pr-7', isError ? 'border-red-400 border-2 focus-visible:ring-red-300' : '')}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <Search className="h-3 w-3 text-muted-foreground" />}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs"
            >
              <span className="font-mono font-bold">{p.sku_base}</span>
              <span className="text-muted-foreground ml-2 truncate">- {p.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}