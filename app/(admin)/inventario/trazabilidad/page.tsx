// app/(admin)/inventario/trazabilidad/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { requirePermission } from '@/lib/dal'
import { Route, Layers, Sparkles, Workflow } from 'lucide-react'
import { fetchTrazabilidadData, type TrazabilidadFiltros } from '@/modules/inventario/trazabilidad'
import { TrazabilidadHeaderControls } from './components/TrazabilidadHeaderControls'
import { TrazabilidadRotacionCards } from './components/TrazabilidadRotacionCards'
import { TrazabilidadMatrizTable } from './components/TrazabilidadMatrizTable'
import { TrazabilidadDiagrama } from './components/TrazabilidadDiagrama'

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
    ver_canceladas?: string
    vista?: 'matriz' | 'diagrama'
    bodega?: string
  }>
}

export default async function TrazabilidadPage({ searchParams }: TrazabilidadPageProps) {
  // Mismo check de permiso que Stock: solo roles con inventario_stock·leer.
  await requirePermission('inventario_stock')
  const params = await searchParams

  const filtros: TrazabilidadFiltros = {
    q: params.q,
    periodo: params.periodo || 'mes_actual',
    fecha_desde: params.fecha_desde,
    fecha_hasta: params.fecha_hasta,
    ciudad: params.ciudad,
    familia: params.familia,
    agrupar_por: params.agrupar_por || 'familia',
    // Checkbox OFF por defecto: solo '1' muestra CANC (activo=true, solo visual, no suma)
    incluir_canceladas: params.ver_canceladas === '1',
    bodega_id: params.bodega ? Number(params.bodega) || undefined : undefined,
  }

  const data = await fetchTrazabilidadData(filtros)
  const vista = params.vista === 'diagrama' ? 'diagrama' : 'matriz'
  const qs = (v: string) => {
    const p = new URLSearchParams()
    if (params.q) p.set('q', params.q)
    if (params.periodo) p.set('periodo', params.periodo)
    if (params.fecha_desde) p.set('fecha_desde', params.fecha_desde)
    if (params.fecha_hasta) p.set('fecha_hasta', params.fecha_hasta)
    if (params.ciudad) p.set('ciudad', params.ciudad)
    if (params.familia) p.set('familia', params.familia)
    if (params.agrupar_por) p.set('agrupar_por', params.agrupar_por)
    if (params.ver_canceladas) p.set('ver_canceladas', params.ver_canceladas)
    if (params.bodega) p.set('bodega', params.bodega)
    p.set('vista', v)
    const s = p.toString()
    return s ? `/inventario/trazabilidad?${s}` : '/inventario/trazabilidad'
  }

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
        bodegas={data.bodegasDisponibles}
        filtrosActuales={data.filtrosAplicados}
      />

      {data.filtrosAplicados.bodegaNombre && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs">
          Alcance: bodega <strong>{data.filtrosAplicados.bodegaNombre}</strong>
          {data.filtrosAplicados.bodegaCiudad ? ` (${data.filtrosAplicados.bodegaCiudad})` : ''} — solo sus movimientos y stock.
          Las filas sin movimiento ni stock en ella se ocultan. Da clic en una celda con valor para ver sus notas.
        </div>
      )}

      {/* ── Zona 1: Métricas de Período y Rotación (Estilo Dashboard Catálogo) ── */}
      <TrazabilidadRotacionCards kpis={data.kpis} />

      {/* ── Zona 2: Matriz o Diagrama ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              {vista === 'diagrama' ? <Workflow className="w-4 h-4 text-primary" /> : <Layers className="w-4 h-4 text-primary" />}
              {vista === 'diagrama' ? 'Diagrama de Flujo por Plaza' : 'Matriz de Despachos y Traspasos por Plaza'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {vista === 'diagrama'
                ? 'Da clic en una ciudad o flecha para rastrear movimientos y notas'
                : 'Desglose de entradas, salidas por ciudad y transferencias inter-bodega'}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <Link
              href={qs('matriz')}
              scroll={false}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${vista === 'matriz' ? 'bg-background font-semibold text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Layers className="w-3.5 h-3.5" /> Matriz
            </Link>
            <Link
              href={qs('diagrama')}
              scroll={false}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${vista === 'diagrama' ? 'bg-background font-semibold text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Workflow className="w-3.5 h-3.5" /> Diagrama
            </Link>
          </div>
        </div>

        {(data.avisos.movimientosOcultosIgnorados > 0 || data.avisos.canceladasVisibles > 0) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
            {data.avisos.movimientosOcultosIgnorados > 0 && (
              <span>
                Se ignoraron <strong>{data.avisos.movimientosOcultosIgnorados}</strong> movimientos ocultos (CONF con activo=false, borrado admin). El stock actual incluye su efecto vía trigger y puede no cuadrar con el período.
              </span>
            )}
            {data.avisos.movimientosOcultosIgnorados > 0 && data.avisos.canceladasVisibles > 0 && <span> · </span>}
            {data.avisos.canceladasVisibles > 0 && (
              <span>
                Mostrando <strong>{data.avisos.canceladasVisibles}</strong> notas canceladas (gris, solo visual, no suman).
              </span>
            )}
          </div>
        )}

        {vista === 'diagrama' ? (
          <Suspense fallback={<div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">Cargando diagrama de flujo…</div>}>
            <TrazabilidadDiagrama data={data} />
          </Suspense>
        ) : (
          <TrazabilidadMatrizTable
            filas={data.matriz}
            ciudades={data.ciudadesDisponibles}
            agruparPor={data.filtrosAplicados.agruparPor}
            fechaDesde={data.filtrosAplicados.fechaDesde}
            fechaHasta={data.filtrosAplicados.fechaHasta}
            canceladas={data.canceladas}
            verCanceladas={data.filtrosAplicados.incluirCanceladas}
            alcanceBodega={data.filtrosAplicados.bodegaNombre}
            ciudadFiltro={data.filtrosAplicados.ciudad}
            bodegaId={data.filtrosAplicados.bodegaId}
          />
        )}
      </div>

    </div>
  )
}
