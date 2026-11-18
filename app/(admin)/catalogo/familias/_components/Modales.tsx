// app/(admin)/catalogo/familias/_components/Modales.tsx
'use client'

import { ArrowRight, ArrowRightLeft, Loader2, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { FAMILIA_GAP_MIN_DEFAULT, type DenseBlock, type EstrategiaCodigo } from '@/lib/utils/familia-codigo'
import { getFinalFamilyName, type ProductListItem } from '../_hooks/familias-types'

const ESTRATEGIA_LABEL: Record<EstrategiaCodigo, string> = {
  'decena-limpia': 'Decena limpia',
  'mitad-rango': 'Mitad del rango',
  unidad: 'Hueco unidad',
  'overflow-extendido': 'Overflow A1',
  'bloque-lleno': 'Bloque lleno',
}

interface ModalesProps {
  // 1. Create Product Modal
  isCreateProductModalOpen: boolean
  onOpenCreateProductModalChange: (open: boolean) => void
  newProductSku: string
  onNewProductSkuChange: (val: string) => void
  onValidateSku: (sku: string) => void
  skuChecking: boolean
  skuValidationError: string | null
  newProductNombre: string
  onNewProductNombreChange: (val: string) => void
  newProductDescripcion: string
  onNewProductDescripcionChange: (val: string) => void
  newProductFamilia: string
  onNewProductFamiliaChange: (val: string) => void
  newProductPzCaja: string
  onNewProductPzCajaChange: (val: string) => void
  newProductPrecio: string
  onNewProductPrecioChange: (val: string) => void
  isCreatingProduct: boolean
  onCreateProductSubmit: (e: React.FormEvent) => void

  // 2. Create Intermediate Family Modal
  isCreateIntermediateDialogOpen: boolean
  onOpenCreateIntermediateDialogChange: (open: boolean) => void
  refFamilyName: string
  newFamilyInput: string
  onNewFamilyInputChange: (val: string) => void
  suggestedKeywords: string[]
  getIntermediateDetail: (refCode: string) => {
    codigo: string
    estrategia: EstrategiaCodigo
    requiereCompactar: boolean
  }
  getIntermediateCodeSuggestion: (refCode: string) => string
  getDenseBlockForRef: (refCode: string) => DenseBlock | null
  onCompactDenseBlock: () => void
  onCancelCreateIntermediate: () => void
  onConfirmCreateIntermediate: () => void

  // 3. Confirm Persist Modal
  isConfirmModalOpen: boolean
  onOpenConfirmModalChange: (open: boolean) => void
  stagedRenames: Record<string, string>
  autoRenames: Record<string, string>
  stagedMoves: Record<number, string>
  loadedProducts: Record<string, ProductListItem[]>
  isPending: boolean
  onConfirmPersist: () => void

  // 4. Rename Modal
  isRenameModalOpen: boolean
  onOpenRenameModalChange: (open: boolean) => void
  renameTarget: string | null
  renameInput: string
  onRenameInputChange: (val: string) => void
  onStageRename: () => void
}

export function Modales({
  isCreateProductModalOpen,
  onOpenCreateProductModalChange,
  newProductSku,
  onNewProductSkuChange,
  onValidateSku,
  skuChecking,
  skuValidationError,
  newProductNombre,
  onNewProductNombreChange,
  newProductDescripcion,
  onNewProductDescripcionChange,
  newProductFamilia,
  onNewProductFamiliaChange,
  newProductPzCaja,
  onNewProductPzCajaChange,
  newProductPrecio,
  onNewProductPrecioChange,
  isCreatingProduct,
  onCreateProductSubmit,
  isCreateIntermediateDialogOpen,
  onOpenCreateIntermediateDialogChange,
  refFamilyName,
  newFamilyInput,
  onNewFamilyInputChange,
  suggestedKeywords,
  getIntermediateDetail,
  getIntermediateCodeSuggestion,
  getDenseBlockForRef,
  onCompactDenseBlock,
  onCancelCreateIntermediate,
  onConfirmCreateIntermediate,
  isConfirmModalOpen,
  onOpenConfirmModalChange,
  stagedRenames,
  autoRenames,
  stagedMoves,
  loadedProducts,
  isPending,
  onConfirmPersist,
  isRenameModalOpen,
  onOpenRenameModalChange,
  renameTarget,
  renameInput,
  onRenameInputChange,
  onStageRename,
}: ModalesProps) {
  const detail = getIntermediateDetail(refFamilyName)
  const denseBlock = getDenseBlockForRef(refFamilyName)
  const suggestion = getIntermediateCodeSuggestion(refFamilyName)

  return (
    <>
      {/* 1. DIALOG CREAR / AGREGAR PRODUCTO DIRECTO */}
      <Dialog open={isCreateProductModalOpen} onOpenChange={onOpenCreateProductModalChange}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Agregar Producto a Familia
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onCreateProductSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>SKU Base *</span>
                {skuChecking && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
                  </span>
                )}
              </label>
              <Input
                placeholder="Ej. K24, F320-001, etc."
                value={newProductSku}
                onChange={(e) => onNewProductSkuChange(e.target.value.toUpperCase())}
                onBlur={(e) => onValidateSku(e.target.value)}
                className="h-9 font-mono text-xs uppercase"
                required
              />
              {skuValidationError && <p className="text-[11px] text-destructive font-medium">{skuValidationError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nombre / Título (opcional)</label>
              <Input
                placeholder="Ej. Playera Básica Cuello Redondo"
                value={newProductNombre}
                onChange={(e) => onNewProductNombreChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Descripción (opcional)</label>
              <Input
                placeholder="Ej. Playera de algodón peinado manga corta"
                value={newProductDescripcion}
                onChange={(e) => onNewProductDescripcionChange(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Familia Asignada</label>
              <Input
                placeholder="Ej. F000-000C o nombre de familia"
                value={newProductFamilia}
                onChange={(e) => onNewProductFamiliaChange(e.target.value)}
                className="h-9 font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Piezas por Caja</label>
                <Input
                  type="number"
                  min="1"
                  value={newProductPzCaja}
                  onChange={(e) => onNewProductPzCajaChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Precio EC ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newProductPrecio}
                  onChange={(e) => onNewProductPrecioChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenCreateProductModalChange(false)}
                disabled={isCreatingProduct}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingProduct || skuChecking || !!skuValidationError}
                className="bg-primary text-primary-foreground font-semibold"
              >
                {isCreatingProduct && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Crear Producto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. DIALOG CREACIÓN DE FAMILIA INTERMEDIA */}
      <Dialog open={isCreateIntermediateDialogOpen} onOpenChange={onOpenCreateIntermediateDialogChange}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Crear Nueva Familia Intermedia
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground leading-normal">
              Se creará una familia intermedia a partir de la familia de referencia{' '}
              <span className="font-mono font-bold text-foreground">&quot;{refFamilyName}&quot;</span>.
            </p>

            <div className="space-y-2 p-3 bg-muted/20 border border-dashed rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Código sugerido:</span>
                <span className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-sans',
                      detail.estrategia === 'overflow-extendido' || detail.estrategia === 'bloque-lleno'
                        ? 'border-amber-500/40 text-amber-600'
                        : 'border-primary/30 text-primary'
                    )}
                    title="Estrategia usada: mitad del rango, decena limpia u overflow A1"
                  >
                    {ESTRATEGIA_LABEL[detail.estrategia]}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => onNewFamilyInputChange(suggestion)}
                    className="font-mono font-bold text-primary hover:underline text-xs"
                    title="Restablecer código sugerido"
                  >
                    {suggestion}
                  </button>
                </span>
              </div>

              {detail.requiereCompactar && (
                <p className="text-[11px] leading-normal text-amber-600 dark:text-amber-400">
                  Quedan menos de {FAMILIA_GAP_MIN_DEFAULT} huecos libres o el bloque está lleno. Se usó overflow
                  infinito (…A1, A2…). Si son familias seguidas, compacta a decenas para liberar 9 espacios entre cada
                  una (solo renombra el texto de familia, sin tocar inventario).
                </p>
              )}

              {denseBlock && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCompactDenseBlock}
                  className="w-full h-8 text-[11px] font-semibold"
                  title="Reubica el bloque denso a decenas limpias dejando 9 huecos libres entre familias"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                  Compactar bloque a decenas ({denseBlock.miembros.length} fams)
                </Button>
              )}

              {suggestedKeywords.length > 0 && (
                <div className="space-y-1 border-t pt-2 mt-2">
                  <span className="text-[10px] text-muted-foreground block font-medium">
                    Palabras clave de la familia anterior:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pt-1">
                    {suggestedKeywords.map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => {
                          const current = newFamilyInput.trim()
                          if (!current.includes(kw)) {
                            onNewFamilyInputChange(current ? `${current} ${kw}` : kw)
                          }
                        }}
                        className="text-[9px] bg-primary/5 hover:bg-primary/20 border border-primary/20 text-primary rounded px-1.5 py-0.5 font-medium transition-colors"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nombre / Código de la familia:</label>
              <Input
                placeholder="Ej. F324-005A, F426-999A1 o Abrigos Premium"
                value={newFamilyInput}
                onChange={(e) => onNewFamilyInputChange(e.target.value)}
                className="h-9 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground leading-normal">
                Si el bloque 900–999 se llena, usa overflow infinito …A1, A2… (mantiene el orden alfabético).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={onCancelCreateIntermediate}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onConfirmCreateIntermediate} className="bg-primary text-primary-foreground font-semibold">
              Crear y Reubicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. MODAL DE CONFIRMACIÓN DE CAMBIOS */}
      <Dialog open={isConfirmModalOpen} onOpenChange={onOpenConfirmModalChange}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl w-full max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Confirmar Reacomodo de Familias</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col space-y-3 py-1 overflow-hidden">
            <p className="text-xs text-muted-foreground leading-normal shrink-0">
              Se realizarán los siguientes cambios en la base de datos de Supabase. Por favor, revísalos con cuidado
              antes de confirmar:
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto max-h-[55vh] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-muted/10 space-y-4 text-xs pr-2">
              {(Object.keys(stagedRenames).length > 0 || Object.keys(autoRenames).length > 0) && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                    Renombrar Familias ({Object.keys(stagedRenames).length + Object.keys(autoRenames).length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(stagedRenames).map(([oldName, newName]) => (
                      <div
                        key={oldName}
                        className="flex items-center justify-between gap-2 text-xs font-mono bg-card border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg shadow-xs"
                      >
                        <span className="text-muted-foreground line-through text-[11px] truncate">{oldName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-bold truncate">{newName}</span>
                        <Badge variant="outline" className="ml-auto text-[9px] shrink-0">
                          Manual
                        </Badge>
                      </div>
                    ))}
                    {Object.entries(autoRenames).map(([oldName, newName]) => (
                      <div
                        key={oldName}
                        className="flex items-center justify-between gap-2 text-xs font-mono bg-amber-500/[0.03] border border-amber-500/25 p-2.5 rounded-lg shadow-xs"
                      >
                        <span className="text-muted-foreground line-through text-[11px] truncate">{oldName}</span>
                        <ArrowRight className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="text-amber-700 dark:text-amber-300 font-bold truncate">{newName}</span>
                        <Badge variant="outline" className="ml-auto text-[9px] border-amber-500/30 text-amber-600 font-sans shrink-0">
                          Auto Sufijo
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(stagedMoves).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                    Reubicar Productos ({Object.keys(stagedMoves).length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(
                      Object.entries(stagedMoves).reduce(
                        (acc, [prodIdStr, destFamily]) => {
                          const finalDest = getFinalFamilyName(destFamily, stagedRenames, autoRenames)
                          if (!acc[finalDest]) acc[finalDest] = []
                          const prodId = parseInt(prodIdStr, 10)
                          let sku = `ID #${prodId}`
                          for (const prods of Object.values(loadedProducts)) {
                            const found = prods.find((p) => p.id === prodId)
                            if (found) {
                              sku = found.sku_base
                              break
                            }
                          }
                          acc[finalDest].push(sku)
                          return acc
                        },
                        {} as Record<string, string[]>
                      )
                    ).map(([destFamily, skus]) => (
                      <div
                        key={destFamily}
                        className="bg-card border border-zinc-200 dark:border-zinc-800 p-3 rounded-lg text-xs space-y-1.5 shadow-xs flex flex-col"
                      >
                        <div className="font-semibold text-foreground flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-1.5 mb-1">
                          <span className="text-muted-foreground text-[11px]">Destino:</span>
                          <Badge
                            variant="outline"
                            className="font-mono bg-primary/10 text-primary border-primary/20 text-[11px] font-bold px-2 py-0.5"
                          >
                            {destFamily}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {skus.map((sku) => (
                            <Badge
                              key={sku}
                              variant="secondary"
                              className="font-mono text-[10px] px-1.5 py-0.5 bg-muted text-foreground"
                            >
                              {sku}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 mt-2 flex items-center justify-end">
            <Button variant="outline" onClick={() => onOpenConfirmModalChange(false)} disabled={isPending}>
              Cancelar y Seguir Editando
            </Button>
            <Button
              onClick={onConfirmPersist}
              disabled={isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando en BD...
                </>
              ) : (
                'Confirmar y Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. MODAL PARA RENOMBRAR FAMILIA */}
      <Dialog open={isRenameModalOpen} onOpenChange={onOpenRenameModalChange}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Renombrar Familia de Productos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <p className="text-muted-foreground leading-normal">
              Estás renombrando la familia{' '}
              <span className="font-mono font-bold text-foreground">&quot;{renameTarget}&quot;</span>. Esto afectará
              localmente a todos los productos agrupados bajo este código en la bandeja de trabajo.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nuevo nombre de la familia:</label>
              <Input
                placeholder="Ej. Jeans Caballero Slim Fit"
                value={renameInput}
                onChange={(e) => onRenameInputChange(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenRenameModalChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onStageRename} className="bg-primary text-primary-foreground">
              Renombrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
