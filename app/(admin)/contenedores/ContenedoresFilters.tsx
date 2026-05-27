// app/(admin)/contenedores/ContenedoresFilters.tsx
'use client'

import { useFilterParams } from '@/components/admin/useFilterParams'
import { SearchInput } from '@/components/admin/SearchInput'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { ArrowUpDown, X } from 'lucide-react'
import {
  ESTADOS_CONTENEDOR,
  ESTADO_CONTENEDOR_LABELS,
  ESTADO_CONTENEDOR_COLORS,
} from '@/lib/constants'
import type { ContenedorSortBy } from '@/modules/contenedores/types'

const AVAILABLE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026] as const

const SORT_OPTIONS: { value: ContenedorSortBy; label: string }[] = [
  { value: 'fecha_eta', label: 'ETA mas reciente' },
  { value: 'fecha_etd', label: 'ETD' },
  { value: 'codigo_contenedor', label: 'Codigo' },
  { value: 'numero_contenedor', label: 'No. contenedor' },
  { value: 'total_ordenes', label: 'Ordenes' },
  { value: 'cajas_totales', label: 'Cajas' },
  { value: 'estado', label: 'Estado' },
]

export function ContenedoresFilters({
  sortBy,
  order,
}: {
  sortBy: ContenedorSortBy
  order: 'asc' | 'desc'
}) {
  const { updateParam, clearAll, searchParam, isPending, hasFilters } = useFilterParams()

  const currentQ = searchParam('q')
  const currentEstado = searchParam('estado', '_all')
  const currentAnio = searchParam('anio', '_all')

  return (
    <div className={`space-y-4 ${isPending ? 'opacity-70' : ''}`}>
      <SearchInput
        id="contenedores-search"
        placeholder="Buscar No. contenedor, codigo, BL..."
        currentValue={currentQ}
        onSearch={(term) => updateParam('q', term)}
        delay={500}
        controlled
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={currentEstado}
          onValueChange={(value) => updateParam('estado', value === '_all' ? null : value)}
        >
          <SelectTrigger className="h-9 w-[175px] text-sm">
            <span className="truncate">
              {currentEstado !== '_all'
                ? ESTADO_CONTENEDOR_LABELS[currentEstado] ?? currentEstado
                : 'Todos los estados'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estados</SelectItem>
            {ESTADOS_CONTENEDOR.map((estado) => (
              <SelectItem key={estado} value={estado}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${ESTADO_CONTENEDOR_COLORS[estado]?.split(' ')[0]}`} />
                  {ESTADO_CONTENEDOR_LABELS[estado]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentAnio}
          onValueChange={(value) => updateParam('anio', value === '_all' ? null : value)}
        >
          <SelectTrigger className="h-9 w-[120px] text-sm">
            <span className="truncate">
              {currentAnio === '_all' ? 'Todos los anios' : currentAnio}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los anios</SelectItem>
            {AVAILABLE_YEARS.map((anio) => (
              <SelectItem key={anio} value={String(anio)}>{anio}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden h-6 w-px bg-border sm:block" />

        <Select
          value={sortBy}
          onValueChange={(value) => updateParam('sort_by', value === 'fecha_eta' ? null : value)}
        >
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <span className="flex items-center gap-1.5 truncate">
              <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              {SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Ordenar por'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {sortBy !== 'fecha_eta' && (
          <button
            type="button"
            onClick={() => updateParam('order', order === 'asc' ? 'desc' : 'asc')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            title={order === 'asc' ? 'Ascendente, click para invertir' : 'Descendente, click para invertir'}
          >
            {order === 'asc' ? '^' : 'v'}
          </button>
        )}

        <div className="flex-1" />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll(['contenedores-search'])}
            className="text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
