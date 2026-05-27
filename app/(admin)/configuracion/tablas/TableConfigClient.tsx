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

const DEFAULT_QUICKEDIT_FIELDS: Record<string, { key: string; label: string; type: string }[]> = {
  '/catalogo': [
    { key: 'descripcion', label: 'Descripcion', type: 'text' },
    { key: 'familia', label: 'Familia', type: 'text' },
    { key: 'marca_id', label: 'Marca', type: 'select' },
    { key: 'precio_ec', label: 'Precio EC', type: 'currency' },
    { key: 'estado', label: 'Estado', type: 'select' },
  ],
  '/contenedores': [
    { key: 'codigo_contenedor', label: 'Codigo', type: 'text' },
    { key: 'fecha_eta', label: 'ETA', type: 'date' },
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
  isGlobal?: boolean
}

export function TableConfigClient({ table, initialConfig, isGlobal }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const defaultFeatures = getDefaultFeatures(table.route)
  const [config, setConfig] = useState<TableFeatures>(() => {
    return initialConfig ?? defaultFeatures
  })

  const isModified = JSON.stringify(config) !== JSON.stringify(initialConfig ?? defaultFeatures)

  const handleToggle = useCallback((key: keyof TableFeatures, value: boolean) => {
    setConfig((prev) => {
      const next = { ...prev }
      if (key === 'quickEdit') {
        next.quickEdit = value ? buildQuickEditFields(table.route) : false
      } else if (key === 'bulkActions') {
        next.bulkActions = value ? [] : undefined
      } else {
        ;(next as Record<string, unknown>)[key] = value
      }
      return next
    })
  }, [table.route])

  const handleToggleQuickEditField = useCallback((fieldKey: string, enabled: boolean) => {
    setConfig((prev: TableFeatures): TableFeatures => {
      if (!prev.quickEdit) return prev
      const fields = prev.quickEdit as { key: string; label: string; type: string }[]
      if (enabled) return prev

      const newFields = fields.filter((f) => f.key !== fieldKey)
      return { ...prev, quickEdit: newFields.length > 0 ? (newFields as TableFeatures['quickEdit']) : false }
    })
  }, [])

  const handleSave = useCallback(() => {
    setIsSaving(true)
    startTransition(async () => {
      const result = await guardarConfiguracionAction({
        route: table.route,
        features: config,
        columnas_visibles: null,
      }, isGlobal)
      setIsSaving(false)
      if (result.success) {
        toast.success('Configuracion guardada correctamente')
      } else {
        toast.error('Error al guardar', { description: result.error })
      }
    })
  }, [config, table.route, isGlobal, startTransition])

  const handleReset = useCallback(() => {
    setIsResetting(true)
    startTransition(async () => {
      const result = await restablecerConfiguracionAction(table.route)
      setIsResetting(false)
      if (result.success) {
        setConfig(defaultFeatures)
        toast.success('Configuracion restablecida')
      } else {
        toast.error('Error al restablecer', { description: result.error })
      }
    })
  }, [defaultFeatures, table.route, startTransition])

  return (
    <TableConfigCard
      table={table}
      currentConfig={config}
      isModified={isModified}
      isSaving={isSaving || isResetting || isPending}
      onToggle={handleToggle}
      onToggleQuickEditField={handleToggleQuickEditField}
      onSave={handleSave}
      onReset={handleReset}
    />
  )
}
