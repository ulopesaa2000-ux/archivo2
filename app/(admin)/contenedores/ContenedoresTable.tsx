// app/(admin)/contenedores/ContenedoresTable.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Ship, Eye } from 'lucide-react'
import { Fecha } from '@/components/shared/Fecha'
import { formatCurrency, cn } from '@/lib/utils'
import { ADMIN_ROUTES, ESTADO_CONTENEDOR_COLORS, ESTADO_CONTENEDOR_LABELS } from '@/lib/constants'
import type { ContenedorResumen } from '@/modules/contenedores/types'

export function ContenedoresTable({ items }: { items: ContenedorResumen[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border">
        <Ship className="h-12 w-12" />
        <p className="text-sm mt-4">No se encontraron contenedores.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
            <th className="px-2 py-2 w-[40px]"></th>
            <th className="px-4 py-2 text-left">N° Contenedor</th>
            <th className="px-4 py-2 text-left">Código</th>
            <th className="px-4 py-2 text-left hidden md:table-cell">ETA</th>
            <th className="px-4 py-2 text-center hidden lg:table-cell">Órdenes</th>
            <th className="px-4 py-2 text-center hidden lg:table-cell">Cajas</th>
            <th className="px-4 py-2">Estado</th>
            <th className="px-4 py-2 w-[50px]"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isOpen = expanded.has(item.contenedor_id)
            const estadoColor = ESTADO_CONTENEDOR_COLORS[item.estado] ?? ''

            return (
              <React.Fragment key={item.contenedor_id}>
                <tr className="border-t hover:bg-muted/30">
                  <td className="px-2 py-2">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      aria-label={isOpen ? `Colapsar contenedor ${item.contenedor_id}` : `Expandir contenedor ${item.contenedor_id}`}
                      onClick={() => toggle(item.contenedor_id)}>
                      {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </Button>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs font-medium">
                    {item.numero_contenedor ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{item.codigo_contenedor}</td>
                  <td className="px-4 py-2 hidden md:table-cell">
                    <Fecha valor={item.fecha_eta} formato="fecha" className="text-xs" />
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums hidden lg:table-cell">
                    {item.total_ordenes}
                  </td>
                  <td className="px-4 py-2 text-center tabular-nums hidden lg:table-cell">
                    {item.cajas_totales}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className={`text-xs ${estadoColor}`}>
                      {ESTADO_CONTENEDOR_LABELS[item.estado] ?? item.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Link 
                      href={ADMIN_ROUTES.contenedores.detalle(item.contenedor_id)}
                      title={`Ver contenedor ${item.contenedor_id}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}>
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>

                {isOpen && (
                  <tr className="bg-muted/20">
                    <td></td>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Naviera</span>
                          <p className="font-medium">{item.naviera ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">BL</span>
                          <p className="font-mono text-xs">{item.numero_bl ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Buque</span>
                          <p>{item.buque ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Ruta</span>
                          <p className="text-xs">{item.puerto_origen ?? '?'} → {item.puerto_destino ?? '?'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">ETD</span>
                          <p><Fecha valor={item.fecha_etd} formato="fecha" className="text-xs" /></p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">ETA</span>
                          <p><Fecha valor={item.fecha_eta} formato="fecha" className="text-xs" /></p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Peso</span>
                          <p className="tabular-nums">{item.peso_total_kg ? `${item.peso_total_kg} kg` : '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">CBM</span>
                          <p className="tabular-nums">
                            {item.cbm_ocupado ?? 0} / {item.cbm_total ?? '?'}
                            {item.pct_cbm_ocupado != null && (
                              <span className="text-muted-foreground ml-1">({item.pct_cbm_ocupado}%)</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Piezas</span>
                          <p className="tabular-nums font-medium">{item.piezas_totales}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Valor</span>
                          <p className="font-medium">{item.valor_total_usd ? formatCurrency(item.valor_total_usd, 'USD') : '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Proveedores</span>
                          <p className="tabular-nums">{item.total_proveedores}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
