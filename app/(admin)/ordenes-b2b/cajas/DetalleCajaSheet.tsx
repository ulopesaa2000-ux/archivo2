'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Package } from 'lucide-react'
import { ADMIN_ROUTES } from '@/lib/constants'
import { buildCajaContenidoMap } from '@/modules/cajas/utils'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'

export function DetalleCajaSheet({ cajaId }: { cajaId: number }) {
  const [data, setData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/ordenes-b2b/caja-detalle?id=${cajaId}`)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => {
        console.error('Error fetching caja detail:', err)
        setData(null)
      })
      .finally(() => setIsLoading(false))
  }, [cajaId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center space-y-2">
        <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No se encontró la información de la caja.</p>
      </div>
    )
  }

  // Preparamos los datos para el componente compartido
  const sharedCaja: SharedCajaData = {
    ...data,
    contenidoMap: buildCajaContenidoMap(data.detalles_talla_color)
  }

  return (
    <div className="space-y-6 pt-4 pb-12">
      {/* Componente unificado en modo vertical */}
      <CajaCard 
        caja={sharedCaja} 
        layout="vertical" 
        onDeactivate={async (id) => {
          await import('@/modules/cajas/actions').then(m => m.desactivarCajaAction(id));
        }}
      />

      {/* Secciones extra específicas del Sheet */}
      {data.ordenes_vinculadas && data.ordenes_vinculadas.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4 px-1">
            <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
              Órdenes Vinculadas
            </h4>
            <div className="grid gap-2">
              {data.ordenes_vinculadas.map((o: any) => (
                <Link 
                  key={o.orden_id} 
                  href={ADMIN_ROUTES.ordenesB2B.detalle(o.orden_id)}
                  className="group flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold font-mono text-primary group-hover:underline">
                      Orden #{o.orden_id}
                    </span>
                    {o.contenedor_codigo && (
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
                         {o.contenedor_codigo}
                      </span>
                    )}
                  </div>
                  <Package className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
