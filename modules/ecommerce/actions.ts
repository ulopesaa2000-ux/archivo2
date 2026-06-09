// modules/ecommerce/actions.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type { Database } from '@/lib/types/database.types'
import type {
  ConfigEcommerceUpdate,
  ProductoWebInsert,
  ProductoWebUpdate,
  DatosContacto,
  OrdenVentaUpdate,
  QuoteItem,
} from './types'

// CONFIGURACION GLOBAL

export async function actualizarConfigEcommerce(data: ConfigEcommerceUpdate) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('config_ecommerce')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) {
    throw new Error(`Error actualizando config: ${error.message}`)
  }

  revalidateTag('ecommerce-config', 'max')
  revalidatePath('/(store)')
  revalidatePath('/(admin)/ecommerce/config')

  return { success: true }
}

// PRODUCTOS WEB (ADMIN)

export async function publicarProductoWeb(data: ProductoWebInsert) {
  const supabase = await createClient()

  let slug = data.slug
  if (!slug) {
    const { data: producto } = await supabase
      .from('productos')
      .select('nombre, sku_base')
      .eq('id', data.producto_id)
      .single()

    if (producto) {
      slug = slugify(`${producto.nombre}-${producto.sku_base}`)
    }
  }

  const { data: existente } = await supabase
    .from('productos_web')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existente) {
    slug = `${slug}-${Date.now()}`
  }

  const insertPayload: Database['inv-tienda']['Tables']['productos_web']['Insert'] = {
    ...data,
    slug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data: result, error } = await supabase
    .from('productos_web')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    throw new Error(`Error publicando producto: ${error.message}`)
  }

  revalidatePath('/(admin)/ecommerce/productos-web')
  revalidatePath('/(store)/catalogo')

  return { success: true, data: result }
}

export async function actualizarProductoWeb(id: number, data: ProductoWebUpdate) {
  const supabase = await createClient()

  if (data.slug) {
    const { data: existente } = await supabase
      .from('productos_web')
      .select('id')
      .eq('slug', data.slug)
      .neq('id', id)
      .maybeSingle()

    if (existente) {
      throw new Error('El slug ya existe para otro producto')
    }
  }

  const { error } = await supabase
    .from('productos_web')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Error actualizando producto: ${error.message}`)
  }

  revalidatePath('/(admin)/ecommerce/productos-web')
  revalidatePath('/(store)/catalogo')
  revalidatePath('/(store)/catalogo/[slug]')

  return { success: true }
}

export async function despublicarProductoWeb(id: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('productos_web')
    .update({
      activo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Error despublicando producto: ${error.message}`)
  }

  revalidatePath('/(admin)/ecommerce/productos-web')
  revalidatePath('/(store)/catalogo')

  return { success: true }
}

// ORDENES / COTIZACIONES

