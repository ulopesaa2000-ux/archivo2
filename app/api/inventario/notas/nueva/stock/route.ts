// app/api/inventario/notas/nueva/stock/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchProductoStockEnBodega } from '@/modules/inventario/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ cajas: 0, piezas_sueltas: 0 }, { status: 401 })
  }

  const productoId = request.nextUrl.searchParams.get('producto_id')
  const bodegaId = request.nextUrl.searchParams.get('bodega_id')
  
  if (!productoId || !bodegaId) {
    return NextResponse.json({ cajas: 0, piezas_sueltas: 0 })
  }

  const stock = await fetchProductoStockEnBodega(
    parseInt(productoId),
    parseInt(bodegaId)
  )

  return NextResponse.json(stock)
}
