// app/(admin)/catalogo/imagenes/components/BuscadorSku.tsx
'use client'

import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedCallback } from 'use-debounce'
import { buscarProductosParaSelector } from '@/modules/catalogo/imagenes/queries'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  onChange: (sku: string) => void
  status: string
}

/**
 * Buscador de SKU con autocompletado debounced.
 * Muestra un dropdown de sugerencias al escribir ≥2 caracteres.
 */
export function BuscadorSku({ value, onChange, status }: Props) {
  const [results, setResults] = useState<{ id: number; sku_base: string; nombre: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  const search = useDebouncedCallback(async (term: string) => {
    if (term.length < 2) { setResults([]); return }
    setLoading(true)
    const prods = await buscarProductosParaSelector(term, 10)
    setResults(prods)
    setLoading(false)
  }, 300)

  const handleInputChange = (val: string) => {
    onChange(val)
    search(val)
    setShowDropdown(true)
  }

  const handleSelect = (p: { sku_base: string }) => {
    onChange(p.sku_base)
    setShowDropdown(false)
    setResults([])
  }

  const isError = status === 'not_found' || status === 'pending'

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Buscar SKU..."
        className={cn('h-7 text-xs pr-7', isError ? 'border-red-400 border-2 focus-visible:ring-red-300' : '')}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          : <Search className="h-3 w-3 text-muted-foreground" />
        }
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => handleSelect(p)}
              className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs"
            >
              <span className="font-mono font-bold">{p.sku_base}</span>
              <span className="text-muted-foreground ml-2 truncate">- {p.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
