// modules/ecommerce/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type {
  ConfigEcommerceUpdate,
  ProductoWebInsert,
  ProductoWebUpdate,
  DatosContacto,
  QuoteItem,
} from './types'

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════

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
  
  // Revalidar todas las rutas del store
  revalidatePath('/(store)')
  revalidatePath('/(admin)/ecommerce/config')
  
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTOS WEB (ADMIN)
// ═══════════════════════════════════════════════════════════════

export async function publicarProductoWeb(data: ProductoWebInsert) {
  const supabase = await createClient()
  
  // Generar slug automáticamente si no se proporciona
  let slug = data.slug
  if (!slug) {
    // Obtener nombre del producto para generar slug
    const { data: producto } = await supabase
      .from('productos')
      .select('nombre, sku_base')
      .eq('id', data.producto_id)
      .single()
    
    if (producto) {
      slug = slugify(`${producto.nombre}-${producto.sku_base}`)
    }
  }
  
  // Verificar que el slug sea único
  const { data: existente } = await supabase
    .from('productos_web')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  
  if (existente) {
    // Agregar timestamp al slug para hacerlo único
    slug = `${slug}-${Date.now()}`
  }
  
  const { data: result, error } = await supabase
    .from('productos_web')
    .insert({
      ...data,
      slug,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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
  
  // Si se actualiza el slug, verificar unicidad
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
  revalidatePath(`/(store)/catalogo/[slug]`)
  
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

// ═══════════════════════════════════════════════════════════════
// ÓRDENES / COTIZACIONES
// ═══════════════════════════════════════════════════════════════

export async function actualizarEstadoOrden(
  id: number,
  nuevoEstado: string,
  notas?: string
) {
  const supabase = await createClient()
  
  const updates: Record<string, any> = {
    estado: nuevoEstado,
    updated_at: new Date().toISOString(),
  }
  
  // Si cambia a 'enviado', registrar fecha
  if (nuevoEstado === 'enviado') {
    updates.fecha_envio = new Date().toISOString()
  }
  
  // Si cambia a 'entregado', registrar fecha
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

// ═══════════════════════════════════════════════════════════════
// COTIZACIÓN → ORDEN B2B
// ═══════════════════════════════════════════════════════════════

export async function convertirCotizacionAOrdenB2B(
  cotizacionId: number,
  preciosFinales?: Record<number, number> // variante_id -> precio final
) {
  const supabase = await createClient()
  
  // 1. Obtener cotización
  const { data: cotizacion, error: cotError } = await supabase
    .from('ordenes_venta')
    .select('*')
    .eq('id', cotizacionId)
    .eq('estado', 'pendiente')
    .single()
  
  if (cotError || !cotizacion) {
    throw new Error('Cotización no encontrada o no está pendiente')
  }
  
  // 2. Obtener items
  const { data: items, error: itemsError } = await supabase
    .from('orden_items')
    .select('*')
    .eq('orden_id', cotizacionId)
  
  if (itemsError) {
    throw new Error('Error obteniendo items')
  }
  
  // 3. Crear orden B2B
  const { data: ordenB2B, error: ordenError } = await supabase
    .from('ordenes_b2b')
    .insert({
      cliente_id: null, // Podría vincularse a persona si existe
      contacto_nombre: cotizacion.nombre_cliente,
      contacto_email: cotizacion.email_cliente,
      contacto_telefono: cotizacion.telefono_cliente,
      estado: 'borrador',
      subtotal: 0, // Calcular abajo
      impuestos: 0,
      total: 0,
      notas: `Convertido desde cotización #${cotizacion.numero_orden}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  if (ordenError || !ordenB2B) {
    throw new Error('Error creando orden B2B')
  }
  
  // 4. Crear items de orden B2B
  let subtotal = 0
  const itemsB2B = (items || []).map((item: any) => {
    const precioFinal = preciosFinales?.[item.variante_id] || item.precio_unitario
    const subtotalItem = item.cantidad * precioFinal
    subtotal += subtotalItem
    
    return {
      orden_id: ordenB2B.id,
      producto_id: item.variante_id, // TODO: Necesitamos obtener el producto_id de la variante
      cantidad_solicitada: item.cantidad,
      piezas_pedidas: item.cantidad,
      precio_unitario: precioFinal,
      importe_total: subtotalItem,
    }
  })
  
  // Insertar items
  const { error: itemsB2BError } = await supabase
    .from('ordenes_b2b_detalles')
    .insert(itemsB2B)
  
  if (itemsB2BError) {
    throw new Error('Error creando items de orden B2B')
  }
  
  // 5. Actualizar totales de orden B2B
  const total = subtotal // + impuestos si aplica
  await supabase
    .from('ordenes_b2b')
    .update({
      subtotal,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ordenB2B.id)
  
  // 6. Actualizar cotización original
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

// ═══════════════════════════════════════════════════════════════
// CREAR COTIZACIÓN DESDE STORE
// ═══════════════════════════════════════════════════════════════

export async function crearCotizacion(
  items: QuoteItem[],
  datosContacto: DatosContacto,
  config: {
    tipo_orden_generada: string
    requiere_aprobacion: boolean
  }
) {
  const supabase = await createClient()
  
  // Generar número de orden único
  const timestamp = Date.now().toString(36).toUpperCase()
  const numeroOrden = `COT-${timestamp}`
  
  // Calcular totales (si hay precios)
  const subtotal = items.reduce((sum, item) => {
    const precio = item.precioUnitario || item.precioOfrecido || 0
    return sum + (item.cantidad * precio)
  }, 0)
  
  // Crear orden/cotización
  const { data: orden, error } = await supabase
    .from('ordenes_venta')
    .insert({
      numero_orden: numeroOrden,
      usuario_id: null, // Guest checkout
      email_cliente: datosContacto.email,
      nombre_cliente: datosContacto.nombre,
      telefono_cliente: datosContacto.telefono,
      direccion_envio: datosContacto.direccion ? {
        direccion: datosContacto.direccion,
        ciudad: datosContacto.ciudad,
        estado: datosContacto.estado,
      } : null,
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
    throw new Error(`Error creando cotización: ${error?.message}`)
  }
  
  // Crear items
  const ordenItems = items.map(item => ({
    orden_id: orden.id,
    variante_id: item.varianteId,
    cantidad: item.cantidad,
    precio_unitario: item.precioUnitario || item.precioOfrecido || 0,
    subtotal: (item.precioUnitario || item.precioOfrecido || 0) * item.cantidad,
    notas: item.unidad === 'caja' ? `Por caja de ${item.piezasPorCaja} pz` : null,
  }))
  
  const { error: itemsError } = await supabase
    .from('orden_items')
    .insert(ordenItems)
  
  if (itemsError) {
    throw new Error('Error creando items de cotización')
  }
  
  revalidatePath('/(admin)/ecommerce/ordenes-venta')
  
  return {
    success: true,
    ordenId: orden.id,
    numeroOrden: orden.numero_orden,
  }
}
