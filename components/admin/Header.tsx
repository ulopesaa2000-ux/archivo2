// components/admin/Header.tsx
'use client'

import { MobileSidebar } from './MobileSidebar'
import { BodegaSelector } from './BodegaSelector'
import { LogoutButton } from './LogoutButton'
import { ModeToggle } from './ModeToggle'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Store, ChevronDown, User } from 'lucide-react'
import Link from 'next/link'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'

/**
 * Header del panel admin.
 *
 * Sticky en top. Contiene:
 *   - Botón hamburguesa (solo mobile, abre MobileSidebar)
 *   - BodegaSelector (persiste selección en cookie)
 *   - Dropdown de usuario (nombre + rol)
 *   - Botón "Ir a tienda"
 *   - Botón logout
 *
 * Se renderiza UNA vez en el layout y NUNCA se re-renderiza
 * al navegar entre secciones.
 */
export function Header({
  user,
  bodegas,
}: {
  user: UsuarioConRol
  bodegas: BodegaRow[]
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
      <div className="flex h-14 items-center justify-between gap-1.5 sm:gap-4 px-2 sm:px-4 lg:px-6 w-full max-w-full">
        {/* ── Izquierda: Hamburguesa + Bodega Selector ── */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          {/* ── Mobile: hamburguesa ─────────────────────────── */}
          <div className="shrink-0">
            <MobileSidebar user={user} />
          </div>

          {/* ── Bodega selector ─────────────────────────────── */}
          <div className="min-w-0 flex-1 max-w-[180px] xs:max-w-[220px] sm:max-w-[280px]">
            <BodegaSelector 
              bodegas={bodegas} 
              showAllOption={true} 
            />
          </div>
        </div>

        {/* ── Derecha: Usuario + Tema + Logout ── */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* ── Usuario Dropdown ── */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1 transition-colors hover:bg-accent shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 border flex items-center justify-center shrink-0">
                <span className="text-xs sm:text-sm font-bold text-primary">
                  {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium leading-none truncate max-w-[120px]">
                  {user.nombre_completo}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
                  {user.rol?.nombre ?? 'Sin rol'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
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
                <Link href="/perfil" className="flex items-center gap-2 cursor-pointer font-medium">
                  <User className="h-4 w-4" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center gap-2 cursor-pointer">
                  <Store className="h-4 w-4" />
                  Ir a tienda
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 hidden sm:block mx-0.5" />

          {/* ── Theme Toggle ── */}
          <div className="shrink-0">
            <ModeToggle />
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block mx-0.5" />

          {/* ── Ir a tienda button (desktop) ── */}
          <Button variant="ghost" size="sm" asChild className="hidden lg:flex text-muted-foreground hover:text-foreground">
            <Link href="/">
              <Store className="h-4 w-4 mr-2" />
              Ir a tienda
            </Link>
          </Button>

          <Separator orientation="vertical" className="h-5 hidden lg:block mx-0.5" />

          {/* ── Logout Button ── */}
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  )
}
