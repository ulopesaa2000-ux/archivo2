// app/(admin)/catalogo/[id]/components/HeroProducto.tsx
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ESTADO_PRODUCTO_COLORS } from '@/lib/constants'
import { Star, Layers, Package } from 'lucide-react'
import type { ProductoRow } from '@/lib/types/tables'
import type { FKDescriptivas } from '@/modules/catalogo/types'

type Props = {
  producto: ProductoRow
  fk: FKDescriptivas
  imagenPrincipal: string | null
}

export function HeroProducto({ producto, fk, imagenPrincipal }: Props) {
  const estadoColor = (producto.estado && ESTADO_PRODUCTO_COLORS[producto.estado]) || 'bg-gray-100 text-gray-800'

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ── Imagen ─────────────────────────────────── */}
          <div className="flex items-center justify-center bg-muted rounded-lg aspect-square overflow-hidden">
            {imagenPrincipal ? (
              <img
                src={imagenPrincipal}
                alt={producto.nombre ?? producto.sku_base}
                className="object-contain w-full h-full"
              />
            ) : (
              <Package className="h-16 w-16 text-muted-foreground/30" />
            )}
          </div>

          {/* ── Info principal ──────────────────────────── */}
          <div className="md:col-span-2 space-y-4">
            {/* SKU + badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold font-mono">{producto.sku_base}</h2>
              <Badge className={estadoColor}>{producto.estado}</Badge>
              {!producto.activo && (
                <Badge variant="destructive">Inactivo</Badge>
              )}
              {producto.destacado && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              )}
              {producto.es_conjunto && (
                <Badge variant="outline" className="gap-1">
                  <Layers className="h-3 w-3" />
                  Conjunto
                </Badge>
              )}
            </div>

            {/* Precio */}
            <p className="text-2xl font-bold">
              {producto.precio_ec ? formatCurrency(producto.precio_ec) : '—'}
            </p>

            {/* Descripción */}
            <p className="text-sm text-muted-foreground">
              {producto.descripcion ?? producto.nombre ?? 'Sin descripción'}
            </p>

            {/* Grid de atributos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <AttrItem label="Marca" value={fk.marca} />
              <AttrItem label="Género" value={fk.genero} />
              <AttrItem label="Tipo" value={fk.tipo_prenda} />
              <AttrItem label="Familia" value={producto.familia} />
              <AttrItem label="Edad" value={fk.edad} />
              <AttrItem label="Pz/Caja" value={producto.pz_en_caja?.toString()} />
              <AttrItem label="Tela exterior" value={fk.tela_exterior} />
              <AttrItem label="Tela forro" value={fk.tela_forro} />
              <AttrItem label="Persona" value={fk.persona} />
            </div>

            {/* Composición */}
            {producto.composicion && (
              <div className="text-sm">
                <span className="text-muted-foreground">Composición: </span>
                <span>{producto.composicion}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AttrItem({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  )
}
