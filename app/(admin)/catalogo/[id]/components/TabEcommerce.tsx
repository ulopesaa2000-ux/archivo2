// app/(admin)/catalogo/[id]/components/TabEcommerce.tsx
import type { ProductoWebRow } from '@/lib/types/tables'
import { formatCurrency } from '@/lib/utils'
import { Fecha } from '@/components/shared/Fecha'
import { Badge } from '@/components/ui/badge'
import { Globe, ChevronDown } from 'lucide-react'

export function TabEcommerce({ web }: { web: ProductoWebRow | null }) {
  if (!web) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Globe className="h-4 w-4" />
        Este producto no está publicado en la tienda web.
      </div>
    )
  }

  return (
    <details className="group border rounded-lg p-2 mb-4">
      <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium py-2 hover:text-primary list-none [&::-webkit-details-marker]:hidden">
        <Globe className="h-4 w-4" />
        E-commerce / SEO
        <Badge variant="outline" className="ml-2 text-[10px]">
          {web.activo ? 'Publicado' : 'No publicado'}
        </Badge>
        <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 pb-2 text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Slug</span>
            <a 
              href={`/shop/${web.slug}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              Ver en tienda
              <Globe className="h-3 w-3" />
            </a>
          </div>
          <p className="font-mono text-xs">{web.slug}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Precio público</span>
          <p className="font-medium">{formatCurrency(web.precio_publico)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Precio oferta</span>
          <p>{web.precio_oferta ? formatCurrency(web.precio_oferta) : '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Visitas</span>
          <p>{web.visitas ?? 0}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Orden Display</span>
          <p>{web.orden_display ?? 0}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Unidad Venta</span>
          <Badge variant="outline" className="capitalize">{web.unidad_venta || 'Pieza'}</Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Modo Override</span>
          <Badge variant="outline" className="capitalize">{web.modo_override || 'Default'}</Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Publicado</span>
          <Fecha valor={web.fecha_publicacion} formato="fecha" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {web.en_oferta && <Badge variant="secondary">Oferta</Badge>}
          {web.destacado && <Badge variant="secondary">Destacado</Badge>}
          {web.nuevo && <Badge variant="secondary">Nuevo</Badge>}
          {web.precio_negociable && <Badge variant="outline" className="border-accent text-accent">Precio Negociable</Badge>}
          {!web.disponible_mayorista && <Badge variant="destructive">Solo Retail</Badge>}
          {web.disponible_mayorista && <Badge variant="outline" className="border-accent text-accent">Mayorista OK</Badge>}
        </div>
        {web.titulo_seo && (
          <div className="col-span-full">
            <span className="text-muted-foreground">Título SEO</span>
            <p className="font-medium">{web.titulo_seo}</p>
          </div>
        )}
        {web.descripcion_seo && (
          <div className="col-span-full">
            <span className="text-muted-foreground">Descripción SEO</span>
            <p className="text-xs leading-relaxed">{web.descripcion_seo}</p>
          </div>
        )}
        {web.keywords && (
          <div className="col-span-full border-t pt-2">
            <span className="text-muted-foreground">Keywords</span>
            <p className="text-[10px] text-muted-foreground italic">{web.keywords}</p>
          </div>
        )}
      </div>
    </details>
  )
}
