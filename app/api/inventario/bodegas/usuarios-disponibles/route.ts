// app/api/inventario/bodegas/usuarios-disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchUsuarios } from '@/modules/config/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  void request
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  if (!can(currentUser, 'inventario_bodegas', 'puede_editar')) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const usuarios = await fetchUsuarios()
  const isBodeguero = currentUser.rol?.nombre === 'Bodeguero'

  const usuariosFiltrados = usuarios.filter((u) => {
    if (isBodeguero) {
      // El bodeguero solo puede ver/asignar otros bodegueros
      return u.rol?.nombre === 'Bodeguero'
    }
    // Administradores y encargados de bodega ven roles del área de inventario
    const rolesInventario = ['Super Admin', 'Admin Operativo Inventario', 'Encargado de Bodega', 'Bodeguero']
    return u.rol?.nombre && rolesInventario.includes(u.rol.nombre)
  })

  return NextResponse.json(usuariosFiltrados)
}
