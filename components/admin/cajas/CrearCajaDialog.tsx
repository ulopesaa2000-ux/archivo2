// components/admin/cajas/CrearCajaDialog.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Search, Loader2 } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { createClient } from '@/lib/supabase/client'
import { createCajaAction } from '@/modules/cajas/actions'
import { vincularCajaOrdenAction } from '@/modules/ordenes-b2b/actions'
import { CajaCard } from '@/components/admin/cajas/CajaCard'
import type { SharedCajaData } from '@/modules/cajas/types'
import type { CajaDetalleInput } from '@/modules/cajas/actions'

type CatalogoItem = { id: number; nombre: string; codigo?: string }

type CrearCajaDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  tallasDisponibles: CatalogoItem[]
  coloresDisponibles: CatalogoItem[]
  
  // Opcional: Contexto de orden B2B
  ordenId?: number
  detalles?: { producto_id: number | null; producto_sku: string | null }[]
}

const DEFAULT_DETALLES: { producto_id: number | null; producto_sku: string | null }[] = []

export function CrearCajaDialog({
  open,
  onOpenChange,
  tallasDisponibles,
  coloresDisponibles,
  ordenId,
  detalles = DEFAULT_DETALLES,
}: CrearCajaDialogProps) {
  const router = useRouter()
  
  // Búsqueda y selección de productos
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: number; sku_base: string; nombre: string; descripcion: string | null }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; sku_base: string } | null>(null)
  const [creando, setCreando] = useState(false)

  // Opciones de producto basadas en la orden (si aplica)
  const productoOptions = React.useMemo(() => {
    if (!detalles) return []
    return detalles
      .filter((d): d is { producto_id: number; producto_sku: string } => d.producto_id !== null && d.producto_id !== undefined)
      .map(d => ({ id: d.producto_id, sku: d.producto_sku }))
      .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i) // únicos
  }, [detalles])

  // Búsqueda de productos en la base de datos (con debounce)
  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    setSearchLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('productos')
        .select('id, sku_base, nombre, descripcion')
        .limit(20)

      if (q) {
        const term = `%${q}%`
        query = query.or(`sku_base.ilike.${term},nombre.ilike.${term}`)
      }

      const { data, error } = await query.order('sku_base')
      if (error) throw error
      
      setSearchResults((data ?? []) as any)
    } catch (err) {
      console.error('Error al buscar productos:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, 300)

  // Cargar productos iniciales al abrir (ejecutar solo al montar)
  useEffect(() => {
    setSearch('')
    if (productoOptions.length === 1) {
      // Si hay exactamente 1 producto en la orden, auto-seleccionarlo
      setSelectedProduct({
        id: productoOptions[0].id,
        sku_base: productoOptions[0].sku ?? ''
      })
    } else {
      setSelectedProduct(null)
      if (productoOptions.length > 1) {
        // Si hay múltiples productos en la orden, mostrarlos inicialmente
        const initial = productoOptions.map(p => ({
          id: p.id,
          sku_base: p.sku ?? '',
          nombre: '',
          descripcion: 'Producto de la orden'
        }))
        setSearchResults(initial)
      } else {
        // Si no hay orden o está vacía, cargar el catálogo general
        debouncedSearch('')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (data: {
    base: Partial<SharedCajaData>
    detalles: CajaDetalleInput[]
  }) => {
    if (!selectedProduct) return

    setCreando(true)
    try {
      const newCajaId = await createCajaAction(selectedProduct.id, data)
      if (newCajaId && ordenId) {
        const cantidad = data.base.cantidad_cajas ? Number(data.base.cantidad_cajas) : 1
        await vincularCajaOrdenAction(ordenId, newCajaId, cantidad)
      }
      onOpenChange(false)
      router.refresh()
    } catch (e) {
      console.error('Error al crear la caja:', e)
    } finally {
      setCreando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Crear Nueva Caja</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          
          {/* Buscador de productos: se muestra si NO hay un producto seleccionado */}
          {!selectedProduct && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Seleccionar Producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Buscar producto por SKU o nombre..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    debouncedSearch(e.target.value)
                  }}
                />
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">
                    {search ? 'Sin resultados.' : 'Escribe para buscar productos.'}
                  </p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {searchResults.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProduct({ id: p.id, sku_base: p.sku_base })}
                          className="border-t cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <td className="w-4 px-2 py-2 text-transparent">●</td>
                          <td className="px-3 py-2 font-mono text-primary font-medium">{p.sku_base}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium truncate max-w-[300px]">{p.descripcion ?? p.nombre}</div>
                            {p.nombre && p.descripcion && <div className="text-[10px] text-muted-foreground">{p.nombre}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Mostrar producto seleccionado */}
          {selectedProduct && (
            <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground">
                Producto seleccionado: <span className="text-foreground font-semibold font-mono">{selectedProduct.sku_base}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-xs text-muted-foreground hover:text-primary underline"
              >
                Cambiar producto
              </button>
            </div>
          )}

          {/* Formulario de CajaCard (se muestra si hay un producto seleccionado) */}
          {selectedProduct && (
            <CajaCard
              caja={{
                id: 0,
                codigo_caja: '',
                nombre_pack: null,
                piezas_por_caja: null,
                cbm: null,
                peso_bruto_kg: null,
                peso_neto: null,
                tallas: null,
                colores: null,
                contenidoMap: null,
                cantidad_cajas: null
              }}
              layout="horizontal"
              isNew
              onCreate={handleCreate}
              tallasDisponibles={tallasDisponibles}
              coloresDisponibles={coloresDisponibles}
              productoId={selectedProduct.id}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
