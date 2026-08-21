// app/api/inventario/notas/nueva/sustitutos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchProductosSustitutosFamilia } from '@/modules/inventario/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ productoActual: null, sustitutos: [] }, { status: 401 })
  }

  const productoId = request.nextUrl.searchParams.get('producto_id')
  const bodegaId = request.nextUrl.searchParams.get('bodega_id')

  if (!productoId || !bodegaId) {
    return NextResponse.json({ productoActual: null, sustitutos: [] })
  }

  const data = await fetchProductosSustitutosFamilia(
    parseInt(productoId),
    parseInt(bodegaId)
  )

  return NextResponse.json(data)
}
