// app/(admin)/dashboard/page.tsx
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { 
  fetchInventarioDashboardData, 
  fetchEcommerceDashboardData, 
  fetchComercialDashboardData,
  fetchCatalogoDashboardData
} from '@/modules/dashboard/queries'
import type { DashboardView, DashboardPeriod } from '@/modules/dashboard/types'
import { DashboardHeaderControls } from './components/DashboardHeaderControls'
import { DashboardComercialView } from './components/DashboardComercialView'
import { DashboardInventarioView } from './components/DashboardInventarioView'
import { DashboardCatalogoView } from './components/DashboardCatalogoView'
import { DashboardEcommerceView } from './components/DashboardEcommerceView'
import { DashboardGeneralView } from './components/DashboardGeneralView'

export const metadata: Metadata = {
  title: 'Panel de Control | inv-tienda',
  description: 'Dashboard operativo multi-perspectiva (Comercial, Inventario, Catálogo, Ecommerce)',
}

interface DashboardPageProps {
  searchParams: Promise<{
    vista?: string
    periodo?: string
    bodega_id?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  const nivel = user.rol?.nivel_acceso ?? 99
  const isB2B = nivel === 4 || nivel === 5

  // 1. Obtener bodegas asignadas al usuario
  const bodegas = await fetchBodegasUsuario(user.id, nivel)

  // 2. Determinar bodega activa desde cookie o parámetro
  const cookieStore = await cookies()
  const rawCookie = cookieStore.get('bodega_activa_id')?.value
  const cookieBodegaId = rawCookie ? parseInt(rawCookie, 10) || 0 : 0
  const bodegaId = params.bodega_id ? parseInt(params.bodega_id, 10) : cookieBodegaId

  const bodegaActual = bodegaId === 0 
    ? { nombre: 'Todas las bodegas', id: 0 } 
    : (bodegas.find(b => b.id === bodegaId) ?? { nombre: 'Todas las bodegas', id: 0 })

  // 3. Determinar Vista y Período
  const vistaValida: DashboardView[] = ['comercial', 'inventario', 'catalogo', 'ecommerce', 'general']
  const periodoValido: DashboardPeriod[] = ['semana', 'mes', 'todo']

  // Si es B2B arranca siempre en 'comercial', si no lee el query param o por defecto 'comercial'
  const defaultVista: DashboardView = isB2B ? 'comercial' : 'comercial'
  const vista: DashboardView = (params.vista && vistaValida.includes(params.vista as DashboardView))
    ? (params.vista as DashboardView)
    : defaultVista

  const periodo: DashboardPeriod = (params.periodo && periodoValido.includes(params.periodo as DashboardPeriod))
    ? (params.periodo as DashboardPeriod)
    : 'semana'

  // 4. Cargar datos según la vista solicitada (o todas si es 360)
  let inventarioData = null
  let catalogoData = null
  let ecommerceData = null
  let comercialData = null

  if (vista === 'inventario' || vista === 'general') {
    inventarioData = await fetchInventarioDashboardData({
      periodo,
      bodegaId,
      bodegasUsuario: bodegas,
    })
  }

  if (vista === 'catalogo' || vista === 'general') {
    catalogoData = await fetchCatalogoDashboardData({
      bodegaId,
      bodegasUsuario: bodegas,
    })
  }

  if (vista === 'ecommerce' || vista === 'general') {
    ecommerceData = await fetchEcommerceDashboardData({
      periodo,
    })
  }

  if (vista === 'comercial' || vista === 'general') {
    comercialData = await fetchComercialDashboardData({
      user,
    })
  }

  return (
    <div className="space-y-6">
      {/* Saludo Personalizado */}
      <div className="flex flex-col gap-1 p-5 sm:p-6 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          ¡Hola, {user.nombre_completo}!
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isB2B
            ? `Portal de ${user.persona?.tipo_entidad ?? 'Operaciones'} · Consulta órdenes, contenedores y despachos en tiempo real.`
            : `Panel de control corporativo · Rol: ${user.rol?.nombre ?? 'Sin Rol'} · Monitoreo y analítica operativa.`}
        </p>
      </div>

      {/* Selector de Perspectivas, Período y Bodega */}
      {!isB2B && (
        <DashboardHeaderControls
          vistaActual={vista}
          periodoActual={periodo}
          bodegaNombre={bodegaActual.nombre}
          bodegaId={bodegaId}
        />
      )}

      {/* Renderizado de la Perspectiva Seleccionada */}
      {vista === 'comercial' && comercialData && (
        <DashboardComercialView data={comercialData} nivel={nivel} />
      )}

      {vista === 'inventario' && inventarioData && (
        <DashboardInventarioView data={inventarioData} periodo={periodo} />
      )}

      {vista === 'catalogo' && catalogoData && (
        <DashboardCatalogoView data={catalogoData} />
      )}

      {vista === 'ecommerce' && ecommerceData && (
        <DashboardEcommerceView data={ecommerceData} periodo={periodo} />
      )}

      {vista === 'general' && comercialData && inventarioData && ecommerceData && (
        <DashboardGeneralView
          comercial={comercialData}
          inventario={inventarioData}
          ecommerce={ecommerceData}
          catalogo={catalogoData ?? undefined}
          periodo={periodo}
        />
      )}
    </div>
  )
}
