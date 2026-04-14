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
  const [formKey, setFormKey] = useState<string>('')
  
  // Controlled form state to prevent Base UI uncontrolled warnings
  const [formValues, setFormValues] = useState({
    sku_base: '',
    nombre: '',
    descripcion: '',
    precio_ec: '',
    estado: 'borrador',
    marca_id: '',
    genero_id: '',
    pz_en_caja: '1',
    familia: 'F000-000C',
    activo: true,
    destacado: false,
    es_conjunto: false,
  })

  useEffect(() => {
    setFormKey('')
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
          setFormKey(`edit-${editId}-${Date.now()}`)
        })
    } else if (modal === 'create') {
      const newProducto = {
        activo: true,
        estado: 'borrador',
        pz_en_caja: 1,
        destacado: false,
        es_conjunto: false,
        familia: 'F000-000C'
      }
      setProducto(newProducto)
      setFormValues({
        sku_base: '',
        nombre: '',
        descripcion: '',
        precio_ec: '',
        estado: 'borrador',
        marca_id: '',
        genero_id: '',
        pz_en_caja: '1',
        familia: 'F000-000C',
        activo: true,
        destacado: false,
        es_conjunto: false,
      })
      setLoadingData(false)
      setFormKey(`create-${Date.now()}`)
    } else {
      setProducto(null)
      setFormKey('')
    }
  }, [modal, editId])
  
  // Sync formValues when producto changes
  useEffect(() => {
    if (producto && formKey) {
      setFormValues({
        sku_base: producto.sku_base || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio_ec: producto.precio_ec?.toString() || '',
        estado: producto.estado || 'borrador',
        marca_id: producto.marca_id?.toString() || '',
        genero_id: producto.genero_id?.toString() || '',
        pz_en_caja: (producto.pz_en_caja ?? 1).toString(),
        familia: producto.familia || 'F000-000C',
        activo: producto.activo ?? true,
        destacado: producto.destacado ?? false,
        es_conjunto: producto.es_conjunto ?? false,
      })
    }
  }, [producto, formKey])

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

        {loadingData || !formKey ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        ) : (
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku_base">SKU Base *</Label>
                <Input id="sku_base" name="sku_base" value={formValues.sku_base} onChange={(e) => setFormValues(v => ({ ...v, sku_base: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" value={formValues.nombre} onChange={(e) => setFormValues(v => ({ ...v, nombre: e.target.value }))} />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" value={formValues.descripcion} onChange={(e) => setFormValues(v => ({ ...v, descripcion: e.target.value }))} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="precio_ec">Precio EC</Label>
                <Input id="precio_ec" name="precio_ec" type="number" step="0.01" value={formValues.precio_ec} onChange={(e) => setFormValues(v => ({ ...v, precio_ec: e.target.value }))} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select name="estado" value={formValues.estado} onValueChange={(val) => setFormValues(v => ({ ...v, estado: val || 'borrador' }))}>
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
                <Select name="marca_id" value={formValues.marca_id} onValueChange={(val) => setFormValues(v => ({ ...v, marca_id: val || '' }))}>
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
                <Select name="genero_id" value={formValues.genero_id} onValueChange={(val) => setFormValues(v => ({ ...v, genero_id: val || '' }))}>
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
                <Input id="pz_en_caja" name="pz_en_caja" type="number" value={formValues.pz_en_caja} onChange={(e) => setFormValues(v => ({ ...v, pz_en_caja: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="familia">Familia</Label>
                <Input id="familia" name="familia" value={formValues.familia} onChange={(e) => setFormValues(v => ({ ...v, familia: e.target.value }))} />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Switch id="activo" name="activo" checked={formValues.activo} onCheckedChange={(val) => setFormValues(v => ({ ...v, activo: val }))} />
                <Label htmlFor="activo">Activo</Label>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Switch id="destacado" name="destacado" checked={formValues.destacado} onCheckedChange={(val) => setFormValues(v => ({ ...v, destacado: val }))} />
                <Label htmlFor="destacado">Destacado</Label>
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                <Switch id="es_conjunto" name="es_conjunto" checked={formValues.es_conjunto} onCheckedChange={(val) => setFormValues(v => ({ ...v, es_conjunto: val }))} />
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
