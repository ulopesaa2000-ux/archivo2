// app/(admin)/ordenes-b2b/OrdenesFilters.tsx
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
import { ESTADOS_ORDEN_B2B, ESTADO_ORDEN_B2B_COLORS, AÑOS_DISPONIBLES } from '@/lib/constants'
import type { CatalogosB2B } from '@/modules/ordenes-b2b/types'

export function OrdenesFilters({ catalogos }: { catalogos: CatalogosB2B }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (!value || value === '_all') { params.delete(key) } else { params.set(key, value) }
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, [searchParams, pathname, router]
  )

  const handleSearch = useDebouncedCallback((t: string) => updateParam('q', t || null), 400)
  const hasFilters = Array.from(searchParams.entries()).some(([k]) => k !== 'page')

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar folio proveedor..." defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)} className="pl-10" />
        {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <Select value={searchParams.get('estado') ?? '_all'}
        onValueChange={(v) => updateParam('estado', v === '_all' ? null : v)}>
        <SelectTrigger className="w-[175px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('estado') ?? 'Todos los estados'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los estados</SelectItem>
          {ESTADOS_ORDEN_B2B.map((e) => (
            <SelectItem key={e} value={e}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ESTADO_ORDEN_B2B_COLORS[e]?.split(' ')[0]}`} />{e}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get('proveedor_id') ?? '_all'}
        onValueChange={(v) => updateParam('proveedor_id', v === '_all' ? null : v)}>
        <SelectTrigger className="w-[190px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('proveedor_id')
              ? (catalogos.proveedores.find(p => String(p.id) === searchParams.get('proveedor_id'))?.nombre_completo ?? 'Proveedor')
              : 'Todos los proveedores'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los proveedores</SelectItem>
          {catalogos.proveedores.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>{p.nombre_completo}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get('año') ?? '_all'}
        onValueChange={(v) => updateParam('año', v === '_all' ? null : v)}>
        <SelectTrigger className="w-[120px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('año') ?? 'Todos los años'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los años</SelectItem>
          {AÑOS_DISPONIBLES.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="text-muted-foreground"><X className="h-3 w-3 mr-1" /> Limpiar</Button>
      )}
    </div>
  )
}
