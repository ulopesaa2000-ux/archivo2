import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: users, error } = await supabase
    .from('usuarios')
    .select('*')
    
  return NextResponse.json({ users, error })
}
