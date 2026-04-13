// components/store/layout/StoreHeader.tsx
'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useQuoteCart } from '@/hooks/useQuoteCart'

export function StoreHeader() {
  const { count } = useQuoteCart()

  return (
    <header className="h-[60px] bg-store-surface border-b border-store-border sticky top-0 z-50 px-8 flex items-center justify-between">
      {/* Logo */}
      <Link href="/" className="font-serif text-xl text-store-ink">
        inv-tienda
      </Link>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        <Link href="/shop?cat=mujeres" className="text-[13px] text-store-ink2 hover:text-store-ink">
          Mujeres
        </Link>
        <Link href="/shop?cat=hombres" className="text-[13px] text-store-ink2 hover:text-store-ink">
          Hombres
        </Link>
        <Link href="/shop?cat=accesorios" className="text-[13px] text-store-ink2 hover:text-store-ink">
          Accesorios
        </Link>
        <Link href="/shop?ofertas=true" className="text-[13px] text-store-ink2 hover:text-store-ink">
          Ofertas
        </Link>
      </nav>

      {/* Acciones */}
      <div className="flex items-center gap-4">
        <Link href="/login" className="text-[13px] text-store-ink3 hover:text-store-ink">
          Iniciar sesión
        </Link>
        <Link 
          href="/cotizacion" 
          className="flex items-center gap-2 text-[13px] text-store-ink bg-store-bg px-3 py-1.5 rounded-full border border-store-border transition-colors hover:bg-store-surface"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{count}</span>
        </Link>
      </div>
    </header>
  )
}
