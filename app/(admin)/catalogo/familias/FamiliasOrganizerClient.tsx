// app/(admin)/catalogo/familias/FamiliasOrganizerClient.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { GripVertical } from 'lucide-react'
import type { FamiliaResumen } from '@/modules/catalogo/queries'
import type { CatalogosParaFiltros } from '@/modules/catalogo/types'
import { SidebarBandeja } from './_components/SidebarBandeja'
import { DirectorioCentral } from './_components/DirectorioCentral'
import { InspectorProducto } from './_components/InspectorProducto'
import { Modales } from './_components/Modales'
import { useBandeja } from './_hooks/use-bandeja'
import { useBorrador } from './_hooks/use-borrador'
import { useDirectorio } from './_hooks/use-directorio'
import { useStockSemaforo } from './_hooks/use-stock-semaforo'
import { useRefreshQuirurgico } from './_hooks/use-refresh-quirurgico'
import { exportFamiliasToExcel } from './_hooks/export-familias-excel'
import type { ProductListItem } from './_hooks/familias-types'

const BarraBorrador = dynamic(
  () => import('./_components/BarraBorrador').then((m) => m.BarraBorrador),
  { ssr: false }
)

interface FamiliasOrganizerClientProps {
  initialFamilias: FamiliaResumen[]
  puedeEditar: boolean
  catalogos: CatalogosParaFiltros
}

