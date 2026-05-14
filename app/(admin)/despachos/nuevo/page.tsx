// app/(admin)/despachos/nuevo/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchBodegasVirtuales } from '@/modules/despachos/queries'
import { DespachoForm } from './DespachoForm'
import { ListPageSkeleton } from '@/components/admin/PageSkeleton'

export const metadata: Metadata = { title: 'Nuevo Despacho — Inventario' }

export default async function NuevoDespachoPage(props: {
  searchParams: Promise<{ origen?: string }>
}) {
  const params = await props.searchParams
  const origenId = params.origen ? parseInt(params.origen) : undefined

  const bodegasVirtuales = await fetchBodegasVirtuales()

  const supabase = await (await import('@/lib/supabase/server')).createClient()
  const { data: bodegasFisicas } = await supabase
    .from('bodegas')
    .select('*')
    .eq('es_virtual', false)
    .eq('activa', true)
    .order('nombre')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Nuevo Despacho</h1>
      <Suspense fallback={<ListPageSkeleton />}>
        <DespachoForm
          bodegasVirtuales={bodegasVirtuales}
          bodegasFisicas={bodegasFisicas ?? []}
          origenId={origenId}
        />
      </Suspense>
    </div>
  )
}
