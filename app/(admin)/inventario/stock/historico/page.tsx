// app/(admin)/inventario/stock/historico/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { History, Loader2 } from 'lucide-react'
import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'
import { fetchKardexHistorico, fetchStockHistorico } from '@/modules/inventario/historico-queries'
import { HistoricoFiltros } from './_components/HistoricoFiltros'
import { TablaHistoricoAgrupada } from './_components/TablaHistoricoAgrupada'
import { TablaHistoricoIndividual } from './_components/TablaHistoricoIndividual'
import { TablaKardex } from './_components/TablaKardex'
import { HistoricoAvisos } from './_components/HistoricoAvisos'
import { HistoricoExcelButton } from './_components/HistoricoExcelButton'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/admin/Pagination'
import type { BodegaRow } from '@/lib/types/tables'

export const metadata: Metadata = {
  title: 'Stock Histórico | Idol Navy',
  description: 'Stock a una fecha por bodega o ciudad, y movimientos confirmados del periodo',
}

type PageSearchParams = {
  alcance?: string
  bodega?: string
  ciudad?: string
  fecha?: string
  vista?: string
  desde?: string
  hasta?: string
  q?: string
  page?: string
}

const PAGE_SIZE = 50

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Fin de mes anterior (default del histórico: cierre del mes pasado). */
function finDeMesAnterior(): string {
  const hoy = new Date()
  return iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0))
}

function primerDiaDe(fecha: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? `${fecha.slice(0, 7)}-01` : fecha
}

function ciudadDe(b: BodegaRow): string {
  return (b.ciudad || 'VIRTUAL').trim().toUpperCase()
}

function SkeletonHistorico() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculando stock histórico...
      </div>
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 p-3">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b p-3">
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Vista A — Corte: stock al cierre de la fecha de corte.
 * El cálculo vive en `modules/inventario/historico-queries.ts`; aquí solo se orquesta.
 */
async function HistorialCorte({
  fechaCorte,
  bodegaIds,
  bodegas,
  q,
  page,
  pageSize,
  modo,
  columnasPor,
}: {
  fechaCorte: string
  bodegaIds: number[]
  bodegas: BodegaRow[]
  q?: string
  page: number
  pageSize: number
  modo: 'individual' | 'agrupado'
  columnasPor: 'bodega' | 'ciudad'
}) {
  if (bodegaIds.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay bodegas en el alcance seleccionado.
      </p>
    )
  }

  const res = await fetchStockHistorico({
    fechaCorte,
    bodegaIds,
    bodegas,
    q,
    page,
    limit: pageSize,
    modo,
    columnasPor,
  })

  return (
    <div className="space-y-4">
      <HistoricoAvisos
        ajustesDirectos={res.ajustesDirectos}
        descuadres={res.descuadres}
        negativos={res.negativos}
        notasRevertidas={res.notasRevertidas}
        nMovimientos={res.nMovimientos}
        porBodega={res.porBodega}
        porCiudad={res.porCiudad}
        fechaCorte={fechaCorte}
      />
      {res.modo === 'agrupado' && res.matriz ? (
        <TablaHistoricoAgrupada matriz={res.matriz} fechaCorte={fechaCorte} />
      ) : (
        <TablaHistoricoIndividual filas={res.filas} fechaCorte={fechaCorte} />
      )}
      <Pagination total={res.totalProductos} pageSize={pageSize} />
    </div>
  )
}

/**
 * Vista B — Kardex: movimientos confirmados del periodo con saldo acumulado.
 */
async function HistorialKardex({
  desde,
  hasta,
  bodegaIds,
  bodegas,
  q,
  page,
  pageSize,
  mostrarBodega,
}: {
  desde: string
  hasta: string
  bodegaIds: number[]
  bodegas: BodegaRow[]
  q?: string
  page: number
  pageSize: number
  mostrarBodega: boolean
}) {
  if (bodegaIds.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay bodegas en el alcance seleccionado.
      </p>
    )
  }

  const res = await fetchKardexHistorico({ desde, hasta, bodegaIds, bodegas, q, page, limit: pageSize })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Kpi etiqueta="Saldo inicial" valor={res.totales.saldoInicial} />
        <Kpi etiqueta="Entradas" valor={res.totales.entradas} tono="emerald" />
        <Kpi etiqueta="Salidas" valor={res.totales.salidas} tono="rose" />
        <Kpi etiqueta={`Saldo al ${hasta}`} valor={res.totales.saldoFinal} tono="primary" />
      </div>
      <p className="text-xs text-muted-foreground">
        {res.notasDistintas} notas confirmadas · {res.totalFilas} movimientos en el periodo. Solo CONF/MODF
        activas y solo cajas.
      </p>
      <TablaKardex filas={res.filas} mostrarBodega={mostrarBodega} />
      <Pagination total={res.totalFilas} pageSize={pageSize} />
    </div>
  )
}

