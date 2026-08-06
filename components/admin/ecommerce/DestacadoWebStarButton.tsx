// components/admin/ecommerce/DestacadoWebStarButton.tsx
'use client'

import { useState, useTransition, MouseEvent } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toggleDestacadoProductoWebAction } from '@/modules/ecommerce/actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface DestacadoWebStarButtonProps {
  productoId: number
  productoWebId: number | null
  initialDestacado: boolean
  skuBase: string
  className?: string
}

export function DestacadoWebStarButton({
  productoId,
  productoWebId,
  initialDestacado,
  skuBase,
  className,
}: DestacadoWebStarButtonProps) {
  const [isDestacado, setIsDestacado] = useState<boolean>(initialDestacado)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const nextState = !isDestacado
    // Optimistic update
    setIsDestacado(nextState)

    startTransition(async () => {
      const res = await toggleDestacadoProductoWebAction(productoId, isDestacado, productoWebId)
      if (res.success) {
        toast.success(
          nextState
            ? `Producto [${skuBase}] marcado como destacado para Ecommerce.`
            : `Producto [${skuBase}] removido de destacados.`
        )
      } else {
        setIsDestacado(!nextState)
        toast.error(res.error || 'Error al actualizar el estado de destacado.')
      }
    })
  }

  const titleText = isDestacado
    ? 'Quitar de destacados ecommerce'
    : 'Marcar como destacado para ecommerce'

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={titleText}
      className={cn(
        'p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all duration-150 focus:outline-none shrink-0 cursor-pointer inline-flex items-center justify-center',
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
