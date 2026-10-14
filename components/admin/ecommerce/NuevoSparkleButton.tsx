// components/admin/ecommerce/NuevoSparkleButton.tsx
'use client'

import { useState, useTransition, useEffect, MouseEvent } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toggleNuevoProductoWebAction } from '@/modules/ecommerce/actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NuevoSparkleButtonProps {
  productoId: number
  productoWebId: number | null
  initialNuevo: boolean
  skuBase: string
  className?: string
}

export function NuevoSparkleButton({
  productoId,
  productoWebId,
  initialNuevo,
  skuBase,
  className,
}: NuevoSparkleButtonProps) {
  const [isNuevo, setIsNuevo] = useState<boolean>(initialNuevo)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Sincronizar con el servidor tras refresh (ej. cambio masivo de flags)
  useEffect(() => {
    setIsNuevo(initialNuevo)
  }, [initialNuevo])

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const nextState = !isNuevo
    setIsNuevo(nextState)

    startTransition(async () => {
      const res = await toggleNuevoProductoWebAction(productoId, isNuevo, productoWebId)
      if (res.success) {
        toast.success(
          nextState
            ? `Producto [${skuBase}] marcado como nuevo/novedad.`
            : `Producto [${skuBase}] removido de novedades.`
        )
        // Si hay filtro especial activo, refrescar para reordenar la lista
        if (searchParams.get('especial')) router.refresh()
      } else {
        setIsNuevo(!nextState)
        toast.error(res.error || 'Error al actualizar nuevo.')
      }
    })
  }

  const titleText = isNuevo ? 'Quitar de novedades' : 'Marcar como nuevo (novedad)'

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={titleText}
      aria-label={titleText}
      className={cn(
        'p-1.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-150 focus:outline-none shrink-0 cursor-pointer inline-flex items-center justify-center',
        isPending && 'opacity-80 cursor-wait',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
      ) : (
        <Sparkles
          className={cn(
            'h-4 w-4 transition-all duration-150 hover:scale-110 active:scale-95',
            isNuevo
              ? 'fill-purple-500 text-purple-500 drop-shadow-sm'
              : 'text-slate-300 dark:text-slate-600 hover:text-purple-500 hover:fill-purple-500/20'
          )}
        />
      )}
    </button>
  )
}
