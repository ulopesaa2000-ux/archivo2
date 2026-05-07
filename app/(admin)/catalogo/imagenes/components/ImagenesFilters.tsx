// app/(admin)/catalogo/imagenes/components/ImagenesFilters.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { SearchInput } from '@/components/admin/SearchInput'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import { usoImagenOptions, origenOptions } from './imagenesConstants'

export function ImagenesFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentQ = searchParams.get('q') ?? ''
  const currentUso = searchParams.get('uso_imagen') ?? ''
  const currentOrigen = searchParams.get('origen') ?? ''
  const currentPrincipal = searchParams.get('principal') ?? ''

  const hasFilters = currentQ || currentUso || currentOrigen || currentPrincipal

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    const qs = params.toString()
    router.push(`/catalogo/imagenes${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const handleSearch = useDebouncedCallback((term: string) => {
    updateParam('q', term || null)
  }, 500)

  const clearAll = () => {
    startTransition(() => {
      router.push('/catalogo/imagenes', { scroll: false })
    })
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${isPending ? 'opacity-70' : ''}`}>
      {/* Buscador */}
      <SearchInput
        id="imagenes-search"
        placeholder="Buscar por SKU o nombre..."
        currentValue={currentQ}
        onSearch={(term) => updateParam('q', term)}
        delay={500}
        controlled
      />

      {/* Tipo de uso */}
      <Select
        value={currentUso || '_all'}
        onValueChange={(v) => updateParam('uso_imagen', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[180px] h-9 text-sm">
          <span className="truncate">
            {currentUso ? usoImagenOptions.find(o => o.value === currentUso)?.label : 'Todos los tipos'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los tipos</SelectItem>
          {usoImagenOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Origen */}
      <Select
        value={currentOrigen || '_all'}
        onValueChange={(v) => updateParam('origen', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <span className="truncate">
            {currentOrigen ? origenOptions.find(o => o.value === currentOrigen)?.label : 'Todos los origenes'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los origenes</SelectItem>
          {origenOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Solo principales */}
      <Select
        value={currentPrincipal || '_all'}
        onValueChange={(v) => updateParam('principal', v === '_all' ? null : v)}
      >
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <span className="truncate">
            {currentPrincipal === 'true' ? 'Solo principales' : 'Todas'}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas</SelectItem>
          <SelectItem value="true">Solo principales</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpiar */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}