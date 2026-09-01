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
  const [
    { data: contenedoresRaw },
    { data: marcasData },
    { data: generosData },
    { data: edadesData },
    { data: tiposPrendaData },
  ] = await Promise.all([
    supabase
      .from('contenedores')
      .select('id, codigo_contenedor, numero_contenedor, estado')
      .in('estado', ['borrador', 'en_transito', 'en_aduana', 'en_bodega'])
      .order('created_at', { ascending: false }),
    supabase.from('cat_marcas').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('cat_generos').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('cat_edades').select('id, rango').order('orden'),
    supabase.from('cat_tipo_prenda').select('id, nombre').order('nombre'),
  ])

  const contenedores = contenedoresRaw ?? []
  const marcas = marcasData ?? []
  const generos = generosData ?? []
  const edades = (edadesData ?? []).map((e: any) => ({ id: e.id, nombre: e.rango ?? String(e.id) }))
  const tipos_prenda = tiposPrendaData ?? []

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
        marcas={marcas}
        generos={generos}
        edades={edades}
        tipos_prenda={tipos_prenda}
      />
    </div>
  )
}
