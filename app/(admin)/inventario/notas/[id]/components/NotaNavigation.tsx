// app/(admin)/inventario/notas/[id]/components/NotaNavigation.tsx
'use client'

import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Warehouse } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { NavegacionNota, NavegacionNotaItem } from '@/modules/inventario/types'
import { cn } from '@/lib/utils'

type Props = {
  navegacion: NavegacionNota
}

function StatusIndicator({ item }: { item: NavegacionNotaItem }) {
  const isPend = item.estado_codigo === 'PEND' || item.estado_codigo === 'PROC'
  const isConf = item.estado_codigo === 'CONF'
  const isCanc = item.estado_codigo === 'CANC'

  // Si tiene formato N-YYYYMMDD-XXXX mostramos el folio corto (ej. "0087")
  const shortNumber = item.numero_nota.replace(/^N-\d{8}-/, '') || item.numero_nota

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded-md border transition-colors",
        isPend && "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        isConf && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        isCanc && "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        !isPend && !isConf && !isCanc && "bg-muted text-muted-foreground border-border"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full inline-block",
          isPend && "bg-amber-500 shadow-sm shadow-amber-500/50 animate-pulse",
          isConf && "bg-emerald-500 shadow-sm shadow-emerald-500/50",
          isCanc && "bg-rose-500",
          !isPend && !isConf && !isCanc && "bg-muted-foreground"
        )}
      />
      <span>{shortNumber}</span>
    </span>
  )
}

/**
 * Navegación contextual secuencial de notas de inventario.
 *
 * Muestra anterior / posición / siguiente con colores por estado:
 * - Amarillo/Ámbar: Pendientes (PEND/PROC)
 * - Verde/Esmeralda: Aceptadas/Confirmadas (CONF)
 * - Rojo/Gris: Canceladas (CANC)
 */
export function NotaNavigation({ navegacion }: Props) {
  const { posicion, total, anterior, siguiente, actual, bodega_filtro_nombre } = navegacion

  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-card/80 backdrop-blur-sm p-1 rounded-xl border shadow-sm">
      {/* Indicador de Filtro de Bodega Contextual si aplica */}
      {bodega_filtro_nombre && (
        <span
          className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-[11px] font-bold text-muted-foreground uppercase rounded-lg border mr-1"
          title={`Navegando notas en bodega activa: ${bodega_filtro_nombre}`}
        >
          <Warehouse className="h-3 w-3 text-primary" />
          <span className="max-w-[110px] truncate">{bodega_filtro_nombre}</span>
        </span>
      )}

      {/* Botón Anterior */}
      {anterior ? (
        <Link
          href={ADMIN_ROUTES.inventario.notaDetalle(anterior.id)}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            "h-8 px-2 rounded-lg gap-1 text-xs hover:bg-muted/80 transition-all group"
          )}
          title={`Nota Anterior: ${anterior.numero_nota} (${anterior.estado_nombre})`}
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden sm:inline">
            <StatusIndicator item={anterior} />
          </span>
        </Link>
      ) : (
        <Button variant="ghost" size="sm" disabled className="h-8 px-2 rounded-lg opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Posición actual / Total */}
      <div className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground font-mono tabular-nums">
        <span className="font-bold text-foreground">{posicion}</span>
        <span>/</span>
        <span>{total}</span>
      </div>

      {/* Botón Siguiente */}
      {siguiente ? (
        <Link
          href={ADMIN_ROUTES.inventario.notaDetalle(siguiente.id)}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            "h-8 px-2 rounded-lg gap-1 text-xs hover:bg-muted/80 transition-all group"
          )}
          title={`Nota Siguiente: ${siguiente.numero_nota} (${siguiente.estado_nombre})`}
        >
          <span className="hidden sm:inline">
            <StatusIndicator item={siguiente} />
          </span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <Button variant="ghost" size="sm" disabled className="h-8 px-2 rounded-lg opacity-40">
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
