// C:\Users\uriel\Downloads\enero 26\archivo2\components\admin\SidebarContent.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  Container,
  FileText,
  Globe,
  History,
  ImageIcon,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Settings,
  Shield,
  Ship,
  ShoppingBag,
  ShoppingCart,
  SwatchBook,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { UsuarioConRol } from '@/lib/types/tables'
import { can, type PermissionModule } from '@/lib/auth/permissions'
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
  modulo: PermissionModule
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'Catalogo',
    icon: Package,
    items: [
      { label: 'Productos', href: ADMIN_ROUTES.catalogo.lista, icon: Package, modulo: 'catalogo_productos' },
      { label: 'Familias', href: ADMIN_ROUTES.catalogo.familias, icon: SwatchBook, modulo: 'catalogo_productos' },
      { label: 'Catalogos Soporte', href: ADMIN_ROUTES.catalogo.catalogos, icon: SwatchBook, modulo: 'catalogo_catalogos' },
      { label: 'Imagenes', href: ADMIN_ROUTES.catalogo.imagenes, icon: ImageIcon, modulo: 'catalogo_imagenes' },
    ],
  },
  {
    label: 'Inventario',
    icon: Warehouse,
    items: [
      { label: 'Notas', href: ADMIN_ROUTES.inventario.notas, icon: FileText, modulo: 'inventario_notas' },
      { label: 'Stock', href: ADMIN_ROUTES.inventario.stock, icon: Warehouse, modulo: 'inventario_stock' },
      { label: 'Bodegas', href: ADMIN_ROUTES.inventario.bodegas, icon: Building2, modulo: 'inventario_bodegas' },
    ],
  },
  {
    label: 'Ordenes B2B',
    icon: ShoppingCart,
    items: [
      { label: 'Ordenes', href: ADMIN_ROUTES.ordenesB2B.lista, icon: ShoppingCart, modulo: 'b2b_ordenes' },
      { label: 'Cajas', href: ADMIN_ROUTES.ordenesB2B.cajas, icon: LayoutGrid, modulo: 'b2b_cajas' },
    ],
  },
  {
    label: 'Contenedores',
    icon: Ship,
    items: [
      { label: 'Contenedores', href: ADMIN_ROUTES.contenedores.lista, icon: Ship, modulo: 'b2b_contenedores' },
      { label: 'Despachos', href: ADMIN_ROUTES.despachos.lista, icon: Truck, modulo: 'despachos' },
    ],
  },
  {
    label: 'Bodegas Virtuales',
    icon: Container,
    items: [
      { label: 'Virtuales', href: ADMIN_ROUTES.inventarioVirtual.lista, icon: Container, modulo: 'inventario_virtual' },
    ],
  },
  {
    label: 'Ecommerce',
    icon: Globe,
    items: [
      { label: 'Catalogo Web', href: ADMIN_ROUTES.ecommerce.productosWeb, icon: Globe, modulo: 'ecommerce_catalogo' },
      { label: 'Ordenes Venta', href: ADMIN_ROUTES.ecommerce.ordenesVenta, icon: ShoppingBag, modulo: 'ecommerce_ordenes' },
      { label: 'Config Ecommerce', href: '/ecommerce/config', icon: Settings, modulo: 'ecommerce_config' },
    ],
  },
  {
    label: 'Configuracion',
    icon: Settings,
    items: [
      { label: 'Usuarios', href: ADMIN_ROUTES.configuracion.usuarios, icon: Users, modulo: 'config_usuarios' },
      { label: 'Personas Asociadas', href: '/configuracion/personas', icon: Users, modulo: 'config_usuarios' },
      { label: 'Roles', href: ADMIN_ROUTES.configuracion.roles, icon: Shield, modulo: 'config_roles' },
      { label: 'Auditoria Productos', href: ADMIN_ROUTES.configuracion.auditoriaProductos, icon: History, modulo: 'config_auditoria_productos' },
      { label: 'Configuracion de Tablas', href: ADMIN_ROUTES.configuracion.tablas, icon: Settings, modulo: 'config_tablas' },
    ],
  },
]

