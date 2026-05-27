// app/(admin)/contenedores/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  fetchContenedorById, fetchContenedorResumen,
  fetchOrdenesDeContenedor, fetchContenedorPacking,
  fetchCajasDeContenedor,
} from '@/modules/contenedores/queries'
import { fetchCatalogosB2B } from '@/modules/ordenes-b2b/queries'
import { fetchBodegasVirtuales } from '@/modules/despachos/queries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabSkeleton } from '@/components/admin/PageSkeleton'
import { ContenedorCabecera } from './components/ContenedorCabecera'
import { ContenedorOrdenes } from './components/ContenedorOrdenes'
import { ContenedorPacking } from './components/ContenedorPacking'
import { ContenedorCajas } from './components/ContenedorCajas'
import { Separator } from '@/components/ui/separator'
import { requirePermission } from '@/lib/dal'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Contenedor no encontrado' }
  const c = await fetchContenedorById(id)
  return { title: c ? `${c.codigo_contenedor} — Contenedores` : 'No encontrado' }
}

export default async function ContenedorDetallePage(props: { params: Promise<{ id: string }> }) {
  await requirePermission('b2b_contenedores')

  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const currentUser = await getCurrentUser()
  const puedeEditar = Boolean(currentUser && can(currentUser, 'b2b_contenedores', 'puede_editar'))
  const puedeEditarOrden = Boolean(currentUser && can(currentUser, 'b2b_ordenes', 'puede_editar'))

  const [contenedor, resumen] = await Promise.all([
    fetchContenedorById(id),
    fetchContenedorResumen(id),
  ])
  if (!contenedor) notFound()

  const [ordenes, packing, cajas, catalogos, bodegasVirtuales] = await Promise.all([
    fetchOrdenesDeContenedor(id),
    fetchContenedorPacking(id),
    fetchCajasDeContenedor(id),
    fetchCatalogosB2B(),
    fetchBodegasVirtuales(),
  ])

  return (
    <div className="space-y-6">
      <ContenedorCabecera 
        contenedor={contenedor} 
        resumen={resumen} 
        bodegasVirtuales={bodegasVirtuales} 
        canEdit={puedeEditar}
      />
      <Separator />
      <Tabs defaultValue="ordenes">
        <TabsList>
          <TabsTrigger value="ordenes">Órdenes ({ordenes.length})</TabsTrigger>
          <TabsTrigger value="cajas">Cajas ({cajas.length})</TabsTrigger>
          <TabsTrigger value="packing">Packing List ({packing.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ordenes">
          <ContenedorOrdenes
            ordenes={ordenes}
            contenedorId={id}
            catalogos={catalogos}
            canEditContenedor={puedeEditar}
            canEditOrden={puedeEditarOrden}
          />
        </TabsContent>
        <TabsContent value="cajas">
          <Suspense fallback={<TabSkeleton />}>
            <ContenedorCajas cajas={cajas} />
          </Suspense>
        </TabsContent>
        <TabsContent value="packing">
          <ContenedorPacking items={packing} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
