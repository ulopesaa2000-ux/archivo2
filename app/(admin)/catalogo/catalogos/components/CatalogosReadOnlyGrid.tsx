// app/(admin)/catalogo/catalogos/components/CatalogosReadOnlyGrid.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ADMIN_ROUTES, ESTADO_PRODUCTO_COLORS } from '@/lib/constants'
import { formatCurrency, cn } from '@/lib/utils'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import type { ProductoListItem } from '@/modules/catalogo/types'
import { Star, Eye, Package } from 'lucide-react'
import { DestacadoStarButton } from '../../components/DestacadoStarButton'
import { ShareProductoButton } from '../../components/ShareProductoButton'

interface Props {
  productos: ProductoListItem[]
}

export function CatalogosReadOnlyGrid({ productos }: Props) {
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-muted-foreground gap-3">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-8 w-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">No se encontraron productos</p>
          <p className="text-xs opacity-70 mt-1">Ajusta los filtros de búsqueda</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
      {productos.map((producto) => {
        const estadoColor = ESTADO_PRODUCTO_COLORS[producto.estado] ?? 'bg-gray-100 text-gray-800'

        return (
          <div
            key={producto.id}
            className="group relative rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/40"
          >
            {/* Imagen */}
            <Link href={ADMIN_ROUTES.catalogo.detalle(producto.id)} className="block">
              <div className="relative aspect-[3/4] bg-muted/40 dark:bg-slate-900/50 overflow-hidden">
                {producto.imagen_principal ? (
                  <Image
                    src={getSmartImagenUrl(producto.imagen_principal, 'card')}
                    alt={producto.nombre ?? producto.sku_base}
                    fill
                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}

                {/* Overlay acciones (solo "Ver detalle" con alto contraste) */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 p-2">
                  <div
                    className="h-8 px-3.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground backdrop-blur-md shadow-lg border border-white/20 dark:border-black/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver detalle</span>
                  </div>
                </div>

                {/* Botón interactivo destacado */}
                <div className="absolute top-2 left-2 z-10">
                  <DestacadoStarButton
                    id={producto.id}
                    initialDestacado={producto.destacado ?? false}
                    variant="grid"
                  />
                </div>

                {/* Acciones superiores derechas: Badge es_conjunto y Botón Compartir */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                  {producto.es_conjunto && (
                    <div className="flex items-center gap-1 bg-purple-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow-md border border-purple-400/30">
                      Conjunto
                    </div>
                  )}
                  <ShareProductoButton producto={producto} />
                </div>
              </div>
            </Link>

            {/* Info */}
            <div className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border-none', estadoColor)}>
                  {producto.estado}
                </Badge>
                {!producto.activo && (
                  <Badge variant="outline" className="text-[10px] text-red-500 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40">
                    Inactivo
                  </Badge>
                )}
              </div>

              <Link
                href={ADMIN_ROUTES.catalogo.detalle(producto.id)}
                className="text-xs font-mono font-bold text-foreground hover:text-primary transition-colors block truncate"
              >
                {producto.sku_base}
              </Link>

              <div className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]" title={producto.descripcion ?? producto.nombre ?? ''}>
                {producto.descripcion ?? producto.nombre ?? '—'}
              </div>

              <div className="pt-1.5 flex items-center justify-between border-t border-border/50">
                <span className="text-sm font-bold text-foreground">
                  {producto.precio_ec != null ? formatCurrency(producto.precio_ec) : '—'}
                </span>
                {producto.pz_en_caja != null && (
                  <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                    {producto.pz_en_caja} pz/caja
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
