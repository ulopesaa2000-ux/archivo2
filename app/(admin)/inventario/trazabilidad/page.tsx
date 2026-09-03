// app/(admin)/inventario/trazabilidad/page.tsx
import type { Metadata } from 'next'
import { verifySession } from '@/lib/dal'
import { Route, Layers, Sparkles } from 'lucide-react'
import { fetchTrazabilidadData, type TrazabilidadFiltros } from '@/modules/inventario/trazabilidad'
import { TrazabilidadHeaderControls } from './components/TrazabilidadHeaderControls'
import { TrazabilidadRotacionCards } from './components/TrazabilidadRotacionCards'
import { TrazabilidadMatrizTable } from './components/TrazabilidadMatrizTable'

export const metadata: Metadata = {
  title: 'Trazabilidad y Flujo de Inventario | Idol Navy',
  description: 'Rastreo cronológico de movimientos por familia, rotación de producto y flujo entre plazas geográficas',
}

interface TrazabilidadPageProps {
  searchParams: Promise<{
    q?: string
    periodo?: 'mes_actual' | 'mes_anterior' | 'ultimo_mes' | 'rango' | 'todo'
    fecha_desde?: string
    fecha_hasta?: string
    ciudad?: string
    familia?: string
    agrupar_por?: 'familia' | 'producto'
  }>
}

export default async function TrazabilidadPage({ searchParams }: TrazabilidadPageProps) {
  await verifySession()
  const params = await searchParams

  const filtros: TrazabilidadFiltros = {
    q: params.q,
    periodo: params.periodo || 'mes_actual',
    fecha_desde: params.fecha_desde,
    fecha_hasta: params.fecha_hasta,
    ciudad: params.ciudad,
    familia: params.familia,
    agrupar_por: params.agrupar_por || 'familia',
  }

  const data = await fetchTrazabilidadData(filtros)

  return (
    <div className="space-y-6 pb-12">
      
      {/* ── Encabezado de Página ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Trazabilidad y Flujo de Inventario
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Rastreo cronológico de movimientos por familia, rotación comercial y balance de mercancía por plaza
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de Controles y Filtros ── */}
      <TrazabilidadHeaderControls
        ciudades={data.ciudadesDisponibles}
        familias={data.familiasDisponibles}
        filtrosActuales={data.filtrosAplicados}
      />

      {/* ── Zona 1: Métricas de Período y Rotación (Estilo Dashboard Catálogo) ── */}
      <TrazabilidadRotacionCards kpis={data.kpis} />

      {/* ── Zona 2: Matriz de Movimientos por Familia y Ciudad ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Matriz de Despachos y Traspasos por Plaza
            </h2>
            <p className="text-xs text-muted-foreground">
              Desglose de entradas, salidas por ciudad y transferencias inter-bodega
            </p>
          </div>
        </div>

        <TrazabilidadMatrizTable
          filas={data.matriz}
          ciudades={data.ciudadesDisponibles}
          agruparPor={data.filtrosAplicados.agruparPor}
          fechaDesde={data.filtrosAplicados.fechaDesde}
          fechaHasta={data.filtrosAplicados.fechaHasta}
        />
      </div>

    </div>
  )
}
