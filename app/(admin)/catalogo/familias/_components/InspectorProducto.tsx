// app/(admin)/catalogo/familias/_components/InspectorProducto.tsx
'use client'

import {
  ArrowRight,
  Boxes,
  ExternalLink,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  Package,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import type { FamiliaResumen, StockTotalProducto } from '@/modules/catalogo/queries'
import type { CatalogosParaFiltros } from '@/modules/catalogo/types'
import { DescripcionQuickEdit } from './DescripcionQuickEdit'
import { getFinalFamilyName, type ProductListItem } from '../_hooks/familias-types'

interface InspectorProductoProps {
  isRightPanelOpen: boolean
  onCloseRightPanel: () => void
  hasPendingChanges: boolean
  onDiscardChanges: () => void
  inspectedProduct: ProductListItem | null
  onClearInspectedProduct: () => void
  loadingInspection: boolean
  imagenExpandida: boolean
  onToggleImagenExpandida: () => void
  puedeEditar: boolean
  catalogos: CatalogosParaFiltros
  onDescripcionSaved: (productId: number, descripcion: string | null) => void
  selectedProductIds: Record<number, boolean>
  onToggleSelectProduct: (productId: number) => void
  modoStock: boolean
  stockMap: Record<number, StockTotalProducto>
  loadingStock: boolean
  stagedRenames: Record<string, string>
  autoRenames: Record<string, string>
  stagedMoves: Record<number, string>
  loadedProducts: Record<string, ProductListItem[]>
  familias: FamiliaResumen[]
  onCancelStagedMove: (productId: number) => void
  onOpenConfirmModal: () => void
  isPending: boolean
  onDragStart: (e: React.DragEvent, prodId: number, skuBase?: string) => void
  onDragEnd: () => void
}

export function InspectorProducto({
  isRightPanelOpen,
  onCloseRightPanel,
  hasPendingChanges,
  onDiscardChanges,
  inspectedProduct,
  onClearInspectedProduct,
  loadingInspection,
  imagenExpandida,
  onToggleImagenExpandida,
  puedeEditar,
  catalogos,
  onDescripcionSaved,
  selectedProductIds,
  onToggleSelectProduct,
  modoStock,
  stockMap,
  loadingStock,
  stagedRenames,
  autoRenames,
  stagedMoves,
  loadedProducts,
  familias,
  onCancelStagedMove,
  onOpenConfirmModal,
  isPending,
  onDragStart,
  onDragEnd,
}: InspectorProductoProps) {
  const renderFilaStockInspector = () => {
    if (!modoStock || !inspectedProduct) return null
    const st = stockMap[inspectedProduct.id]
    const sinStock = !!st && st.cajas <= 0
    const bajoStock = !!st && st.cajas > 0 && st.cajas < 5

    return (
      <div
        className={cn(
          'mt-2 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs bg-card',
          sinStock
            ? 'border-red-500/50 bg-red-500/5'
            : bajoStock
              ? 'border-amber-500/50 bg-amber-500/5'
              : 'border-zinc-200 dark:border-zinc-800'
        )}
      >
        <Boxes
          className={cn(
            'h-4 w-4 shrink-0',
            sinStock
              ? 'text-red-600 dark:text-red-400'
              : bajoStock
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
          )}
        />
        {!st ? (
          <span className="text-muted-foreground flex items-center gap-1.5">
            {loadingStock && <Loader2 className="h-3 w-3 animate-spin" />}
            {loadingStock ? 'Cargando stock…' : 'Sin dato de stock'}
          </span>
        ) : (
          <span className="text-foreground">
            Stock total:{' '}
            <strong
              className={cn(
                sinStock
                  ? 'text-red-600 dark:text-red-400'
                  : bajoStock
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-foreground'
              )}
            >
              {st.cajas} {st.cajas === 1 ? 'caja' : 'cajas'}
            </strong>
            {st.piezas > 0 && <span className="text-muted-foreground"> · {st.piezas} pzs sueltas</span>}
          </span>
        )}
      </div>
    )
  }

  return (
    <aside
      className={cn(
        'border-l border-zinc-200 dark:border-zinc-800 bg-card flex flex-col h-full transition-all duration-300 overflow-hidden shrink-0',
        isRightPanelOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-l-0'
      )}
    >
      <div className="p-3 bg-muted/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Cambios</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasPendingChanges && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onDiscardChanges}
              className="h-7 text-[10px] uppercase font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 flex items-center gap-1"
              title="Restablecer todos los cambios locales"
            >
              <Trash2 className="h-3 w-3" />
              Restablecer a Original
            </Button>
          )}
          <button
            onClick={onCloseRightPanel}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* INSPECTOR DE PRODUCTO SELECCIONADO */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-muted/5 shrink-0">
        <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
          <Package className="h-3 w-3" />
          Producto Seleccionado
          {inspectedProduct && imagenExpandida && (
            <span className="font-mono normal-case tracking-wider text-foreground/80">
              ({inspectedProduct.sku_base}
              <a
                href={`/catalogo/${inspectedProduct.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-1 inline-flex items-center align-middle text-muted-foreground hover:text-foreground transition-colors"
                title={`Abrir detalle de ${inspectedProduct.sku_base} en nueva pestaña`}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
              )
            </span>
          )}
        </h4>

        {loadingInspection ? (
          <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground border rounded bg-card">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            Cargando detalles...
          </div>
        ) : inspectedProduct ? (
          <>
            <div
              draggable="true"
              onDragStart={(e) => onDragStart(e, inspectedProduct.id, inspectedProduct.sku_base)}
              onDragEnd={onDragEnd}
              className={cn(
                'w-full rounded-lg border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all duration-200 bg-zinc-950',
                imagenExpandida ? 'aspect-[3/4]' : 'aspect-[4/3]'
              )}
            >
              {inspectedProduct.imagen_principal ? (
                <img
                  src={getSmartImagenUrl(inspectedProduct.imagen_principal, 'card_lg')}
                  alt={inspectedProduct.sku_base}
                  decoding="async"
                  className={cn(
                    'w-full h-full transition-all duration-300',
                    imagenExpandida ? 'object-contain' : 'object-cover group-hover:scale-105'
                  )}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <Package className="h-10 w-10 opacity-30 animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-wider opacity-50">Sin Imagen</span>
                </div>
              )}

              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none transition-opacity duration-200',
                  imagenExpandida && 'opacity-0'
                )}
              />

              <button
                onClick={onToggleImagenExpandida}
                className="absolute top-3 right-12 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-20 backdrop-blur-xs shadow-md border border-white/10"
                title={imagenExpandida ? 'Retraer foto a 4:3' : 'Ampliar foto a 3:4'}
              >
                {imagenExpandida ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={onClearInspectedProduct}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-colors z-20 backdrop-blur-xs shadow-md border border-white/10"
                title="Cerrar vista previa"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div
                className={cn(
                  'absolute top-3 left-3 flex flex-col gap-1.5 items-start max-w-[85%] z-10 pointer-events-none transition-opacity duration-200',
                  imagenExpandida && 'opacity-0'
                )}
              >
                <div className="bg-black/75 dark:bg-zinc-950/85 backdrop-blur-xs border border-white/10 rounded px-2.5 py-1 shadow-md flex items-center gap-1.5 pointer-events-auto">
                  <span className="font-mono text-xs font-bold text-white tracking-wider select-all">
                    {inspectedProduct.sku_base}
                  </span>
                  <a
                    href={`/catalogo/${inspectedProduct.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    draggable={false}
                    className="text-white/70 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer"
                    title={`Abrir detalle de ${inspectedProduct.sku_base} en nueva pestaña`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {inspectedProduct.descripcion && (
                  <div className="relative bg-black/75 dark:bg-zinc-950/85 backdrop-blur-xs border border-white/10 rounded p-2.5 shadow-md">
                    {puedeEditar && (
                      <DescripcionQuickEdit
                        productId={inspectedProduct.id}
                        descripcion={inspectedProduct.descripcion}
                        catalogos={catalogos}
                        onSaved={(d) => onDescripcionSaved(inspectedProduct.id, d)}
                        className="absolute top-1 right-1"
                      />
                    )}
                    <p
                      className={cn(
                        'text-[10px] text-white leading-normal font-medium tracking-wide uppercase select-text pointer-events-auto max-h-[80px] overflow-y-auto pr-1',
                        puedeEditar && 'pr-6'
                      )}
                    >
                      {inspectedProduct.descripcion}
                    </p>
                  </div>
                )}
              </div>

              <div className="absolute bottom-3 right-3 z-10">
                <Button
                  size="xs"
                  className={cn(
                    'h-8 px-4 font-semibold text-xs rounded shadow-md border backdrop-blur-xs transition-all duration-150',
                    selectedProductIds[inspectedProduct.id]
                      ? 'bg-amber-600/90 hover:bg-amber-600 text-white border-amber-500/25'
                      : 'bg-black/85 hover:bg-black text-white border-zinc-800/80'
                  )}
                  onClick={() => onToggleSelectProduct(inspectedProduct.id)}
                >
                  {selectedProductIds[inspectedProduct.id] ? 'Deseleccionar' : 'Seleccionar'}
                </Button>
              </div>
            </div>

            {imagenExpandida && inspectedProduct.descripcion && (
              <div className="mt-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-2.5 py-2 flex items-start gap-1.5">
                <p className="flex-1 text-[11px] text-foreground leading-normal font-medium tracking-wide uppercase select-text">
                  {inspectedProduct.descripcion}
                </p>
                {puedeEditar && (
                  <DescripcionQuickEdit
                    productId={inspectedProduct.id}
                    descripcion={inspectedProduct.descripcion}
                    catalogos={catalogos}
                    onSaved={(d) => onDescripcionSaved(inspectedProduct.id, d)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                  />
                )}
              </div>
            )}

            {renderFilaStockInspector()}
          </>
        ) : (
          <div className="text-center py-8 text-[11px] text-muted-foreground italic border border-dashed rounded border-zinc-200 dark:border-zinc-800 bg-muted/10">
            Haz clic en un SKU para ver su imagen e info
          </div>
        )}
      </div>

      {/* Auditoría de cambios */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="space-y-4">
          {(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider">
                Renombrar Familias ({Object.keys(stagedRenames).length + Object.keys(autoRenames).length})
              </h4>
              <div className="space-y-1">
                {Object.entries(stagedRenames).map(([oldName, newName]) => (
                  <div key={oldName} className="flex flex-col gap-1 text-[11px] font-mono bg-muted/25 border p-2 rounded">
                    <span className="text-muted-foreground line-through text-[10px]">{oldName}</span>
                    <div className="flex items-center gap-1 text-foreground font-semibold">
                      <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                      <span>{newName}</span>
                    </div>
                  </div>
                ))}
                {Object.entries(autoRenames).map(([oldName, newName]) => (
                  <div
                    key={oldName}
                    className="flex flex-col gap-1 text-[11px] font-mono bg-amber-500/[0.02] border border-amber-500/20 p-2 rounded"
                  >
                    <span className="text-muted-foreground line-through text-[10px]">{oldName}</span>
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                      <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                      <span>{newName}</span>
                    </div>
                    <span className="text-[9px] text-amber-600 font-sans italic">Auto Sufijo</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(stagedMoves).length > 0 ? (
            <div className="space-y-1.5">
              <h4 className="font-bold text-[10px] text-primary uppercase tracking-wider">
                Auditoría de Movimientos ({Object.keys(stagedMoves).length})
              </h4>
              <div className="space-y-1.5">
                {Object.entries(stagedMoves).map(([prodIdStr, destFamily]) => {
                  const prodId = parseInt(prodIdStr, 10)
                  const finalDest = getFinalFamilyName(destFamily, stagedRenames, autoRenames)

                  let sku = `ID #${prodId}`
                  for (const prods of Object.values(loadedProducts)) {
                    const found = prods.find((p) => p.id === prodId)
                    if (found) {
                      sku = found.sku_base
                      break
                    }
                  }

                  let originFamily = 'Sin Clasificar'
                  for (const f of familias) {
                    if (f.skus?.some((s) => s.id === prodId)) {
                      originFamily = f.familia === 'F000-000C' ? 'Sin Asignar' : f.familia || 'Sin Clasificar'
                      break
                    }
                  }

                  return (
                    <div key={prodIdStr} className="bg-card border border-zinc-200 dark:border-zinc-800 rounded p-2.5 text-[11px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-primary tracking-wide">{sku}</span>
                        <button
                          onClick={() => onCancelStagedMove(prodId)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded hover:bg-destructive/10"
                          title="Cancelar este movimiento"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1.5 flex-wrap">
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] border border-muted-foreground/10">
                          {originFamily}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-semibold border border-primary/20">
                          {finalDest}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            !(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
              <div className="text-center py-12 text-xs text-muted-foreground italic">
                No hay cambios locales en borrador.
              </div>
            )
          )}
        </div>
      </div>

      {hasPendingChanges && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-card space-y-2 shrink-0 sticky bottom-0 z-10 shadow-md">
          <Button
            onClick={onOpenConfirmModal}
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 h-9 text-xs shadow-xs"
          >
            <Save className="h-4 w-4" />
            Confirmar Cambios
          </Button>
        </div>
      )}
    </aside>
  )
}
