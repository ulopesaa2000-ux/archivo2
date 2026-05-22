// app/(admin)/inventario/notas/page.tsx
import type { Metadata } from 'next'
import { fetchNotas, fetchCatalogosInventario } from '@/modules/inventario/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { NotasFilters } from './NotasFilters'
import { NotasTable } from './NotasTable'
import { Pagination } from '@/components/admin/Pagination'
import { Button } from '@/components/ui/button'
import { Plus, Clock, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { FiltrosNotas } from '@/modules/inventario/types'
import { Card, CardContent } from '@/components/ui/card'

import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'

export const metadata: Metadata = {
  title: 'Notas de Inventario',
}

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    tipo_movimiento_id?: string
    estado_codigo?: string
    bodega_origen_id?: string
    fecha_desde?: string
    fecha_hasta?: string
    page?: string
  }>
}) {
  const { user } = await verifySession()
  const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)

  const sp = await searchParams
  
  const filtros: FiltrosNotas = {
    q: sp.q,
    tipo_movimiento_id: sp.tipo_movimiento_id
      ? parseInt(sp.tipo_movimiento_id)
      : undefined,
    estado_codigo: sp.estado_codigo,
    bodega_origen_id: sp.bodega_origen_id
      ? parseInt(sp.bodega_origen_id)
      : undefined,
    fecha_desde: sp.fecha_desde,
    fecha_hasta: sp.fecha_hasta,
    page: sp.page ? parseInt(sp.page) : 1,
  }

  // Restricciones para Bodeguero (nivel > 2)
  if (user.rol?.nivel_acceso !== undefined && user.rol.nivel_acceso > 2) {
    filtros.limit_bodega_ids = userBodegas.map(b => b.id)
    filtros.limit_usuario_id = user.id
  }

  const [{ notas, total }, catalogos, tableConfig] = await Promise.all([
    fetchNotas(filtros),
    fetchCatalogosInventario(),
    fetchUserTableConfig('/inventario/notas'),
  ])

  // Filtrar catálogo de bodegas para nivel 3
  const catalogosFiltrados = {
    ...catalogos,
    bodegas: user.rol?.nivel_acceso !== undefined && user.rol.nivel_acceso > 2
      ? userBodegas
      : catalogos.bodegas
  }

  const features = {
    ...getDefaultFeatures('/inventario/notas'),
    ...tableConfig.config,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Notas de Inventario
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} nota{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href={ADMIN_ROUTES.inventario.notaNueva}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Nota
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background/50 border shadow-sm group hover:border-yellow-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Pendientes</p>
              <p className="text-xl font-black font-mono leading-none mt-1">
                {notas.filter(n => n.estado_codigo === 'PEND').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border shadow-sm group hover:border-blue-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">En Proceso</p>
              <p className="text-xl font-black font-mono leading-none mt-1">
                {notas.filter(n => n.estado_codigo === 'PROC').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border shadow-sm group hover:border-emerald-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Cajas Ingresadas</p>
              <p className="text-xl font-black font-mono leading-none mt-1">
                {notas.filter(n => n.estado_codigo === 'CONF' && n.tipo_codigo === 'ENT').reduce((acc, curr) => acc + (curr.total_cajas || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/50 border shadow-sm group hover:border-red-500/30 transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Cajas Egresadas</p>
              <p className="text-xl font-black font-mono leading-none mt-1">
                {notas.filter(n => n.estado_codigo === 'CONF' && n.tipo_codigo === 'SAL').reduce((acc, curr) => acc + (curr.total_cajas || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros (Client, FIJOS) */}
      <NotasFilters catalogos={catalogosFiltrados} />

      {/* Tabla (Server, se re-renderiza) */}
      <NotasTable notas={notas} initialFeatures={features} />

      {/* Paginación */}
      <Pagination total={total} />
    </div>
  )
}
