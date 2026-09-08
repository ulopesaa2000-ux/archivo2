// app/(admin)/catalogo/imagenes/components/BuscadorSku.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedCallback } from 'use-debounce'
import { buscarProductosParaSelector } from '@/modules/catalogo/imagenes/queries'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (sku: string, matchedProduct?: { id: number; sku_base: string; nombre: string | null }) => void
  status: string
}

/**
 * Buscador de SKU optimizado con autocompletado rápido debounced (180ms).
 * - Manejo de input local para escritura fluida sin lag.
 * - Búsqueda tolerante a separadores ('/', '-', espacios).
 * - Dropdown flotante con selección directa de producto.
 */
export function BuscadorSku({ value, onChange, status }: Props) {
  const [inputValue, setInputValue] = useState(value)
  const [results, setResults] = useState<{ id: number; sku_base: string; nombre: string; descripcion?: string | null }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchAbortRef = useRef<number>(0)

  // Sincronizar con el valor del prop si cambia externamente (ej: autodeteción)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    const clean = term.trim()
    if (clean.length < 1) {
      setResults([])
      setLoading(false)
      onChange('')
      return
    }

    const currentSearchId = ++searchAbortRef.current
    setLoading(true)

    try {
      const prods = await buscarProductosParaSelector(clean, 10)
      if (searchAbortRef.current === currentSearchId) {
        setResults(prods)
        setShowDropdown(true)

        // Si hay coincidencia exacta ignorando mayúsculas/minúsculas
        const exact = prods.find(p => p.sku_base.toUpperCase() === clean.toUpperCase())
        if (exact) {
          onChange(exact.sku_base, exact)
        } else {
          onChange(clean)
        }
      }
    } catch (err) {
      console.error('Error buscando SKU:', err)
      if (searchAbortRef.current === currentSearchId) {
        setResults([])
      }
    } finally {
      if (searchAbortRef.current === currentSearchId) {
        setLoading(false)
      }
    }
  }, 180)

  const handleInputChange = (val: string) => {
    setInputValue(val)
    if (val.trim().length === 0) {
      setResults([])
      setShowDropdown(false)
      onChange('')
    } else {
      debouncedSearch(val)
    }
  }

  const handleSelect = (p: { id: number; sku_base: string; nombre: string }) => {
    setInputValue(p.sku_base)
    setShowDropdown(false)
    setResults([])
    onChange(p.sku_base, p)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (results.length > 0) {
        handleSelect(results[0])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const isError = status === 'not_found' || status === 'pending'
  const isAssigned = status === 'assigned' || status === 'detected'

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true)
          }}
          onBlur={() => {
            // Delay para permitir clic en las sugerencias del dropdown
            setTimeout(() => setShowDropdown(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar SKU..."
          className={cn(
            'h-8 text-xs pr-14 font-mono font-medium transition-colors',
            isError && inputValue ? 'border-red-500/70 focus-visible:ring-red-300 dark:border-red-500/60' : '',
            isAssigned ? 'border-green-500/70 focus-visible:ring-green-300 dark:border-green-500/60' : ''
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              tabIndex={-1}
              className="h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => {
                setInputValue('')
                setResults([])
                setShowDropdown(false)
                onChange('')
              }}
              title="Limpiar"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : isAssigned ? (
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground border rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y animate-in fade-in-50 duration-150">
          {results.map((p) => {
            const isExact = p.sku_base.toUpperCase() === inputValue.trim().toUpperCase()
            return (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(p)
                }}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 hover:bg-muted/80 text-xs flex flex-col transition-colors',
                  isExact && 'bg-primary/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">{p.sku_base}</span>
                  {isExact && <span className="text-[10px] text-primary font-semibold">Exacto</span>}
                </div>
                {(p.descripcion || p.nombre) && (
                  <span className="text-[11px] text-muted-foreground truncate line-clamp-1">
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
