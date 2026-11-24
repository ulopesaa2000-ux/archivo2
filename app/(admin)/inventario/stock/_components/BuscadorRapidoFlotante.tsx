// app/(admin)/inventario/stock/_components/BuscadorRapidoFlotante.tsx
'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, X, Zap } from 'lucide-react'
import type { ProductoBusqueda } from '@/modules/inventario/types'

interface BuscadorRapidoFlotanteProps {
  open: boolean
  onClose: () => void
  selectedLabel: string | null
  searchInputRef: RefObject<HTMLInputElement | null>
  searchTerm: string
  searchResults: ProductoBusqueda[]
  isSearching: boolean
  isCatalogoReady: boolean
  onSearchChange: (value: string) => void
  onSelectResult: (prod: ProductoBusqueda) => void
}

export function BuscadorRapidoFlotante({
  open,
  onClose,
  selectedLabel,
  searchInputRef,
  searchTerm,
  searchResults,
  isSearching,
  isCatalogoReady,
  onSearchChange,
  onSelectResult,
}: BuscadorRapidoFlotanteProps) {
  const [localQuery, setLocalQuery] = useState(searchTerm)
  const [isTyping, setIsTyping] = useState(false)
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm)
  const [prevSelectedLabel, setPrevSelectedLabel] = useState(selectedLabel)
  const isFocusedRef = useRef(false)

  // Candado anti-recorte igual que SearchInput en /catalogo, sincronizando al cambiar de fila
  if (searchTerm !== prevSearchTerm || selectedLabel !== prevSelectedLabel) {
    setPrevSearchTerm(searchTerm)
    setPrevSelectedLabel(selectedLabel)
    if (!isFocusedRef.current) {
      setLocalQuery(searchTerm)
      setIsTyping(false)
    }
  }

  const debouncedSearch = useDebouncedCallback((term: string) => {
    const clean = term.trim()
    setIsTyping(false)
    if (clean.length > 0 && clean.length < 2) return
    onSearchChange(clean)
  }, 300)

  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch])

  if (!open) return null

  const submitNow = (val = localQuery) => {
    debouncedSearch.cancel()
    setIsTyping(false)
    onSearchChange(val.trim())
  }

  const handleChange = (val: string) => {
    setLocalQuery(val)
    const clean = val.trim()
    if (!clean) {
      debouncedSearch.cancel()
      setIsTyping(false)
      onSearchChange('')
      return
    }
    if (clean.length < 2) {
      debouncedSearch.cancel()
      setIsTyping(false)
      return
    }
    setIsTyping(true)
    debouncedSearch(val)
  }

  return (
    <div className="fixed sm:absolute right-4 top-28 sm:top-20 z-50 w-[390px] max-w-[92vw] rounded-2xl border-2 border-primary/30 bg-popover/98 backdrop-blur-md shadow-2xl p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
            <Search className="size-3.5" />
            <Zap className="size-3 text-amber-500 fill-amber-500" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-foreground">
            Buscador Rápido
          </span>
          {isCatalogoReady && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              (0ms)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={
              selectedLabel
                ? 'text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/30'
                : 'text-[10px] text-muted-foreground'
            }
          >
            {selectedLabel ? `Fila ${selectedLabel}` : 'Selecciona una fila'}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-6 rounded-full"
            title="Cerrar buscador flotante"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Input + botón Buscar (patrón /catalogo) */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            ref={searchInputRef}
            value={localQuery}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => {
              isFocusedRef.current = true
            }}
            onBlur={() => {
              isFocusedRef.current = false
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitNow(e.currentTarget.value)
              }
            }}
            placeholder="SKU, serie (ej. J219/) o descripción..."
            className="h-8 pl-8 pr-12 text-xs font-mono font-bold rounded-lg bg-background"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {localQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  debouncedSearch.cancel()
                  setLocalQuery('')
                  setIsTyping(false)
                  onSearchChange('')
                  searchInputRef.current?.focus()
                }}
                className="size-5 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </Button>
            )}
            {(isSearching || isTyping) && <Loader2 className="size-3.5 animate-spin text-primary" />}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => submitNow()}
          className="h-8 px-2.5 text-xs font-bold shrink-0 rounded-lg"
        >
          Buscar
        </Button>
      </div>

      {/* Resultados */}
      {searchResults.length > 0 ? (
        <div className="bg-background border rounded-xl max-h-[300px] overflow-y-auto divide-y divide-border/50 p-1">
          {searchResults.slice(0, 15).map((prod) => (
            <Button
              key={prod.id}
              type="button"
              variant="ghost"
              onClick={() => onSelectResult(prod)}
              className="w-full h-auto justify-between p-2 rounded-lg text-left text-xs font-normal group"
            >
              <div className="flex flex-col truncate pr-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-primary group-hover:underline">
                    {prod.sku_base}
                  </span>
                  {prod.marca_nombre && (
                    <span className="text-[9px] uppercase font-semibold text-muted-foreground">
                      · {prod.marca_nombre}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground truncate">
                  {prod.descripcion ?? prod.nombre}
                </span>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] font-mono">
                {prod.pz_en_caja ?? '?'} pz
              </Badge>
            </Button>
          ))}
        </div>
      ) : searchTerm.trim().length >= 1 && !isSearching && !isTyping ? (
        <div className="p-3 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl">
          Sin coincidencias para &quot;{searchTerm}&quot;
        </div>
      ) : (
        <div className="px-1 text-[11px] text-muted-foreground">
          Mín. 2 caracteres en vivo o presiona <strong>Buscar / Enter</strong> para consultar al instante.
        </div>
      )}
    </div>
  )
}