export function FamiliasOrganizerClient({
  initialFamilias,
  puedeEditar,
  catalogos,
}: FamiliasOrganizerClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [familias, setFamilias] = useState<FamiliaResumen[]>(initialFamilias)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [highlightedFamily, setHighlightedFamily] = useState<string | null>(null)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)

  const bandeja = useBandeja({
    familias,
    setFamilias,
    highlightedFamily,
    setIsRightPanelOpen,
  })

  const borrador = useBorrador({
    initialFamilias,
    familias,
    setFamilias,
    loadedProducts: bandeja.loadedProducts,
    setLoadedProducts: bandeja.setLoadedProducts,
    setPinnedFamilies: bandeja.setPinnedFamilies,
    loadProductsForFamily: bandeja.loadProductsForFamily,
    mostrarInactivos,
    puedeEditar,
    startTransition,
    onRefreshRoute: () => router.refresh(),
    onResetFiltersAfterPersist: () => {
      directorio.setSearchQuery('')
    },
  })

  const directorio = useDirectorio({
    initialFamilias,
    familias,
    setFamilias,
    loadedProducts: bandeja.loadedProducts,
    setLoadedProducts: bandeja.setLoadedProducts,
    loadingProducts: bandeja.loadingProducts,
    stagedMoves: borrador.stagedMoves,
    setStagedMoves: borrador.setStagedMoves,
    stagedRenames: borrador.stagedRenames,
    setStagedRenames: borrador.setStagedRenames,
    selectedProductIds: borrador.selectedProductIds,
    setSelectedProductIds: borrador.setSelectedProductIds,
    netCounts: borrador.netCounts,
    netSkusMap: borrador.netSkusMap,
    autoRenames: borrador.autoRenames,
    loadProductsForFamily: bandeja.loadProductsForFamily,
    mostrarInactivos,
    setHighlightedFamily,
  })

  const semaforo = useStockSemaforo({
    familias,
    loadedProducts: bandeja.loadedProducts,
    pinnedFamilies: bandeja.pinnedFamilies,
    inspectedProductId: bandeja.inspectedProduct?.id ?? null,
  })

  const refresh = useRefreshQuirurgico({
    initialFamilias,
    setFamilias,
    loadedProducts: bandeja.loadedProducts,
    setLoadedProducts: bandeja.setLoadedProducts,
    loadProductsForFamily: bandeja.loadProductsForFamily,
    pinnedFamilies: bandeja.pinnedFamilies,
    highlightedFamily,
    stagedMoves: borrador.stagedMoves,
    modoStock: semaforo.modoStock,
    invalidateAndReloadStock: semaforo.invalidateAndReloadStock,
    setInspectedProduct: bandeja.setInspectedProduct,
  })

  const handleUpdateDragTooltip = useCallback(
    (text: string) => {
      bandeja.setDragTooltip((prev) => (prev ? { ...prev, text } : null))
    },
    [bandeja]
  )

  const handleDropOnFamily = useCallback(
    (e: React.DragEvent, targetFamily: string) => {
      e.preventDefault()
      e.currentTarget.classList.remove('border-primary', 'bg-primary/[0.03]', 'bg-primary/[0.01]')
      bandeja.setDraggedProductId(null)
      bandeja.setDragTooltip(null)

      const prodIdStr =
        e.dataTransfer.getData('text/plain') || (bandeja.draggedProductId ? bandeja.draggedProductId.toString() : '')
      if (!prodIdStr) return

      const prodId = parseInt(prodIdStr, 10)
      let originalFamily: string | null = null
      for (const [fam, prods] of Object.entries(bandeja.loadedProducts)) {
        if (prods.some((p) => p.id === prodId)) {
          originalFamily = fam
          break
        }
      }

      const currentFamily = borrador.stagedMoves[prodId] !== undefined ? borrador.stagedMoves[prodId] : originalFamily
      if (currentFamily === targetFamily) return

      borrador.setStagedMoves((prev) => ({
        ...prev,
        [prodId]: targetFamily,
      }))

      void bandeja.loadProductsForFamily(targetFamily)

      let productToMove: ProductListItem | undefined
      for (const prods of Object.values(bandeja.loadedProducts)) {
        const found = prods.find((p) => p.id === prodId)
        if (found) {
          productToMove = found
          break
        }
      }

      if (productToMove && bandeja.loadedProducts[targetFamily]) {
        const alreadyInDest = bandeja.loadedProducts[targetFamily].some((p) => p.id === prodId)
        if (!alreadyInDest) {
          bandeja.setLoadedProducts((prev) => ({
            ...prev,
            [targetFamily]: [...(prev[targetFamily] || []), { ...productToMove!, familia: targetFamily }],
          }))
        }
      }

      borrador.setSelectedProductIds((prev) => ({ ...prev, [prodId]: false }))
      toast.success(`Producto reubicado localmente a "${targetFamily}"`)
    },
    [bandeja, borrador]
  )

  const handleDropOnBandeja = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.currentTarget.classList.remove('ring-1', 'ring-primary/40')
      bandeja.setDraggedProductId(null)
      bandeja.setDragTooltip(null)

      const prodIdStr =
        e.dataTransfer.getData('text/plain') || (bandeja.draggedProductId ? bandeja.draggedProductId.toString() : '')
      if (!prodIdStr) return

      const prodId = parseInt(prodIdStr, 10)
      let foundInLoaded = false
      for (const prods of Object.values(bandeja.loadedProducts)) {
        if (prods.some((p) => p.id === prodId)) {
          foundInLoaded = true
          break
        }
      }

      if (!foundInLoaded) {
        let syntheticProduct: ProductListItem | null = null
        for (const f of familias) {
          const sku = f.skus?.find((s) => s.id === prodId)
          if (sku) {
            syntheticProduct = {
              id: prodId,
              sku_base: sku.sku_base,
              nombre: null,
              descripcion: sku.descripcion || null,
              familia: f.familia || 'F000-000C',
              precio_ec: null,
              pz_en_caja: null,
              activo: true,
              imagen_principal: null,
            }
            break
          }
        }

        if (syntheticProduct) {
          const famKey = syntheticProduct.familia || 'F000-000C'
          bandeja.setLoadedProducts((prev) => ({
            ...prev,
            [famKey]: [...(prev[famKey] || []), syntheticProduct!],
          }))
        }
      }

      borrador.setSelectedProductIds((prev) => ({
        ...prev,
        [prodId]: true,
      }))
      toast.info('Producto agregado a la bandeja de reasignación')
    },
    [bandeja, familias, borrador]
  )

  const handleDropOnInsertionZone = useCallback(
    (e: React.DragEvent, prevFamilyCode: string) => {
      e.preventDefault()
      e.currentTarget.classList.remove('active', 'border-primary', 'bg-primary/5', 'h-16')
      bandeja.setDraggedProductId(null)
      bandeja.setDragTooltip(null)

      const prodIdStr =
        e.dataTransfer.getData('text/plain') || (bandeja.draggedProductId ? bandeja.draggedProductId.toString() : '')
      if (!prodIdStr) return

      const prodId = parseInt(prodIdStr, 10)
      const suggestion = directorio.getIntermediateCodeSuggestion(prevFamilyCode)

      directorio.setRefFamilyName(prevFamilyCode)
      directorio.setNewFamilyInput(suggestion)
      borrador.setSelectedProductIds({ [prodId]: true })
      directorio.setIsCreateIntermediateDialogOpen(true)
    },
    [bandeja, directorio, borrador]
  )

  return (
    <div
      id="familias-organizer-container"
      className="relative h-full w-full flex flex-col bg-background text-foreground overflow-hidden"
      onMouseMove={bandeja.handleGlobalMouseMove}
    >
      {/* TOOLTIP FLOTANTE DURANTE DRAG */}
      {bandeja.dragTooltip && bandeja.draggedProductId !== null && (
        <div
          className="fixed pointer-events-none z-[200] flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-2xl border border-border/60 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-medium select-none"
          style={{ left: bandeja.dragTooltip.x, top: bandeja.dragTooltip.y }}
        >
          <GripVertical className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{bandeja.dragTooltip.text}</span>
        </div>
      )}

      {/* BARRA DE ACCIONES SUPERIOR (Lazy via dynamic import con motion/react) */}
      {borrador.hasPendingChanges && (
        <BarraBorrador
          hasPendingChanges={borrador.hasPendingChanges}
          movesCount={Object.keys(borrador.stagedMoves).length}
          renamesCount={Object.keys(borrador.stagedRenames).length}
          onDiscardChanges={borrador.handleDiscardChanges}
          onOlvidarBorrador={borrador.handleOlvidarBorrador}
          onOpenConfirmModal={() => borrador.setIsConfirmModalOpen(true)}
        />
      )}

      {/* CONTENEDOR PRINCIPAL EN 3 COLUMNAS */}
      <div className="flex-1 flex overflow-hidden bg-card text-foreground w-full h-full">
        <SidebarBandeja
          isSinAsignarCollapsed={directorio.isSinAsignarCollapsed}
          onToggleSinAsignar={() => directorio.setIsSinAsignarCollapsed((v) => !v)}
          isBandejaCollapsed={directorio.isBandejaCollapsed}
          onToggleBandeja={() => directorio.setIsBandejaCollapsed((v) => !v)}
          onExpandBandeja={() => directorio.setIsBandejaCollapsed(false)}
          leftSearchQuery={directorio.leftSearchQuery}
          onLeftSearchChange={directorio.setLeftSearchQuery}
          loadingSinAsignar={!!bandeja.loadingProducts['F000-000C']}
          unassignedProducts={directorio.unassignedProducts}
          filteredUnassigned={directorio.filteredUnassigned}
          selectedProductIds={borrador.selectedProductIds}
          selectedProducts={borrador.selectedProducts}
          onToggleSelectProduct={borrador.toggleSelectProduct}
          onSelectInspectProduct={(product) => {
            bandeja.setInspectedProduct(product)
            setIsRightPanelOpen(true)
          }}
          onInspectBySku={(id, skuBase, desc) => void bandeja.handleInspectProduct(id, skuBase, desc)}
          onDragStart={bandeja.handleDragStart}
          onDragEnd={bandeja.handleDragEnd}
          onDropOnBandeja={handleDropOnBandeja}
          onUpdateDragTooltip={handleUpdateDragTooltip}
          onOlvidarBandeja={borrador.handleOlvidarBandeja}
        />

        <DirectorioCentral
          searchQuery={directorio.searchQuery}
          onSearchChange={directorio.setSearchQuery}
          highlightedFamily={highlightedFamily}
          onScrollToHighlightedFamily={directorio.handleScrollToHighlightedFamily}
          onClearHighlightedFamily={() => setHighlightedFamily(null)}
          activeDirTab={directorio.activeDirTab}
          onTabChange={directorio.setActiveDirTab}
          onExportToExcel={() =>
            void exportFamiliasToExcel({
              familias,
              loadedProducts: bandeja.loadedProducts,
              stagedMoves: borrador.stagedMoves,
              mostrarInactivos,
              netCounts: borrador.netCounts,
            })
          }
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen((v) => !v)}
          stagedMovesCount={Object.keys(borrador.stagedMoves).length}
          mostrarInactivos={mostrarInactivos}
          onToggleMostrarInactivos={setMostrarInactivos}
          modoStock={semaforo.modoStock}
          onToggleModoStock={(checked) => void semaforo.toggleModoStock(checked)}
          loadingStock={semaforo.loadingStock}
          onRefreshInfo={() => void refresh.handleRefreshInfo()}
          refreshingInfo={refresh.refreshingInfo}
          ultimoRefresh={refresh.ultimoRefresh}
          filteredActiveFamiliesList={directorio.filteredActiveFamiliesList}
          initialFamilias={initialFamilias}
          loadedProducts={bandeja.loadedProducts}
          loadingProducts={bandeja.loadingProducts}
          expandedFamilies={directorio.expandedFamilies}
          stagedMoves={borrador.stagedMoves}
          stagedRenames={borrador.stagedRenames}
          autoRenames={borrador.autoRenames}
          netSkusMap={borrador.netSkusMap}
          netCounts={borrador.netCounts}
          selectedProductIds={borrador.selectedProductIds}
          puedeEditar={puedeEditar}
          clasesSemaforoSku={semaforo.clasesSemaforoSku}
          claseTextoSku={semaforo.claseTextoSku}
          tituloStockSku={semaforo.tituloStockSku}
          onGoToFamilyInList={directorio.handleGoToFamilyInList}
          onToggleExpandFamily={directorio.handleToggleExpandFamily}
          onOpenRenameModal={directorio.handleOpenRenameModal}
          onInspectProduct={(id, skuBase, desc) => void bandeja.handleInspectProduct(id, skuBase, desc)}
          onSelectInspectProduct={(product) => {
            bandeja.setInspectedProduct(product)
            setIsRightPanelOpen(true)
          }}
          onToggleSelectProduct={borrador.toggleSelectProduct}
          onDragStart={bandeja.handleDragStart}
          onDragEnd={bandeja.handleDragEnd}
          onDropOnFamily={handleDropOnFamily}
          onDropOnInsertionZone={handleDropOnInsertionZone}
          onUpdateDragTooltip={handleUpdateDragTooltip}
        />

        <InspectorProducto
          isRightPanelOpen={isRightPanelOpen}
          onCloseRightPanel={() => setIsRightPanelOpen(false)}
          hasPendingChanges={borrador.hasPendingChanges}
          onDiscardChanges={borrador.handleDiscardChanges}
          inspectedProduct={bandeja.inspectedProduct}
          onClearInspectedProduct={() => bandeja.setInspectedProduct(null)}
          loadingInspection={bandeja.loadingInspection}
          imagenExpandida={bandeja.imagenExpandida}
          onToggleImagenExpandida={() => bandeja.setImagenExpandida((v) => !v)}
          puedeEditar={puedeEditar}
          catalogos={catalogos}
          onDescripcionSaved={refresh.handleDescripcionSaved}
          selectedProductIds={borrador.selectedProductIds}
          onToggleSelectProduct={borrador.toggleSelectProduct}
          modoStock={semaforo.modoStock}
          stockMap={semaforo.stockMap}
          loadingStock={semaforo.loadingStock}
          stagedRenames={borrador.stagedRenames}
          autoRenames={borrador.autoRenames}
          stagedMoves={borrador.stagedMoves}
          loadedProducts={bandeja.loadedProducts}
          familias={familias}
          onCancelStagedMove={borrador.handleCancelStagedMove}
          onOpenConfirmModal={() => borrador.setIsConfirmModalOpen(true)}
          isPending={isPending}
          onDragStart={bandeja.handleDragStart}
          onDragEnd={bandeja.handleDragEnd}
        />
      </div>

      <Modales
        isCreateProductModalOpen={bandeja.isCreateProductModalOpen}
        onOpenCreateProductModalChange={bandeja.setIsCreateProductModalOpen}
        newProductSku={bandeja.newProductSku}
        onNewProductSkuChange={bandeja.setNewProductSku}
        onValidateSku={(val) => void bandeja.handleValidateSku(val)}
        skuChecking={bandeja.skuChecking}
        skuValidationError={bandeja.skuValidationError}
        newProductNombre={bandeja.newProductNombre}
        onNewProductNombreChange={bandeja.setNewProductNombre}
        newProductDescripcion={bandeja.newProductDescripcion}
        onNewProductDescripcionChange={bandeja.setNewProductDescripcion}
        newProductFamilia={bandeja.newProductFamilia}
        onNewProductFamiliaChange={bandeja.setNewProductFamilia}
        newProductPzCaja={bandeja.newProductPzCaja}
        onNewProductPzCajaChange={bandeja.setNewProductPzCaja}
        newProductPrecio={bandeja.newProductPrecio}
        onNewProductPrecioChange={bandeja.setNewProductPrecio}
        isCreatingProduct={bandeja.isCreatingProduct}
        onCreateProductSubmit={(e) => void bandeja.handleCreateProductSubmit(e)}
        isCreateIntermediateDialogOpen={directorio.isCreateIntermediateDialogOpen}
        onOpenCreateIntermediateDialogChange={directorio.setIsCreateIntermediateDialogOpen}
        refFamilyName={directorio.refFamilyName}
        newFamilyInput={directorio.newFamilyInput}
        onNewFamilyInputChange={directorio.setNewFamilyInput}
        suggestedKeywords={directorio.suggestedKeywords}
        getIntermediateDetail={directorio.getIntermediateDetail}
        getIntermediateCodeSuggestion={directorio.getIntermediateCodeSuggestion}
        getDenseBlockForRef={directorio.getDenseBlockForRef}
        onCompactDenseBlock={directorio.handleCompactDenseBlock}
        onCancelCreateIntermediate={() => {
          directorio.setIsCreateIntermediateDialogOpen(false)
          borrador.setSelectedProductIds({})
        }}
        onConfirmCreateIntermediate={directorio.handleConfirmCreateIntermediate}
        isConfirmModalOpen={borrador.isConfirmModalOpen}
        onOpenConfirmModalChange={borrador.setIsConfirmModalOpen}
        stagedRenames={borrador.stagedRenames}
        autoRenames={borrador.autoRenames}
        stagedMoves={borrador.stagedMoves}
        loadedProducts={bandeja.loadedProducts}
        isPending={isPending}
        onConfirmPersist={borrador.handleConfirmPersist}
        isRenameModalOpen={directorio.isRenameModalOpen}
        onOpenRenameModalChange={directorio.setIsRenameModalOpen}
        renameTarget={directorio.renameTarget}
        renameInput={directorio.renameInput}
        onRenameInputChange={directorio.setRenameInput}
        onStageRename={directorio.handleStageRename}
      />
    </div>
  )
}
