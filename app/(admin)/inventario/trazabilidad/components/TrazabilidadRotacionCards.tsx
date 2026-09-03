// app/(admin)/inventario/trazabilidad/components/TrazabilidadRotacionCards.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingDown, 
  TrendingUp, 
  ArrowLeftRight, 
  Warehouse, 
  Flame, 
  Building2,
  Package
} from 'lucide-react'
import type { CiudadMovimiento } from '@/modules/inventario/trazabilidad'

interface Props {
  kpis: {
    totalSalidasCajas: number
    totalEntradasCajas: number
    totalTraspasosCajas: number
    totalStockEmpresa: number
    ciudadesSalidas: CiudadMovimiento[]
    topFamiliasRotacion: { familia: string; descripcion?: string | null; salidas: number; porcentaje: number }[]
    topFamiliasStock: { familia: string; descripcion?: string | null; stock: number }[]
  }
}

export function TrazabilidadRotacionCards({ kpis }: Props) {
  const {
    totalSalidasCajas,
    totalEntradasCajas,
    totalTraspasosCajas,
    totalStockEmpresa,
    ciudadesSalidas,
    topFamiliasRotacion,
    topFamiliasStock,
  } = kpis

  return (
    <div className="space-y-4">
      {/* 4 KPIs Clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Salidas */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Salidas / Ventas
              </span>
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-red-600 dark:text-red-400">
                {totalSalidasCajas.toLocaleString('es-MX')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">cajas despachadas</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Traspasos */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Traspasos Inter-Bodega
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {totalTraspasosCajas.toLocaleString('es-MX')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">cajas reubicadas</p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Entradas */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Entradas de Mercancía
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalEntradasCajas.toLocaleString('es-MX')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">cajas ingresadas</p>
            </div>
          </CardContent>
        </Card>

        {/* 4. Stock Empresa */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Stock Físico Actual
              </span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Warehouse className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-foreground">
                {totalStockEmpresa.toLocaleString('es-MX')}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">cajas en bodegas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2 Widgets de Rotación y Ciudades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Widget 1: Top Familias con Más Salidas */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Top Familias con Más Salidas</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Prendas con mayor rotación en el período</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {topFamiliasRotacion.length} familias
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {topFamiliasRotacion.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                Sin registros de salidas en este rango de fechas.
              </p>
            ) : (
              topFamiliasRotacion.map((item, idx) => (
                <div key={item.familia} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                      <span className="font-bold text-foreground shrink-0">
                        {idx + 1}. {item.familia}
                      </span>
                      {item.descripcion && (
                        <span className="text-[11px] font-medium text-muted-foreground/90 italic truncate uppercase tracking-tight">
                          {item.descripcion}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-muted-foreground shrink-0 text-right">
                      <strong>{item.salidas} cj</strong> ({item.porcentaje}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.porcentaje || 5)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Widget 2: Salidas por Ciudad (Dónde se vendió) */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Despachos por Ciudad</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Concentración de salidas por polo logístico</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {ciudadesSalidas.length} plazas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {ciudadesSalidas.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                Sin movimientos por ciudad en este período.
              </p>
            ) : (
              ciudadesSalidas.map((item) => (
                <div key={item.ciudad} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {item.ciudad}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      <strong>{item.cajas_salida} cj</strong> ({item.porcentaje_salida}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.porcentaje_salida || 5)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
