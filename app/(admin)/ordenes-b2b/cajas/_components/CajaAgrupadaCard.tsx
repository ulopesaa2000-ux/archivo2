// app/(admin)/ordenes-b2b/cajas/_components/CajaAgrupadaCard.tsx
'use client'

import Link from 'next/link'
import { Box, Building2, Container, Eye, Layers, Palette, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { CajaListItem } from '@/modules/ordenes-b2b/types'
import { CajaProductoQuickEdit } from '../components/CajaProductoQuickEdit'

interface CajaAgrupadaCardProps {
  caja: CajaListItem
  canEdit: boolean
  showContenedores?: boolean
  onOpenDetalle: (cajaId: number) => void
}

export function CajaAgrupadaCard({
  caja,
  canEdit,
  showContenedores = false,
  onOpenDetalle,
}: CajaAgrupadaCardProps) {
  const contenedores = caja.contenedores_vinculados ?? []
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-3.5 space-y-2.5 transition-colors hover:border-border/80">
      {/* ── Header: Código de caja + Contenedor(es) + Ojo detalle ── */}
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="font-mono text-xs font-bold tracking-tight text-foreground truncate">
            {caja.codigo_caja}
          </span>
          {showContenedores &&
            contenedores.map((cont) => (
              <Link
                key={cont.id}
                href={ADMIN_ROUTES.contenedores.detalle(cont.id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-semibold hover:bg-primary/20 transition-colors shrink-0"
                title={`Ver contenedor ${cont.codigo}`}
              >
                <Container className="h-2.5 w-2.5" />
                <span>{cont.codigo}</span>
              </Link>
            ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => onOpenDetalle(caja.id)}
          title="Ver detalle de caja"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Producto / SKU (editable inline) ── */}
      <div className="min-w-0">
        <CajaProductoQuickEdit
          cajaId={caja.id}
          codigoCaja={caja.codigo_caja}
          productoId={caja.producto_id}
          productoSku={caja.producto_sku}
          productoNombre={caja.producto_nombre}
          canEdit={canEdit}
        />
      </div>

      {/* ── Grid 2x2 compacto con info básica ── */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-wider leading-none">
              Pz/Caja
            </span>
            <span className="font-bold font-mono tabular-nums text-foreground block mt-0.5">
              {caja.piezas_por_caja ?? '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Box className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-wider leading-none">
              CBM
            </span>
            <span className="font-bold font-mono tabular-nums text-foreground block mt-0.5">
              {caja.cbm !== null && caja.cbm !== undefined ? Number(caja.cbm).toFixed(3) : '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-wider leading-none">
              Proveedor
            </span>
            <span
              className="font-medium text-foreground truncate block mt-0.5"
              title={caja.proveedor_nombre ?? '—'}
            >
              {caja.proveedor_nombre ?? '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-muted/80 dark:bg-zinc-800 text-muted-foreground shrink-0">
            {caja.tallas ? <Ruler className="h-3.5 w-3.5" /> : <Palette className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-muted-foreground block uppercase tracking-wider leading-none">
              Tallas / Color
            </span>
            <span
              className="font-medium text-foreground truncate block mt-0.5"
              title={[caja.tallas, caja.colores].filter(Boolean).join(' · ') || '—'}
            >
              {[caja.tallas, caja.colores].filter(Boolean).join(' · ') || '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
