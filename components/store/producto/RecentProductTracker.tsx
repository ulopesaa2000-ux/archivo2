// components/store/producto/RecentProductTracker.tsx
'use client'

import { useEffect } from 'react'

export const RECENT_PRODUCTS_KEY = 'inv:store:recent:v1'
const MAX_RECENT = 8

export function RecentProductTracker({ productoWebId }: { productoWebId: number }) {
  useEffect(() => {
    if (!Number.isInteger(productoWebId) || productoWebId <= 0) return
    try {
      const raw = localStorage.getItem(RECENT_PRODUCTS_KEY)
      const prev: number[] = raw ? JSON.parse(raw) : []
      const cleanPrev = Array.isArray(prev)
        ? prev.filter((id) => Number.isInteger(id) && id > 0 && id !== productoWebId)
        : []
      const next = [productoWebId, ...cleanPrev].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(next))

      const visitKey = `inv:store:visita:${productoWebId}`
      if (!sessionStorage.getItem(visitKey)) {
        sessionStorage.setItem(visitKey, '1')
        void fetch('/api/ecommerce/visita', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productoWebId }),
          keepalive: true,
        }).catch(() => {
          // Si falla la red, permitir reintento en la siguiente vista
          sessionStorage.removeItem(visitKey)
        })
      }
    } catch {
      // Ignorar errores de almacenamiento privado
    }
  }, [productoWebId])

  return null
}
