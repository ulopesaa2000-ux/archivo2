// app/(admin)/ecommerce/ordenes-venta/[id]/EstadoOrdenForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  actualizarEstadoOrden,
  actualizarNumeroRastreo,
  convertirCotizacionAOrdenB2B,
} from '@/modules/ecommerce/actions'

const ESTADOS = ['pendiente', 'aprobada', 'procesando', 'enviado', 'entregado', 'cancelado'] as const

interface EstadoOrdenFormProps {
  ordenId: number
  estadoActual: string
  rastreoActual: string | null
}

function Bloque({
  paso,
  titulo,
  descripcion,
  children,
}: {
  paso: string
  titulo: string
  descripcion: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/30">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{paso}</p>
      <h3 className="font-semibold text-sm">{titulo}</h3>
      <p className="text-xs text-muted-foreground">{descripcion}</p>
      {children}
    </div>
  )
}

export function EstadoOrdenForm({ ordenId, estadoActual, rastreoActual }: EstadoOrdenFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [estado, setEstado] = useState(estadoActual)
  const [rastreo, setRastreo] = useState(rastreoActual || '')

  const guardarEstado = () => {
    startTransition(async () => {
      const res = await actualizarEstadoOrden(ordenId, estado)
      if (res.success) {
        toast.success('Estado actualizado')
        router.refresh()
      } else {
        toast.error(res.error || 'Sin permiso para cambiar el estado')
      }
    })
  }

  const guardarRastreo = () => {
    startTransition(async () => {
      const res = await actualizarNumeroRastreo(ordenId, rastreo.trim())
      if (res.success) {
        toast.success('Guía de rastreo actualizada')
        router.refresh()
      } else {
        toast.error(res.error || 'Sin permiso para actualizar el rastreo')
      }
    })
  }

  const convertirAB2B = () => {
    if (!window.confirm('¿Convertir esta cotización en orden B2B mayorista?')) return
    startTransition(async () => {
      try {
        const res = await convertirCotizacionAOrdenB2B(ordenId)
        if (res.success) {
          toast.success(`Convertida a orden B2B #${res.ordenB2BId}`)
          router.refresh()
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo convertir')
      }
    })
  }

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Paso 3 — Seguimiento y rastreo</h2>
        <p className="text-xs text-muted-foreground">Después del cierre: estados intermedios, guía de envío y conversión mayorista. Cada bloque guarda solo su información.</p>
      </div>

      <Bloque
        paso="3a"
        titulo="Estado intermedio"
        descripcion="Avanza la nota (procesando, enviado, entregado). El cierre definitivo se hace arriba con Confirmar / Cancelar."
      >
        <div className="flex gap-2 max-w-sm">
          <Select value={estado} onValueChange={(v) => { if (v) setEstado(v) }}>
            <SelectTrigger id="estado" aria-label="Estado intermedio">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={guardarEstado} disabled={isPending || estado === estadoActual}>
            Guardar estado
          </Button>
        </div>
      </Bloque>

      <Bloque
        paso="3b"
        titulo="Guía de rastreo"
        descripcion="Número de guía de la paquetería para que el cliente rastree su mercancía."
      >
        <div className="flex gap-2 max-w-sm">
          <Input
            id="rastreo"
            value={rastreo}
            onChange={(e) => setRastreo(e.target.value)}
            placeholder="Guía de paquetería"
            aria-label="Número de guía"
          />
          <Button
            variant="outline"
            onClick={guardarRastreo}
            disabled={isPending || rastreo.trim() === (rastreoActual || '')}
          >
            Guardar guía
          </Button>
        </div>
      </Bloque>

      {estadoActual === 'pendiente' && (
        <Bloque
          paso="3c"
          titulo="Conversión mayorista"
          descripcion="Crea la orden B2B a partir de estas partidas, sin volver a capturarlas."
        >
          <Button variant="secondary" onClick={convertirAB2B} disabled={isPending}>
            Convertir a orden B2B
          </Button>
        </Bloque>
      )}
    </div>
  )
}
