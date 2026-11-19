// app/(admin)/ordenes-b2b/_components/VistaAgrupadaOrdenes.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Container,
  Layers,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'
import { cn } from '@/lib/utils'
import {
  ADMIN_ROUTES,
  ESTADO_CONTENEDOR_COLORS,
  ESTADO_CONTENEDOR_LABELS,
} from '@/lib/constants'
import { eliminarOrdenB2BAction } from '@/modules/ordenes-b2b/actions'
import type {
  CatalogosB2B,
  GrupoContenedorOrdenes,
  OrdenB2BListItem,
} from '@/modules/ordenes-b2b/types'
import { OrdenFormDialog } from '../OrdenFormDialog'
import { OrdenAgrupadaCard } from './OrdenAgrupadaCard'

interface VistaAgrupadaOrdenesProps {
  grupos: GrupoContenedorOrdenes[]
  totalGrupos: number
  totalOrdenes: number
  catalogos: CatalogosB2B
  canEdit: boolean
  canDelete: boolean
}

export function VistaAgrupadaOrdenes({
  grupos,
  totalGrupos,
  totalOrdenes,
  catalogos,
  canEdit,
  canDelete,
}: VistaAgrupadaOrdenesProps) {
  const router = useRouter()
  const [editingOrden, setEditingOrden] = useState<OrdenB2BListItem | null>(null)
  const [ordenAEliminar, setOrdenAEliminar] = useState<OrdenB2BListItem | null>(null)

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-muted-foreground gap-3">
        <ShoppingCart className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No se encontraron órdenes B2B para agrupar</p>
        <p className="text-xs text-muted-foreground">Prueba ajustando los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Banner Informativo de Agrupación por Contenedor */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {totalGrupos} contenedor{totalGrupos !== 1 ? 'es' : ''} agrupado{totalGrupos !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {totalOrdenes} orden{totalOrdenes !== 1 ? 'es' : ''} en total
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground/80 hidden md:inline">
          1 bloque por cada contenedor
        </span>
      </div>

      {/* Bloques por Contenedor */}
      <div className="space-y-4">
        {grupos.map((grupo) => (
          <ContenedorGrupoBlock
            key={grupo.contenedor_id ?? 'sin-contenedor'}
            grupo={grupo}
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={setEditingOrden}
            onDelete={setOrdenAEliminar}
          />
        ))}
      </div>

      {/* Modal Editar Orden */}
      {canEdit && editingOrden && (
        <OrdenFormDialog
          mode="edit"
          catalogos={catalogos}
          orden={editingOrden}
          open={Boolean(editingOrden)}
          onOpenChange={(open) => {
            if (!open) setEditingOrden(null)
          }}
        />
      )}

      {/* Modal Eliminar (Soft Delete) */}
      {ordenAEliminar && (() => {
        const hasContainer = Boolean(
          ordenAEliminar.contenedor_id || ordenAEliminar.contenedor_codigo
        )
        const containerStr = ordenAEliminar.contenedor_codigo
          ? `"${ordenAEliminar.contenedor_codigo}"`
          : ordenAEliminar.contenedor_id
          ? `#${ordenAEliminar.contenedor_id}`
          : ''

        return (
          <ConfirmDeleteModal
            isOpen={Boolean(ordenAEliminar)}
            onOpenChange={(open) => {
              if (!open) setOrdenAEliminar(null)
            }}
            title={
              hasContainer
                ? '¿Desactivar orden y desvincular de contenedor?'
                : '¿Desactivar orden B2B?'
            }
            elementName={`Orden #${ordenAEliminar.id} ${
              ordenAEliminar.folio_proveedor
                ? `(Folio: ${ordenAEliminar.folio_proveedor})`
                : ''
            } ${
              ordenAEliminar.proveedor_nombre
                ? `• ${ordenAEliminar.proveedor_nombre}`
                : ''
            }`}
            description={
              hasContainer
                ? `⚠️ ATENCIÓN: Esta orden está vinculada al contenedor ${containerStr}. Al desactivarla, SE DESVINCULARÁ automáticamente de dicho contenedor. Los detalles de productos y cajas asociadas se conservarán de manera segura en el historial.`
                : 'Esta orden de compra B2B se marcará como inactiva. Los detalles de productos y cajas asociadas se conservarán de manera segura en el historial.'
            }
            onConfirm={async () => {
              if (!ordenAEliminar) return
              const id = ordenAEliminar.id
              const res = await eliminarOrdenB2BAction(id)
              if (res.success) {
                toast.success(
                  hasContainer
                    ? `Orden #${id} desactivada y desvinculada del contenedor correctamente.`
                    : `Orden #${id} desactivada correctamente.`
                )
                router.refresh()
              } else {
                toast.error(res.error ?? 'No se pudo desactivar la orden.')
              }
            }}
          />
        )
      })()}
    </div>
  )
}

