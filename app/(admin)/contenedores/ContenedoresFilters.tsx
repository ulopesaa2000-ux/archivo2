// app/(admin)/contenedores/ContenedoresFilters.tsx
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
  ESTADOS_CONTENEDOR, ESTADO_CONTENEDOR_LABELS,
  ESTADO_CONTENEDOR_COLORS, AÑOS_DISPONIBLES,
} from '@/lib/constants'

export function ContenedoresFilters() {
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
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [searchParams, pathname, router]
  )

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 400)

  const hasFilters = Array.from(searchParams.entries()).some(([k]) => k !== 'page')

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar N° contenedor, código, BL..."
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <Select
        value={searchParams.get('estado') ?? '_all'}
        onValueChange={(v) => updateParam('estado', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[175px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('estado')
              ? ESTADO_CONTENEDOR_LABELS[searchParams.get('estado')!] ?? searchParams.get('estado')
              : 'Todos los estados'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los estados</SelectItem>
          {ESTADOS_CONTENEDOR.map((e) => (
            <SelectItem key={e} value={e}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${ESTADO_CONTENEDOR_COLORS[e]?.split(' ')[0]}`} />
                {ESTADO_CONTENEDOR_LABELS[e]}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get('año') ?? '_all'}
        onValueChange={(v) => updateParam('año', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[120px] h-9 text-sm">
          <span className="truncate">
            {searchParams.get('año') ?? 'Todos los años'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los años</SelectItem>
          {AÑOS_DISPONIBLES.map((a) => (
            <SelectItem key={a} value={String(a)}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => {
          startTransition(() => router.push(pathname, { scroll: false }))
        }} className="text-muted-foreground">
          <X className="h-3 w-3 mr-1" /> Limpiar
        </Button>
      )}
    </div>
  )
}
