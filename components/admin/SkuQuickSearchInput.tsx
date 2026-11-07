// components/admin/SkuQuickSearchInput.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedCallback } from 'use-debounce'
import { cn } from '@/lib/utils'

export interface SkuSearchResultItem {
  id: number
  sku_base: string
  nombre: string
  descripcion?: string | null
  pz_en_caja?: number | null
}

export interface SkuQuickSearchInputProps {
  id?: string
  value: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  inputClassName?: string
  status?: 'pending' | 'detected' | 'not_found' | 'assigned' | 'default'
  layout?: 'list' | 'grid'
  delay?: number
  minLength?: number
  limit?: number
  onSearchQuery?: (term: string) => Promise<SkuSearchResultItem[]>
  onSelectProduct?: (product: SkuSearchResultItem) => void
  onValueChange?: (value: string, matchedProduct?: SkuSearchResultItem) => void
  onClear?: () => void
}

/**
 * Buscador ultrarrápido y reutilizable de SKU / Producto.
 * - Buffer local a 0ms con escudo anti-corte de foco (isFocusedRef / isTypingRef).
 * - Reloj local calibrado (por defecto 300ms) con cancelación de búsquedas en vuelo.
 * - Desplegable flotante ligero con selección por clic o Enter.
 * - Reutilizable en Subida Masiva de Imágenes, Notas de Inventario (nueva y edición), etc.
 */
export function SkuQuickSearchInput({
  id,
  value,
  placeholder = 'Buscar SKU o producto...',
  disabled = false,
  autoFocus = false,
  className,
  inputClassName,
  status = 'default',
  layout = 'list',
  delay = 300,
  minLength = 1,
  limit = 12,
  onSearchQuery,
  onSelectProduct,
  onValueChange,
  onClear,
}: SkuQuickSearchInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [results, setResults] = useState<SkuSearchResultItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const isFocusedRef = useRef(false)
  const isTypingRef = useRef(false)
  const searchAbortRef = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Escudo anti-corte: solo actualizar desde prop si el usuario NO está escribiendo ni enfocado
  useEffect(() => {
    if (!isFocusedRef.current && !isTypingRef.current) {
      setInputValue(value)
    }
  }, [value])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const defaultSearchQuery = async (cleanTerm: string): Promise<SkuSearchResultItem[]> => {
    const res = await fetch(`/api/inventario/notas/nueva/search?q=${encodeURIComponent(cleanTerm)}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  }

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    const clean = term.trim()
    isTypingRef.current = false

    if (clean.length < minLength) {
      setResults([])
      setLoading(false)
      setShowDropdown(false)
      onValueChange?.(clean)
      return
    }

    const currentSearchId = ++searchAbortRef.current
    setLoading(true)

    try {
      const searchFn = onSearchQuery ?? defaultSearchQuery
      const items = await searchFn(clean)

      if (searchAbortRef.current === currentSearchId) {
        setResults(items.slice(0, limit))
        setSelectedIndex(-1)
        if (isFocusedRef.current && items.length > 0) {
          setShowDropdown(true)
        }

        // Detección de coincidencia exacta
        const exact = items.find(
          (p) => p.sku_base.toUpperCase() === clean.toUpperCase()
        )
        onValueChange?.(clean, exact)
      }
    } catch (err) {
      console.error('[SkuQuickSearchInput] Error:', err)
      if (searchAbortRef.current === currentSearchId) {
        setResults([])
      }
    } finally {
      if (searchAbortRef.current === currentSearchId) {
        setLoading(false)
      }
    }
  }, delay)

  const handleInputChange = (val: string) => {
    isTypingRef.current = true
    setInputValue(val)

    if (val.trim().length === 0) {
      debouncedSearch.cancel()
      setResults([])
      setShowDropdown(false)
      setLoading(false)
      onValueChange?.('')
      onClear?.()
    } else {
      debouncedSearch(val)
    }
  }

  const handleSelect = (item: SkuSearchResultItem) => {
    isTypingRef.current = false
    setInputValue(item.sku_base)
    setShowDropdown(false)
    setResults([])
    onSelectProduct?.(item)
    onValueChange?.(item.sku_base, item)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const target = selectedIndex >= 0 ? results[selectedIndex] : results[0]
        if (target) handleSelect(target)
        return
      }
    }

    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleClear = () => {
    isTypingRef.current = false
    debouncedSearch.cancel()
    setInputValue('')
    setResults([])
    setShowDropdown(false)
    setLoading(false)
    onValueChange?.('')
    onClear?.()
  }

  const isError = status === 'not_found' || status === 'pending'
  const isAssigned = status === 'assigned' || status === 'detected'

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Input
          id={id}
          autoFocus={autoFocus}
          disabled={disabled}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            isFocusedRef.current = true
            if (results.length > 0) setShowDropdown(true)
          }}
          onBlur={() => {
            isFocusedRef.current = false
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'pr-14 font-mono font-medium transition-colors',
            isError && inputValue ? 'border-red-500/70 focus-visible:ring-red-300 dark:border-red-500/60' : '',
            isAssigned ? 'border-green-500/70 focus-visible:ring-green-300 dark:border-green-500/60' : '',
            inputClassName
          )}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
          {inputValue && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={handleClear}
              title="Limpiar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isAssigned ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground/60" />
          )}
        </div>
      </div>

      {/* Dropdown flotante con las sugerencias (lista compacta o grid 2 columnas) */}
      {showDropdown && results.length > 0 && (
        <div
          className={cn(
            'absolute left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl overflow-y-auto animate-in fade-in-50 duration-150 p-1.5',
            layout === 'grid'
              ? 'max-h-[300px] grid grid-cols-1 sm:grid-cols-2 gap-2'
              : 'max-h-56 divide-y divide-border/50'
          )}
        >
          {results.map((p, idx) => {
            const isExact = p.sku_base.toUpperCase() === inputValue.trim().toUpperCase()
            const isHighlighted = idx === selectedIndex

            if (layout === 'grid') {
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(p)
                  }}
                  className={cn(
                    'flex flex-col gap-1 p-3 rounded-lg border hover:bg-muted text-left transition-colors text-sm group',
                    isHighlighted ? 'bg-primary/10 border-primary/40' : 'border-border/60 bg-card/60',
                    isExact && !isHighlighted && 'border-green-500/40 bg-green-500/5'
                  )}
                >
                  <span className="font-mono text-xs font-bold tracking-wider text-primary group-hover:underline">
                    {p.sku_base}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {p.descripcion ?? p.nombre}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80">
                    {p.pz_en_caja ?? '?'} piezas por caja
                  </span>
                </button>
              )
            }

            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(p)
                }}
                className={cn(
                  'w-full flex flex-col text-left px-3 py-2 text-xs transition-colors group',
                  isHighlighted ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/60',
                  isExact && !isHighlighted && 'bg-green-500/5'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                    {p.sku_base}
                  </span>
                  {p.pz_en_caja != null && (
                    <span className="text-[10px] text-muted-foreground/80 font-mono">
                      {p.pz_en_caja} pz/caja
                    </span>
                  )}
                </div>
                {(p.descripcion || p.nombre) && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-full mt-0.5">
                    {p.descripcion || p.nombre}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

