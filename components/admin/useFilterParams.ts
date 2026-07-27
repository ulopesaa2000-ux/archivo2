// components/admin/useFilterParams.ts
'use client'

/**
 * Hook compartido para todos los filtros del admin.
 *
 * Centraliza:
 * - Actualización de searchParams con useTransition (no bloquea UI)
 * - Limpieza total de filtros
 * - Estado isPending (para feedback visual)
 * - Debounce del buscador (importar useDebouncedCallback en el consumidor)
 *
 * Uso:
 *   const { updateParam, clearAll, isPending, searchParam } = useFilterParams()
 *   const q = searchParam('q')
 */

import { useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function useFilterParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  /**
   * Actualiza un parámetro en la URL.
   * - Si value es null / '' / '_all' → elimina el parámetro
   * - Siempre resetea 'page' para volver a la primera página
   */
  const updateParam = useCallback(
    (key: string, value: string | null) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === null || value === '' || value === '_all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
        params.delete('page')
        const qs = params.toString()
        router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
      })
    },
    [searchParams, pathname, router]
  )

  /**
   * Elimina todos los filtros de la URL.
   * Opcionalmente limpiar inputs pasando sus IDs de elemento.
   */
  const clearAll = useCallback(
    (inputIds?: string[]) => {
      startTransition(() => {
        router.push(pathname, { scroll: false })
      })
      // Limpiar visualmente los inputs de texto
      inputIds?.forEach((id) => {
        window.dispatchEvent(new Event(`clear-${id}`))
      })
    },
    [pathname, router]
  )

  /**
   * Leer el valor actual de un searchParam.
   * Equivalente a searchParams.get(key) ?? fallback
   */
  const searchParam = useCallback(
    (key: string, fallback = '') => {
      return searchParams.get(key) ?? fallback
    },
    [searchParams]
  )

  /**
   * True si hay algún filtro activo (excluyendo 'page').
   */
  const hasFilters = Array.from(searchParams.entries()).some(
    ([key]) => key !== 'page'
  )

  return {
    updateParam,
    clearAll,
    searchParam,
    isPending,
    hasFilters,
    searchParams,
    pathname,
  }
}
