// app/(admin)/configuracion/tablas/TableConfigCard.tsx
'use client'

import { memo, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Settings2,
  RotateCcw,
  Check,
} from 'lucide-react'
import type { TableFeatures } from '@/components/admin/DataTable/types'
import type { AdminTableDefinition } from '@/modules/admin-table/config/types'

type Props = {
  table: AdminTableDefinition
  currentConfig: TableFeatures
  isModified: boolean
  isSaving: boolean
  onToggle: (key: keyof TableFeatures, value: boolean) => void
  onToggleQuickEditField: (key: string, enabled: boolean) => void
  onSave: () => void
  onReset: () => void
}

const FeatureToggle = memo(function FeatureToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10">
      <Switch id={label} checked={checked} onCheckedChange={onChange} />
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={label} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </div>
  )
})

export function TableConfigCard({
  table,
  currentConfig,
  isModified,
  isSaving,
  onToggle,
  onToggleQuickEditField,
  onSave,
  onReset,
}: Props) {
  const f = currentConfig

  const handleToggle = useCallback((key: keyof TableFeatures) => (value: boolean) => {
    onToggle(key, value)
  }, [onToggle])

  const features = table.features_disponibles
  const quickEditFields = f.quickEdit === false ? null : f.quickEdit ?? null
  const showQuickEditFields = quickEditFields !== null

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{table.label}</CardTitle>
            <CardDescription className="text-xs">{table.description}</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">
            {table.route}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {features.includes('selectable') && (
            <FeatureToggle
              label="Selección múltiple"
              description="Checkboxes para seleccionar filas"
              checked={f.selectable ?? false}
              onChange={handleToggle('selectable')}
            />
          )}

          {features.includes('expandable') && (
            <FeatureToggle
              label="Filas expandibles"
              description="Ver detalles adicionales por fila"
              checked={f.expandable ?? false}
              onChange={handleToggle('expandable')}
            />
          )}

          {features.includes('sortable') && (
            <FeatureToggle
              label="Ordenamiento"
              description="Click en headers para ordenar"
              checked={f.sortable ?? true}
              onChange={handleToggle('sortable')}
            />
          )}

          {features.includes('quickEdit') && (
            <FeatureToggle
              label="Edición rápida"
              description="Editar valores inline con clic"
              checked={!!f.quickEdit}
              onChange={handleToggle('quickEdit')}
            />
          )}

          {features.includes('bulkActions') && (
            <FeatureToggle
              label="Acciones masivas"
              description="Barra de bulk con acciones múltiples"
              checked={f.bulkActions !== undefined}
              onChange={handleToggle('bulkActions')}
            />
          )}

          {features.includes('columnSelector') && (
            <FeatureToggle
              label="Selector de columnas"
              description="Mostrar/ocultar columnas"
              checked={f.columnSelector ?? false}
              onChange={handleToggle('columnSelector')}
            />
          )}
        </div>

        {showQuickEditFields && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Campos editables
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {quickEditFields!.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-2 p-2 rounded-md border bg-muted/20"
                >
                  <Checkbox
                    id={`qe-${table.route}-${field.key}`}
                    checked={true}
                    onCheckedChange={(checked) =>
                      onToggleQuickEditField(field.key, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`qe-${table.route}-${field.key}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {field.label}
                  </Label>
                  <Badge variant="outline" className="text-[10px]">
                    {field.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          {isModified ? (
            <>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="mr-1 animate-spin">⟳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Guardar cambios
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={isSaving}
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Restablecer
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Settings2 className="h-3 w-3" />
              <span>Sin cambios pendientes</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}