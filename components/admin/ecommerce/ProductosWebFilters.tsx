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
import {
  Search, X, SlidersHorizontal, Image as ImageIcon, ArrowUpDown, Tag, Users, Shirt,
} from 'lucide-react'
import { CatalogoPdfModal } from './CatalogoPdfModal'

interface Props {
  marcas: { id: number; nombre: string }[]
  generos: { id: number; nombre: string }[]
  tiposPrenda: { id: number; nombre: string }[]
}

export function ProductosWebFilters({ marcas, generos, tiposPrenda }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

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

  // Helpers para etiquetas legibles en español en los SelectTrigger
  const getEstadoLabel = (val: string | null) => {
    if (val === 'publicados') return '🟢 Publicados'
    if (val === 'pausados') return '🟡 Pausados'
    if (val === 'no_publicados') return '⚪ No publicados'
    return 'Todos los estados'
  }

  const getFotosLabel = (val: string | null) => {
    if (val === 'con_foto') return '📷 Con foto'
    if (val === 'sin_foto') return '🚫 Sin foto'
    return 'Todas las fotos'
  }

  const getMarcaLabel = (val: string | null) => {
    if (!val || val === 'all') return 'Todas las marcas'
    const found = marcas.find((m) => String(m.id) === val)
    return found ? found.nombre : 'Todas las marcas'
  }

  const getGeneroLabel = (val: string | null) => {
    if (!val || val === 'all') return 'Todos los géneros'
    const found = generos.find((g) => String(g.id) === val)
    return found ? found.nombre : 'Todos los géneros'
  }

  const getTipoPrendaLabel = (val: string | null) => {
    if (!val || val === 'all') return 'Todos los tipos'
    const found = tiposPrenda.find((t) => String(t.id) === val)
    return found ? found.nombre : 'Todos los tipos'
  }

  const getOrderLabel = (val: string | null) => {
    if (val === 'recientes') return '⏱️ Más recientes'
    if (val === 'antiguos') return '⏳ Más antiguos'
    if (val === 'sku_asc') return '🔤 SKU (A-Z)'
    if (val === 'precio_desc') return '💲 Precio: Mayor a Menor'
    if (val === 'precio_asc') return '💲 Precio: Menor a Mayor'
    return '✨ Recientes con foto'
  }

  // Clase genérica para que el popover desplegable siempre se expanda al ancho del texto más largo
  const popoverContentClass = 'w-max min-w-(--anchor-width) max-w-[90vw]'

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          Filtros del Catálogo Web
        </div>

        <div className="flex items-center gap-2">
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

          {/* Botón Rojo CATÁLOGO PDF */}
          <CatalogoPdfModal tiposPrenda={tiposPrenda} generos={generos} />
        </div>
      </div>

      {/* Grid de Filtros */}
      <div className="space-y-3">
        {/* Fila 1: Búsqueda, Estado, Fotos y Orden */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* 1. Buscador */}
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground font-medium">Buscar por SKU, Descripción o Marca</Label>
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
                  type="button"
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
            <Label className="text-xs text-muted-foreground font-medium">Estado de Publicación</Label>
            <Select
              value={searchParams.get('estado_web') || 'all'}
              onValueChange={(val) => updateQueryParam('estado_web', val)}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue>
                  {getEstadoLabel(searchParams.get('estado_web'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={popoverContentClass}>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="publicados">🟢 Publicados</SelectItem>
                <SelectItem value="pausados">🟡 Pausados</SelectItem>
                <SelectItem value="no_publicados">⚪ No publicados (Borrador)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Filtro Foto */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              Fotos del Producto
            </Label>
            <Select
              value={searchParams.get('tiene_foto') || 'all'}
              onValueChange={(val) => updateQueryParam('tiene_foto', val)}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue>
                  {getFotosLabel(searchParams.get('tiene_foto'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={popoverContentClass}>
                <SelectItem value="all">Todas las fotos</SelectItem>
                <SelectItem value="con_foto">📷 Con foto</SelectItem>
                <SelectItem value="sin_foto">🚫 Sin foto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Ordenar por */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1 font-semibold text-primary">
              <ArrowUpDown className="h-3 w-3" />
              Ordenar Por
            </Label>
            <Select
              value={searchParams.get('ordenar_por') || 'recientes_con_foto'}
              onValueChange={(val) => updateQueryParam('ordenar_por', val)}
            >
              <SelectTrigger className="h-9 text-xs font-medium border-primary/40 bg-primary/5 w-full">
                <SelectValue>
                  {getOrderLabel(searchParams.get('ordenar_por'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={popoverContentClass}>
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

        {/* Fila 2: Clasificación de Catálogo (Marca, Género, Tipo de Prenda) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          {/* Marca */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground/70" />
              Marca
            </Label>
            <Select
              value={searchParams.get('marca_id') || 'all'}
              onValueChange={(val) => updateQueryParam('marca_id', val)}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue>
                  {getMarcaLabel(searchParams.get('marca_id'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={popoverContentClass}>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {marcas.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Género */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground/70" />
              Género
            </Label>
            <Select
              value={searchParams.get('genero_id') || 'all'}
              onValueChange={(val) => updateQueryParam('genero_id', val)}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue>
                  {getGeneroLabel(searchParams.get('genero_id'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={popoverContentClass}>
                <SelectItem value="all">Todos los géneros</SelectItem>
                {generos.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Prenda */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Shirt className="h-3 w-3 text-muted-foreground/70" />
              Tipo de Prenda
            </Label>
            <Select
              value={searchParams.get('tipo_prenda_id') || 'all'}
              onValueChange={(val) => updateQueryParam('tipo_prenda_id', val)}
            >
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue>
                  {getTipoPrendaLabel(searchParams.get('tipo_prenda_id'))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className={popoverContentClass}>
                <SelectItem value="all">Todos los tipos de prenda</SelectItem>
                {tiposPrenda.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
