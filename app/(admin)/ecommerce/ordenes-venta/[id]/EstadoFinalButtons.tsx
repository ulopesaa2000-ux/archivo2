// app/(admin)/ecommerce/ordenes-venta/[id]/EstadoFinalButtons.tsx
'use client'

/**
 * Paso 2 — Franja informativa del cierre (opción 1: sin botones).
 * El cierre definitivo vive en el header (CabeceraAcciones, junto al PDF).
 */
export function EstadoFinalButtons({ estado }: { ordenId: number; estado: string }) {
  const cerrada = ['aprobada', 'cancelado', 'entregado', 'convertida'].includes(estado)

  return (
    <div className="rounded-lg border-2 border-dashed border-border p-6 space-y-2">
      <h2 className="font-semibold">Paso 2 — Estado final de la cotización</h2>
      <p className="text-xs text-muted-foreground">
        Estado actual: <strong className="text-foreground">{estado}</strong>.{' '}
        {cerrada
          ? 'Nota cerrada definitivamente: ya no admite edición. Usa los botones Confirmar / Cancelar del encabezado solo mientras siga abierta.'
          : 'Mientras siga abierta puedes editarla con el borrador; al confirmar o cancelar (botones del encabezado) queda cerrada.'}
      </p>
    </div>
  )
}
