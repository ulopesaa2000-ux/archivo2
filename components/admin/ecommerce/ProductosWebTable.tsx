// components/admin/ecommerce/ProductosWebTable.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/admin/Pagination'
import {
  Package, ExternalLink, Image as ImageIcon, Loader2, Sparkles, Tag, Check, X, Globe, DollarSign, Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { DestacadoWebStarButton } from './DestacadoWebStarButton'
import type { ProductoWebExtendido } from '@/modules/ecommerce/types'
import {
  togglePublicarProductoWebAction,
  publicarProductosMasivoAction,
  despublicarProductosMasivoAction,
  actualizarPreciosMasivoAction,
} from '@/modules/ecommerce/actions'

interface ProductosWebTableProps {
  productos: ProductoWebExtendido[]
  total: number
}

export function ProductosWebTable({ productos, total }: ProductosWebTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Modal para edición masiva de precios ($)
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const [precioPublico, setPrecioPublico] = useState<string>('')
  const [precioOferta, setPrecioOferta] = useState<string>('')
  const [enOferta, setEnOferta] = useState(false)

  // Modal para edición rápida de precio de 1 solo producto al hacer clic en la columna
  const [editingSingleProduct, setEditingSingleProduct] = useState<ProductoWebExtendido | null>(null)
  const [singlePrecioPublico, setSinglePrecioPublico] = useState<string>('')
  const [singlePrecioOferta, setSinglePrecioOferta] = useState<string>('')

  // Toggle individual
  const handleToggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Toggle todos los visibles de la página
  const allPageIds = productos.map((p) => p.producto_id)
  const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedIds)
      allPageIds.forEach((id) => next.delete(id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      allPageIds.forEach((id) => next.add(id))
      setSelectedIds(next)
    }
  }

  // Publicar individual
  const handleTogglePublish = (producto: ProductoWebExtendido) => {
    startTransition(async () => {
      const res = await togglePublicarProductoWebAction(
        producto.producto_id,
        producto.esta_publicado,
        producto.producto_web_id
      )

      if (res.success) {
        toast.success(
          producto.esta_publicado
            ? `Producto [${producto.sku_base}] pausado/despublicado.`
            : `Producto [${producto.sku_base}] publicado en tienda online.`
        )
        router.refresh()
      } else {
        toast.error(res.error || 'Error al cambiar publicación.')
      }
    })
  }

  // Publicación masiva
  const handleBulkPublish = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    startTransition(async () => {
      const res = await publicarProductosMasivoAction(ids)
      if (res.success) {
        toast.success(`Se publicaron ${res.count} productos exitosamente en la tienda online.`)
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(res.error || 'Error en la publicación masiva.')
      }
    })
  }

  // Despublicación / Pausa masiva
  const handleBulkUnpublish = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    startTransition(async () => {
      const res = await despublicarProductosMasivoAction(ids)
      if (res.success) {
        toast.success(`Se pausaron/despublicaron ${res.count} productos.`)
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(res.error || 'Error al despublicar lote.')
      }
    })
  }

  // Guardar Precios Masivos ($)
  const handleBulkPriceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    const numPublico = Number(precioPublico)
    if (isNaN(numPublico) || numPublico <= 0) {
      toast.error('Por favor ingresa un precio público válido mayor a $0.')
      return
    }

    const numOferta = precioOferta ? Number(precioOferta) : null

    startTransition(async () => {
      const res = await actualizarPreciosMasivoAction(ids, numPublico, numOferta, enOferta)
      if (res.success) {
        toast.success(`Precios actualizados para ${res.count} productos.`)
        setIsPriceModalOpen(false)
        setPrecioPublico('')
        setPrecioOferta('')
        setEnOferta(false)
        setSelectedIds(new Set())
        router.refresh()
      } else {
        toast.error(res.error || 'Error al fijar precios en lote.')
      }
    })
  }

  // Guardar Precio de Producto Individual al hacer clic en la columna de precios
  const handleSinglePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSingleProduct) return

    const numPublico = Number(singlePrecioPublico)
    if (isNaN(numPublico) || numPublico <= 0) {
      toast.error('Por favor ingresa un precio público válido mayor a $0.')
      return
    }

    const numOferta = singlePrecioOferta ? Number(singlePrecioOferta) : null

    startTransition(async () => {
      const res = await actualizarPreciosMasivoAction(
        [editingSingleProduct.producto_id],
        numPublico,
        numOferta,
        !!numOferta
      )

      if (res.success) {
        toast.success(`Precio actualizado para [${editingSingleProduct.sku_base}].`)
        setEditingSingleProduct(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Error al guardar precio.')
      }
    })
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-xl space-y-3 bg-card">
        <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="font-semibold text-foreground">No se encontraron productos.</p>
        <p className="text-xs text-muted-foreground">Prueba a ajustar los filtros o el término de búsqueda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {/* Checkbox seleccionar todo */}
              <TableHead className="w-[40px] pl-4">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleToggleSelectAll}
                  aria-label="Seleccionar todos los productos de esta página"
                />
              </TableHead>

              <TableHead className="w-[70px]">Foto</TableHead>
              <TableHead className="w-[120px]">SKU</TableHead>
              <TableHead>Descripción & Marca</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="w-[140px]">Precios Web (Clic para editar)</TableHead>
              <TableHead className="w-[130px]">Estado Web</TableHead>
              <TableHead className="text-right w-[160px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => {
              const isSelected = selectedIds.has(producto.producto_id)

              return (
                <TableRow
                  key={producto.id}
                  className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  {/* Checkbox Selección */}
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelect(producto.producto_id)}
                      aria-label={`Seleccionar producto ${producto.sku_base}`}
                    />
                  </TableCell>

                  {/* Miniatura Foto */}
                  <TableCell>
                    {producto.imagen_principal ? (
                      <div className="relative aspect-[3/4] w-12 rounded-md overflow-hidden border border-border bg-muted/20">
                        <Image
                          src={producto.imagen_principal}
                          alt={producto.descripcion || producto.nombre || producto.sku_base}
                          fill
                          className="object-contain p-0.5"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] w-12 rounded-md bg-muted/40 border border-dashed flex flex-col items-center justify-center text-muted-foreground text-[10px]">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40 mb-0.5" />
                        <span>Sin foto</span>
                      </div>
                    )}
                  </TableCell>

                  {/* SKU Base + Estrella Destacado */}
                  <TableCell className="font-mono text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/catalogo/${producto.producto_id}`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {producto.sku_base}
                      </Link>
                      <DestacadoWebStarButton
                        productoId={producto.producto_id}
                        productoWebId={producto.producto_web_id}
                        initialDestacado={producto.destacado}
                        skuBase={producto.sku_base}
                      />
                    </div>
                  </TableCell>

                  {/* Descripción y Marca */}
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-foreground line-clamp-2" title={producto.descripcion || producto.nombre}>
                        {producto.descripcion || producto.nombre}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {producto.marca_nombre || 'Sin Marca'}
                      </p>
                    </div>
                  </TableCell>

                  {/* Género y Tipo de Prenda */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {producto.genero_nombre && (
                        <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 bg-background">
                          {producto.genero_nombre}
                        </Badge>
                      )}
                      {producto.tipo_prenda_nombre && (
                        <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 bg-background">
                          {producto.tipo_prenda_nombre}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Precios Web (Clic para edición rápida) */}
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSingleProduct(producto)
                        setSinglePrecioPublico(producto.precio_publico ? String(producto.precio_publico) : '')
                        setSinglePrecioOferta(producto.precio_oferta ? String(producto.precio_oferta) : '')
                      }}
                      className="text-left group/price p-1.5 rounded-md hover:bg-primary/10 transition-colors w-full cursor-pointer flex items-center justify-between"
                      title="Haz clic para editar precio"
                    >
                      {producto.precio_publico ? (
                        <div className="text-xs font-semibold">
                          <span>${producto.precio_publico.toLocaleString('es-MX')}</span>
                          {producto.precio_oferta && (
                            <p className="text-[10px] text-destructive line-through font-normal">
                              ${producto.precio_oferta.toLocaleString('es-MX')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground/60" /> Fijar $
                        </span>
                      )}
                      <Edit className="h-3.5 w-3.5 text-muted-foreground/0 group-hover/price:text-muted-foreground transition-all ml-1 shrink-0" />
                    </button>
                  </TableCell>

                  {/* Estado Web */}
                  <TableCell>
                    {producto.esta_publicado ? (
                      <Badge variant="default" className="bg-[#2D5A3D] hover:bg-[#1e3a2f] text-[11px] gap-1">
                        <Check className="h-3 w-3" /> Publicado
                      </Badge>
                    ) : producto.producto_web_id ? (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] gap-1">
                        Pausado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[11px]">
                        ⚪ No Publicado
                      </Badge>
                    )}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant={producto.esta_publicado ? 'outline' : 'default'}
                        className={
                          producto.esta_publicado
                            ? 'h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-50'
                            : 'h-7 text-xs bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white'
                        }
                        onClick={() => handleTogglePublish(producto)}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : producto.esta_publicado ? (
                          'Pausar'
                        ) : (
                          'Publicar'
                        )}
                      </Button>

                      {producto.slug && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <a href={`/shop/${producto.slug}`} target="_blank" rel="noopener noreferrer" title="Ver en Tienda">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination total={total} />

      {/* Floating Bulk Action Bar (Barra de Acciones Masivas en Lote) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 bg-card border border-primary/30 shadow-2xl rounded-2xl px-5 py-3 min-w-[360px] md:min-w-[560px]">
            {/* Contador */}
            <div className="flex items-center gap-3 pr-4 border-r border-border">
              <div className="flex items-center justify-center bg-[#2D5A3D] text-white rounded-full h-8 w-8 font-bold text-sm shadow-xs ring-4 ring-[#2D5A3D]/20">
                {selectedIds.size}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground leading-tight">
                  Productos
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Seleccionados
                </span>
              </div>
            </div>

            {/* Acciones Masivas */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              {/* Botón $ Editar Precios Masivos */}
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 font-semibold text-xs gap-1.5 h-9"
                onClick={() => setIsPriceModalOpen(true)}
                disabled={isPending}
              >
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>Fijar Precios ($)</span>
              </Button>

              {/* Botón Publicar Selección */}
              <Button
                size="sm"
                className="bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white font-semibold text-xs gap-1.5 h-9"
                onClick={handleBulkPublish}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                Publicar Selección
              </Button>

              {/* Botón Pausar Selección */}
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 border-amber-500/30 hover:bg-amber-50 font-semibold text-xs gap-1.5 h-9"
                onClick={handleBulkUnpublish}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Pausar
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedIds(new Set())}
                title="Desmarcar todos"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Modal: Edición Masiva de Precios ($) */}
      <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Fijar Precios para {selectedIds.size} Productos Seleccionados
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBulkPriceSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="precioPublico" className="text-xs font-semibold">
                Precio Público ($ MXN) *
              </Label>
              <Input
                id="precioPublico"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 350.00"
                value={precioPublico}
                onChange={(e) => setPrecioPublico(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precioOferta" className="text-xs font-semibold">
                Precio Oferta ($ MXN) (Opcional)
              </Label>
              <Input
                id="precioOferta"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej: 299.00"
                value={precioOferta}
                onChange={(e) => setPrecioOferta(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <Label htmlFor="enOferta" className="text-xs font-medium cursor-pointer">
                Marcar como "En Oferta" en la tienda
              </Label>
              <Switch
                id="enOferta"
                checked={enOferta}
                onCheckedChange={setEnOferta}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPriceModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aplicar Precios a los {selectedIds.size} Productos
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Modal: Edición de Precio Individual (al hacer clic en la celda de la tabla) */}
      {editingSingleProduct && (
        <Dialog open={!!editingSingleProduct} onOpenChange={(open) => !open && setEditingSingleProduct(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Editar Precio: [{editingSingleProduct.sku_base}] {editingSingleProduct.descripcion || editingSingleProduct.nombre}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSinglePriceSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="singlePrecioPublico" className="text-xs font-semibold">
                  Precio Público ($ MXN) *
                </Label>
                <Input
                  id="singlePrecioPublico"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 350.00"
                  value={singlePrecioPublico}
                  onChange={(e) => setSinglePrecioPublico(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="singlePrecioOferta" className="text-xs font-semibold">
                  Precio Oferta ($ MXN) (Opcional)
                </Label>
                <Input
                  id="singlePrecioOferta"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 299.00"
                  value={singlePrecioOferta}
                  onChange={(e) => setSinglePrecioOferta(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSingleProduct(null)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar Precio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
