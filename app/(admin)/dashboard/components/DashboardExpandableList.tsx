// app/(admin)/dashboard/components/DashboardExpandableList.tsx
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'

type OrderItem = {
  id: number
  folio_proveedor: string | null
  estado: string | null
  fecha_orden: string | null
  total_cajas: number | null
  total_piezas: number | null
}

type ContainerItem = {
  contenedor_id: number
  codigo_contenedor: string | null
  numero_contenedor: string | null
  estado: string | null
  fecha_eta: string | null
}

type DashboardExpandableListProps = {
  items: Array<any>
  type: 'orders' | 'containers'
}

const getOrderPriority = (estado: string | null): number => {
  if (!estado) return 99
  const e = estado.toLowerCase()
  if (e === 'pendiente') return 1
  if (e === 'borrador') return 2
  if (e === 'confirmada' || e === 'confirmado') return 3
  return 100 // Completo, Cancelada, etc.
}

const getContainerPriority = (estado: string | null): number => {
  if (!estado) return 99
  const e = estado.toLowerCase()
  if (e === 'en_aduana') return 1
  if (e === 'en_transito') return 2
  if (e === 'en_puerto') return 3
  if (e === 'borrador') return 4
  return 100 // surtido, cerrado, cancelado
}

export function DashboardExpandableList({ items, type }: DashboardExpandableListProps) {
  const [expanded, setExpanded] = useState(false)

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const prioA = type === 'orders' ? getOrderPriority(a.estado) : getContainerPriority(a.estado)
      const prioB = type === 'orders' ? getOrderPriority(b.estado) : getContainerPriority(b.estado)
      
      if (prioA !== prioB) return prioA - prioB

      // Si tienen la misma prioridad de estado, ordenar por fecha de forma descendente (más recientes primero)
      const timeA = type === 'orders' 
        ? new Date(a.fecha_orden || 0).getTime() 
        : new Date(a.fecha_eta || 0).getTime()
      const timeB = type === 'orders' 
        ? new Date(b.fecha_orden || 0).getTime() 
        : new Date(b.fecha_eta || 0).getTime()

      return timeB - timeA
    })
  }, [items, type])

  const visibleItems = expanded ? sortedItems : sortedItems.slice(0, 6)
  const hasMore = sortedItems.length > 6

  return (
    <div className="flex flex-col h-full">
      <div className="divide-y divide-border flex-1">
        {visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {type === 'orders' ? 'No hay órdenes registradas.' : 'Sin contenedores activos.'}
          </p>
        ) : (
          visibleItems.map((item) => {
            if (type === 'orders') {
              const ord = item as OrderItem
              return (
                <div key={ord.id} className="py-2.5 flex items-center justify-between hover:bg-muted/5 px-2 rounded-lg transition-colors">
                  <div className="space-y-0.5">
                    <Link href={ADMIN_ROUTES.ordenesB2B.detalle(ord.id)} className="text-sm font-semibold text-foreground hover:underline hover:text-primary transition-colors block">
                      {ord.folio_proveedor || `Orden #${ord.id}`}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {ord.total_cajas || 0} cajas · {ord.total_piezas || 0} piezas
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      ord.estado === 'Confirmada' || ord.estado === 'Confirmado'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : ord.estado === 'Pendiente'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {ord.estado}
                  </span>
                </div>
              )
            } else {
              const cont = item as ContainerItem
              return (
                <div key={cont.contenedor_id} className="py-2.5 flex items-center justify-between hover:bg-muted/5 px-2 rounded-lg transition-colors">
                  <div className="space-y-0.5">
                    <Link href={ADMIN_ROUTES.contenedores.detalle(cont.contenedor_id)} className="text-sm font-semibold text-foreground hover:underline hover:text-primary transition-colors block">
                      {cont.codigo_contenedor || cont.numero_contenedor || `Contenedor #${cont.contenedor_id}`}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      ETA: {cont.fecha_eta ? new Date(cont.fecha_eta).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) : 'Pendiente'}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      cont.estado === 'en_transito'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : cont.estado === 'en_aduana'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {cont.estado?.replace('_', ' ')}
                  </span>
                </div>
              )
            }
          })
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center pt-3 pb-1 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-all flex items-center justify-center gap-1 border-t border-dashed mt-2 shrink-0"
        >
          {expanded ? (
            <>
              Ver menos <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Ver más ({sortedItems.length - 6} más) <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
