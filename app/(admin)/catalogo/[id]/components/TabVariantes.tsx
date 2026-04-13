// app/(admin)/catalogo/[id]/components/TabVariantes.tsx
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { VarianteResuelta } from '@/modules/catalogo/types'
import { Shirt } from 'lucide-react'

export function TabVariantes({ variantes }: { variantes: VarianteResuelta[] }) {
  if (variantes.length === 0) {
    return <div className="flex flex-col items-center py-12 text-muted-foreground"><Shirt className="h-8 w-8" /><p className="text-sm mt-2">Sin variantes.</p></div>
  }

  const activas = variantes.filter((v) => v.activo).length

  return (
    <div className="space-y-3 pt-4">
      <p className="text-xs text-muted-foreground">
        {activas} activa{activas !== 1 ? 's' : ''} de {variantes.length} variantes
      </p>
      <div className="rounded-lg border divide-y">
        <div className="grid grid-cols-6 gap-4 px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
          <span>SKU</span><span>Talla</span><span>Color</span><span className="text-right">Costo</span><span className="text-right">Precio</span><span className="text-center">Estado</span>
        </div>
        {variantes.map((v) => (
          <div key={v.id} className="grid grid-cols-6 gap-4 px-4 py-2.5 text-sm items-center">
            <span className="font-mono text-xs">{v.sku_completo ?? '—'}</span>
            <span>{v.talla_codigo ?? '—'}</span>
            <span className="flex items-center gap-2">
              {v.color_hex && (
                <span
                  className="w-3.5 h-3.5 rounded-full border"
                  style={{ backgroundColor: v.color_hex }}
                />
              )}
              {v.color_nombre ?? '—'}
            </span>
            <span className="text-right tabular-nums">{v.costo_promedio ? formatCurrency(v.costo_promedio) : '—'}</span>
            <span className="text-right tabular-nums font-medium">{v.precio_venta ? formatCurrency(v.precio_venta) : '—'}</span>
            <span className="text-center">
              {v.activo
                ? <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700">Activo</Badge>
                : <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700">Inactivo</Badge>
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
