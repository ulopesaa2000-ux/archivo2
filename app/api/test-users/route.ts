// C:\Users\uriel\Downloads\enero 26\archivo2\app\api\test-users\route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const supabase = await createClient()
  
  const { data: users, error } = await supabase
    .from('usuarios')
    .select('*')
    
  return NextResponse.json({ users, error })
}
