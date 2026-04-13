// app/(admin)/inventario/notas/NotasFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Loader2, X } from 'lucide-react'
import {
  ESTADO_NOTA_COLORS,
  ESTADO_NOTA_LABELS,
  TIPO_MOVIMIENTO_ICONS,
} from '@/lib/constants'
import type { CatalogosInventario } from '@/modules/inventario/types'

export function NotasFilters({
  catalogos,
}: {
  catalogos: CatalogosInventario
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === null || value === '' || value === '_all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
        params.delete('page')
        const qs = params.toString()
        router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
      })
    },
    [searchParams, pathname, router]
  )

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 400)

  const handleClearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
    const input = document.getElementById('notas-search') as HTMLInputElement
    if (input) input.value = ''
  }

  const currentQ = searchParams.get('q') ?? ''
  const currentTipo = searchParams.get('tipo_movimiento_id') ?? '_all'
  const currentEstado = searchParams.get('estado_codigo') ?? '_all'
  const currentBodega = searchParams.get('bodega_origen_id') ?? '_all'
  const currentDesde = searchParams.get('fecha_desde') ?? ''
  const currentHasta = searchParams.get('fecha_hasta') ?? ''

  const hasFilters = Array.from(searchParams.entries()).some(
    ([key]) => key !== 'page'
  )

  return (
    <div className={`space-y-3 ${isPending ? 'opacity-70' : ''}`}>
      {/* Fila 1: Buscador */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="notas-search"
          placeholder="Buscar por número de nota..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Fila 2: Selects + Fechas */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tipo Movimiento */}
        <Select
          value={currentTipo}
          onValueChange={(v) => updateParam('tipo_movimiento_id', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {catalogos.tiposMovimiento.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                <span className="mr-1">
                  {TIPO_MOVIMIENTO_ICONS[t.codigo] ?? ''}
                </span>
                {t.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select
          value={currentEstado}
          onValueChange={(v) => updateParam('estado_codigo', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los estados</SelectItem>
            {catalogos.estadosNota.map((e) => (
              <SelectItem key={e.id} value={e.codigo}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    ESTADO_NOTA_COLORS[e.codigo]?.split(' ')[0] ?? 'bg-gray-300'
                  }`} />
                  {e.nombre}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bodega Origen */}
        <Select
          value={currentBodega}
          onValueChange={(v) => updateParam('bodega_origen_id', v === '_all' ? null : v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <SelectValue placeholder="Bodega" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las bodegas</SelectItem>
            {catalogos.bodegas.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Separador */}
        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Fechas */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-9 w-[140px] text-sm"
            value={currentDesde}
            onChange={(e) => updateParam('fecha_desde', e.target.value || null)}
            placeholder="Desde"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            className="h-9 w-[140px] text-sm"
            value={currentHasta}
            onChange={(e) => updateParam('fecha_hasta', e.target.value || null)}
            placeholder="Hasta"
          />
        </div>

        <div className="flex-1" />

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
