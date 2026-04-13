// components/admin/Header.tsx
import { MobileSidebar } from './MobileSidebar'
import { BodegaSelector } from './BodegaSelector'
import { LogoutButton } from './LogoutButton'
import { Separator } from '@/components/ui/separator'
import type { UsuarioConRol, BodegaRow } from '@/lib/types/tables'

/**
 * Header del panel admin.
 * 
 * Sticky en top. Contiene:
 *   - Botón hamburguesa (solo mobile, abre MobileSidebar)
 *   - BodegaSelector (persiste selección en cookie)
 *   - Info del usuario (nombre + rol)
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

        {/* ── Usuario + Logout ────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">
              {user.nombre_completo}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user.rol?.nombre ?? 'Sin rol'}
            </p>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
