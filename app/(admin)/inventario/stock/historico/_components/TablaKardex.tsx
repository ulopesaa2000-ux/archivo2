// app/(admin)/inventario/stock/historico/_components/TablaKardex.tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ADMIN_ROUTES } from '@/lib/constants'
import { Fecha } from '@/components/shared/Fecha'
import { useHeaderFlotante } from '../_hooks/use-header-flotante'
import { HeaderKardex } from './HeaderKardex'
import type { KardexFila } from '@/modules/inventario/types'

type Props = {
  filas: KardexFila[]
  mostrarBodega: boolean
}

function num(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

const TIPO_BADGE: Record<string, string> = {
  ENT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  DEV: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  SAL: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  TRF: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  AJU: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
}

export function TablaKardex({ filas, mostrarBodega }: Props) {
  const { scrollRef, headerRef, ancho, alto, onScroll } = useHeaderFlotante()
  return (
    <div className="rounded-lg border shadow-sm bg-card">
      {/* Header flotante: fuera del contenedor con overflow para que su `sticky`
          vertical se resuelva contra el <main>; en X sigue al scroll de la tabla. */}
      <div className="sticky top-0 z-40 overflow-hidden bg-card" style={{ marginBottom: -alto }}>
        <div ref={headerRef} style={{ width: ancho || '100%' }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <HeaderKardex mostrarBodega={mostrarBodega} />
            </thead>
          </table>
        </div>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="invisible">
            <HeaderKardex mostrarBodega={mostrarBodega} />
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={mostrarBodega ? 9 : 8} className="px-4 py-12 text-center text-muted-foreground">
                  No hay movimientos confirmados en el periodo seleccionado.
                </td>
              </tr>
            ) : (
              filas.map((f, i) => (
                <tr
                  key={`${f.clave}-${f.nota_id}-${f.producto_id}-${i}`}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                    <Fecha valor={f.fecha_nota} formato="fecha" />
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={ADMIN_ROUTES.inventario.notaDetalle(f.nota_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      {f.numero_nota}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${TIPO_BADGE[f.tipo_codigo] ?? ''}`}
                    >
                      {f.tipo_codigo}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell max-w-[220px] truncate">
                    {f.bodega_origen_nombre}
                    {f.bodega_destino_nombre ? ` → ${f.bodega_destino_nombre}` : ''}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-mono text-xs font-semibold">{f.producto_sku}</div>
                    <div className="text-[10px] text-muted-foreground max-w-[240px] truncate">
                      {f.producto_descripcion ?? '—'}
                    </div>
                  </td>
                  {mostrarBodega && (
                    <td className="px-4 py-2.5 text-xs">
                      <div className="font-semibold">{f.bodega_nombre}</div>
                      <div className="text-[10px] text-muted-foreground">{f.ciudad}</div>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{num(f.cajas)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`font-mono font-bold ${f.efecto > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                    >
                      {f.efecto > 0 ? '+' : '−'}
                      {num(Math.abs(f.efecto))}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold">
                    {num(f.saldo)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
