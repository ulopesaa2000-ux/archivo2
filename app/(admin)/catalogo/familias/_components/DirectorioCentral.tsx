// app/(admin)/catalogo/familias/_components/DirectorioCentral.tsx
'use client'

import type { FamiliaResumen, FamiliaResumenSku } from '@/modules/catalogo/queries'
import type { ProductListItem } from '../_hooks/familias-types'
import { ToolbarFamilias } from './ToolbarFamilias'
import { DirectorioSkusView } from './DirectorioSkusView'
import { DirectorioCardsView } from './DirectorioCardsView'

interface DirectorioCentralProps {
  searchQuery: string
  onSearchChange: (val: string) => void
  highlightedFamily: string | null
  onScrollToHighlightedFamily: (familyName: string) => void
  onClearHighlightedFamily: () => void
  activeDirTab: 'cards' | 'skus'
  onTabChange: (tab: 'cards' | 'skus') => void
  onExportToExcel: () => void
  isRightPanelOpen: boolean
  onToggleRightPanel: () => void
  stagedMovesCount: number
  mostrarInactivos: boolean
  onToggleMostrarInactivos: (checked: boolean) => void
  modoStock: boolean
  onToggleModoStock: (checked: boolean) => void
  loadingStock: boolean
  onRefreshInfo: () => void
  refreshingInfo: boolean
  ultimoRefresh: string | null
  filteredActiveFamiliesList: FamiliaResumen[]
  initialFamilias: FamiliaResumen[]
  loadedProducts: Record<string, ProductListItem[]>
  loadingProducts: Record<string, boolean>
  expandedFamilies: Record<string, boolean>
  stagedMoves: Record<number, string>
  stagedRenames: Record<string, string>
  autoRenames: Record<string, string>
  netSkusMap: Record<string, FamiliaResumenSku[]>
  netCounts: Record<string, number>
  selectedProductIds: Record<number, boolean>
  puedeEditar: boolean
  clasesSemaforoSku: (productoId: number) => string
  claseTextoSku: (productoId: number) => string
  tituloStockSku: (productoId: number) => string | undefined
  onGoToFamilyInList: (familyName: string) => void
  onToggleExpandFamily: (familyCode: string) => void
  onOpenRenameModal: (familyName: string) => void
  onInspectProduct: (id: number, skuBase: string, descripcion: string | null) => void
  onSelectInspectProduct: (product: ProductListItem) => void
  onToggleSelectProduct: (productId: number) => void
  onDragStart: (e: React.DragEvent, prodId: number, skuBase?: string) => void
  onDragEnd: () => void
  onDropOnFamily: (e: React.DragEvent, targetFamily: string) => void
  onDropOnInsertionZone: (e: React.DragEvent, prevFamilyCode: string) => void
  onUpdateDragTooltip: (text: string) => void
}

export function DirectorioCentral(props: DirectorioCentralProps) {
  return (
    <main className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-muted/10">
      <ToolbarFamilias
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
        highlightedFamily={props.highlightedFamily}
        onScrollToHighlightedFamily={props.onScrollToHighlightedFamily}
        onClearHighlightedFamily={props.onClearHighlightedFamily}
        activeDirTab={props.activeDirTab}
        onTabChange={props.onTabChange}
        onExportToExcel={props.onExportToExcel}
        isRightPanelOpen={props.isRightPanelOpen}
        onToggleRightPanel={props.onToggleRightPanel}
        stagedMovesCount={props.stagedMovesCount}
        mostrarInactivos={props.mostrarInactivos}
        onToggleMostrarInactivos={props.onToggleMostrarInactivos}
        modoStock={props.modoStock}
        onToggleModoStock={props.onToggleModoStock}
        loadingStock={props.loadingStock}
        onRefreshInfo={props.onRefreshInfo}
        refreshingInfo={props.refreshingInfo}
        ultimoRefresh={props.ultimoRefresh}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        {props.activeDirTab === 'skus' ? (
          <DirectorioSkusView
            filteredActiveFamiliesList={props.filteredActiveFamiliesList}
            initialFamilias={props.initialFamilias}
            highlightedFamily={props.highlightedFamily}
            stagedRenames={props.stagedRenames}
            autoRenames={props.autoRenames}
            netSkusMap={props.netSkusMap}
            searchQuery={props.searchQuery}
            modoStock={props.modoStock}
            clasesSemaforoSku={props.clasesSemaforoSku}
            tituloStockSku={props.tituloStockSku}
            onClearHighlightedFamily={props.onClearHighlightedFamily}
            onGoToFamilyInList={props.onGoToFamilyInList}
            onInspectProduct={props.onInspectProduct}
            onDragStart={props.onDragStart}
            onDragEnd={props.onDragEnd}
            onDropOnFamily={props.onDropOnFamily}
            onDropOnInsertionZone={props.onDropOnInsertionZone}
            onUpdateDragTooltip={props.onUpdateDragTooltip}
          />
        ) : (
          <DirectorioCardsView
            filteredActiveFamiliesList={props.filteredActiveFamiliesList}
            initialFamilias={props.initialFamilias}
            highlightedFamily={props.highlightedFamily}
            loadedProducts={props.loadedProducts}
            loadingProducts={props.loadingProducts}
            expandedFamilies={props.expandedFamilies}
            stagedMoves={props.stagedMoves}
            stagedRenames={props.stagedRenames}
            autoRenames={props.autoRenames}
            netSkusMap={props.netSkusMap}
            netCounts={props.netCounts}
            selectedProductIds={props.selectedProductIds}
            mostrarInactivos={props.mostrarInactivos}
            searchQuery={props.searchQuery}
            puedeEditar={props.puedeEditar}
            claseTextoSku={props.claseTextoSku}
            tituloStockSku={props.tituloStockSku}
            onClearHighlightedFamily={props.onClearHighlightedFamily}
            onToggleExpandFamily={props.onToggleExpandFamily}
            onGoToFamilyInList={props.onGoToFamilyInList}
            onOpenRenameModal={props.onOpenRenameModal}
            onSelectInspectProduct={props.onSelectInspectProduct}
            onToggleSelectProduct={props.onToggleSelectProduct}
            onDragStart={props.onDragStart}
            onDragEnd={props.onDragEnd}
            onDropOnFamily={props.onDropOnFamily}
            onDropOnInsertionZone={props.onDropOnInsertionZone}
          />
        )}
      </div>
    </main>
  )
}
