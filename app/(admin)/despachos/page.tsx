// app/(admin)/despachos/page.tsx
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { fetchDespachos } from '@/modules/despachos/queries'
import { DespachoListContent } from './DespachoListContent'
import { ListPageSkeleton } from '@/components/admin/PageSkeleton'

export const metadata: Metadata = { title: 'Despachos — Inventario' }

export default async function DespachosPage(props: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>
}) {
  const params = await props.searchParams
  const filtros = {
    q: params.q,
    estado: params.estado,
    page: params.page ? parseInt(params.page) : 1,
  }
  const { items, total } = await fetchDespachos(filtros)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Despachos</h1>
      </div>
      <Suspense fallback={<ListPageSkeleton />}>
        <DespachoListContent items={items} total={total} filtros={filtros} />
      </Suspense>
    </div>
  )
}
