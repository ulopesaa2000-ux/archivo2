// components/admin/UnauthorizedToastListener.tsx
'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function Listener() {
  const searchParams = useSearchParams()
  const unauthorized = searchParams?.get('unauthorized')

  useEffect(() => {
    if (unauthorized === 'true') {
      toast.error('No tienes autorización para acceder a esta sección.', {
        description: 'Tu rol o nivel de acceso B2B restringe el acceso a este módulo operativo.',
        duration: 6000,
      })
    }
  }, [unauthorized])

  return null
}

/**
 * Escuchador global de redirecciones no autorizadas.
 * Envuelto en un límite Suspense para evitar que rompa el renderizado estático de Next.js.
 */
export function UnauthorizedToastListener() {
  return (
    <Suspense fallback={null}>
      <Listener />
    </Suspense>
  )
}
