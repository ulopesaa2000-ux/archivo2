// app/(admin)/configuracion/personas/page.tsx
import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { fetchAssignedPersonas, fetchUsuarios, fetchRolesConPermisos } from '@/modules/config/queries'
import { getCurrentUser } from '@/modules/auth/queries'
import { createClient } from '@/lib/supabase/server'
import { PersonasManager } from '@/app/(admin)/configuracion/personas/PersonasManager'

export const metadata: Metadata = {
  title: 'Personas Asociadas',
}

/** Consulta del servidor para obtener todas las personas y sus enlaces */
async function fetchPersonas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personas')
    .select(`
      *,
      usuario:usuarios (
        id,
        username,
        email,
        activo,
        rol:roles (
          nombre
        )
      )
    `)
    .order('activo', { ascending: false })
    .order('nombre_completo')

  if (error) {
    console.error('fetchPersonas error:', error)
    return []
  }
  return data ?? []
}

export default async function PersonasPage() {
  const [personas, usuarios, roles, currentUser] = await Promise.all([
    fetchPersonas(),
    fetchUsuarios(),
    fetchRolesConPermisos(),
    getCurrentUser(),
  ])

  const internosConCuenta = personas.filter((persona) =>
    Boolean(persona.usuario_id) && ['Empleado', 'Administrador'].includes(persona.tipo_entidad ?? '')
  )

  const assignmentEntries = await Promise.all(
    internosConCuenta.map(async (persona) => [
      String(persona.usuario_id),
      await fetchAssignedPersonas(persona.usuario_id as number),
    ] as const)
  )

  const commercialAssignments = Object.fromEntries(assignmentEntries)

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Personas Asociadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vincula identidades comerciales (Clientes B2B, Proveedores, Empleados) con credenciales de acceso e invita a nuevos socios por email.
          </p>
        </div>

        {/* Resumen */}
        <div className="hidden sm:flex gap-4 text-sm shrink-0">
          <div className="text-center">
            <p className="font-semibold text-lg">{personas.filter(p => p.tipo_entidad === 'Cliente B2B').length}</p>
            <p className="text-muted-foreground text-xs">Clientes B2B</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg text-muted-foreground">{personas.filter(p => p.tipo_entidad === 'Proveedor').length}</p>
            <p className="text-muted-foreground text-xs">Proveedores</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg">{personas.filter(p => p.usuario_id).length}</p>
            <p className="text-muted-foreground text-xs">Vinculados</p>
          </div>
        </div>
      </div>

      {/* Grid Interactivo */}
      <PersonasManager
        personas={personas}
        usuarios={usuarios}
        roles={roles}
        currentUser={currentUser}
        commercialAssignments={commercialAssignments}
      />
    </div>
  )
}
