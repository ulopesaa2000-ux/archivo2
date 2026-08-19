// app/(admin)/dashboard/components/DashboardHeaderControls.tsx
'use client'

import { useTransition, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DashboardView, DashboardPeriod } from '@/modules/dashboard/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Package, 
  ShoppingCart, 
  LayoutDashboard, 
  Calendar, 
  CalendarDays, 
  RotateCcw, 
  RefreshCw, 
  Warehouse,
  CheckCircle2,
  Shirt
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardHeaderControlsProps {
  vistaActual: DashboardView
  periodoActual: DashboardPeriod
  bodegaNombre: string
  bodegaId: number
}

export function DashboardHeaderControls({
  vistaActual,
  periodoActual,
  bodegaNombre,
  bodegaId,
}: DashboardHeaderControlsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })

  function handleViewChange(nuevaVista: DashboardView) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('vista', nuevaVista)
    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`, { scroll: false })
    })
  }

  function handlePeriodChange(nuevoPeriodo: DashboardPeriod) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', nuevoPeriodo)
    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`, { scroll: false })
    })
  }

  function handleManualRefresh() {
    startTransition(() => {
      router.refresh()
      const nowStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setLastUpdated(nowStr)
      toast.success('Métricas del dashboard actualizadas con éxito.', {
        description: `Datos sincronizados a las ${nowStr}`,
      })
    })
  }

  const views = [
    { key: 'comercial', label: 'Comercial B2B', icon: Building2 },
    { key: 'inventario', label: 'Inventario & Bodegas', icon: Package },
    { key: 'catalogo', label: 'Catálogo & Stock', icon: Shirt },
    { key: 'ecommerce', label: 'E-commerce & Tienda', icon: ShoppingCart },
    { key: 'general', label: 'Vista 360°', icon: LayoutDashboard },
  ] as const

  const periods = [
    { key: 'semana', label: 'Esta Semana', icon: Calendar },
    { key: 'mes', label: 'Este Mes', icon: CalendarDays },
    { key: 'todo', label: 'Histórico', icon: RotateCcw },
  ] as const

  return (
    <div className="space-y-4">
      {/* Barra superior de controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
        
        {/* Selector de Perspectiva (Pastillas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {views.map((v) => {
            const Icon = v.icon
            const isActive = vistaActual === v.key

            return (
              <button
                key={v.key}
                type="button"
                onClick={() => handleViewChange(v.key)}
                disabled={isPending}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 outline-none select-none',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                <span>{v.label}</span>
              </button>
            )
          })}
        </div>

        {/* Controles de Período y Actualización */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
          
          {/* Selector de Período */}
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border">
            {periods.map((p) => {
              const Icon = p.icon
              const isActive = periodoActual === p.key

              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePeriodChange(p.key)}
                  disabled={isPending}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={`Filtrar por ${p.label.toLowerCase()}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              )
            })}
          </div>

          {/* Botón de Actualización Manual */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isPending}
            className="h-9 px-3 rounded-xl gap-2 font-semibold text-xs shrink-0 hover:bg-muted/80 shadow-xs"
            title="Sincronizar y actualizar dashboard"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isPending && 'animate-spin text-primary')} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Barra de Contexto y Bodega Activa */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-primary" />
          <span>Filtro de Bodega:</span>
          <Badge variant="outline" className="font-bold border-primary/30 text-primary bg-primary/5">
            {bodegaNombre}
          </Badge>
          {bodegaId > 0 && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              (Sincronizado con el selector del encabezado)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Última sincronización: <strong>{lastUpdated}</strong></span>
        </div>
      </div>
    </div>
  )
}
