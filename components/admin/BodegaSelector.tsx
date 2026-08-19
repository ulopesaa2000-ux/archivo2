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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
export function BodegaSelector({ 
  bodegas,
  showAllOption = true
}: { 
  bodegas: BodegaRow[]
  showAllOption?: boolean
}) {
  const { bodegaActivaId, bodegaActiva, setBodegaActiva, isLoading } = useBodegaActiva(bodegas, showAllOption)
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingToast, setLoadingToast] = useState<{ visible: boolean; bodegaNombre: string }>({ visible: false, bodegaNombre: '' })
  const [showNotice, setShowNotice] = useState(false)

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

  // Si solo hay una bodega y NO está activa la opción "Todas las bodegas", mostrar como texto fijo
  if (bodegas.length === 1 && !showAllOption) {
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
      <div className="relative flex items-center gap-1 sm:gap-2 min-w-0">
        <Warehouse className="h-4 w-4 text-muted-foreground shrink-0 hidden xs:block" />
        <Select
          value={bodegaActivaId?.toString() ?? ''}
          onValueChange={(value) => {
            if (!value) return
            const newId = parseInt(value, 10)
            
            setBodegaActiva(newId)
            setShowNotice(true)
            
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
          <SelectTrigger className="h-8 min-w-[90px] max-w-[140px] xs:max-w-[170px] sm:max-w-[220px] text-xs sm:text-sm px-2 sm:px-3 font-semibold truncate">
            <SelectValue placeholder="Seleccionar bodega">
              {bodegaActivaId === 0 
                ? 'Todas las bodegas' 
                : bodegaActiva?.nombre ?? 'Seleccionar bodega'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {showAllOption && (
              <SelectItem value="0">
                <span className="font-medium text-primary">Todas las bodegas</span>
              </SelectItem>
            )}
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg flex items-center justify-center shrink-0"
          onClick={() => {
            setShowNotice(false)
            startTransition(() => {
              router.refresh()
            })
          }}
          disabled={isPending}
          title="Recargar vista manualmente"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
        </Button>

        {showNotice && (
          <span className="absolute top-9 left-6 z-50 text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-2.5 py-0.5 rounded shadow-lg animate-in fade-in slide-in-from-top-1 duration-200 whitespace-nowrap">
            Recarga para ver la información de esta bodega
          </span>
        )}
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
