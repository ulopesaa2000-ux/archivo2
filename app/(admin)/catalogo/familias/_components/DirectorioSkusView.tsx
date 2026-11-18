// app/(admin)/catalogo/familias/_components/DirectorioSkusView.tsx
'use client'

import { ArrowRight, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'

interface DirectorioSkusViewProps {
  filteredActiveFamiliesList: FamiliaResumen[]
  initialFamilias: FamiliaResumen[]
  highlightedFamily: string | null
  stagedRenames: Record<string, string>
  autoRenames: Record<string, string>
  netSkusMap: Record<string, FamiliaResumenSku[]>
  searchQuery: string
  modoStock: boolean
  clasesSemaforoSku: (productoId: number) => string
  tituloStockSku: (productoId: number) => string | undefined
  onClearHighlightedFamily: () => void
  onGoToFamilyInList: (familyName: string) => void
  onInspectProduct: (id: number, skuBase: string, descripcion: string | null) => void
  onDragStart: (e: React.DragEvent, prodId: number, skuBase?: string) => void
  onDragEnd: () => void
  onDropOnFamily: (e: React.DragEvent, targetFamily: string) => void
  onDropOnInsertionZone: (e: React.DragEvent, prevFamilyCode: string) => void
  onUpdateDragTooltip: (text: string) => void
}

export function DirectorioSkusView({
  filteredActiveFamiliesList,
  initialFamilias,
  highlightedFamily,
  stagedRenames,
  autoRenames,
  netSkusMap,
  searchQuery,
  modoStock,
  clasesSemaforoSku,
  tituloStockSku,
  onClearHighlightedFamily,
  onGoToFamilyInList,
  onInspectProduct,
  onDragStart,
  onDragEnd,
  onDropOnFamily,
  onDropOnInsertionZone,
  onUpdateDragTooltip,
}: DirectorioSkusViewProps) {
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
              const span = e.currentTarget.querySelector('span')
              if (span) span.classList.remove('opacity-0')
              onUpdateDragTooltip('+ Crear nueva familia al inicio')
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
              const span = e.currentTarget.querySelector('span')
              if (span) span.classList.add('opacity-0')
            }}
            onDrop={(e) => {
              const span = e.currentTarget.querySelector('span')
              if (span) span.classList.add('opacity-0')
              onDropOnInsertionZone(e, filteredActiveFamiliesList[0].familia!)
            }}
            className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
          >
            <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Crear familia al inicio
            </span>
          </div>

          {filteredActiveFamiliesList.map((f) => {
            const name = f.familia!
            const isNewDraftFamily = !initialFamilias.some((initF) => initF.familia === name)
            const isHighlighted = highlightedFamily === name
            const renombradoLocal = stagedRenames[name] || autoRenames[name]
            const displayName = renombradoLocal ? `${name} → ${renombradoLocal}` : name
            const skus = netSkusMap[name] || []
            const primerSkuConDesc = skus.find((s) => s.descripcion && s.descripcion.trim()) || skus[0]
            const displayedFamilyDesc = primerSkuConDesc?.descripcion || f.descripcion

            return (
              <div key={name} id={`family-item-${name}`} className="space-y-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add(
                      isHighlighted ? 'border-blue-500' : isNewDraftFamily ? 'border-amber-500' : 'border-primary',
                      isHighlighted ? 'bg-blue-500/10' : isNewDraftFamily ? 'bg-amber-500/10' : 'bg-primary/[0.03]'
                    )
                    onUpdateDragTooltip(`Mover a ${name}`)
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove(
                      'border-primary',
                      'bg-primary/[0.03]',
                      'border-amber-500',
                      'bg-amber-500/10',
                      'border-blue-500',
                      'bg-blue-500/10'
                    )
                  }}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove(
                      'border-primary',
                      'bg-primary/[0.03]',
                      'border-amber-500',
                      'bg-amber-500/10',
                      'border-blue-500',
                      'bg-blue-500/10'
                    )
                    onDropOnFamily(e, name)
                  }}
                  className={cn(
                    'p-3 rounded-lg border space-y-1 transition-all animate-in fade-in duration-300',
                    isHighlighted
                      ? 'border-blue-500 bg-blue-500/[0.08] dark:bg-blue-500/[0.14] ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                      : isNewDraftFamily
                        ? 'border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] shadow-xs'
                        : 'bg-card border-zinc-200 dark:border-zinc-800'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
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
                          className="text-[9px] border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-sans font-semibold flex items-center gap-1 cursor-pointer hover:bg-blue-500/25 transition-colors"
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
                          className="text-[9px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-sans font-semibold"
                        >
                          Nueva Familia
                        </Badge>
                      )}
                      {renombradoLocal && !isNewDraftFamily && (
                        <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600 font-sans">
                          {stagedRenames[name] ? 'Manual' : 'Sufijo'}
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {searchQuery.trim() !== '' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onGoToFamilyInList(name)
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-all hover:scale-105 active:scale-95 shrink-0"
                          title="Quitar filtro de búsqueda y ver esta familia en la lista general"
                        >
                          <span>Ir a lista</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      <Badge
                        variant={isHighlighted || isNewDraftFamily ? 'outline' : 'secondary'}
                        className={cn(
                          'font-mono text-[10px] py-0 px-2 shrink-0',
                          isHighlighted
                            ? 'border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10'
                            : isNewDraftFamily && 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                        )}
                      >
                        {skus.length} {isNewDraftFamily ? 'en borrador' : `de ${f.total_productos}`}
                      </Badge>
                    </div>
                  </div>
                  {displayedFamilyDesc && <p className="text-xs text-muted-foreground italic">{displayedFamilyDesc}</p>}
                  {skus.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t mt-1.5 border-dashed border-zinc-200 dark:border-zinc-800">
                      {skus.map((sku) => {
                        const match =
                          searchQuery &&
                          searchQuery
                            .split(/\s+/)
                            .filter(Boolean)
                            .some((w) => sku.sku_base.toLowerCase().includes(w.toLowerCase()))
                        const semaforo = sku.activo === false ? '' : modoStock ? clasesSemaforoSku(sku.id) : ''
                        return (
                          <Badge
                            key={sku.id}
                            variant={match ? 'default' : 'secondary'}
                            draggable="true"
                            onDragStart={(e) => onDragStart(e, sku.id, sku.sku_base)}
                            onDragEnd={onDragEnd}
                            onClick={() => onInspectProduct(sku.id, sku.sku_base, sku.descripcion)}
                            title={tituloStockSku(sku.id)}
                            className={cn(
                              'font-mono text-xs py-0.5 px-2 transition-colors border shadow-sm rounded-md tracking-wide cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 duration-75 select-none',
                              sku.activo === false
                                ? 'bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-900'
                                : semaforo !== ''
                                  ? semaforo
                                  : match
                                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-750 dark:border-indigo-400 font-bold'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700/60 font-semibold'
                            )}
                          >
                            {sku.sku_base}
                            {sku.activo === false && ' (I)'}
                          </Badge>
                        )
                      })}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'text-center py-4 text-xs italic border border-dashed rounded',
                        isHighlighted
                          ? 'text-blue-700/80 dark:text-blue-300/80 border-blue-500/30 bg-blue-500/5'
                          : isNewDraftFamily
                            ? 'text-amber-700/80 dark:text-amber-300/80 border-amber-500/30 bg-amber-500/5'
                            : 'text-muted-foreground border-zinc-200 dark:border-zinc-800/40 bg-muted/5'
                      )}
                    >
                      Arrastre productos aquí para asignarlos {isNewDraftFamily ? 'a esta nueva familia' : ''}
                    </div>
                  )}
                </div>

                {/* Zona de Inserción intermedia */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.classList.add('active', 'border-primary', 'bg-primary/5', 'h-16')
                    const span = e.currentTarget.querySelector('span')
                    if (span) span.classList.remove('opacity-0')
                    onUpdateDragTooltip(`+ Crear familia entre ${name} y siguiente`)
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
                    const span = e.currentTarget.querySelector('span')
                    if (span) span.classList.add('opacity-0')
                  }}
                  onDrop={(e) => {
                    const span = e.currentTarget.querySelector('span')
                    if (span) span.classList.add('opacity-0')
                    onDropOnInsertionZone(e, name)
                  }}
                  className="insertion-zone border border-transparent rounded-lg h-2 flex items-center justify-center transition-all text-xs font-semibold text-primary/80"
                >
                  <span className="opacity-0 pointer-events-none transition-opacity text-xs flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Crear familia aquí
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
