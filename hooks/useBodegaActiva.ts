// hooks/useBodegaActiva.ts
'use client'

import { useState, useLayoutEffect, useCallback } from 'react'
import type { BodegaRow } from '@/lib/types/tables'

const COOKIE_NAME = 'bodega_activa_id'

/**
 * Hook para leer/escribir la bodega activa.
 * 
 * Persiste la selección en cookie para que:
 *   - El Server Component del layout pueda leerla (via cookies())
 *   - Sobreviva entre recargas de página
 *   - Sea compartida entre pestañas del mismo browser
 * 
 * El hook recibe las bodegas disponibles como prop
 * (ya filtradas por permisos del usuario en el server).
 */
export function useBodegaActiva(bodegas: BodegaRow[]) {
  const [bodegaActivaId, setBodegaActivaId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Leer cookie al montar
  useLayoutEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1]

    const savedId = cookieValue ? parseInt(cookieValue, 10) : null

    // Verificar que la bodega guardada sigue siendo accesible o es Todas (0)
    if (savedId !== null && (savedId === 0 || bodegas.some((b) => b.id === savedId))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBodegaActivaId(savedId)
    } else if (bodegas.length > 0) {
      // Si no hay guardada o no es válida, usar la primera
       
      setBodegaActivaId(bodegas[0].id)
      setCookie(bodegas[0].id)
    }

    setIsLoading(false)
  }, [bodegas])

  const setBodegaActiva = useCallback(
    (id: number) => {
      setBodegaActivaId(id)
      setCookie(id)
    },
    []
  )

  const bodegaActiva = bodegas.find((b) => b.id === bodegaActivaId) ?? null

  return {
    bodegaActiva,
    bodegaActivaId,
    setBodegaActiva,
    bodegas,
    isLoading,
  }
}

function setCookie(id: number) {
  // Cookie con 1 año de expiración, accesible desde el server
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
}

/**
 * Helper para leer la bodega activa desde Server Components.
 * Se usa en pages que necesitan la bodega como filtro.
 */
export function getBodegaActivaFromCookies(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): number | null {
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return null
  const parsed = parseInt(cookie.value, 10)
  return isNaN(parsed) ? null : parsed
}
