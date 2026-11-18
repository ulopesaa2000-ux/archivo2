// app/(admin)/catalogo/familias/_components/SidebarBandeja.tsx
'use client'

import { ArrowRightLeft, ChevronDown, ChevronRight, GripVertical, Info, Loader2, Package, Search, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import type { ProductListItem } from '../_hooks/familias-types'

interface SidebarBandejaProps {
  isSinAsignarCollapsed: boolean
  onToggleSinAsignar: () => void
  isBandejaCollapsed: boolean
  onToggleBandeja: () => void
  onExpandBandeja: () => void
  leftSearchQuery: string
  onLeftSearchChange: (val: string) => void
  loadingSinAsignar: boolean
  unassignedProducts: ProductListItem[]
  filteredUnassigned: ProductListItem[]
  selectedProductIds: Record<number, boolean>
  selectedProducts: ProductListItem[]
  onToggleSelectProduct: (productId: number) => void
  onSelectInspectProduct: (product: ProductListItem) => void
  onInspectBySku: (id: number, skuBase: string, descripcion: string | null) => void
  onDragStart: (e: React.DragEvent, prodId: number, skuBase?: string) => void
  onDragEnd: () => void
  onDropOnBandeja: (e: React.DragEvent) => void
  onUpdateDragTooltip: (text: string) => void
  onOlvidarBandeja: () => void
}

export function SidebarBandeja({
  isSinAsignarCollapsed,
  onToggleSinAsignar,
  isBandejaCollapsed,
  onToggleBandeja,
  onExpandBandeja,
  leftSearchQuery,
  onLeftSearchChange,
  loadingSinAsignar,
  unassignedProducts,
  filteredUnassigned,
  selectedProductIds,
  selectedProducts,
  onToggleSelectProduct,
  onSelectInspectProduct,
  onInspectBySku,
  onDragStart,
  onDragEnd,
  onDropOnBandeja,
  onUpdateDragTooltip,
  onOlvidarBandeja,
}: SidebarBandejaProps) {
  const totalSelectedCount = Object.values(selectedProductIds).filter(Boolean).length

  return (
    <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full min-h-0 bg-card shrink-0 select-none overflow-hidden">
      {/* SECCIÓN 1: SIN ASIGNAR */}
      <div
        className={cn(
          'flex flex-col min-h-0 border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200 overflow-hidden',
          isSinAsignarCollapsed ? 'shrink-0' : 'flex-1'
        )}
      >
        <button
          onClick={onToggleSinAsignar}
          className="w-full p-3 bg-muted/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between hover:bg-muted/30 transition-colors select-none shrink-0"
        >
          <div className="flex items-center gap-2">
            {isSinAsignarCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <Package className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Sin Asignar</span>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {filteredUnassigned.length} de {unassignedProducts.length}
          </Badge>
        </button>

        {!isSinAsignarCollapsed && (
          <>
            <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar sin asignar..."
                  className="pl-7 h-7 text-xs bg-muted/20"
                  value={leftSearchQuery}
                  onChange={(e) => onLeftSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {loadingSinAsignar ? (
                <div className="flex items-center justify-center py-8 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Cargando...
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No hay productos sin asignar.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredUnassigned.map((p) => {
                    const isSelected = !!selectedProductIds[p.id]
                    return (
                      <div
                        key={p.id}
                        draggable="true"
                        onDragStart={(e) => onDragStart(e, p.id, p.sku_base)}
                        onDragEnd={onDragEnd}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/45 hover:border-primary/40 transition-all cursor-grab group relative',
                          isSelected && 'border-primary bg-primary/[0.02]'
                        )}
                      >
                        <div
                          className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onSelectInspectProduct(p)}
                        >
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleSelectProduct(p.id)}
                              className="h-3.5 w-3.5 shrink-0"
                            />
                          </div>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-grab text-muted-foreground hover:text-foreground shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>

                          {p.imagen_principal ? (
                            <img
                              src={getSmartImagenUrl(p.imagen_principal, 'thumbnail')}
                              alt={p.sku_base}
                              loading="lazy"
                              decoding="async"
                              className="h-8 w-8 object-cover rounded bg-muted border shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 bg-muted border rounded flex items-center justify-center text-[9px] text-muted-foreground font-mono shrink-0">
                              NO IMG
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                'font-mono text-xs font-bold truncate tracking-wide flex items-center gap-1',
                                p.activo === false && 'text-red-500 dark:text-red-400'
                              )}
                            >
                              {p.sku_base}
                              {p.activo === false && (
                                <span className="text-[8px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1 py-0.2 rounded font-sans uppercase shrink-0 font-bold border border-red-200 dark:border-red-900">
                                  Inactivo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate leading-normal">
                              {p.descripcion ?? 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* SECCIÓN 2: BANDEJA DE REASIGNACIÓN (SELECCIONADOS) */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('ring-1', 'ring-primary/40')
          onUpdateDragTooltip('Soltar en Bandeja de Reasignación')
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('ring-1', 'ring-primary/40')
        }}
        onDrop={(e) => {
          e.currentTarget.classList.remove('ring-1', 'ring-primary/40')
          onDropOnBandeja(e)
          if (isBandejaCollapsed) onExpandBandeja()
        }}
        className={cn(
          'flex flex-col min-h-0 bg-muted/5 border-t border-zinc-200 dark:border-zinc-800 transition-all duration-200 overflow-hidden shrink-0',
          isBandejaCollapsed ? 'h-auto' : isSinAsignarCollapsed ? 'flex-1' : 'h-[220px]'
        )}
      >
        <button
          onClick={onToggleBandeja}
          className="w-full p-3 bg-muted/20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between hover:bg-muted/30 transition-colors select-none shrink-0"
        >
          <div className="flex items-center gap-2">
            {isBandejaCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Reasignación</span>
          </div>
          <Badge
            className={cn(
              'font-mono text-[10px] transition-colors',
              selectedProducts.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {selectedProducts.length} de {totalSelectedCount === 0 ? 0 : selectedProducts.length}
          </Badge>
        </button>

        {!isBandejaCollapsed && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {selectedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[100px] py-4 text-center text-xs text-muted-foreground border border-dashed border-muted-foreground/25 rounded bg-muted/10">
                  <Info className="h-4 w-4 mb-1 text-muted-foreground/40" />
                  <p className="italic">Arrastre productos aquí</p>
                  <p className="text-[10px]">o marque casillas arriba</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedProducts.map((p) => (
                    <div
                      key={p.id}
                      draggable="true"
                      onDragStart={(e) => onDragStart(e, p.id, p.sku_base)}
                      onDragEnd={onDragEnd}
                      onClick={() => onInspectBySku(p.id, p.sku_base, p.descripcion)}
                      className="flex items-center justify-between p-1.5 px-2 rounded bg-card border border-zinc-200 dark:border-zinc-800 text-[11px] cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors select-none group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="h-3 w-3 text-muted-foreground opacity-40 group-hover:opacity-100 shrink-0" />
                        <span className="font-mono font-bold truncate">{p.sku_base}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleSelectProduct(p.id)
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
                        title="Quitar de bandeja"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProducts.length > 0 && (
              <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-card shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOlvidarBandeja}
                  title="Vacía la bandeja y olvida lo guardado en este navegador"
                  className="h-8 w-full text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Olvidar bandeja
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
