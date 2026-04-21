// app/(admin)/inventario/bodegas/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { fetchBodegas, fetchUsuariosBodega } from '@/modules/inventario/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import { BodegaForm } from './BodegaForm'
import { BodegaUsuarios } from './BodegaUsuarios'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Check, X, Loader2 } from 'lucide-react'

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="font-mono text-sm">{bodega.codigo}</span>
            <span>{bodega.nombre}</span>
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
            <span className="text-muted-foreground">Ciudad</span>
            <p>{bodega.ciudad ?? '—'}</p>
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

export default async function BodegasPage() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bodegas</h1>
          <p className="text-sm text-muted-foreground">
            {bodegas.length} bodega{bodegas.length !== 1 ? 's' : ''} registrada{bodegas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <BodegaForm mode="create" />
      </div>

      <Suspense fallback={<BodegasSkeleton />}>
        <div className="grid gap-4">
          {bodegas.map((bodega) => (
            <BodegaCard
              key={bodega.id}
              bodega={bodega}
              usuarios={[]}
            />
          ))}
        </div>
      </Suspense>
    </div>
  )
}