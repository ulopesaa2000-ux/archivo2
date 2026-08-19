// components/admin/inventario/config/NotasConfigTab.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, ShieldAlert, Sparkles, SlidersHorizontal, CheckSquare, Layers } from 'lucide-react'
import type { ConfigInventario, TipoMovimientoCodigo } from '@/modules/inventario/config-types'
import type { RolRow } from '@/lib/types/tables'
import { TIPO_MOVIMIENTO_COLORS, TIPO_MOVIMIENTO_ICONS } from '@/lib/constants'

type Props = {
  config: ConfigInventario
  roles: RolRow[]
  onChange: (field: keyof ConfigInventario, value: any) => void
  onPermisoTipoMovimientoChange: (rolKey: string, tipo: TipoMovimientoCodigo, checked: boolean) => void
}

const TIPOS_LISTA: { codigo: TipoMovimientoCodigo; label: string }[] = [
  { codigo: 'ENT', label: 'Entradas' },
  { codigo: 'SAL', label: 'Salidas' },
  { codigo: 'TRF', label: 'Traspasos' },
  { codigo: 'AJU', label: 'Ajustes' },
  { codigo: 'DEV', label: 'Devoluciones' },
]

export function NotasConfigTab({ config, roles, onChange, onPermisoTipoMovimientoChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Sección 1: Parámetros Generales de Notas */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Parámetros Operativos de Notas</CardTitle>
              <CardDescription>
                Control de prefijos, límites de visualización y modo de captura.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Límite en panel */}
            <div className="space-y-2">
              <Label htmlFor="limite_notas" className="font-semibold text-sm">
                Límite de notas pendientes en panel de Stock
              </Label>
              <Input
                id="limite_notas"
                type="number"
                min={1}
                max={50}
                value={config.limite_notas_pendientes_panel}
                onChange={(e) => onChange('limite_notas_pendientes_panel', parseInt(e.target.value) || 5)}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de notas pendientes a listar en la alerta de `/stock`.
              </p>
            </div>

            {/* Prefijo */}
            <div className="space-y-2">
              <Label htmlFor="prefijo_nota" className="font-semibold text-sm">
                Prefijo de número de nota
              </Label>
              <Input
                id="prefijo_nota"
                type="text"
                maxLength={10}
                value={config.prefijo_numero_nota}
                onChange={(e) => onChange('prefijo_numero_nota', e.target.value.toUpperCase())}
                placeholder="N-"
              />
              <p className="text-xs text-muted-foreground">
                Prefijo estándar para folios generados automáticamente (ej. N-).
              </p>
            </div>

            {/* Días de alerta */}
            <div className="space-y-2">
              <Label htmlFor="dias_alerta" className="font-semibold text-sm">
                Días de tolerancia para notas pendientes
              </Label>
              <Input
                id="dias_alerta"
                type="number"
                min={1}
                max={60}
                value={config.dias_limite_notas_pendientes_alerta}
                onChange={(e) => onChange('dias_limite_notas_pendientes_alerta', parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">
                Días antes de marcar en rojo una nota que permanezca en estado PEND.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            {/* Switch: Auto generar folio */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">Auto-generar número de nota</Label>
                <p className="text-xs text-muted-foreground">
                  Asigna un folio consecutivo automático al crear borradores.
                </p>
              </div>
              <Switch
                checked={config.auto_generar_numero_nota}
                onCheckedChange={(v) => onChange('auto_generar_numero_nota', v)}
              />
            </div>

            {/* Switch: Visualización de piezas en notas */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <Label className="font-medium text-sm">Mostrar piezas en notas</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Habilita el desglose de piezas sueltas además de bultos/cajas.
                </p>
              </div>
              <Switch
                checked={config.mostrar_piezas_en_notas}
                onCheckedChange={(v) => onChange('mostrar_piezas_en_notas', v)}
              />
            </div>

            {/* Switch: Editar bodega origen */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">Permitir editar bodega origen</Label>
                <p className="text-xs text-muted-foreground">
                  Permite a encargados autorizados cambiar el origen de una nota en borrador.
                </p>
              </div>
              <Switch
                checked={config.permitir_editar_bodega_origen}
                onCheckedChange={(v) => onChange('permitir_editar_bodega_origen', v)}
              />
            </div>

            {/* Switch: Alertar discrepancia OCR */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium text-sm">Alertar discrepancia en OCR</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Muestra un banner si la bodega detectada difiere de la seleccionada.
                </p>
              </div>
              <Switch
                checked={config.alertar_discrepancia_ocr}
                onCheckedChange={(v) => onChange('alertar_discrepancia_ocr', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Políticas de Aprobación */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Requerimientos de Aprobación</CardTitle>
              <CardDescription>
                Define qué movimientos requieren confirmación explícita para aplicar cambios al stock.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Traspaso */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Traspasos (TRF)</span>
                <Switch
                  checked={config.requiere_aprobacion_traspaso}
                  onCheckedChange={(v) => onChange('requiere_aprobacion_traspaso', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Requiere que la bodega receptora confirme la llegada.
              </p>
            </div>

            {/* Ajuste */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Ajustes (AJU)</span>
                <Switch
                  checked={config.requiere_aprobacion_ajuste}
                  onCheckedChange={(v) => onChange('requiere_aprobacion_ajuste', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Requiere validación de jefe operativo para aplicar auditorías.
              </p>
            </div>

            {/* Salida */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Salidas (SAL)</span>
                <Switch
                  checked={config.requiere_aprobacion_salida}
                  onCheckedChange={(v) => onChange('requiere_aprobacion_salida', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Requiere confirmación antes de descontar inventario de la bodega.
              </p>
            </div>

            {/* Entrada */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Entradas (ENT)</span>
                <Switch
                  checked={config.requiere_aprobacion_entrada}
                  onCheckedChange={(v) => onChange('requiere_aprobacion_entrada', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Si está apagado, las entradas directas pueden confirmarse de inmediato.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Matriz de Permisos por Rol para Tipos de Movimiento */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Permisos de Tipos de Movimiento por Rol</CardTitle>
              <CardDescription>
                Configura qué tipos de nota (Entradas, Salidas, Traspasos, Ajustes, Devoluciones) puede crear cada rol.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Rol / Nivel</th>
                  {TIPOS_LISTA.map((t) => (
                    <th key={t.codigo} className="text-center py-3 px-3 font-semibold text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className={TIPO_MOVIMIENTO_COLORS[t.codigo]}>
                          {TIPO_MOVIMIENTO_ICONS[t.codigo]} {t.codigo}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">{t.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {roles.map((rol) => {
                  const rolKey = String(rol.id)
                  const nivelKey = String(rol.nivel_acceso)
                  // Buscar permisos por rol ID o por nivel de acceso
                  const permisosActuales = config.permisos_tipos_movimiento[rolKey] ||
                    config.permisos_tipos_movimiento[nivelKey] ||
                    ['ENT', 'SAL', 'TRF']

                  const isSuperAdmin = rol.nivel_acceso === 1

                  return (
                    <tr key={rol.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{rol.nombre}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            Nivel {rol.nivel_acceso}
                          </Badge>
                        </div>
                        {rol.descripcion && (
                          <p className="text-xs text-muted-foreground font-normal">{rol.descripcion}</p>
                        )}
                      </td>
                      {TIPOS_LISTA.map((t) => {
                        const isChecked = isSuperAdmin ? true : permisosActuales.includes(t.codigo)

                        return (
                          <td key={t.codigo} className="text-center py-3 px-3">
                            <div className="flex justify-center items-center">
                              {isSuperAdmin ? (
                                <CheckSquare className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    onPermisoTipoMovimientoChange(rolKey, t.codigo, checked === true)
                                  }
                                />
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
