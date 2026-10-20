// app/(admin)/inventario/stock/historico/_components/TablaHistoricoIndividual.tsx
'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { compareFamiliaAsc, compareSkuAsc } from '@/lib/inventario/familias-orden'
import type { StockHistoricoFila } from '@/modules/inventario/types'
import { useColumnasHistorico } from '../_hooks/use-columnas-historico'

type Props = {
  filas: StockHistoricoFila[]
  fechaCorte: string
}

type Flags = {
  descripcion: boolean
  marca: boolean
  bodega: boolean
  hoy: boolean
  ajuste: boolean
  corte: boolean
  notas: boolean
}

function num(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

export function TablaHistoricoIndividual({ filas, fechaCorte }: Props) {
  const { visible, estado } = useColumnasHistorico()
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set())

  const flags: Flags = {
    descripcion: visible('descripcion'),
    marca: visible('marca'),
    bodega: visible('bodega'),
    hoy: visible('cajas_hoy'),
    ajuste: visible('ajuste'),
    corte: visible('cajas_corte'),
    notas: visible('notas'),
  }

  const toggleFamilia = (familia: string) => {
    setColapsadas((prev) => {
      const next = new Set(prev)
      if (next.has(familia)) next.delete(familia)
      else next.add(familia)
      return next
    })
  }

  // Agrupación por familia (mismo criterio del panel de Stock).
  const grupos = useMemo(() => {
    if (!estado.agrupar) return null
    const mapa = new Map<string, StockHistoricoFila[]>()
    for (const f of filas) {
      const fam = f.producto_familia || 'Sin Familia'
      const arr = mapa.get(fam) ?? []
      arr.push(f)
      mapa.set(fam, arr)
    }
    return Array.from(mapa.entries())
      .sort((a, b) => compareFamiliaAsc(a[0], b[0]))
      .map(([familia, items]) => ({
        familia,
        items: items.sort((x, y) => compareSkuAsc(x.producto_sku, y.producto_sku)),
        total_hoy: items.reduce((s, f) => s + f.cajas_hoy, 0),
        total_ajuste: items.reduce((s, f) => s + f.ajuste, 0),
        total_corte: items.reduce((s, f) => s + f.cajas_historicas, 0),
      }))
  }, [filas, estado.agrupar])

  const totalHoy = filas.reduce((s, f) => s + f.cajas_hoy, 0)
  const totalAjuste = filas.reduce((s, f) => s + f.ajuste, 0)
  const totalCorte = filas.reduce((s, f) => s + f.cajas_historicas, 0)

  
  return (
    <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
      <div className="overflow-x-auto">
        <table data-testid="tabla-historico-individual" className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground border-b">
              <th className="px-4 py-3 text-left sticky left-0 bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px]">
                Familia
              </th>
              <th className="px-4 py-3 text-left sticky left-[140px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[160px] min-w-[160px] border-l">
                SKU
              </th>
              {flags.descripcion && (
                <th className="px-4 py-3 text-left min-w-[250px] border-l">Descripción</th>
              )}
              {flags.marca && (
                <th className="px-4 py-3 text-left border-l hidden lg:table-cell">Marca</th>
              )}
              {flags.bodega && <th className="px-4 py-3 text-left border-l">Bodega</th>}
              {flags.hoy && <th className="px-4 py-3 text-right border-l">Cajas hoy</th>}
              {flags.ajuste && (
                <th className="px-4 py-3 text-right border-l bg-amber-500/10 text-amber-900 dark:text-amber-300">
                  Ajuste
                </th>
              )}
              {flags.corte && (
                <th className="px-4 py-3 text-right border-l bg-primary/10 text-primary font-bold">
                  Al {fechaCorte}
                </th>
              )}
              {flags.notas && <th className="px-4 py-3 text-center border-l">Notas</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  No hay stock en el alcance seleccionado para esta fecha.
                </td>
              </tr>
            )}

            {grupos
              ? grupos.map((g) => (
                  <FamiliaRow
                    key={g.familia}
                    familia={g.familia}
                    items={g.items}
                    total_hoy={g.total_hoy}
                    total_ajuste={g.total_ajuste}
                    total_corte={g.total_corte}
                    abierto={!colapsadas.has(g.familia)}
                    onToggle={() => toggleFamilia(g.familia)}
                    flags={flags}
                   
                  />
                ))
              : filas.map((f) => (
                  <FilaProducto
                    key={`${f.bodega_id}-${f.producto_id}`}
                    fila={f}
                    flags={flags}
                   
                  />
                ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/80 border-t-2 font-bold">
              <td
                className="px-4 py-3 text-xs uppercase tracking-wide sticky left-0 bg-muted/95 z-20"
                colSpan={
                  2 +
                  (flags.descripcion ? 1 : 0) +
                  (flags.marca ? 1 : 0) +
                  (flags.bodega ? 1 : 0)
                }
              >
                TOTALES
              </td>
              {flags.hoy && (
                <td data-testid="total-hoy" className="px-4 py-3 text-right font-mono tabular-nums">{num(totalHoy)}</td>
              )}
              {flags.ajuste && (
                <td data-testid="total-ajuste" className="px-4 py-3 text-right font-mono tabular-nums">{num(totalAjuste)}</td>
              )}
              {flags.corte && (
                <td data-testid="total-corte" className="px-4 py-3 text-right font-mono tabular-nums text-primary">{num(totalCorte)}</td>
              )}
              {flags.notas && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function Ajuste({ valor }: { valor: number }) {
  if (valor === 0) return <span className="text-muted-foreground">0</span>
  return (
    <span
      className={`font-mono font-bold ${valor < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}
    >
      {valor < 0 ? '−' : '+'}
      {num(Math.abs(valor))}
    </span>
  )
}

function FilaProducto({
  fila,
  flags,
}: {
  fila: StockHistoricoFila
  flags: Flags
}) {
  const f = flags
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-2.5 font-mono text-xs sticky left-0 bg-background z-10 shadow-[1px_0_0_0_#e2e8f0]">
        {fila.producto_familia ?? '—'}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs font-semibold sticky left-[140px] bg-background z-10 shadow-[1px_0_0_0_#e2e8f0] border-l">
        {fila.producto_sku}
      </td>
      {f.descripcion && (
        <td
          className="px-4 py-2.5 text-xs text-muted-foreground max-w-[280px] truncate border-l"
        >
          {fila.producto_descripcion ?? '—'}
        </td>
      )}
      {f.marca && (
        <td className="px-4 py-2.5 text-xs text-muted-foreground border-l hidden lg:table-cell">
          {fila.marca_nombre ?? '—'}
        </td>
      )}
      {f.bodega && (
        <td className="px-4 py-2.5 text-xs border-l">
          <div className="font-semibold">{fila.bodega_nombre}</div>
          <div className="text-[10px] text-muted-foreground">{fila.ciudad}</div>
        </td>
      )}
      {f.hoy && (
        <td className="px-4 py-2.5 text-right font-mono tabular-nums border-l">{num(fila.cajas_hoy)}</td>
      )}
      {f.ajuste && (
        <td className="px-4 py-2.5 text-right border-l">
          <Ajuste valor={fila.ajuste} />
        </td>
      )}
      {f.corte && (
        <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold border-l">
          <span className="inline-flex items-center gap-1 justify-end">
            {num(fila.cajas_historicas)}
            {fila.valor_inconsistente && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Valor inconsistente" />
            )}
          </span>
        </td>
      )}
      {f.notas && (
        <td className="px-4 py-2.5 text-center border-l">
          {fila.n_notas > 0 ? (
            <Badge variant="outline" className="text-[10px] font-mono">
              {fila.n_notas}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>
      )}
    </tr>
  )
}

function FamiliaRow({
  familia,
  items,
  total_hoy,
  total_ajuste,
  total_corte,
  abierto,
  onToggle,
  flags,
}: {
  familia: string
  items: StockHistoricoFila[]
  total_hoy: number
  total_ajuste: number
  total_corte: number
  abierto: boolean
  onToggle: () => void
  flags: Flags
}) {
  const f = flags
  return (
    <>
      <tr
        className="border-b bg-blue-50/50 dark:bg-blue-900/15 font-medium hover:bg-blue-100/50 dark:hover:bg-blue-900/25 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 sticky left-0 bg-blue-50/90 dark:bg-blue-900/40 z-10 shadow-[1px_0_0_0_#e2e8f0]">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 pointer-events-none">
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <span className="ml-1 font-mono text-xs">{familia}</span>
        </td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground sticky left-[140px] bg-blue-50/90 dark:bg-blue-900/40 z-10 shadow-[1px_0_0_0_#e2e8f0] border-l">
          {items.length} producto{items.length !== 1 ? 's' : ''}
        </td>
        {f.descripcion && <td className="px-4 py-2.5 border-l" />}
        {f.marca && <td className="px-4 py-2.5 border-l" />}
        {f.bodega && <td className="px-4 py-2.5 border-l" />}
        {f.hoy && (
          <td className="px-4 py-2.5 text-right font-mono tabular-nums border-l">{num(total_hoy)}</td>
        )}
        {f.ajuste && (
          <td className="px-4 py-2.5 text-right border-l">
            <Ajuste valor={total_ajuste} />
          </td>
        )}
        {f.corte && (
          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold border-l text-primary">
            {num(total_corte)}
          </td>
        )}
        {f.notas && <td className="px-4 py-2.5 border-l" />}
      </tr>
      {abierto &&
        items.map((f2) => (
          <FilaProducto
            key={`${f2.bodega_id}-${f2.producto_id}`}
            fila={f2}
            flags={f}
           
          />
        ))}
    </>
  )
}
