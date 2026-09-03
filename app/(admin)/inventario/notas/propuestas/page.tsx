// app/(admin)/inventario/notas/propuestas/page.tsx
import type { Metadata } from 'next'
import { fetchOcrPropuestas, fetchOcrPropuestasCounts, fetchBodegas } from '@/modules/inventario/queries'
import { verifySession } from '@/lib/dal'
import { OcrUploadModal } from './OcrUploadModal'
import { OcrSerialScannerModal } from '@/components/admin/OcrSerialScannerModal'
import { PropuestasTable } from './PropuestasTable'
import { PropuestasFilters } from './PropuestasFilters'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, History, Layers } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Propuestas OCR — Inventario',
}

function buildTabHref(targetEstado: string, sp: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  params.set('estado', targetEstado)
  if (sp.q) params.set('q', sp.q)
  if (sp.bodega_origen_id && sp.bodega_origen_id !== '_all') params.set('bodega_origen_id', sp.bodega_origen_id)
  if (sp.bodega_destino_id && sp.bodega_destino_id !== '_all') params.set('bodega_destino_id', sp.bodega_destino_id)
  if (sp.fecha_desde) params.set('fecha_desde', sp.fecha_desde)
  if (sp.fecha_hasta) params.set('fecha_hasta', sp.fecha_hasta)
  if (sp.sort_by && sp.sort_by !== 'fecha_escaneo') params.set('sort_by', sp.sort_by)
  if (sp.order && sp.order !== 'desc') params.set('order', sp.order)
  return `?${params.toString()}`
}

export default async function PropuestasOcrPage({
  searchParams,
}: {
  searchParams: Promise<{
    estado?: string
    page?: string
    q?: string
    bodega_origen_id?: string
    bodega_destino_id?: string
    fecha_desde?: string
    fecha_hasta?: string
    sort_by?: string
    order?: 'asc' | 'desc'
  }>
}) {
  // 1. Validar sesión
  const { user } = await verifySession()

  // 2. Restringir acceso exclusivamente a Super Admin Nivel 1
  if (user.rol?.nivel_acceso !== 1) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card/40 border border-muted/50 rounded-xl max-w-lg mx-auto shadow-sm">
        <Sparkles className="h-16 w-16 text-amber-500/50 stroke-[1.5]" />
        <h2 className="text-xl font-bold mt-4 text-foreground">Acceso Denegado</h2>
        <p className="text-sm mt-2 text-center max-w-sm px-6">
          La sección de Propuestas OCR está reservada exclusivamente para la administración general (Super Admin Nivel 1).
        </p>
        <Link
          href="/inventario/notas"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Volver a Notas de Inventario
        </Link>
      </div>
    )
  }

  const sp = await searchParams
  const estadoFiltro = sp.estado === 'REVISADO' ? 'REVISADO' : 'PENDIENTE_REVISION'
  const page = sp.page ? parseInt(sp.page, 10) : 1
  const sortBy = sp.sort_by || 'fecha_escaneo'
  const order = sp.order === 'asc' ? 'asc' : 'desc'

  const hasActiveFilters = Boolean(
    sp.q ||
    (sp.bodega_origen_id && sp.bodega_origen_id !== '_all') ||
    (sp.bodega_destino_id && sp.bodega_destino_id !== '_all') ||
    sp.fecha_desde ||
    sp.fecha_hasta ||
    (sortBy && sortBy !== 'fecha_escaneo') ||
    (order && order !== 'desc')
  )

  // 3. Fetch en paralelo de datos, conteos globales y bodegas
  const [{ propuestas, total }, counts, bodegas] = await Promise.all([
    fetchOcrPropuestas({
      estado: estadoFiltro,
      page,
      q: sp.q,
      bodega_origen_id: sp.bodega_origen_id,
      bodega_destino_id: sp.bodega_destino_id,
      fecha_desde: sp.fecha_desde,
      fecha_hasta: sp.fecha_hasta,
      sort_by: sortBy,
      order,
    }),
    fetchOcrPropuestasCounts(),
    fetchBodegas(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Propuestas OCR de Notas
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa, edita y aprueba las órdenes de movimiento digitalizadas mediante inteligencia artificial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/inventario/notas">
            <Button variant="outline" className="rounded-xl uppercase font-black text-[10px] tracking-wider h-10">
              Ver Historial de Notas
            </Button>
          </Link>
          <OcrSerialScannerModal />
          <OcrUploadModal />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-background/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Pendientes de Revisión</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-xl font-black font-mono leading-none">
                  {estadoFiltro === 'PENDIENTE_REVISION' && hasActiveFilters ? total : counts.pendientes}
                </p>
                {estadoFiltro === 'PENDIENTE_REVISION' && hasActiveFilters && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    filtradas de {counts.pendientes}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Revisadas / Historial</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-xl font-black font-mono leading-none">
                  {estadoFiltro === 'REVISADO' && hasActiveFilters ? total : counts.revisadas}
                </p>
                {estadoFiltro === 'REVISADO' && hasActiveFilters && (
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    filtradas de {counts.revisadas}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Filtro de Estado */}
      <Tabs value={estadoFiltro} className="w-full">
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2 rounded-xl">
          <TabsTrigger
            value="PENDIENTE_REVISION"
            render={<Link href={buildTabHref('PENDIENTE_REVISION', sp)} replace />}
            nativeButton={false}
            className="rounded-lg font-bold text-xs uppercase tracking-wider"
          >
            Pendientes ({counts.pendientes})
          </TabsTrigger>
          <TabsTrigger
            value="REVISADO"
            render={<Link href={buildTabHref('REVISADO', sp)} replace />}
            nativeButton={false}
            className="rounded-lg font-bold text-xs uppercase tracking-wider"
          >
            Procesadas ({counts.revisadas})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros y Búsqueda */}
      <PropuestasFilters
        bodegas={bodegas}
        sortBy={sortBy}
        order={order}
        estado={estadoFiltro}
      />

      {/* Tabla de Resultados */}
      <PropuestasTable
        propuestas={propuestas}
        total={total}
        page={page}
        estado={estadoFiltro}
        sortBy={sortBy}
        order={order}
      />
    </div>
  )
}
