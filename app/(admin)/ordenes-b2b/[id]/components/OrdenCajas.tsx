'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'
import { desvincularCajaOrdenAction } from '@/modules/ordenes-b2b/actions'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'

export function OrdenCajas({ cajas, ordenId }: { cajas: any[]; ordenId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleRemove = (ordenCajaId: number) => {
    if (!confirm('¿Estás seguro de desvincular esta caja de la orden?')) return
    startTransition(async () => {
      await desvincularCajaOrdenAction(ordenCajaId, ordenId)
      router.refresh()
    })
  }

  if (cajas.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <Package className="h-8 w-8" />
        <p className="text-sm mt-2">Sin cajas vinculadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-4 max-w-5xl">
      {cajas.map((c) => {
        // Mapeo de datos para el componente compartido
        const cajaData: SharedCajaData = {
          id: c.id,
          codigo_caja: c.caja_codigo,
          nombre_pack: c.caja_nombre_pack,
          producto_sku: c.producto_sku,
          piezas_por_caja: c.caja_piezas_por_caja,
          cbm: c.caja_cbm,
          peso_bruto_kg: c.caja_peso_bruto_kg,
          cantidad_cajas: c.cantidad_cajas,
          contenidoMap: c.caja_contenidoMap,
          tallas: c.caja_tallas,
          colores: c.caja_colores
        }

        return (
          <CajaCard
            key={c.id}
            caja={cajaData}
            layout="horizontal"
            isPending={isPending}
            onRemove={() => handleRemove(c.id)}
          />
        )
      })}
    </div>
  )
}
