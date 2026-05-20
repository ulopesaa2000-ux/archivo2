'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BodegaRow } from '@/lib/types/tables'

const COOKIE_NAME = 'bodega_activa_id'

/**
 * Hook para leer y escribir la bodega activa.
 *
 * Arranca con una bodega util desde el primer render para no dejar
 * el header atrapado en "Cargando..." mientras la pagina ya esta lista.
 * Luego sincroniza la cookie del navegador y corrige el valor si hace falta.
 */
export function useBodegaActiva(bodegas: BodegaRow[]) {
  const [bodegaActivaId, setBodegaActivaId] = useState<number | null>(
    bodegas[0]?.id ?? null
  )

  useEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1]

    const savedId = cookieValue ? parseInt(cookieValue, 10) : null

    if (
      savedId !== null &&
      (savedId === 0 || bodegas.some((bodega) => bodega.id === savedId))
    ) {
      setBodegaActivaId(savedId)
      return
    }

    if (bodegas.length > 0) {
      const fallbackId = bodegas[0].id
      setBodegaActivaId(fallbackId)
      setCookie(fallbackId)
      return
    }

    setBodegaActivaId(null)
  }, [bodegas])

  const setBodegaActiva = useCallback((id: number) => {
    setBodegaActivaId(id)
    setCookie(id)
  }, [])

  const bodegaActiva = bodegas.find((bodega) => bodega.id === bodegaActivaId) ?? null

  return {
    bodegaActiva,
    bodegaActivaId,
    setBodegaActiva,
    bodegas,
    isLoading: false,
  }
}

function setCookie(id: number) {
  document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
}

/**
 * Helper para leer la bodega activa desde Server Components.
 */
export function getBodegaActivaFromCookies(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): number | null {
  const cookie = cookieStore.get(COOKIE_NAME)
  if (!cookie?.value) return null

  const parsed = parseInt(cookie.value, 10)
  return Number.isNaN(parsed) ? null : parsed
}
