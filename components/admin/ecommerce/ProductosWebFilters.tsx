// components/admin/ecommerce/ProductosWebFilters.tsx
'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter, SlidersHorizontal, Image as ImageIcon, ArrowUpDown } from 'lucide-react'

interface Props {
  marcas: { id: number; nombre: string }[]
  generos: { id: number; nombre: string }[]
  tiposPrenda: { id: number; nombre: string }[]
}

export function ProductosWebFilters({ marcas, generos, tiposPrenda }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // State local para el buscador con debounce
  const [q, setQ] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setQ(searchParams.get('q') || '')
  }, [searchParams])

  // Manejador genérico para actualizar query params
  const updateQueryParam = (name: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all' && value !== '') {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    // Reiniciar a página 1 al cambiar cualquier filtro
    params.delete('page')

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  // Debounce para búsqueda por texto (300ms)
  useEffect(() => {
    const currentParam = searchParams.get('q') || ''
    if (q === currentParam) return

    const timer = setTimeout(() => {
      updateQueryParam('q', q)
    }, 300)

    return () => clearTimeout(timer)
  }, [q])

  const hasActiveFilters =
    searchParams.has('q') ||
    searchParams.has('estado_web') ||
    searchParams.has('marca_id') ||
    searchParams.has('genero_id') ||
    searchParams.has('tipo_prenda_id') ||
    searchParams.has('tiene_foto') ||
    (searchParams.has('ordenar_por') && searchParams.get('ordenar_por') !== 'recientes_con_foto')

  const handleClear = () => {
    setQ('')
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filtros del Catálogo Web
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar Filtros
          </Button>
        )}
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Buscador */}
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Buscar por SKU o Nombre</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej: 8526, Chamarra Polar..."
              className="pl-9 h-9 text-xs"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Estado Web */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Estado de Publicación</Label>
          <Select
            value={searchParams.get('estado_web') || 'all'}
            onValueChange={(val) => updateQueryParam('estado_web', val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="— Todos —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="publicados">🟢 Publicados</SelectItem>
              <SelectItem value="pausados">🟡 Pausados</SelectItem>
              <SelectItem value="no_publicados">⚪ No publicados (Borrador)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Filtro Foto */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Fotos del Producto
          </Label>
          <Select
            value={searchParams.get('tiene_foto') || 'all'}
            onValueChange={(val) => updateQueryParam('tiene_foto', val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="— Todas —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fotos</SelectItem>
              <SelectItem value="con_foto">📷 Con foto</SelectItem>
              <SelectItem value="sin_foto">🚫 Sin foto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 4. Marca */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Marca</Label>
          <Select
            value={searchParams.get('marca_id') || 'all'}
            onValueChange={(val) => updateQueryParam('marca_id', val)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="— Marca —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              {marcas.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Ordenar por (Default: Recientes con foto primero) */}
        <div className="space-y-1 sm:col-span-2 md:col-span-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1 font-semibold text-primary">
            <ArrowUpDown className="h-3 w-3" />
            Ordenar Por
          </Label>
          <Select
            value={searchParams.get('ordenar_por') || 'recientes_con_foto'}
            onValueChange={(val) => updateQueryParam('ordenar_por', val)}
          >
            <SelectTrigger className="h-9 text-xs font-medium border-primary/40 bg-primary/5">
              <SelectValue placeholder="Recientes con foto primero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recientes_con_foto">✨ Recientes con foto primero (Predeterminado)</SelectItem>
              <SelectItem value="recientes">⏱️ Más recientes primero</SelectItem>
              <SelectItem value="antiguos">⏳ Más antiguos primero</SelectItem>
              <SelectItem value="sku_asc">🔤 SKU (A-Z)</SelectItem>
              <SelectItem value="precio_desc">💲 Precio: Mayor a Menor</SelectItem>
              <SelectItem value="precio_asc">💲 Precio: Menor a Mayor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
