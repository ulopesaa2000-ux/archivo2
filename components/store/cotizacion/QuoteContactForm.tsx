// components/store/cotizacion/QuoteContactForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { crearCotizacion } from '@/modules/ecommerce/actions'
import { formatearPrecio } from '@/modules/ecommerce/utils'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

interface QuoteContactFormProps {
  config: ConfigEcommerce | null
}

export function QuoteContactForm({ config }: QuoteContactFormProps) {
  const router = useRouter()
  const { items, subtotal, clearCart } = useQuoteCart()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Schema dinámico según campos requeridos
  const requiredFields = (config?.campos_contacto_requeridos as string[]) || ['nombre', 'email', 'telefono']
  
  const formSchema = z.object({
    nombre: z.string().min(2, 'Nombre requerido'),
    email: z.string().email('Email inválido'),
    telefono: z.string().min(8, 'Teléfono requerido'),
    empresa: requiredFields.includes('empresa') 
      ? z.string().min(2, 'Empresa requerida') 
      : z.string().optional(),
    direccion: requiredFields.includes('direccion')
      ? z.string().min(5, 'Dirección requerida')
      : z.string().optional(),
    notas: z.string().optional(),
  })

  type FormData = z.infer<typeof formSchema>

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      email: '',
      telefono: '',
      empresa: '',
      direccion: '',
      notas: '',
    },
  })

  async function onSubmit(data: FormData) {
    if (items.length === 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await crearCotizacion(
        items,
        {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          empresa: data.empresa,
          direccion: data.direccion,
          notas: data.notas,
        },
        {
          tipo_orden_generada: config?.tipo_orden_generada || 'cotizacion',
          requiere_aprobacion: config?.requiere_aprobacion ?? true,
        }
      )

      if (result.success) {
        clearCart()
        router.push(`/cotizacion/gracias?orden=${result.numeroOrden}`)
      }
    } catch (error) {
      console.error('Error submitting:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Tu cotización está vacía</p>
        <Button className="mt-4" onClick={() => router.push('/catalogo')}>
          Ver catálogo
        </Button>
      </div>
    )
  }

  const mostrarPrecios = config?.mostrar_precios ?? false

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Resumen de items */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Productos solicitados</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.varianteId} className="flex justify-between text-sm">
                  <span>
                    {item.nombre} x {item.cantidad}
                  </span>
                  {mostrarPrecios && item.precioUnitario && (
                    <span>{formatearPrecio(item.precioUnitario * item.cantidad, config!)}</span>
                  )}
                </div>
              ))}
            </div>
            {mostrarPrecios && (
              <>
                <Separator className="my-4" />
                <div className="flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>{formatearPrecio(subtotal, config!)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Formulario de contacto */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold">Datos de contacto</h3>

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {requiredFields.includes('empresa') && (
              <FormField
                control={form.control}
                name="empresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiredFields.includes('direccion') && (
              <FormField
                control={form.control}
                name="direccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección *</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Información adicional sobre tu solicitud..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
        </Button>
      </form>
    </Form>
  )
}
