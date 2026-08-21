// components/admin/inventario/config/NotasConfigTab.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  FileText, 
  ShieldAlert, 
  Sparkles, 
  SlidersHorizontal, 
  CheckSquare, 
  Layers, 
  Warehouse, 
  CheckCircle2,
  ScanLine,
  Star,
  Eye,
  Trash2
} from 'lucide-react'
import type { ConfigInventario, TipoMovimientoCodigo, AlcanceVisionNotas, AccionEliminarNota } from '@/modules/inventario/config-types'
import type { RolRow } from '@/lib/types/tables'
import { TIPO_MOVIMIENTO_COLORS, TIPO_MOVIMIENTO_ICONS } from '@/lib/constants'

type Props = {
  config: ConfigInventario
  roles: RolRow[]
  onChange: (field: keyof ConfigInventario, value: any) => void
  onPermisoTipoMovimientoChange: (rolKey: string, tipo: TipoMovimientoCodigo, checked: boolean) => void
  onTipoDefaultRolChange?: (rolKey: string, tipo: TipoMovimientoCodigo) => void
  onAlcanceVisionChange?: (rolKey: string, alcance: AlcanceVisionNotas) => void
  onAccionEliminarChange?: (rolKey: string, accion: AccionEliminarNota) => void
}

const TIPOS_LISTA: { codigo: TipoMovimientoCodigo; label: string }[] = [
  { codigo: 'ENT', label: 'Entradas' },
  { codigo: 'SAL', label: 'Salidas' },
  { codigo: 'TRF', label: 'Traspasos' },
  { codigo: 'AJU', label: 'Ajustes' },
  { codigo: 'DEV', label: 'Devoluciones' },
]

