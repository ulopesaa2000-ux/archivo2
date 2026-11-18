// app/(admin)/catalogo/familias/_components/ToolbarFamilias.tsx
'use client'

import Link from 'next/link'
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  History,
  Info,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ToolbarFamiliasProps {
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
}

export function ToolbarFamilias({
  searchQuery,
  onSearchChange,
  highlightedFamily,
  onScrollToHighlightedFamily,
  onClearHighlightedFamily,
  activeDirTab,
  onTabChange,
  onExportToExcel,
  isRightPanelOpen,
  onToggleRightPanel,
  stagedMovesCount,
  mostrarInactivos,
  onToggleMostrarInactivos,
  modoStock,
  onToggleModoStock,
  loadingStock,
  onRefreshInfo,
  refreshingInfo,
  ultimoRefresh,
}: ToolbarFamiliasProps) {
  return (
    <>
      <div className="p-2 bg-card border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-x-2.5 gap-y-1 shrink-0">
        {/* Grupo 1: Buscador (arriba) + Ubicando familia (abajo) */}
        <div className="flex flex-col gap-1 flex-[1_1_220px] min-w-[200px] max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar familias, productos o SKUs..."
              className="pl-8 pr-7 h-8 w-full text-xs"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {highlightedFamily && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 animate-in fade-in duration-200 self-start transition-colors group">
              <button
                type="button"
                onClick={() => onScrollToHighlightedFamily(highlightedFamily)}
                className="flex items-center gap-1 text-[11px] truncate max-w-[180px] hover:underline cursor-pointer"
                title="Clic para ir y hacer scroll hasta esta familia"
              >
                <span>Ubicando:</span>
                <span className="font-mono font-bold text-blue-800 dark:text-blue-200">{highlightedFamily}</span>
                <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearHighlightedFamily()
                }}
                className="p-0.5 hover:bg-blue-500/30 rounded text-blue-600 dark:text-blue-400 transition-colors ml-0.5 cursor-pointer"
                title="Quitar destacado de esta familia"
              >
                <X className="h-3 w-3 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Grupo 2: Selector de Vistas + Exportar Excel + Impresión */}
        <div className="flex flex-row flex-wrap items-center gap-1 shrink-0">
          <div className="flex bg-muted p-0.5 rounded-lg text-xs shrink-0">
            <button
              onClick={() => onTabChange('cards')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all font-medium text-xs text-center whitespace-nowrap',
                activeDirTab === 'cards' ? 'bg-card text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Vista Tarjetas
            </button>
            <button
              onClick={() => onTabChange('skus')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all font-medium text-xs text-center whitespace-nowrap',
                activeDirTab === 'skus' ? 'bg-card text-foreground shadow-xs font-bold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Vista Puro SKU
            </button>
          </div>

          <Button
            onClick={onExportToExcel}
            variant="outline"
            className="h-8 border-green-600/30 hover:bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center gap-1.5 text-xs shrink-0"
            size="sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span>Exportar Excel</span>
          </Button>

          <Link href="/print/inventario/familias" target="_blank">
            <Button
              variant="outline"
              className="h-8 border-blue-600/30 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center gap-1.5 text-xs shrink-0"
              size="sm"
              title="Abrir vista de impresión en carta horizontal (papel o PDF)"
            >
              <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Vista de impresión</span>
            </Button>
          </Link>
        </div>

        {/* Grupo 3: Cambios + checks + Refresh quirúrgico */}
        <div className="flex flex-row flex-wrap items-center justify-end gap-1 shrink-0 ms-auto self-start">
          <Button
            variant="ghost"
            onClick={onToggleRightPanel}
            className="h-8 text-xs flex items-center gap-1.5 bg-muted/40 hover:bg-muted"
            size="sm"
            title="Historial de cambios pendientes"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Cambios</span>
            <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-muted text-foreground">
              ({stagedMovesCount})
            </span>
            {isRightPanelOpen ? (
              <ChevronRight className="h-3.5 w-3.5 ml-0.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-muted-foreground" />
            )}
          </Button>

          <div className="hidden sm:flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border text-xs shrink-0">
            <Checkbox
              id="mostrar-inactivos"
              checked={mostrarInactivos}
              onCheckedChange={(checked) => onToggleMostrarInactivos(!!checked)}
              className="h-3.5 w-3.5"
            />
            <label
              htmlFor="mostrar-inactivos"
              className="text-[11px] font-medium cursor-pointer text-muted-foreground select-none hover:text-foreground whitespace-nowrap"
            >
              <span className="hidden lg:inline">Mostrar inactivos (Andrés Mendoza)</span>
              <span className="lg:hidden">Inactivos</span>
            </label>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border text-xs shrink-0">
            <Checkbox
              id="modo-stock"
              checked={modoStock}
              onCheckedChange={(checked) => onToggleModoStock(!!checked)}
              className="h-3.5 w-3.5"
            />
            <label
              htmlFor="modo-stock"
              className="text-[11px] font-medium cursor-pointer text-muted-foreground select-none hover:text-foreground whitespace-nowrap"
            >
              <span className="hidden lg:inline">Modo stock (semáforo)</span>
              <span className="lg:hidden">Stock</span>
            </label>
            {loadingStock && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefreshInfo}
            disabled={refreshingInfo}
            title={
              ultimoRefresh
                ? `Actualizar información (último ${ultimoRefresh})`
                : 'Actualizar descripciones, fotos y nuevos sin asignar'
            }
            className="h-8 w-8 shrink-0"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshingInfo && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Leyenda del semáforo */}
      {modoStock && (
        <div className="px-6 pt-2">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-muted/40 px-3 py-2">
            <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Stock global:
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 inline-block" /> 0 cajas
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" /> 1–4 cajas
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" /> 5+ cajas
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-300 inline-block" /> Inactivo
            </span>
            {mostrarInactivos && (
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                Ambos modos activos: el rosa marca inactivos y el semáforo aplica solo a activos.
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}
