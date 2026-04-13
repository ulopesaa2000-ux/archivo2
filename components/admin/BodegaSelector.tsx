// components/admin/BodegaSelector.tsx
'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useBodegaActiva } from '@/hooks/useBodegaActiva'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Warehouse, Loader2, RefreshCw } from 'lucide-react'
import type { BodegaRow } from '@/lib/types/tables'

/**
 * Dropdown para seleccionar la bodega activa.
 * 
 * Persiste la selección en cookie.
 * Se muestra en el Header del admin.
 * 
 * Las bodegas ya vienen filtradas por permisos del usuario
 * (se resolvió en el layout del server).
 */
export function BodegaSelector({ bodegas }: { bodegas: BodegaRow[] }) {
  const { bodegaActivaId, bodegaActiva, setBodegaActiva, isLoading } = useBodegaActiva(bodegas)
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingToast, setLoadingToast] = useState<{ visible: boolean; bodegaNombre: string }>({ visible: false, bodegaNombre: '' })

  if (bodegas.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Warehouse className="h-4 w-4" />
        <span>Sin bodegas asignadas</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Cargando...</span>
      </div>
    )
  }

  // Si solo hay una bodega, mostrar como texto fijo
  if (bodegas.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <Warehouse className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{bodegas[0].nombre}</span>
        {bodegas[0].es_virtual && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Virtual
          </Badge>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Warehouse className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={bodegaActivaId?.toString() ?? ''}
          onValueChange={(value) => {
            if (!value) return
            const newId = parseInt(value, 10)
            
            setBodegaActiva(newId)
            
            if (pathname === '/inventario/stock') {
              const bodegaObj = newId === 0 ? { nombre: 'Todas las bodegas' } : bodegas.find(b => b.id === newId)
              setLoadingToast({ visible: true, bodegaNombre: bodegaObj?.nombre ?? 'la bodega seleccionada' })
              
              router.push('/inventario/stock')
              startTransition(() => {
                router.refresh()
              })

              setTimeout(() => {
                setLoadingToast(prev => ({ ...prev, visible: false }))
              }, 3000)
            }
          }}
        >
          <SelectTrigger className="h-8 max-w-[220px] text-sm">
            <SelectValue placeholder="Seleccionar bodega">
              {bodegaActivaId === 0 
                ? 'Todas las bodegas' 
                : bodegaActiva?.nombre ?? 'Seleccionar bodega'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">
              <span className="font-medium text-primary">Todas las bodegas</span>
            </SelectItem>
            {bodegas.map((bodega) => (
              <SelectItem
                key={bodega.id}
                value={bodega.id.toString()}
              >
                <div className="flex items-center gap-2">
                  <span>{bodega.nombre}</span>
                  {bodega.es_virtual && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      Virtual
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading Toast (solo para /inventario/stock) */}
      {loadingToast.visible && (
        <div className="fixed top-6 right-6 z-[9999] bg-background border shadow-xl rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className={`h-4 w-4 text-primary ${isPending ? 'animate-spin' : ''}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Actualizando vista</span>
            <span className="text-xs text-muted-foreground">Cargando stock de <strong>{loadingToast.bodegaNombre}</strong>...</span>
          </div>
        </div>
      )}
    </>
  )
}