export function NotasConfigTab({
  config,
  roles,
  onChange,
  onPermisoTipoMovimientoChange,
  onTipoDefaultRolChange,
  onAlcanceVisionChange,
  onAccionEliminarChange,
}: Props) {
  const handleDefaultRolChange = (rolKey: string, tipo: TipoMovimientoCodigo) => {
    if (onTipoDefaultRolChange) {
      onTipoDefaultRolChange(rolKey, tipo)
    } else {
      const currentMap = { ...(config.tipo_movimiento_default_por_rol || {}) }
      currentMap[rolKey] = tipo
      onChange('tipo_movimiento_default_por_rol', currentMap)
    }
  }

  return (
    <div className="space-y-6">
      {/* Sección 1: Parámetros Operativos & Visión de Notas */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Parámetros Operativos y Visión de Notas</CardTitle>
              <CardDescription>
                Control de folios, límites en panel, visualización de piezas y preselecciones automáticas.
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

            {/* Switch: Preseleccionar bodega activa */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Warehouse className="h-4 w-4 text-primary" />
                  <Label className="font-medium text-sm">Preseleccionar bodega activa</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Asigna automáticamente la bodega activa actual como origen al crear una nota.
                </p>
              </div>
              <Switch
                checked={config.auto_seleccionar_bodega_activa ?? true}
                onCheckedChange={(v) => onChange('auto_seleccionar_bodega_activa', v)}
              />
            </div>

            {/* Switch: Preseleccionar tipo de movimiento default */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium text-sm">Preseleccionar tipo de movimiento default</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Abre la nueva nota con el tipo por defecto configurado para el rol del usuario.
                </p>
              </div>
              <Switch
                checked={config.auto_seleccionar_tipo_default ?? true}
                onCheckedChange={(v) => onChange('auto_seleccionar_tipo_default', v)}
              />
            </div>

            {/* Switch: Editar bodega origen */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20 md:col-span-2">
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
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Configuración de Notas OCR */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Configuración de Notas OCR & Escaneo</CardTitle>
              <CardDescription>
                Comportamiento al digitalizar notas físicas, reconciliación automática y tipos de fallback.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Switch: Alertar discrepancia OCR */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium text-sm">Alertar discrepancia en OCR</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Muestra un banner si la bodega o tipo detectado difiere de lo seleccionado.
                </p>
              </div>
              <Switch
                checked={config.alertar_discrepancia_ocr}
                onCheckedChange={(v) => onChange('alertar_discrepancia_ocr', v)}
              />
            </div>

            {/* Switch: Priorizar tipo detectado */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">Priorizar tipo detectado por IA</Label>
                <p className="text-xs text-muted-foreground">
                  Si el OCR detecta Entrada o Salida, prevalece sobre el default del rol.
                </p>
              </div>
              <Switch
                checked={config.ocr_priorizar_tipo_detectado ?? true}
                onCheckedChange={(v) => onChange('ocr_priorizar_tipo_detectado', v)}
              />
            </div>

            {/* Switch: Auto abrir sincronizador */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">Auto-abrir sincronizador de líneas</Label>
                <p className="text-xs text-muted-foreground">
                  Abre el editor de líneas OCR si hay discrepancias en los SKUs detectados.
                </p>
              </div>
              <Switch
                checked={config.ocr_auto_abrir_sincronizador ?? false}
                onCheckedChange={(v) => onChange('ocr_auto_abrir_sincronizador', v)}
              />
            </div>

            {/* Select: Tipo fallback OCR */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">Tipo de movimiento fallback para OCR</Label>
                <p className="text-xs text-muted-foreground">
                  Tipo asignado si el documento escaneado no especifica Entrada o Salida.
                </p>
              </div>
              <Select
                value={config.ocr_tipo_movimiento_fallback || 'ENT'}
                onValueChange={(val) => onChange('ocr_tipo_movimiento_fallback', val as TipoMovimientoCodigo)}
              >
                <SelectTrigger className="w-[130px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_LISTA.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo} className="font-medium">
                      {t.codigo} - {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Matriz de Permisos y Tipo Predeterminado por Rol */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Permisos y Tipo Predeterminado por Rol</CardTitle>
              <CardDescription>
                Configura qué tipos de nota puede crear cada rol y cuál es su tipo predeterminado al abrir una nueva nota (ej. Entradas para Encargados de Bodega, Salidas para Bodegueros).
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
                  <th className="text-center py-3 px-4 font-semibold text-primary">
                    <div className="flex items-center justify-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <span>Tipo Predeterminado</span>
                    </div>
                    <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">Al abrir Nueva Nota</span>
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                    <div className="flex items-center justify-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      <span>Alcance de Visión</span>
                    </div>
                    <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">Notas visibles en listado</span>
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-red-600 dark:text-red-400">
                    <div className="flex items-center justify-center gap-1.5">
                      <Trash2 className="h-4 w-4" />
                      <span>Acción al Eliminar</span>
                    </div>
                    <span className="text-[11px] font-normal text-muted-foreground block mt-0.5">Comportamiento del botón</span>
                  </th>
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

                  // Tipos permitidos para el dropdown de default
                  const tiposPermitidosParaRol = isSuperAdmin
                    ? TIPOS_LISTA.map(t => t.codigo)
                    : permisosActuales

                  // Tipo default actual configurado para este rol
                  const defaultActual = 
                    config.tipo_movimiento_default_por_rol?.[rolKey] ||
                    config.tipo_movimiento_default_por_rol?.[nivelKey] ||
                    (rol.id === 18 ? 'SAL' : 'ENT')

                  // Si el default actual no está en los permitidos, usar el primero permitido
                  const safeDefault = tiposPermitidosParaRol.includes(defaultActual)
                    ? defaultActual
                    : (tiposPermitidosParaRol[0] || 'ENT')

                  // Alcance de visión actual
                  const alcanceActual =
                    config.alcance_vision_notas_por_rol?.[rolKey] ||
                    config.alcance_vision_notas_por_rol?.[nivelKey] ||
                    (rol.id === 18 ? 'solo_propias' : 'todas_bodegas')

                  // Acción al eliminar actual
                  const accionEliminarActual =
                    config.accion_eliminar_nota_por_rol?.[rolKey] ||
                    config.accion_eliminar_nota_por_rol?.[nivelKey] ||
                    (rol.id === 18 ? 'solo_cancelar' : 'eliminar_soft')

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

                      {/* Checkboxes de Permisos */}
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

                      {/* Columna Tipo Predeterminado */}
                      <td className="text-center py-3 px-4">
                        <div className="flex justify-center">
                          <Select
                            value={safeDefault}
                            onValueChange={(val) => handleDefaultRolChange(rolKey, val as TipoMovimientoCodigo)}
                            disabled={tiposPermitidosParaRol.length === 0}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_LISTA
                                .filter((t) => tiposPermitidosParaRol.includes(t.codigo))
                                .map((t) => (
                                  <SelectItem key={t.codigo} value={t.codigo} className="text-xs font-medium">
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${TIPO_MOVIMIENTO_COLORS[t.codigo]}`}>
                                        {t.codigo}
                                      </Badge>
                                      <span>{t.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Columna Alcance de Visión */}
                      <td className="text-center py-3 px-4">
                        <div className="flex justify-center">
                          <Select
                            value={alcanceActual}
                            onValueChange={(val) => {
                              if (onAlcanceVisionChange && val) {
                                onAlcanceVisionChange(rolKey, val as AlcanceVisionNotas)
                              }
                            }}
                          >
                            <SelectTrigger className="w-[155px] h-8 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todas_bodegas" className="text-xs font-medium">
                                🏢 Todas de sus Bodegas
                              </SelectItem>
                              <SelectItem value="solo_propias" className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                👤 Solo Notas Propias
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>

                      {/* Columna Acción al Eliminar */}
                      <td className="text-center py-3 px-4">
                        <div className="flex justify-center">
                          <Select
                            value={accionEliminarActual}
                            onValueChange={(val) => {
                              if (onAccionEliminarChange && val) {
                                onAccionEliminarChange(rolKey, val as AccionEliminarNota)
                              }
                            }}
                          >
                            <SelectTrigger className="w-[170px] h-8 text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="eliminar_soft" className="text-xs font-medium text-red-600 dark:text-red-400">
                                🗑️ Eliminar / Ocultar
                              </SelectItem>
                              <SelectItem value="solo_cancelar" className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                🚫 Solo Cancelar (CANC)
                              </SelectItem>
                              <SelectItem value="ninguno" className="text-xs font-medium text-muted-foreground">
                                🔒 Sin Permiso
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sección 4: Políticas de Aprobación */}
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
    </div>
  )
}

