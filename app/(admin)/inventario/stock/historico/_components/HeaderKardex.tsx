// app/(admin)/inventario/stock/historico/_components/HeaderKardex.tsx
'use client'

/**
 * Encabezado del kardex (movimientos del periodo).
 *
 * Se usa dos veces: en el `<thead>` real (invisible) y en el header flotante
 * visible que queda fijo al scroll vertical.
 */
export function HeaderKardex({ mostrarBodega }: { mostrarBodega: boolean }) {
  return (
    <tr className="bg-muted text-xs font-semibold text-muted-foreground border-b">
      <th className="px-4 py-3 text-left">Fecha nota</th>
      <th className="px-4 py-3 text-left">Nota</th>
      <th className="px-4 py-3 text-left">Tipo</th>
      <th className="px-4 py-3 text-left hidden lg:table-cell">Origen → Destino</th>
      <th className="px-4 py-3 text-left">Producto</th>
      {mostrarBodega && <th className="px-4 py-3 text-left">Bodega</th>}
      <th className="px-4 py-3 text-right">Cajas</th>
      <th className="px-4 py-3 text-right border-l">Efecto</th>
      <th className="px-4 py-3 text-right border-l">Saldo</th>
    </tr>
  )
}
