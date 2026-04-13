'use client'

// app/(admin)/catalogo/[id]/components/ProductoNavigation.tsx
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'

type Props = {
  navegacion: {
    posicion: number
    total: number
    id_anterior: number | null
    sku_anterior: string | null
    id_siguiente: number | null
    sku_siguiente: string | null
  }
}

/**
 * Navegación prev/next entre productos.
 * 
 * fn_navegar_producto ordena alfabéticamente por sku_base.
 * Los links usan ID para la URL (seguro con cualquier SKU).
 * El texto muestra sku_base (legible para el usuario).
 */
export function ProductoNavigation({ navegacion }: Props) {
  const { posicion, total, id_anterior, sku_anterior, id_siguiente, sku_siguiente } = navegacion

  return (
    <div className="flex items-center gap-2">
      {/* Anterior */}
      {id_anterior ? (
        <Link href={ADMIN_ROUTES.catalogo.detalle(id_anterior)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline font-mono text-xs">
            {sku_anterior}
          </span>
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Posición */}
      <span className="text-xs text-muted-foreground tabular-nums px-2">
        {posicion} / {total}
      </span>

      {/* Siguiente */}
      {id_siguiente ? (
        <Link href={ADMIN_ROUTES.catalogo.detalle(id_siguiente)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <span className="hidden sm:inline font-mono text-xs">
            {sku_siguiente}
          </span>
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Link>
      ) : (
        <Button variant="outline" size="sm" disabled>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
