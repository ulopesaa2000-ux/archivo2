// components/admin/ConciliadorAmpliadoStockModal.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Search,
  ArrowRight,
  Loader2,
  Box,
  Layers,
  Check,
  RefreshCw,
} from 'lucide-react'
import type { DraftProducto, ProductoSustitutoAmpliado, ProductoBusqueda } from '@/modules/inventario/types'
import { cn } from '@/lib/utils'

interface ConciliadorAmpliadoStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productos: DraftProducto[]
  bodegaOrigenId: number | null
  bodegaOrigenNombre?: string
  permitirStockNegativo?: boolean
  onReasignarProducto: (
    tempId: string,
    nuevoSustituto: ProductoSustitutoAmpliado | ProductoBusqueda,
    codigoOriginalFisico: string
  ) => void
}

export function ConciliadorAmpliadoStockModal({
  open,
  onOpenChange,
  productos,
  bodegaOrigenId,
  bodegaOrigenNombre = 'Bodega Origen',
  permitirStockNegativo = true,
  onReasignarProducto,
}: ConciliadorAmpliadoStockModalProps) {
  const [selectedTempId, setSelectedTempId] = useState<string | null>(null)
  const [sugerencias, setSugerencias] = useState<ProductoSustitutoAmpliado[]>([])
  const [isLoadingSugerencias, setIsLoadingSugerencias] = useState(false)
  const [errorSugerencias, setErrorSugerencias] = useState<string | null>(null)

  // Búsqueda manual complementaria
  const [manualSearchTerm, setManualSearchTerm] = useState('')
  const [manualResults, setManualResults] = useState<ProductoBusqueda[]>([])
  const [isSearchingManual, setIsSearchingManual] = useState(false)

  // Identificar productos con déficit o proyectados en saldo negativo
  const productosEvaluados = productos.map((p) => {
    const stockCajas = p.stock_origen_cajas ?? 0
    const tieneDeficit = p.cajas > stockCajas
    const estaReasignado = !!p.codigo_original && p.codigo_original !== p.producto_sku

    return {
      ...p,
      stockCajas,
      tieneDeficit,
      estaReasignado,
    }
  })

  // Seleccionar por defecto el primer producto con déficit al abrir
  useEffect(() => {
    if (open && productosEvaluados.length > 0) {
      const primerDeficit = productosEvaluados.find((p) => p.tieneDeficit)
      setSelectedTempId(primerDeficit ? primerDeficit.tempId : productosEvaluados[0].tempId)
    }
  }, [open])

  const selectedProduct = productosEvaluados.find((p) => p.tempId === selectedTempId)

  // Cargar sugerencias ampliadas para el producto seleccionado
  const fetchSugerencias = useCallback(async (prod: typeof selectedProduct) => {
    if (!prod || !bodegaOrigenId) {
      setSugerencias([])
      return
    }

    setIsLoadingSugerencias(true)
    setErrorSugerencias(null)
    setManualResults([])
    setManualSearchTerm('')

    try {
      const params = new URLSearchParams({
        bodega_id: String(bodegaOrigenId),
        producto_id: String(prod.producto_id),
        sku_base: prod.producto_sku,
        descripcion: prod.producto_nombre || '',
      })

      const res = await fetch(`/api/inventario/notas/nueva/similares-ampliado?${params.toString()}`)
      if (!res.ok) {
        throw new Error('No se pudieron obtener sustitutos similares.')
      }

      const data: ProductoSustitutoAmpliado[] = await res.json()
      setSugerencias(data)
    } catch (err: any) {
      console.error(err)
      setErrorSugerencias(err.message || 'Error consultando stock similar.')
      setSugerencias([])
    } finally {
      setIsLoadingSugerencias(false)
    }
  }, [bodegaOrigenId])

  useEffect(() => {
    if (selectedProduct && open) {
      fetchSugerencias(selectedProduct)
    }
  }, [selectedProduct?.tempId, open, fetchSugerencias])

  // Búsqueda manual en caso de no hallar coincidencia automática
  const handleManualSearch = async (q: string) => {
    setManualSearchTerm(q)
    if (q.trim().length < 2) {
      setManualResults([])
      return
    }

    setIsSearchingManual(true)
    try {
      const res = await fetch(`/api/inventario/notas/nueva/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setManualResults(data)
      } else {
        setManualResults([])
      }
    } catch {
      setManualResults([])
    } finally {
      setIsSearchingManual(false)
    }
  }

  const handleApplyReasignacion = (sustituto: ProductoSustitutoAmpliado | ProductoBusqueda) => {
    if (!selectedProduct) return
    const codigoFisico = selectedProduct.codigo_original || selectedProduct.producto_sku

    onReasignarProducto(selectedProduct.tempId, sustituto, codigoFisico)

    // Pasar automáticamente al siguiente producto con déficit si existe
    const siguientes = productosEvaluados.filter(
      (p) => p.tempId !== selectedProduct.tempId && p.tieneDeficit
    )
    if (siguientes.length > 0) {
      setSelectedTempId(siguientes[0].tempId)
    }
  }

  const getBadgeSimilitud = (tipo: ProductoSustitutoAmpliado['similitud_tipo']) => {
    switch (tipo) {
      case 'misma_raiz':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-black uppercase">
            🔥 Misma Raíz / Modelo
          </Badge>
        )
      case 'misma_familia':
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-black uppercase">
            🏷️ Misma Familia
          </Badge>
        )
      case 'descripcion_similar':
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-black uppercase">
            ✨ Descripción Coincidente
          </Badge>
        )
      default:
        return (
          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-black uppercase">
            📦 Misma Marca
          </Badge>
        )
    }
  }

  const totalDeficits = productosEvaluados.filter((p) => p.tieneDeficit).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[92vw] lg:max-w-[85vw] w-full h-[88vh] flex flex-col rounded-2xl p-5 gap-3">
        {/* Encabezado */}
        <DialogHeader className="pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-black uppercase tracking-tight">
                Paso 2: Conciliador de Stock y Reasignación por Familia
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={totalDeficits > 0 ? 'destructive' : 'secondary'} className="font-mono text-xs font-bold py-1">
                {totalDeficits > 0 ? `⚠️ ${totalDeficits} Producto(s) con Déficit` : '✅ Todos con Stock'}
              </Badge>
              <Badge variant="outline" className="font-mono text-xs font-bold py-1 hidden sm:inline-flex">
                Bodega: {bodegaOrigenNombre}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            Coteja los códigos solicitados contra los productos de la misma familia/modelo que tienen existencias reales en{' '}
            <strong>{bodegaOrigenNombre}</strong>. Al reasignar, el inventario se descontará del código con stock y se guardará el SKU físico como referencia original.
          </DialogDescription>
        </DialogHeader>

        {/* Cuerpo Principal a 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Columna Izquierda: Lista de productos en la nota (4 columnas) */}
          <div className="md:col-span-5 flex flex-col border rounded-xl bg-card overflow-hidden">
            <div className="p-2.5 bg-muted/40 border-b flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>PRODUCTOS EN LA NOTA ({productosEvaluados.length})</span>
              <span>SOLICITADAS / STOCK</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y p-1 space-y-1">
              {productosEvaluados.map((p) => {
                const isSelected = p.tempId === selectedTempId

                return (
                  <button
                    key={p.tempId}
                    type="button"
                    onClick={() => setSelectedTempId(p.tempId)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col gap-1',
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                        : 'hover:bg-muted/60 border-transparent',
                      p.tieneDeficit && !isSelected && 'bg-amber-500/5 border-amber-500/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-foreground">{p.producto_sku}</span>
                      <div className="flex items-center gap-1 font-mono font-bold">
                        <span className="text-foreground">{p.cajas} cj</span>
                        <span className="text-muted-foreground">/</span>
                        <span
                          className={cn(
                            p.tieneDeficit
                              ? 'text-destructive font-black'
                              : 'text-emerald-700 dark:text-emerald-300'
                          )}
                        >
                          {p.stockCajas} disp.
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground truncate">{p.producto_nombre ?? '—'}</p>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      {p.tieneDeficit ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" /> Falta stock ({p.cajas - p.stockCajas} cj)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                          <Check className="h-3 w-3" /> Existencias suficientes
                        </span>
                      )}

                      {p.estaReasignado && (
                        <span className="text-primary font-bold">
                          Orig: {p.codigo_original}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Columna Derecha: Sugerencias Inteligentes con Stock Real (7 columnas) */}
          <div className="md:col-span-7 flex flex-col border rounded-xl bg-card overflow-hidden p-3 gap-3">
            {selectedProduct ? (
              <>
                {/* Cabecera del producto inspeccionado */}
                <div className="p-3 rounded-xl bg-muted/40 border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Línea Seleccionada</span>
                    <h3 className="font-mono font-extrabold text-sm text-foreground flex items-center gap-2">
                      {selectedProduct.producto_sku}
                      {selectedProduct.estaReasignado && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Físico: {selectedProduct.codigo_original}
                        </Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{selectedProduct.producto_nombre}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">Solicitadas</span>
                    <span className="font-mono font-black text-sm text-foreground">{selectedProduct.cajas} Cajas</span>
                  </div>
                </div>

                {/* Buscador Manual Rápido */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar otro SKU o modelo de la bodega..."
                    value={manualSearchTerm}
                    onChange={(e) => handleManualSearch(e.target.value)}
                    className="pl-9 h-8 text-xs rounded-lg"
                  />
                  {isSearchingManual && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Lista de Sugerencias o Resultados Manuales */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {manualResults.length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Resultados de búsqueda manual:
                      </span>
                      {manualResults.map((prod) => (
                        <div
                          key={prod.id}
                          className="p-2.5 rounded-xl border bg-background hover:bg-muted/50 transition-all flex items-center justify-between gap-2"
                        >
                          <div className="flex flex-col truncate">
                            <span className="font-mono font-bold text-xs text-primary">{prod.sku_base}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {prod.descripcion ?? prod.nombre}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApplyReasignacion(prod)}
                            className="h-7 text-xs font-bold shrink-0 gap-1 rounded-lg"
                          >
                            <ArrowRight className="h-3 w-3" /> Reasignar
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : isLoadingSugerencias ? (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Buscando modelos con existencias en {bodegaOrigenNombre}...</span>
                    </div>
                  ) : sugerencias.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Modelos de la misma familia/raíz con stock disponible ({sugerencias.length}):
                      </span>

                      {sugerencias.map((sug) => (
                        <div
                          key={sug.id}
                          className="p-3 rounded-xl border bg-background hover:border-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-sm text-foreground">{sug.sku_base}</span>
                              {getBadgeSimilitud(sug.similitud_tipo)}
                              {sug.familia && (
                                <Badge variant="secondary" className="text-[9px]">
                                  {sug.familia}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{sug.descripcion ?? sug.nombre}</p>
                            <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 pt-0.5">
                              <span>✅ {sug.cajas_disponibles} Cajas disponibles</span>
                              {sug.pz_en_caja && (
                                <span className="text-muted-foreground font-normal text-[11px]">
                                  ({sug.pz_en_caja} pz/caja)
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApplyReasignacion(sug)}
                            className="h-8 px-3 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shrink-0 gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Reasignar Salida
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs text-center p-4">
                      <Box className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-bold">No se encontraron modelos similares con stock disponible en esta bodega.</p>
                      <p className="text-[11px]">
                        Puedes usar el buscador arriba para elegir manualmente otro SKU o permitir el saldo negativo.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Selecciona un producto de la izquierda para analizar sus existencias.
              </div>
            )}
          </div>
        </div>

        {/* Pie del modal */}
        <DialogFooter className="pt-2 border-t shrink-0 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {totalDeficits === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Todos los productos tienen existencias suficientes.
              </span>
            ) : (
              <span className="text-amber-800 dark:text-amber-300 font-semibold">
                ⚠️ Puedes guardar la nota con saldos negativos si la política lo permite o reasignar las salidas.
              </span>
            )}
          </div>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold uppercase tracking-wider text-xs h-9 px-4"
          >
            Listo / Continuar con la Nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
