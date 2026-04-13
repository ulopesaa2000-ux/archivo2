// app/(admin)/inventario/notas/[id]/components/NotaAcciones.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { XCircle, Loader2, AlertCircle } from 'lucide-react'
import { cancelarNotaAction } from '@/modules/inventario/actions'
import type { NotaListItem } from '@/modules/inventario/types'

export function NotaAcciones({
  nota,
  notaId,
}: {
  nota: NotaListItem
  notaId: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCancel, setShowCancel] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Solo mostrar acciones si la nota no está ya cancelada
  if (nota.estado_codigo === 'CANC') return null

  const handleCancel = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelarNotaAction(notaId, motivo || undefined)
      if (!result.success) {
        setError(result.error ?? 'Error al cancelar.')
        return
      }
      setShowCancel(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Solo notas confirmadas pueden cancelarse desde aquí */}
      {nota.estado_codigo === 'CONF' && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowCancel(true)}
          disabled={isPending}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancelar Nota
        </Button>
      )}

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar nota {nota.numero_nota}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la nota como cancelada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Input
              placeholder="Motivo de cancelación (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
