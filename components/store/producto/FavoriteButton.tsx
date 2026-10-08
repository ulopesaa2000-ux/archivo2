// components/store/producto/FavoriteButton.tsx
'use client'

import { Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  productoWebId: number
  nombre?: string
  variant?: 'card' | 'pdp'
  className?: string
}

export function FavoriteButton({ productoWebId, nombre, variant = 'card', className }: FavoriteButtonProps) {
  const { toggleFavorite, isFavorite, isHydrated } = useFavorites()
  const active = isHydrated && isFavorite(productoWebId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(productoWebId)
  }

  if (variant === 'pdp') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        title={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        className={cn(
          'flex items-center gap-2 text-[13px] underline tracking-[0.02em] font-medium p-0 bg-transparent border-none transition-colors',
          active ? 'text-red-600 hover:text-red-700' : 'text-store-ink2 hover:text-store-ink',
          className
        )}
      >
        <Heart className={cn('h-4 w-4 transition-all', active && 'fill-red-600 text-red-600')} />
        {active ? `En favoritos${nombre ? ` · ${nombre}` : ''}` : 'Guardar en favoritos'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      title={active ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 shrink-0',
        active
          ? 'bg-red-500/10 border-red-300 text-red-600'
          : 'bg-transparent border-store-border text-store-ink3 hover:text-red-600 hover:border-red-300',
        className
      )}
    >
      <Heart className={cn('h-4 w-4', active && 'fill-current')} />
    </button>
  )
}
