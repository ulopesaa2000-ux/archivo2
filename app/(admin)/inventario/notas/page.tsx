// app/(admin)/inventario/notas/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { fetchNotas, fetchCatalogosInventario, getNotasKPIsGlobales } from '@/modules/inventario/queries'
import { fetchUserTableConfig } from '@/modules/admin-table/config/queries'
import { getDefaultFeatures } from '@/modules/admin-table/config/defaults'
import { NotasFilters } from './NotasFilters'
import { NotasTable } from './NotasTable'
import { ReporteNotasButton } from './ReporteNotasButton'
import { Pagination } from '@/components/admin/Pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, RefreshCw, ArrowDownLeft, ArrowUpRight, Camera } from 'lucide-react'
import Link from 'next/link'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { FiltrosNotas } from '@/modules/inventario/types'
import { Card, CardContent } from '@/components/ui/card'

import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'

import { OcrSerialScannerModal } from '@/components/admin/OcrSerialScannerModal'

import { fetchConfigInventario } from '@/modules/inventario/config-queries'

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
    sort_by?: string
    order?: 'asc' | 'desc'
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
    sort_by: sp.sort_by || 'fecha_nota',
    order: (sp.order === 'asc' || sp.order === 'desc') ? sp.order : 'desc',
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
          <h3 className="text-xl font-black tracking-tight">Sin Bodegas Asignadas</h3>
          <p className="text-sm text-muted-foreground">
            No tienes bodegas vinculadas a tu cuenta para consultar notas. Contacta al administrador para que te asigne una bodega en la configuración.
          </p>
        </div>
      </div>
    )
  }

  // Cargar configuración de inventario para evaluar permisos y reglas
  const [config, tableConfig, catalogos, kpisGlobales] = await Promise.all([
    fetchConfigInventario(),
    fetchUserTableConfig('/inventario/notas'),
    fetchCatalogosInventario(),
    getNotasKPIsGlobales(bodegaActivaId && bodegaActivaId !== 0 ? String(bodegaActivaId) : null),
  ])

  const rolKey = user.rol?.id ? String(user.rol.id) : ''
  const nivelKey = String(user.rol?.nivel_acceso ?? 99)

  // Restricciones de bodegas para Nivel 3+ (Encargado y Bodeguero)
  if (!isSuperAdmin && !isAdminInventario) {
    filtros.limit_bodega_ids = userBodegas.map(b => b.id)
  }

  // Alcance de visión configurado para este rol (todas las notas de sus bodegas vs solo las creadas por el usuario)
  const alcanceVision =
    (rolKey && config?.alcance_vision_notas_por_rol?.[rolKey]) ||
    config?.alcance_vision_notas_por_rol?.[nivelKey] ||
    (user.rol?.nombre === 'Bodeguero' || user.rol?.id === 18 ? 'solo_propias' : 'todas_bodegas')

  if (alcanceVision === 'solo_propias' && !isSuperAdmin) {
    filtros.limit_usuario_id = user.id
  }

  const { notas, total } = await fetchNotas(filtros)

  // Tipos de movimiento permitidos según configuración de roles
  const defaultCodigo =
    (rolKey && config?.tipo_movimiento_default_por_rol?.[rolKey]) ||
    config?.tipo_movimiento_default_por_rol?.[nivelKey] ||
    config?.tipo_movimiento_default_general ||
    (user.rol?.id === 18 ? 'SAL' : 'ENT')

  const accionEliminar =
    (rolKey && config?.accion_eliminar_nota_por_rol?.[rolKey]) ||
    config?.accion_eliminar_nota_por_rol?.[nivelKey] ||
    (user.rol?.id === 18 ? 'solo_cancelar' : 'eliminar_soft')

  const allowedCodigos =
    (rolKey && config?.permisos_tipos_movimiento?.[rolKey]) ||
    config?.permisos_tipos_movimiento?.[nivelKey] ||
    (isSuperAdmin || isAdminInventario ? ['ENT', 'SAL', 'TRF', 'AJU', 'DEV'] : ['ENT', 'SAL', 'TRF'])

  const tiposMovimientoVisibles = catalogos.tiposMovimiento.filter((t) => {
    if (isSuperAdmin) return true

    // Si es devolución (DEV) y el usuario es Nivel 3+:
    if (t.codigo === 'DEV' && (user.rol?.nivel_acceso ?? 99) > 2) {
      const tienePermisoDevolucionIndividual = userBodegas.some((ub) => {
        const key = `${user.id}_${ub.id}`
        return config?.permisos_devolucion_usuario_bodega?.[key] === true
      })
      const permitidoPorRol = allowedCodigos.includes('DEV')
      if (!permitidoPorRol && !tienePermisoDevolucionIndividual) return false
    } else {
      if (!allowedCodigos.includes(t.codigo as any)) return false
    }

    // Si es traspaso (TRF) y el usuario es Nivel 3+, verificar si tiene asignada alguna bodega con permiso de transferir
    if (t.codigo === 'TRF' && (user.rol?.nivel_acceso ?? 99) > 2) {
      const tienePermisoTransferir = userBodegas.some(
        (ub) => (ub.permisos_bodega?.puede_transferir ?? (ub as any).puede_transferir) === true
      )
      if (!tienePermisoTransferir) return false
    }

    return true
  })

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
    <div className="space-y-5">
      {/* Header con Jerarquía Visual y Responsive */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Notas de Inventario
            </h1>
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
              {total}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Control de entradas, salidas, traslados y ajustes de existencias entre bodegas
          </p>
        </div>

        {/* Barra de Acciones Desktop */}
        <div className="hidden md:flex items-center justify-end gap-2.5">
          <ReporteNotasButton bodegas={catalogosFiltrados.bodegas} filtrosActuales={filtros} />

          <OcrSerialScannerModal
            tiposMovimiento={tiposMovimientoVisibles}
            defaultTipoCodigo={defaultCodigo}
            bodegas={catalogosFiltrados.bodegas}
            trigger={
              <Button
                variant="outline"
                className="h-10 px-4 rounded-xl text-sm font-bold gap-2 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all shadow-xs"
              >
                <Camera className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Fotos en Serie (OCR)</span>
                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                  IA
                </Badge>
              </Button>
            }
          />

          <Link href={ADMIN_ROUTES.inventario.notaNueva} className="shrink-0">
            <Button className="h-10 px-4 rounded-xl text-sm font-bold gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nueva Nota</span>
            </Button>
          </Link>
        </div>

        {/* Barra de Acciones Móvil (Solo Reporte arriba, creación en FABs flotantes) */}
        <div className="flex md:hidden items-center justify-center w-full">
          <ReporteNotasButton bodegas={catalogosFiltrados.bodegas} filtrosActuales={filtros} />
        </div>
      </div>

      {/* ── Botones Flotantes (FABs) para Versión Móvil ── */}
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-center gap-3 md:hidden">
        {/* Botón 1: Cámara / Fotos OCR */}
        <OcrSerialScannerModal
          tiposMovimiento={tiposMovimientoVisibles}
          defaultTipoCodigo={defaultCodigo}
          bodegas={catalogosFiltrados.bodegas}
          trigger={
            <button
              type="button"
              className="h-12 w-12 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-xl shadow-amber-500/25 flex items-center justify-center border-2 border-background transition-all"
              title="Fotos en Serie (OCR / IA)"
            >
              <Camera className="h-5 w-5 drop-shadow-xs" />
              <span className="sr-only">Escanear Notas con Cámara (OCR)</span>
            </button>
          }
        />

        {/* Botón 2: Nueva Nota (+) */}
        <Link href={ADMIN_ROUTES.inventario.notaNueva}>
          <button
            type="button"
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center border-2 border-background transition-all"
            title="Crear Nueva Nota"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
            <span className="sr-only">Nueva Nota</span>
          </button>
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
                {kpisGlobales.pendientes}
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
                {kpisGlobales.enProceso}
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
                {kpisGlobales.cajasIngresadas.toLocaleString('es-MX')}
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
                {kpisGlobales.cajasEgresadas.toLocaleString('es-MX')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros (Client, FIJOS) */}
      <NotasFilters catalogos={catalogosFiltrados} />

      {/* Tabla (Server, se re-renderiza) */}
      <NotasTable
        notas={notas}
        initialFeatures={features}
        bodegaFiltradaId={filtros.bodega_origen_id}
        sortKey={filtros.sort_by}
        sortOrder={filtros.order}
        accionEliminar={accionEliminar}
      />

      {/* Paginación */}
      <Pagination total={total} />
    </div>
  )
}
