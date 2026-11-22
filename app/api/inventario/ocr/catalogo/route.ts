// app/api/inventario/ocr/catalogo/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCatalogoOcrCompacto } from '@/modules/inventario/ocr-catalog-queries'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const rawItems = await fetchCatalogoOcrCompacto()
  const items = rawItems.map((item) => ({
    id: item.id,
    sku_base: item.sku_base,
    descripcion: item.descripcion,
    pz_en_caja: item.pz_en_caja,
    proveedor_nombre: item.proveedor_nombre ?? null,
  }))

  return NextResponse.json(
    { items, total: items.length },
    {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
      },
    }
  )
}
