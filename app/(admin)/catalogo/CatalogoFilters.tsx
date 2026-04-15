// app/(admin)/catalogo/CatalogoFilters.tsx
'use client'

import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { Search, Loader2, X, Star, EyeOff, ArrowUpDown } from 'lucide-react'
import { ESTADO_PRODUCTO_COLORS } from '@/lib/constants'
import { useFilterParams } from '@/components/admin/useFilterParams'
import type { CatalogosParaFiltros, CatalogoSortBy } from '@/modules/catalogo/types'

const SORT_OPTIONS: { value: CatalogoSortBy; label: string }[] = [
  { value: 'id',         label: 'Más recientes' },
  { value: 'sku_base',   label: 'SKU (A→Z)'    },
  { value: 'familia',    label: 'Familia'       },
  { value: 'marca_id',   label: 'Marca'         },
  { value: 'precio_ec',  label: 'Precio EC'     },
  { value: 'pz_en_caja', label: 'Pz/Caja'      },
  { value: 'estado',     label: 'Estado'        },
]

/**
 * Barra de filtros del catálogo.
 *
 * ES CLIENT COMPONENT pero NO se desmonta al cambiar filtros.
 * Solo la tabla de abajo se re-renderiza.
 *
 * Usa el hook compartido `useFilterParams` para toda la lógica de URL.
 */
export function CatalogoFilters({
  catalogos,
  sortBy,
  order,
}: {
  catalogos: CatalogosParaFiltros
  sortBy: CatalogoSortBy
  order: 'asc' | 'desc'
}) {
  const { updateParam, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  // Buscador con debounce
  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 300)

  const currentQ         = searchParam('q')
  const currentEstado    = searchParam('estado', '_all')
  const currentMarca     = searchParam('marca_id', '_all')
  const currentGenero    = searchParam('genero_id', '_all')
  const currentDestacados = searchParam('destacados') === 'true'
  const currentInactivos  = searchParam('incluir_inactivos') === 'true'

  return (
    <div className={`space-y-4 ${isPending ? 'opacity-70' : ''}`}>
      {/* ── Fila 1: Buscador ─────────────────────────────── */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          key={currentQ}
          id="catalogo-search"
          placeholder="Buscar por SKU o descripción..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* ── Fila 2: Selects + Checkboxes ─────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Estado */}
        <Select
          value={currentEstado}
          onValueChange={(v) => updateParam('estado', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <span className="truncate">
              {currentEstado === '_all' ? 'Todos los estados' : (
                <span className="capitalize">{currentEstado}</span>
              )}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estados</SelectItem>
            {Object.entries(ESTADO_PRODUCTO_COLORS).map(([key, color]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color.split(' ')[0]}`} />
                  <span className="capitalize">{key}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Marca */}
        <Select
          value={currentMarca}
          onValueChange={(v) => updateParam('marca_id', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <span className="truncate">
              {currentMarca === '_all'
                ? 'Todas las marcas'
                : (catalogos.marcas.find((m) => String(m.id) === currentMarca)?.nombre ?? 'Marca')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las marcas</SelectItem>
            {catalogos.marcas.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Género */}
        <Select
          value={currentGenero}
          onValueChange={(v) => updateParam('genero_id', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <span className="truncate">
              {currentGenero === '_all'
                ? 'Todos los géneros'
                : (catalogos.generos.find((g) => String(g.id) === currentGenero)?.nombre ?? 'Género')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los géneros</SelectItem>
            {catalogos.generos.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Ordenar por */}
        <Select
          value={sortBy}
          onValueChange={(v) => updateParam('sort_by', v === 'id' ? null : v)}
        >
          <SelectTrigger className="w-[165px] h-9 text-sm">
            <span className="truncate flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Ordenar por'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botón dirección asc/desc */}
        {sortBy !== 'id' && (
          <button
            type="button"
            onClick={() => updateParam('order', order === 'asc' ? 'desc' : 'asc')}
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
            title={order === 'asc' ? 'Ascendente — click para invertir' : 'Descendente — click para invertir'}
          >
            {order === 'asc' ? '↑' : '↓'}
          </button>
        )}

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Solo destacados */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="filtro-destacados"
            checked={currentDestacados}
            onCheckedChange={(checked) =>
              updateParam('destacados', checked === true ? 'true' : null)
            }
          />
          <Label htmlFor="filtro-destacados" className="text-sm font-normal cursor-pointer flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            Solo destacados
          </Label>
        </div>

        {/* Incluir no activos */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="filtro-inactivos"
            checked={currentInactivos}
            onCheckedChange={(checked) =>
              updateParam('incluir_inactivos', checked === true ? 'true' : null)
            }
          />
          <Label htmlFor="filtro-inactivos" className="text-sm font-normal cursor-pointer flex items-center gap-1">
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            Incluir no activos
          </Label>
        </div>

        <div className="flex-1" />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll(['catalogo-search'])}
            className="text-muted-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
