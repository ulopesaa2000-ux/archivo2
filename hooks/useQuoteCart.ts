// hooks/useQuoteCart.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConfigEcommerce } from './useConfigEcommerce'
import type { QuoteItem, QuoteCart } from '@/modules/ecommerce/types'

const STORAGE_KEY = 'inv_tienda_quote_cart_v2'
const EVENT_KEY = 'inv_cart_updated_v2'

export function getQuoteItemKey(item: Pick<QuoteItem, 'productoWebId' | 'varianteId' | 'esSurtido'>): string {
  return `${item.productoWebId}:${item.varianteId ?? 'base'}:${item.esSurtido ? 'surtido' : 'std'}`
}

function isValidCartItem(raw: unknown): raw is QuoteItem {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  if (typeof r.productoId !== 'number' || !Number.isInteger(r.productoId) || r.productoId <= 0) return false
  if (typeof r.productoWebId !== 'number' || !Number.isInteger(r.productoWebId) || r.productoWebId <= 0) return false
  if (r.varianteId !== null && (typeof r.varianteId !== 'number' || !Number.isInteger(r.varianteId) || r.varianteId <= 0)) {
    return false
  }
  if (typeof r.cantidad !== 'number' || !Number.isInteger(r.cantidad) || r.cantidad <= 0) return false
  return true
}

function getCartFromStorage(): QuoteCart | null {
  if (typeof window === 'undefined') return null
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY)
    if (fromLocal) {
      const parsed = JSON.parse(fromLocal)
      if (parsed && Array.isArray(parsed.items)) {
        return {
          items: parsed.items.filter(isValidCartItem).map((i: QuoteItem) => ({
            ...i,
            itemKey: i.itemKey || getQuoteItemKey(i),
          })),
          updatedAt: String(parsed.updatedAt || new Date().toISOString()),
        }
      }
    }
    const match = document.cookie.match(new RegExp('(?:^|; )' + STORAGE_KEY + '=([^;]*)'))
    if (match && match[1]) {
      const parsed = JSON.parse(decodeURIComponent(match[1]))
      if (parsed && Array.isArray(parsed.items)) {
        return {
          items: parsed.items.filter(isValidCartItem).map((i: QuoteItem) => ({
            ...i,
            itemKey: i.itemKey || getQuoteItemKey(i),
          })),
          updatedAt: String(parsed.updatedAt || new Date().toISOString()),
        }
      }
    }
  } catch (e) {
    console.error('Error al leer el carrito desde el almacenamiento', e)
  }
  return null
}

function saveCartToStorage(items: QuoteItem[]) {
  if (typeof window === 'undefined') return
  try {
    const cart: QuoteCart = {
      items,
      updatedAt: new Date().toISOString(),
    }
    const serialized = JSON.stringify(cart)
    localStorage.setItem(STORAGE_KEY, serialized)
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: cart }))
  } catch (e) {
    console.error('Error al guardar el carrito', e)
  }
}

function matchesItem(item: QuoteItem, idOrKey: number | string): boolean {
  const key = item.itemKey || getQuoteItemKey(item)
  if (typeof idOrKey === 'string') return key === idOrKey
  return item.varianteId === idOrKey || (item.varianteId === null && item.productoWebId === idOrKey)
}

