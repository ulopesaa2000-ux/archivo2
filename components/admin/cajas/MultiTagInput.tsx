'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface TagOption {
  id: string | number
  label: string
  value: string
}

interface MultiTagInputProps {
  name?: string // ← nombre para el campo hidden del formulario
  placeholder?: string
  options?: TagOption[]
  selectedValues: TagOption[]
  onAdd: (option: TagOption) => void
  onRemove: (id: string | number) => void
  freeText?: boolean
  label?: string
  disabled?: boolean
}

const capitalize = (str: string) => {
  if (!str) return ''
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function MultiTagInput({
  name = 'tags',
  placeholder = 'Escribe y presiona Enter...',
  options = [],
  selectedValues,
  onAdd,
  onRemove,
  freeText = true,
  label,
  disabled = false,
}: MultiTagInputProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Valor concatenado con | para el formulario
  const pipedValue = React.useMemo(
    () => selectedValues.map((t) => t.value).join('|'),
    [selectedValues]
  )

  const handleAddValue = (val: string) => {
    const cleanVal = val.trim()
    if (!cleanVal) return

    // Evitar duplicados por valor
    if (selectedValues.some((s) => s.value.toLowerCase() === cleanVal.toLowerCase())) {
      return
    }

    const capitalized = capitalize(cleanVal)

    // Buscar coincidencia exacta en opciones
    const match = options.find(
      (opt) =>
        opt.label.toLowerCase() === cleanVal.toLowerCase() ||
        opt.value.toLowerCase() === cleanVal.toLowerCase()
    )

    if (match) {
      onAdd(match)
    } else if (freeText) {
      onAdd({
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label: capitalized,
        value: capitalized,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.includes('|')) {
        inputValue
          .split('|')
          .map((v) => v.trim())
          .filter(Boolean)
          .forEach((v) => handleAddValue(v))
      } else {
        handleAddValue(inputValue)
      }
      setInputValue('')
      setOpen(false)
      return
    }

    if (e.key === 'Backspace' && inputValue === '' && selectedValues.length > 0) {
      e.preventDefault()
      onRemove(selectedValues[selectedValues.length - 1].id)
      return
    }

    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // Filtrar opciones para el dropdown
  const filteredOptions = React.useMemo(() => {
    if (!inputValue.trim()) return []
    const search = inputValue.toLowerCase()
    return options
      .filter(
        (opt) =>
          !selectedValues.some((sv) => sv.id === opt.id) &&
          (opt.label.toLowerCase().includes(search) || opt.value.toLowerCase().includes(search))
      )
      .slice(0, 8)
  }, [options, selectedValues, inputValue])

  // Cerrar dropdown al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
          {label}
        </label>
      )}

      {/* Campo hidden para el formulario */}
      <input type="hidden" name={name} value={pipedValue} />

      {/* Input container */}
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 rounded-md border bg-background min-h-[42px] transition-all relative',
          'focus-within:ring-1 focus-within:ring-primary',
          disabled && 'opacity-50 pointer-events-none'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedValues.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="flex items-center gap-1 pl-2 pr-1 py-1 h-7 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {tag.label}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(tag.id)
              }}
              className="rounded-full hover:bg-primary/20 p-0.5"
              tabIndex={-1}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-[120px] h-7"
          placeholder={selectedValues.length === 0 ? placeholder : ''}
          value={inputValue}
          disabled={disabled}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) setOpen(true)
          }}
        />

        {/* Dropdown de sugerencias (sin Popover/Command complejo) */}
        {open && filteredOptions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover shadow-md overflow-hidden">
            <div className="max-h-[200px] overflow-auto p-1">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                  onMouseDown={(e) => e.preventDefault()} // evita que el input pierda foco antes del click
                  onClick={() => {
                    onAdd(opt)
                    setInputValue('')
                    setOpen(false)
                    inputRef.current?.focus()
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{opt.label}</span>
                    {opt.value !== opt.label && (
                      <span className="text-[10px] text-muted-foreground">{opt.value}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-[9px] text-muted-foreground px-1">
        Presiona <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd> para agregar •{' '}
        <kbd className="font-mono bg-muted px-1 rounded">|</kbd> para múltiples
      </p>

      {/* Resultado concatenado debajo */}
      {selectedValues.length > 0 && (
        <div className="rounded-md border-l-4 border-primary bg-muted/30 p-3 space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
            Valor a enviar (separado por |)
          </p>
          <code className="block text-xs font-mono text-foreground break-all bg-background border rounded px-2 py-1.5">
            {pipedValue}
          </code>
          <p className="text-[9px] text-muted-foreground">
            {selectedValues.length} elemento{selectedValues.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}