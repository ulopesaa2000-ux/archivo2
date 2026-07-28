// app/(admin)/inventario/notas/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fetchNotas, fetchCatalogosInventario } from '@/modules/inventario/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { NotasFilters } from './NotasFilters'
import { NotasTable } from './NotasTable'
import { ReporteNotasButton } from './ReporteNotasButton'
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
    ciudad?: string
    fecha_desde?: string
    fecha_hasta?: string
    page?: string
  }>
}) {
  const { user } = await verifySession()
  const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)

  const isSuperAdmin = user.rol?.nivel_acceso === 1
  const isAdminInventario = user.rol?.nombre === 'Admin Operativo Inventario'

  const cookieStore = await cookies()
  const bodegaCookie = cookieStore.get('bodega_activa_id')?.value
  let bodegaActivaId = bodegaCookie ? parseInt(bodegaCookie, 10) : null

  // Verificar la bodega activa de la cookie (0 = "Todas las bodegas por default")
  if (bodegaActivaId !== null && bodegaActivaId !== 0) {
    const isAllowed = isSuperAdmin || isAdminInventario || userBodegas.some(b => b.id === bodegaActivaId)
    if (!isAllowed) {
      bodegaActivaId = 0 // Caer a "Todas las bodegas" si la bodega guardada ya no es accesible
    }
  }

  const sp = await searchParams

  const bodegaOrigenIdParam = sp.bodega_origen_id ? parseInt(sp.bodega_origen_id) : undefined
  const bodegaOrigenIdFiltro = bodegaOrigenIdParam !== undefined 
    ? (bodegaOrigenIdParam === 0 ? undefined : bodegaOrigenIdParam)
    : (bodegaActivaId && bodegaActivaId !== 0 ? bodegaActivaId : undefined)
  
  const filtros: FiltrosNotas = {
    q: sp.q,
    tipo_movimiento_id: sp.tipo_movimiento_id
      ? parseInt(sp.tipo_movimiento_id)
      : undefined,
    estado_codigo: sp.estado_codigo,
    bodega_origen_id: bodegaOrigenIdFiltro,
    ciudad: sp.ciudad,
    fecha_desde: sp.fecha_desde,
    fecha_hasta: sp.fecha_hasta,
    page: sp.page ? parseInt(sp.page) : 1,
  }

  // Si es un rol restringido y no tiene bodegas asignadas, mostrar el Empty State amigable
  if (!isSuperAdmin && !isAdminInventario && userBodegas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border rounded-2xl bg-background p-8 text-center space-y-4 shadow-sm">
        <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full">
          <Clock className="h-10 w-10 animate-pulse" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Sin Bodegas Asignadas</h2>
          <p className="text-sm text-muted-foreground">
            No tienes bodegas asignadas en la matriz de permisos. Contacta a tu administrador para configurar tus accesos.
          </p>
        </div>
      </div>
    )
  }

  // Restricciones para Nivel 3+ (Encargado y Bodeguero)
  if (!isSuperAdmin && !isAdminInventario) {
    filtros.limit_bodega_ids = userBodegas.map(b => b.id)
    if (user.rol?.nombre === 'Bodeguero') {
      filtros.limit_usuario_id = user.id
    }
  }

  const [{ notas, total }, catalogos, tableConfig] = await Promise.all([
    fetchNotas(filtros),
    fetchCatalogosInventario(),
    fetchUserTableConfig('/inventario/notas'),
  ])

  // Filtrar catálogo de bodegas para nivel 3
  const activeBodegas = user.rol?.nivel_acceso !== undefined && user.rol.nivel_acceso > 2
    ? userBodegas
    : catalogos.bodegas

  const catalogosFiltrados = {
    ...catalogos,
    bodegas: activeBodegas,
    ciudades: Array.from(new Set(activeBodegas.map(b => b.ciudad).filter(Boolean))) as string[]
  }

  const features = {
    ...getDefaultFeatures('/inventario/notas'),
    ...tableConfig.config,
    expandable: true,
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
        <div className="flex items-center gap-2">
          <ReporteNotasButton bodegas={catalogosFiltrados.bodegas} filtrosActuales={filtros} />
          <Link href={ADMIN_ROUTES.inventario.notaNueva}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Nota
            </Button>
          </Link>
        </div>
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
      <NotasTable notas={notas} initialFeatures={features} bodegaFiltradaId={filtros.bodega_origen_id} />

      {/* Paginación */}
      <Pagination total={total} />
    </div>
  )
}
