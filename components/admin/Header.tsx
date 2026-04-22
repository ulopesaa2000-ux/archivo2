// components/admin/Header.tsx
'use client'

import { MobileSidebar } from './MobileSidebar'
import { BodegaSelector } from './BodegaSelector'
import { LogoutButton } from './LogoutButton'
import { ModeToggle } from './ModeToggle'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Store, ChevronDown } from 'lucide-react'
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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        {/* ── Mobile: hamburguesa ─────────────────────────── */}
        <MobileSidebar user={user} />

        {/* ── Bodega selector ─────────────────────────────── */}
        <BodegaSelector bodegas={bodegas} />

        {/* ── Spacer ──────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Usuario Dropdown ────────────────────────────── */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1 transition-colors hover:bg-accent">
              <div className="w-8 h-8 rounded-full bg-primary/10 border flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">
                  {user.nombre_completo}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user.rol?.nombre ?? 'Sin rol'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
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
                <Link href="/" className="flex items-center gap-2 cursor-pointer">
                  <Store className="h-4 w-4" />
                  Ir a tienda
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* ── Theme Toggle ───────────────────────────────── */}
          <ModeToggle />

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* ── Ir a tienda button ─────────────────────────── */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-muted-foreground hover:text-foreground">
            <Link href="/">
              <Store className="h-4 w-4 mr-2" />
              Ir a tienda
            </Link>
          </Button>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
