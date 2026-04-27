'use client'

// app/(admin)/configuracion/tablas/TableConfigClient.tsx

import { useState, useCallback } from 'react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { TableConfigCard } from './TableConfigCard'
import { guardarConfiguracionAction, restablecerConfiguracionAction } from './actions'
import type { TableFeatures } from '@/components/admin/DataTable/types'
import type { AdminTableDefinition } from '@/modules/admin-table/config/types'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'

// Fields disponibles por defecto para cada tabla (ejemplo para catálogo)
// Se pueden extender según la tabla
const DEFAULT_QUICKEDIT_FIELDS: Record<string, { key: string; label: string; type: string }[]> = {
  '/catalogo': [
    { key: 'descripcion', label: 'Descripción', type: 'text' },
    { key: 'familia', label: 'Familia', type: 'text' },
    { key: 'marca_id', label: 'Marca', type: 'select' },
    { key: 'precio_ec', label: 'Precio EC', type: 'currency' },
    { key: 'estado', label: 'Estado', type: 'select' },
  ],
}

function buildQuickEditFields(route: string): TableFeatures['quickEdit'] {
  const fields = DEFAULT_QUICKEDIT_FIELDS[route]
  if (!fields) return false
  return fields as TableFeatures['quickEdit']
}

type Props = {
  table: AdminTableDefinition
  initialConfig: TableFeatures | null
}

export function TableConfigClient({ table, initialConfig }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const defaultFeatures = getDefaultFeatures(table.route)
  const [config, setConfig] = useState<TableFeatures>(() => {
    return initialConfig ?? defaultFeatures
  })

  const isModified = JSON.stringify(config) !== JSON.stringify(
    initialConfig ?? defaultFeatures
  )

  const handleToggle = useCallback((key: keyof TableFeatures, value: boolean) => {
    setConfig((prev) => {
      const next = { ...prev }
      if (key === 'quickEdit') {
        next.quickEdit = value ? buildQuickEditFields(table.route) : false
      } else if (key === 'bulkActions') {
        next.bulkActions = value ? [] : undefined
      } else {
        (next as Record<string, unknown>)[key] = value
      }
      return next
    })
  }, [table.route])

  const handleToggleQuickEditField = useCallback((fieldKey: string, enabled: boolean) => {
    setConfig((prev: TableFeatures): TableFeatures => {
      if (!prev.quickEdit) return prev
      const fields = prev.quickEdit as { key: string; label: string; type: string }[]
      if (enabled) {
        // No-op: el campo ya está en la lista (chequeado = true)
        return prev
      } else {
        // Desmarcar: remover de la lista
        const newFields = fields.filter((f) => f.key !== fieldKey)
        return { ...prev, quickEdit: newFields.length > 0 ? newFields as TableFeatures['quickEdit'] : false }
      }
    })
  }, [])

  const handleSave = useCallback(() => {
    setIsSaving(true)
    startTransition(async () => {
      const result = await guardarConfiguracionAction({
        route: table.route,
        features: config,
        columnas_visibles: null,
      })
      setIsSaving(false)
      if (result.success) {
        toast.success('Configuración guardada correctamente')
      } else {
        toast.error('Error al guardar', { description: result.error })
      }
    })
  }, [config, table.route])

  const handleReset = useCallback(() => {
    setIsResetting(true)
    startTransition(async () => {
      const result = await restablecerConfiguracionAction(table.route)
      setIsResetting(false)
      if (result.success) {
        setConfig(defaultFeatures)
        toast.success('Configuración restablecida')
      } else {
        toast.error('Error al restablecer', { description: result.error })
      }
    })
  }, [defaultFeatures, table.route])

  return (
    <TableConfigCard
      table={table}
      currentConfig={config}
      isModified={isModified}
      isSaving={isSaving || isResetting}
      onToggle={handleToggle}
      onToggleQuickEditField={handleToggleQuickEditField}
      onSave={handleSave}
      onReset={handleReset}
    />
  )
}