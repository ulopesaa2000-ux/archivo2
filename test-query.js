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
  console.log('Testing query...')
  
  // Try to query just the user first
  const { data: users, error: usersError } = await supabase
    .from('usuarios')
    .select('*')
    
  console.log('Users:', users)
  console.log('Users Error:', usersError)
  
  if (users && users.length > 0) {
    const userId = users[0].id
    
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
      .eq('id', userId)
      .single()
      
    console.log('Full User:', fullUser)
    console.log('Full Error:', fullError)
  }
}

testQuery()
