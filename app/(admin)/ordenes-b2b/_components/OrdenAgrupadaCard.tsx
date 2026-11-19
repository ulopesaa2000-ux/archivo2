// app/(admin)/ordenes-b2b/_components/OrdenAgrupadaCard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Container,
  ExternalLink,
  Eye,
  Layers,
  Package,
  Pencil,
  Trash2,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Fecha } from '@/components/shared/Fecha'
import { cn } from '@/lib/utils'
import { ADMIN_ROUTES, ESTADO_ORDEN_B2B_COLORS } from '@/lib/constants'
import type { OrdenB2BListItem } from '@/modules/ordenes-b2b/types'

interface OrdenAgrupadaCardProps {
  orden: OrdenB2BListItem
  canEdit: boolean
  canDelete: boolean
  onEdit: (orden: OrdenB2BListItem) => void
  onDelete: (orden: OrdenB2BListItem) => void
}

export function OrdenAgrupadaCard({
  orden,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: OrdenAgrupadaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const estadoColor = ESTADO_ORDEN_B2B_COLORS[orden.estado ?? ''] ?? ''

  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-4 space-y-3 transition-colors hover:border-border/80">
      {/* ── Header de la Tarjeta ── */}
      <div className="flex items-start justify-between gap-2 border-b pb-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={ADMIN_ROUTES.ordenesB2B.detalle(orden.id)}
              className="font-mono font-bold text-sm tracking-tight text-primary hover:underline"
            >
              #{orden.id}
            </Link>
            {orden.folio_proveedor && (
              <span
                className="font-mono text-xs font-medium text-foreground truncate max-w-[180px]"
                title={orden.folio_proveedor}
              >
                {orden.folio_proveedor}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="secondary"
            className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full', estadoColor)}
          >
            {orden.estado ?? '—'}
          </Badge>

          <Link
            href={ADMIN_ROUTES.ordenesB2B.detalle(orden.id)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Ver detalle"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>

          {canEdit && (
            <button
              type="button"
              title="Editar orden"
              onClick={() => onEdit(orden)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              title="Desactivar orden (Eliminar)"
              onClick={() => onDelete(orden)}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid 2 Columnas de Atributos Principales ── */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Proveedor */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Proveedor
            </span>
            <span
              className="font-bold text-foreground truncate block"
              title={orden.proveedor_nombre ?? '—'}
            >
              {orden.proveedor_nombre ?? '—'}
            </span>
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Fecha
            </span>
            <span className="font-medium text-foreground text-[11px] block truncate">
              <Fecha valor={orden.fecha_orden} formato="fecha" />
            </span>
          </div>
        </div>

        {/* Cajas */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Cajas
            </span>
            <span className="font-bold font-mono tabular-nums text-foreground block">
              {(orden.total_cajas ?? 0).toLocaleString('es-MX')}
            </span>
          </div>
        </div>

        {/* Piezas */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">
              Piezas
            </span>
            <span className="font-bold font-mono tabular-nums text-foreground block">
              {(orden.total_piezas ?? 0).toLocaleString('es-MX')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Footer: Cliente B2B + Toggle Detalles ── */}
      <div className="pt-2 border-t flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/60 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground block font-medium">
              Cliente B2B
            </span>
            <span
              className="font-semibold text-foreground truncate block"
              title={orden.cliente_nombre ?? 'Interno / S.I.'}
            >
              {orden.cliente_nombre ?? 'Interno / S.I.'}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="h-8 text-xs font-bold gap-1 rounded-xl shrink-0"
        >
          <span>{isExpanded ? 'Ocultar' : 'Ver detalles'}</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* ── Panel Expandido (Detalles extra) ── */}
      {isExpanded && (
        <div className="pt-3 border-t space-y-3">
          <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-muted text-muted-foreground shrink-0">
                  <Container className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    Orden #{orden.id} {orden.folio_proveedor ? `· ${orden.folio_proveedor}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Proveedor: {orden.proveedor_nombre ?? '—'}
                  </p>
                </div>
              </div>

              <Link
                href={ADMIN_ROUTES.ordenesB2B.detalle(orden.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                Ver Ficha Completa
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/60">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
                  Contenedor
                </span>
                {orden.contenedor_codigo && orden.contenedor_id ? (
                  <Link
                    href={ADMIN_ROUTES.contenedores.detalle(orden.contenedor_id)}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {orden.contenedor_codigo}
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin asignar</span>
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
                  CBM Orden
                </span>
                <span className="font-semibold tabular-nums block">
                  {orden.cbm_orden !== null && orden.cbm_orden !== undefined
                    ? Number(orden.cbm_orden).toFixed(4)
                    : '—'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
                  Moneda / TC
                </span>
                <span className="font-semibold block">
                  {orden.moneda}{' '}
                  {orden.tipo_cambio ? `(TC: ${orden.tipo_cambio})` : ''}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
                  Cliente B2B
                </span>
                <span className="font-semibold block truncate">
                  {orden.cliente_nombre ?? 'Interno / S.I.'}
                </span>
              </div>

              <div className="col-span-2 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
                  Observaciones
                </span>
                <p className="text-muted-foreground italic text-xs leading-relaxed">
                  {orden.observaciones?.trim() ? orden.observaciones : 'Sin anotaciones.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
