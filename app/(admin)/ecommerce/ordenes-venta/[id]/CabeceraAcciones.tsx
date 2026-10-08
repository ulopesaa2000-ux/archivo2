// app/(admin)/ecommerce/ordenes-venta/[id]/CabeceraAcciones.tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { actualizarEstadoOrden } from '@/modules/ecommerce/actions'
import { COTIZACION_DIRTY_EVENT } from './CotizacionEditor'

const ESTADOS_FINALES = ['cancelado', 'entregado', 'convertida']

/**
 * Cierre definitivo junto al título y al PDF: Confirmar / Cancelar compactos.
 * Exige borrador guardado, igual que en las notas de inventario.
 */
export function CabeceraAcciones({ ordenId, estado }: { ordenId: number; estado: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(0)

  useEffect(() => {
    const handleDirty = (e: Event) => {
      setCambiosSinGuardar(Number((e as CustomEvent<number>).detail || 0))
    }
    window.addEventListener(COTIZACION_DIRTY_EVENT, handleDirty)
    return () => {
      window.removeEventListener(COTIZACION_DIRTY_EVENT, handleDirty)
    }
  }, [])

  const bloqueado = ESTADOS_FINALES.includes(estado)
  const puedeConfirmar = !bloqueado && estado !== 'aprobada'
  const conBorradorSucio = cambiosSinGuardar > 0

  const cambiarEstado = (nuevo: 'aprobada' | 'cancelado', mensaje: string) => {
    if (conBorradorSucio) {
      toast.warning('Guarda el borrador antes de cerrar la nota')
      return
    }
    const texto = nuevo === 'aprobada'
      ? '¿Confirmar esta cotización como APROBADA? Ya no se podrá editar.'
      : '¿Cancelar esta cotización? Quedará marcada como CANCELADA.'
    if (!window.confirm(texto)) return
    startTransition(async () => {
      const res = await actualizarEstadoOrden(ordenId, nuevo)
      if (res.success) {
        toast.success(mensaje)
        router.refresh()
      } else {
        toast.error(res.error || 'Sin permiso para cambiar el estado')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        onClick={() => cambiarEstado('aprobada', 'Cotización confirmada (aprobada)')}
        disabled={isPending || !puedeConfirmar || conBorradorSucio}
        className="bg-emerald-700 hover:bg-emerald-800"
        title={conBorradorSucio ? 'Guarda el borrador antes de cerrar' : 'Confirmar cotización (cierre definitivo)'}
      >
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Confirmar
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => cambiarEstado('cancelado', 'Cotización cancelada')}
        disabled={isPending || bloqueado || conBorradorSucio}
        title={conBorradorSucio ? 'Guarda el borrador antes de cerrar' : 'Cancelar cotización (cierre definitivo)'}
      >
        <XCircle className="h-4 w-4 mr-1.5" />
        Cancelar
      </Button>
    </div>
  )
}
