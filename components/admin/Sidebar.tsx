// components/admin/Sidebar.tsx
import { SidebarContent } from './SidebarContent'
import type { UsuarioConRol } from '@/lib/types/tables'

/**
 * Sidebar para desktop.
 * Se renderiza UNA vez dentro del layout admin.
 * Es fijo a la izquierda, 256px de ancho.
 * En mobile se oculta (se usa MobileSidebar en su lugar).
 */
export function Sidebar({ user }: { user: UsuarioConRol }) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r bg-card">
      <SidebarContent user={user} />
    </aside>
  )
}
