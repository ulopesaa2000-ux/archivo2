// components/admin/SearchInput.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { Search } from 'lucide-react'

type Props = {
  /** Placeholder del input */
  placeholder?: string
  /** ID del input (para limpiar desde afuera) */
  id?: string
  /** Valor actual en la URL */
  currentValue?: string | null
  /** Callback que se ejecuta cuando se dispara la búsqueda */
  onSearch: (term: string | null) => void
  /** Delay en ms (default 400) */
  delay?: number
  /** Si es true, el input es controlado internamente */
  controlled?: boolean
}

export function SearchInput({
  placeholder = 'Buscar...',
  id = 'search-input',
  currentValue = '',
  onSearch,
  delay = 400,
  controlled = false,
}: Props) {
  const [localValue, setLocalValue] = useState(currentValue ?? '')
  const [isTyping, setIsTyping] = useState(false)
  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue)

  // Sincronizar cuando cambia la URL en la render-phase
  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue)
    setLocalValue(currentValue ?? '')
    setIsTyping(false)
  }

  // Debounce para búsqueda automática mientras escribe
  const debouncedSearch = useDebouncedCallback(
    (term: string) => {
      onSearch(term || null)
      setIsTyping(false)
    },
    delay
  )

  // Búsqueda inmediata por Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Cancelar debounce pendiente y buscar inmediatamente
        debouncedSearch.cancel()
        const term = e.currentTarget.value
        onSearch(term || null)
        setIsTyping(false)
      }
    },
    [debouncedSearch, onSearch]
  )

  // Manejo de cambio (detecta si está escribiendo)
  const handleChange = (value: string) => {
    setLocalValue(value)
    // Solo activar typing si hay texto
    if (value.length > 0) {
      setIsTyping(true)
      debouncedSearch(value)
    } else {
      // Si borra todo, limpiar búsqueda inmediatamente
      debouncedSearch.cancel()
      onSearch(null)
      setIsTyping(false)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  // Cleanup externo (para botón limpiar)
  useEffect(() => {
    const handleClear = () => {
      setLocalValue('')
      setIsTyping(false)
    }
    window.addEventListener(`clear-${id}`, handleClear)
    return () => window.removeEventListener(`clear-${id}`, handleClear)
  }, [id])

  if (controlled) {
    return (
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {/* Indicador visual */}
        {isTyping && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-amber-500 font-medium">
            escribe...
          </span>
        )}
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground hidden" />
      </div>
    )
  }

  // Modo no controlado (más simple, igual que antes)
  return (
    <div className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id={id}
        placeholder={placeholder}
        defaultValue={currentValue ?? ''}
        onChange={(e) => debouncedSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-10"
      />
    </div>
  )
}