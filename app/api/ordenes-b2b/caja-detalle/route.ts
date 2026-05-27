import { NextRequest, NextResponse } from 'next/server'
import { fetchCajaDetalle } from '@/modules/ordenes-b2b/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json(null, { status: 401 })

  const id = parseInt(request.nextUrl.searchParams.get('id') ?? '')
  if (!id) return NextResponse.json(null)

  const detalle = await fetchCajaDetalle(id)
  if (!detalle) return NextResponse.json(null)

  const puedeEditar = can(currentUser, 'b2b_cajas', 'puede_editar')
  const puedeEliminar = can(currentUser, 'b2b_cajas', 'puede_eliminar')

  return NextResponse.json({
    ...detalle,
    puedeEditar,
    puedeEliminar,
  })
}
