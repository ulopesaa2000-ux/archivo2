// app/api/inventario/bodega-usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchUsuariosBodega } from '@/modules/inventario/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json([], { status: 401 })
  }

  const bodegaId = parseInt(request.nextUrl.searchParams.get('bodega_id') ?? '')
  if (!bodegaId) {
    return NextResponse.json([])
  }

  const usuarios = await fetchUsuariosBodega(bodegaId)
  return NextResponse.json(usuarios)
}
