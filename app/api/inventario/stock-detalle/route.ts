// app/api/inventario/stock-detalle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchStockDetallePorCaja } from '@/modules/inventario/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json([], { status: 401 })
  }

  const bodegaId = parseInt(request.nextUrl.searchParams.get('bodega_id') ?? '')
  const productoId = parseInt(request.nextUrl.searchParams.get('producto_id') ?? '')

  if (!bodegaId || !productoId) {
    return NextResponse.json([])
  }

  const detalles = await fetchStockDetallePorCaja(bodegaId, productoId)
  return NextResponse.json(detalles)
}
