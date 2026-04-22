'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  XCircle, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Save,
  ArrowRight
} from 'lucide-react'
import { cambiarEstadoNotaAction } from '@/modules/inventario/actions'
import type { NotaListItem } from '@/modules/inventario/types'
import { ESTADO_NOTA, ESTADO_NOTA_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'PEND', label: 'Pendiente', icon: Clock, color: 'text-yellow-500' },
  { id: 'PROC', label: 'En Proceso', icon: RefreshCw, color: 'text-blue-500' },
  { id: 'CONF', label: 'Confirmada', icon: CheckCircle2, color: 'text-emerald-500' },
]

export function NotaAcciones({
  nota,
  notaId,
}: {
  nota: NotaListItem
  notaId: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedEstadoId, setSelectedEstadoId] = useState(nota.estado_codigo)
  const [error, setError] = useState<string | null>(null)

  // Si la nota está cancelada, mostrar mensaje y salir
  if (nota.estado_codigo === 'CANC') {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3 text-destructive">
        <XCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-bold tracking-tight uppercase">Esta nota ha sido cancelada y no permite más movimientos de estado.</span>
      </div>
    )
  }

  const handleUpdateStatus = () => {
    if (selectedEstadoId === nota.estado_codigo) return

    setError(null)
    startTransition(async () => {
      // Necesitamos el ID numérico del estado
      const numericalId = (ESTADO_NOTA as any)[selectedEstadoId]
      if (!numericalId) {
        setError('Error al identificar el estado seleccionado.')
        return
      }

      const result = await cambiarEstadoNotaAction(notaId, numericalId)
      if (!result.success) {
        setError(result.error ?? 'Error al actualizar el estado.')
        return
      }
      router.refresh()
    })
  }

  const currentStepIdx = STEPS.findIndex(s => s.id === nota.estado_codigo)
  const hasChanged = selectedEstadoId !== nota.estado_codigo

  return (
    <div className="space-y-6 bg-card/50 p-6 rounded-3xl border shadow-inner">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        {/* Stepper Logic */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Flujo de Trabajo</span>
          </div>
          <div className="flex flex-wrap items-center gap-y-4">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon
              const isPast = idx < currentStepIdx
              const isCurrent = step.id === nota.estado_codigo
              const isSelected = step.id === selectedEstadoId
              const isDisabled = nota.estado_codigo === 'CONF' // Una vez confirmada, no se puede regresar via UI simple

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => !isDisabled && setSelectedEstadoId(step.id)}
                    disabled={isDisabled || isPending}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all duration-300 outline-none",
                      isSelected ? "scale-105" : "hover:bg-muted/50",
                      isDisabled && !isSelected && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border-2",
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-110" 
                        : isPast || isCurrent
                          ? "bg-background border-primary/20 text-primary"
                          : "bg-background border-muted text-muted-foreground"
                    )}>
                      <StepIcon className={cn("h-6 w-6 transition-transform group-hover:scale-110", isSelected && "animate-pulse")} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter opacity-70",
                      isSelected && "text-primary opacity-100"
                    )}>
                      {step.label}
                    </span>
                  </button>
                  
                  {idx < STEPS.length - 1 && (
                    <div className="px-2 sm:px-4 flex items-center opacity-30">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Button
            size="lg"
            variant={hasChanged ? "default" : "outline"}
            className={cn(
              "rounded-2xl px-8 h-14 font-black uppercase tracking-widest transition-all shadow-lg",
              !hasChanged && "opacity-50 pointer-events-none grayscale"
            )}
            onClick={handleUpdateStatus}
            disabled={isPending || !hasChanged}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-3" />
            )}
            Guardar Estado
          </Button>

          <div className="relative group">
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl h-14 px-6 border-destructive/20 text-destructive/40 bg-destructive/5 hover:bg-destructive/10 cursor-not-allowed grayscale"
              disabled
            >
              <XCircle className="h-5 w-5 mr-3" />
              Cancelar Nota
            </Button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest shadow-xl">
              Solo Administradores
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm font-bold text-destructive tracking-tight">{error}</p>
        </div>
      )}
    </div>
  )
}
