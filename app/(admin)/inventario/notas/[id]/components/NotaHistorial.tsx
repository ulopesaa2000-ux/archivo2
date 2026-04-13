// app/(admin)/inventario/notas/[id]/components/NotaHistorial.tsx
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import { Clock } from 'lucide-react'
import { ESTADO_NOTA_COLORS } from '@/lib/constants'
import type { HistorialEstadoResuelto } from '@/modules/inventario/types'

export function NotaHistorial({
  historial,
}: {
  historial: HistorialEstadoResuelto[]
}) {
  if (historial.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-6 w-6" />
        <p className="text-sm mt-2">Sin historial de cambios.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Historial de Estados</h3>
      <div className="rounded-lg border divide-y">
        {historial.map((h) => {
          const colorNuevo = ESTADO_NOTA_COLORS[h.estado_nuevo_codigo] ?? ''
          const colorAnterior = h.estado_anterior_codigo
            ? ESTADO_NOTA_COLORS[h.estado_anterior_codigo] ?? ''
            : ''

          return (
            <div key={h.id} className="flex items-center gap-4 px-4 py-3 text-sm">
              <Fecha
                valor={h.fecha_cambio}
                formato="fecha-hora"
                className="text-xs text-muted-foreground shrink-0 w-[140px]"
              />
              <div className="flex items-center gap-2 flex-1">
                {h.estado_anterior_nombre ? (
                  <>
                    <Badge variant="secondary" className={`text-[10px] ${colorAnterior}`}>
                      {h.estado_anterior_nombre}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                  </>
                ) : null}
                <Badge variant="secondary" className={`text-[10px] ${colorNuevo}`}>
                  {h.estado_nuevo_nombre}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {h.usuario_nombre}
              </span>
              {h.comentario && (
                <span className="text-xs text-muted-foreground italic hidden md:block max-w-[200px] truncate">
                  {h.comentario}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
