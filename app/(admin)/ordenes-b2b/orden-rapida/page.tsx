// C:\Users\uriel\Downloads\enero 26\archivo2\app\(admin)\ordenes-b2b\orden-rapida\page.tsx
import type { Metadata } from 'next'
import { requirePermission } from '@/lib/dal'
import { fetchPersonasComercialesActivas } from '@/modules/config/queries'
import { createClient } from '@/lib/supabase/server'
import { OrdenRapidaWizard } from './OrdenRapidaWizard'

export const metadata: Metadata = { title: 'Orden Rapida B2B' }

export default async function OrdenRapidaPage() {
  await requirePermission('b2b_ordenes')

  const personas = await fetchPersonasComercialesActivas()

  const proveedores = personas.filter((persona) => persona.tipo_entidad === 'Proveedor')
  const clientes = personas.filter((persona) => persona.tipo_entidad === 'Cliente B2B')

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
        <h1 className="text-2xl font-bold tracking-tight">Orden Rapida B2B (Packing List AI)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga un Packing List en formato Excel `.xls` o `.xlsx`. La integracion con n8n procesara
          el archivo para pre-llenar productos, cajas y detalles de logistica para revision visual.
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
