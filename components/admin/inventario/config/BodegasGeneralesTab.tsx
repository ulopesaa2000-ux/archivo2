// components/admin/inventario/config/BodegasGeneralesTab.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Bell, AlertTriangle, Container, Mail } from 'lucide-react'
import type { ConfigInventario } from '@/modules/inventario/config-types'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  config: ConfigInventario
  bodegas: BodegaRow[]
  onChange: (field: keyof ConfigInventario, value: any) => void
}

export function BodegasGeneralesTab({ config, bodegas, onChange }: Props) {
  const bodegasFisicas = bodegas.filter((b) => b.activa && !b.es_virtual)

  return (
    <div className="space-y-6">
      {/* Sección 1: Políticas de Bodegas */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Políticas Generales de Bodegas y Stock</CardTitle>
              <CardDescription>
                Bodega matriz principal, umbrales de alerta y reglas de integridad.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bodega Principal */}
            <div className="space-y-2">
              <Label htmlFor="bodega_matriz" className="font-semibold text-sm">
                Bodega Matriz / Principal por Defecto
              </Label>
              <Select
                value={config.bodega_principal_id ? String(config.bodega_principal_id) : '__none__'}
                onValueChange={(val: string | null) =>
                  onChange('bodega_principal_id', !val || val === '__none__' ? null : parseInt(val))
                }
              >
                <SelectTrigger id="bodega_matriz" className="h-10">
                  <SelectValue placeholder="-- Seleccionar Bodega Matriz --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin bodega matriz predeterminada</SelectItem>
                  {bodegasFisicas.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.nombre} ({b.codigo}) {b.ciudad ? `· ${b.ciudad}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Bodega seleccionada automáticamente cuando un usuario no tiene bodega guardada en cookies.
              </p>
            </div>

            {/* Umbral de Alerta */}
            <div className="space-y-2">
              <Label htmlFor="umbral_alerta" className="font-semibold text-sm">
                Umbral de Alerta de Stock Mínimo (Cajas)
              </Label>
              <Input
                id="umbral_alerta"
                type="number"
                min={0}
                max={500}
                value={config.umbral_alerta_stock_minimo_cajas}
                onChange={(e) => onChange('umbral_alerta_stock_minimo_cajas', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Se mostrará alerta visual cuando las existencias de un producto bajen de esta cantidad.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            {/* Switch: Stock Negativo */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <Label className="font-medium text-sm">Permitir Stock Negativo</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Desactivado por seguridad. Evita que las notas dejen saldos menores a 0.
                </p>
              </div>
              <Switch
                checked={config.permitir_stock_negativo}
                onCheckedChange={(v) => onChange('permitir_stock_negativo', v)}
              />
            </div>

            {/* Switch: Bodegas Virtuales */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Container className="h-4 w-4 text-primary" />
                  <Label className="font-medium text-sm">Habilitar Bodegas Virtuales</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Permite crear y utilizar bodegas temporales para contenedores y tránsito.
                </p>
              </div>
              <Switch
                checked={config.permitir_bodegas_virtuales}
                onCheckedChange={(v) => onChange('permitir_bodegas_virtuales', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Notificaciones y Alertas */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Notificaciones y Alertas de Inventario</CardTitle>
              <CardDescription>
                Configura los destinatarios de correos para notas estancadas y reportes operativos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Email de Notificaciones */}
            <div className="space-y-2">
              <Label htmlFor="email_notif" className="font-semibold text-sm">
                Correo Electrónico para Alertas de Inventario
              </Label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="email_notif"
                  type="email"
                  placeholder="inventario@tuempresa.com"
                  value={config.email_notificaciones_inventario || ''}
                  onChange={(e) => onChange('email_notificaciones_inventario', e.target.value || null)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Recibirá avisos de discrepancias OCR, notas pendientes prolongadas y resúmenes de stock.
              </p>
            </div>

            {/* Switch: Notificar Notas Pendientes */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label className="font-medium text-sm">Notificar Notas Pendientes por Aprobar</Label>
                <p className="text-xs text-muted-foreground">
                  Envía alertas automáticas cuando una nota supere el tiempo de tolerancia.
                </p>
              </div>
              <Switch
                checked={config.notificar_notas_pendientes}
                onCheckedChange={(v) => onChange('notificar_notas_pendientes', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
