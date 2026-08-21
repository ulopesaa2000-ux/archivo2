// components/admin/inventario/config/InventarioConfigForm.tsx
'use client'

import React, { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  LayoutGrid, 
  ArrowUpDown, 
  Users, 
  Building2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  RotateCcw 
} from 'lucide-react'
import { toast } from 'sonner'
import { actualizarConfigInventarioAction } from '@/modules/inventario/config-actions'
import type { ConfigInventario, TipoMovimientoCodigo, AlcanceVisionNotas, AccionEliminarNota } from '@/modules/inventario/config-types'
import { DEFAULT_CONFIG_INVENTARIO } from '@/modules/inventario/config-types'
import type { BodegaRow, RolRow, UsuarioBodegaRow } from '@/lib/types/tables'
import type { UsuarioConDetalle } from '@/modules/config/types'

import { NotasConfigTab } from './NotasConfigTab'
import { StockConfigTab } from './StockConfigTab'
import { BodegasOrderConfigTab } from './BodegasOrderConfigTab'
import { AsignacionCiudadTab } from './AsignacionCiudadTab'
import { BodegasGeneralesTab } from './BodegasGeneralesTab'

type Props = {
  initialConfig: ConfigInventario
  bodegas: BodegaRow[]
  roles: RolRow[]
  usuarios: UsuarioConDetalle[]
  asignaciones?: UsuarioBodegaRow[]
}

export function InventarioConfigForm({
  initialConfig,
  bodegas,
  roles,
  usuarios,
  asignaciones = [],
}: Props) {
  const [config, setConfig] = useState<ConfigInventario>(initialConfig)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState('notas')

  // Manejador genérico de campos
  const handleFieldChange = (field: keyof ConfigInventario, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Manejador para los permisos de tipos de movimiento por rol
  const handlePermisoTipoMovimientoChange = (
    rolKey: string,
    tipo: TipoMovimientoCodigo,
    checked: boolean
  ) => {
    setConfig((prev) => {
      const currentMap = { ...prev.permisos_tipos_movimiento }
      const currentList: TipoMovimientoCodigo[] = currentMap[rolKey]
        ? ([...currentMap[rolKey]] as TipoMovimientoCodigo[])
        : (['ENT', 'SAL', 'TRF'] as TipoMovimientoCodigo[])

      let updatedList: TipoMovimientoCodigo[]
      if (checked) {
        updatedList = currentList.includes(tipo) ? currentList : [...currentList, tipo]
      } else {
        updatedList = currentList.filter((t) => t !== tipo)
      }

      // Si el tipo desmarcado era el predeterminado para este rol, cambiar al primero disponible
      const currentDefaults = { ...(prev.tipo_movimiento_default_por_rol || {}) }
      if (!checked && currentDefaults[rolKey] === tipo) {
        currentDefaults[rolKey] = updatedList[0] || 'ENT'
      }

      return {
        ...prev,
        permisos_tipos_movimiento: {
          ...currentMap,
          [rolKey]: updatedList,
        },
        tipo_movimiento_default_por_rol: currentDefaults,
      }
    })
  }

  // Manejador para el tipo de movimiento predeterminado por rol
  const handleTipoDefaultRolChange = (rolKey: string, tipo: TipoMovimientoCodigo) => {
    setConfig((prev) => ({
      ...prev,
      tipo_movimiento_default_por_rol: {
        ...(prev.tipo_movimiento_default_por_rol || {}),
        [rolKey]: tipo,
      },
    }))
  }

  // Manejador para el alcance de visión de notas por rol
  const handleAlcanceVisionChange = (rolKey: string, alcance: AlcanceVisionNotas) => {
    setConfig((prev) => ({
      ...prev,
      alcance_vision_notas_por_rol: {
        ...(prev.alcance_vision_notas_por_rol || {}),
        [rolKey]: alcance,
      },
    }))
  }

  // Manejador para la acción al eliminar/cancelar notas por rol
  const handleAccionEliminarChange = (rolKey: string, accion: AccionEliminarNota) => {
    setConfig((prev) => ({
      ...prev,
      accion_eliminar_nota_por_rol: {
        ...(prev.accion_eliminar_nota_por_rol || {}),
        [rolKey]: accion,
      },
    }))
  }

  // Guardar configuración global
  const handleSave = () => {
    startTransition(async () => {
      const res = await actualizarConfigInventarioAction(config)
      if (res.success) {
        toast.success('Configuración de inventario guardada correctamente')
      } else {
        toast.error(res.error || 'Error al guardar la configuración')
      }
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Guardado Flotante / Sticky */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/80 backdrop-blur-md sticky top-16 z-20 shadow-sm">
        <div>
          <span className="font-bold text-base text-foreground block">
            Configuración Global de Inventario
          </span>
          <span className="text-xs text-muted-foreground">
            Ajusta políticas, permisos, vistas y el orden de aparición de bodegas.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setConfig(initialConfig)
              toast.info('Cambios restablecidos')
            }}
            disabled={isPending}
            className="gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Descartar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="gap-1.5 font-bold shadow-md shadow-primary/20"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1 bg-muted/60 rounded-xl gap-1">
          <TabsTrigger value="notas" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-xs rounded-lg text-xs font-semibold">
            <FileText className="h-4 w-4" />
            <span>Notas & Movimientos</span>
          </TabsTrigger>

          <TabsTrigger value="stock" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-xs rounded-lg text-xs font-semibold">
            <LayoutGrid className="h-4 w-4" />
            <span>Stock & Reportes</span>
          </TabsTrigger>

          <TabsTrigger value="orden" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-xs rounded-lg text-xs font-semibold">
            <ArrowUpDown className="h-4 w-4" />
            <span>Orden de Bodegas</span>
          </TabsTrigger>

          <TabsTrigger value="asignacion" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-xs rounded-lg text-xs font-semibold">
            <Users className="h-4 w-4" />
            <span>Asignación por Ciudad</span>
          </TabsTrigger>

          <TabsTrigger value="bodegas" className="gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-xs rounded-lg text-xs font-semibold">
            <Building2 className="h-4 w-4" />
            <span>Bodegas & Alertas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Notas */}
        <TabsContent value="notas" className="space-y-6 focus-visible:outline-none">
          <NotasConfigTab
            config={config}
            roles={roles}
            onChange={handleFieldChange}
            onPermisoTipoMovimientoChange={handlePermisoTipoMovimientoChange}
            onTipoDefaultRolChange={handleTipoDefaultRolChange}
            onAlcanceVisionChange={handleAlcanceVisionChange}
            onAccionEliminarChange={handleAccionEliminarChange}
          />
        </TabsContent>

        {/* Tab 2: Stock */}
        <TabsContent value="stock" className="space-y-6 focus-visible:outline-none">
          <StockConfigTab config={config} onChange={handleFieldChange} />
        </TabsContent>

        {/* Tab 3: Orden de Bodegas */}
        <TabsContent value="orden" className="space-y-6 focus-visible:outline-none">
          <BodegasOrderConfigTab config={config} bodegas={bodegas} onChange={handleFieldChange} />
        </TabsContent>

        {/* Tab 4: Asignación por Ciudad */}
        <TabsContent value="asignacion" className="space-y-6 focus-visible:outline-none">
          <AsignacionCiudadTab bodegas={bodegas} usuarios={usuarios} asignacionesIniciales={asignaciones} config={config} />
        </TabsContent>

        {/* Tab 5: Bodegas Generales */}
        <TabsContent value="bodegas" className="space-y-6 focus-visible:outline-none">
          <BodegasGeneralesTab config={config} bodegas={bodegas} onChange={handleFieldChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
