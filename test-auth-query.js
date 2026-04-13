const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'inv-tienda' }
})

async function testQuery() {
  console.log('Logging in...')
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'cordi8765@gmail.com',
    password: 'password123' // Try a dummy password, or maybe we can't login without the real one
  })
  
  if (authError) {
    console.error('Login Error:', authError)
    return
  }
  
  console.log('Logged in as:', authData.user.id)
  
  // Try the full join query
  const { data: fullUser, error: fullError } = await supabase
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
    `)
    .eq('auth_user_id', authData.user.id)
    .single()
    
  console.log('Full User:', fullUser)
  console.log('Full Error:', fullError)
}

testQuery()
