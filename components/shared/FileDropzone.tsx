// components/shared/FileDropzone.tsx
'use client'

import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSizeMB?: number
  disabled?: boolean
  icon?: ReactNode
  title?: string
  description?: string
  buttonLabel?: string
  actions?: ReactNode
  compact?: boolean
  compactLabel?: string
  className?: string
  onValidationError?: (message: string) => void
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept || !accept.trim()) return true
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  if (tokens.length === 0) return true

  const fileName = file.name.toLowerCase()
  const mime = (file.type || '').toLowerCase()

  return tokens.some((token) => {
    if (token.startsWith('.')) return fileName.endsWith(token)
    if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1))
    return mime === token
  })
}

export function FileDropzone({
  onFilesSelected,
  accept,
  multiple = false,
  maxFiles,
  maxSizeMB,
  disabled = false,
  icon,
  title = 'Arrastra y suelta tu archivo aquí',
  description = 'O haz clic para seleccionarlo desde tu equipo',
  buttonLabel = 'Examinar archivos',
  actions,
  compact = false,
  compactLabel = 'Agregar',
  className,
  onValidationError,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  const reportError = (msg: string) => {
    if (onValidationError) onValidationError(msg)
    else toast.error(msg)
  }

  const handleFiles = (rawList: FileList | File[] | null) => {
    if (disabled || !rawList) return
    let list = Array.from(rawList)
    if (list.length === 0) return

    if (!multiple) {
      list = [list[0]]
    }

    if (maxFiles && list.length > maxFiles) {
      reportError(`El límite máximo es de ${maxFiles} archivo(s).`)
      return
    }

    const accepted = list.filter((f) => matchesAccept(f, accept))
    if (accepted.length === 0) {
      reportError(accept ? `Formato no compatible. Permitidos: ${accept}` : 'Archivo no compatible.')
      return
    }
    if (accepted.length < list.length) {
      reportError('Algunos archivos fueron omitidos por formato no compatible.')
    }

    const maxBytes = maxSizeMB ? maxSizeMB * 1024 * 1024 : null
    const sized = maxBytes ? accepted.filter((f) => f.size <= maxBytes) : accepted
    if (sized.length === 0 && maxSizeMB) {
      reportError(`El archivo supera el tamaño máximo de ${maxSizeMB} MB.`)
      return
    }
    if (sized.length < accepted.length && maxSizeMB) {
      reportError(`Algunos archivos superan ${maxSizeMB} MB y fueron omitidos.`)
    }

    onFilesSelected(sized)
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) openPicker()
      }}
      className={cn(
        'relative transition-all select-none',
        compact
          ? 'aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 hover:bg-muted/40 cursor-pointer'
          : 'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-8 text-center hover:border-primary/50 cursor-pointer',
        isDragging && 'border-primary bg-primary/5 ring-2 ring-primary/20',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {compact ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          className="w-full h-full flex flex-col items-center justify-center gap-1"
        >
          {icon || <UploadCloud className="h-5 w-5 opacity-60" />}
          <span className="text-[10px] font-medium">{compactLabel}</span>
        </button>
      ) : (
        <>
          <div onClick={openPicker} className="flex flex-col items-center">
            {icon || <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground/60" />}
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            {isDragging && (
              <p className="mt-2 text-xs font-semibold text-primary">Suelta aquí para cargar</p>
            )}
          </div>

          <div
            className="mt-4 flex flex-wrap justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="outline" size="sm" type="button" onClick={openPicker} disabled={disabled}>
              {buttonLabel}
            </Button>
            {actions}
          </div>
        </>
      )}
    </div>
  )
}
