// components/admin/ocr-sync/OcrLineasSyncModal.tsx
'use client'

import { useRef } from 'react'
import { usePanZoom, useNativeWheel } from '@/hooks/use-pan-zoom'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, AlertCircle, Plus, Save, Sparkles, CheckCheck } from 'lucide-react'
import type { NotaOcrPropuestaLineRaw, DraftProducto } from '@/modules/inventario/types'
import { useOcrLineasSync } from './_hooks/use-ocr-lineas-sync'
import { OcrVisorBuscadorPanel } from './_components/OcrVisorBuscadorPanel'
import { OcrLineaRow } from './_components/OcrLineaRow'

export interface OcrLineasSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ocrProposalId?: string
  initialLineas: NotaOcrPropuestaLineRaw[]
  comprobanteUrl?: string | null
  bodegaOrigenId?: number | null
  onApplyToDraft: (newProducts: DraftProducto[], updatedRawLineas: NotaOcrPropuestaLineRaw[]) => void
}

export function OcrLineasSyncModal({
  open,
  onOpenChange,
  ocrProposalId,
  initialLineas,
  comprobanteUrl,
  bodegaOrigenId,
  onApplyToDraft,
}: OcrLineasSyncModalProps) {
  const visor = usePanZoom({ max: 3, wheel: 'always' })
  const visorRef = useRef<HTMLDivElement | null>(null)
  useNativeWheel(visorRef, visor.handleWheel)

  const sync = useOcrLineasSync({
    open,
    onOpenChange,
    ocrProposalId,
    initialLineas,
    bodegaOrigenId,
    onApplyToDraft,
    onResetVisor: visor.reset,
  })

  const exactosCount = sync.lineas.filter((l) => l.encontrado && !l.es_propuesta).length
  const propuestasCount = sync.lineas.filter((l) => l.es_propuesta && !l.encontrado).length
  const propuestasAltasCount = sync.lineas.filter(
    (l) =>
      !l.encontrado &&
      l.es_propuesta &&
      !!l.propuesta_producto_id &&
      ((l.score ?? 0) >= 0.90 || (l.decider_prob ?? 0) >= 0.80)
  ).length
  const noEncontradosCount = sync.lineas.filter((l) => !l.encontrado && !l.es_propuesta).length
  const totalCajas = sync.lineas.reduce((sum, l) => sum + (l.cantidad_cajas || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[96vw] lg:max-w-[96vw] w-full h-[92vh] flex flex-col rounded-2xl p-5 gap-3">
        <DialogHeader className="pb-2 border-b shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-black uppercase tracking-tight">
                Editor y Sincronizador de Líneas OCR
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              >
                {exactosCount} Confirmados
              </Badge>
              {propuestasCount > 0 && (
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold py-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30"
                >
                  {propuestasCount} Propuestas
                </Badge>
              )}
              {noEncontradosCount > 0 && (
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-bold py-1 bg-destructive/10 text-destructive border-destructive/30"
                >
                  {noEncontradosCount} Sin Coincidencia
                </Badge>
              )}
              <Badge variant="secondary" className="font-mono text-xs font-bold py-1">
                Total Cajas: {totalCajas}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5">
            Edita el código OCR para sincronizar al instante, usa Enter para aceptar la propuesta #1 y saltar al siguiente pendiente, o elige una de las variantes sugeridas.
          </DialogDescription>
        </DialogHeader>

        {sync.error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-bold shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{sync.error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden min-h-0">
          <OcrVisorBuscadorPanel
            selectedIndex={sync.selectedIndex}
            searchInputRef={sync.searchInputRef}
            searchTerm={sync.searchTerm}
            searchResults={sync.searchResults}
            isSearching={sync.isSearching}
            isCatalogoReady={sync.isCatalogoReady}
            comprobanteUrl={comprobanteUrl}
            visorRef={visorRef}
            visorTransform={visor.transform}
            visorDragging={visor.dragging}
            onSearchChange={sync.handleSearchChange}
            onSelectSearchResult={sync.handleSelectSearchResult}
            onZoomOut={visor.zoomOut}
            onZoomIn={visor.zoomIn}
            onRotate={visor.rotate}
            onResetVisor={visor.reset}
            onPointerDown={visor.onPointerDown}
            onPointerMove={visor.onPointerMove}
            onPointerUp={visor.onPointerUp}
            onPointerCancel={visor.onPointerCancel}
          />

          <div className="lg:col-span-8 flex flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={sync.handleSync}
                  disabled={sync.isSyncing || sync.lineas.length === 0}
                  className="h-8 font-bold text-xs uppercase tracking-wider gap-1.5 rounded-xl shadow"
                >
                  {sync.isSyncing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Sincronizar SKUs</span>
                </Button>

                {propuestasAltasCount > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={sync.handleAcceptHighConfidenceAll}
                    className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Aceptar propuestas ≥90% ({propuestasAltasCount})</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={sync.handleAddLine}
                  className="h-8 text-xs font-bold gap-1 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Línea</span>
                </Button>
              </div>

              {sync.selectedIndex !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => sync.setSelectedIndex(null)}
                  className="h-7 text-[11px] text-muted-foreground"
                >
                  Desmarcar #{sync.selectedIndex + 1}
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto border rounded-xl shadow-inner min-h-0 bg-background">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted border-b text-[11px] font-black uppercase tracking-wider text-muted-foreground z-10 whitespace-nowrap">
                  <tr>
                    <th className="px-2.5 py-2 text-center w-[38px]">#</th>
                    <th className="px-2.5 py-2 text-left min-w-[220px]">Código OCR</th>
                    <th className="px-2 py-2 text-center w-[76px]">Cajas</th>
                    <th className="px-2.5 py-2 text-left">Resolución en Catálogo</th>
                    <th className="px-2 py-2 text-center w-[74px]">DB / IA</th>
                    <th className="px-2 py-2 text-center w-[40px]" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sync.lineas.length > 0 ? (
                    sync.lineas.map((line, idx) => (
                      <OcrLineaRow
                        key={idx}
                        line={line}
                        idx={idx}
                        isSelected={sync.selectedIndex === idx}
                        setInputRef={(el) => {
                          sync.rowInputRefs.current[idx] = el
                        }}
                        onSelectRow={sync.setSelectedIndex}
                        onUpdateEstiloRaw={sync.handleUpdateEstiloRaw}
                        onBlurEstiloRaw={sync.handleBlurEstiloRaw}
                        onUpdateCajas={sync.handleUpdateCajas}
                        onEnterOnRow={sync.handleEnterOnRow}
                        onAcceptProposal={sync.handleAcceptProposal}
                        onSelectCandidate={sync.handleSelectCandidate}
                        onClearLineProduct={sync.handleClearLineProduct}
                        onOpenSearchForRow={(rowIdx, q) => {
                          sync.setSelectedIndex(rowIdx)
                          void sync.handleSearchChange(q)
                          sync.searchInputRef.current?.focus()
                        }}
                        onFilterByPrefix={sync.handleFilterByPrefix}
                        onRemoveLine={sync.handleRemoveLine}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground">
                        No hay líneas OCR registradas. Usa &quot;Agregar Línea&quot; o el Buscador Rápido.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-9 px-4 text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={sync.handleApply}
            disabled={sync.isPending || sync.lineas.length === 0}
            className="rounded-xl h-9 px-6 font-bold text-xs uppercase tracking-wider shadow-md gap-2"
          >
            {sync.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Aplicar a la Nota</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
