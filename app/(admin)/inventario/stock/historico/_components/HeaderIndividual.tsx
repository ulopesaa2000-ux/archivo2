// app/(admin)/inventario/stock/historico/_components/HeaderIndividual.tsx
'use client'

type Flags = {
  descripcion: boolean
  marca: boolean
  bodega: boolean
  hoy: boolean
  ajuste: boolean
  corte: boolean
  notas: boolean
}

/**
 * Encabezado de la vista individual (1 bodega).
 *
 * Se usa dos veces: en el `<thead>` real (invisible, da el alto y el ancho de
 * cada columna) y en el header flotante visible que queda fijo al scroll
 * vertical. Deben ser idénticos para que las columnas coincidan.
 */
export function HeaderIndividual({ fechaCorte, flags }: { fechaCorte: string; flags: Flags }) {
  const f = flags
  return (
    <tr className="bg-muted text-xs font-semibold text-muted-foreground border-b">
      <th className="px-4 py-3 text-left sticky left-0 bg-muted z-30 shadow-[1px_0_0_0_#e2e8f0] w-[140px] min-w-[140px] max-w-[140px]">
        Familia
      </th>
      <th className="px-4 py-3 text-left sticky left-[140px] bg-muted z-30 shadow-[1px_0_0_0_#e2e8f0] w-[160px] min-w-[160px] max-w-[160px] border-l">
        SKU
      </th>
      {f.descripcion && (
        <th className="px-4 py-3 text-left min-w-[260px] border-l">Descripción</th>
      )}
      {f.marca && (
        <th className="px-4 py-3 text-left border-l w-[130px] min-w-[130px] max-w-[150px]">
          Marca
        </th>
      )}
      {f.bodega && <th className="px-4 py-3 text-left border-l w-[180px] min-w-[180px] max-w-[220px]">Bodega</th>}
      {f.hoy && <th className="px-4 py-3 text-right border-l w-[100px] min-w-[100px]">Cajas hoy</th>}
      {f.ajuste && (
        <th className="px-4 py-3 text-right border-l bg-amber-500/10 text-amber-900 dark:text-amber-300 w-[90px] min-w-[90px]">
          Ajuste
        </th>
      )}
      {f.corte && (
        <th className="px-4 py-3 text-right border-l bg-primary/10 text-primary font-bold w-[120px] min-w-[120px]">
          Al {fechaCorte}
        </th>
      )}
      {f.notas && <th className="px-4 py-3 text-center border-l w-[75px] min-w-[75px]">Notas</th>}
    </tr>
  )
}
