// app/(admin)/catalogo/imagenes/components/ImageQuickEdit.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  X,
  Loader2,
  Star,
  ExternalLink,
  ArrowLeftRight,
  Search,
  Check,
  Undo2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ADMIN_ROUTES } from '@/lib/constants'
import { getSmartImagenUrl } from '@/lib/utils/imagen'
import { usoImagenOptions, USO_IMAGEN_LABELS, USO_IMAGEN_COLORS } from './imagenesConstants'
import { updateImagenGlobalAction, deleteImagenGlobalAction } from '@/modules/catalogo/imagenes/actions'
import { buscarProductosParaSelector } from '@/modules/catalogo/imagenes/queries'
import type { ImagenGlobal } from '@/modules/catalogo/imagenes/queries'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  imagen: ImagenGlobal
  onClose: () => void
}

export function ImageQuickEdit({ imagen, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [altText, setAltText] = useState(imagen.alt_text ?? '')
  const [usoImagen, setUsoImagen] = useState<string>(imagen.uso_imagen)
  const [orden, setOrden] = useState(imagen.orden ?? 0)
  const [esPrincipal, setEsPrincipal] = useState(imagen.es_principal)

  // Estado para edición y reasignación de producto
  const [productoSeleccionado, setProductoSeleccionado] = useState<{
    id: number
    sku_base: string
    nombre: string
    descripcion?: string | null
  }>({
    id: imagen.producto_id,
    sku_base: imagen.sku_base,
    nombre: imagen.nombre_producto,
    descripcion: imagen.descripcion_producto,
  })
  const [isChangingProduct, setIsChangingProduct] = useState(false)
  const [searchProductQuery, setSearchProductQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    id: number
    sku_base: string
    nombre: string
    descripcion?: string | null
  }[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term || term.trim().length < 1) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await buscarProductosParaSelector(term, 15)
      setSearchResults(res)
    } catch (err) {
      console.error('Error buscando productos:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, 280)

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateImagenGlobalAction(imagen.id, {
        alt_text: altText || null,
        uso_imagen: usoImagen,
        orden,
        es_principal: esPrincipal,
        producto_id: productoSeleccionado.id,
      })

      if (res.success) {
        toast.success(res.message || 'Imagen actualizada')
        onClose()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al guardar')
      }
    })
  }

  const handleDelete = (desvincularSolo: boolean) => {
    startTransition(async () => {
      const res = await deleteImagenGlobalAction(imagen.id, desvincularSolo)
      if (res.success) {
        toast.success(desvincularSolo ? 'Imagen desvinculada' : 'Imagen eliminada')
        onClose()
        router.refresh()
      } else {
        toast.error(res.error ?? 'Error al eliminar')
      }
    })
  }

  const usoColor = USO_IMAGEN_COLORS[imagen.uso_imagen] ?? 'bg-gray-500'
  const isProductChanged = productoSeleccionado.id !== imagen.producto_id

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Imagen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border">
            <Image
              src={getSmartImagenUrl(imagen.url, 'hero')}
              alt={altText || imagen.uso_imagen}
              fill
              className="object-contain"
            />
          </div>

          {/* Producto asociado y reasignable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Producto Asociado
              </Label>
              {!isChangingProduct && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary/80 flex items-center gap-1.5 px-2"
                  onClick={() => {
                    setIsChangingProduct(true)
                    setSearchProductQuery('')
                    setSearchResults([])
                  }}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Cambiar SKU / Producto
                </Button>
              )}
            </div>

            {/* Tarjeta del producto seleccionado */}
            <div
              className={cn(
                'flex items-center justify-between rounded-lg p-3 border transition-colors',
                isProductChanged
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                  : 'bg-muted/40 border-border'
              )}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold tracking-tight">
                    {productoSeleccionado.sku_base}
                  </span>
                  {isProductChanged && (
                    <span className="text-[10px] bg-amber-500 text-white font-semibold px-1.5 py-0.5 rounded-full">
                      Nuevo Destino
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {productoSeleccionado.descripcion || productoSeleccionado.nombre || 'Sin descripción'}
                </span>
                {isProductChanged && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                    Anterior: <span className="font-mono">{imagen.sku_base}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isProductChanged ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Deshacer cambio de producto"
                    onClick={() => {
                      setProductoSeleccionado({
                        id: imagen.producto_id,
                        sku_base: imagen.sku_base,
                        nombre: imagen.nombre_producto,
                        descripcion: imagen.descripcion_producto,
                      })
                      setIsChangingProduct(false)
                    }}
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    Deshacer
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Ver producto en pestaña nueva"
                  >
                    <Link href={ADMIN_ROUTES.catalogo.detalle(imagen.producto_id)} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Input desplegable para buscar y cambiar de producto */}
            {isChangingProduct && (
              <div className="p-3 bg-card border rounded-lg space-y-2 mt-2 shadow-sm animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    Buscar nuevo producto por SKU o nombre:
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setIsChangingProduct(false)
                      setSearchProductQuery('')
                      setSearchResults([])
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchProductQuery}
                    onChange={(e) => {
                      setSearchProductQuery(e.target.value)
                      debouncedSearch(e.target.value)
                    }}
                    placeholder="Escribe SKU (ej: JA26/05)..."
                    className="h-8 text-xs pl-8 pr-8"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Lista de sugerencias */}
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto divide-y border rounded-md bg-popover text-popover-foreground">
                    {searchResults.map((p) => {
                      const isSelected = p.id === productoSeleccionado.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setProductoSeleccionado(p)
                            setIsChangingProduct(false)
                            setSearchProductQuery('')
                            setSearchResults([])
                          }}
                          className={cn(
                            'w-full text-left p-2.5 hover:bg-muted/70 flex items-center justify-between transition-colors text-xs',
                            isSelected && 'bg-primary/10'
                          )}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-mono font-bold">{p.sku_base}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {p.descripcion || p.nombre || '—'}
                            </span>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0 border rounded px-1.5 py-0.5">
                              Seleccionar
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {searchProductQuery.trim().length > 0 && !isSearching && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No se encontraron productos con "{searchProductQuery}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Uso imagen */}
          <div className="grid gap-2">
            <Label>Tipo de uso</Label>
            <Select 
              value={usoImagen} 
              onValueChange={(v) => setUsoImagen(v || usoImagen)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usoImagenOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alt text */}
          <div className="grid gap-2">
            <Label>Alt Text (SEO)</Label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descripción de la imagen"
            />
          </div>

          {/* Orden */}
          <div className="grid gap-2">
            <Label>Orden</Label>
            <Input
              type="number"
              min={0}
              value={orden}
              onChange={(e) => setOrden(Number(e.target.value))}
            />
          </div>

          {/* Principal */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esPrincipal"
              checked={esPrincipal}
              onChange={(e) => setEsPrincipal(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="esPrincipal" className="text-sm cursor-pointer flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Imagen principal
            </Label>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={isPending}
          >
            Eliminar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isProductChanged ? 'Guardar y Reasignar' : 'Guardar'}
            </Button>
          </div>
        </div>

        {/* Modal de eliminación */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-sm w-full space-y-4 border-2 border-red-500">
              <h3 className="font-semibold text-lg text-red-600">¿Eliminar imagen?</h3>
              <p className="text-sm text-muted-foreground">
                ¿Qué deseas hacer con esta imagen?
              </p>
              <div className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDelete(false)}
                >
                  Eliminar completamente
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-yellow-600 border-yellow-500 hover:bg-yellow-50"
                  onClick={() => handleDelete(true)}
                >
                  Desvincular (mantener en Storage)
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}