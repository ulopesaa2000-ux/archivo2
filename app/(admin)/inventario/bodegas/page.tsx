// app/(admin)/inventario/bodegas/page.tsx
import type { Metadata } from 'next'
import { fetchBodegas, fetchUsuariosBodega } from '@/modules/inventario/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import { BodegaForm } from './BodegaForm'
import { BodegaUsuarios } from './BodegaUsuarios'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Check, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Bodegas',
}

export default async function BodegasPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Solo nivel ≤ 2 puede acceder
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

      <div className="grid gap-4">
        {bodegas.map((bodega) => (
          <Card key={bodega.id}>
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

              {/* Usuarios asignados */}
              <BodegaUsuarios bodegaId={bodega.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
