// app/(admin)/configuracion/tablas/page.tsx
import type { Metadata } from 'next'
import { Settings2, Table2 } from 'lucide-react'
import { fetchAllUserTableConfigs } from '@/modules/admin-table/config/queries'
import { ADMIN_TABLES_LIST } from '@/modules/admin-table/config/types'
import { TableConfigClient } from './TableConfigClient'

export const metadata: Metadata = {
  title: 'Configuración de Tablas',
  description: 'Personaliza el comportamiento de las tablas del panel admin.',
}

export default async function TablasConfigPage() {
  const userConfigs = await fetchAllUserTableConfigs()

  // Merge con defaults: las que no están en la BD usan el default
  const tablesWithConfig = ADMIN_TABLES_LIST.map((table) => ({
    table,
    savedConfig: userConfigs.get(table.route) ?? null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
          <Table2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Configuración de Tablas
          </h1>
          <p className="text-sm text-muted-foreground">
            Personaliza qué funciones están activas en cada tabla del admin.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
        <Settings2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            Los cambios se guardan en tu perfil de usuario y persisten entre sesiones.
            Cada tabla tiene diferentes opciones disponibles según sus necesidades.
          </p>
          <p className="font-medium text-foreground">
            Los cambios afectan solo a tu usuario y no a otros administradores.
          </p>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tablesWithConfig.map(({ table, savedConfig }) => (
          <TableConfigClient
            key={table.route}
            table={table}
            initialConfig={savedConfig}
          />
        ))}
      </div>
    </div>
  )
}