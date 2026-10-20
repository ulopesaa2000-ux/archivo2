// app/(admin)/inventario/stock/historico/_components/TablaCorte.tsx
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StockHistoricoFila, ResumenHistorico } from '@/modules/inventario/types'

type Props = {
  filas: StockHistoricoFila[]
  totales: ResumenHistorico
  fechaCorte: string
  mostrarBodega: boolean
}

function num(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

function Ajuste({ valor }: { valor: number }) {
  if (valor === 0) return <span className="text-muted-foreground">0</span>
  const negativo = valor < 0
  return (
    <span
      className={`font-mono font-bold ${negativo ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
      title={negativo ? 'Se restaron cajas para volver al corte' : 'Se devolvieron cajas para volver al corte'}
    >
      {negativo ? '−' : '+'}
      {num(Math.abs(valor))}
    </span>
  )
}

export function TablaCorte({ filas, totales, fechaCorte, mostrarBodega }: Props) {
  const colSpan = mostrarBodega ? 9 : 8

  return (
    <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground border-b">
              <th className="px-4 py-3 text-left">Familia</th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Descripción</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Marca</th>
              {mostrarBodega && <th className="px-4 py-3 text-left">Bodega</th>}
              <th className="px-4 py-3 text-right border-l">Cajas hoy</th>
              <th className="px-4 py-3 text-right border-l bg-amber-500/10 text-amber-900 dark:text-amber-300">
                Ajuste al corte
              </th>
              <th className="px-4 py-3 text-right border-l bg-primary/10 text-primary font-bold">
                Al {fechaCorte}
              </th>
              <th className="px-4 py-3 text-center border-l">Notas</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                  No hay stock en el alcance seleccionado para esta fecha.
                </td>
              </tr>
            ) : (
              filas.map((f) => (
                <tr
                  key={`${f.bodega_id}-${f.producto_id}`}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{f.producto_familia ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold">{f.producto_sku}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-xs text-muted-foreground max-w-[280px] truncate">
                    {f.producto_descripcion ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                    {f.marca_nombre ?? '—'}
                  </td>
                  {mostrarBodega && (
                    <td className="px-4 py-2.5 text-xs">
                      <div className="font-semibold">{f.bodega_nombre}</div>
                      <div className="text-[10px] text-muted-foreground">{f.ciudad}</div>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{num(f.cajas_hoy)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Ajuste valor={f.ajuste} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold">
                    <span className="inline-flex items-center gap-1 justify-end">
                      {num(f.cajas_historicas)}
                      {f.valor_inconsistente && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-amber-500 shrink-0"
                          aria-label="Valor inconsistente por corte documental"
                        />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {f.n_notas > 0 ? (
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {f.n_notas}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/80 border-t-2 font-bold">
              <td className="px-4 py-3 text-xs uppercase tracking-wide" colSpan={mostrarBodega ? 5 : 4}>
                TOTALES
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">{num(totales.hoy)}</td>
              <td className="px-4 py-3 text-right">
                <Ajuste valor={totales.ajuste} />
              </td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-primary">{num(totales.historico)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
