// app/(admin)/despachos/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchDespachoById } from '@/modules/despachos/queries'
import { DespachoDetalleContent } from './DespachoDetalleContent'
import { DetailPageSkeleton } from '@/components/admin/PageSkeleton'

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Despacho no encontrado' }
  const d = await fetchDespachoById(id)
  return { title: d ? `Despacho #${d.id} — Despachos` : 'No encontrado' }
}

export default async function DespachoDetallePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const despacho = await fetchDespachoById(id)
  if (!despacho) notFound()

  return (
    <div className="space-y-6">
      <Suspense fallback={<DetailPageSkeleton />}>
        <DespachoDetalleContent despacho={despacho} />
      </Suspense>
    </div>
  )
}
