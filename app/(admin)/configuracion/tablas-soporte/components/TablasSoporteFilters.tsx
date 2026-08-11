// app/(admin)/configuracion/tablas-soporte/components/TablasSoporteFilters.tsx
'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, X, FilterX } from 'lucide-react'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from '@/modules/config/tablas-soporte/types'

export function TablasSoporteFilters({
  currentTabla,
  onOpenCreateDialog,
}: {
  currentTabla: TablaSoporteKey
  onOpenCreateDialog: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const config = TABLAS_SOPORTE_CONFIG[currentTabla]
  const currentQ = searchParams.get('q') ?? ''
  const currentEstado = searchParams.get('estado') ?? 'todos'
  const hasFilters = Boolean(currentQ || (config.hasActivoCol && currentEstado !== 'todos'))

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (term.trim()) {
      params.set('q', term.trim())
    } else {
      params.delete('q')
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }, 300)

  function handleEstadoChange(val: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (val && val !== 'todos') {
      params.set('estado', val)
    } else {
      params.delete('estado')
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  function handleClearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('estado')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            key={`${currentTabla}-${currentQ}`}
            placeholder={`Buscar en ${config.label.toLowerCase()}...`}
            defaultValue={currentQ}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {currentQ && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Estado Dropdown */}
        {config.hasActivoCol && (
          <div className="w-full sm:w-44">
            <Select value={currentEstado} onValueChange={handleEstadoChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activos">Solo activos</SelectItem>
                <SelectItem value="inactivos">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <FilterX className="h-4 w-4 mr-1.5" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Add New Record Button */}
      <Button onClick={onOpenCreateDialog} className="shrink-0 font-medium">
        <Plus className="h-4 w-4 mr-2" />
        Agregar {config.label.slice(-1) === 's' ? config.label.slice(0, -1) : config.label}
      </Button>
    </div>
  )
}