function Kpi({
  etiqueta,
  valor,
  tono = 'default',
}: {
  etiqueta: string
  valor: number
  tono?: 'default' | 'emerald' | 'rose' | 'primary'
}) {
  const clases = {
    default: '',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300',
    primary: 'border-primary/30 bg-primary/5 text-primary',
  }[tono]

  return (
    <div className={`rounded-lg border p-3 ${clases}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{etiqueta}</p>
      <p className="text-xl font-black tabular-nums mt-0.5">
        {valor.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export default async function StockHistoricoPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const sp = await searchParams
  const { user } = await verifySession()

  const bodegasPermitidas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)

  // ── Filtros normalizados (URL = estado) ──
  const alcance: 'bodega' | 'ciudad' | 'todas' =
    sp.alcance === 'bodega' || sp.alcance === 'ciudad' ? sp.alcance : 'todas'
  const vista: 'corte' | 'kardex' = sp.vista === 'kardex' ? 'kardex' : 'corte'
  const fechaCorte = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? '') ? (sp.fecha as string) : finDeMesAnterior()
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(sp.desde ?? '') ? (sp.desde as string) : primerDiaDe(fechaCorte)
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta ?? '') ? (sp.hasta as string) : fechaCorte
  const q = sp.q?.trim() || undefined
  const page = Math.max(parseInt(sp.page ?? '1', 10) || 1, 1)

  // ── Alcance → bodegas efectivas ──
  let bodegasEfectivas: BodegaRow[] = bodegasPermitidas
  if (alcance === 'ciudad' && sp.ciudad) {
    const cd = sp.ciudad.trim().toUpperCase()
    bodegasEfectivas = bodegasPermitidas.filter((b) => ciudadDe(b) === cd)
  } else if (alcance === 'bodega' && sp.bodega) {
    const id = parseInt(sp.bodega, 10)
    bodegasEfectivas = bodegasPermitidas.filter((b) => b.id === id)
  }

  const bodegaIds = bodegasEfectivas.map((b) => b.id)
  // Con más de una bodega en el alcance hay que mostrar la columna (si no, filas indistinguibles).
  const mostrarBodega = bodegaIds.length > 1

  // Modo de la vista de corte: individual (1 bodega) o agrupado (matriz).
  const modoCorte: 'individual' | 'agrupado' = bodegaIds.length > 1 ? 'agrupado' : 'individual'
  // En "general" las columnas son ciudades (legible); en una ciudad, las bodegas.
  const columnasPor: 'bodega' | 'ciudad' = alcance === 'todas' ? 'ciudad' : 'bodega'

  return (
    <div className="space-y-4 pb-12">
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Stock Histórico</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Stock al cierre de una fecha por bodega o ciudad, y los movimientos confirmados del periodo
            </p>
          </div>
        </div>
        <HistoricoExcelButton
          vista={vista}
          fechaCorte={fechaCorte}
          desde={desde}
          hasta={hasta}
          bodegaId={alcance === 'bodega' ? parseInt(sp.bodega ?? '', 10) || null : null}
          ciudad={alcance === 'ciudad' ? sp.ciudad ?? null : null}
        />
      </div>

      {/* ── Filtros (client, nunca se desmontan) ── */}
      <HistoricoFiltros
        bodegas={bodegasPermitidas}
        fechaCorte={fechaCorte}
        alcance={alcance}
        vista={vista}
        desde={desde}
        hasta={hasta}
      />

      {/* ── Datos (streamed) ── */}
      <Suspense fallback={<SkeletonHistorico />}>
        {vista === 'kardex' ? (
          <HistorialKardex
            desde={desde}
            hasta={hasta}
            bodegaIds={bodegaIds}
            bodegas={bodegasEfectivas}
            q={q}
            page={page}
            pageSize={PAGE_SIZE}
            mostrarBodega={mostrarBodega}
          />
        ) : (
          <HistorialCorte
            fechaCorte={fechaCorte}
            bodegaIds={bodegaIds}
            bodegas={bodegasEfectivas}
            q={q}
            page={page}
            pageSize={PAGE_SIZE}
            modo={modoCorte}
            columnasPor={columnasPor}
          />
        )}
      </Suspense>
    </div>
  )
}
