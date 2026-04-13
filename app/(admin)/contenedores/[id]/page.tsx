// app/(admin)/contenedores/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  fetchContenedorById, fetchContenedorResumen,
  fetchOrdenesDeContenedor, fetchContenedorPacking,
} from '@/modules/contenedores/queries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TabSkeleton } from '@/components/admin/PageSkeleton'
import { ContenedorCabecera } from './components/ContenedorCabecera'
import { ContenedorOrdenes } from './components/ContenedorOrdenes'
import { ContenedorPacking } from './components/ContenedorPacking'
import { Separator } from '@/components/ui/separator'

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Contenedor no encontrado' }
  const c = await fetchContenedorById(id)
  return { title: c ? `${c.codigo_contenedor} — Contenedores` : 'No encontrado' }
}

export default async function ContenedorDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const [contenedor, resumen] = await Promise.all([
    fetchContenedorById(id),
    fetchContenedorResumen(id),
  ])
  if (!contenedor) notFound()

  const [ordenes, packing] = await Promise.all([
    fetchOrdenesDeContenedor(id),
    fetchContenedorPacking(id),
  ])

  return (
    <div className="space-y-6">
      <ContenedorCabecera contenedor={contenedor} resumen={resumen} />
      <Separator />
      <Tabs defaultValue="ordenes">
        <TabsList>
          <TabsTrigger value="ordenes">Órdenes ({ordenes.length})</TabsTrigger>
          <TabsTrigger value="packing">Packing List ({packing.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ordenes">
          <ContenedorOrdenes ordenes={ordenes} />
        </TabsContent>
        <TabsContent value="packing">
          <ContenedorPacking items={packing} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
