// components/admin/inventario/PasteExcelProductosModal.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Package,
  Layers,
  ArrowDown,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  resolverProductosPegadosAction,
  type ResolvedProductoPegado,
} from '@/modules/inventario/actions'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bodegaOrigenId: number | null
  onApplyProducts: (
    productos: ResolvedProductoPegado[],
    modoFusion: 'sumar' | 'anexar'
  ) => void
}

type ParsedRow = {
  sku: string
  cajas: number
}

export function PasteExcelProductosModal({
  open,
  onOpenChange,
  bodegaOrigenId,
  onApplyProducts,
}: Props) {
  const [rawText, setRawText] = useState('')
  const [isResolving, startResolveTransition] = useTransition()
  const [encontrados, setEncontrados] = useState<ResolvedProductoPegado[]>([])
  const [noEncontrados, setNoEncontrados] = useState<Array<{ sku: string; cajas: number }>>([])
  const [modoFusion, setModoFusion] = useState<'sumar' | 'anexar'>('sumar')
  const [hasResolved, setHasResolved] = useState(false)

  // Parser de líneas desde texto copiado de Excel / hojas de cálculo
  const parsePastedContent = useCallback((text: string): ParsedRow[] => {
    const clean = text.trim()
    if (!clean) return []

    const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    const rows: ParsedRow[] = []

    // Palabras reservadas de encabezado típicas para omitir automáticamente
    const headerKeywords = ['sku', 'código', 'codigo', 'estilo', 'cajas', 'cantidad', 'qty', 'piezas', 'modelo']

    for (const line of lines) {
      // Separar por tabulador (Excel), punto y coma, coma, o espacios múltiples
      let parts: string[] = []
      if (line.includes('\t')) {
        parts = line.split('\t').map((p) => p.trim())
      } else if (line.includes(';')) {
        parts = line.split(';').map((p) => p.trim())
      } else if (line.includes(',')) {
        parts = line.split(',').map((p) => p.trim())
      } else {
        parts = line.split(/\s+/).map((p) => p.trim())
      }

      parts = parts.filter(Boolean)
      if (parts.length === 0) continue

      const col0 = parts[0].toLowerCase()
      const isHeader = headerKeywords.some((k) => col0 === k || col0.includes('sku') || col0.includes('codigo'))
      if (isHeader && parts.length > 1 && isNaN(Number(parts[1]))) {
        continue // Omitir fila de encabezado
      }

      const sku = parts[0].trim()
      let cajas = 1

      if (parts.length >= 2) {
        // Limpiar caracteres extraños en la cantidad (como comas o signos)
        const cleanedQty = parts[1].replace(/,/g, '').trim()
        const parsedQty = parseFloat(cleanedQty)
        if (!isNaN(parsedQty) && parsedQty > 0) {
          cajas = parsedQty
        }
      }

      if (sku) {
        rows.push({ sku, cajas })
      }
    }

    return rows
  }, [])

  // Resolver en base de datos
  const handleResolve = useCallback(
    (textToProcess: string) => {
      const parsed = parsePastedContent(textToProcess)
      if (parsed.length === 0) {
        toast.error('No se detectaron filas válidas con SKU y Cajas.')
        return
      }

      startResolveTransition(async () => {
        try {
          const res = await resolverProductosPegadosAction(parsed, bodegaOrigenId)
          setEncontrados(res.encontrados)
          setNoEncontrados(res.noEncontrados)
          setHasResolved(true)

          if (res.encontrados.length > 0) {
            toast.success(
              `Se identificaron ${res.encontrados.length} producto${
                res.encontrados.length === 1 ? '' : 's'
              } en la base de datos.`
            )
          } else {
            toast.error('Ninguno de los SKUs ingresados fue encontrado en la base de datos.')
          }
        } catch (err: any) {
          console.error('Error al resolver productos:', err)
          toast.error(`Error al cotejar productos: ${err.message || 'Error desconocido'}`)
        }
      })
    },
    [bodegaOrigenId, parsePastedContent]
  )

  // Pegar directamente desde portapapeles vía API
  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText()
        if (text && text.trim()) {
          setRawText(text)
          handleResolve(text)
          return
        }
      }
      toast.info('Pega el texto directamente en el cuadro con Ctrl + V.')
    } catch {
      toast.info('No se pudo leer el portapapeles automáticamente. Pégalo con Ctrl + V.')
    }
  }

  // Limpiar formulario
  const handleClear = () => {
    setRawText('')
    setEncontrados([])
    setNoEncontrados([])
    setHasResolved(false)
  }

  // Confirmar y aplicar a la nota
  const handleConfirmApply = () => {
    if (encontrados.length === 0) {
      toast.error('No hay productos válidos para agregar.')
      return
    }

    onApplyProducts(encontrados, modoFusion)
    onOpenChange(false)
    handleClear()
  }

  const totalCajasEncontradas = encontrados.reduce((acc, p) => acc + p.cajas, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-full max-w-full sm:max-w-4xl p-0 overflow-hidden border shadow-2xl rounded-2xl bg-card'
        )}
      >
        {/* Encabezado */}
        <div className="p-5 border-b bg-gradient-to-r from-muted/30 via-background to-muted/20">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ClipboardPaste className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  Pegar Productos desde Excel / Portapapeles
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Copia las columnas de <strong>SKU</strong> y <strong>Cajas</strong> desde tu hoja de cálculo y pégalas aquí.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Barra de herramientas y pegar directo */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePasteFromClipboard}
              disabled={isResolving}
              className="font-bold text-xs gap-1.5 rounded-xl shadow-xs"
            >
              <ClipboardPaste className="h-4 w-4" />
              Pegar desde Portapapeles
            </Button>

            <div className="flex items-center gap-2">
              {rawText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={isResolving}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 rounded-xl"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleResolve(rawText)}
                disabled={isResolving || !rawText.trim()}
                className="font-bold text-xs gap-1.5 rounded-xl border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cotejando con BD...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Cotejar SKUs
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Área de texto para pegar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">Texto copiado (SKU y Cajas):</span>
              <span className="text-[11px] font-mono">Formato: [SKU] [TAB o Espacio] [Cajas]</span>
            </div>
            <Textarea
              rows={4}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value)
                setHasResolved(false)
              }}
              onPaste={(e) => {
                // Al pegar manualmente, procesar automáticamente después de un instante
                const pasted = e.clipboardData.getData('text')
                if (pasted && pasted.trim()) {
                  setTimeout(() => handleResolve(pasted), 100)
                }
              }}
              placeholder={`Ejemplo copiado desde Excel:\nMC7005\t5\nMC7006\t10\nMC7007\t3`}
              className="font-mono text-xs rounded-xl bg-muted/20 border-muted focus-visible:ring-primary leading-relaxed"
            />
          </div>

          {/* Estado de resolución / Resultados */}
          {isResolving && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs font-semibold">Buscando productos y existencias en la base de datos...</p>
            </div>
          )}

          {!isResolving && hasResolved && (
            <div className="space-y-3 animate-in fade-in-50 duration-200">
              {/* Resumen de detección */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {encontrados.length}
                    </div>
                    <div className="text-[11px] text-emerald-800/80 dark:text-emerald-400 font-semibold">
                      Productos Encontrados
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border bg-primary/10 border-primary/20 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 text-primary shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-primary">
                      {totalCajasEncontradas}
                    </div>
                    <div className="text-[11px] text-primary/80 font-semibold">
                      Total Cajas a Importar
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-300">
                      {noEncontrados.length}
                    </div>
                    <div className="text-[11px] text-amber-800/80 dark:text-amber-400 font-semibold">
                      SKUs No Encontrados
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta de SKUs no encontrados si existen */}
              {noEncontrados.length > 0 && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Los siguientes SKUs no existen en el catálogo y serán omitidos:
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {noEncontrados.map((item, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30"
                      >
                        {item.sku} ({item.cajas} cjs)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabla de Productos Encontrados */}
              {encontrados.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                    <span>Lista de productos a agregar:</span>
                    {bodegaOrigenId ? (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        ● Existencias verificadas en bodega seleccionada
                      </span>
                    ) : (
                      <span className="text-[11px] text-orange-600 font-semibold">
                        * Selecciona bodega de origen para verificar stock en vivo
                      </span>
                    )}
                  </div>

                  <div className="border rounded-xl overflow-hidden shadow-xs max-h-[260px] overflow-y-auto bg-background">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/60 text-muted-foreground font-bold text-[11px] sticky top-0 z-10 border-b">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">SKU Base</th>
                          <th className="py-2.5 px-3">Descripción</th>
                          <th className="py-2.5 px-3 text-center">Pz/Caja</th>
                          <th className="py-2.5 px-3 text-right">Cajas</th>
                          {bodegaOrigenId && <th className="py-2.5 px-3 text-right">Stock Actual</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted/40">
                        {encontrados.map((item, index) => (
                          <tr key={index} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-primary">
                              {item.sku_base}
                              {item.sku_ingresado !== item.sku_base && (
                                <span className="text-[10px] text-muted-foreground block font-normal">
                                  ({item.sku_ingresado})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium truncate max-w-[220px]">
                              {item.nombre || '—'}
                            </td>
                            <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                              {item.pz_en_caja ? `${item.pz_en_caja} pz` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-foreground">
                              {item.cajas}
                            </td>
                            {bodegaOrigenId && (
                              <td className="py-2 px-3 text-right font-mono font-bold text-muted-foreground">
                                {item.stock_origen_cajas} cjs
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Selector de modo de fusión */}
              <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Si un SKU ya está en la nota:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModoFusion('sumar')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-bold border transition-all text-xs',
                      modoFusion === 'sumar'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted border-muted'
                    )}
                  >
                    Sumar cajas a la fila existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoFusion('anexar')}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-bold border transition-all text-xs',
                      modoFusion === 'anexar'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 text-muted-foreground hover:bg-muted border-muted'
                    )}
                  >
                    Agregar como fila nueva
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-semibold text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="default"
            disabled={encontrados.length === 0 || isResolving}
            onClick={handleConfirmApply}
            className="rounded-xl font-bold text-xs gap-1.5 shadow-md px-5"
          >
            <CheckCircle2 className="h-4 w-4" />
            Agregar {encontrados.length > 0 ? `${encontrados.length} Productos` : 'a la Nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
