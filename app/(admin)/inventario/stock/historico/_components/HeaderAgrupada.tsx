// app/(admin)/inventario/stock/historico/_components/HeaderAgrupada.tsx
'use client'

import { Fragment } from 'react'
import type { MatrizHistorica } from '@/lib/inventario/stock-historico'

type Flags = {
  muestraDescripcion: boolean
  muestraMarca: boolean
  muestraHoy: boolean
  muestraAjuste: boolean
  muestraNotas: boolean
}

/**
 * Encabezado de la matriz agrupada (2 niveles).
 *
 * Se usa DOS veces: en el `<thead>` real (invisible, solo para dar el alto y el
 * ancho de cada columna) y en el header flotante visible que queda fijo al
 * scroll vertical. Por eso vive en su propio componente: deben ser idénticos
 * para que las columnas coincidan.
 */
export function HeaderAgrupada({
  columnas,
  fechaCorte,
  flags,
}: {
  columnas: MatrizHistorica['columnas']
  fechaCorte: string
  flags: Flags
}) {
  const f = flags
  return (
    <>
      {/* Nivel 1: cada columna agrupa su par (al corte + movimientos) */}
      <tr className="bg-muted text-muted-foreground border-b">
        <th
          rowSpan={2}
          className="px-4 py-3 text-left sticky left-0 bg-muted z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] font-semibold"
        >
          Familia
        </th>
        <th
          rowSpan={2}
          className="px-4 py-3 text-left sticky left-[140px] bg-muted z-30 shadow-[1px_0_0_0_#e2e8f0] w-[160px] min-w-[160px] border-l font-semibold"
        >
          SKU
        </th>
        {f.muestraDescripcion && (
          <th rowSpan={2} className="px-4 py-3 text-left min-w-[250px] border-l font-semibold">
            Descripción
          </th>
        )}
        {f.muestraMarca && (
          <th rowSpan={2} className="px-4 py-3 text-left border-l min-w-[110px] font-semibold">
            Marca
          </th>
        )}
        {columnas.map((c) => (
          <th
            key={`grp-${c.key}`}
            colSpan={2}
            className="px-3 py-2 text-center border-l font-semibold"
            title={c.ciudad ? `${c.nombre} · ${c.ciudad}` : c.nombre}
          >
            <span className="block truncate max-w-[200px]">{c.nombre}</span>
          </th>
        ))}
        <th rowSpan={2} className="px-2 py-3 text-center border-l min-w-[92px] font-bold text-primary">
          TOTAL
        </th>
        {f.muestraHoy && (
          <th rowSpan={2} className="px-3 py-3 text-right border-l min-w-[90px] font-semibold">
            Hoy
          </th>
        )}
        {f.muestraAjuste && (
          <th rowSpan={2} className="px-3 py-3 text-right border-l min-w-[90px] font-semibold">
            Ajuste
          </th>
        )}
        {f.muestraNotas && <th rowSpan={2} className="px-3 py-3 text-center border-l font-semibold">Notas</th>}
      </tr>
      {/* Nivel 2: AL CORTE | MOVIMIENTOS por cada columna */}
      <tr className="bg-muted text-muted-foreground border-b">
        {columnas.map((c) => (
          <Fragment key={`par-${c.key}`}>
            <th
              className="px-2 py-2 text-center border-l min-w-[92px] font-semibold text-[9px] uppercase tracking-wide"
              title={`Stock al cierre de ${fechaCorte} en ${c.nombre}`}
            >
              <span className="block truncate max-w-[110px]">Al {fechaCorte}</span>
            </th>
            <th
              className="px-2 py-2 text-center border-l min-w-[92px] font-semibold text-[9px] uppercase tracking-wide bg-amber-500/15 text-amber-900 dark:text-amber-200"
              title={`Movimientos de mercancía posteriores al ${fechaCorte} en ${c.nombre}`}
            >
              <span className="block truncate max-w-[110px]">Movimientos</span>
            </th>
          </Fragment>
        ))}
      </tr>
    </>
  )
}
