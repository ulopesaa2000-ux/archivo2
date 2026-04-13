// components/store/layout/StoreHeader.tsx
'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useQuoteCart } from '@/hooks/useQuoteCart'

export function StoreHeader() {
  const { count } = useQuoteCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuItems = [
    { name: 'Mujeres', href: '/shop?cat=mujeres' },
    { name: 'Hombres', href: '/shop?cat=hombres' },
    { name: 'Accesorios', href: '/shop?cat=accesorios' },
    { name: 'Ofertas', href: '/shop?ofertas=true' },
  ]

  return (
    <>
      <header className="h-[64px] bg-store-surface border-b border-store-border sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between backdrop-blur-sm bg-opacity-95">
        {/* Logo */}
        <Link href="/" className="font-serif text-xl md:text-2xl text-store-ink hover:text-store-accent transition-colors duration-300">
          inv-tienda
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 md:gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-[12px] md:text-[13px] text-store-ink2 hover:text-store-ink relative py-2 transition-colors duration-200 after:absolute after:bottom-2 after:left-0 after:w-0 after:h-0.5 after:bg-store-accent after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-store-surface transition-colors"
          aria-label="Menú"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6 text-store-ink" />
          ) : (
            <Menu className="w-6 h-6 text-store-ink" />
          )}
        </button>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3 md:gap-4">
          <Link
            href="/login"
            className="text-[12px] md:text-[13px] text-store-ink3 hover:text-store-ink transition-colors duration-200"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/cotizacion"
            className="relative flex items-center gap-2 text-[12px] md:text-[13px] text-store-ink bg-store-bg px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-store-border transition-all duration-300 hover:bg-store-surface hover:shadow-md hover:scale-105"
          >
            <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-store-accent text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {count}
              </span>
            )}
            <span>Carrito</span>
          </Link>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed right-0 top-0 h-full w-64 bg-store-surface z-50 shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b border-store-border">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl text-store-ink">Menú</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-store-bg transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5 text-store-ink" />
                </button>
              </div>
            </div>

            <nav className="p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 text-[14px] text-store-ink2 hover:bg-store-bg hover:text-store-ink rounded-lg transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li className="pt-4 border-t border-store-border mt-4">
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-[14px] text-store-ink2 hover:bg-store-bg hover:text-store-ink rounded-lg transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cotizacion"
                    onClick={() => setIsMenuOpen(false)}
                    className="block px-4 py-3 text-[14px] text-store-ink2 hover:bg-store-bg hover:text-store-ink rounded-lg transition-colors"
                  >
                    Mi cotización
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
