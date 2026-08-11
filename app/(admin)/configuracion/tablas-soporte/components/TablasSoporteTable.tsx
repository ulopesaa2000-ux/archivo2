// app/(admin)/configuracion/tablas-soporte/components/TablasSoporteTable.tsx
'use client'

import { useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Edit2, MoreHorizontal, Trash2, Power, Database } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from '@/modules/config/tablas-soporte/types'
import {
  toggleActiveTablaSoporteRecordAction,
  deleteTablaSoporteRecordAction,
} from '@/modules/config/tablas-soporte/actions'

export function TablasSoporteTable({
  tabla,
  items,
  onEdit,
}: {
  tabla: TablaSoporteKey
  items: Record<string, any>[]
  onEdit: (item: Record<string, any>) => void
}) {
  const [isPending, startTransition] = useTransition()
  const config = TABLAS_SOPORTE_CONFIG[tabla]

  function handleToggleActive(id: number, currentActive: boolean | null) {
    startTransition(async () => {
      await toggleActiveTablaSoporteRecordAction(tabla, id, currentActive)
    })
  }

  function handleDelete(id: number) {
    if (!confirm(`¿Estás seguro de eliminar el registro #${id} de ${config.label}?`)) return
    startTransition(async () => {
      const res = await deleteTablaSoporteRecordAction(tabla, id)
      if (!res.success) {
        alert(res.error || 'No se pudo eliminar el registro')
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No hay registros en {config.label}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          No se encontraron elementos que coincidan con la búsqueda o la tabla aún está vacía.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-16">ID</TableHead>

              {/* COLUMNAS SEGÚN TABLA */}
              {tabla === 'personas' && (
                <>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Tipo Entidad</TableHead>
                  <TableHead>RFC / Fiscal</TableHead>
                  <TableHead>Contacto</TableHead>
                </>
              )}

              {tabla === 'cat_marcas' && (
                <>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Orden</TableHead>
                </>
              )}

              {tabla === 'cat_tallas' && (
                <>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Talla US</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>¿Extra?</TableHead>
                </>
              )}

              {tabla === 'cat_colores' && (
                <>
                  <TableHead>Muestra</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>HEX</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Orden</TableHead>
                </>
              )}

              {tabla === 'cat_telas' && (
                <>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Composición</TableHead>
                  <TableHead>Familia</TableHead>
                  <TableHead>Material</TableHead>
                </>
              )}

              {tabla === 'cat_generos' && (
                <>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                </>
              )}

              {tabla === 'cat_edades' && (
                <>
                  <TableHead>Rango de Edad</TableHead>
                  <TableHead>Etiqueta / Talla</TableHead>
                  <TableHead>Orden</TableHead>
                </>
              )}

              {tabla === 'cat_tipo_prenda' && (
                <>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sección Corporal</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Orden</TableHead>
                </>
              )}

              {tabla === 'cat_tipos_movimiento' && (
                <>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Afectación Stock</TableHead>
                  <TableHead>Bodega Destino</TableHead>
                </>
              )}

              {tabla === 'cat_estados_nota' && (
                <>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                </>
              )}

              {config.hasActivoCol && <TableHead className="w-24">Estado</TableHead>}
              <TableHead className="w-32 text-muted-foreground font-normal">Creación</TableHead>
              <TableHead className="w-16 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs text-muted-foreground">{row.id}</TableCell>

                {/* VALORES PERSONAS */}
                {tabla === 'personas' && (
                  <>
                    <TableCell className="font-semibold text-foreground">{row.nombre_completo}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {row.tipo_entidad || 'Sin tipo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.identificacion_fiscal || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {row.email_contacto && <div>{row.email_contacto}</div>}
                      {row.telefono_contacto && (
                        <div className="text-muted-foreground">{row.telefono_contacto}</div>
                      )}
                      {!row.email_contacto && !row.telefono_contacto && '—'}
                    </TableCell>
                  </>
                )}

                {/* VALORES CAT_MARCAS */}
                {tabla === 'cat_marcas' && (
                  <>
                    <TableCell className="font-semibold">{row.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {row.logo_url ? (
                        <a
                          href={row.logo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          Ver imagen
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{row.ORDEN ?? '—'}</TableCell>
                  </>
                )}

                {/* VALORES CAT_TALLAS */}
                {tabla === 'cat_tallas' && (
                  <>
                    <TableCell className="font-mono font-bold text-primary">{row.codigo}</TableCell>
                    <TableCell>{row.nombre || '—'}</TableCell>
                    <TableCell className="text-xs">{row.categoria || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{row.talla_us || '—'}</TableCell>
                    <TableCell className="text-xs">{row.orden ?? '—'}</TableCell>
                    <TableCell>
                      {row.es_extra ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Especial
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </>
                )}

                {/* VALORES CAT_COLORES */}
                {tabla === 'cat_colores' && (
                  <>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full border shadow-xs shrink-0"
                          style={{
                            backgroundColor:
                              row.hex_code && /^#[0-9A-F]{6}$/i.test(row.hex_code)
                                ? row.hex_code
                                : '#CBD5E1',
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{row.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{row.hex_code || '—'}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{row.tipo_color || 'sólido'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{row.orden_display}</TableCell>
                  </>
                )}

                {/* VALORES CAT_TELAS */}
                {tabla === 'cat_telas' && (
                  <>
                    <TableCell className="font-semibold">{row.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.composicion || '—'}</TableCell>
                    <TableCell className="text-xs">{row.familia_tela || '—'}</TableCell>
                    <TableCell className="text-xs">{row.tela_material || '—'}</TableCell>
                  </>
                )}

                {/* VALORES CAT_GENEROS */}
                {tabla === 'cat_generos' && (
                  <>
                    <TableCell className="font-semibold">{row.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{row.codigo || '—'}</TableCell>
                  </>
                )}

                {/* VALORES CAT_EDADES */}
                {tabla === 'cat_edades' && (
                  <>
                    <TableCell className="font-semibold">{row.rango}</TableCell>
                    <TableCell className="text-xs">{row.edad_talla || '—'}</TableCell>
                    <TableCell className="text-xs">{row.orden ?? '—'}</TableCell>
                  </>
                )}

                {/* VALORES CAT_TIPO_PRENDA */}
                {tabla === 'cat_tipo_prenda' && (
                  <>
                    <TableCell className="font-semibold">{row.nombre}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="capitalize">
                        {row.sup_inf_compl || 'general'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {row.descripcion_prenda || '—'}
                    </TableCell>
                    <TableCell className="text-xs">{row.orden ?? '—'}</TableCell>
                  </>
                )}

                {/* VALORES CAT_TIPOS_MOVIMIENTO */}
                {tabla === 'cat_tipos_movimiento' && (
                  <>
                    <TableCell className="font-mono font-bold">{row.codigo}</TableCell>
                    <TableCell className="font-medium">{row.nombre}</TableCell>
                    <TableCell>
                      {row.afecta_inventario === 1 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          +1 Entrada
                        </Badge>
                      ) : row.afecta_inventario === -1 ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                          -1 Salida
                        </Badge>
                      ) : (
                        <Badge variant="outline">0 Neutral</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.requiere_destino ? 'Sí (Obligatorio)' : 'No'}
                    </TableCell>
                  </>
                )}

                {/* VALORES CAT_ESTADOS_NOTA */}
                {tabla === 'cat_estados_nota' && (
                  <>
                    <TableCell className="font-mono font-bold">{row.codigo}</TableCell>
                    <TableCell className="font-semibold">{row.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.descripcion || '—'}</TableCell>
                  </>
                )}

                {/* ACTIVO BADGE / SWITCH */}
                {config.hasActivoCol && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(row.activo)}
                        onCheckedChange={() => handleToggleActive(row.id, row.activo)}
                        disabled={isPending}
                      />
                      <span className="text-xs font-medium">
                        {row.activo ? (
                          <span className="text-emerald-600 font-semibold">Activo</span>
                        ) : (
                          <span className="text-muted-foreground">Inactivo</span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                )}

                {/* CREATED AT */}
                <TableCell className="text-xs text-muted-foreground">
                  <Fecha valor={row.created_at} formato="fecha" />
                </TableCell>

                {/* ACCIONES */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon-sm" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onEdit(row)}>
                        <Edit2 className="h-3.5 w-3.5 mr-2 text-primary" />
                        Editar
                      </DropdownMenuItem>

                      {config.hasActivoCol && (
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(row.id, row.activo)}
                        >
                          <Power className="h-3.5 w-3.5 mr-2 text-amber-500" />
                          {row.activo ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDelete(row.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
