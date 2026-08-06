// app/(admin)/catalogo/components/DestacadoStarButton.tsx
'use client'

import { useState, useTransition, MouseEvent } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toggleDestacadoAction } from '@/modules/catalogo/actions'
import { cn } from '@/lib/utils'

interface DestacadoStarButtonProps {
  id: number
  initialDestacado: boolean
  variant?: 'table' | 'grid' | 'hero'
  className?: string
  showLabel?: boolean
}

export function DestacadoStarButton({
  id,
  initialDestacado,
  variant = 'table',
  className,
  showLabel = false,
}: DestacadoStarButtonProps) {
  const [isDestacado, setIsDestacado] = useState<boolean>(initialDestacado)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const nextState = !isDestacado
    // Actualización optimista instantánea
    setIsDestacado(nextState)

    startTransition(async () => {
      const res = await toggleDestacadoAction(id, nextState)
      if (!res.success) {
        // Revertir en caso de error
        setIsDestacado(!nextState)
      }
    })
  }

  const titleText = isDestacado ? 'Quitar de destacados' : 'Marcar como destacado'

  if (variant === 'hero') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        title={titleText}
        className={cn(
          'inline-flex items-center gap-1.5 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400/50 shrink-0 cursor-pointer',
          isDestacado
            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-500 hover:bg-amber-200 dark:hover:bg-amber-900/80 border border-amber-300/60 dark:border-amber-700/50 shadow-sm hover:scale-110 active:scale-95'
            : 'bg-muted/70 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-800 hover:scale-110 active:scale-95',
          isPending && 'opacity-80 cursor-wait',
          className
        )}
      >
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        ) : (
          <Star
            className={cn(
              'h-5 w-5 transition-transform duration-200',
              isDestacado ? 'fill-amber-400 text-amber-500' : 'text-slate-400 hover:text-amber-500'
            )}
          />
        )}
        {showLabel && (
          <span className="text-xs font-semibold pr-1 text-slate-700 dark:text-slate-200">
            {isDestacado ? 'Destacado' : 'Destacar'}
          </span>
        )}
      </button>
    )
  }

  if (variant === 'grid') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        title={titleText}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-200 backdrop-blur-md shadow-md focus:outline-none shrink-0 cursor-pointer',
          isDestacado
            ? 'bg-amber-400/90 text-amber-950 hover:bg-amber-400 border border-amber-300/60 hover:scale-105 active:scale-95'
            : 'bg-slate-900/60 hover:bg-slate-900/80 text-slate-300 hover:text-amber-300 border border-white/20 hover:scale-105 active:scale-95',
          isPending && 'opacity-80 cursor-wait',
          className
        )}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Star
            className={cn(
              'h-3 w-3 transition-colors',
              isDestacado ? 'fill-amber-950 text-amber-950' : 'text-slate-300 group-hover:text-amber-300'
            )}
          />
        )}
        <span>{isDestacado ? 'Destacado' : 'Destacar'}</span>
      </button>
    )
  }

  // Variant: table (default)
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={titleText}
      className={cn(
        'p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all duration-150 focus:outline-none shrink-0 cursor-pointer',
        isPending && 'opacity-80 cursor-wait',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
      ) : (
        <Star
          className={cn(
            'h-4 w-4 transition-all duration-150 hover:scale-110 active:scale-95',
            isDestacado
              ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
              : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:fill-amber-400/20'
          )}
        />
      )}
    </button>
  )
}
