// components/admin/ecommerce/CategoryBannersManager.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Image as ImageIcon, Trash2, Eye, ExternalLink, Loader2, Sparkles, Tag, Package } from 'lucide-react'
import { toast } from 'sonner'
import type { CategoriaBannerResuelto } from '@/modules/ecommerce/banners'
import {
  createBannerCategoriaAction,
  updateBannerCategoriaAction,
  deleteBannerCategoriaAction,
} from '@/modules/ecommerce/banners'

interface Props {
  banners: CategoriaBannerResuelto[]
  generos: { id: number; nombre: string }[]
  tiposPrenda: { id: number; nombre: string }[]
  productos: { id: number; nombre: string; sku_base: string; slug?: string }[]
}

export function CategoryBannersManager({ banners, generos, tiposPrenda, productos }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await createBannerCategoriaAction(formData)
      if (res.success) {
        toast.success('Banner promocional creado exitosamente.')
        setIsOpen(false)
        setPreviewUrl(null)
        router.refresh()
      } else {
        toast.error(res.error || 'Error al crear el banner.')
      }
    })
  }

  const handleToggleActive = (id: number, currentActive: boolean) => {
    const formData = new FormData()
    formData.append('id', String(id))
    formData.append('activo', String(!currentActive))

    startTransition(async () => {
      const res = await updateBannerCategoriaAction(formData)
      if (res.success) {
        toast.success('Estado del banner actualizado.')
        router.refresh()
      } else {
        toast.error(res.error || 'Error al actualizar.')
      }
    })
  }

  const handleDelete = (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este banner promocional?')) return

    startTransition(async () => {
      const res = await deleteBannerCategoriaAction(id)
      if (res.success) {
        toast.success('Banner eliminado.')
        router.refresh()
      } else {
        toast.error(res.error || 'Error al eliminar.')
      }
    })
  }

  return (
    <Card className="border-store-border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-store-accent" />
            Banners Promocionales de Categorías
          </CardTitle>
          <CardDescription>
            Banners panorámicos (16:9) que promocionan prendas o colecciones en la cabecera de las categorías (ej. <em>Chamarra Dama</em>).
          </CardDescription>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="gap-2 bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white">
                <Plus className="h-4 w-4" />
                Nuevo Banner Panorámico
              </Button>
            }
          />

          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Agregar Banner Promocional de Categoría
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold">Nombre de Identificación *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="Ej: Promo Chamarra Polar Bicolor Dama"
                  required
                />
              </div>

              {/* Categoría: Género + Tipo de Prenda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="genero_id" className="text-xs font-semibold">Género de Categoría</Label>
                  <Select name="genero_id">
                    <SelectTrigger id="genero_id">
                      <SelectValue placeholder="— Todos los géneros —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Todos los géneros —</SelectItem>
                      {generos.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tipo_prenda_id" className="text-xs font-semibold">Tipo de Prenda</Label>
                  <Select name="tipo_prenda_id">
                    <SelectTrigger id="tipo_prenda_id">
                      <SelectValue placeholder="— Todos los tipos —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— Todos los tipos —</SelectItem>
                      {tiposPrenda.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Producto Asociado para Detalle */}
              <div className="space-y-1.5">
                <Label htmlFor="producto_id" className="text-xs font-semibold flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-store-accent" />
                  Producto Promocionado / Asociado (Opcional)
                </Label>
                <Select name="producto_id">
                  <SelectTrigger id="producto_id">
                    <SelectValue placeholder="— Seleccionar producto para ver en detalle —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">— Ninguno (Solo informativo) —</SelectItem>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        [{p.sku_base}] {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Si seleccionas un producto, al hacer clic en el banner el usuario irá directamente a su página de detalle.
                </p>
              </div>

              {/* Título y Subtítulo sobre el Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="titulo_banner" className="text-xs font-semibold">Título del Banner (Opcional)</Label>
                  <Input
                    id="titulo_banner"
                    name="titulo_banner"
                    placeholder="Ej: CHAMARRA POLAR BICOLOR PARA DAMA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subtitulo_banner" className="text-xs font-semibold">Subtítulo / Especificaciones</Label>
                  <Input
                    id="subtitulo_banner"
                    name="subtitulo_banner"
                    placeholder="Ej: CH-M-G-EG • 32 PZAS"
                  />
                </div>
              </div>

              {/* Subir Imagen Panorámica 16:9 */}
              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="file" className="text-xs font-bold text-store-ink">
                  Imagen del Banner Panorámico (Recomendado: 16:9 • 1920×1080 px) *
                </Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                {previewUrl && (
                  <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-store-border shadow-xs mt-2 bg-black/5">
                    <Image
                      src={previewUrl}
                      alt="Vista previa del banner"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-[#2D5A3D] hover:bg-[#1e3a2f] text-white">
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar y Publicar Banner
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-4">
        {banners.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg text-sm text-muted-foreground space-y-2">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="font-medium">No hay banners promocionales registrados.</p>
            <p className="text-xs">Crea tu primer banner panorámico para destacar productos sobre las categorías.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div
                key={b.id}
                className="group relative border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all space-y-3 p-3 flex flex-col justify-between"
              >
                {/* Imagen del Banner 16:9 */}
                <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border bg-muted/20">
                  <Image
                    src={b.imagen_url}
                    alt={b.nombre}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
                    <Badge variant={b.activo ? 'default' : 'secondary'} className={b.activo ? 'bg-[#2D5A3D]' : ''}>
                      {b.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {b.genero_nombre && (
                      <Badge variant="outline" className="bg-white/80 backdrop-blur-xs text-xs">
                        {b.genero_nombre}
                      </Badge>
                    )}
                    {b.tipo_prenda_nombre && (
                      <Badge variant="outline" className="bg-white/80 backdrop-blur-xs text-xs">
                        {b.tipo_prenda_nombre}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Información */}
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-sm text-foreground">{b.nombre}</h4>
                  {b.titulo_banner && (
                    <p className="text-muted-foreground font-mono truncate">{b.titulo_banner}</p>
                  )}

                  {b.producto_nombre && (
                    <div className="flex items-center gap-1 text-[#2D5A3D] font-medium bg-[#2D5A3D]/10 p-1.5 rounded-md">
                      <Tag className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Producto: [{b.producto_sku}] {b.producto_nombre}</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between border-t pt-2 mt-auto text-xs">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] text-muted-foreground">Estado:</Label>
                    <Switch
                      checked={b.activo}
                      onCheckedChange={() => handleToggleActive(b.id, b.activo)}
                      disabled={isPending}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(b.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
