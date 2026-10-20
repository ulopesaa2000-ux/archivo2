// app/(admin)/inventario/stock/historico/_components/HistoricoAvisos.tsx
import { AlertTriangle, ShieldAlert, Info } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type {
  AjusteDirectoHistorico,
  DescuadreBodega,
  ResumenHistorico,
} from '@/modules/inventario/types'

type Props = {
  ajustesDirectos: AjusteDirectoHistorico[]
  descuadres: DescuadreBodega[]
  negativos: number
  notasRevertidas: number
  nMovimientos: number
  porBodega: (ResumenHistorico & { bodega_id: number; bodega_nombre: string; ciudad: string })[]
  porCiudad: (ResumenHistorico & { ciudad: string })[]
  fechaCorte: string
}

function num(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 2 })
}

export function HistoricoAvisos({
  ajustesDirectos,
  descuadres,
  negativos,
  notasRevertidas,
  nMovimientos,
  porBodega,
  porCiudad,
  fechaCorte,
}: Props) {
  const conRiesgo = descuadres.filter((d) => d.tieneAjusteDirectoPostCorte)

  return (
    <div className="space-y-3">
      {ajustesDirectos.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {ajustesDirectos.length} bodega{ajustesDirectos.length !== 1 ? 's' : ''} con ajuste directo
                fuera de notas después del {fechaCorte}: su cifra histórica es aproximada
              </p>
              <ul className="space-y-0.5">
                {ajustesDirectos.map((a) => (
                  <li key={`${a.bodega_id}-${a.fecha}`}>
                    <strong>{a.bodega_nombre}</strong> — {a.filas_afectadas} filas modificadas el{' '}
                    {formatDateTime(a.fecha)}
                    {a.usuario_id ? ` (usuario ${a.usuario_id})` : ''}. Ese cambio no vino de una nota, así que
                    el cálculo histórico no lo puede revertir.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {descuadres.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-semibold mb-1">
            {descuadres.length} bodega{descuadres.length !== 1 ? 's' : ''} donde el stock actual no cuadra
            con la suma de sus notas activas
          </p>
          <ul className="space-y-0.5">
            {descuadres.map((d) => (
              <li key={d.bodega_id}>
                <strong>{d.bodega_nombre}</strong> — dif {num(d.dif)} cajas en {d.claves_descuadradas} clave
                {d.claves_descuadradas !== 1 ? 's' : ''}
                {d.tieneAjusteDirectoPostCorte ? (
                  <span className="font-semibold">
                    {' '}
                    · con ajuste directo posterior al corte: la cifra al corte puede diferir
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {' '}
                    · sin ajustes directos posteriores al corte: no debería alterar la cifra al corte
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {negativos > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>{negativos}</strong> producto{bloque(negativos)} quedan en negativo con el corte al{' '}
              {fechaCorte}. Pasa porque hay notas cuya <code>fecha_nota</code> y su{' '}
              <code>fecha_confirmacion</code> caen en meses distintos. Se muestran tal cual (sin truncar) para no
              falsear los totales.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Cálculo: <strong>stock de hoy</strong> menos el efecto de las{' '}
          <strong>{notasRevertidas}</strong> notas confirmadas posteriores al {fechaCorte} (de{' '}
          {nMovimientos} movimientos leídos). Solo notas CONF/MODF activas y solo cajas.
        </p>
      </div>

      {/* ── Resumen por bodega / ciudad ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ResumenTabla
          titulo="Resumen por bodega"
          columnas={['Bodega', 'Ciudad', 'Hoy', 'Ajuste', `Al ${fechaCorte}`]}
          filas={porBodega.map((b) => [
            b.bodega_nombre,
            b.ciudad,
            num(b.hoy),
            (b.ajuste > 0 ? '+' : b.ajuste < 0 ? '−' : '') + num(Math.abs(b.ajuste)),
            num(b.historico),
          ])}
        />
        <ResumenTabla
          titulo="Resumen por ciudad"
          columnas={['Ciudad', 'Hoy', 'Ajuste', `Al ${fechaCorte}`]}
          filas={porCiudad.map((c) => [
            c.ciudad,
            num(c.hoy),
            (c.ajuste > 0 ? '+' : c.ajuste < 0 ? '−' : '') + num(Math.abs(c.ajuste)),
            num(c.historico),
          ])}
        />
      </div>
    </div>
  )
}

function bloque(n: number): string {
  return n !== 1 ? 's' : ''
}

function ResumenTabla({
  titulo,
  columnas,
  filas,
}: {
  titulo: string
  columnas: string[]
  filas: string[][]
}) {
  if (filas.length === 0) return null
  return (
    <div className="rounded-lg border overflow-hidden bg-card">
      <div className="px-4 py-2.5 border-b bg-muted/50">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      </div>
      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr className="bg-muted/60 text-muted-foreground border-b">
              {columnas.map((c, i) => (
                <th
                  key={c}
                  className={`px-3 py-2 ${i === 0 ? 'text-left' : 'text-right'} font-semibold`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                {f.map((celda, j) => (
                  <td
                    key={j}
                    className={`px-3 py-1.5 ${j === 0 ? 'text-left' : 'text-right font-mono tabular-nums'}`}
                  >
                    {celda}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
