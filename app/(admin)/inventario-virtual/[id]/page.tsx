// app/(admin)/inventario-virtual/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { fetchStockVirtual } from '@/modules/despachos/queries'
import { DashboardVirtualContent } from './DashboardVirtualContent'
import { DetailPageSkeleton } from '@/components/admin/PageSkeleton'

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params
  const id = parseInt(params.id)
  if (isNaN(id)) return { title: 'Bodega virtual no encontrada' }
  const supabase = await createClient()
  const { data: b } = await supabase.from('bodegas').select('nombre').eq('id', id).single()
  return { title: b ? `${b.nombre} — Bodega Virtual` : 'No encontrada' }
}

export default async function DashboardVirtualPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const id = parseInt(params.id)
  if (isNaN(id)) notFound()

  const supabase = await createClient()
  const { data: bodega } = await supabase
    .from('bodegas')
    .select('*')
    .eq('id', id)
    .single()

  if (!bodega || !bodega.es_virtual) notFound()

  const stock = await fetchStockVirtual(id)

  // Obtener notas PENDIENTES de esta bodega
  const { data: notasPendientes } = await supabase
    .from('notas_inventario')
    .select('id, numero_nota, observaciones, created_at, tipo:cat_tipos_movimiento!notas_inventario_tipo_movimiento_id_fkey (codigo, nombre), estado:cat_estados_nota!notas_inventario_estado_id_fkey (codigo)')
    .or(`bodega_origen_id.eq.${id},bodega_destino_id.eq.${id}`)
    .eq('estado_id', 1) // PEND
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-4">
      <Suspense fallback={<DetailPageSkeleton />}>
        <DashboardVirtualContent
          bodega={bodega}
          stock={stock}
          notasPendientes={(notasPendientes as any[] ?? []).map((n: any) => {
            const tipo = Array.isArray(n.tipo) ? n.tipo[0] : n.tipo
            const estado = Array.isArray(n.estado) ? n.estado[0] : n.estado
            return {
              id: n.id,
              numero_nota: n.numero_nota,
              observaciones: n.observaciones,
              created_at: n.created_at,
              tipo_codigo: tipo?.codigo ?? null,
              tipo_nombre: tipo?.nombre ?? null,
              estado_codigo: estado?.codigo ?? null,
            }
          })}
        />
      </Suspense>
    </div>
  )
}
