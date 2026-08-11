// app/(admin)/configuracion/tablas-soporte/components/TablaSoporteFormDialog.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { TABLAS_SOPORTE_CONFIG, type TablaSoporteKey } from '@/modules/config/tablas-soporte/types'
import {
  createTablaSoporteRecordAction,
  updateTablaSoporteRecordAction,
} from '@/modules/config/tablas-soporte/actions'

export function TablaSoporteFormDialog({
  open,
  onOpenChange,
  tabla,
  initialData,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabla: TablaSoporteKey
  initialData?: Record<string, any> | null
}) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = Boolean(initialData && initialData.id)
  const config = TABLAS_SOPORTE_CONFIG[tabla]

  useEffect(() => {
    if (open) {
      setErrorMsg(null)
      if (initialData) {
        setFormData({ ...initialData })
      } else {
        // Defaults for create mode
        const defaultState: Record<string, any> = {}
        if (config.hasActivoCol) defaultState.activo = true

        if (tabla === 'cat_colores') {
          defaultState.tipo_color = 'solido'
          defaultState.hex_code = '#000000'
          defaultState.orden_display = 0
        } else if (tabla === 'personas') {
          defaultState.tipo_entidad = 'Cliente B2B'
        } else if (tabla === 'cat_tipos_movimiento') {
          defaultState.afecta_inventario = 1
          defaultState.requiere_destino = false
        }
        setFormData(defaultState)
      }
    }
  }, [open, initialData, tabla, config.hasActivoCol])

  function handleChange(key: string, value: any) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    startTransition(async () => {
      let res
      if (isEdit && initialData?.id) {
        res = await updateTablaSoporteRecordAction(tabla, initialData.id, formData)
      } else {
        res = await createTablaSoporteRecordAction(tabla, formData)
      }

      if (res.success) {
        onOpenChange(false)
      } else {
        setErrorMsg(res.error || 'Error al procesar la solicitud')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEdit ? `Editar ${config.label}` : `Nuevo Registro en ${config.label}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modifica los campos del registro #${initialData?.id}`
              : `Completa los datos para agregar un nuevo registro a ${config.label}`}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* TABLA PERSONAS */}
          {tabla === 'personas' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nombre_completo">Nombre Completo *</Label>
                <Input
                  id="nombre_completo"
                  value={formData.nombre_completo || ''}
                  onChange={(e) => handleChange('nombre_completo', e.target.value)}
                  placeholder="Ej. Distribuidora Central S.A."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tipo_entidad">Tipo de Entidad *</Label>
                  <Select
                    value={formData.tipo_entidad || 'Cliente B2B'}
                    onValueChange={(val) => handleChange('tipo_entidad', val)}
                  >
                    <SelectTrigger id="tipo_entidad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente B2B">Cliente B2B</SelectItem>
                      <SelectItem value="Proveedor">Proveedor</SelectItem>
                      <SelectItem value="Cliente Retail">Cliente Retail</SelectItem>
                      <SelectItem value="Empleado">Empleado</SelectItem>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="identificacion_fiscal">RFC / Identificación Fiscal</Label>
                  <Input
                    id="identificacion_fiscal"
                    value={formData.identificacion_fiscal || ''}
                    onChange={(e) => handleChange('identificacion_fiscal', e.target.value)}
                    placeholder="Ej. ABC123456XYZ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email_contacto">Email de Contacto</Label>
                  <Input
                    id="email_contacto"
                    type="email"
                    value={formData.email_contacto || ''}
                    onChange={(e) => handleChange('email_contacto', e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefono_contacto">Teléfono de Contacto</Label>
                  <Input
                    id="telefono_contacto"
                    value={formData.telefono_contacto || ''}
                    onChange={(e) => handleChange('telefono_contacto', e.target.value)}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Textarea
                  id="direccion"
                  value={formData.direccion || ''}
                  onChange={(e) => handleChange('direccion', e.target.value)}
                  placeholder="Calle, Número, Colonia, Ciudad, Estado"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* TABLA CAT_MARCAS */}
          {tabla === 'cat_marcas' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre de Marca *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Ej. Nike, Adidas, InvBrand"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="logo_url">URL Logo</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url || ''}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ORDEN">Orden Visual</Label>
                  <Input
                    id="ORDEN"
                    type="number"
                    value={formData.ORDEN ?? ''}
                    onChange={(e) => handleChange('ORDEN', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          )}

          {/* TABLA CAT_TALLAS */}
          {tabla === 'cat_tallas' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código Talla *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="Ej. S, M, L, XL, 28, 30"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre descriptivo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    placeholder="Ej. Chica, Mediana, Grande"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ''}
                    onChange={(e) => handleChange('categoria', e.target.value)}
                    placeholder="Adulto, Niño, Calzado"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="talla_us">Talla US</Label>
                  <Input
                    id="talla_us"
                    value={formData.talla_us || ''}
                    onChange={(e) => handleChange('talla_us', e.target.value)}
                    placeholder="US Size"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orden">Orden Numérico</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.orden ?? ''}
                    onChange={(e) => handleChange('orden', e.target.value ? Number(e.target.value) : null)}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="es_extra"
                  checked={Boolean(formData.es_extra)}
                  onCheckedChange={(checked) => handleChange('es_extra', checked)}
                />
                <Label htmlFor="es_extra">¿Es Talla Extra / Especial?</Label>
              </div>
            </>
          )}

          {/* TABLA CAT_COLORES */}
          {tabla === 'cat_colores' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre Color *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    placeholder="Ej. Rojo Marino, Azul Rey"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código Color *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="Ej. ROJ-01, AZU-02"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hex_code">Código HEX (#)</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.hex_code && /^#[0-9A-F]{6}$/i.test(formData.hex_code) ? formData.hex_code : '#000000'}
                      onChange={(e) => handleChange('hex_code', e.target.value)}
                      className="h-9 w-10 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      id="hex_code"
                      value={formData.hex_code || ''}
                      onChange={(e) => handleChange('hex_code', e.target.value)}
                      placeholder="#FF0000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tipo_color">Tipo Color</Label>
                  <Select
                    value={formData.tipo_color || 'solido'}
                    onValueChange={(val) => handleChange('tipo_color', val)}
                  >
                    <SelectTrigger id="tipo_color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solido">Sólido</SelectItem>
                      <SelectItem value="patron">Patrón / Estampado</SelectItem>
                      <SelectItem value="jaspeado">Jaspeado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="orden_display">Orden Display</Label>
                  <Input
                    id="orden_display"
                    type="number"
                    value={formData.orden_display ?? 0}
                    onChange={(e) => handleChange('orden_display', Number(e.target.value))}
                  />
                </div>
              </div>
            </>
          )}

          {/* TABLA CAT_TELAS */}
          {tabla === 'cat_telas' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre de Tela *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Ej. Algodón 100%, Poliéster Microfibra"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="composicion">Composición Textil</Label>
                  <Input
                    id="composicion"
                    value={formData.composicion || ''}
                    onChange={(e) => handleChange('composicion', e.target.value)}
                    placeholder="Ej. 80% Algodón, 20% Poliéster"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="familia_tela">Familia de Tela</Label>
                  <Input
                    id="familia_tela"
                    value={formData.familia_tela || ''}
                    onChange={(e) => handleChange('familia_tela', e.target.value)}
                    placeholder="Ej. Tejido de Punto, Plano"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tela_descripcion">Descripción</Label>
                <Textarea
                  id="tela_descripcion"
                  value={formData.tela_descripcion || ''}
                  onChange={(e) => handleChange('tela_descripcion', e.target.value)}
                  placeholder="Detalles sobre suavidad, uso y cuidado"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* TABLA CAT_GENEROS */}
          {tabla === 'cat_generos' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre Género *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    placeholder="Ej. Hombre, Mujer, Unisex, Niño"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="Ej. H, M, U, N"
                  />
                </div>
              </div>
            </>
          )}

          {/* TABLA CAT_EDADES */}
          {tabla === 'cat_edades' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rango">Rango Edad *</Label>
                  <Input
                    id="rango"
                    value={formData.rango || ''}
                    onChange={(e) => handleChange('rango', e.target.value)}
                    placeholder="Ej. 0-24 meses, 4-16 años, Adulto"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edad_talla">Etiqueta Edad / Talla</Label>
                  <Input
                    id="edad_talla"
                    value={formData.edad_talla || ''}
                    onChange={(e) => handleChange('edad_talla', e.target.value)}
                    placeholder="Ej. Bebé, Infantil, Juvenil"
                  />
                </div>
              </div>
            </>
          )}

          {/* TABLA CAT_TIPO_PRENDA */}
          {tabla === 'cat_tipo_prenda' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Tipo de Prenda *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre || ''}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Ej. Camiseta, Pantalón, Vestido"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sup_inf_compl">Sección Corporal</Label>
                  <Select
                    value={formData.sup_inf_compl || 'superior'}
                    onValueChange={(val) => handleChange('sup_inf_compl', val)}
                  >
                    <SelectTrigger id="sup_inf_compl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superior">Superior (Camisa, Chamarra)</SelectItem>
                      <SelectItem value="inferior">Inferior (Pantalón, Short)</SelectItem>
                      <SelectItem value="complemento">Complemento / Accesorio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.orden ?? ''}
                    onChange={(e) => handleChange('orden', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </div>
            </>
          )}

          {/* TABLA CAT_TIPOS_MOVIMIENTO */}
          {tabla === 'cat_tipos_movimiento' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="Ej. COMP, DEVOL, TRAS"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre Movimiento *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    placeholder="Ej. Compra Proveedor, Ajuste Salida"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="afecta_inventario">Afectación de Stock</Label>
                  <Select
                    value={String(formData.afecta_inventario ?? 1)}
                    onValueChange={(val) => handleChange('afecta_inventario', Number(val))}
                  >
                    <SelectTrigger id="afecta_inventario">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">+1 (Suma Stock / Entrada)</SelectItem>
                      <SelectItem value="-1">-1 (Resta Stock / Salida)</SelectItem>
                      <SelectItem value="0">0 (Neutral / Transferencia)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="requiere_destino"
                    checked={Boolean(formData.requiere_destino)}
                    onCheckedChange={(checked) => handleChange('requiere_destino', checked)}
                  />
                  <Label htmlFor="requiere_destino">¿Requiere Bodega Destino?</Label>
                </div>
              </div>
            </>
          )}

          {/* TABLA CAT_ESTADOS_NOTA */}
          {tabla === 'cat_estados_nota' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código Estado *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo || ''}
                    onChange={(e) => handleChange('codigo', e.target.value)}
                    placeholder="Ej. PEND, CONF, CANC"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre Estado *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    placeholder="Ej. Pendiente, Confirmado"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion || ''}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  placeholder="Comportamiento del sistema en este estado"
                />
              </div>
            </>
          )}

          {/* CAMPO ACTIVO GENERAL */}
          {config.hasActivoCol && tabla !== 'personas' && (
            <div className="flex items-center gap-3 border-t pt-3 mt-4">
              <Switch
                id="activo"
                checked={Boolean(formData.activo ?? true)}
                onCheckedChange={(checked) => handleChange('activo', checked)}
              />
              <Label htmlFor="activo">Registro Activo</Label>
            </div>
          )}

          {tabla === 'personas' && (
            <div className="flex items-center gap-3 border-t pt-3 mt-4">
              <Switch
                id="activo"
                checked={Boolean(formData.activo ?? true)}
                onCheckedChange={(checked) => handleChange('activo', checked)}
              />
              <Label htmlFor="activo">Persona / Entidad Activa</Label>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? 'Guardar Cambios' : 'Crear Registro'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
