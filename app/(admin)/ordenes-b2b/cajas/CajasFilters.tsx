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
  const hasFilters = Array.from(searchParams.entries()).some(([k]) => k !== 'page')

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
        <SelectTrigger className="w-[200px] h-9 text-sm">
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

      <Select
        value={searchParams.get('año') ?? '_all'}
        onValueChange={(v) => updateParam('año', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[130px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('año') === '_all' || !searchParams.get('año')
              ? 'Todos los años'
              : `Año: ${searchParams.get('año')}`}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los años</SelectItem>
          {AÑOS_DISPONIBLES.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
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
