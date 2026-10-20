// app/(admin)/inventario/stock/historico/_components/TablaHistoricoAgrupada.tsx
'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compareFamiliaAsc, compareSkuAsc } from '@/lib/inventario/familias-orden'
import type { CeldaMatriz, FilaMatriz, MatrizHistorica } from '@/lib/inventario/stock-historico'
import { useColumnasHistorico } from '../_hooks/use-columnas-historico'

type Props = {
  matriz: MatrizHistorica
  fechaCorte: string
}

function num(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

export function TablaHistoricoAgrupada({ matriz, fechaCorte }: Props) {
  const { visible, estado } = useColumnasHistorico()
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set())

  const muestraDescripcion = visible('descripcion')
  const muestraMarca = visible('marca')
  const muestraHoy = visible('cajas_hoy')
  const muestraAjuste = visible('ajuste')
  const muestraNotas = visible('notas')

  const columnas = matriz.columnas

  const grupos = useMemo(() => {
    if (!estado.agrupar) return null
    const mapa = new Map<string, FilaMatriz[]>()
    for (const f of matriz.filas) {
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
        total_hoy: items.reduce((s, f) => s + f.total_hoy, 0),
        total_ajuste: items.reduce((s, f) => s + f.total_ajuste, 0),
        total_corte: items.reduce((s, f) => s + f.total_historicas, 0),
        total_entradas: items.reduce((s, f) => s + f.total_entradas, 0),
        total_salidas: items.reduce((s, f) => s + f.total_salidas, 0),
      }))
  }, [matriz.filas, estado.agrupar])

  const toggleFamilia = (familia: string) => {
    setColapsadas((prev) => {
      const next = new Set(prev)
      if (next.has(familia)) next.delete(familia)
      else next.add(familia)
      return next
    })
  }

  const stickyDesc = muestraDescripcion
    ? 'sticky left-[300px] bg-background z-10 shadow-[1px_0_0_0_#e2e8f0]'
    : ''

  return (
    <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
      <div className="overflow-x-auto">
        <table data-testid="tabla-historico-matriz" className="w-full text-xs border-collapse">
          <thead>
            {/* Nivel 1: grupos (stock al corte / movimientos posteriores) */}
            <tr className="bg-muted/60 text-muted-foreground border-b">
              <th
                rowSpan={2}
                className="px-4 py-3 text-left sticky left-0 bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] font-semibold"
              >
                Familia
              </th>
              <th
                rowSpan={2}
                className="px-4 py-3 text-left sticky left-[140px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] w-[160px] min-w-[160px] border-l font-semibold"
              >
                SKU
              </th>
              {muestraDescripcion && (
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-left sticky left-[300px] bg-muted/95 z-30 shadow-[1px_0_0_0_#e2e8f0] min-w-[250px] border-l font-semibold"
                >
                  Descripción
                </th>
              )}
              {muestraMarca && (
                <th rowSpan={2} className="px-4 py-3 text-left border-l min-w-[110px] font-semibold">
                  Marca
                </th>
              )}
              <th
                colSpan={columnas.length + 1}
                className="px-3 py-2 text-center border-l bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wide"
              >
                Stock al {fechaCorte}
              </th>
              <th
                colSpan={columnas.length}
                className="px-3 py-2 text-center border-l bg-amber-500/10 text-amber-900 dark:text-amber-300 font-bold text-[11px] uppercase tracking-wide"
              >
                Movimientos posteriores
              </th>
              {muestraHoy && (
                <th rowSpan={2} className="px-3 py-3 text-right border-l min-w-[90px] font-semibold">
                  Hoy
                </th>
              )}
              {muestraAjuste && (
                <th rowSpan={2} className="px-3 py-3 text-right border-l min-w-[90px] font-semibold">
                  Ajuste
                </th>
              )}
              {muestraNotas && <th rowSpan={2} className="px-3 py-3 text-center border-l font-semibold">Notas</th>}
            </tr>
            {/* Nivel 2: columnas por bodega/ciudad */}
            <tr className="bg-muted/50 text-muted-foreground border-b">
              {columnas.map((c) => (
                <th
                  key={`stock-${c.key}`}
                  className="px-2 py-2 text-center border-l min-w-[92px] font-semibold"
                  title={c.ciudad ? `${c.nombre} · ${c.ciudad}` : c.nombre}
                >
                  <span className="block truncate max-w-[120px]">{c.nombre}</span>
                </th>
              ))}
              <th className="px-2 py-2 text-center border-l min-w-[92px] font-bold text-primary">
                TOTAL
              </th>
              {columnas.map((c) => (
                <th
                  key={`mov-${c.key}`}
                  className="px-2 py-2 text-center border-l min-w-[92px] font-semibold bg-amber-500/5"
                  title={c.ciudad ? `${c.nombre} · ${c.ciudad}` : c.nombre}
                >
                  <span className="block truncate max-w-[120px]">{c.nombre}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matriz.filas.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
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
                    totales={g}
                    abierto={!colapsadas.has(g.familia)}
                    onToggle={() => toggleFamilia(g.familia)}
                    columnas={columnas}
                    flags={{ muestraDescripcion, muestraMarca, muestraHoy, muestraAjuste, muestraNotas }}
                    stickyDesc={stickyDesc}
                    fechaCorte={fechaCorte}
                  />
                ))
              : matriz.filas.map((f) => (
                  <FilaProducto
                    key={f.producto_id}
                    fila={f}
                    columnas={columnas}
                    flags={{ muestraDescripcion, muestraMarca, muestraHoy, muestraAjuste, muestraNotas }}
                    stickyDesc={stickyDesc}
                    fechaCorte={fechaCorte}
                  />
                ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/85 border-t-2 font-bold">
              <td
                className="px-4 py-3 text-xs uppercase tracking-wide sticky left-0 bg-muted/95 z-20"
                colSpan={
                  2 +
                  (muestraDescripcion ? 1 : 0) +
                  (muestraMarca ? 1 : 0)
                }
              >
                TOTALES
              </td>
              {columnas.map((c) => (
                <td key={`t-stock-${c.key}`} className="px-2 py-3 text-right font-mono tabular-nums border-l">
                  {num(c.total_historicas)}
                </td>
              ))}
              <td data-testid="total-corte" className="px-2 py-3 text-right font-mono tabular-nums border-l font-bold text-primary">
                {num(matriz.totales.historicas)}
              </td>
              {columnas.map((c) => (
                <td
                  key={`t-mov-${c.key}`}
                  className="px-2 py-3 text-right font-mono tabular-nums border-l bg-amber-500/5"
                >
                  <Movimiento valor={c.total_entradas - c.total_salidas} />
                </td>
              ))}
              {muestraHoy && (
                <td data-testid="total-hoy" className="px-3 py-3 text-right font-mono tabular-nums border-l">{num(matriz.totales.hoy)}</td>
              )}
              {muestraAjuste && (
                <td data-testid="total-ajuste" className="px-3 py-3 text-right font-mono tabular-nums border-l">
                  {num(matriz.totales.ajuste)}
                </td>
              )}
              {muestraNotas && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

type Flags = {
  muestraDescripcion: boolean
  muestraMarca: boolean
  muestraHoy: boolean
  muestraAjuste: boolean
  muestraNotas: boolean
}

/** Neto de movimientos posteriores: + entrou mercancía, − salió. */
function Movimiento({ valor }: { valor: number }) {
  if (valor === 0) return <span className="text-muted-foreground">0</span>
  return (
    <span
      className={`font-mono font-bold ${valor > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
    >
      {valor > 0 ? '+' : '−'}
      {num(Math.abs(valor))}
    </span>
  )
}

function CeldaStock({ celda, nombre }: { celda: CeldaMatriz | undefined; nombre: string }) {
  if (!celda) return <td className="px-2 py-2 text-right font-mono tabular-nums border-l text-muted-foreground/40">—</td>
  return (
    <td
      className="px-2 py-2 text-right font-mono tabular-nums border-l"
      title={`${nombre} · Hoy ${num(celda.cajas_hoy)} · Ajuste ${num(celda.ajuste)} · Al corte ${num(celda.cajas_historicas)}`}
    >
      <span className="inline-flex items-center gap-0.5 justify-end">
        {celda.cajas_historicas === 0 ? <span className="text-muted-foreground/40">0</span> : num(celda.cajas_historicas)}
        {celda.valor_inconsistente && (
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Valor inconsistente" />
        )}
      </span>
    </td>
  )
}

function CeldaMovimiento({ celda, nombre }: { celda: CeldaMatriz | undefined; nombre: string }) {
  if (!celda) {
    return <td className="px-2 py-2 text-right font-mono tabular-nums border-l bg-amber-500/5 text-muted-foreground/40">—</td>
  }
  const neto = celda.entradas_posteriores - celda.salidas_posteriores
  return (
    <td
      className="px-2 py-2 text-right font-mono tabular-nums border-l bg-amber-500/5"
      title={`${nombre} · Entró ${num(celda.entradas_posteriores)} · Salió ${num(celda.salidas_posteriores)} · Neto ${num(neto)}`}
    >
      <Movimiento valor={neto} />
    </td>
  )
}

function FilaProducto({
  fila,
  columnas,
  flags,
  stickyDesc,
  fechaCorte,
}: {
  fila: FilaMatriz
  columnas: MatrizHistorica['columnas']
  flags: Flags
  stickyDesc: string
  fechaCorte: string
}) {
  const f = flags
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-2 font-mono text-[11px] sticky left-0 bg-background z-10 shadow-[1px_0_0_0_#e2e8f0]">
        {fila.producto_familia ?? '—'}
      </td>
      <td className="px-4 py-2 font-mono text-[11px] font-semibold sticky left-[140px] bg-background z-10 shadow-[1px_0_0_0_#e2e8f0] border-l">
        {fila.producto_sku}
      </td>
      {f.muestraDescripcion && (
        <td
          className={`px-4 py-2 text-[11px] text-muted-foreground max-w-[260px] truncate border-l ${stickyDesc}`}
          title={fila.producto_descripcion ?? ''}
        >
          {fila.producto_descripcion ?? '—'}
        </td>
      )}
      {f.muestraMarca && (
        <td className="px-4 py-2 text-[11px] text-muted-foreground border-l">{fila.marca_nombre ?? '—'}</td>
      )}
      {columnas.map((c) => (
        <CeldaStock key={`s-${c.key}`} celda={fila.celdas[c.key]} nombre={c.nombre} />
      ))}
      <td
        className="px-2 py-2 text-right font-mono tabular-nums border-l font-bold text-primary"
        title={`Total al corte · Hoy ${num(fila.total_hoy)} · Ajuste ${num(fila.total_ajuste)}`}
      >
        {num(fila.total_historicas)}
      </td>
      {columnas.map((c) => (
        <CeldaMovimiento key={`m-${c.key}`} celda={fila.celdas[c.key]} nombre={c.nombre} />
      ))}
      {f.muestraHoy && (
        <td className="px-3 py-2 text-right font-mono tabular-nums border-l">{num(fila.total_hoy)}</td>
      )}
      {f.muestraAjuste && (
        <td className="px-3 py-2 text-right font-mono tabular-nums border-l">
          <span className={fila.total_ajuste < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {num(fila.total_ajuste)}
          </span>
        </td>
      )}
      {f.muestraNotas && (
        <td className="px-3 py-2 text-center border-l text-muted-foreground">
          {fila.n_notas > 0 ? fila.n_notas : '—'}
        </td>
      )}
    </tr>
  )
}

function FamiliaRow({
  familia,
  items,
  totales,
  abierto,
  onToggle,
  columnas,
  flags,
  stickyDesc,
  fechaCorte,
}: {
  familia: string
  items: FilaMatriz[]
  totales: {
    total_hoy: number
    total_ajuste: number
    total_corte: number
    total_entradas: number
    total_salidas: number
  }
  abierto: boolean
  onToggle: () => void
  columnas: MatrizHistorica['columnas']
  flags: Flags
  stickyDesc: string
  fechaCorte: string
}) {
  const f = flags
  return (
    <>
      <tr
        className="border-b bg-blue-50/50 dark:bg-blue-900/15 font-medium hover:bg-blue-100/50 dark:hover:bg-blue-900/25 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-2 sticky left-0 bg-blue-50/90 dark:bg-blue-900/40 z-10 shadow-[1px_0_0_0_#e2e8f0]">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 pointer-events-none">
            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <span className="ml-1 font-mono text-[11px]">{familia}</span>
        </td>
        <td className="px-4 py-2 text-[11px] text-muted-foreground sticky left-[140px] bg-blue-50/90 dark:bg-blue-900/40 z-10 shadow-[1px_0_0_0_#e2e8f0] border-l">
          {items.length} prod.
        </td>
        {f.muestraDescripcion && <td className="px-4 py-2 border-l" />}
        {f.muestraMarca && <td className="px-4 py-2 border-l" />}
        {columnas.map((c) => (
          <td key={`s-${c.key}`} className="px-2 py-2 text-right font-mono tabular-nums border-l font-bold">
            {num(
              items.reduce(
                (s, f2) => s + (f2.celdas[c.key]?.cajas_historicas ?? 0),
                0
              )
            )}
          </td>
        ))}
        <td className="px-2 py-2 text-right font-mono tabular-nums border-l font-bold text-primary">
          {num(totales.total_corte)}
        </td>
        {columnas.map((c) => (
          <td
            key={`m-${c.key}`}
            className="px-2 py-2 text-right font-mono tabular-nums border-l bg-amber-500/5"
          >
            <Movimiento
              valor={items.reduce(
                (s, f2) => s + (f2.celdas[c.key]?.entradas_posteriores ?? 0) - (f2.celdas[c.key]?.salidas_posteriores ?? 0),
                0
              )}
            />
          </td>
        ))}
        {f.muestraHoy && (
          <td className="px-3 py-2 text-right font-mono tabular-nums border-l">{num(totales.total_hoy)}</td>
        )}
        {f.muestraAjuste && (
          <td className="px-3 py-2 text-right font-mono tabular-nums border-l">{num(totales.total_ajuste)}</td>
        )}
        {f.muestraNotas && <td className="px-3 py-2 border-l" />}
      </tr>
      {abierto &&
        items.map((f2) => (
          <FilaProducto
            key={f2.producto_id}
            fila={f2}
            columnas={columnas}
            flags={f}
            stickyDesc={stickyDesc}
            fechaCorte={fechaCorte}
          />
        ))}
    </>
  )
}
