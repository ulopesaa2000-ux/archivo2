// app/(admin)/inventario/stock/StockFilters.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Eye, Layers, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import { useFilterParams } from '@/components/admin/useFilterParams'
import { SearchInput } from '@/components/admin/SearchInput'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function StockFilters({
  defaultAgrupacion = 'ninguno',
  totalNotasPendientes = 0,
}: {
  defaultAgrupacion?: string
  totalNotasPendientes?: number
}) {
  const { updateParam, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  const currentModo          = searchParam('modo') === 'pronostico' ? 'pronostico' : 'fisico'
  const currentSoloAfectados = searchParam('solo_afectados') === 'true'
  const currentQ             = searchParam('q')
  const currentStockCero     = searchParam('con_stock_cero') === 'true'
  const currentAgrupacion    = searchParam('agrupar_por') || defaultAgrupacion

  const handleClear = () => {
    clearAll(['stock-search'])
  }

  const handleModoChange = (modo: 'fisico' | 'pronostico') => {
    if (modo === 'fisico') {
      updateParam('modo', null)
      updateParam('solo_afectados', null)
    } else {
      updateParam('modo', 'pronostico')
    }
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${isPending ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {/* Selector de Modo: Físico vs Pronosticado */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shadow-sm">
          <Button
            type="button"
            variant={currentModo === 'fisico' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModoChange('fisico')}
            className={`h-8 text-xs font-semibold px-3 gap-1.5 transition-all ${
              currentModo === 'fisico' ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            Stock Real
          </Button>
          <Button
            type="button"
            variant={currentModo === 'pronostico' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleModoChange('pronostico')}
            className={`h-8 text-xs font-semibold px-3 gap-1.5 transition-all ${
              currentModo === 'pronostico'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Stock Pronosticado
            {totalNotasPendientes > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                {totalNotasPendientes}
              </Badge>
            )}
          </Button>
        </div>

        {/* Buscador */}
        <SearchInput
          id="stock-search"
          placeholder="Buscar por SKU o nombre..."
          currentValue={currentQ}
          onSearch={(term) => updateParam('q', term)}
          delay={300}
          minLength={2}
          controlled
        />

        {/* Agrupar Por */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 min-w-[130px] justify-between text-xs">
              <span className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                {currentAgrupacion === 'familia' ? 'Por Familia' : 'Sin agrupar'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[160px]">
            <DropdownMenuRadioGroup
              value={currentAgrupacion}
              onValueChange={(val) => updateParam('agrupar_por', val === defaultAgrupacion ? null : val)}
            >
              <DropdownMenuRadioItem value="ninguno" className="text-xs">Sin agrupar</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="familia" className="text-xs">Por Familia</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Checkbox: Solo Afectados (solo visible en modo pronóstico) */}
        {currentModo === 'pronostico' && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300">
            <Checkbox
              id="solo-afectados"
              checked={currentSoloAfectados}
              onCheckedChange={(checked) =>
                updateParam('solo_afectados', checked === true ? 'true' : null)
              }
              className="border-amber-500 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
            />
            <Label htmlFor="solo-afectados" className="text-xs font-semibold cursor-pointer flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Solo productos afectados
            </Label>
          </div>
        )}

        {/* Checkbox: stock en cero (solo en modo físico) */}
        {currentModo === 'fisico' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="stock-cero"
              checked={currentStockCero}
              onCheckedChange={(checked) =>
                updateParam('con_stock_cero', checked === true ? 'true' : null)
              }
            />
            <Label htmlFor="stock-cero" className="text-xs font-normal cursor-pointer flex items-center gap-1 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              Incluir stock en cero
            </Label>
          </div>
        )}
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground h-8 text-xs px-2"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}


