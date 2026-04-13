// hooks/useQuoteCart.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConfigEcommerce } from './useConfigEcommerce'
import type { QuoteItem, QuoteCart } from '@/modules/ecommerce/types'

const STORAGE_KEY = 'inv_tienda_quote_cart'

export function useQuoteCart() {
  const { config, ventaPorCajas } = useConfigEcommerce()
  const [items, setItems] = useState<QuoteItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate desde localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed: QuoteCart = JSON.parse(stored)
        setItems(parsed.items || [])
      } catch {
        console.error('Error parsing cart from localStorage')
      }
    }
    setIsHydrated(true)
  }, [])

  // Persistir a localStorage
  useEffect(() => {
    if (isHydrated) {
      const cart: QuoteCart = {
        items,
        updatedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    }
  }, [items, isHydrated])

  /**
   * Agregar item al carrito
   */
  const addItem = useCallback((item: Omit<QuoteItem, 'unidad'>) => {
    const piezasPorCaja = item.piezasPorCaja || 1
    const unidad: 'pieza' | 'caja' = ventaPorCajas ? 'caja' : 'pieza'
    
    setItems(prev => {
      const exists = prev.find(i => i.varianteId === item.varianteId)
      
      if (exists) {
        // Actualizar cantidad si ya existe
        return prev.map(i =>
          i.varianteId === item.varianteId
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i
        )
      }
      
      // Agregar nuevo item
      return [...prev, { ...item, unidad, piezasPorCaja }]
    })
  }, [ventaPorCajas])

  /**
   * Actualizar cantidad de un item
   */
  const updateCantidad = useCallback((varianteId: number, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(prev => prev.filter(i => i.varianteId !== varianteId))
      return
    }

    setItems(prev =>
      prev.map(item => {
        if (item.varianteId !== varianteId) return item

        // Validar múltiplo de caja si aplica
        if (
          config?.multiplo_cajas &&
          item.unidad === 'caja' &&
          item.piezasPorCaja &&
          cantidad % item.piezasPorCaja !== 0
        ) {
          // Redondear al múltiplo más cercano
          cantidad = Math.round(cantidad / item.piezasPorCaja) * item.piezasPorCaja
        }

        return { ...item, cantidad }
      })
    )
  }, [config?.multiplo_cajas])

  /**
   * Cambiar unidad (pieza ↔ caja)
   */
  const toggleUnidad = useCallback((varianteId: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.varianteId !== varianteId) return item
        
        const nuevaUnidad = item.unidad === 'pieza' ? 'caja' : 'pieza'
        
        // Ajustar cantidad al cambiar
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
    )
  }, [])

  /**
   * Actualizar precio ofrecido (solo modo híbrido)
   */
  const updatePrecioOfrecido = useCallback((varianteId: number, precio: number | undefined) => {
    setItems(prev =>
      prev.map(item =>
        item.varianteId === varianteId
          ? { ...item, precioOfrecido: precio }
          : item
      )
    )
  }, [])

  /**
   * Remover item
   */
  const removeItem = useCallback((varianteId: number) => {
    setItems(prev => prev.filter(i => i.varianteId !== varianteId))
  }, [])

  /**
   * Limpiar carrito
   */
  const clearCart = useCallback(() => {
    setItems([])
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
