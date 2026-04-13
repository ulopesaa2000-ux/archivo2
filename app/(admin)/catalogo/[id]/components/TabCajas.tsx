'use client'

import { Package } from 'lucide-react'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'
import { desactivarCajaAction } from '@/modules/cajas/actions'

export function TabCajas({ cajas }: { cajas: any[] }) {
  if (!cajas || cajas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed">
        <Package className="h-8 w-8 mb-2 opacity-20" />
        <p>Este producto aún no tiene cajas vinculadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {cajas.map((caja) => (
        <CajaCard 
          key={caja.id} 
          caja={caja as SharedCajaData} 
          onDeactivate={desactivarCajaAction}
        />
      ))}
    </div>
  )
}
