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

async function testLogin() {
  const email = 'cordi8765@gmail.com' // User's email from context
  console.log('Testing login for:', email)
  
  // We don't have the password, but we can check if the user exists in the custom table
  const { data: users, error } = await supabase
    .from('usuarios')
    .select('*')
    
  console.log('All users in inv-tienda.usuarios:', users)
  console.log('Error querying users:', error)
}

testLogin()
