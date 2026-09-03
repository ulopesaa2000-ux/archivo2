// app/(admin)/inventario/trazabilidad/components/TrazabilidadHeaderControls.tsx
'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Calendar, MapPin, Layers, RotateCcw, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Props {
  ciudades: string[]
  familias: { codigo: string; descripcion: string | null }[]
  filtrosActuales: {
    periodo: string
    fechaDesde: string
    fechaHasta: string
    ciudad?: string
    familia?: string
    q?: string
    agruparPor: 'familia' | 'producto'
  }
}

export function TrazabilidadHeaderControls({
  ciudades,
  familias,
  filtrosActuales,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [searchTerm, setSearchTerm] = useState(filtrosActuales.q || '')

  // Debounce de 350ms para la búsqueda de texto
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (searchParams.get('q') || '')) {
        updateQuery({ q: searchTerm || undefined })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const updateQuery = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === '' || val === 'todas') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    })

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const handleReset = () => {
    setSearchTerm('')
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        
        {/* 1. Buscador de SKU / Producto / Familia */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar SKU, producto, o familia..."
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* 2. Selector de Período */}
        <div className="lg:col-span-3">
          <Select
            value={filtrosActuales.periodo || 'mes_actual'}
            onValueChange={(val) => updateQuery({ periodo: val ?? undefined })}
          >
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_actual">Este Mes (Actual)</SelectItem>
              <SelectItem value="mes_anterior">Mes Anterior</SelectItem>
              <SelectItem value="ultimo_mes">Últimos 30 días</SelectItem>
              <SelectItem value="todo">Todo el año 2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Selector de Ciudad */}
        <div className="lg:col-span-2">
          <Select
            value={filtrosActuales.ciudad || 'todas'}
            onValueChange={(val) => updateQuery({ ciudad: val ?? undefined })}
          >
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Ciudad" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las ciudades</SelectItem>
              {ciudades.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Selector de Familia */}
        <div className="lg:col-span-2">
          <Select
            value={filtrosActuales.familia || 'todas'}
            onValueChange={(val) => updateQuery({ familia: val ?? undefined })}
          >
            <SelectTrigger className="h-9 text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Familia" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="todas">Todas las familias</SelectItem>
              {familias.map((f) => (
                <SelectItem key={f.codigo} value={f.codigo}>
                  <span className="font-bold">{f.codigo}</span>
                  {f.descripcion && (
                    <span className="text-[11px] text-muted-foreground/80 font-normal italic ml-1.5 truncate max-w-[200px]">
                      — {f.descripcion}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Botón Reset */}
        <div className="lg:col-span-1 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9 px-2 text-xs w-full sm:w-auto"
            title="Restablecer filtros"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

      </div>

      {/* Barra de opciones de agrupación y estado */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Agrupar por:</span>
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => updateQuery({ agrupar_por: 'familia' })}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filtrosActuales.agruparPor === 'familia'
                  ? 'bg-background font-semibold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Familia de Producto
            </button>
            <button
              type="button"
              onClick={() => updateQuery({ agrupar_por: 'producto' })}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filtrosActuales.agruparPor === 'producto'
                  ? 'bg-background font-semibold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Producto Individual (SKU)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <Badge variant="secondary" className="animate-pulse text-[11px] py-0.5">
              Actualizando datos...
            </Badge>
          )}
          <span className="text-muted-foreground text-[11px]">
            Período: <strong>{new Date(filtrosActuales.fechaDesde).toLocaleDateString('es-MX')}</strong> al{' '}
            <strong>{new Date(filtrosActuales.fechaHasta).toLocaleDateString('es-MX')}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
