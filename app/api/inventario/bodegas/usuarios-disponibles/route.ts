// app/api/inventario/bodegas/usuarios-disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchUsuarios } from '@/modules/config/queries'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json([], { status: 401 })
  }

  const usuarios = await fetchUsuarios()
  return NextResponse.json(usuarios)
}

import { createClient } from '@/lib/supabase/server'