'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { createProductAction, updateProductAction } from '@/modules/catalogo/actions'
import { fetchProductoPorIdParaEdicion } from '@/modules/catalogo/queries'
import type { ProductoRow } from '@/lib/types/tables'
import type { CatalogosParaFiltros } from '@/modules/catalogo/types'

export function CatalogoCreateDialog({
  catalogos
}: {
  catalogos: CatalogosParaFiltros
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modal = searchParams.get('modal')
  const editId = searchParams.get('edit_id')

  const isOpen = modal === 'create' || modal === 'edit'
  const isEdit = modal === 'edit'

  const [isPending, startTransition] = useTransition()
  const [producto, setProducto] = useState<Partial<ProductoRow> | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (isEdit && editId) {
      setLoadingData(true)
      fetchProductoPorIdParaEdicion(Number(editId))
        .then(data => {
          if (data) {
            setProducto(data)
          } else {
            throw new Error('Producto no encontrado')
          }
        })
        .catch(err => {
          console.error(err)
          setProducto({ id: Number(editId) })
        })
        .finally(() => {
          setLoadingData(false)
        })
    } else if (modal === 'create') {
      setProducto({
        activo: true,
        estado: 'borrador',
        pz_en_caja: 1,
        destacado: false,
        es_conjunto: false,
        familia: 'F000-000C'
      })
    } else {
      setProducto(null)
    }
  }, [modal, editId])

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('modal')
    params.delete('edit_id')
    router.push(`/catalogo?${params.toString()}`, { scroll: false })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    if (isEdit && editId) {
      formData.append('product_id', editId)
    }
    
    startTransition(async () => {
      const res = isEdit 
        ? await updateProductAction(formData)
        : await createProductAction(formData)
        
      if (res.success) {
        handleClose()
        // router.refresh() no es necesario aquí porque las actions ya usan revalidatePath('/catalogo')
        // lo cual automáticamente refrescará los Server Components en la ruta actual
      } else {
        alert(res.error || 'Ocurrió un error al guardar')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifica los datos del producto.' : 'Ingresa los datos para el nuevo producto.'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku_base">SKU Base *</Label>
                <Input id="sku_base" name="sku_base" defaultValue={producto?.sku_base || ''} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" defaultValue={producto?.nombre || ''} />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" defaultValue={producto?.descripcion || ''} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="precio_ec">Precio EC</Label>
                <Input id="precio_ec" name="precio_ec" type="number" step="0.01" defaultValue={producto?.precio_ec || ''} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select name="estado" defaultValue={producto?.estado || 'borrador'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="descontinuado">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marca_id">Marca</Label>
                <Select name="marca_id" defaultValue={producto?.marca_id?.toString() || ''}>
                  <SelectTrigger><SelectValue placeholder="Seleccione una marca" /></SelectTrigger>
                  <SelectContent>
                    {catalogos.marcas.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>{m.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genero_id">Género</Label>
                <Select name="genero_id" defaultValue={producto?.genero_id?.toString() || ''}>
                  <SelectTrigger><SelectValue placeholder="Seleccione un género" /></SelectTrigger>
                  <SelectContent>
                    {catalogos.generos.map(g => (
                      <SelectItem key={g.id} value={g.id.toString()}>{g.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pz_en_caja">Piezas por Caja</Label>
                <Input id="pz_en_caja" name="pz_en_caja" type="number" defaultValue={producto?.pz_en_caja || 1} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="familia">Familia</Label>
                <Input id="familia" name="familia" defaultValue={producto?.familia || 'F000-000C'} />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Switch id="activo" name="activo" defaultChecked={producto?.activo ?? true} />
                <Label htmlFor="activo">Activo</Label>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Switch id="destacado" name="destacado" defaultChecked={producto?.destacado ?? false} />
                <Label htmlFor="destacado">Destacado</Label>
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                <Switch id="es_conjunto" name="es_conjunto" defaultChecked={producto?.es_conjunto ?? false} />
                <Label htmlFor="es_conjunto">Es Conjunto</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
