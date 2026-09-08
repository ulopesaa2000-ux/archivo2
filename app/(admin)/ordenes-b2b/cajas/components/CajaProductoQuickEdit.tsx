'use client'

// app/(admin)/ordenes-b2b/cajas/components/CajaProductoQuickEdit.tsx

import { useState, useEffect, useTransition, useId } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Pencil, 
  Search, 
  Loader2, 
  Check, 
  Package, 
  Unlink, 
  X,
  Sparkles
} from 'lucide-react'
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
  cajaId: number
  codigoCaja: string
  productoId: number | null
  productoSku: string | null
  productoNombre: string | null
  canEdit?: boolean
}

/**
 * Extrae una sugerencia de SKU a partir del código de la caja
 * Ej: MA26-01HSD-CC-1 -> MA26-01HSD
 *     TY25-07HC-PACK-UNICO-XP-67FDD -> TY25-07HC
 */
function extraerSugerenciaSku(codigoCaja: string): string {
  if (!codigoCaja) return ''
  const base = codigoCaja
    .split('-PACK-')[0]
    .split('-CC-')[0]
    .split('-CR-')[0]
    .split('-CP')[0]
    .split('-P')[0]
    .trim()
  return base
}

export function CajaProductoQuickEdit({
  cajaId,
  codigoCaja,
  productoId,
  productoSku,
  productoNombre,
  canEdit = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [productos, setProductos] = useState<ProductoItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Estado local optimista para feedback instantáneo
  const [currentId, setCurrentId] = useState<number | null>(productoId)
  const [currentSku, setCurrentSku] = useState<string | null>(productoSku)
  const [currentNombre, setCurrentNombre] = useState<string | null>(productoNombre)

  // Sincronizar si cambian los props del servidor
  useEffect(() => {
    setCurrentId(productoId)
    setCurrentSku(productoSku)
    setCurrentNombre(productoNombre)
  }, [productoId, productoSku, productoNombre])

  // Inicializar búsqueda con el código de la caja al abrir
  useEffect(() => {
    if (open) {
      const sugerencia = currentSku || extraerSugerenciaSku(codigoCaja)
      setSearch(sugerencia)
      ejecutarBusqueda(sugerencia)
    }
  }, [open, codigoCaja, currentSku])

  const ejecutarBusqueda = async (queryText: string) => {
    setIsSearching(true)
    try {
      const res = await buscarProductosParaCajaAction(queryText, 20)
      setProductos(res)
    } catch (err) {
      console.error('Error buscando productos:', err)
      setProductos([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce en el input de búsqueda
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      ejecutarBusqueda(search)
    }, 280)
    return () => clearTimeout(timer)
  }, [search, open])

  const handleSelectProducto = (prod: ProductoItem) => {
    startTransition(async () => {
      const res = await asignarProductoCajasAction([cajaId], prod.id)
      if (res.success) {
        setCurrentId(prod.id)
        setCurrentSku(prod.sku_base)
        setCurrentNombre(prod.nombre)
        toast.success(`Caja asignada a ${prod.sku_base}`, {
          description: prod.nombre || 'Producto vinculado con éxito',
        })
        setOpen(false)
      } else {
        toast.error('Error al asignar producto', {
          description: res.error || 'Ocurrió un error inesperado',
        })
      }
    })
  }

  const handleDesvincular = () => {
    startTransition(async () => {
      const res = await asignarProductoCajasAction([cajaId], null)
      if (res.success) {
        setCurrentId(null)
        setCurrentSku(null)
        setCurrentNombre(null)
        toast.info('Producto desvinculado de la caja', {
          description: 'La caja ahora no tiene producto asignado.',
        })
        setOpen(false)
      } else {
        toast.error('Error al desvincular producto', {
          description: res.error || 'Ocurrió un error inesperado',
        })
      }
    })
  }

  if (!canEdit) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs">{currentSku ?? '—'}</span>
        {currentNombre && (
          <span className="text-muted-foreground text-xs truncate max-w-[140px]" title={currentNombre}>
            ({currentNombre})
          </span>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          "transition-all cursor-pointer select-none",
          currentId
            ? "group/btn inline-flex items-center gap-1.5 py-1 px-1.5 -mx-1.5 rounded-md hover:bg-muted/80 text-left"
            : "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-dashed border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:border-amber-500 hover:text-amber-400 group shadow-sm"
        )}
        title={currentId ? "Clic para cambiar el producto asignado" : "Asignar producto a esta caja"}
        onClick={(e) => e.stopPropagation()}
      >
        {currentId ? (
          <>
            <span className="font-mono text-xs font-semibold text-foreground group-hover/btn:text-primary transition-colors">
              {currentSku}
            </span>
            {currentNombre && (
              <span className="text-muted-foreground text-[11px] truncate max-w-[130px]" title={currentNombre}>
                ({currentNombre})
              </span>
            )}
            <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/btn:opacity-100 text-muted-foreground group-hover/btn:text-primary transition-all ml-0.5 shrink-0" />
          </>
        ) : (
          <>
            <Plus className="h-3 w-3 transition-transform group-hover:scale-125 shrink-0" />
            <span>Asignar</span>
          </>
        )}
      </PopoverTrigger>

      <PopoverContent 
        align="start" 
        className="w-80 p-0 shadow-2xl border-border/80 rounded-xl overflow-hidden z-50 animate-in fade-in-50 zoom-in-95"
      >
        {/* Cabecera del popover */}
        <div className="p-3 bg-muted/40 border-b border-border/60">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-primary" />
              Asignar Producto
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground truncate font-mono">
            Caja: <strong className="text-foreground font-semibold">{codigoCaja}</strong>
          </p>
        </div>

        {/* Buscador */}
        <div className="p-2 border-b border-border/50 bg-background flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por SKU o nombre..."
              className="h-8 pl-8 pr-7 text-xs bg-muted/30 focus-visible:bg-background"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
        </div>

        {/* Lista de productos */}
        <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/30">
          {isSearching && productos.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Buscando productos...
            </div>
          ) : productos.length === 0 ? (
            <div className="py-6 text-center px-4 space-y-1">
              <Package className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">No se encontraron productos</p>
              <p className="text-[10px] text-muted-foreground/70">
                Prueba buscando con otro término o código SKU
              </p>
            </div>
          ) : (
            productos.map((prod) => {
              const isSelected = prod.id === currentId
              return (
                <button
                  key={prod.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelectProducto(prod)}
                  className={cn(
                    'w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start justify-between gap-2 group hover:bg-primary/10',
                    isSelected && 'bg-primary/15 border-primary/30 font-medium'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground group-hover:text-primary">
                        {prod.sku_base}
                      </span>
                      {isSelected && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] bg-primary/20 text-primary border-primary/40 font-semibold">
                          Actual
                        </Badge>
                      )}
                    </div>
                    {prod.nombre && (
                      <p className="text-muted-foreground text-[11px] truncate mt-0.5">
                        {prod.nombre}
                      </p>
                    )}
                    {prod.descripcion && prod.descripcion !== prod.nombre && (
                      <p className="text-muted-foreground/70 text-[10px] truncate mt-0.5">
                        {prod.descripcion}
                      </p>
                    )}
                  </div>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-opacity mt-0.5 shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer con opción para desvincular */}
        {currentId && (
          <div className="p-2 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={handleDesvincular}
              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 gap-1.5 font-normal w-full justify-center"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlink className="h-3 w-3" />
              )}
              <span>Desvincular producto (dejar vacío)</span>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
