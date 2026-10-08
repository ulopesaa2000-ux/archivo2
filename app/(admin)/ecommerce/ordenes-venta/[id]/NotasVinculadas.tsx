// app/(admin)/ecommerce/ordenes-venta/[id]/NotasVinculadas.tsx
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { fetchNotasPorReferencia } from '@/modules/inventario/queries'

/**
 * Solo SUS notas creadas desde esta cotización (filtro por folio),
 * sin importar la bodega. Cada fila linkea a su nota.
 */
export async function NotasVinculadas({ folio }: { folio: string }) {
  const notas = await fetchNotasPorReferencia(folio)

  return (
    <div className="rounded-lg border p-6 space-y-3">
      <div>
        <h2 className="font-semibold">Notas de salida generadas ({notas.length})</h2>
        <p className="text-xs text-muted-foreground">
          Solo las notas creadas desde el folio {folio}, sin importar la bodega.
        </p>
      </div>

      {notas.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl px-3 py-4 text-center">
          Aún no se genera nota de salida para esta cotización.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {notas.map((nota) => (
            <li key={nota.id}>
              <Link
                href={`/inventario/notas/${nota.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-mono font-bold text-sm text-foreground">
                    {nota.numero_nota}
                    <ArrowUpRight className="inline h-3.5 w-3.5 ml-1 text-muted-foreground" />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {nota.bodega_origen_nombre}
                    {nota.total_cajas != null ? ` · ${nota.total_cajas} caja(s)` : ''}
                    {nota.fecha_nota ? ' · ' : ''}{nota.fecha_nota ? <Fecha valor={nota.fecha_nota} formato="fecha" /> : null}
                  </p>
                </div>
                <Badge className="shrink-0" title={nota.estado_nombre}>{nota.estado_codigo}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