function ContenedorGrupoBlock({
  grupo,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  grupo: GrupoContenedorOrdenes
  canEdit: boolean
  canDelete: boolean
  onEdit: (orden: OrdenB2BListItem) => void
  onDelete: (orden: OrdenB2BListItem) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  const estadoContenedorColor = grupo.contenedor_estado
    ? ESTADO_CONTENEDOR_COLORS[grupo.contenedor_estado] ?? ''
    : ''
  const estadoContenedorLabel = grupo.contenedor_estado
    ? ESTADO_CONTENEDOR_LABELS[grupo.contenedor_estado] ?? grupo.contenedor_estado
    : null

  return (
    <section className="rounded-2xl border bg-muted/15 overflow-hidden">
      {/* Header del Bloque Contenedor */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg border bg-background text-muted-foreground hover:text-foreground transition-colors"
            title={collapsed ? 'Expandir órdenes' : 'Colapsar órdenes'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Container className="h-4 w-4" />
          </div>

          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {grupo.contenedor_id && grupo.contenedor_codigo ? (
              <Link
                href={ADMIN_ROUTES.contenedores.detalle(grupo.contenedor_id)}
                className="font-mono text-sm font-bold text-primary hover:underline"
              >
                {grupo.contenedor_codigo}
              </Link>
            ) : (
              <span className="text-sm font-bold text-muted-foreground">
                Sin contenedor asignado
              </span>
            )}

            {estadoContenedorLabel && (
              <Badge
                variant="secondary"
                className={cn('text-[11px] font-semibold', estadoContenedorColor)}
              >
                {estadoContenedorLabel}
              </Badge>
            )}

            {grupo.contenedor_fecha_eta && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                ETA: <Fecha valor={grupo.contenedor_fecha_eta} formato="fecha" />
              </span>
            )}
          </div>
        </div>

        {/* Métricas agregadas del contenedor */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <Badge variant="outline" className="font-semibold bg-background">
            {grupo.total_ordenes} orden{grupo.total_ordenes !== 1 ? 'es' : ''}
          </Badge>
          <span className="inline-flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
            <Package className="h-3.5 w-3.5" />
            <strong className="text-foreground">
              {grupo.total_cajas.toLocaleString('es-MX')}
            </strong>{' '}
            cajas
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground font-mono tabular-nums">
            <Layers className="h-3.5 w-3.5" />
            <strong className="text-foreground">
              {grupo.total_piezas.toLocaleString('es-MX')}
            </strong>{' '}
            pzas
          </span>
          {grupo.total_cbm > 0 && (
            <span className="text-muted-foreground font-mono tabular-nums hidden sm:inline">
              <strong className="text-foreground">{grupo.total_cbm.toFixed(2)}</strong> CBM
            </span>
          )}
        </div>
      </div>

      {/* Grid de Órdenes dentro del Contenedor */}
      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {grupo.ordenes.map((orden) => (
            <OrdenAgrupadaCard
              key={orden.id}
              orden={orden}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
