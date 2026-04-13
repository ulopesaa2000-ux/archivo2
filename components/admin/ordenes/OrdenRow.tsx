// components/admin/ordenes/OrdenRow.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { ADMIN_ROUTES, ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import { ChevronDown, ChevronRight, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type OrdenRowData = {
  id: number
  folio_proveedor: string | null
  estado: string | null
  moneda: string
  tipo_cambio: number | null
  total_cajas: number | null
  total_piezas: number | null
  cbm_orden: number | null
  observaciones: string | null
  fecha_orden: string | null
  contenedor_id?: number | null
  contenedor_codigo?: string | null
  proveedor_nombre: string | null
  cliente_nombre: string | null
}

interface OrdenRowProps {
  item: OrdenRowData
  isExpanded: boolean
  onToggle: (id: number) => void
  showContenedor?: boolean
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
}

export function OrdenRow({
  item,
  isExpanded,
  onToggle,
  showContenedor = true,
  onEdit,
  onDelete,
}: OrdenRowProps) {
  const estadoColor = ESTADO_ORDEN_B2B_COLORS[item.estado ?? ''] ?? ''

  return (
    <React.Fragment>
      <tr className="border-t hover:bg-muted/30 transition-colors">
        {/* Toggle de Expansión */}
        <td className="px-2 py-2">
          <button
            onClick={() => onToggle(item.id)}
            aria-label={isExpanded ? `Colapsar orden ${item.id}` : `Expandir orden ${item.id}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </td>

        {/* ID */}
        <td className="px-4 py-2 font-mono text-xs font-medium text-primary">
          <Link href={ADMIN_ROUTES.ordenesB2B.detalle(item.id)} className="hover:underline">
            #{item.id}
          </Link>
        </td>

        {/* Folio Proveedor */}
        <td className="px-4 py-2 font-mono text-xs">{item.folio_proveedor ?? '—'}</td>

        {/* Proveedor */}
        <td className="px-4 py-2 text-xs truncate max-w-[180px] font-medium" title={item.proveedor_nombre ?? ''}>
          {item.proveedor_nombre ?? '—'}
        </td>

        {/* Totales (Cajas/Piezas) */}
        <td className="px-4 py-2 text-center tabular-nums hidden lg:table-cell font-semibold">
          {item.total_cajas ?? 0}
        </td>
        <td className="px-4 py-2 text-center tabular-nums hidden lg:table-cell font-semibold">
          {item.total_piezas ?? 0}
        </td>

        {/* Fecha */}
        <td className="px-4 py-2 hidden sm:table-cell">
          <Fecha valor={item.fecha_orden} formato="fecha" className="text-xs text-muted-foreground" />
        </td>

        {/* Estado */}
        <td className="px-4 py-2">
          <Badge variant="secondary" className={cn("text-[10px]", estadoColor)}>
            {item.estado}
          </Badge>
        </td>

        {/* Acciones */}
        <td className="px-2 py-2">
          <div className="flex items-center gap-1 justify-end">
            <Link
              href={ADMIN_ROUTES.ordenesB2B.detalle(item.id)}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
              title="Ver detalle">
              <Eye className="h-3.5 w-3.5" />
            </Link>

            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      title="Más acciones"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44">
                  {onEdit && (
                    <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onEdit(item.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </td>
      </tr>

      {/* DETALLE EXPANDIDO */}
      {isExpanded && (
        <tr className="bg-muted/10 border-t">
          <td></td>
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Cliente B2B</span>
                <p className="font-semibold text-foreground truncate">{item.cliente_nombre ?? 'Interno / S.I.'}</p>
              </div>

              {showContenedor && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Contenedor</span>
                  {item.contenedor_codigo ? (
                    <Link href={ADMIN_ROUTES.contenedores.detalle(item.contenedor_id!)}
                      className="font-mono text-xs hover:underline text-primary flex items-center gap-1">
                      {item.contenedor_codigo}
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">CBM Orden</span>
                <p className="font-medium tabular-nums">{item.cbm_orden ?? '—'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Moneda / TC</span>
                <p className="font-semibold">{item.moneda} {item.tipo_cambio ? `(TC: ${item.tipo_cambio})` : ''}</p>
              </div>

              <div className="sm:col-span-2 lg:col-span-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Observaciones</span>
                <p className="text-muted-foreground italic text-xs leading-relaxed line-clamp-2" title={item.observaciones ?? ''}>
                  {item.observaciones ?? 'Sin anotaciones.'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  )
}
