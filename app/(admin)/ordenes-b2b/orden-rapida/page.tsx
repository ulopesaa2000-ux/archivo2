// app/(admin)/ordenes-b2b/orden-rapida/page.tsx
import type { Metadata } from 'next'
import { requirePermission } from '@/lib/dal'
import { fetchPersonasComercialesActivas } from '@/modules/config/queries'
import { createClient } from '@/lib/supabase/server'
import { OrdenRapidaWizard } from './OrdenRapidaWizard'

export const metadata: Metadata = { title: 'Orden Rápida B2B' }

export default async function OrdenRapidaPage() {
  await requirePermission('b2b_ordenes')

  const personas = await fetchPersonasComercialesActivas()
  
  // Proveedores y Clientes
  const proveedores = personas.filter((p) => p.tipo_entidad === 'Proveedor')
  const clientes = personas.filter((p) => p.tipo_entidad === 'Cliente B2B')

  // Obtener contenedores en tránsito o activos para vinculación opcional
  const supabase = await createClient()
  const { data: contenedoresRaw } = await supabase
    .from('contenedores')
    .select('id, codigo_contenedor, numero_contenedor, estado')
    .in('estado', ['borrador', 'en_transito', 'en_aduana', 'en_bodega'])
    .order('created_at', { ascending: false })

  const contenedores = contenedoresRaw ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orden Rápida B2B (Packing List AI)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Carga un Packing List en cualquier formato Excel o PDF. Nuestra integración inteligente procesará el archivo para pre-llenar productos, cajas y detalles de logística.
        </p>
      </div>

      <OrdenRapidaWizard 
        proveedores={proveedores} 
        clientes={clientes} 
        contenedores={contenedores} 
      />
    </div>
  )
}
