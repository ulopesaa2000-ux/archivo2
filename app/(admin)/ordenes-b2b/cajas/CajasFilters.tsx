// app/(admin)/ordenes-b2b/cajas/CajasFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Loader2, X } from 'lucide-react'
import { AÑOS_DISPONIBLES } from '@/lib/constants'
import type { CatalogosB2B } from '@/modules/ordenes-b2b/types'

export function CajasFilters({ catalogos }: { catalogos: CatalogosB2B }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const currentQuery = searchParams.get('q') ?? ''

  const updateParam = useCallback((k: string, v: string | null) => {
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      if (!v || v === '_all') {
        p.delete(k)
      } else {
        p.set(k, v)
      }
      p.delete('page')
      router.push(`${pathname}?${p.toString()}`, { scroll: false })
    })
  }, [searchParams, pathname, router])

  const handleSearch = useDebouncedCallback((t: string) => updateParam('q', t || null), 400)

  const updateSort = useCallback((val: string | null) => {
    if (!val) return
    startTransition(() => {
      const p = new URLSearchParams(searchParams.toString())
      const [sort, dir] = val.split(':')
      if (sort) p.set('sort_by', sort)
      if (dir) p.set('order', dir)
      p.delete('page')
      router.push(`${pathname}?${p.toString()}`, { scroll: false })
    })
  }, [searchParams, pathname, router])

  const hasFilters = Array.from(searchParams.entries()).some(([k]) => k !== 'page')
  const currentSort = `${searchParams.get('sort_by') || 'codigo_caja'}:${searchParams.get('order') || 'asc'}`

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          key={currentQuery}
          placeholder="Buscar código de caja..."
          defaultValue={currentQuery}
          onChange={(e) => {
            handleSearch(e.target.value)
          }}
          className="pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <Select
        value={searchParams.get('proveedor_id') ?? '_all'}
        onValueChange={(v) => updateParam('proveedor_id', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('proveedor_id') === '_all' || !searchParams.get('proveedor_id')
              ? 'Todos los proveedores'
              : (catalogos.proveedores.find(p => String(p.id) === searchParams.get('proveedor_id'))?.nombre_completo ?? 'Proveedor')}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los proveedores</SelectItem>
          {catalogos.proveedores.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.nombre_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSort} onValueChange={updateSort}>
        <SelectTrigger className="w-[170px] h-9 text-sm">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="codigo_caja:asc">Código (A-Z)</SelectItem>
          <SelectItem value="codigo_caja:desc">Código (Z-A)</SelectItem>
          <SelectItem value="producto_sku:asc">SKU (A-Z)</SelectItem>
          <SelectItem value="piezas_por_caja:desc">Más piezas</SelectItem>
          <SelectItem value="cbm:desc">Más volumen (CBM)</SelectItem>
          <SelectItem value="peso_bruto_kg:desc">Más peso (kg)</SelectItem>
          <SelectItem value="proveedor_nombre:asc">Proveedor (A-Z)</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" /> Limpiar
        </Button>
      )}
    </div>
  )
}
