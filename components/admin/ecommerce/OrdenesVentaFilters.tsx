// components/admin/ecommerce/OrdenesVentaFilters.tsx
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OrdenesVentaFiltersProps {
  zonas: string[]
  zonaActual: string
}

export function OrdenesVentaFilters({ zonas, zonaActual }: OrdenesVentaFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleZonaChange = (value: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('page')
      if (!value || value === 'todas') {
        params.delete('zona')
      } else {
        params.set('zona', value)
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 ${isPending ? 'opacity-60' : ''}`}>
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
    </div>
  )
}
