'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createProductAction, updateProductAction, checkSkuExistsAction } from '@/modules/catalogo/actions'
import { fetchProductoPorIdParaEdicion } from '@/modules/catalogo/queries'
import type { ProductoRow } from '@/lib/types/tables'
import type { CatalogosParaFiltros } from '@/modules/catalogo/types'

export function CatalogoCreateDialog({
  catalogos
}: {
  catalogos: CatalogosParaFiltros
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const modal = searchParams.get('modal')
  const editId = searchParams.get('edit_id')

  const isOpen = modal === 'create' || modal === 'edit' || modal === 'copy'
  const isEdit = modal === 'edit'
  const isCopy = modal === 'copy'

  const [optimisticOpen, setOptimisticOpen] = useState(isOpen)
  const [isPending, startTransition] = useTransition()
  const [producto, setProducto] = useState<Partial<ProductoRow> | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [formKey, setFormKey] = useState<string>('')
  
  const [checkingSku, setCheckingSku] = useState(false)
  const [skuError, setSkuError] = useState<string | null>(null)
  
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

  // Sync optimisticOpen automatically
  useEffect(() => {
    setOptimisticOpen(isOpen)
    if (!isOpen) {
      setSkuError(null)
    }
  }, [isOpen])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: reset form state on modal param change
    setFormKey('')
    if ((isEdit || isCopy) && editId) {
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
          setFormKey(`${isEdit ? 'edit' : 'copy'}-${editId}-${Date.now()}`)
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
  }, [modal, editId, isEdit, isCopy])
  
  // Sync formValues when producto changes
  useEffect(() => {
    if (producto && formKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate: sync controlled form state from fetched producto data
      setFormValues({
        sku_base: isCopy ? `${producto.sku_base} (copia)` : (producto.sku_base || ''),
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
    // Simplemente limpiamos los params y nos quedamos en la ruta actual
    setOptimisticOpen(false)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const verifySku = async (sku: string): Promise<boolean> => {
    if (!sku) return true
    setCheckingSku(true)
    setSkuError(null)
    try {
      const exists = await checkSkuExistsAction(sku, isEdit && editId ? Number(editId) : undefined)
      if (exists) {
        setSkuError('El SKU ya existe o está en uso.')
        return false
      }
      return true
    } catch (e) {
      return true // Si la alerta falla por red, que sea la acción final la que falle.
    } finally {
      setCheckingSku(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    
    // Doble confirmación de SKU
    const isAvailable = await verifySku(formValues.sku_base)
    if (!isAvailable) {
      toast.error('Corrige los errores antes de guardar')
      return
    }

    const formData = new FormData(form)
    
    if (isEdit && editId) {
      formData.append('product_id', editId)
    }
    
    startTransition(async () => {
      const res = isEdit 
        ? await updateProductAction(formData)
        : await createProductAction(formData)
        
      if (res.success) {
        if (isEdit) {
          toast.success('Producto actualizado exitosamente')
          handleClose() // Si solo editas desde la lista de catálogo, solo ciérralo
        } else if ((modal === 'create' || isCopy) && res.id) {
          toast.success('Producto creado, redirigiendo...', {
            description: 'Abriendo el detalle para continuar edición',
          })
          // Redirige directamente (lo cual también limpia el modal ya que cambia de URL base si vienes desde /catalogo)
          // O si venías de /catalogo/[idViejo], esto carga la página /catalogo/[idNuevo]
          router.push(`/catalogo/${res.id}`)
        }
      } else {
        toast.error('Error al guardar', { description: res.error || 'Ocurrió un error inesperado' })
      }
    })
  }

  return (
    <Dialog open={optimisticOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[98vw] sm:max-w-[800px] lg:max-w-[1100px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Producto' : isCopy ? 'Copiar Producto' : 'Nuevo Producto'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Modifica los datos del producto.' 
              : isCopy 
                ? 'Crea un nuevo producto basado en uno existente.' 
                : 'Ingresa los datos para el nuevo producto.'}
          </DialogDescription>
        </DialogHeader>

        {loadingData || !formKey ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        ) : (
          <form key={formKey} onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku_base">SKU Base *</Label>
                <div className="flex gap-2">
                  <Input 
                    id="sku_base" 
                    name="sku_base" 
                    value={formValues.sku_base} 
                    onChange={(e) => {
                      setFormValues(v => ({ ...v, sku_base: e.target.value }))
                      setSkuError(null)
                    }} 
                    required 
                    className={skuError ? "border-destructive" : ""}
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="icon"
                    disabled={!formValues.sku_base || checkingSku}
                    onClick={() => verifySku(formValues.sku_base)}
                    title="Verificar SKU"
                  >
                    {checkingSku ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {skuError && <p className="text-xs text-destructive">{skuError}</p>}
              </div>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" value={formValues.nombre} onChange={(e) => setFormValues(v => ({ ...v, nombre: e.target.value }))} />
              </div>
              
              <div className="space-y-2 lg:col-span-3">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" rows={2} value={formValues.descripcion} onChange={(e) => setFormValues(v => ({ ...v, descripcion: e.target.value }))} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="precio_ec">Precio EC</Label>
                <Input id="precio_ec" name="precio_ec" type="number" step="0.01" value={formValues.precio_ec} onChange={(e) => setFormValues(v => ({ ...v, precio_ec: e.target.value }))} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select name="estado" value={formValues.estado} onValueChange={(val) => setFormValues(v => ({ ...v, estado: val || 'borrador' }))}>
                  <SelectTrigger className="w-full h-8 px-3">
                    <span className="flex-1 text-left truncate">
                      {formValues.estado ? (formValues.estado.charAt(0).toUpperCase() + formValues.estado.slice(1)) : "Seleccione estado"}
                    </span>
                  </SelectTrigger>
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
                  <SelectTrigger className="w-full h-8 px-3">
                    <span className="flex-1 text-left truncate">
                      {catalogos.marcas.find(m => String(m.id) === String(formValues.marca_id))?.nombre || "Seleccione una marca"}
                    </span>
                  </SelectTrigger>
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
                  <SelectTrigger className="w-full h-8 px-3">
                    <span className="flex-1 text-left truncate">
                      {catalogos.generos.find(g => String(g.id) === String(formValues.genero_id))?.nombre || "Seleccione un género"}
                    </span>
                  </SelectTrigger>
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

              <div className="flex flex-wrap items-center gap-6 pt-4 lg:col-span-3 border-t">
                <div className="flex items-center space-x-2">
                  <Switch id="activo" name="activo" checked={formValues.activo} onCheckedChange={(val) => setFormValues(v => ({ ...v, activo: val }))} />
                  <Label htmlFor="activo">Activo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="destacado" name="destacado" checked={formValues.destacado} onCheckedChange={(val) => setFormValues(v => ({ ...v, destacado: val }))} />
                  <Label htmlFor="destacado">Destacado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="es_conjunto" name="es_conjunto" checked={formValues.es_conjunto} onCheckedChange={(val) => setFormValues(v => ({ ...v, es_conjunto: val }))} />
                  <Label htmlFor="es_conjunto">Es Conjunto</Label>
                </div>
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
