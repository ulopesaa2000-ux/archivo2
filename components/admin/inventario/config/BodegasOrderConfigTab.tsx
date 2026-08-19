// components/admin/inventario/config/BodegasOrderConfigTab.tsx
'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowUp, 
  ArrowDown, 
  Building2, 
  MapPin, 
  ArrowUpDown, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  TableProperties
} from 'lucide-react'
import type { ConfigInventario, CriterioOrdenBodegas } from '@/modules/inventario/config-types'
import { sortBodegasWithConfig } from '@/modules/inventario/config-types'
import type { BodegaRow } from '@/lib/types/tables'
import { cn } from '@/lib/utils'

type Props = {
  config: ConfigInventario
  bodegas: BodegaRow[]
  onChange: (field: keyof ConfigInventario, value: any) => void
}

export function BodegasOrderConfigTab({ config, bodegas, onChange }: Props) {
  // Extraer todas las ciudades únicas reales de las bodegas
  const todasLasCiudades = useMemo(() => {
    const set = new Set<string>()
    bodegas.forEach((b) => {
      if (b.ciudad) {
        set.add(b.ciudad.trim())
      }
    })
    return Array.from(set)
  }, [bodegas])

  // Lista ordenada de ciudades (las de config + las faltantes si hay nuevas)
  const ciudadesOrdenadas = useMemo(() => {
    const ordenadas: string[] = []
    const configSet = new Set((config.orden_ciudades || []).map((c) => c.toLowerCase().trim()))

    // Agregar las que ya están en config
    ;(config.orden_ciudades || []).forEach((c) => {
      const encontrada = todasLasCiudades.find((tc) => tc.toLowerCase() === c.toLowerCase())
      if (encontrada) ordenadas.push(encontrada)
      else ordenadas.push(c)
    })

    // Agregar las ciudades nuevas de la BD que no estaban en config
    todasLasCiudades.forEach((tc) => {
      if (!configSet.has(tc.toLowerCase().trim())) {
        ordenadas.push(tc)
      }
    })

    return ordenadas
  }, [config.orden_ciudades, todasLasCiudades])

  // Calcular la lista de bodegas ordenadas según la configuración actual
  const bodegasOrdenadas = useMemo(() => {
    return sortBodegasWithConfig(bodegas.filter((b) => b.activa), config)
  }, [bodegas, config])

  // Manejador para mover una ciudad arriba / abajo
  const handleMoveCiudad = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= ciudadesOrdenadas.length) return

    const newList = [...ciudadesOrdenadas]
    const temp = newList[index]
    newList[index] = newList[targetIndex]
    newList[targetIndex] = temp

    onChange('orden_ciudades', newList)
  }

  // Manejador para mover una bodega arriba / abajo
  const handleMoveBodega = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= bodegasOrdenadas.length) return

    const newBodegasOrder = [...bodegasOrdenadas]
    const temp = newBodegasOrder[index]
    newBodegasOrder[index] = newBodegasOrder[targetIndex]
    newBodegasOrder[targetIndex] = temp

    onChange('orden_bodegas_ids', newBodegasOrder.map((b) => b.id))
  }

  // Restablecer al orden por defecto
  const handleResetDefaults = () => {
    onChange('criterio_orden_bodegas', 'por_ciudad')
    onChange('orden_ciudades', [
      'Chiconcuac',
      'Toluca',
      'San Martin',
      'San Diego',
      'Nezahualcoyotl',
      'Tulancingo',
    ])
    onChange('orden_bodegas_ids', [])
    onChange('bodegas_virtuales_al_final', true)
  }

  return (
    <div className="space-y-6">
      {/* Sección 1: Criterio de Ordenamiento */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Criterio de Ordenamiento de Columnas</CardTitle>
                <CardDescription>
                  Define el método por el cual se ordenan las columnas de bodegas en la matriz y el reporte Excel.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="h-8 gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Por ciudad */}
            <div
              onClick={() => onChange('criterio_orden_bodegas', 'por_ciudad')}
              className={cn(
                "flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all",
                config.criterio_orden_bodegas === 'por_ciudad'
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "bg-card hover:bg-muted/40"
              )}
            >
              <div className="mt-0.5">
                {config.criterio_orden_bodegas === 'por_ciudad' ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-1">
                <span className="font-semibold block text-sm">Por Secuencia de Ciudades</span>
                <span className="text-xs text-muted-foreground block">
                  Agrupa y ordena primero según la prioridad de ciudades (ej. Chiconcuac, Toluca...).
                </span>
              </div>
            </div>

            {/* Manual exacto */}
            <div
              onClick={() => onChange('criterio_orden_bodegas', 'manual')}
              className={cn(
                "flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all",
                config.criterio_orden_bodegas === 'manual'
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "bg-card hover:bg-muted/40"
              )}
            >
              <div className="mt-0.5">
                {config.criterio_orden_bodegas === 'manual' ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-1">
                <span className="font-semibold block text-sm">Orden Manual de Bodegas</span>
                <span className="text-xs text-muted-foreground block">
                  Sigue la lista exacta de bodegas posición por posición definida abajo.
                </span>
              </div>
            </div>

            {/* Alfabético */}
            <div
              onClick={() => onChange('criterio_orden_bodegas', 'alfabetico')}
              className={cn(
                "flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all",
                config.criterio_orden_bodegas === 'alfabetico'
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "bg-card hover:bg-muted/40"
              )}
            >
              <div className="mt-0.5">
                {config.criterio_orden_bodegas === 'alfabetico' ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-1">
                <span className="font-semibold block text-sm">Alfabético A-Z</span>
                <span className="text-xs text-muted-foreground block">
                  Ordena las bodegas por su nombre alfabético estándar de forma continua.
                </span>
              </div>
            </div>
          </div>

          {/* Switch virtuales al final */}
          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/20 mt-2">
            <div className="space-y-0.5">
              <Label className="font-medium text-sm">Colocar Bodegas Virtuales al final</Label>
              <p className="text-xs text-muted-foreground">
                Envía las bodegas marcadas como virtuales al extremo derecho del reporte.
              </p>
            </div>
            <Switch
              checked={config.bodegas_virtuales_al_final}
              onCheckedChange={(v) => onChange('bodegas_virtuales_al_final', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Vista Previa de Encabezados de Reporte / Excel */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TableProperties className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-bold">Vista Previa de Encabezados en Matriz y Excel</CardTitle>
              <CardDescription>
                Este es el orden exacto en el que aparecerán las columnas en la pantalla de Stock y en el Excel generado:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex gap-1.5 p-2 bg-muted/50 rounded-xl border min-w-full">
              {bodegasOrdenadas.map((b, idx) => (
                <div
                  key={b.id}
                  className={cn(
                    "flex flex-col items-center justify-between p-2 rounded-lg border text-center text-xs font-bold shrink-0 min-w-[100px] max-w-[130px] shadow-xs transition-all",
                    b.es_virtual 
                      ? "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300"
                      : (idx % 2 === 0 ? "bg-[#DDEBF7] text-[#1F4E79] border-[#BDD7EE]" : "bg-card text-foreground border-border")
                  )}
                >
                  <span className="text-[10px] text-muted-foreground font-normal block truncate w-full">
                    {b.ciudad || (b.es_virtual ? 'Virtual' : 'General')}
                  </span>
                  <span className="truncate w-full uppercase py-1 leading-tight font-extrabold text-[11px]">
                    {b.nombre}
                  </span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1 mt-1 font-mono">
                    #{idx + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Reordenamiento de Ciudades y Bodegas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reordenamiento de Ciudades */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Prioridad de Ciudades</CardTitle>
                <CardDescription>
                  Ordena qué ciudad aparece primero en la matriz y el reporte.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {ciudadesOrdenadas.map((ciudad, idx) => {
              const count = bodegas.filter((b) => (b.ciudad || '').toLowerCase() === ciudad.toLowerCase()).length
              return (
                <div
                  key={ciudad}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-muted-foreground w-6">
                      {idx + 1}°
                    </span>
                    <div>
                      <span className="font-semibold text-sm block">{ciudad}</span>
                      <span className="text-xs text-muted-foreground">{count} bodega(s)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      disabled={idx === 0}
                      onClick={() => handleMoveCiudad(idx, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      disabled={idx === ciudadesOrdenadas.length - 1}
                      onClick={() => handleMoveCiudad(idx, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Reordenamiento Fino de Bodegas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Secuencia Detallada de Bodegas</CardTitle>
                <CardDescription>
                  Ajusta la posición individual de cada bodega en la lista.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {bodegasOrdenadas.map((bodega, idx) => (
              <div
                key={bodega.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border bg-card transition-colors",
                  bodega.es_virtual && "border-purple-300 dark:border-purple-800"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-muted-foreground w-6">
                    {idx + 1}°
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{bodega.nombre}</span>
                      {bodega.es_virtual && (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                          Virtual
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {bodega.ciudad || 'Sin Ciudad'} · {bodega.codigo}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={idx === 0}
                    onClick={() => handleMoveBodega(idx, 'up')}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={idx === bodegasOrdenadas.length - 1}
                    onClick={() => handleMoveBodega(idx, 'down')}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