export function SidebarContent({
  user,
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  user: UsuarioConRol
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const groups = GROUPS
    .map((group) => {
      const nivel = user?.rol?.nivel_acceso ?? 99
      if (nivel >= 4) {
        if (['Catalogo', 'Inventario', 'Bodegas Virtuales', 'Ecommerce', 'Configuracion'].includes(group.label)) {
          return { ...group, items: [] }
        }
      }
      return {
        ...group,
        items: group.items.filter((item) => can(user, item.modulo, 'puede_leer')),
      }
    })
    .filter((group) => group.items.length > 0)

  function isItemActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  function isGroupActive(group: NavGroup): boolean {
    return group.items.some((item) => isItemActive(item.href))
  }

  const dashboardLink = (
    <Link
      href={ADMIN_ROUTES.dashboard}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
        isCollapsed ? 'mx-auto h-10 w-10 justify-center p-2.5' : 'px-3 py-2',
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
      <div className="flex h-full select-none flex-col">
        {!isCollapsed ? (
          <div className="flex h-14 shrink-0 items-center justify-between border-b p-4">
            <Link href={ADMIN_ROUTES.dashboard} className="flex items-center gap-3" onClick={onNavigate}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">IT</span>
              </div>
              <span className="text-lg font-bold">inv-tienda</span>
            </Link>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden h-8 w-8 items-center justify-center rounded-md border text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:flex"
                title="Contraer menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex h-14 shrink-0 items-center justify-center overflow-hidden border-b p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
              <span className="text-sm font-bold text-primary-foreground">IT</span>
            </div>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="absolute right-2 top-3 flex h-8 w-8 translate-x-4 scale-90 items-center justify-center rounded-md border bg-card opacity-0 shadow-sm transition-all duration-300 hover:bg-primary hover:text-primary-foreground group-hover/sidebar:translate-x-0 group-hover/sidebar:scale-100 group-hover/sidebar:opacity-100"
                title="Expandir menu"
              >
                <span className="font-mono text-xs font-bold">|&gt;</span>
              </button>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={dashboardLink} />
              <TooltipContent side="right">Dashboard</TooltipContent>
            </Tooltip>
          ) : (
            dashboardLink
          )}

          {groups.map((group) => (
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

        <div className={cn('shrink-0 border-t p-4', isCollapsed && 'flex justify-center')}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger render={
                <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-muted shadow-sm">
                  <span className="text-xs font-semibold">
                    {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                  </span>
                </div>
              } />
              <TooltipContent side="right">
                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-foreground">{user.nombre_completo}</p>
                  <p className="text-muted-foreground">{user.rol?.nombre ?? 'Sin rol'}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted shadow-sm">
                <span className="text-xs font-semibold">
                  {user.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{user.nombre_completo}</p>
                <p className="truncate text-xs text-muted-foreground">{user.rol?.nombre ?? 'Sin rol'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

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
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const isOpen = !isCollapsed && (manualOpen ?? isActive)

  const handleGroupClick = () => {
    if (isCollapsed && onToggleCollapse) {
      onToggleCollapse()
      setManualOpen(true)
      return
    }

    setManualOpen((current) => !(current ?? isOpen))
  }

  if (group.items.length === 1) {
    const item = group.items[0]
    const singleLink = (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex w-full items-center rounded-lg text-sm font-medium transition-colors',
          isCollapsed ? 'mx-auto h-10 w-10 justify-center p-2.5' : 'gap-3 px-3 py-2',
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
        'flex w-full items-center rounded-lg text-sm font-medium transition-colors',
        isCollapsed ? 'mx-auto h-10 w-10 justify-center p-2.5' : 'gap-3 px-3 py-2',
        isActive
          ? 'bg-accent/30 font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <group.icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="flex-1 text-left">{group.label}</span>}
      {!isCollapsed && (
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', isOpen && 'rotate-180')} />
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
      {isOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-3">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors',
                isItemActive(item.href)
                  ? 'bg-primary/10 font-medium text-primary'
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
