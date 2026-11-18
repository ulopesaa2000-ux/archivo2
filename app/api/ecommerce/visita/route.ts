// app/api/ecommerce/visita/route.ts
import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getActiveSupabaseConfig } from '@/lib/supabase/env'
import { SUPABASE_SCHEMA } from '@/lib/supabase/constants'
import type { Database } from '@/lib/types/database.types'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const productoWebId = Number(body?.productoWebId)

    if (!Number.isInteger(productoWebId) || productoWebId <= 0) {
      return NextResponse.json({ ok: false, error: 'productoWebId inválido' }, { status: 400 })
    }

    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getActiveSupabaseConfig()
    const supabase = createSupabaseClient<Database, typeof SUPABASE_SCHEMA>(
      supabaseUrl,
      supabaseServiceRoleKey || supabaseAnonKey,
      {
        db: { schema: SUPABASE_SCHEMA },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )

    const { data: current, error: readErr } = await (supabase as any)
      .from('productos_web')
      .select('visitas')
      .eq('id', productoWebId)
      .eq('activo', true)
      .maybeSingle()

    if (readErr || !current) {
      return NextResponse.json({ ok: false, error: 'Producto no encontrado' }, { status: 404 })
    }

    const nextVisitas = Number(current.visitas ?? 0) + 1
    const { error: updateErr } = await (supabase as any)
      .from('productos_web')
      .update({ visitas: nextVisitas })
      .eq('id', productoWebId)

    if (updateErr) {
      console.error('Error incrementando visitas:', updateErr)
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
    }

    revalidateTag('ecommerce-catalogo', 'max')
    return NextResponse.json({ ok: true, visitas: nextVisitas })
  } catch (err) {
    console.error('Error POST /api/ecommerce/visita:', err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