export async function actualizarEstadoOrden(
  id: number,
  nuevoEstado: string,
  notas?: string
) {
  const supabase = await createClient()

  const updates: OrdenVentaUpdate = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  }

  if (nuevoEstado === 'enviado') {
    updates.fecha_envio = new Date().toISOString()
  }

  if (nuevoEstado === 'entregado') {
    updates.fecha_entrega = new Date().toISOString()
  }

  const { error } = await supabase
    .from('ordenes_venta')
    .update(updates)
    .eq('id', id)

  if (error) {
    throw new Error(`Error actualizando estado: ${error.message}`)
  }

  revalidatePath('/(admin)/ecommerce/ordenes-venta')
  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${id}`)

  return { success: true }
}

export async function actualizarNumeroRastreo(id: number, numeroRastreo: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ordenes_venta')
    .update({
      numero_rastreo: numeroRastreo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Error actualizando rastreo: ${error.message}`)
  }

  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${id}`)

  return { success: true }
}

// COTIZACION -> ORDEN B2B

export async function convertirCotizacionAOrdenB2B(
  cotizacionId: number,
  preciosFinales?: Record<number, number>
) {
  const supabase = await createClient()

  const { data: cotizacion, error: cotError } = await supabase
    .from('ordenes_venta')
    .select('*')
    .eq('id', cotizacionId)
    .eq('estado', 'pendiente')
    .single()

  if (cotError || !cotizacion) {
    throw new Error('Cotizacion no encontrada o no esta pendiente')
  }

  const { data: items, error: itemsError } = await supabase
    .from('orden_items')
    .select('*')
    .eq('orden_id', cotizacionId)

  if (itemsError) {
    throw new Error('Error obteniendo items')
  }

  const variantIds = (items ?? []).map((item) => item.variante_id)
  const { data: variantes, error: variantesError } = await supabase
    .from('variantes_producto')
    .select('id, producto_id')
    .in('id', variantIds)

  if (variantesError) {
    throw new Error('Error obteniendo variantes para conversion B2B')
  }

  const productoIdByVariante = new Map(
    (variantes ?? []).map((variante) => [variante.id, variante.producto_id])
  )

  const { data: ordenB2B, error: ordenError } = await supabase
    .from('ordenes_b2b')
    .insert({
      cliente_b2b_id: null,
      estado: 'Borrador',
      fecha_orden: new Date().toISOString(),
      moneda: 'USD',
      observaciones: `Convertido desde cotizacion #${cotizacion.numero_orden}. Contacto: ${cotizacion.nombre_cliente ?? 'N/A'} / ${cotizacion.email_cliente ?? 'N/A'} / ${cotizacion.telefono_cliente ?? 'N/A'}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (ordenError || !ordenB2B) {
    throw new Error('Error creando orden B2B')
  }

  let totalPiezas = 0
  const itemsB2B: Database['inv-tienda']['Tables']['ordenes_b2b_detalles']['Insert'][] = (items ?? []).map((item) => {
    const precioFinal = preciosFinales?.[item.variante_id] || item.precio_unitario
    const subtotalItem = item.cantidad * precioFinal
    const productoId = productoIdByVariante.get(item.variante_id)

    if (!productoId) {
      throw new Error(`No se encontro producto para la variante ${item.variante_id}`)
    }

    totalPiezas += item.cantidad

    return {
      orden_id: ordenB2B.id,
      producto_id: productoId,
      cantidad_solicitada: item.cantidad,
      piezas_pedidas: item.cantidad,
      precio_unitario: precioFinal,
      importe_total: subtotalItem,
    }
  })

  const { error: itemsB2BError } = await supabase
    .from('ordenes_b2b_detalles')
    .insert(itemsB2B)

  if (itemsB2BError) {
    throw new Error('Error creando items de orden B2B')
  }

  await supabase
    .from('ordenes_b2b')
    .update({
      total_piezas: totalPiezas,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ordenB2B.id)

  await supabase
    .from('ordenes_venta')
    .update({
      estado: 'convertida',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cotizacionId)

  revalidatePath('/(admin)/ecommerce/ordenes-venta')
  revalidatePath('/(admin)/ordenes-b2b')

  return {
    success: true,
    ordenB2BId: ordenB2B.id,
  }
}

// CREAR COTIZACION DESDE STORE

export async function crearCotizacion(
  items: QuoteItem[],
  datosContacto: DatosContacto,
  config: {
    tipo_orden_generada: string
    requiere_aprobacion: boolean
  }
) {
  const supabase = await createClient()

  const timestamp = Date.now().toString(36).toUpperCase()
  const numeroOrden = `COT-${timestamp}`

  const subtotal = items.reduce((sum, item) => {
    const precio = item.precioUnitario || item.precioOfrecido || 0
    return sum + item.cantidad * precio
  }, 0)

  const { data: orden, error } = await supabase
    .from('ordenes_venta')
    .insert({
      numero_orden: numeroOrden,
      usuario_id: null,
      email_cliente: datosContacto.email,
      nombre_cliente: datosContacto.nombre,
      telefono_cliente: datosContacto.telefono,
      direccion_envio: datosContacto.direccion
        ? {
            direccion: datosContacto.direccion,
            ciudad: datosContacto.ciudad,
            estado: datosContacto.estado,
          }
        : null,
      subtotal,
      envio: 0,
      impuestos: 0,
      total: subtotal,
      estado: config.requiere_aprobacion ? 'pendiente' : 'aprobada',
      notas_cliente: datosContacto.notas,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !orden) {
    throw new Error(`Error creando cotizacion: ${error?.message}`)
  }

  const ordenItems: Database['inv-tienda']['Tables']['orden_items']['Insert'][] = items.map((item) => ({
    orden_id: orden.id,
    variante_id: item.varianteId,
    cantidad: item.cantidad,
    precio_unitario: item.precioUnitario || item.precioOfrecido || 0,
    subtotal: (item.precioUnitario || item.precioOfrecido || 0) * item.cantidad,
  }))

  const { error: itemsInsertError } = await supabase
    .from('orden_items')
    .insert(ordenItems)

  if (itemsInsertError) {
    throw new Error('Error creando items de cotizacion')
  }

  revalidatePath('/(admin)/ecommerce/ordenes-venta')

  return {
    success: true,
    ordenId: orden.id,
    numeroOrden: orden.numero_orden,
  }
}
