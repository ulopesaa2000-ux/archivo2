// app/(admin)/dashboard/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import {
  ShoppingCart,
  Ship,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'
import { DashboardExpandableList } from './components/DashboardExpandableList'

export const metadata: Metadata = {
  title: 'Dashboard B2B',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  if (!user) {
    return null
  }

  const persona = user.persona
  const nivel = user.rol?.nivel_acceso ?? 99
  const isB2B = nivel === 4 || nivel === 5

  // 1. Consultas dinámicas filtradas por el alcance de la Persona
  let ordenesCount = 0
  let contenedoresCount = 0
  let cajasCount = 0
  let ultimasOrdenes: any[] = []
  let proximosContenedores: any[] = []

  try {
    if (nivel === 4 && persona) {
      // --- CLIENTE B2B (Andrés) ---
      // Conteo de órdenes activas (no completadas ni canceladas)
      const { data: ords } = await supabase
        .from('ordenes_b2b')
        .select('id, folio_proveedor, estado, fecha_orden, total_cajas, total_piezas, contenedor_id')
        .eq('cliente_b2b_id', persona.id)
        .neq('estado', 'Cancelada')
        .order('fecha_orden', { ascending: false })

      ultimasOrdenes = ords?.slice(0, 12) ?? []
      ordenesCount = ords?.filter(o => o.estado !== 'Completo').length ?? 0

      // Conteo de contenedores activos vinculados
      if (ords && ords.length > 0) {
        const contenedorIds = Array.from(new Set(ords.map(o => o.contenedor_id).filter(Boolean))) as number[]
        if (contenedorIds.length > 0) {
          const { data: conts } = await supabase
            .from('v_contenedor_resumen')
            .select('*')
            .in('contenedor_id', contenedorIds)
            .neq('estado', 'cerrado')
            .neq('estado', 'cancelado')

          proximosContenedores = conts?.slice(0, 12) ?? []
          contenedoresCount = conts?.length ?? 0
        }

        // Conteo de cajas pedidas en total
        cajasCount = ords.reduce((acc, o) => acc + (o.total_cajas || 0), 0)
      }
    } else if (nivel === 5 && persona) {
      // --- PROVEEDOR B2B (Moti) ---
      // Conteo de órdenes activas asignadas a este proveedor
      const { data: ords } = await supabase
        .from('ordenes_b2b')
        .select('id, folio_proveedor, estado, fecha_orden, total_cajas, total_piezas, contenedor_id')
        .eq('proveedor_id', persona.id)
        .neq('estado', 'Cancelada')
        .order('fecha_orden', { ascending: false })

      ultimasOrdenes = ords?.slice(0, 12) ?? []
      ordenesCount = ords?.filter(o => o.estado !== 'Completo').length ?? 0

      // Conteo de contenedores activos asignados
      if (ords && ords.length > 0) {
        const contenedorIds = Array.from(new Set(ords.map(o => o.contenedor_id).filter(Boolean))) as number[]
        if (contenedorIds.length > 0) {
          const { data: conts } = await supabase
            .from('v_contenedor_resumen')
            .select('*')
            .in('contenedor_id', contenedorIds)
            .neq('estado', 'cerrado')
            .neq('estado', 'cancelado')

          proximosContenedores = conts?.slice(0, 12) ?? []
          contenedoresCount = conts?.length ?? 0
        }

        // Conteo de cajas a fabricar
        cajasCount = ords.reduce((acc, o) => acc + (o.total_cajas || 0), 0)
      }
    } else {
      // --- GLOBAL (Admin, Diana) ---
      const [ordsRes, contsRes, cajasRes] = await Promise.all([
        supabase.from('ordenes_b2b').select('id, folio_proveedor, estado, fecha_orden, total_cajas, total_piezas, contenedor_id').neq('estado', 'Cancelada').order('created_at', { ascending: false }),
        supabase.from('v_contenedor_resumen').select('*').neq('estado', 'cerrado').neq('estado', 'cancelado'),
        supabase.from('cajas_producto').select('id', { count: 'exact' }),
      ])

      ultimasOrdenes = ordsRes.data?.slice(0, 12) ?? []
      ordenesCount = ordsRes.data?.filter(o => o.estado !== 'Completo').length ?? 0
      proximosContenedores = contsRes.data?.slice(0, 12) ?? []
      contenedoresCount = contsRes.data?.length ?? 0
      cajasCount = cajasRes.count ?? 0
    }
  } catch (error) {
    console.error('Error cargando métricas de dashboard:', error)
  }

  return (
    <div className="space-y-8">
      {/* Saludo Personalizado */}
      <div className="flex flex-col gap-2 p-6 rounded-2xl border bg-gradient-to-r from-primary/5 via-primary/0 to-transparent backdrop-blur-sm">
        <h1 className="text-3xl font-bold tracking-tight">
          ¡Bienvenido, {user.nombre_completo}!
        </h1>
        <p className="text-sm text-muted-foreground">
          {isB2B
            ? `Portal de ${persona?.tipo_entidad} · Gestiona tus órdenes, contenedores y despachos en tiempo real.`
            : `Panel de control corporativo · Rol: ${user.rol?.nombre ?? 'Sin Rol'}.`}
        </p>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Métricas: Órdenes */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {nivel === 5 ? 'Órdenes Asignadas' : 'Órdenes Pendientes'}
            </p>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold tracking-tight">{ordenesCount}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Órdenes activas en curso
            </p>
          </div>
        </div>

        {/* Métricas: Contenedores */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Contenedores en Tránsito
            </p>
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
              <Ship className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold tracking-tight">{contenedoresCount}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Embarques activos asignados
            </p>
          </div>
        </div>

        {/* Métricas: Cajas */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {nivel === 5 ? 'Cajas a Fabricar' : 'Total Cajas Solicitadas'}
            </p>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-extrabold tracking-tight">{cajasCount}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Producción de empaque total B2B
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Pendientes */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Columna A: Últimas Órdenes */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Últimas Órdenes B2B
            </h2>
            <Link
              href={ADMIN_ROUTES.ordenesB2B.lista}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DashboardExpandableList items={ultimasOrdenes} type="orders" />
        </div>

        {/* Columna B: Próximos Embarques */}
        <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Contenedores Asociados
            </h2>
            <Link
              href={ADMIN_ROUTES.contenedores.lista}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DashboardExpandableList items={proximosContenedores} type="containers" />
        </div>
      </div>
    </div>
  )
}
