// components/admin/inventario/config/StockConfigTab.tsx
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LayoutGrid, FileSpreadsheet, Layers, Eye, CheckCircle2 } from 'lucide-react'
import type { ConfigInventario, VistaDefaultStock, AgrupacionDefaultStock } from '@/modules/inventario/config-types'
import { cn } from '@/lib/utils'

type Props = {
  config: ConfigInventario
  onChange: (field: keyof ConfigInventario, value: any) => void
}

export function StockConfigTab({ config, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Sección 1: Vistas y Modos Predeterminados */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Visualización Predeterminada de Stock</CardTitle>
              <CardDescription>
                Configura cómo se presenta la información al ingresar a `/inventario/stock`.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vista por defecto */}
            <div className="space-y-3 rounded-xl border p-4 bg-muted/20">
              <Label className="font-semibold text-sm">Modo de Vista Predeterminado</Label>
              <div className="space-y-2">
                <div
                  onClick={() => onChange('vista_default_stock', 'individual')}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all",
                    config.vista_default_stock === 'individual'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="mt-0.5">
                    {config.vista_default_stock === 'individual' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-sm">Bodega Individual</span>
                    <span className="text-xs text-muted-foreground">
                      Muestra el stock detallado de la bodega activa seleccionada en el header.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => onChange('vista_default_stock', 'matriz')}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all",
                    config.vista_default_stock === 'matriz'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="mt-0.5">
                    {config.vista_default_stock === 'matriz' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-sm">Matriz Consolidada</span>
                    <span className="text-xs text-muted-foreground">
                      Muestra todas las bodegas en columnas cruzadas con totales globales.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agrupación por defecto */}
            <div className="space-y-3 rounded-xl border p-4 bg-muted/20">
              <Label className="font-semibold text-sm">Agrupación de Tabla Predeterminada</Label>
              <div className="space-y-2">
                <div
                  onClick={() => onChange('agrupacion_default_stock', 'familia')}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all",
                    config.agrupacion_default_stock === 'familia'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="mt-0.5">
                    {config.agrupacion_default_stock === 'familia' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-sm">Agrupado por Familias</span>
                    <span className="text-xs text-muted-foreground">
                      Organiza los productos por encabezados de familia con subtotales por grupo.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => onChange('agrupacion_default_stock', 'plano')}
                  className={cn(
                    "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all",
                    config.agrupacion_default_stock === 'plano'
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="mt-0.5">
                    {config.agrupacion_default_stock === 'plano' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold block text-sm">Listado Plano</span>
                    <span className="text-xs text-muted-foreground">
                      Tabla continua con paginación tradicional y orden por SKU o descripción.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            {/* Switch: Stock cero */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-primary" />
                  <Label className="font-medium text-sm">Mostrar productos con stock en 0</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si está apagado, por defecto solo muestra productos con existencias &gt; 0.
                </p>
              </div>
              <Switch
                checked={config.mostrar_stock_cero_default}
                onCheckedChange={(v) => onChange('mostrar_stock_cero_default', v)}
              />
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between rounded-xl border p-4 bg-card">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <Label className="font-medium text-sm">Tamaño de página predeterminado</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cantidad de productos listados por página en vista plana.
                </p>
              </div>
              <Select
                value={String(config.paginacion_stock_tamano)}
                onValueChange={(v: string | null) => onChange('paginacion_stock_tamano', v ? parseInt(v) : 20)}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 items</SelectItem>
                  <SelectItem value="20">20 items</SelectItem>
                  <SelectItem value="50">50 items</SelectItem>
                  <SelectItem value="100">100 items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Configuración de Exportación Excel */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Formato de Exportación a Excel</CardTitle>
              <CardDescription>
                Personaliza la estructura y las filas de totales generadas en los archivos XLSX descargados.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Totales Cajas */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Fila TOTAL CAJAS</span>
                <Switch
                  checked={config.excel_incluir_totales_cajas}
                  onCheckedChange={(v) => onChange('excel_incluir_totales_cajas', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Incluye la fila con la suma total de cajas por bodega y gran total consolidado.
              </p>
            </div>

            {/* Fila Bodegas */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Fila BODEGAS inferior</span>
                <Switch
                  checked={config.excel_incluir_fila_bodegas}
                  onCheckedChange={(v) => onChange('excel_incluir_fila_bodegas', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Inserta los nombres de cada bodega en mayúsculas debajo de la suma de cajas.
              </p>
            </div>

            {/* Totales Piezas */}
            <div className="rounded-xl border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Fila TOTAL PIEZAS</span>
                <Switch
                  checked={config.excel_incluir_totales_piezas}
                  onCheckedChange={(v) => onChange('excel_incluir_totales_piezas', v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Opcional: Desactivado para mantener el reporte enfocado únicamente en cajas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
