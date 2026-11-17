// components/store/layout/MobileBottomNav.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Grid, Heart, ShoppingBag } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { useFavorites } from '@/hooks/useFavorites'
import { OPEN_CART_EVENT } from '@/components/store/cotizacion/CartDrawer'
import { cn } from '@/lib/utils'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

export function MobileBottomNav({ config }: { config?: ConfigEcommerce | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const { count: cartCount } = useQuoteCart()
  const { count: favCount } = useFavorites()

  const isHome = pathname === '/' || pathname === '/inicio'
  const isShop = pathname.startsWith('/shop')
  const isFavs = pathname.startsWith('/favoritos')

  const handleCart = () => {
    if (config?.modo_vista_carrito === 'pagina') {
      router.push('/cotizacion')
    } else {
      window.dispatchEvent(new Event(OPEN_CART_EVENT))
    }
  }

  return (
    <nav
      aria-label="Navegación rápida móvil"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-store-surface/95 backdrop-blur-md border-t border-store-border grid grid-cols-4 items-center px-2 shadow-lg"
    >
      <Link
        href="/"
        className={cn(
          'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
          isHome ? 'text-emerald-700 dark:text-emerald-400' : 'text-store-ink3'
        )}
      >
        <Home className="h-4 w-4" />
        <span>Inicio</span>
      </Link>

      <Link
        href="/shop"
        className={cn(
          'flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
          isShop ? 'text-emerald-700 dark:text-emerald-400' : 'text-store-ink3'
        )}
      >
        <Grid className="h-4 w-4" />
        <span>Catálogo</span>
      </Link>

      <Link
        href="/favoritos"
        className={cn(
          'relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors',
          isFavs ? 'text-rose-600 dark:text-rose-400' : 'text-store-ink3'
        )}
      >
        <div className="relative">
          <Heart className="h-4 w-4" />
          {favCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
              {favCount}
            </span>
          )}
        </div>
        <span>Favoritos</span>
      </Link>

      <button
        type="button"
        onClick={handleCart}
        className="relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-store-ink3 hover:text-store-ink transition-colors"
      >
        <div className="relative">
          <ShoppingBag className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-700 text-white text-[9px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </div>
        <span>Lista</span>
      </button>
    </nav>
  )
}
