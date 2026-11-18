// app/(admin)/ordenes-b2b/orden-rapida/_components/Step5Resultado.tsx
'use client'

import { CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Step5ResultadoProps {
  onNuevaOrden: () => void
}

export function Step5Resultado({ onNuevaOrden }: Step5ResultadoProps) {
  return (
    <div className="space-y-6 py-8 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-inner">
          <CheckCircle2 className="h-10 w-10 animate-bounce" />
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-2">
        <h2 className="text-xl font-bold text-foreground">Orden guardada</h2>
        <p className="text-sm text-muted-foreground">
          La orden B2B quedó registrada en Supabase con sus productos, cajas y detalles.
        </p>
      </div>

      <div className="mx-auto flex max-w-sm flex-col justify-center gap-3 pt-4 sm:flex-row">
        <Button className="h-10 w-full gap-1.5" onClick={onNuevaOrden}>
          <Plus className="h-4 w-4" /> Nueva orden
        </Button>
      </div>
    </div>
  )
}
