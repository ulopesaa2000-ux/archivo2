// app/api/inventario/notas/nueva/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { searchProductos } from '@/modules/inventario/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verificar auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json([], { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (q.length < 2) {
    return NextResponse.json([])
  }

  const results = await searchProductos(q, 10)
  return NextResponse.json(results)
}
