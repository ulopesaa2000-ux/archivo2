// app/(admin)/catalogo/[id]/components/TabConjunto.tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ADMIN_ROUTES } from '@/lib/constants'
import { Layers, Package } from 'lucide-react'
import type { ConjuntoResuelto } from '@/modules/catalogo/types'

export function TabConjunto({ conjunto }: { conjunto: ConjuntoResuelto[] }) {
  if (conjunto.length === 0) {
    return <div className="flex flex-col items-center py-12 text-muted-foreground"><Layers className="h-8 w-8" /><p className="text-sm mt-2">Sin productos asignados.</p></div>
  }

  return (
    <div className="rounded-lg border divide-y mt-4">
      {conjunto.map((c) => (
        <div key={c.id} className="flex items-center gap-4 px-4 py-3">
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {c.hijo_imagen
              ? <img src={c.hijo_imagen} alt="" className="object-contain w-full h-full" />
              : <Package className="h-4 w-4 text-muted-foreground" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={ADMIN_ROUTES.catalogo.detalle(c.producto_hijo_id)}
              className="font-mono text-sm font-medium text-primary hover:underline"
            >
              {c.hijo_sku}
            </Link>
            <p className="text-xs text-muted-foreground truncate">{c.hijo_nombre}</p>
          </div>
          <span className="text-sm tabular-nums">×{c.cantidad}</span>
          {c.es_requerido && <Badge variant="secondary" className="text-[10px]">Requerido</Badge>}
          <span className="text-xs text-muted-foreground">#{c.orden}</span>
        </div>
      ))}
    </div>
  )
}
