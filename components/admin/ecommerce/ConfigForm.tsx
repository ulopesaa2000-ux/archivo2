// components/admin/ecommerce/ConfigForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { actualizarConfigEcommerce } from '@/modules/ecommerce/actions'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

const formSchema = z.object({
  // Modo de operación
  modo_operacion: z.enum(['catalogo', 'ecommerce', 'hibrido']),
  mostrar_precios: z.boolean(),
  tipo_precio_visible: z.enum(['publico', 'oferta', 'ambos']),
  
  // Tipo de venta
  tipo_venta: z.enum(['piezas', 'cajas', 'ambos']),
  minimo_unidades: z.coerce.number().min(1),
  multiplo_cajas: z.boolean(),
  
  // Textos
  texto_boton_agregar: z.string().min(1).max(50),
  texto_boton_finalizar: z.string().min(1).max(50),
  titulo_seccion_carrito: z.string().min(1).max(50),
  mensaje_precio_variable: z.string(),
  
  // Flujo de órdenes
  tipo_orden_generada: z.enum(['cotizacion', 'orden_b2b', 'orden_venta']),
  requiere_aprobacion: z.boolean(),
  
  // Contacto
  permitir_checkout_invitado: z.boolean(),
  email_notificaciones: z.string().email().optional().or(z.literal('')),
  
  // Visual
  mostrar_stock: z.boolean(),
  mostrar_sku: z.boolean(),
  mostrar_medidas_tabla: z.boolean(),
  mostrar_variantes_agotadas: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface ConfigFormProps {
  config?: ConfigEcommerce
}

export function ConfigForm({ config }: ConfigFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      modo_operacion: (config?.modo_operacion as any) || 'catalogo',
      mostrar_precios: config?.mostrar_precios ?? false,
      tipo_precio_visible: (config?.tipo_precio_visible as any) || 'publico',
      tipo_venta: (config?.tipo_venta as any) || 'piezas',
      minimo_unidades: config?.minimo_unidades ?? 1,
      multiplo_cajas: config?.multiplo_cajas ?? true,
      texto_boton_agregar: config?.texto_boton_agregar || 'Agregar a cotización',
      texto_boton_finalizar: config?.texto_boton_finalizar || 'Solicitar cotización',
      titulo_seccion_carrito: config?.titulo_seccion_carrito || 'Tu Cotización',
      mensaje_precio_variable: config?.mensaje_precio_variable || 
        'Los precios pueden variar según volumen y disponibilidad. Te contactaremos para confirmar.',
      tipo_orden_generada: (config?.tipo_orden_generada as any) || 'cotizacion',
      requiere_aprobacion: config?.requiere_aprobacion ?? true,
      permitir_checkout_invitado: config?.permitir_checkout_invitado ?? true,
      email_notificaciones: config?.email_notificaciones || '',
      mostrar_stock: config?.mostrar_stock ?? false,
      mostrar_sku: config?.mostrar_sku ?? true,
      mostrar_medidas_tabla: config?.mostrar_medidas_tabla ?? true,
      mostrar_variantes_agotadas: config?.mostrar_variantes_agotadas ?? false,
    },
  })

  const modoOperacion = form.watch('modo_operacion')

  async function onSubmit(data: FormData) {
    try {
      setIsLoading(true)
      await actualizarConfigEcommerce(data)
      toast.success('Configuración actualizada correctamente')
      router.refresh()
    } catch (error) {
      console.error('Error updating config:', error)
      toast.error('Error al actualizar la configuración')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Modo de Operación */}
        <Card>
          <CardHeader>
            <CardTitle>Modo de Operación</CardTitle>
            <CardDescription>
              Define si la tienda funciona como catálogo, ecommerce o híbrido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="modo_operacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modo de Operación</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un modo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="catalogo">
                        Catálogo (sin precios, solo cotizaciones)
                      </SelectItem>
                      <SelectItem value="ecommerce">
                        Ecommerce (precios visibles, venta directa)
                      </SelectItem>
                      <SelectItem value="hibrido">
                        Híbrido (precios referenciales, negociables)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {modoOperacion === 'catalogo' && 'Los clientes verán el catálogo sin precios y podrán solicitar cotizaciones.'}
                    {modoOperacion === 'ecommerce' && 'Los clientes verán precios y podrán comprar directamente.'}
                    {modoOperacion === 'hibrido' && 'Los clientes verán precios referenciales y podrán proponer sus precios.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mostrar_precios"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Mostrar Precios</FormLabel>
                    <FormDescription>
                      Mostrar precios en el catálogo y PDP
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('mostrar_precios') && (
              <FormField
                control={form.control}
                name="tipo_precio_visible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Precio Visible</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="publico">Precio Público</SelectItem>
                        <SelectItem value="oferta">Precio de Oferta</SelectItem>
                        <SelectItem value="ambos">Ambos (oferta tachado)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Tipo de Venta */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Venta</CardTitle>
            <CardDescription>
              Configura cómo se venden los productos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_venta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad de Venta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="piezas">Por Piezas</SelectItem>
                      <SelectItem value="cajas">Por Cajas (mayorista)</SelectItem>
                      <SelectItem value="ambos">Ambas (cliente elige)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minimo_unidades"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad Mínima</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormDescription>
                    Cantidad mínima para agregar al carrito
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multiplo_cajas"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Múltiplo de Cajas</FormLabel>
                    <FormDescription>
                      Las cantidades deben ser múltiplos de piezas por caja
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Textos Personalizados */}
        <Card>
          <CardHeader>
            <CardTitle>Textos Personalizados</CardTitle>
            <CardDescription>
              Personaliza los textos de la tienda según el modo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="texto_boton_agregar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto Botón "Agregar"</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Agregar a cotización" />
                  </FormControl>
                  <FormDescription>
                    Texto del botón en tarjetas de producto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="texto_boton_finalizar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto Botón "Finalizar"</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Solicitar cotización" />
                  </FormControl>
                  <FormDescription>
                    Texto del botón en el carrito/checkout
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="titulo_seccion_carrito"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Carrito</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ej: Tu Cotización" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mensaje_precio_variable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mensaje de Precio Variable</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Mostrado cuando los precios pueden variar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Flujo de Órdenes */}
        <Card>
          <CardHeader>
            <CardTitle>Flujo de Órdenes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_orden_generada"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Orden Generada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cotizacion">Cotización (requiere aprobación)</SelectItem>
                      <SelectItem value="orden_b2b">Orden B2B Directa</SelectItem>
                      <SelectItem value="orden_venta">Orden de Venta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requiere_aprobacion"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Requiere Aprobación</FormLabel>
                    <FormDescription>
                      Las órdenes entran como pendientes y requieren aprobación admin
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permitir_checkout_invitado"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Checkout Invitado</FormLabel>
                    <FormDescription>
                      Permitir cotizar/comprar sin iniciar sesión
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email_notificaciones"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Notificaciones</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="admin@ejemplo.com" />
                  </FormControl>
                  <FormDescription>
                    Email donde llegarán las nuevas cotizaciones/órdenes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configuración Visual */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración Visual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mostrar_stock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mostrar Stock</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mostrar_sku"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mostrar SKU</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mostrar_medidas_tabla"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mostrar Tabla de Medidas</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mostrar_variantes_agotadas"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mostrar Variantes Agotadas</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
