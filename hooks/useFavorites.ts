// hooks/useFavorites.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_EVENT_KEY,
  MAX_FAVORITES,
  sanitizeFavoriteIds,
  mergeFavoriteIds,
} from '@/lib/utils/favoritos'
import { fetchFavoritosUsuario } from '@/modules/ecommerce/favoritos/queries'
import {
  agregarFavorito,
  quitarFavorito,
  limpiarFavoritos,
  sincronizarFavoritosPendientes,
} from '@/modules/ecommerce/favoritos/actions'

function getFavoritesFromStorage(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const fromLocal = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (fromLocal) {
      return sanitizeFavoriteIds(JSON.parse(fromLocal))
    }
    const match = document.cookie.match(new RegExp('(?:^|; )' + FAVORITES_STORAGE_KEY + '=([^;]*)'))
    if (match?.[1]) {
      return sanitizeFavoriteIds(JSON.parse(decodeURIComponent(match[1])))
    }
  } catch (e) {
    console.error('Error al leer favoritos desde el almacenamiento', e)
  }
  return []
}

function saveFavoritesToStorage(ids: number[]) {
  if (typeof window === 'undefined') return
  try {
    const serialized = JSON.stringify(ids)
    localStorage.setItem(FAVORITES_STORAGE_KEY, serialized)
    document.cookie = `${FAVORITES_STORAGE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT_KEY, { detail: ids }))
  } catch (e) {
    console.error('Error al guardar favoritos', e)
  }
}

function toggleInList(prev: number[], productoWebId: number): number[] {
  const next = prev.includes(productoWebId)
    ? prev.filter((id) => id !== productoWebId)
    : [...prev, productoWebId].slice(0, MAX_FAVORITES)
  queueMicrotask(() => saveFavoritesToStorage(next))
  return next
}

export function useFavorites() {
  const [ids, setIds] = useState<number[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [isLogged, setIsLogged] = useState(false)

  /**
   * Reconcilia local con DB: une ambas listas y persiste en DB
   * solo los pendientes que falten. Nunca borra nada.
   */
  const reconcileWithServer = useCallback(async (): Promise<boolean> => {
    let serverIds: number[] | null
    try {
      serverIds = await fetchFavoritosUsuario()
    } catch {
      return false
    }
    if (serverIds === null) return false

    setIsLogged(true)
    const pending = getFavoritesFromStorage().filter((id) => !serverIds.includes(id))
    if (pending.length > 0) {
      try {
        await sincronizarFavoritosPendientes(pending)
      } catch {
        // Se conserva todo en local; se reintentará en el próximo login
      }
    }
    // Unión funcional: lo local + lo que ya estaba en DB
    setIds((prev) => {
      const merged = mergeFavoriteIds(prev, serverIds)
      queueMicrotask(() => saveFavoritesToStorage(merged))
      return merged
    })
    return true
  }, [])

  // Hydrate inicial (siempre local, haya sesión o no) + reconcile con DB
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legítimo: hidratar desde localStorage/cookies
    setIds(getFavoritesFromStorage())
    setIsHydrated(true)
    // Reconciliar local con DB al montar (cubre sesión restaurada)
    void reconcileWithServer()
  }, [reconcileWithServer])

  // Reconciliar en cada login fresco
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void reconcileWithServer()
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [reconcileWithServer])

  // Escuchar actualizaciones de sync entre pestañas o componentes
  useEffect(() => {
    if (!isHydrated) return

    const handleSync = (e?: Event) => {
      const customEvent = e as CustomEvent<number[]> | undefined
      if (Array.isArray(customEvent?.detail)) {
        setIds(sanitizeFavoriteIds(customEvent.detail))
      } else {
        setIds(getFavoritesFromStorage())
      }
    }

    window.addEventListener(FAVORITES_EVENT_KEY, handleSync)
    window.addEventListener('storage', handleSync)

    return () => {
      window.removeEventListener(FAVORITES_EVENT_KEY, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [isHydrated])

  const toggleFavorite = useCallback((productoWebId: number) => {
    if (!Number.isInteger(productoWebId) || productoWebId <= 0) return
    const wasAdding = !ids.includes(productoWebId)
    setIds((prev) => toggleInList(prev, productoWebId))
    if (isLogged) {
      const action = wasAdding ? agregarFavorito : quitarFavorito
      action(productoWebId).then((res) => {
        // Invitado o fallo real en DB: revertir el optimista para no mentir en UI
        if (!res.success) {
          setIds((prev) => toggleInList(prev, productoWebId))
        }
      })
    }
  }, [ids, isLogged])

  const removeFavorite = useCallback((productoWebId: number) => {
    const wasPresent = ids.includes(productoWebId)
    setIds((prev) => {
      if (!prev.includes(productoWebId)) return prev
      const next = prev.filter((id) => id !== productoWebId)
      queueMicrotask(() => saveFavoritesToStorage(next))
      return next
    })
    if (isLogged && wasPresent) {
      quitarFavorito(productoWebId).then((res) => {
        if (!res.success) {
          setIds((prev) => toggleInList(prev, productoWebId))
        }
      })
    }
  }, [ids, isLogged])

  const clearFavorites = useCallback(() => {
    setIds([])
    saveFavoritesToStorage([])
    if (isLogged) {
      limpiarFavoritos().then((res) => {
        if (!res.success) {
          // Falló el vaciado en DB: rehidratar desde servidor en el próximo login
          void reconcileWithServer()
        }
      })
    }
  }, [isLogged, reconcileWithServer])

  const isFavorite = useCallback(
    (productoWebId: number) => ids.includes(productoWebId),
    [ids]
  )

  return {
    ids,
    count: ids.length,
    isHydrated,
    isLogged,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    isFavorite,
  }
}
