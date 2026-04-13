// app/(admin)/ecommerce/config/page.tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/admin/ecommerce/ConfigForm'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

export const metadata: Metadata = {
  title: 'Configuración Ecommerce',
}

export default async function EcommerceConfigPage() {
  const supabase = await createClient()
  
  const { data: config } = await supabase
    .from('config_ecommerce')
    .select('*')
    .eq('id', 1)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración Ecommerce</h1>
        <p className="text-muted-foreground">
          Configura el comportamiento de la tienda online
        </p>
      </div>

      <ConfigForm config={(config as ConfigEcommerce) || undefined} />
    </div>
  )
}
