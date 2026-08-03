// hooks/useQuoteCart.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConfigEcommerce } from './useConfigEcommerce'
import type { QuoteItem, QuoteCart } from '@/modules/ecommerce/types'

const STORAGE_KEY = 'inv_tienda_quote_cart'
const EVENT_KEY = 'inv_cart_updated'

function getCartFromStorage(): QuoteCart | null {
  if (typeof window === 'undefined') return null
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY)
    if (fromLocal) {
      return JSON.parse(fromLocal)
    }
    // Fallback a Cookie si localStorage no tiene nada
    const match = document.cookie.match(new RegExp('(?:^|; )' + STORAGE_KEY + '=([^;]*)'))
    if (match && match[1]) {
      return JSON.parse(decodeURIComponent(match[1]))
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
    
    // Guardar en cookies con expiración de 1 año (31536000 s)
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`
    
    // Notificar a otras partes del frontend para actualización reactiva en tiempo real
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: cart }))
  } catch (e) {
    console.error('Error al guardar el carrito', e)
  }
}

export function useQuoteCart() {
  const { config, ventaPorCajas } = useConfigEcommerce()
  const [items, setItems] = useState<QuoteItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate inicial
  useEffect(() => {
    const cart = getCartFromStorage()
    if (cart?.items) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legítimo: hidratar desde localStorage/cookies
      setItems(cart.items)
    }
    setIsHydrated(true)
  }, [])

  // Escuchar actualizaciones de sync entre pestañas o componentes
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

  /**
   * Agregar item al carrito
   */
  const addItem = useCallback((item: Omit<QuoteItem, 'unidad'>) => {
    const piezasPorCaja = item.piezasPorCaja || 1
    const unidad: 'pieza' | 'caja' = ventaPorCajas ? 'caja' : 'pieza'
    
    setItems(prev => {
      const exists = prev.find(i => i.varianteId === item.varianteId)
      let nextItems: QuoteItem[]
      
      if (exists) {
        // Actualizar cantidad si ya existe
        nextItems = prev.map(i =>
          i.varianteId === item.varianteId
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i
        )
      } else {
        // Agregar nuevo item
        nextItems = [...prev, { ...item, unidad, piezasPorCaja }]
      }

      saveCartToStorage(nextItems)
      return nextItems
    })
  }, [ventaPorCajas])

  /**
   * Actualizar cantidad de un item
   */
  const updateCantidad = useCallback((varianteId: number, cantidad: number) => {
    setItems(prev => {
      let nextItems: QuoteItem[]
      if (cantidad <= 0) {
        nextItems = prev.filter(i => i.varianteId !== varianteId)
      } else {
        nextItems = prev.map(item => {
          if (item.varianteId !== varianteId) return item

          // Validar múltiplo de caja si aplica
          if (
            config?.multiplo_cajas &&
            item.unidad === 'caja' &&
            item.piezasPorCaja &&
            cantidad % item.piezasPorCaja !== 0
          ) {
            cantidad = Math.round(cantidad / item.piezasPorCaja) * item.piezasPorCaja
          }

          return { ...item, cantidad }
        })
      }

      saveCartToStorage(nextItems)
      return nextItems
    })
  }, [config?.multiplo_cajas])

  /**
   * Cambiar unidad (pieza ↔ caja)
   */
  const toggleUnidad = useCallback((varianteId: number) => {
    setItems(prev => {
      const nextItems = prev.map(item => {
        if (item.varianteId !== varianteId) return item
        
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

      saveCartToStorage(nextItems)
      return nextItems
    })
  }, [])

  /**
   * Actualizar precio ofrecido (solo modo híbrido)
   */
  const updatePrecioOfrecido = useCallback((varianteId: number, precio: number | undefined) => {
    setItems(prev => {
      const nextItems = prev.map(item =>
        item.varianteId === varianteId
          ? { ...item, precioOfrecido: precio }
          : item
      )
      saveCartToStorage(nextItems)
      return nextItems
    })
  }, [])

  /**
   * Remover item
   */
  const removeItem = useCallback((varianteId: number) => {
    setItems(prev => {
      const nextItems = prev.filter(i => i.varianteId !== varianteId)
      saveCartToStorage(nextItems)
      return nextItems
    })
  }, [])

  /**
   * Limpiar carrito
   */
  const clearCart = useCallback(() => {
    setItems([])
    saveCartToStorage([])
  }, [])

  /**
   * Calcular totales
   */
  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0)
  
  const totalPiezas = items.reduce((sum, item) => {
    if (item.unidad === 'caja' && item.piezasPorCaja) {
      return sum + (item.cantidad * item.piezasPorCaja)
    }
    return sum + item.cantidad
  }, 0)

  const subtotal = items.reduce((sum, item) => {
    const precio = item.precioUnitario || item.precioOfrecido || 0
    return sum + (precio * item.cantidad)
  }, 0)

  return {
    items,
    isHydrated,
    // Acciones
    addItem,
    updateCantidad,
    toggleUnidad,
    updatePrecioOfrecido,
    removeItem,
    clearCart,
    // Totales
    count: items.length,
    totalItems,
    totalPiezas,
    subtotal,
  }
}
