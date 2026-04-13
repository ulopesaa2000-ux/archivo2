// app/(admin)/ordenes-b2b/[id]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchOrdenB2BById, fetchOrdenDetalles, fetchOrdenCajas, fetchCatalogosB2B } from '@/modules/ordenes-b2b/queries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrdenCabecera } from './components/OrdenCabecera'
import { OrdenProductos } from './components/OrdenProductos'
import { OrdenCajas } from './components/OrdenCajas'
import { Separator } from '@/components/ui/separator'

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Orden no encontrada' }
  const orden = await fetchOrdenB2BById(id)
  return {
    title: orden ? `Orden #${orden.id} — ${orden.folio_proveedor ?? 'B2B'}` : 'No encontrada',
    description: orden ? `Orden B2B de ${orden.proveedor_nombre ?? 'proveedor'} · ${orden.total_cajas ?? 0} cajas · ${orden.total_piezas ?? 0} piezas` : undefined,
  }
}

export default async function OrdenDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const orden = await fetchOrdenB2BById(id)
  if (!orden) notFound()

  const [detalles, cajas, catalogos] = await Promise.all([
    fetchOrdenDetalles(id),
    fetchOrdenCajas(id),
    fetchCatalogosB2B(),
  ])

  return (
    <div className="space-y-6">
      {/* Hero / Cabecera */}
      <OrdenCabecera orden={orden} catalogos={catalogos} />

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="cajas">
        <TabsList className="h-9">
          <TabsTrigger value="cajas" className="text-sm">
            Cajas
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              {cajas.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="productos" className="text-sm">
            Líneas de producto
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              {detalles.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cajas" className="mt-4">
          <OrdenCajas cajas={cajas} ordenId={id} />
        </TabsContent>

        <TabsContent value="productos" className="mt-4">
          <OrdenProductos detalles={detalles} ordenId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
