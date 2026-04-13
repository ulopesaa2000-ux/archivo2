// app/api/ordenes-b2b/caja-detalle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchCajaDetalle } from '@/modules/ordenes-b2b/queries'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const id = parseInt(request.nextUrl.searchParams.get('id') ?? '')
  if (!id) return NextResponse.json(null)

  const detalle = await fetchCajaDetalle(id)
  return NextResponse.json(detalle)
}
