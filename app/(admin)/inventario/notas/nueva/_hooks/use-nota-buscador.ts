// app/(admin)/inventario/notas/nueva/_hooks/use-nota-buscador.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DraftNota, DraftProducto, ProductoBusqueda, CajaParaSelector } from '@/modules/inventario/types'

export const NO_CAJA_VALUE = '_none'

interface UseNotaBuscadorParams {
  bodegaOrigenId: number | null
  esAjuste: boolean
  modoSoloCajas: boolean
  setDraft: React.Dispatch<React.SetStateAction<DraftNota>>
  setError: (msg: string | null) => void
}

export function useNotaBuscador({
  bodegaOrigenId,
  esAjuste,
  modoSoloCajas,
  setDraft,
  setError,
}: UseNotaBuscadorParams) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductoBusqueda | null>(null)
  const [cajasDisponibles, setCajasDisponibles] = useState<CajaParaSelector[]>([])
  const [selectedProductStock, setSelectedProductStock] = useState<{ cajas: number; piezas_sueltas: number } | null>(null)

  const [addCajas, setAddCajas] = useState<string>('1')
  const [addPiezas, setAddPiezas] = useState<string>('0')
  const [addCajaId, setAddCajaId] = useState<string>(NO_CAJA_VALUE)

  const [swapProductTempId, setSwapProductTempId] = useState<string | null>(null)
  const [swapSearchTerm, setSwapSearchTerm] = useState<string>('')

  const fetchStock = useCallback(async (prodId: number, bodId: number) => {
    try {
      const res = await fetch(`/api/inventario/notas/nueva/stock?producto_id=${prodId}&bodega_id=${bodId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedProductStock(data)
      } else {
        setSelectedProductStock({ cajas: 0, piezas_sueltas: 0 })
      }
    } catch {
      setSelectedProductStock({ cajas: 0, piezas_sueltas: 0 })
    }
  }, [])

  useEffect(() => {
    if (selectedProduct && bodegaOrigenId) {
      fetchStock(selectedProduct.id, bodegaOrigenId)
    }
  }, [bodegaOrigenId, selectedProduct, fetchStock])

  const handleSelectProduct = async (product: ProductoBusqueda) => {
    setSelectedProduct(product)
    setSearchTerm(product.sku_base)
    setAddCajas('1')
    setAddPiezas('0')
    setAddCajaId(NO_CAJA_VALUE)
    setSelectedProductStock(null)

    if (bodegaOrigenId) {
      fetchStock(product.id, bodegaOrigenId)
    }

    try {
      const res = await fetch(`/api/inventario/notas/nueva/packs?producto_id=${product.id}`)
      if (res.ok) {
        const data = await res.json()
        setCajasDisponibles(data)
      }
    } catch {
      setCajasDisponibles([])
    }
  }

  const handleSearchValueChange = (val: string, matched?: ProductoBusqueda | null) => {
    setSearchTerm(val)
    if (selectedProduct && val !== selectedProduct.sku_base) {
      setSelectedProduct(null)
      setSelectedProductStock(null)
    }
    if (matched && (!selectedProduct || selectedProduct.id !== matched.id)) {
      handleSelectProduct(matched)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSelectedProduct(null)
    setSelectedProductStock(null)
  }

  const handleAddProduct = () => {
    if (!selectedProduct) return

    const cajasNum = parseFloat(addCajas) || 0
    const piezasNum = modoSoloCajas ? 0 : (parseInt(addPiezas, 10) || 0)

    if (cajasNum === 0 && piezasNum === 0) {
      setError(modoSoloCajas ? 'Ingresa al menos una caja.' : 'Ingresa al menos una caja o pieza.')
      return
    }

    if (!esAjuste && (cajasNum < 0 || piezasNum < 0)) {
      setError('Solo las notas de tipo Ajuste admiten cantidades negativas.')
      return
    }

    const cajaSeleccionada = addCajaId && addCajaId !== NO_CAJA_VALUE
      ? cajasDisponibles.find((c) => c.id === parseInt(addCajaId, 10))
      : null

    const newProduct: DraftProducto = {
      tempId: crypto.randomUUID(),
      producto_id: selectedProduct.id,
      producto_sku: selectedProduct.sku_base,
      producto_nombre: selectedProduct.descripcion || selectedProduct.nombre || '',
      producto_pz_en_caja: selectedProduct.pz_en_caja,
      cajas: cajasNum,
      piezas_sueltas: piezasNum,
      caja_id: cajaSeleccionada?.id ?? null,
      caja_codigo: cajaSeleccionada?.codigo_caja ?? null,
      caja_nombre_pack: cajaSeleccionada?.nombre_pack ?? null,
      stock_origen_cajas: selectedProductStock?.cajas ?? 0,
      stock_origen_piezas: selectedProductStock?.piezas_sueltas ?? 0,
    }

    setDraft((prev) => ({
      ...prev,
      productos: [...prev.productos, newProduct],
    }))

    setSelectedProduct(null)
    setSearchTerm('')
    setCajasDisponibles([])
    setSelectedProductStock(null)
    setAddCajas('1')
    setAddPiezas('0')
    setAddCajaId(NO_CAJA_VALUE)
    setError(null)
  }

  const handleSwapProduct = async (tempId: string, newProduct: ProductoBusqueda) => {
    let newStockCajas = 0
    let newStockPiezas = 0

    if (bodegaOrigenId) {
      try {
        const res = await fetch(
          `/api/inventario/notas/nueva/stock?producto_id=${newProduct.id}&bodega_id=${bodegaOrigenId}`
        )
        if (res.ok) {
          const data = await res.json()
          newStockCajas = data.cajas ?? 0
          newStockPiezas = data.piezas_sueltas ?? 0
        }
      } catch (err) {
        console.error('Error al obtener stock para sustitución de producto:', err)
      }
    }

    setDraft((prev) => ({
      ...prev,
      productos: prev.productos.map((p) => {
        if (p.tempId !== tempId) return p
        return {
          ...p,
          producto_id: newProduct.id,
          producto_sku: newProduct.sku_base,
          producto_nombre: newProduct.descripcion || newProduct.nombre || '',
          producto_pz_en_caja: newProduct.pz_en_caja,
          stock_origen_cajas: newStockCajas,
          stock_origen_piezas: newStockPiezas,
        }
      }),
    }))

    setSwapProductTempId(null)
    setSwapSearchTerm('')
  }

  return {
    searchTerm,
    selectedProduct,
    cajasDisponibles,
    selectedProductStock,
    addCajas,
    setAddCajas,
    addPiezas,
    setAddPiezas,
    addCajaId,
    setAddCajaId,
    fetchStock,
    handleSelectProduct,
    handleSearchValueChange,
    handleClearSearch,
    handleAddProduct,
    swapProductTempId,
    setSwapProductTempId,
    swapSearchTerm,
    setSwapSearchTerm,
    handleSwapProduct,
  }
}
