// app/(admin)/inventario/stock/StockFilters.tsx
'use client'

import { useState, useEffect } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Search, Loader2, X, Eye, Layers } from 'lucide-react'
import { useFilterParams } from '@/components/admin/useFilterParams'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function StockFilters({ defaultAgrupacion = 'ninguno' }: { defaultAgrupacion?: string }) {
  const { updateParam, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  const currentQ          = searchParam('q')
  const currentStockCero  = searchParam('con_stock_cero') === 'true'
  const currentAgrupacion = searchParam('agrupar_por') || defaultAgrupacion

  const [localQ, setLocalQ] = useState(currentQ)

  useEffect(() => {
    setLocalQ(currentQ)
  }, [currentQ])

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term.trim() || null)
  }, 300)

  const onSearchChange = (val: string) => {
    setLocalQ(val)
    handleSearch(val)
  }

  const handleClear = () => {
    setLocalQ('')
    clearAll(['stock-search'])
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      {/* Buscador */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="stock-search"
          placeholder="Buscar por SKU o nombre..."
          value={localQ}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Agrupar Por */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[140px] justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              {currentAgrupacion === 'familia' ? 'Por Familia' : 'Sin agrupar'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[160px]">
          <DropdownMenuRadioGroup
            value={currentAgrupacion}
            onValueChange={(val) => updateParam('agrupar_por', val === defaultAgrupacion ? null : val)}
          >
            <DropdownMenuRadioItem value="ninguno">Sin agrupar</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="familia">Por Familia</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Checkbox: stock en cero */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="stock-cero"
          checked={currentStockCero}
          onCheckedChange={(checked) =>
            updateParam('con_stock_cero', checked === true ? 'true' : null)
          }
        />
        <Label htmlFor="stock-cero" className="text-sm font-normal cursor-pointer flex items-center gap-1">
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          Incluir stock en cero
        </Label>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}

