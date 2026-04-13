// app/(admin)/inventario/notas/[id]/components/NotaCabecera.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Fecha } from '@/components/shared/Fecha'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  ADMIN_ROUTES, ESTADO_NOTA_COLORS,
  TIPO_MOVIMIENTO_ICONS, TIPO_MOVIMIENTO_COLORS,
} from '@/lib/constants'
import type { NotaListItem } from '@/modules/inventario/types'

export function NotaCabecera({ nota }: { nota: NotaListItem }) {
  const estadoColor = ESTADO_NOTA_COLORS[nota.estado_codigo] ?? 'bg-gray-100 text-gray-800'
  const tipoIcon = TIPO_MOVIMIENTO_ICONS[nota.tipo_codigo] ?? ''
  const tipoColor = TIPO_MOVIMIENTO_COLORS[nota.tipo_codigo] ?? ''

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={ADMIN_ROUTES.inventario.notas}
          className="hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Notas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium font-mono">
          {nota.numero_nota}
        </span>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              {/* Número + Estado */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold font-mono">{nota.numero_nota}</h2>
                <Badge className={estadoColor}>{nota.estado_nombre}</Badge>
                <Badge variant="secondary" className={tipoColor}>
                  <span className="mr-1">{tipoIcon}</span>
                  {nota.tipo_nombre}
                </Badge>
              </div>

              {/* Bodegas */}
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Origen: </span>
                  <span className="font-medium">{nota.bodega_origen_nombre}</span>
                  <span className="text-muted-foreground ml-1">({nota.bodega_origen_codigo})</span>
                </p>
                {nota.bodega_destino_nombre && (
                  <p>
                    <span className="text-muted-foreground">Destino: </span>
                    <span className="font-medium">{nota.bodega_destino_nombre}</span>
                    <span className="text-muted-foreground ml-1">({nota.bodega_destino_codigo})</span>
                  </p>
                )}
              </div>
            </div>

            {/* Info lateral */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Creada</span>
                <p><Fecha valor={nota.fecha_nota} formato="fecha-hora" /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Confirmada</span>
                <p><Fecha valor={nota.fecha_confirmacion} formato="fecha-hora" /></p>
              </div>
              <div>
                <span className="text-muted-foreground">Usuario</span>
                <p className="font-medium">{nota.usuario_nombre}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total cajas</span>
                <p className="font-bold text-lg tabular-nums">{nota.total_cajas ?? 0}</p>
              </div>
              {nota.nota_referencia && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Referencia</span>
                  <p>{nota.nota_referencia}</p>
                </div>
              )}
              {nota.observaciones && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Observaciones</span>
                  <p className="text-xs">{nota.observaciones}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
