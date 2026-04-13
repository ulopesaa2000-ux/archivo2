// app/(admin)/catalogo/CatalogoFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Loader2, X, Star, EyeOff } from 'lucide-react'
import { ESTADO_PRODUCTO_COLORS } from '@/lib/constants'
import type { CatalogosParaFiltros } from '@/modules/catalogo/types'

/**
 * Barra de filtros del catálogo.
 * 
 * ES CLIENT COMPONENT pero NO se desmonta al cambiar filtros.
 * Solo la tabla de abajo se re-renderiza.
 * 
 * Los filtros se reflejan en searchParams (URL como estado).
 * El buscador tiene debounce de 300ms.
 * useTransition para feedback visual sin bloquear.
 */
export function CatalogoFilters({
  catalogos,
}: {
  catalogos: CatalogosParaFiltros
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // ── Helper: actualizar searchParams ───────────────────────
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === null || value === '' || value === '_all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
        params.delete('page') // resetear paginación
        const qs = params.toString()
        router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
      })
    },
    [searchParams, pathname, router]
  )

  // ── Buscador con debounce ─────────────────────────────────
  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 300)

  // ── Limpiar todos los filtros ─────────────────────────────
  const handleClearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }

  // ── Valores actuales de searchParams ──────────────────────
  const currentQ = searchParams.get('q') ?? ''
  const currentEstado = searchParams.get('estado') ?? '_all'
  const currentMarca = searchParams.get('marca_id') ?? '_all'
  const currentGenero = searchParams.get('genero_id') ?? '_all'
  const currentDestacados = searchParams.get('destacados') === 'true'
  const currentInactivos = searchParams.get('incluir_inactivos') === 'true'

  const hasFilters = Array.from(searchParams.entries()).some(
    ([key]) => key !== 'page'
  )

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
                : (catalogos.marcas.find(m => String(m.id) === currentMarca)?.nombre ?? 'Marca')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las marcas</SelectItem>
            {catalogos.marcas.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.nombre}
              </SelectItem>
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
                : (catalogos.generos.find(g => String(g.id) === currentGenero)?.nombre ?? 'Género')}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los géneros</SelectItem>
            {catalogos.generos.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Separador visual */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Checkbox: Solo destacados */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="filtro-destacados"
            checked={currentDestacados}
            onCheckedChange={(checked) =>
              updateParam('destacados', checked === true ? 'true' : null)
            }
          />
          <Label
            htmlFor="filtro-destacados"
            className="text-sm font-normal cursor-pointer flex items-center gap-1"
          >
            <Star className="h-3.5 w-3.5 text-amber-500" />
            Solo destacados
          </Label>
        </div>

        {/* Checkbox: Incluir no activos */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="filtro-inactivos"
            checked={currentInactivos}
            onCheckedChange={(checked) =>
              updateParam('incluir_inactivos', checked === true ? 'true' : null)
            }
          />
          <Label
            htmlFor="filtro-inactivos"
            className="text-sm font-normal cursor-pointer flex items-center gap-1"
          >
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            Incluir no activos
          </Label>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Limpiar filtros */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
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
