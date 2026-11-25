// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\_components\DocsShellClient.tsx
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Warehouse,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/admin/ModeToggle'
import {
  DOC_ROLE_META,
  type DocRegistry,
  type DocRole,
} from '@/lib/docs/types'
import { DocsEditorProvider } from './DocsEditorContext'
import { DocsFloatingToolbar } from './DocsFloatingToolbar'
import { NewGuideModal } from './NewGuideModal'

const ROLE_ICONS: Record<DocRole, React.ComponentType<{ className?: string }>> = {
  general: Compass,
  productos: Package,
  inventario: Warehouse,
  ecommerce: ShoppingBag,
}

const ROLE_ORDER: DocRole[] = ['general', 'productos', 'inventario', 'ecommerce']

interface DocsShellClientProps {
  user: {
    nombre: string
    rolNombre: string
  }
  canEdit: boolean
  registry: DocRegistry
  storageSource: 'storage' | 'fallback'
  children: React.ReactNode
}

export function DocsShellClient({
  user,
  canEdit,
  registry,
  storageSource,
  children,
}: DocsShellClientProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const groupedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const visibleItems = registry.items
      .filter((item) => item.publicado || canEdit)
      .filter((item) => {
        if (!query) return true
        return (
          item.titulo.toLowerCase().includes(query) ||
          item.resumen.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query) ||
          item.rutasAdmin.some((r) => r.toLowerCase().includes(query))
        )
      })
      .sort((a, b) => a.orden - b.orden)

    return ROLE_ORDER.map((role) => ({
      role,
      meta: DOC_ROLE_META[role],
      items: visibleItems.filter((item) => item.rol === role),
    })).filter((group) => group.items.length > 0)
  }, [registry.items, searchQuery, canEdit])

  const sidebarNav = (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar guía (nota, orden rápida...)"
            className="h-8 pl-8 text-xs"
            aria-label="Buscar guías de documentación"
          />
        </div>
        <Link
          href={'/docs' as Route}
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
            pathname === '/docs'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <BookOpen className="h-3.5 w-3.5 shrink-0" />
          <span>Inicio del Centro de Guías</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label="Navegación de documentación">
        {groupedItems.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">
            Sin coincidencias para &ldquo;{searchQuery}&rdquo;.
          </p>
        ) : (
          groupedItems.map((group) => {
            const RoleIcon = ROLE_ICONS[group.role]
            return (
              <div key={group.role} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <RoleIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{group.meta.label}</span>
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = `/docs/${item.slug}` as Route
                    const isActive = pathname === `/docs/${item.slug}`
                    return (
                      <Link
                        key={item.slug}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs leading-snug transition-colors',
                          isActive
                            ? 'bg-primary/10 font-semibold text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <span>{item.titulo}</span>
                        {!item.publicado && canEdit && (
                          <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px]">
                            Borrador
                          </Badge>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </nav>

      <div className="border-t p-3 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
        <span className="truncate">
          {user.nombre} · {user.rolNombre}
        </span>
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {storageSource === 'storage' ? 'Nube' : 'Base'}
        </Badge>
      </div>
    </div>
  )

  return (
    <DocsEditorProvider canEdit={canEdit}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        {/* Header independiente del panel /docs */}
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Abrir índice de guías"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              <Link href={'/docs' as Route} className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-none">
                    Centro de Guías · inv-tienda
                  </p>
                  <p className="hidden sm:block truncate text-[11px] text-muted-foreground mt-0.5">
                    Manuales operativos por rol y procedimientos
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canEdit && (
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex items-center gap-1 border-primary/40 bg-primary/5 text-primary text-[11px]"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Super Admin
                </Badge>
              )}

              <ModeToggle />

              <Button variant="outline" size="sm" asChild className="h-8 gap-1.5 text-xs">
                <Link href="/dashboard">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ir al Admin</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Cuerpo */}
        <div className="mx-auto flex w-full max-w-[1440px] flex-1">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:block w-72 shrink-0 border-r bg-card/40">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)]">{sidebarNav}</div>
          </aside>

          {/* Drawer Mobile */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="relative z-10 w-80 max-w-[85vw] bg-card border-r h-full shadow-xl">
                <div className="flex items-center justify-between px-3 h-14 border-b">
                  <span className="text-sm font-bold">Índice de Guías</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="h-[calc(100%-3.5rem)]">{sidebarNav}</div>
              </aside>
            </div>
          )}

          {/* Contenido */}
          <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 lg:px-10 lg:py-8 pb-24">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>

        <DocsFloatingToolbar storageSource={storageSource} />
        {canEdit && <NewGuideModal />}
      </div>
    </DocsEditorProvider>
  )
}
