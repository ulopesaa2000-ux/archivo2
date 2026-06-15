// C:\Users\uriel\Downloads\enero 26\archivo2\app\api\debug-user\route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' })
  }
  
  const { data: usuarioData, error: userError } = await (supabase
    .from('usuarios')
    .select(`
      *,
      rol:roles!usuarios_rol_id_fkey (
        id,
        nombre,
        nivel_acceso,
        descripcion
      ),
      permisos:usuario_permisos (
        es_super_admin,
        puede_gestionar_compras_b2b,
        puede_gestionar_contenedores,
        puede_gestionar_ecommerce,
        puede_ver_inventario,
        puede_crear_notas_inventario,
        puede_aprobar_notas_inventario
      )
    `) as any)
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .single()
    
  return NextResponse.json({ user, usuarioData, userError })
}
