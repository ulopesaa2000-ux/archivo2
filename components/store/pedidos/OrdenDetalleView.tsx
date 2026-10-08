// components/store/pedidos/OrdenDetalleView.tsx
import Image from 'next/image'
import { Fecha } from '@/components/shared/Fecha'
import { Badge } from '@/components/ui/badge'
import { getRegionOrden } from '@/modules/ecommerce/utils'
import type { OrdenVentaDetalle } from '@/modules/ecommerce/types'

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  procesando: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  enviado: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  entregado: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  aprobada: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  convertida: 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-200',
}

function mxn(valor: number | null | undefined): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(valor ?? 0)
}

export function OrdenDetalleView({ orden, mostrarItems = true }: { orden: OrdenVentaDetalle; mostrarItems?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Folio</p>
            <p className="font-mono font-bold text-lg text-foreground">{orden.numero_orden}</p>
          </div>
          <Badge className={estadoColors[orden.estado] || 'bg-gray-100'}>
            {orden.estado}
          </Badge>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</dt>
            <dd className="text-foreground font-medium">{orden.nombre_cliente}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Región de atención</dt>
            <dd className="text-foreground font-medium">{getRegionOrden(orden)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fecha</dt>
            <dd className="text-foreground"><Fecha valor={orden.fecha_orden} formato="fecha" /></dd>
          </div>
          {orden.numero_rastreo && (
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rastreo</dt>
              <dd className="font-mono text-foreground">{orden.numero_rastreo}</dd>
            </div>
          )}
        </dl>

        {orden.notas_cliente && (
          <p className="mt-4 text-xs text-muted-foreground border-t border-border pt-3">
            {orden.notas_cliente}
          </p>
        )}
      </div>

      {mostrarItems && (
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="font-semibold text-foreground mb-4">Productos ({orden.items.length})</h2>
        <ul className="divide-y divide-border">
          {orden.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-3.5">
              <div className="relative w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                {item.imagen ? (
                  <Image src={item.imagen} alt={item.producto_nombre || 'Producto'} fill className="object-cover" sizes="64px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground">Sin imagen</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-2">{item.producto_nombre}</p>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  {item.sku_completo}
                  {item.talla ? ` · Talla ${item.talla}` : ''}
                  {item.color ? ` · ${item.color}` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cantidad: <strong className="text-foreground">{item.cantidad}</strong>
                  {' · '}
                  {mxn(item.precio_unitario)} c/u
                </p>
              </div>
              <p className="text-sm font-bold text-foreground shrink-0">{mxn(item.subtotal)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-bold text-foreground border-t border-border mt-2 pt-4">
          <span>Total</span>
          <span className="text-emerald-700 dark:text-emerald-400">{mxn(orden.total)}</span>
        </div>
      </div>
      )}
    </div>
  )
}
