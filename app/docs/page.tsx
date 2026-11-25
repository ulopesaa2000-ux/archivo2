// c:\Users\uriel\Downloads\enero 26\archivo2\app\docs\page.tsx
import Link from 'next/link'
import type { Route } from 'next'
import {
  ArrowRight,
  BookOpen,
  Compass,
  Package,
  ShoppingBag,
  Warehouse,
} from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { isSuperAdmin } from '@/lib/auth/permissions'
import { fetchDocsRegistry } from '@/modules/docs/storage'
import { DOC_ROLE_META, type DocRole } from '@/lib/docs/types'
import { Badge } from '@/components/ui/badge'

const ROLE_CARDS: Array<{
  role: DocRole
  icon: React.ComponentType<{ className?: string }>
  accentClass: string
}> = [
  {
    role: 'general',
    icon: Compass,
    accentClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
  {
    role: 'productos',
    icon: Package,
    accentClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  {
    role: 'inventario',
    icon: Warehouse,
    accentClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  {
    role: 'ecommerce',
    icon: ShoppingBag,
    accentClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  },
]

export default async function DocsHomePage() {
  const [{ user }, { registry, source }] = await Promise.all([
    verifySession(),
    fetchDocsRegistry(),
  ])
  const canEdit = isSuperAdmin(user)

  const visibleItems = registry.items
    .filter((item) => item.publicado || canEdit)
    .sort((a, b) => a.orden - b.orden)

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary" className="gap-1">
            <BookOpen className="h-3 w-3" />
            Manual Operativo Interno
          </Badge>
          <Badge variant="outline">
            {source === 'storage'
              ? 'Sincronizado con bucket documentation'
              : 'Catálogo base inicial (bucket documentation listo)'}
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Centro de Guías por Rol y Procedimientos
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
          Consulta paso a paso cómo operar el ERP y la tienda online: desde crear una{' '}
          <span className="font-medium text-foreground">Orden Rápida</span> con Excel hasta
          digitalizar una <span className="font-medium text-foreground">Nota de Inventario</span>,
          surtir contenedores o publicar productos web.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {ROLE_CARDS.map(({ role, icon: Icon, accentClass }) => {
          const meta = DOC_ROLE_META[role]
          const roleGuides = visibleItems.filter((item) => item.rol === role)

          return (
            <div
              key={role}
              className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold leading-tight">{meta.label}</h2>
                    <p className="text-xs text-muted-foreground">
                      {roleGuides.length} {roleGuides.length === 1 ? 'guía' : 'guías'}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground">{meta.description}</p>

                <ul className="space-y-1.5 pt-1">
                  {roleGuides.map((guide) => (
                    <li key={guide.slug}>
                      <Link
                        href={`/docs/${guide.slug}` as Route}
                        className="group flex items-center justify-between gap-2 rounded-lg border border-transparent bg-muted/40 px-3 py-2 text-xs sm:text-sm font-medium transition-colors hover:border-border hover:bg-muted"
                      >
                        <span className="truncate">{guide.titulo}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
