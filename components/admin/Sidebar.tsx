// components/admin/Sidebar.tsx
import { SidebarContent } from './SidebarContent'
import type { UsuarioConRol } from '@/lib/types/tables'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: UsuarioConRol
  isCollapsed?: boolean
  onToggle?: () => void
}

/**
 * Sidebar para desktop.
 * Se renderiza UNA vez dentro del layout admin.
 * Es fijo a la izquierda, cambia su ancho de 256px (w-64) a 64px (w-16) fluidamente.
 * En mobile se oculta (se usa MobileSidebar en su lugar).
 */
export function Sidebar({ user, isCollapsed = false, onToggle }: SidebarProps) {
  return (
    <aside 
      className={cn(
        "hidden lg:flex lg:flex-col lg:border-r bg-card transition-all duration-300 ease-in-out select-none group/sidebar relative",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}
    >
      <SidebarContent 
        user={user} 
        isCollapsed={isCollapsed} 
        onToggleCollapse={onToggle} 
      />
    </aside>
  )
}

