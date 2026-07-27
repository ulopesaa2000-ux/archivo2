// C:\Users\uriel\Downloads\enero 26\archivo2\components\admin\SearchInput.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search } from 'lucide-react'

type Props = {
  placeholder?: string
  id?: string
  currentValue?: string | null
  onSearch: (term: string | null) => void
  delay?: number
  controlled?: boolean
  /** No consulta mientras el término sea más corto. */
  minLength?: number
  /** Muestra un fallback explícito para confirmar la búsqueda por botón. */
  showSubmitButton?: boolean
}

export function SearchInput({
  placeholder = 'Buscar...',
  id = 'search-input',
  currentValue = '',
  onSearch,
  delay = 400,
  controlled = false,
  minLength = 0,
  showSubmitButton = false,
}: Props) {
  const [localValue, setLocalValue] = useState(currentValue ?? '')
  const [isTyping, setIsTyping] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue)

  // Sincroniza el input cuando cambia la URL por navegación, paginación o limpiar filtros.
  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue)
    setLocalValue(currentValue ?? '')
    setIsTyping(false)
    setValidationMessage(null)
  }

  const debouncedSearch = useDebouncedCallback(
    (term: string) => {
      const normalized = term.trim()
      if (normalized.length < minLength) {
        setIsTyping(false)
        return
      }
      onSearch(normalized || null)
      setIsTyping(false)
    },
    delay,
  )

  const submitSearch = useCallback(
    (rawValue = localValue) => {
      const term = rawValue.trim()
      if (term && term.length < minLength) {
        debouncedSearch.cancel()
        setIsTyping(false)
        setValidationMessage(`Escribe al menos ${minLength} caracteres.`)
        return
      }

      debouncedSearch.cancel()
      setValidationMessage(null)
      onSearch(term || null)
      setIsTyping(false)
    },
    [debouncedSearch, localValue, minLength, onSearch],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitSearch(e.currentTarget.value)
      }
    },
    [submitSearch],
  )

  const handleChange = (value: string) => {
    setLocalValue(value)
    const normalized = value.trim()

    if (!normalized) {
      debouncedSearch.cancel()
      onSearch(null)
      setIsTyping(false)
      setValidationMessage(null)
      return
    }

    if (normalized.length < minLength) {
      debouncedSearch.cancel()
      setIsTyping(false)
      setValidationMessage(`Escribe al menos ${minLength} caracteres.`)
      return
    }

    setValidationMessage(null)
    setIsTyping(true)
    debouncedSearch(value)
  }

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  useEffect(() => {
    const handleClear = () => {
      debouncedSearch.cancel()
      setLocalValue('')
      setIsTyping(false)
      setValidationMessage(null)
    }
    window.addEventListener(`clear-${id}`, handleClear)
    return () => window.removeEventListener(`clear-${id}`, handleClear)
  }, [debouncedSearch, id])

  if (controlled) {
    return (
      <div className={`flex-1 ${showSubmitButton ? 'max-w-xl' : 'max-w-sm'}`}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id={id}
              placeholder={placeholder}
              value={localValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-describedby={`${id}-hint`}
              className="pl-10 pr-10"
            />
            {isTyping && (
              <Loader2
                aria-label="Buscando"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground"
              />
            )}
          </div>
          {showSubmitButton && (
            <Button type="button" size="sm" className="h-9 shrink-0" onClick={() => submitSearch()}>
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Buscar
            </Button>
          )}
        </div>
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">
          {validationMessage ?? (showSubmitButton ? 'Búsqueda en vivo · Enter o Buscar para confirmar' : '')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-sm">
      <div className="relative">
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
    </div>
  )
}
