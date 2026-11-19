// app/(admin)/inventario/notas/_components/NotaDespachoPopover.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ADMIN_ROUTES } from '@/lib/constants'
import { Calendar, ExternalLink, Loader2, RefreshCw, Truck } from 'lucide-react'
import type { DespachoVinculadoNota } from '@/modules/despachos/types'

interface NotaDespachoPopoverProps {
  despachoVinculado: DespachoVinculadoNota
  fechaNota: string
  disabled?: boolean
  isSubmitting?: boolean
  onCreate: (opts: { vehiculo?: string; chofer?: string }) => Promise<boolean>
  onSync?: () => Promise<void>
}

export function NotaDespachoPopover({
  despachoVinculado,
  fechaNota,
  disabled = false,
  isSubmitting = false,
  onCreate,
  onSync,
}: NotaDespachoPopoverProps) {
  const [open, setOpen] = useState(false)
  const [vehiculo, setVehiculo] = useState('')
  const [chofer, setChofer] = useState('')

  if (despachoVinculado) {
    return (
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <Link
          href={ADMIN_ROUTES.despachos.detalle(despachoVinculado.id)}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          title="Ver despacho vinculado"
        >
          <Truck className="h-3 w-3 shrink-0" />
          <span>Despacho #{despachoVinculado.id}</span>
          <span className="opacity-75 font-medium">({despachoVinculado.estado})</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-70" />
        </Link>
        {onSync && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => void onSync()}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title="Actualizar líneas del despacho con los productos actuales de esta nota"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sincronizar
          </Button>
        )}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await onCreate({
      vehiculo: vehiculo.trim() || undefined,
      chofer: chofer.trim() || undefined,
    })
    if (ok) {
      setOpen(false)
      setVehiculo('')
      setChofer('')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative inline-flex overflow-hidden rounded-full p-[1.5px] shadow-sm shadow-blue-500/25">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_220deg,#2563eb_285deg,#60a5fa_330deg,transparent_360deg)]"
        />
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isSubmitting}
              className="relative h-6 px-2.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/95 dark:text-blue-200 dark:hover:bg-blue-900/95 dark:hover:text-blue-100 transition-colors"
            />
          }
        >
          <Truck className="h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" />
          Generar Despacho
        </PopoverTrigger>
      </div>
      <PopoverContent align="end" side="bottom" sideOffset={6} className="w-80 p-3.5 rounded-xl shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <PopoverHeader>
            <PopoverTitle className="text-sm font-bold flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-primary" />
              Generar Despacho desde Nota
            </PopoverTitle>
            <PopoverDescription className="text-xs">
              Se vinculará a esta misma nota TRF sin duplicar movimientos.
            </PopoverDescription>
          </PopoverHeader>

          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              Fecha programada: <strong className="text-foreground">{fechaNota}</strong>
            </span>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="desp-vehiculo" className="text-xs">
                Vehículo (opcional)
              </Label>
              <Input
                id="desp-vehiculo"
                value={vehiculo}
                onChange={(e) => setVehiculo(e.target.value)}
                placeholder="Ej: Camión 3.5t"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="desp-chofer" className="text-xs">
                Chofer (opcional)
              </Label>
              <Input
                id="desp-chofer"
                value={chofer}
                onChange={(e) => setChofer(e.target.value)}
                placeholder="Nombre del chofer"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Crear Despacho
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
