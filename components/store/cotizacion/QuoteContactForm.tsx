// components/store/cotizacion/QuoteContactForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuoteCart } from '@/hooks/useQuoteCart'
import { crearCotizacion } from '@/modules/ecommerce/actions'
import { formatearPrecio } from '@/modules/ecommerce/utils'
import { slugify } from '@/lib/utils'
import type { ConfigEcommerce } from '@/modules/ecommerce/types'

interface QuoteContactFormProps {
  config: ConfigEcommerce | null
}

const REGIONES_ATENCION = [
  'Centro / Ciudad de México',
  'Tulancingo, Hgo.',
  'Moroleón, Gto.',
  'San Martín Texmelucan, Pue.',
  'Toluca, Edo. Méx.',
  'Chiconcuac, Edo. Méx.',
  'Otra región / Envíos a todo México',
]

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
    region_atencion: z.string().min(1, 'Por favor selecciona la ciudad o región de atención'),
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
      region_atencion: 'Centro / Ciudad de México',
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
      const notasCombinadas = `[Región de Atención: ${data.region_atencion}]${data.notas ? ` - ${data.notas}` : ''}`

      const result = await crearCotizacion(
        items,
        {
          nombre: data.nombre,
          email: data.email,
          telefono: data.telefono,
          empresa: data.empresa,
          direccion: data.direccion,
          ciudad: data.region_atencion,
          notas: notasCombinadas,
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
        <p className="text-muted-foreground dark:text-gray-400">Tu cotización está vacía</p>
        <Button className="mt-4" onClick={() => router.push('/shop')}>
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
        <Card className="bg-card dark:bg-zinc-900 border-border dark:border-zinc-800 text-card-foreground">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground dark:text-gray-100 mb-4">Productos solicitados</h3>
            <div className="space-y-2">
              {items.map((item) => {
                const productUrl = item.slug
                  ? `/shop/${item.slug}`
                  : item.sku
                    ? `/shop/${slugify(item.sku)}`
                    : '/shop'

                return (
                  <div key={item.varianteId} className="flex justify-between text-sm items-center">
                    <Link
                      href={productUrl}
                      target="_blank"
                      className="text-foreground dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors font-medium"
                      title={`Ver ${item.nombre}`}
                    >
                      {item.nombre} x {item.cantidad}
                    </Link>
                    {mostrarPrecios && item.precioUnitario && (
                      <span className="text-foreground dark:text-gray-100">
                        {formatearPrecio(item.precioUnitario * item.cantidad, config!)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {mostrarPrecios && (
              <>
                <Separator className="my-4" />
                <div className="flex justify-between font-semibold text-foreground dark:text-gray-100">
                  <span>Subtotal</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatearPrecio(subtotal, config!)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Formulario de contacto */}
        <Card className="bg-card dark:bg-zinc-900 border-border dark:border-zinc-800 text-card-foreground">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground dark:text-gray-100">Datos de contacto y atención</h3>

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground dark:text-gray-200">Nombre completo *</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100" />
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
                    <FormLabel className="text-foreground dark:text-gray-200">Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100" />
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
                    <FormLabel className="text-foreground dark:text-gray-200">Teléfono *</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Selección de Región / Ciudad de atención */}
            <FormField
              control={form.control}
              name="region_atencion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground dark:text-gray-200 font-medium">
                    Ciudad / Región cercana para atención *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100 border-border">
                        <SelectValue placeholder="Selecciona la región o ciudad más cercana" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover dark:bg-zinc-900 border-border">
                      {REGIONES_ATENCION.map((region) => (
                        <SelectItem key={region} value={region} className="text-foreground dark:text-gray-100">
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiredFields.includes('empresa') && (
              <FormField
                control={form.control}
                name="empresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground dark:text-gray-200">Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100" />
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
                    <FormLabel className="text-foreground dark:text-gray-200">Dirección *</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100" />
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
                  <FormLabel className="text-foreground dark:text-gray-200">Notas adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Especificaciones de prendas, colores, tallas requeridas u otra información sobre tu pedido..."
                      className="bg-background dark:bg-zinc-950 text-foreground dark:text-gray-100"
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
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium" 
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar solicitud de cotización'}
        </Button>
      </form>
    </Form>
  )
}
