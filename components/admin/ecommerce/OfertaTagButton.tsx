// components/admin/ecommerce/OfertaTagButton.tsx
'use client'

import { useState, useTransition, useEffect, MouseEvent } from 'react'
import { Tag, Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toggleOfertaProductoWebAction } from '@/modules/ecommerce/actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface OfertaTagButtonProps {
  productoId: number
  productoWebId: number | null
  initialEnOferta: boolean
  skuBase: string
  className?: string
  onNeedsPrice?: () => void
}

export function OfertaTagButton({
  productoId,
  productoWebId,
  initialEnOferta,
  skuBase,
  className,
  onNeedsPrice,
}: OfertaTagButtonProps) {
  const [isOferta, setIsOferta] = useState<boolean>(initialEnOferta)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Sincronizar con el servidor tras refresh (ej. cambio masivo de flags)
  useEffect(() => {
    setIsOferta(initialEnOferta)
  }, [initialEnOferta])

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Si va a activar y no hay registro web, abrir modal de precios en vez de fallar
    if (!isOferta && !productoWebId && onNeedsPrice) {
      onNeedsPrice()
      return
    }

    const nextState = !isOferta
    setIsOferta(nextState)

    startTransition(async () => {
      const res = await toggleOfertaProductoWebAction(productoId, isOferta, productoWebId)
      if (res.success) {
        toast.success(
          nextState
            ? `Producto [${skuBase}] marcado en oferta.`
            : `Producto [${skuBase}] removido de oferta.`
        )
        if (searchParams.get('especial')) router.refresh()
      } else {
        setIsOferta(!nextState)
        toast.error(res.error || 'Error al actualizar oferta.')
        // Si falta precio de oferta, abrir modal de precios para configurarlo
        if (onNeedsPrice && (res.error || '').includes('precio')) {
          onNeedsPrice()
        }
      }
    })
  }

  const titleText = isOferta ? 'Quitar de oferta' : 'Marcar en oferta (requiere precio oferta ≥ $1)'

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      title={titleText}
      aria-label={titleText}
      className={cn(
        'p-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-150 focus:outline-none shrink-0 cursor-pointer inline-flex items-center justify-center',
        isPending && 'opacity-80 cursor-wait',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : (
        <Tag
          className={cn(
            'h-4 w-4 transition-all duration-150 hover:scale-110 active:scale-95',
            isOferta
              ? 'fill-emerald-500 text-emerald-500 drop-shadow-sm'
              : 'text-slate-300 dark:text-slate-600 hover:text-emerald-600 hover:fill-emerald-500/20'
          )}
        />
      )}
    </button>
  )
}
