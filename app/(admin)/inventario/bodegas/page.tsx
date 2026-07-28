// app/(admin)/inventario/bodegas/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchBodegas, fetchUsuariosBodega, fetchUsuariosBodegasMap } from '@/modules/inventario/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { BodegaForm } from './BodegaForm'
import { BodegaUsuarios } from './BodegaUsuarios'
import { AsignarZonaModal } from './AsignarZonaModal'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Check, X, Loader2, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Bodegas',
}

function BodegaCard({
  bodega,
  usuarios,
}: {
  bodega: Awaited<ReturnType<typeof fetchBodegas>>[number]
  usuarios: Awaited<ReturnType<typeof fetchUsuariosBodega>>
}) {
  return (
    <Card className={bodega.es_matriz ? "border-emerald-500/30 dark:border-emerald-500/20 shadow-sm" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm">{bodega.codigo}</span>
            <span>{bodega.nombre}</span>
            {bodega.es_matriz && (
              <Badge variant="default" className="text-[10px] bg-emerald-600 hover:bg-emerald-700">
                🏛️ Bodega Matriz
              </Badge>
            )}
            {bodega.es_virtual && (
              <Badge variant="secondary" className="text-[10px]">Virtual</Badge>
            )}
            {!bodega.activa && (
              <Badge variant="destructive" className="text-[10px]">Inactiva</Badge>
            )}
          </CardTitle>
          <BodegaForm mode="edit" bodega={bodega} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Ciudad / Zona</span>
            <p className="font-medium">{bodega.ciudad ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Dirección</span>
            <p className="text-xs">{bodega.direccion ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Teléfono</span>
            <p>{bodega.telefono ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Estado</span>
            <p className="flex items-center gap-1">
              {bodega.activa ? (
                <><Check className="h-3.5 w-3.5 text-green-600" /> Activa</>
              ) : (
                <><X className="h-3.5 w-3.5 text-red-600" /> Inactiva</>
              )}
            </p>
          </div>
        </div>

        <Suspense fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Cargando usuarios...
          </div>
        }>
          <BodegaUsuarios bodegaId={bodega.id} initialUsuarios={usuarios} />
        </Suspense>
      </CardContent>
    </Card>
  )
}

function BodegasSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-12 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function BodegasList({ agruparPorCiudad }: { agruparPorCiudad: boolean }) {
  const bodegas = await fetchBodegas()
  const usuariosPorBodega = await fetchUsuariosBodegasMap(bodegas.map((bodega) => bodega.id))

  if (agruparPorCiudad) {
    return (
      <div className="space-y-8">
        {Object.entries(
          bodegas.reduce((acc, bodega, index) => {
            const city = bodega.ciudad || (bodega.es_virtual ? 'Virtuales' : 'Sin ciudad asignada')
            if (!acc[city]) acc[city] = []
            acc[city].push({ bodega, index })
            return acc
          }, {} as Record<string, { bodega: any, index: number }[]>)
        ).sort(([a], [b]) => a.localeCompare(b)).map(([city, items]) => (
          <div key={city} className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2 flex items-center justify-between">
              <span>{city}</span>
              <span className="text-xs font-normal text-muted-foreground">{items.length} bodega{items.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="grid gap-4">
              {items.map(({ bodega }) => (
                <BodegaCard
                  key={bodega.id}
                  bodega={bodega}
                  usuarios={usuariosPorBodega.get(bodega.id) ?? []}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {bodegas.map((bodega) => (
        <BodegaCard
          key={bodega.id}
          bodega={bodega}
          usuarios={usuariosPorBodega.get(bodega.id) ?? []}
        />
      ))}
    </div>
  )
}

export default async function BodegasPage(props: {
  searchParams: Promise<{ agrupar?: string }>
}) {
  const searchParams = await props.searchParams
  const agruparPorCiudad = searchParams.agrupar !== 'no'

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  if ((user.rol?.nivel_acceso ?? 99) > 2) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Building2 className="h-12 w-12" />
        <p className="text-sm mt-4">No tienes permisos para gestionar bodegas.</p>
      </div>
    )
  }

  const bodegas = await fetchBodegas()
  const ciudadesUnicas = Array.from(
    new Set(bodegas.map((b) => b.ciudad).filter(Boolean))
  ) as string[]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bodegas</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de bodegas, designación de Bodega Matriz y asignación de usuarios por zona.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={agruparPorCiudad ? "?agrupar=no" : "/inventario/bodegas"}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {agruparPorCiudad ? "Quitar agrupación" : "Agrupar por ciudad"}
          </Link>
          <AsignarZonaModal ciudades={ciudadesUnicas} />
          <Link
            href="/inventario/bodegas/matriz"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-primary/20 hover:border-primary/40 hover:bg-primary/5")}
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Matriz de Permisos
          </Link>
          <BodegaForm mode="create" />
        </div>
      </div>

      <Suspense fallback={<BodegasSkeleton />}>
        <BodegasList agruparPorCiudad={agruparPorCiudad} />
      </Suspense>
    </div>
  )
}
