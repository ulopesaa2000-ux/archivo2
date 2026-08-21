// components/store/layout/StoreHeader.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ShoppingCart, Menu, X, LogOut, LayoutDashboard, 
  ChevronDown, ChevronUp, LogIn, Sparkles, Phone, Tag, User
} from 'lucide-react'
import { useState, useTransition } from 'react'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { signOut } from '@/modules/auth/actions'
import { CartDrawer, OPEN_CART_EVENT } from '@/components/store/cotizacion/CartDrawer'
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
import { Badge } from '@/components/ui/badge'
import { StoreThemeToggle } from './StoreThemeToggle'

export function StoreHeader({ user }: { user: UsuarioConRol | null }) {
  const { count } = useQuoteCart()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDamaOpen, setIsDamaOpen] = useState(true)
  const [isCaballeroOpen, setIsCaballeroOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const damaSubcategories = [
    { name: 'Todas las prendas de Dama', href: '/shop?genero=dama' },
    { name: 'Chamarras', href: '/shop?genero=dama&tipo=chamarras' },
    { name: 'Rompevientos', href: '/shop?genero=dama&tipo=rompevientos' },
    { name: 'Chalecos', href: '/shop?genero=dama&tipo=chalecos' },
    { name: 'Conjuntos Deportivos', href: '/shop?genero=dama&tipo=sets-deportivos' },
    { name: 'Suéter', href: '/shop?genero=dama&tipo=sueter' },
    { name: 'Sudaderas', href: '/shop?genero=dama&tipo=sudaderas' },
    { name: 'Abrigos', href: '/shop?genero=dama&tipo=abrigos' },
  ]

  const caballeroSubcategories = [
    { name: 'Todas las prendas de Caballero', href: '/shop?genero=caballero' },
    { name: 'Rompevientos', href: '/shop?genero=caballero&tipo=rompevientos' },
    { name: 'Chamarras', href: '/shop?genero=caballero&tipo=chamarras' },
    { name: 'Chalecos', href: '/shop?genero=caballero&tipo=chalecos' },
    { name: 'Sudaderas', href: '/shop?genero=caballero&tipo=sudaderas' },
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
      <header className="h-[60px] md:h-[64px] bg-store-surface border-b border-store-border sticky top-0 z-50 px-3 md:px-8 flex items-center justify-between backdrop-blur-md bg-opacity-95">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 font-serif text-lg md:text-2xl text-store-ink hover:text-store-accent transition-colors duration-300 font-bold tracking-tight truncate max-w-[240px] xs:max-w-none"
        >
          <div className="w-8 h-8 md:w-9 md:h-9 shrink-0 rounded-lg overflow-hidden bg-white p-0.5 shadow-xs border border-store-border">
            <Image
              src="/icons/icon-192.png"
              alt="Idol Navy"
              width={36}
              height={36}
              className="w-full h-full object-contain rounded-md"
              priority
            />
          </div>
          <span>IDOL NAVY</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-6">
          {/* DAMA Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-[13px] font-semibold text-store-ink2 hover:text-store-ink outline-none py-2 px-1 transition-colors">
              <span>DAMA</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">Categoría Dama</div>
              <DropdownMenuSeparator />
              {damaSubcategories.map((sub) => (
                <DropdownMenuItem key={sub.name} asChild>
                  <Link href={sub.href} className="cursor-pointer text-xs font-medium py-2">
                    {sub.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* CABALLERO Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-[13px] font-semibold text-store-ink2 hover:text-store-ink outline-none py-2 px-1 transition-colors">
              <span>CABALLERO</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">Categoría Caballero</div>
              <DropdownMenuSeparator />
              {caballeroSubcategories.map((sub) => (
                <DropdownMenuItem key={sub.name} asChild>
                  <Link href={sub.href} className="cursor-pointer text-xs font-medium py-2">
                    {sub.name}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PROMOCIONES Link */}
          <Link
            href="/shop?oferta=true"
            className="text-[13px] font-semibold text-store-ink2 hover:text-store-ink py-2 px-1 transition-colors flex items-center gap-1"
          >
            <Tag className="h-3.5 w-3.5 text-amber-500" />
            <span>PROMOCIONES</span>
          </Link>

          {/* CONTACTOS Link */}
          <Link
            href="/contactos"
            className="text-[13px] font-semibold text-store-ink2 hover:text-store-ink py-2 px-1 transition-colors"
          >
            CONTACTOS
          </Link>
        </nav>

        {/* Mobile Action Trilogy (Carrito, Usuario/Login, Menú Catálogo) */}
        <div className="flex md:hidden items-center gap-1.5">
          {/* 1. Carrito Móvil Directo */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_CART_EVENT))}
            className="relative p-2 rounded-xl text-zinc-900 dark:text-white hover:bg-store-bg active:scale-95 transition-all"
            aria-label="Ver carrito de cotización"
            title="Ver cotización"
          >
            <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
            {count > 0 && (
              <span className="absolute top-1 right-1 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {count}
              </span>
            )}
          </button>

          {/* 2. Usuario / Login Móvil */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-store-accent/20 dark:bg-store-accent/30 border border-store-accent/50 flex items-center justify-center text-[12px] font-black text-zinc-900 dark:text-white active:scale-95 transition-all outline-none shadow-xs"
                  aria-label="Menú de usuario"
                >
                  {user.nombre_completo?.charAt(0)?.toUpperCase() ?? 'U'}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal px-2 py-1.5">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-xs font-bold text-foreground truncate">{user.nombre_completo}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.rol?.nombre ?? 'Sin rol'}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/ecommerce/ordenes-venta" className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold py-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <span>Mis cotizaciones / órdenes</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold py-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Mi perfil</span>
                  </Link>
                </DropdownMenuItem>
                {(!user.rol_id || user.rol_id !== 19) && !(user.rol?.nombre || '').toLowerCase().includes('cliente') && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold py-2">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      <span>Panel admin</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold py-2 text-red-600 focus:bg-red-500/10 focus:text-red-600"
                  onSelect={handleLogout}
                  disabled={isPending}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isPending ? 'Cerrando...' : 'Cerrar sesión'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className="p-2 rounded-xl text-zinc-900 dark:text-white hover:bg-store-bg active:scale-95 transition-all flex items-center justify-center"
              aria-label="Iniciar sesión"
              title="Iniciar sesión"
            >
              <LogIn className="w-5 h-5 text-zinc-900 dark:text-white" />
            </Link>
          )}

          {/* 3. Menú Catálogo Hamburguesa (3 líneas) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-xl hover:bg-store-bg active:scale-95 transition-all text-zinc-900 dark:text-white"
            aria-label="Menú Catálogo"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5 text-zinc-900 dark:text-white" />
            ) : (
              <Menu className="w-5 h-5 text-zinc-900 dark:text-white" />
            )}
          </button>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3 md:gap-4">
          {/* Selector de Tema Encapsulado */}
          <StoreThemeToggle variant="capsule" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-store-accent rounded-xl p-1 transition-colors hover:bg-store-bg">
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
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
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
                  <Link href="/ecommerce/ordenes-venta" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Tag className="h-4 w-4" />
                    Mis cotizaciones / órdenes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/perfil" className="flex items-center gap-2 cursor-pointer font-medium">
                    <User className="h-4 w-4" />
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                {(!user.rol_id || user.rol_id !== 19) && !(user.rol?.nombre || '').toLowerCase().includes('cliente') && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      Panel admin
                    </Link>
                  </DropdownMenuItem>
                )}
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

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_CART_EVENT))}
            className="relative flex items-center gap-2 text-[12px] md:text-[13px] text-store-ink dark:text-gray-100 bg-store-bg dark:bg-zinc-900 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-store-border dark:border-zinc-800 transition-all duration-300 hover:bg-store-surface hover:shadow-md hover:scale-105"
            title="Ver carrito / Cotización"
          >
            <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-emerald-700 dark:text-emerald-400" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {count}
              </span>
            )}
            <span>Carrito</span>
          </button>
        </div>
      </header>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Mobile Catálogo Menu Drawer */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="fixed right-0 top-0 h-full w-[290px] max-w-[85vw] bg-store-surface z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-store-border">
            {/* Drawer Header */}
            <div className="p-4 border-b border-store-border flex items-center justify-between">
              <span className="font-serif text-lg font-bold text-store-ink">Explorar Catálogo</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-xl hover:bg-store-bg text-store-ink transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categorías con Acordeones Desplegables */}
            <nav className="p-4 overflow-y-auto flex-1 space-y-3 text-sm">
              {/* 1. Selector de Tema en Móvil (Arriba) */}
              <div className="pb-3 border-b border-store-border/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Modo de Pantalla
                  </span>
                </div>
                <StoreThemeToggle variant="segmented" size="sm" className="w-full justify-between" />
              </div>

              {/* 2. Dama Accordion (Abierto por default) */}
              <div className="rounded-2xl border border-store-border/60 overflow-hidden bg-store-bg/40">
                <button
                  type="button"
                  onClick={() => setIsDamaOpen(!isDamaOpen)}
                  className="w-full flex items-center justify-between p-3 font-bold text-xs uppercase tracking-wider text-store-ink hover:bg-store-bg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>👗</span>
                    <span>DAMA</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {damaSubcategories.length}
                    </Badge>
                  </div>
                  {isDamaOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {isDamaOpen && (
                  <ul className="p-2 pt-0 space-y-0.5 border-t border-store-border/40 animate-in fade-in-50 duration-150">
                    {damaSubcategories.map((sub) => (
                      <li key={sub.name}>
                        <Link
                          href={sub.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-3 py-2 text-xs font-medium text-store-ink2 hover:bg-store-surface hover:text-store-ink rounded-xl transition-colors"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 3. Caballero Accordion */}
              <div className="rounded-2xl border border-store-border/60 overflow-hidden bg-store-bg/40">
                <button
                  type="button"
                  onClick={() => setIsCaballeroOpen(!isCaballeroOpen)}
                  className="w-full flex items-center justify-between p-3 font-bold text-xs uppercase tracking-wider text-store-ink hover:bg-store-bg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>👔</span>
                    <span>CABALLERO</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {caballeroSubcategories.length}
                    </Badge>
                  </div>
                  {isCaballeroOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {isCaballeroOpen && (
                  <ul className="p-2 pt-0 space-y-0.5 border-t border-store-border/40 animate-in fade-in-50 duration-150">
                    {caballeroSubcategories.map((sub) => (
                      <li key={sub.name}>
                        <Link
                          href={sub.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-3 py-2 text-xs font-medium text-store-ink2 hover:bg-store-surface hover:text-store-ink rounded-xl transition-colors"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 4. Enlaces Rápidos Directos (Promociones & Contactos) */}
              <div className="pt-1 space-y-1.5">
                <Link
                  href="/shop?oferta=true"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-2xl font-bold text-xs text-store-ink hover:bg-store-bg border border-amber-500/20 bg-amber-500/5 transition-all"
                >
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Tag className="w-4 h-4" />
                    <span>PROMOCIONES</span>
                  </div>
                  <Badge className="bg-amber-500 text-black font-black text-[9px] px-1.5 py-0">
                    OFERTA
                  </Badge>
                </Link>

                <Link
                  href="/contactos"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-2xl font-bold text-xs text-store-ink hover:bg-store-bg border border-store-border/60 bg-store-bg/40 transition-all"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <span>CONTACTOS</span>
                </Link>
              </div>
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-store-border text-center">
              <p className="text-[11px] text-muted-foreground">
                Catálogo IDOL NAVY &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
