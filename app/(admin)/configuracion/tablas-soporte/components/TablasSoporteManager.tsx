// app/(admin)/configuracion/tablas-soporte/components/TablasSoporteManager.tsx
'use client'

import { useState } from 'react'
import { TablasSoporteTabs } from './TablasSoporteTabs'
import { TablasSoporteFilters } from './TablasSoporteFilters'
import { TablasSoporteTable } from './TablasSoporteTable'
import { TablaSoporteFormDialog } from './TablaSoporteFormDialog'
import { type TablaSoporteKey } from '@/modules/config/tablas-soporte/types'

export function TablasSoporteManager({
  currentTabla,
  items,
  counts,
}: {
  currentTabla: TablaSoporteKey
  items: Record<string, any>[]
  counts: Record<TablaSoporteKey, number>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null)

  function handleOpenCreate() {
    setEditingRecord(null)
    setDialogOpen(true)
  }

  function handleEdit(item: Record<string, any>) {
    setEditingRecord(item)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Pestañas de Navegación */}
      <TablasSoporteTabs currentTabla={currentTabla} counts={counts} />

      {/* Buscador y Filtros */}
      <TablasSoporteFilters
        currentTabla={currentTabla}
        onOpenCreateDialog={handleOpenCreate}
      />

      {/* Tabla de Resultados */}
      <TablasSoporteTable
        tabla={currentTabla}
        items={items}
        onEdit={handleEdit}
      />

      {/* Modal de Formulario (Crear / Editar) */}
      <TablaSoporteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tabla={currentTabla}
        initialData={editingRecord}
      />
    </div>
  )
}
