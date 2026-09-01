// components/store/catalogo/FilterSidebar.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { 
  Search, 
  X, 
  Sparkles, 
  Tag, 
  Star, 
  Filter, 
  RotateCcw,
  Shirt,
  User,
  Baby,
  ChevronRight,
  Layers
} from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'

const GENEROS = [
  { id: 'dama', label: '👩 Dama', value: 'dama' },
  { id: 'caballero', label: '👨 Caballero', value: 'caballero' },
  { id: 'infantil', label: '👶 Infantil (Todos)', value: 'infantil' },
  { id: 'nino', label: '👦 Niño', value: 'nino' },
  { id: 'nina', label: '👧 Niña', value: 'nina' },
  { id: 'unisex', label: '🚻 Unisex', value: 'unisex' },
]

const TIPOS_PRENDA = [
  { id: 'chamarras', label: 'Chamarras', value: 'chamarras' },
  { id: 'rompevientos', label: 'Rompevientos', value: 'rompevientos' },
  { id: 'chalecos', label: 'Chalecos', value: 'chalecos' },
  { id: 'sets-deportivos', label: 'Conjuntos / Sets', value: 'sets-deportivos' },
  { id: 'sudaderas', label: 'Sudaderas', value: 'sudaderas' },
  { id: 'sueter', label: 'Suéteres', value: 'sueter' },
  { id: 'abrigos', label: 'Abrigos', value: 'abrigos' },
]

export function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '')
  }, [searchParams])

  const currentGenero = searchParams.get('genero') || ''
  const currentTipo = searchParams.get('tipo') || ''
  const isOferta = searchParams.get('oferta') === 'true'
  const isNuevo = searchParams.get('nuevo') === 'true'
  const isDestacado = searchParams.get('destacado') === 'true'

  const hasFilters = Array.from(searchParams.entries()).length > 0

  const debouncedSearch = useDebouncedCallback((term: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (term.trim()) {
        params.set('q', term.trim())
      } else {
        params.delete('q')
      }
      params.delete('page')
      router.push(`/shop?${params.toString()}`, { scroll: false })
    })
  }, 300)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedSearch(value)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    debouncedSearch('')
  }

  const toggleParamValue = (key: string, value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      const current = params.get(key)
      
      if (current === value) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      
      params.delete('page')
      router.push(`/shop?${params.toString()}`, { scroll: false })
    })
  }

  const toggleFlag = (key: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      const current = params.get(key) === 'true'
      
      if (current) {
        params.delete(key)
      } else {
        params.set(key, 'true')
      }
      
      params.delete('page')
      router.push(`/shop?${params.toString()}`, { scroll: false })
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      setSearchTerm('')
      router.push('/shop', { scroll: false })
    })
  }

  return (
    <div className={cn("space-y-6 pb-6", isPending && "opacity-60 pointer-events-none transition-opacity")}>
      
      {/* Encabezado del Menú Izquierdo */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2">
          <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Filtros y Menú</span>
        </h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* 1. Buscador Directo */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
          Buscar Prenda
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por SKU o modelo..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full bg-background dark:bg-zinc-900 border border-border text-xs text-foreground pl-8 pr-7 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Filtro de Género */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Línea / Género
        </span>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleParamValue('genero', '')}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left",
              !currentGenero
                ? "bg-emerald-700 text-white font-bold shadow-xs"
                : "bg-card dark:bg-zinc-900 text-foreground hover:bg-muted border border-border"
            )}
          >
            <span>Todos los géneros</span>
            {!currentGenero && <ChevronRight className="h-3.5 w-3.5" />}
          </button>

          {GENEROS.map((g) => {
            const isSelected = currentGenero === g.value
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleParamValue('genero', g.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left",
                  isSelected
                    ? "bg-emerald-700 text-white font-bold shadow-xs"
                    : "bg-card dark:bg-zinc-900 text-foreground hover:bg-muted border border-border"
                )}
              >
                <span>{g.label}</span>
                {isSelected && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Filtro de Tipo de Prenda */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Tipo de Prenda
        </span>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {TIPOS_PRENDA.map((t) => {
            const isSelected = currentTipo === t.value
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleParamValue('tipo', t.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all text-left",
                  isSelected
                    ? "bg-zinc-900 text-white dark:bg-zinc-800 font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>{t.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Atributos Especiales (Novedades, Ofertas, Destacados) */}
      <div className="space-y-2 pt-2 border-t border-border">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
          Promociones y Novedades
        </span>

        {/* En Oferta */}
        <div
          onClick={() => toggleFlag('oferta')}
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all",
            isOferta
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
              : "bg-card dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs">En Oferta</span>
          </div>
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center text-[10px]",
            isOferta ? "bg-emerald-600 border-emerald-600 text-white" : "border-muted-foreground"
          )}>
            {isOferta && '✓'}
          </div>
        </div>

        {/* Novedades */}
        <div
          onClick={() => toggleFlag('nuevo')}
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all",
            isNuevo
              ? "bg-violet-500/10 border-violet-500/40 text-violet-700 dark:text-violet-300 font-bold"
              : "bg-card dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-xs">Novedades</span>
          </div>
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center text-[10px]",
            isNuevo ? "bg-violet-600 border-violet-600 text-white" : "border-muted-foreground"
          )}>
            {isNuevo && '✓'}
          </div>
        </div>

        {/* Destacados */}
        <div
          onClick={() => toggleFlag('destacado')}
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all",
            isDestacado
              ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold"
              : "bg-card dark:bg-zinc-900 border-border text-foreground hover:bg-muted"
          )}
        >
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs">Destacados</span>
          </div>
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center text-[10px]",
            isDestacado ? "bg-amber-500 border-amber-500 text-white" : "border-muted-foreground"
          )}>
            {isDestacado && '✓'}
          </div>
        </div>
      </div>

      {/* Botón de Limpiar si hay filtros */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          disabled={isPending}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline pt-2"
        >
          Limpiar todos los filtros
        </button>
      )}
    </div>
  )
}
