// components/store/layout/StoreHeader.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Menu, X, LogOut, LayoutDashboard, User } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { signOut } from '@/modules/auth/actions'
import type { UsuarioConRol } from '@/lib/types/tables'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'

export function StoreHeader({ user }: { user: UsuarioConRol | null }) {
  const { count } = useQuoteCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const menuItems = [
    { name: 'Mujeres', href: '/shop?cat=mujeres' },
    { name: 'Hombres', href: '/shop?cat=hombres' },
    { name: 'Accesorios', href: '/shop?cat=accesorios' },
    { name: 'Ofertas', href: '/shop?ofertas=true' },
  ]

  function handleLogout() {
    startTransition(async () => {
      await signOut()
      router.push('/login')
      router.refresh()
    })
  }

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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-store-accent rounded-lg p-1 transition-colors hover:bg-store-bg">
                <div className="w-8 h-8 rounded-full bg-store-accent/10 border border-store-border flex items-center justify-center">
                  <span className="text-[12px] font-semibold text-store-accent">
                    {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[12px] md:text-[13px] font-medium text-store-ink leading-tight truncate max-w-[120px]">
                    {user.nombre_completo}
                  </p>
                  <p className="text-[10px] md:text-[11px] text-store-ink3 leading-tight truncate max-w-[120px]">
                    {user.rol?.nombre ?? 'Sin rol'}
                  </p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.nombre_completo}</p>
                      <p className="text-xs text-muted-foreground">{user.rol?.nombre ?? 'Sin rol'}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Panel admin
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="flex items-center gap-2 cursor-pointer"
                  onSelect={handleLogout}
                  disabled={isPending}
                >
                  <LogOut className="h-4 w-4" />
                  {isPending ? 'Cerrando...' : 'Cerrar sesión'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="text-[12px] md:text-[13px] text-store-ink3 hover:text-store-ink transition-colors duration-200"
            >
              Iniciar sesión
            </Link>
          )}
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

            {/* Mobile user info */}
            {user && (
              <div className="p-4 border-b border-store-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-store-accent/10 border border-store-border flex items-center justify-center">
                    <span className="text-sm font-semibold text-store-accent">
                      {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-store-ink truncate">
                      {user.nombre_completo}
                    </p>
                    <p className="text-[11px] text-store-ink3 truncate">
                      {user.rol?.nombre ?? 'Sin rol'}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                {user ? (
                  <>
                    <li className="pt-4 border-t border-store-border mt-4">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-[14px] text-store-ink2 hover:bg-store-bg hover:text-store-ink rounded-lg transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Panel admin
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => { setIsMenuOpen(false); handleLogout() }}
                        disabled={isPending}
                        className="flex items-center gap-2 w-full px-4 py-3 text-[14px] text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        {isPending ? 'Cerrando...' : 'Cerrar sesión'}
                      </button>
                    </li>
                  </>
                ) : (
                  <li className="pt-4 border-t border-store-border mt-4">
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-[14px] text-store-ink2 hover:bg-store-bg hover:text-store-ink rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Iniciar sesión
                    </Link>
                  </li>
                )}
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
