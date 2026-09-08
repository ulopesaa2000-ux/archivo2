'use client'

// app/(admin)/ordenes-b2b/cajas/components/AsignarProductoMasivoDialog.tsx

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, Package, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { 
  asignarProductoCajasAction, 
  buscarProductosParaCajaAction 
} from '@/modules/ordenes-b2b/actions'
import { cn } from '@/lib/utils'

type ProductoItem = {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cajaIds: number[]
  onSuccess?: () => void
}

export function AsignarProductoMasivoDialog({
  open,
  onOpenChange,
  cajaIds,
  onSuccess,
}: Props) {
  const [search, setSearch] = useState('')
  const [productos, setProductos] = useState<ProductoItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductoItem | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setSelectedProduct(null)
      setSearch('')
      ejecutarBusqueda('')
    }
  }, [open])

  const ejecutarBusqueda = async (q: string) => {
    setIsSearching(true)
    try {
      const res = await buscarProductosParaCajaAction(q, 25)
      setProductos(res)
    } catch (err) {
      console.error('Error buscando productos:', err)
      setProductos([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      ejecutarBusqueda(search)
    }, 280)
    return () => clearTimeout(timer)
  }, [search, open])

  const handleConfirm = () => {
    if (!selectedProduct) return

    startTransition(async () => {
      const res = await asignarProductoCajasAction(cajaIds, selectedProduct.id)
      if (res.success) {
        toast.success(`Producto asignado a ${cajaIds.length} caja${cajaIds.length !== 1 ? 's' : ''}`, {
          description: `Vinculadas a ${selectedProduct.sku_base} (${selectedProduct.nombre || 'Sin nombre'})`,
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error('Error al asignar producto masivamente', {
          description: res.error || 'Ocurrió un error inesperado',
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-muted/40">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Asignar Producto Masivamente
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecciona el producto que se vinculará a las{' '}
            <strong className="text-foreground">{cajaIds.length}</strong> cajas seleccionadas.
          </DialogDescription>
        </DialogHeader>

        {/* Buscador */}
        <div className="p-3 border-b bg-background flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por SKU o nombre..."
              className="h-9 pl-8 pr-7 text-xs bg-muted/30 focus-visible:bg-background"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
        </div>

        {/* Lista de productos */}
        <div className="max-h-72 overflow-y-auto p-2 divide-y divide-border/30">
          {isSearching && productos.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Buscando productos...
            </div>
          ) : productos.length === 0 ? (
            <div className="py-8 text-center px-4 space-y-1">
              <Package className="h-7 w-7 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">No se encontraron productos</p>
              <p className="text-[11px] text-muted-foreground/70">
                Prueba buscando con otro término o código SKU
              </p>
            </div>
          ) : (
            productos.map((prod) => {
              const isSelected = selectedProduct?.id === prod.id
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setSelectedProduct(prod)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between gap-3 group hover:bg-primary/10 cursor-pointer',
                    isSelected && 'bg-primary/15 border border-primary/40 font-medium'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground group-hover:text-primary text-xs">
                        {prod.sku_base}
                      </span>
                    </div>
                    {prod.nombre && (
                      <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                        {prod.nombre}
                      </p>
                    )}
                  </div>
                  {isSelected ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0 group-hover:border-primary" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 border-t bg-muted/20 flex sm:justify-between items-center gap-2">
          <div className="text-[11px] text-muted-foreground truncate">
            {selectedProduct ? (
              <span>
                Seleccionado: <strong className="font-mono text-foreground">{selectedProduct.sku_base}</strong>
              </span>
            ) : (
              <span>Ningún producto seleccionado</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedProduct || isPending}
              className="gap-1.5"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Asignar a {cajaIds.length} cajas</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
