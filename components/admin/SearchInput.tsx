// C:\Users\uriel\Downloads\enero 26\archivo2\components\admin\SearchInput.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search, X } from 'lucide-react'

type Props = {
  placeholder?: string
  id?: string
  currentValue?: string | null
  onSearch: (term: string | null) => void
  delay?: number
  controlled?: boolean
  /** No consulta mientras el término sea más corto. */
  minLength?: number
  /** Muestra un botón explícito para confirmar la búsqueda. */
  showSubmitButton?: boolean
  className?: string
}

export function SearchInput({
  placeholder = 'Buscar...',
  id = 'search-input',
  currentValue = '',
  onSearch,
  delay = 400,
  controlled = true,
  minLength = 0,
  showSubmitButton = false,
  className = '',
}: Props) {
  const [localValue, setLocalValue] = useState(currentValue ?? '')
  const [isTyping, setIsTyping] = useState(false)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [prevCurrentValue, setPrevCurrentValue] = useState(currentValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const isFocusedRef = useRef(false)
  const isTypingRef = useRef(false)

  // Sincroniza el input cuando cambia la URL desde afuera (navegación, limpiar filtros, etc.).
  // CANDADO ANTIRECORTE: Si el usuario tiene el cursor en el input o está tecleando,
  // la red o la URL tienen ESTRICTAMENTE PROHIBIDO sobrescribir o recortar lo que está en pantalla.
  if (currentValue !== prevCurrentValue) {
    setPrevCurrentValue(currentValue)
    if (!isFocusedRef.current && !isTypingRef.current) {
      setLocalValue(currentValue ?? '')
      setIsTyping(false)
      setValidationMessage(null)
    }
  }

  const debouncedSearch = useDebouncedCallback(
    (term: string) => {
      const normalized = term.trim()
      if (normalized.length > 0 && normalized.length < minLength) {
        setIsTyping(false)
        isTypingRef.current = false
        return
      }
      onSearch(normalized || null)
      setIsTyping(false)
      isTypingRef.current = false
    },
    delay,
  )

  const submitSearch = useCallback(
    (rawValue = localValue) => {
      const term = rawValue.trim()
      if (term && term.length < minLength) {
        debouncedSearch.cancel()
        setIsTyping(false)
        isTypingRef.current = false
        setValidationMessage(`Escribe al menos ${minLength} caracteres.`)
        return
      }

      debouncedSearch.cancel()
      setValidationMessage(null)
      onSearch(term || null)
      setIsTyping(false)
      isTypingRef.current = false
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
    // 1. Estado local inmediato a 0ms (buffer que jamás se traba por lentitud de internet)
    setLocalValue(value)
    isTypingRef.current = true
    setIsTyping(true)

    const normalized = value.trim()

    // Si borró todo el texto, limpiar de inmediato sin esperar el delay
    if (!normalized) {
      debouncedSearch.cancel()
      onSearch(null)
      setIsTyping(false)
      isTypingRef.current = false
      setValidationMessage(null)
      return
    }

    // Si aún no cumple la longitud mínima, no saturar la red con consultas genéricas (ej. 1 letra)
    if (normalized.length < minLength) {
      debouncedSearch.cancel()
      setIsTyping(false)
      setValidationMessage(`Escribe al menos ${minLength} caracteres para buscar.`)
      return
    }

    setValidationMessage(null)
    // 2. Reloj local: cada pulsación reinicia el cronómetro de delay ms en memoria
    debouncedSearch(normalized)
  }

  const handleFocus = () => {
    isFocusedRef.current = true
  }

  const handleBlur = () => {
    isFocusedRef.current = false
    if (!isTyping) {
      isTypingRef.current = false
    }
    if (!localValue) {
      setValidationMessage(null)
    }
  }

  const handleClearButton = () => {
    debouncedSearch.cancel()
    setLocalValue('')
    setIsTyping(false)
    isTypingRef.current = false
    setValidationMessage(null)
    onSearch(null)
    inputRef.current?.focus()
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
      isTypingRef.current = false
      setValidationMessage(null)
    }
    window.addEventListener(`clear-${id}`, handleClear)
    return () => window.removeEventListener(`clear-${id}`, handleClear)
  }, [debouncedSearch, id])

  return (
    <div className={`flex-1 ${showSubmitButton ? 'max-w-xl' : 'max-w-sm'} ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            id={id}
            placeholder={placeholder}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-describedby={`${id}-hint`}
            className="pl-9 pr-14 h-9"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {localValue && (
              <button
                type="button"
                onClick={handleClearButton}
                className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isTyping && (
              <Loader2
                aria-label="Esperando pausa para buscar..."
                className="h-4 w-4 animate-spin text-primary shrink-0"
              />
            )}
          </div>
        </div>
        {showSubmitButton && (
          <Button type="button" size="sm" className="h-9 shrink-0 font-medium" onClick={() => submitSearch()}>
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Buscar
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-[11px] text-muted-foreground" aria-live="polite">
        {validationMessage ?? (showSubmitButton ? 'Búsqueda en tiempo real · Enter para forzar' : '')}
      </p>
    </div>
  )
}
