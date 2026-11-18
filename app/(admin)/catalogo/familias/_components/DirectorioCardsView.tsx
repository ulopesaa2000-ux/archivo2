// app/(admin)/catalogo/familias/_components/DirectorioCardsView.tsx
'use client'

import { ArrowRight, ChevronDown, ChevronRight, FolderEdit, GripVertical, Loader2, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'
import { getVisibleProductsInFamily, type ProductListItem } from '../_hooks/familias-types'

interface DirectorioCardsViewProps {
  filteredActiveFamiliesList: FamiliaResumen[]
  initialFamilias: FamiliaResumen[]
  highlightedFamily: string | null
  loadedProducts: Record<string, ProductListItem[]>
  loadingProducts: Record<string, boolean>
  expandedFamilies: Record<string, boolean>
  stagedMoves: Record<number, string>
  stagedRenames: Record<string, string>
  autoRenames: Record<string, string>
  netSkusMap: Record<string, FamiliaResumenSku[]>
  netCounts: Record<string, number>
  selectedProductIds: Record<number, boolean>
  mostrarInactivos: boolean
  searchQuery: string
  puedeEditar: boolean
  claseTextoSku: (productoId: number) => string
  tituloStockSku: (productoId: number) => string | undefined
  onClearHighlightedFamily: () => void
  onToggleExpandFamily: (familyCode: string) => void
  onGoToFamilyInList: (familyName: string) => void
  onOpenRenameModal: (familyName: string) => void
  onSelectInspectProduct: (product: ProductListItem) => void
  onToggleSelectProduct: (productId: number) => void
  onDragStart: (e: React.DragEvent, prodId: number, skuBase?: string) => void
  onDragEnd: () => void
  onDropOnFamily: (e: React.DragEvent, targetFamily: string) => void
  onDropOnInsertionZone: (e: React.DragEvent, prevFamilyCode: string) => void
}

export function DirectorioCardsView({
  filteredActiveFamiliesList,
  initialFamilias,
  highlightedFamily,
  loadedProducts,
  loadingProducts,
  expandedFamilies,
  stagedMoves,
  stagedRenames,
  autoRenames,
  netSkusMap,
  netCounts,
  selectedProductIds,
  mostrarInactivos,
  searchQuery,
  puedeEditar,
  claseTextoSku,
  tituloStockSku,
  onClearHighlightedFamily,
  onToggleExpandFamily,
  onGoToFamilyInList,
  onOpenRenameModal,
  onSelectInspectProduct,
  onToggleSelectProduct,
  onDragStart,
  onDragEnd,
  onDropOnFamily,
  onDropOnInsertionZone,
}: DirectorioCardsViewProps) {
  return (
    <ScrollArea className="h-full p-6">
      {filteredActiveFamiliesList.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground italic">
          No se encontraron familias activas.
        </div>
      ) : (
        <div className="space-y-2 max-w-4xl mx-auto pb-24">
          {/* Zona de Inserción inicial */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
            }}
            onDrop={(e) => onDropOnInsertionZone(e, filteredActiveFamiliesList[0].familia!)}
            className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
          >
            <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Soltar aquí para crear nueva familia intermedia
            </span>
          </div>

          {filteredActiveFamiliesList.map((f) => {
            const name = f.familia!
            const isNewDraftFamily = !initialFamilias.some((initF) => initF.familia === name)
            const isHighlighted = highlightedFamily === name
            const products = getVisibleProductsInFamily({
              familyCode: name,
              loadedProducts,
              stagedMoves,
              mostrarInactivos,
            })
            const visibleInGroup = products.filter((p) => p.familia === name)
            const isExpanded = !!expandedFamilies[name]
            const isLoading = loadingProducts[name]
            const renombradoLocal = stagedRenames[name] || autoRenames[name]
            const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name

            const skusOfFam = netSkusMap[name] || []
            const primerConDesc =
              visibleInGroup.find((p) => p.descripcion && p.descripcion.trim()) ||
              skusOfFam.find((s) => s.descripcion && s.descripcion.trim())
            const descToShow = primerConDesc?.descripcion || f.descripcion

            return (
              <div key={name} id={`family-item-card-${name}`} className="space-y-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add(
                      isHighlighted ? 'border-blue-500' : isNewDraftFamily ? 'border-amber-500' : 'border-primary',
                      isHighlighted ? 'bg-blue-500/10' : isNewDraftFamily ? 'bg-amber-500/10' : 'bg-primary/[0.01]'
                    )
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      'border-primary',
                      'bg-primary/[0.01]',
                      'border-amber-500',
                      'bg-amber-500/10',
                      'border-blue-500',
                      'bg-blue-500/10'
                    )
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove(
                      'border-primary',
                      'bg-primary/[0.01]',
                      'border-amber-500',
                      'bg-amber-500/10',
                      'border-blue-500',
                      'bg-blue-500/10'
                    )
                    onDropOnFamily(e, name)
                  }}
                  className={cn(
                    'rounded-xl border transition-all p-3 shadow-xs',
                    isHighlighted
                      ? 'border-blue-500 bg-blue-500/[0.08] dark:bg-blue-500/[0.14] ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                      : isNewDraftFamily
                        ? 'border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08]'
                        : 'bg-card border-zinc-200 dark:border-zinc-800 hover:border-border/80'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => onToggleExpandFamily(name)}
                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      <span
                        className={cn(
                          'font-mono text-sm font-bold truncate tracking-wide',
                          isHighlighted
                            ? 'text-blue-700 dark:text-blue-300 font-extrabold'
                            : isNewDraftFamily && 'text-amber-800 dark:text-amber-300 font-extrabold'
                        )}
                      >
                        {displayName}
                      </span>

                      {isHighlighted && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-sans font-semibold flex items-center gap-1 cursor-pointer hover:bg-blue-500/25 transition-colors shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onClearHighlightedFamily()
                          }}
                          title="Clic para quitar el destacado"
                        >
                          <span>Ubicada en lista</span>
                          <X className="h-2.5 w-2.5 shrink-0" />
                        </Badge>
                      )}

                      {isNewDraftFamily && !isHighlighted && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-sans font-semibold"
                        >
                          Nueva Familia
                        </Badge>
                      )}

                      {renombradoLocal && !isNewDraftFamily && (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                          {stagedRenames[name] ? 'Manual' : 'Auto Sufijo'}
                        </Badge>
                      )}

                      <Badge
                        variant={isHighlighted || isNewDraftFamily ? 'outline' : 'secondary'}
                        className={cn(
                          'text-[10px] font-mono shrink-0',
                          isHighlighted
                            ? 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10'
                            : isNewDraftFamily && 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                        )}
                      >
                        {netCounts[name] ?? f.total_productos} prods
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {searchQuery.trim() !== '' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onGoToFamilyInList(name)
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-all hover:scale-105 active:scale-95 shrink-0"
                          title="Quitar filtro de búsqueda y ver esta familia en la lista general"
                        >
                          <span>Ir a lista</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {puedeEditar && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onOpenRenameModal(name)}
                          title="Renombrar esta familia"
                          className="h-7 w-7"
                        >
                          <FolderEdit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {descToShow && <p className="text-xs text-muted-foreground italic mb-2 pl-6">Descripción genérica: {descToShow}</p>}

                  {isExpanded && (
                    <div className="mt-2 pl-6 border-l border-zinc-200 dark:border-zinc-800 ml-2">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          Cargando productos...
                        </div>
                      ) : visibleInGroup.length === 0 ? (
                        <div
                          className={cn(
                            'text-xs py-6 text-center border border-dashed rounded drop-target-area',
                            isNewDraftFamily
                              ? 'text-amber-700/80 dark:text-amber-300/80 border-amber-500/30 bg-amber-500/5'
                              : 'text-muted-foreground bg-muted/10'
                          )}
                        >
                          Arrastre productos aquí para asignarlos {isNewDraftFamily ? 'a esta nueva familia' : ''}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {visibleInGroup.map((p) => {
                            const isSelected = !!selectedProductIds[p.id]
                            const hasMovePending = stagedMoves[p.id] !== undefined
                            return (
                              <div
                                key={p.id}
                                draggable="true"
                                onDragStart={(e) => onDragStart(e, p.id)}
                                onDragEnd={onDragEnd}
                                onClick={() => onSelectInspectProduct(p)}
                                className={cn(
                                  'flex items-center gap-2.5 p-2 rounded border border-zinc-200 dark:border-zinc-800/80 bg-card transition-all hover:bg-accent/40 cursor-grab group relative cursor-pointer',
                                  isSelected && 'border-primary bg-primary/[0.01]',
                                  hasMovePending && 'border-amber-500/30 bg-amber-500/[0.01]'
                                )}
                              >
                                {puedeEditar && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => onToggleSelectProduct(p.id)}
                                      className="h-3.5 w-3.5 shrink-0"
                                    />
                                  </div>
                                )}

                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 opacity-20 group-hover:opacity-100 transition-opacity"
                                >
                                  <GripVertical className="h-3 w-3" />
                                </div>

                                {p.imagen_principal ? (
                                  <img
                                    src={getSmartImagenUrl(p.imagen_principal, 'thumbnail')}
                                    alt={p.sku_base}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-7 w-7 object-cover rounded bg-muted border shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="h-7 w-7 bg-muted border rounded flex items-center justify-center text-[9px] text-muted-foreground font-mono shrink-0">
                                    NO IMG
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div
                                    className={cn(
                                      'font-mono text-xs font-bold truncate tracking-wide flex items-center gap-1',
                                      p.activo === false ? 'text-pink-600 dark:text-pink-400' : claseTextoSku(p.id)
                                    )}
                                    title={tituloStockSku(p.id)}
                                  >
                                    {p.sku_base}
                                    {p.activo === false && (
                                      <span className="text-[8px] bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-1 py-0.2 rounded font-sans uppercase shrink-0 font-bold border border-pink-200 dark:border-pink-900">
                                        Inactivo
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate leading-normal">
                                    {p.descripcion ?? 'Sin descripción'}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Zona de Inserción intermedia */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
                  }}
                  onDrop={(e) => onDropOnInsertionZone(e, name)}
                  className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
                >
                  <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Soltar aquí para crear nueva familia intermedia
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </ScrollArea>
  )
}
