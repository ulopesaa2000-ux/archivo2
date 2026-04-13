// components/admin/SidebarContent.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { UsuarioConRol } from '@/lib/types/tables'
import {
  LayoutDashboard,
  Package,
  SwatchBook,
  FileText,
  Warehouse,
  Building2,
  ShoppingCart,
  Ship,
  Globe,
  ShoppingBag,
  Settings,
  Users,
  Shield,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react'
import { useState } from 'react'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  visible: boolean
}

export function SidebarContent({
  user,
  onNavigate,
}: {
  user: UsuarioConRol
  onNavigate?: () => void // Para cerrar el drawer mobile
}) {
  const pathname = usePathname()
  const nivel = user.rol?.nivel_acceso ?? 99
  const permisos = user.permisos

  // ── Definir menú con visibilidad por permisos ─────────────
  const groups: NavGroup[] = [
    {
      label: 'Catálogo',
      icon: Package,
      visible: true, // Todos pueden ver catálogo (lectura)
      items: [
        {
          label: 'Productos',
          href: ADMIN_ROUTES.catalogo.lista,
          icon: Package,
        },
        {
          label: 'Catálogos Soporte',
          href: ADMIN_ROUTES.catalogo.catalogos,
          icon: SwatchBook,
        },
      ],
    },
    {
      label: 'Inventario',
      icon: Warehouse,
      visible: nivel <= 2 || !!permisos?.puede_ver_inventario,
      items: [
        {
          label: 'Notas',
          href: ADMIN_ROUTES.inventario.notas,
          icon: FileText,
        },
        {
          label: 'Stock',
          href: ADMIN_ROUTES.inventario.stock,
          icon: Warehouse,
        },
        {
          label: 'Bodegas',
          href: ADMIN_ROUTES.inventario.bodegas,
          icon: Building2,
        },
      ],
    },
    {
      label: 'Órdenes B2B',
      icon: ShoppingCart,
      visible: nivel <= 2 || !!permisos?.puede_gestionar_compras_b2b,
      items: [
        {
          label: 'Órdenes',
          href: ADMIN_ROUTES.ordenesB2B.lista,
          icon: ShoppingCart,
        },
        {
          label: 'Cajas',
          href: ADMIN_ROUTES.ordenesB2B.cajas,
          icon: LayoutGrid,
        },
      ],
    },
    {
      label: 'Contenedores',
      icon: Ship,
      visible: nivel <= 2 || !!permisos?.puede_gestionar_contenedores,
      items: [
        {
          label: 'Contenedores',
          href: ADMIN_ROUTES.contenedores.lista,
          icon: Ship,
        },
      ],
    },
    {
      label: 'Ecommerce',
      icon: Globe,
      visible: nivel <= 2 || !!permisos?.puede_gestionar_ecommerce,
      items: [
        {
          label: 'Catálogo Web',
          href: ADMIN_ROUTES.ecommerce.productosWeb,
          icon: Globe,
        },
        {
          label: 'Órdenes Venta',
          href: ADMIN_ROUTES.ecommerce.ordenesVenta,
          icon: ShoppingBag,
        },
      ],
    },
    {
      label: 'Configuración',
      icon: Settings,
      visible: nivel <= 1 || !!permisos?.es_super_admin,
      items: [
        {
          label: 'Usuarios',
          href: ADMIN_ROUTES.configuracion.usuarios,
          icon: Users,
        },
        {
          label: 'Roles',
          href: ADMIN_ROUTES.configuracion.roles,
          icon: Shield,
        },
      ],
    },
  ]

  // ── Detectar qué grupo está abierto según la ruta ─────────
  function isGroupActive(group: NavGroup): boolean {
    return group.items.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
  }

  function isItemActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="p-4 border-b">
        <Link
          href={ADMIN_ROUTES.dashboard}
          className="flex items-center gap-3"
          onClick={onNavigate}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IT</span>
          </div>
          <span className="font-bold text-lg">inv-tienda</span>
        </Link>
      </div>

      {/* ── Navegación ────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Dashboard (siempre visible, sin grupo) */}
        <Link
          href={ADMIN_ROUTES.dashboard}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isItemActive(ADMIN_ROUTES.dashboard)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Dashboard
        </Link>

        {/* Grupos con sub-items */}
        {groups.filter((g) => g.visible).map((group) => (
          <NavGroupCollapsible
            key={group.label}
            group={group}
            isActive={isGroupActive(group)}
            isItemActive={isItemActive}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* ── Footer del sidebar ────────────────────────────── */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">
              {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.nombre_completo}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.rol?.nombre ?? 'Sin rol'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Grupo colapsable del sidebar.
 * Se abre automáticamente si alguno de sus items está activo.
 */
function NavGroupCollapsible({
  group,
  isActive,
  isItemActive,
  onNavigate,
}: {
  group: NavGroup
  isActive: boolean
  isItemActive: (href: string) => boolean
  onNavigate?: () => void
}) {
  const [isOpen, setIsOpen] = useState(isActive)

  // Si el grupo tiene un solo item, no colapsar
  if (group.items.length === 1) {
    const item = group.items[0]
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isItemActive(item.href)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        {group.label}
      </Link>
    )
  }

  return (
    <div>
      {/* Botón del grupo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Sub-items */}
      {isOpen && (
        <div className="ml-4 pl-3 border-l space-y-1 mt-1">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors',
                isItemActive(item.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
