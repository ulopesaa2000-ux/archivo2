// app/api/inventario/notas/nueva/packs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchCajasDeProducto } from '@/modules/inventario/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json([], { status: 401 })
  }

  const productoId = request.nextUrl.searchParams.get('producto_id')
  if (!productoId) {
    return NextResponse.json([])
  }

  const cajas = await fetchCajasDeProducto(parseInt(productoId))
  return NextResponse.json(cajas)
}
