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
  History,
  ImageIcon,
  Truck,
  Container,
  ChevronLeft,
  ChevronsRight,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

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
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  user: UsuarioConRol
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void // Para cerrar el drawer mobile
}) {
  const pathname = usePathname()
  const nivel = user.rol?.nivel_acceso ?? 99
  const permisos = user.permisos

  // ── Definir menú con visibilidad por permisos alineado exactamente con dal.ts ──
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
        {
          label: 'Imágenes',
          href: ADMIN_ROUTES.catalogo.imagenes,
          icon: ImageIcon,
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
        {
          label: 'Despachos',
          href: ADMIN_ROUTES.despachos.lista,
          icon: Truck,
        },
      ],
    },
    {
      label: 'Bodegas Virtuales',
      icon: Container,
      visible: nivel <= 2 || !!permisos?.puede_ver_inventario,
      items: [
        {
          label: 'Virtuales',
          href: ADMIN_ROUTES.inventarioVirtual.lista,
          icon: Container,
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
      visible: nivel <= 2, // Sincronizado con verifyModuleAccess en dal.ts
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
        {
          label: 'Auditoría Productos',
          href: ADMIN_ROUTES.configuracion.auditoriaProductos,
          icon: History,
        },
        {
          label: 'Configuración de Tablas',
          href: ADMIN_ROUTES.configuracion.tablas,
          icon: Settings,
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

  const dashboardLink = (
    <Link
      href={ADMIN_ROUTES.dashboard}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        isCollapsed ? 'justify-center p-2.5 h-10 w-10 mx-auto' : 'px-3 py-2',
        isItemActive(ADMIN_ROUTES.dashboard)
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <LayoutDashboard className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span>Dashboard</span>}
    </Link>
  )

  return (
    <TooltipProvider delay={100}>
      <div className="flex flex-col h-full select-none">
        
        {/* ── Logo Header Section ──────────────────────────────────────── */}
        {!isCollapsed ? (
          // Vista Expandida
          <div className="p-4 border-b flex items-center justify-between h-14 shrink-0">
            <Link
              href={ADMIN_ROUTES.dashboard}
              className="flex items-center gap-3 group/logo"
              onClick={onNavigate}
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-sm">IT</span>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent group-hover/logo:text-primary transition-colors">
                inv-tienda
              </span>
            </Link>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hidden lg:flex items-center justify-center rounded-md hover:bg-muted transition-colors border shadow-sm shrink-0"
                title="Contraer menú"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          // Vista Colapsada (con Hover premium)
          <div className="p-4 border-b flex items-center justify-between h-14 relative overflow-hidden select-none shrink-0">
            {/* Centered logo that slides left on hover */}
            <div className={cn(
              "flex items-center gap-3 transition-transform duration-300 w-full justify-center",
              "group-hover/sidebar:-translate-x-3"
            )}>
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-primary-foreground font-bold text-sm">IT</span>
              </div>
            </div>
            {/* Expand button that slides in from the right on hover */}
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "absolute right-2 top-3 h-8 w-8 rounded-md border bg-card text-card-foreground shadow-sm flex items-center justify-center transition-all duration-300",
                  "opacity-0 translate-x-4 scale-90 pointer-events-none",
                  "group-hover/sidebar:opacity-100 group-hover/sidebar:translate-x-0 group-hover/sidebar:scale-100 group-hover/sidebar:pointer-events-auto",
                  "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                )}
                title="Expandir menú"
              >
                <span className="font-mono text-xs font-bold leading-none flex items-center justify-center tracking-tighter select-none">
                  |➔
                </span>
              </button>
            )}
          </div>
        )}

        {/* ── Navegación ────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Dashboard (siempre visible) */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={dashboardLink} />
              <TooltipContent side="right">Dashboard</TooltipContent>
            </Tooltip>
          ) : (
            dashboardLink
          )}

          {/* Grupos con sub-items filtrados dinámicamente */}
          {groups
            .filter((g) => g.visible)
            .map((group) => (
              <NavGroupCollapsible
                key={group.label}
                group={group}
                isActive={isGroupActive(group)}
                isItemActive={isItemActive}
                onNavigate={onNavigate}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
              />
            ))}
        </nav>

        {/* ── Footer del sidebar ────────────────────────────── */}
        <div className={cn("border-t p-4 shrink-0", isCollapsed && "flex justify-center")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center cursor-pointer border shadow-sm">
                  <span className="text-xs font-semibold">
                    {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
              } />
              <TooltipContent side="right">
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">{user.nombre_completo}</p>
                  <p className="text-muted-foreground">{user.rol?.nombre ?? 'Sin rol'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border shadow-sm shrink-0">
                <span className="text-xs font-semibold">
                  {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">
                  {user.nombre_completo}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.rol?.nombre ?? 'Sin rol'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

/**
 * Grupo colapsable del sidebar.
 * Se abre automáticamente si alguno de sus items está activo.
 * Si el sidebar está colapsado, muestra tooltip e interactúa de forma óptima.
 */
function NavGroupCollapsible({
  group,
  isActive,
  isItemActive,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
}: {
  group: NavGroup
  isActive: boolean
  isItemActive: (href: string) => boolean
  onNavigate?: () => void
  isCollapsed: boolean
  onToggleCollapse?: () => void
}) {
  const [isOpen, setIsOpen] = useState(isActive)

  // Sincronizar estado abierto cuando cambia la ruta activa
  useEffect(() => {
    if (isActive && !isCollapsed) {
      setIsOpen(true)
    }
  }, [isActive, isCollapsed])

  const handleGroupClick = () => {
    if (isCollapsed && onToggleCollapse) {
      // Expandir primero el sidebar de forma intuitiva
      onToggleCollapse()
      setIsOpen(true)
    } else {
      setIsOpen(!isOpen)
    }
  }

  // Si el grupo tiene un solo item, no colapsar en vista expandida
  if (group.items.length === 1) {
    const item = group.items[0]
    const singleLink = (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center transition-colors rounded-lg text-sm font-medium w-full',
          isCollapsed ? 'justify-center p-2.5 h-10 w-10 mx-auto' : 'gap-3 px-3 py-2',
          isItemActive(item.href)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <group.icon className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span>{group.label}</span>}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger render={singleLink} />
          <TooltipContent side="right">{group.label}</TooltipContent>
        </Tooltip>
      )
    }

    return singleLink
  }

  const groupTrigger = (
    <button
      onClick={handleGroupClick}
      className={cn(
        'w-full flex items-center transition-colors rounded-lg text-sm font-medium',
        isCollapsed ? 'justify-center p-2.5 h-10 w-10 mx-auto' : 'gap-3 px-3 py-2',
        isActive
          ? 'text-foreground font-semibold bg-accent/30'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <group.icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="flex-1 text-left">{group.label}</span>}
      {!isCollapsed && (
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200 shrink-0 text-muted-foreground',
            isOpen && 'rotate-180 text-foreground'
          )}
        />
      )}
    </button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={groupTrigger} />
        <TooltipContent side="right">{group.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      {groupTrigger}

      {/* Sub-items (solo visible cuando está expandido y abierto) */}
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
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
