// app/(admin)/inventario/stock/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fetchStockByBodega, fetchCatalogosInventario, fetchStockMatrix, fetchNotasPendientesPorBodega, fetchTotalesCajasPorBodegas } from '@/modules/inventario/queries'
import { StockFilters } from '@/app/(admin)/inventario/stock/StockFilters'
import { StockTable } from '@/app/(admin)/inventario/stock/StockTable'
import { StockMatrixFilters } from '@/app/(admin)/inventario/stock/StockMatrixFilters'
import { StockMatrixTable } from '@/app/(admin)/inventario/stock/StockMatrixTable'
import { StockPageHeader } from '@/app/(admin)/inventario/stock/StockPageHeader'
import { Pagination } from '@/components/admin/Pagination'
import { Warehouse, Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { FiltrosStock, FiltrosStockMatrix, StockMatrixItem } from '@/modules/inventario/types'
import type { BodegaRow } from '@/lib/types/tables'
import { ADMIN_ROUTES } from '@/lib/constants'
import { verifySession } from '@/lib/dal'
import { can as canUser, isSuperAdmin as checkSuperAdmin } from '@/lib/auth/permissions'
import { fetchBodegasUsuario } from '@/modules/auth/queries'
import { fetchConfigInventario } from '@/modules/inventario/config-queries'
import { sortBodegasWithConfig } from '@/modules/inventario/config-types'

export const metadata: Metadata = {
  title: 'Stock por Bodega',
}

type StockPageSearchParams = {
  q?: string
  marca_id?: string
  con_stock_cero?: string
  page?: string
  ciudades?: string | string[]
  bodegas?: string | string[]
  agrupar_por?: string
  modo?: string
  solo_afectados?: string
}

function parseArray(val: string | string[] | undefined): string[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

async function StockMatrixData({
  filtros,
  isNone,
  bodegas,
  bodegaActivaId,
  agruparPor,
  defaultAgrupacionConfig = 'ninguno',
  pageSize = 20,
  showImport = true,
}: {
  filtros: FiltrosStockMatrix
  isNone: boolean
  bodegas: BodegaRow[]
  bodegaActivaId: number
  agruparPor?: string
  defaultAgrupacionConfig?: string
  pageSize?: number
  showImport?: boolean
}) {
  let bodegasColumnas = bodegas
  if (!isNone) {
    if (filtros.ciudades && filtros.ciudades.length > 0) {
      bodegasColumnas = bodegasColumnas.filter((b) => filtros.ciudades!.includes(b.ciudad || 'sin_asignar'))
    }
    if (filtros.bodegas && filtros.bodegas.length > 0) {
      bodegasColumnas = bodegasColumnas.filter((b) => filtros.bodegas!.includes(b.id))
    }
  } else {
    bodegasColumnas = []
  }

  const stockMatrixPromise = isNone
    ? Promise.resolve({ items: [] as StockMatrixItem[], total: 0, totalNotasPendientes: 0 })
    : fetchStockMatrix(filtros, bodegas)

  const totalesCajasPromise = isNone || bodegasColumnas.length === 0
    ? Promise.resolve({} as Record<number, number>)
    : fetchTotalesCajasPorBodegas(bodegasColumnas.map((b) => b.id))

  const [res, totalesCajasRealesPorBodega] = await Promise.all([
    stockMatrixPromise,
    totalesCajasPromise,
  ])

  const items = isNone ? [] : res.items
  const total = isNone ? 0 : res.total
  const grandTotalCajas: number = Object.values(totalesCajasRealesPorBodega).reduce(
    (a: number, b: number) => a + b,
    0
  )
  const totalNotasPendientes = res.totalNotasPendientes ?? 0

  return (
    <div className="space-y-4">
      <StockPageHeader
        title="Stock Consolidado (Matriz)"
        subtitle={`Todas las bodegas disponibles — ${total} producto${total !== 1 ? 's' : ''}`}
        bodegas={bodegas}
        bodegaActivaId={bodegaActivaId}
        totalCajas={grandTotalCajas}
        showImport={showImport}
      />
      <StockMatrixFilters
        bodegas={bodegas}
        defaultAgrupacion={defaultAgrupacionConfig}
        totalNotasPendientes={totalNotasPendientes}
      />
      <StockMatrixTable
        items={items}
        bodegasColumnas={bodegasColumnas}
        total={total}
        agruparPor={agruparPor}
        totalesCajasRealesPorBodega={totalesCajasRealesPorBodega}
      />
      <Pagination total={total} pageSize={pageSize} />
    </div>
  )
}

async function StockNormalData({
  filtros,
  bodegas,
  bodegaActivaId,
  agruparPor,
  defaultAgrupacionConfig = 'ninguno',
  pageSize = 20,
  limiteNotasPendientes = 5,
  showImport = true,
}: {
  filtros: FiltrosStock
  bodegas: BodegaRow[]
  bodegaActivaId: number
  agruparPor?: string
  defaultAgrupacionConfig?: string
  pageSize?: number
  limiteNotasPendientes?: number
  showImport?: boolean
}) {
  const { items, total, totalCajas, totalCajasPronosticadas, totalNotasPendientes } = await fetchStockByBodega(
    bodegaActivaId,
    filtros
  )
  const bodegaActiva = bodegas.find((b) => b.id === bodegaActivaId)
  const isPronostico = filtros.modo === 'pronostico'

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <NotasPendientesPanel bodegaId={bodegaActivaId} limit={limiteNotasPendientes} />
      </Suspense>
      <StockPageHeader
        title={isPronostico ? 'Stock Pronosticado por Bodega' : 'Stock por Bodega'}
        subtitle={
          isPronostico
            ? `${bodegaActiva?.nombre ?? 'Bodega seleccionada'} — Proyección con notas pendientes (${total} producto${total !== 1 ? 's' : ''})`
            : `${bodegaActiva?.nombre ?? 'Bodega seleccionada'} — ${total} producto${total !== 1 ? 's' : ''}`
        }
        bodegas={bodegas}
        bodegaActivaId={bodegaActivaId}
        totalCajas={totalCajas}
        totalCajasPronosticadas={totalCajasPronosticadas}
        isPronostico={isPronostico}
        showImport={showImport}
      />
      <StockFilters
        defaultAgrupacion={defaultAgrupacionConfig}
        totalNotasPendientes={totalNotasPendientes}
      />
      <StockTable
        items={items}
        bodegaId={bodegaActivaId}
        agruparPor={agruparPor}
        bodegaNombre={bodegaActiva?.nombre}
      />
      <Pagination total={total} pageSize={pageSize} />
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando stock...
      </div>
    </div>
  )
}

/**
 * Panel de notas pendientes por aprobar, filtrado por bodega.
 */
async function NotasPendientesPanel({ bodegaId, limit = 5 }: { bodegaId: number; limit?: number }) {
  const notas = await fetchNotasPendientesPorBodega(bodegaId, limit)
  if (notas.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
        <AlertCircle className="h-4 w-4" />
        Notas pendientes por aprobar ({notas.length})
      </div>
      <div className="space-y-1">
        {notas.map((n) => (
          <a
            key={n.id}
            href={ADMIN_ROUTES.inventario.notaDetalle(n.id)}
            className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-amber-100/50 dark:hover:bg-amber-950/20 transition-colors group"
          >
            <span className="font-mono text-amber-700 dark:text-amber-400">{n.numero_nota}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {n.tipo_codigo}
            </Badge>
            <span className="flex-1 text-muted-foreground truncate">{n.observaciones ?? '—'}</span>
            <span className="text-muted-foreground">{n.total_cajas} cajas</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  )
}

async function StockPageContent({
  searchParams,
}: {
  searchParams: Promise<StockPageSearchParams>
}) {
  const { user } = await verifySession()
  const [userBodegas, cookieStore, sp, catalogos, config] = await Promise.all([
    fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99),
    cookies(),
    searchParams,
    fetchCatalogosInventario(),
    fetchConfigInventario(),
  ])
  const bodegaCookie = cookieStore.get('bodega_activa_id')?.value
  let bodegaActivaId = bodegaCookie ? parseInt(bodegaCookie, 10) : null

  const isSuperAdmin = user.rol?.nivel_acceso === 1
  const isAdminInventario = user.rol?.nombre === 'Admin Operativo Inventario'
  const isRestrictedUser = !isSuperAdmin && !isAdminInventario

  // Si es un rol restringido y no tiene bodegas asignadas, mostrar aviso
  if (isRestrictedUser && userBodegas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Warehouse className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm mt-4 font-medium">Sin bodegas asignadas en la matriz de permisos.</p>
      </div>
    )
  }

  // Verificar la bodega activa guardada (0 = "Todas las bodegas por default")
  if (bodegaActivaId !== null && bodegaActivaId !== 0) {
    const isAllowed = !isRestrictedUser || userBodegas.some((b) => b.id === bodegaActivaId)
    if (!isAllowed) {
      bodegaActivaId = 0
    }
  } else if (bodegaActivaId === null || isNaN(bodegaActivaId)) {
    bodegaActivaId = 0
  }

  // Bodegas permitidas para el usuario ordenadas según la configuración global
  const bodegasBase = isRestrictedUser ? userBodegas : catalogos.bodegas
  const bodegasPermitidas = sortBodegasWithConfig(bodegasBase, config)

  const configuredDefaultAgrupacion =
    config.agrupacion_default_stock === 'plano' ? 'ninguno' : (config.agrupacion_default_stock || 'familia')
  const defaultAgrupacion = sp.agrupar_por || configuredDefaultAgrupacion
  const pageSize = config.paginacion_stock_tamano || 20

  // Verificar si el rol del usuario tiene permisos de crear/editar en el módulo inventario_stock
  const canImport =
    checkSuperAdmin(user) ||
    canUser(user, 'inventario_stock', 'puede_crear') ||
    canUser(user, 'inventario_stock', 'puede_editar')

  if (bodegaActivaId === 0) {
    const rawBodegas = parseArray(sp.bodegas)
    const rawCiudades = parseArray(sp.ciudades)
    const isNoneBodegas = rawBodegas.length === 1 && rawBodegas[0] === 'none'
    const isNoneCiudades = rawCiudades.length === 1 && rawCiudades[0] === 'none'
    const isNone = isNoneBodegas || isNoneCiudades

    const filtros: FiltrosStockMatrix = {
      q: sp.q,
      con_stock_cero: sp.con_stock_cero ? sp.con_stock_cero === 'true' : config.mostrar_stock_cero_default,
      page: sp.page ? parseInt(sp.page) : 1,
      limit: pageSize,
      ciudades: rawCiudades.filter((v) => v !== 'none'),
      bodegas: rawBodegas.filter((v) => v !== 'none').map((v) => parseInt(v, 10)),
      modo: sp.modo === 'pronostico' ? 'pronostico' : 'fisico',
      solo_afectados: sp.solo_afectados === 'true',
    }

    return (
      <Suspense fallback={<StockSkeleton />}>
        <StockMatrixData 
          filtros={filtros} 
          isNone={isNone} 
          bodegas={bodegasPermitidas} 
          bodegaActivaId={bodegaActivaId} 
          agruparPor={defaultAgrupacion}
          defaultAgrupacionConfig={configuredDefaultAgrupacion}
          pageSize={pageSize}
          showImport={canImport}
        />
      </Suspense>
    )
  }

  const filtros: FiltrosStock = {
    q: sp.q,
    con_stock_cero: sp.con_stock_cero ? sp.con_stock_cero === 'true' : config.mostrar_stock_cero_default,
    page: sp.page ? parseInt(sp.page) : 1,
    limit: pageSize,
    modo: sp.modo === 'pronostico' ? 'pronostico' : 'fisico',
    solo_afectados: sp.solo_afectados === 'true',
  }

  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockNormalData 
        filtros={filtros} 
        bodegas={bodegasPermitidas} 
        bodegaActivaId={bodegaActivaId} 
        agruparPor={defaultAgrupacion}
        defaultAgrupacionConfig={configuredDefaultAgrupacion}
        pageSize={pageSize}
        limiteNotasPendientes={config.limite_notas_pendientes_panel}
        showImport={canImport}
      />
    </Suspense>
  )
}

export default function StockPage({
  searchParams,
}: {
  searchParams: Promise<StockPageSearchParams>
}) {
  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockPageContent searchParams={searchParams} />
    </Suspense>
  )
}