export function useQuoteCart() {
  const { config, ventaPorCajas } = useConfigEcommerce()
  const [items, setItems] = useState<QuoteItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const cart = getCartFromStorage()
    if (cart?.items) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legítimo: hidratar desde localStorage/cookies
      setItems(cart.items)
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const handleSync = (e?: Event) => {
      const customEvent = e as CustomEvent<QuoteCart> | undefined
      if (customEvent?.detail?.items) {
        setItems(customEvent.detail.items)
      } else {
        const cart = getCartFromStorage()
        if (cart?.items) {
          setItems(cart.items)
        }
      }
    }

    window.addEventListener(EVENT_KEY, handleSync)
    window.addEventListener('storage', handleSync)

    return () => {
      window.removeEventListener(EVENT_KEY, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [isHydrated])

  const addItem = useCallback((item: Omit<QuoteItem, 'unidad'>) => {
    const piezasPorCaja = item.piezasPorCaja || 1
    const unidad: 'pieza' | 'caja' = ventaPorCajas ? 'caja' : 'pieza'
    const itemKey = item.itemKey || getQuoteItemKey(item)

    setItems((prev) => {
      const exists = prev.find((i) => (i.itemKey || getQuoteItemKey(i)) === itemKey)
      let nextItems: QuoteItem[]

      if (exists) {
        nextItems = prev.map((i) =>
          (i.itemKey || getQuoteItemKey(i)) === itemKey
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i
        )
      } else {
        nextItems = [...prev, { ...item, itemKey, unidad, piezasPorCaja }]
      }

      queueMicrotask(() => saveCartToStorage(nextItems))
      return nextItems
    })
  }, [ventaPorCajas])

  const updateCantidad = useCallback((idOrKey: number | string, cantidad: number) => {
    setItems((prev) => {
      let nextItems: QuoteItem[]
      if (cantidad <= 0) {
        nextItems = prev.filter((i) => !matchesItem(i, idOrKey))
      } else {
        nextItems = prev.map((item) => {
          if (!matchesItem(item, idOrKey)) return item

          let nextCantidad = Math.floor(cantidad)
          if (
            config?.multiplo_cajas &&
            item.unidad === 'caja' &&
            item.piezasPorCaja &&
            nextCantidad % item.piezasPorCaja !== 0
          ) {
            nextCantidad = Math.max(
              item.piezasPorCaja,
              Math.round(nextCantidad / item.piezasPorCaja) * item.piezasPorCaja
            )
          }

          return { ...item, cantidad: nextCantidad }
        })
      }

      queueMicrotask(() => saveCartToStorage(nextItems))
      return nextItems
    })
  }, [config?.multiplo_cajas])

  const toggleUnidad = useCallback((idOrKey: number | string) => {
    setItems((prev) => {
      const nextItems = prev.map((item) => {
        if (!matchesItem(item, idOrKey)) return item

        const nuevaUnidad: 'pieza' | 'caja' = item.unidad === 'pieza' ? 'caja' : 'pieza'
        let nuevaCantidad = item.cantidad
        if (nuevaUnidad === 'caja' && item.piezasPorCaja) {
          nuevaCantidad = Math.max(1, Math.ceil(item.cantidad / item.piezasPorCaja))
        } else if (nuevaUnidad === 'pieza' && item.piezasPorCaja) {
          nuevaCantidad = item.cantidad * item.piezasPorCaja
        }

        return {
          ...item,
          unidad: nuevaUnidad,
          cantidad: nuevaCantidad,
        }
      })

      queueMicrotask(() => saveCartToStorage(nextItems))
      return nextItems
    })
  }, [])

  const updatePrecioOfrecido = useCallback((idOrKey: number | string, precio: number | undefined) => {
    setItems((prev) => {
      const nextItems = prev.map((item) =>
        matchesItem(item, idOrKey) ? { ...item, precioOfrecido: precio } : item
      )
      queueMicrotask(() => saveCartToStorage(nextItems))
      return nextItems
    })
  }, [])

  const removeItem = useCallback((idOrKey: number | string) => {
    setItems((prev) => {
      const nextItems = prev.filter((i) => !matchesItem(i, idOrKey))
      queueMicrotask(() => saveCartToStorage(nextItems))
      return nextItems
    })
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    saveCartToStorage([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0)

  const totalPiezas = items.reduce((sum, item) => {
    if (item.unidad === 'caja' && item.piezasPorCaja) {
      return sum + item.cantidad * item.piezasPorCaja
    }
    return sum + item.cantidad
  }, 0)

  const subtotal = items.reduce((sum, item) => {
    const precio = item.precioUnitario || item.precioOfrecido || 0
    return sum + precio * item.cantidad
  }, 0)

  return {
    items,
    isHydrated,
    addItem,
    updateCantidad,
    toggleUnidad,
    updatePrecioOfrecido,
    removeItem,
    clearCart,
    count: items.length,
    totalItems,
    totalPiezas,
    subtotal,
  }
}
