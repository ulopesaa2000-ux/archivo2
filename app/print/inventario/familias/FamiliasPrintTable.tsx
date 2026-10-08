// app/print/inventario/familias/FamiliasPrintTable.tsx
// Tabla del reporte global de familias para impresión en carta horizontal.
// Cada familia es un <tbody class="fam"> con break-inside: avoid: el motor de
// impresión del navegador nunca parte una celda combinada (rowSpan) entre
// páginas y la descripción envuelve con crecimiento automático de fila.
// Números: separadores de miles + dígitos tabulares (mismo ancho) y talla
// según magnitud (normal legible, mínimo 8px solo para 5+ dígitos) para que
// cada cantidad quede siempre dentro de su celda sin encimarse.

export interface BodegaPrint {
  id: number
  nombre: string
  es_virtual: boolean | null
}

export interface SkuPrint {
  id: number
  sku_base: string
  activo: boolean | null
  porBodega: Record<number, number>
  total: number
}

export interface FamiliaPrint {
  familia: string
  descripcion: string
  isUnassigned: boolean
  skus: SkuPrint[]
  descripcionesPorSku?: Record<number, string>
}

interface Props {
  bodegas: BodegaPrint[]
  familias: FamiliaPrint[]
  totalesPorBodega: Record<number, number>
  grandTotal: number
  realFamiliesCount: number
  isBlanco: boolean
  showFamilia: boolean
}

/** Miles con es-MX, conservando el decimal solo si el dato lo trae. */
function fmt(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 1 })
}

/** Talla por magnitud: '' (normal) | 'n4' | 'n5' (mínimo 7.5px). */
function tier(n: number): string {
  const digitos = String(Math.trunc(Math.abs(n))).length
  if (digitos >= 5) return 'n5'
  if (digitos === 4) return 'n4'
  return ''
}

/** Talla de SKU por longitud: SKUs muy largos se reducen y se parten. */
function skuTier(sku: string): string {
  if (sku.length > 15) return 'sx'
  if (sku.length > 12) return 'sl'
  return ''
}

export function FamiliasPrintTable({
  bodegas,
  familias,
  totalesPorBodega,
  grandTotal,
  realFamiliesCount,
  isBlanco,
  showFamilia,
}: Props) {
  return (
    <table className="fam-table">
      <colgroup>
        <col className="col-desc" />
        <col className="col-estilo" />
        {bodegas.map((b) => (
          <col key={b.id} className="col-bod" />
        ))}
        <col className="col-global" />
        {showFamilia && <col className="col-fam" />}
      </colgroup>
      <thead>
        <tr>
          <th className="th-desc">DESCRIPCION</th>
          <th className="th-estilo">ESTILO</th>
          {bodegas.map((b) => (
            <th key={b.id} className={`th-bod${b.es_virtual ? ' virtual' : ''}`}>
              <span>{b.nombre.toUpperCase()}</span>
            </th>
          ))}
          <th className="th-global">
            <span>GLOBAL</span>
          </th>
          {showFamilia && <th className="th-fam">FAMILIA</th>}
        </tr>
      </thead>
      {familias.map((f) => (
        <tbody key={f.familia || 'sin-familia'} className="fam">
          {f.skus.map((sku, idx) => {
            const esPrimera = idx === 0
            const rowspan = f.isUnassigned ? undefined : f.skus.length > 1 && esPrimera ? f.skus.length : undefined
            const descTexto = f.isUnassigned
              ? (f.descripcionesPorSku?.[sku.id] || f.descripcion).toUpperCase()
              : f.descripcion.toUpperCase()
            const esStockCero = sku.total === 0
            return (
              <tr key={sku.id}>
                {(!f.isUnassigned && !esPrimera) ? null : (
                  <td
                    className="td-desc"
                    {...(rowspan ? { rowSpan: rowspan } : {})}
                  >
                    {f.isUnassigned ? descTexto : esPrimera ? descTexto : null}
                  </td>
                )}
                <td className={`td-estilo ${skuTier(sku.sku_base)}${!isBlanco && esStockCero ? ' sin-stock' : ''}${sku.activo === false ? ' inactivo' : ''}`}>
                  {sku.sku_base}
                </td>
                {bodegas.map((b) => {
                  const val = isBlanco ? 0 : (sku.porBodega[b.id] ?? 0)
                  return (
                    <td key={b.id} className={`td-bod num ${tier(val)}`}>
                      {val !== 0 ? fmt(val) : ''}
                    </td>
                  )
                })}
                <td className={`td-global num ${tier(sku.total)}`}>
                  {isBlanco ? '' : sku.total !== 0 ? fmt(sku.total) : ''}
                </td>
                {showFamilia && ((!f.isUnassigned && !esPrimera) ? null : (
                  <td
                    className="td-fam"
                    {...(rowspan ? { rowSpan: rowspan } : {})}
                  >
                    {f.isUnassigned
                      ? (sku.sku_base || 'F000-000C')
                      : esPrimera
                        ? f.familia
                        : null}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      ))}
      <tbody className="fam resumen">
        <tr className="row-total">
          <td colSpan={2} className="td-total-label">TOTAL CAJAS</td>
          {bodegas.map((b) => {
            const val = isBlanco ? 0 : (totalesPorBodega[b.id] ?? 0)
            return (
              <td key={b.id} className={`td-bod total num ${tier(val)}`}>
                {isBlanco ? '' : fmt(val)}
              </td>
            )
          })}
          <td className={`td-global total num ${tier(grandTotal)}`}>
            {isBlanco ? '' : fmt(grandTotal)}
          </td>
          {showFamilia && <td className="td-fam total">{realFamiliesCount} FAMILIAS</td>}
        </tr>
        <tr className="row-bodegas">
          <td colSpan={2} className="td-bodegas-label">BODEGAS</td>
          {bodegas.map((b) => (
            <th key={b.id} className="th-bod foot">
              <span>{b.nombre.toUpperCase()}</span>
            </th>
          ))}
          <th className="th-global foot">
            <span>TOTAL</span>
          </th>
          {showFamilia && <th className="th-fam foot">FAMILIA</th>}
        </tr>
      </tbody>
    </table>
  )
}
