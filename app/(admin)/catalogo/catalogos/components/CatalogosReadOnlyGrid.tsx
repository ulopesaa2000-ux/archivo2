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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {productos.map((producto) => {
        const estadoColor = ESTADO_PRODUCTO_COLORS[producto.estado] ?? 'bg-gray-100 text-gray-800'

        return (
          <div
            key={producto.id}
            className="group relative rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20"
          >
            {/* Imagen */}
            <Link href={ADMIN_ROUTES.catalogo.detalle(producto.id)} className="block">
              <div className="relative aspect-square bg-muted/30 overflow-hidden">
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

                {/* Overlay acciones (solo "Ver detalle" para operadores) */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <div
                    className="h-9 px-3 text-xs font-medium rounded-md gap-1.5 bg-white/95 text-foreground hover:bg-white flex items-center justify-center shadow-sm"
                  >
                    <Eye className="h-4 w-4" />
                    Ver detalle
                  </div>
                </div>

                {/* Badge destacado */}
                {producto.destacado && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400/95 text-amber-900 text-[10px] font-semibold rounded-full px-2 py-0.5 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-amber-900" />
                    Destacado
                  </div>
                )}

                {/* Badge es_conjunto */}
                {producto.es_conjunto && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-blue-500/95 text-white text-[10px] font-semibold rounded-full px-2 py-0.5 shadow-sm">
                    Conjunto
                  </div>
                )}
              </div>
            </Link>

            {/* Info */}
            <div className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Badge className={cn('text-[10px] font-medium rounded-full px-2 py-0.5', estadoColor)}>
                  {producto.estado}
                </Badge>
                {!producto.activo && (
                  <Badge variant="outline" className="text-[10px] text-red-500 border-red-200 bg-red-50">
                    Inactivo
                  </Badge>
                )}
              </div>

              <Link
                href={ADMIN_ROUTES.catalogo.detalle(producto.id)}
                className="text-xs font-mono text-primary font-semibold hover:underline block truncate"
              >
                {producto.sku_base}
              </Link>

              <div className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]" title={producto.descripcion ?? producto.nombre ?? ''}>
                {producto.descripcion ?? producto.nombre ?? '—'}
              </div>

              <div className="pt-1 flex items-center justify-between border-t border-muted/50 mt-1">
                <span className="text-sm font-semibold">
                  {producto.precio_ec != null ? formatCurrency(producto.precio_ec) : '—'}
                </span>
                {producto.pz_en_caja != null && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
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
