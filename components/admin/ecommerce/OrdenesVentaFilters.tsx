// components/admin/ecommerce/OrdenesVentaFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchFilter } from '@/components/admin/SearchFilter'

interface OrdenesVentaFiltersProps {
  zonas: string[]
  zonaActual: string
  verCanceladas: boolean
}

function useFiltrosQuery() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const pushParams = (mutate: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      mutate(params)
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return { searchParams, isPending, pushParams }
}

export function OrdenesVentaFilters({ zonas, zonaActual, verCanceladas }: OrdenesVentaFiltersProps) {
  const { isPending, pushParams } = useFiltrosQuery()

  const handleZonaChange = (value: string | null) => {
    pushParams((params) => {
      if (!value || value === 'todas') {
        params.delete('zona')
      } else {
        params.set('zona', value)
      }
    })
  }

  const handleCanceladasChange = (checked: boolean) => {
    pushParams((params) => {
      if (checked) {
        params.set('verCanceladas', '1')
      } else {
        params.delete('verCanceladas')
      }
    })
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 ${isPending ? 'opacity-60' : ''}`}>
      <SearchFilter placeholder="Buscar por N° orden…" paramKey="q" />

      <div className="grid gap-1.5 w-64 max-w-full">
        <Label htmlFor="filtro-zona" className="text-xs">Región de atención</Label>
        <Select value={zonaActual || 'todas'} onValueChange={handleZonaChange}>
          <SelectTrigger id="filtro-zona">
            <SelectValue placeholder="Todas las regiones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las regiones</SelectItem>
            {zonas.map((zona) => (
              <SelectItem key={zona} value={zona}>{zona}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label
        htmlFor="filtro-canceladas"
        className="flex items-center gap-2 cursor-pointer text-xs font-medium border border-border rounded-lg px-3 py-2 h-10 select-none hover:bg-muted/50"
      >
        <Checkbox
          id="filtro-canceladas"
          checked={verCanceladas}
          onCheckedChange={(checked) => handleCanceladasChange(checked === true)}
        />
        Ver canceladas
      </label>
    </div>
  )
}
