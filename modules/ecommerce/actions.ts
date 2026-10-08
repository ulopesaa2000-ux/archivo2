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

export async function actualizarConfigEcommerce(data: Partial<ConfigEcommerceUpdate> & Record<string, any>) {
  const supabase = await createClient()

  // Extraer únicamente las columnas válidas existentes en la base de datos (inv-tienda.config_ecommerce)
  const {
    modo_operacion,
    modo_visibilidad_catalogo,
    mostrar_precios,
    tipo_precio_visible,
    tipo_venta,
    minimo_unidades,
    multiplo_cajas,
    texto_boton_agregar,
    texto_boton_finalizar,
    titulo_seccion_carrito,
    mensaje_precio_variable,
    tipo_orden_generada,
    modo_vista_carrito,
    requiere_aprobacion,
    permitir_checkout_invitado,
    email_notificaciones,
    mostrar_stock,
    mostrar_sku,
    mostrar_medidas_tabla,
    mostrar_variantes_agotadas,
    campos_contacto_requeridos,
    notificar_whatsapp,
    numero_whatsapp,
    updated_by,
  } = data as any

  const updatePayload: Database['inv-tienda']['Tables']['config_ecommerce']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (modo_operacion !== undefined) updatePayload.modo_operacion = modo_operacion
  if (modo_visibilidad_catalogo !== undefined) updatePayload.modo_visibilidad_catalogo = modo_visibilidad_catalogo
  if (modo_vista_carrito !== undefined) updatePayload.modo_vista_carrito = modo_vista_carrito
  if (mostrar_precios !== undefined) updatePayload.mostrar_precios = mostrar_precios
  if (tipo_precio_visible !== undefined) updatePayload.tipo_precio_visible = tipo_precio_visible
  if (tipo_venta !== undefined) updatePayload.tipo_venta = tipo_venta
  if (minimo_unidades !== undefined) updatePayload.minimo_unidades = minimo_unidades
  if (multiplo_cajas !== undefined) updatePayload.multiplo_cajas = multiplo_cajas
  if (texto_boton_agregar !== undefined) updatePayload.texto_boton_agregar = texto_boton_agregar
  if (texto_boton_finalizar !== undefined) updatePayload.texto_boton_finalizar = texto_boton_finalizar
  if (titulo_seccion_carrito !== undefined) updatePayload.titulo_seccion_carrito = titulo_seccion_carrito
  if (mensaje_precio_variable !== undefined) updatePayload.mensaje_precio_variable = mensaje_precio_variable
  if (tipo_orden_generada !== undefined) updatePayload.tipo_orden_generada = tipo_orden_generada
  if (requiere_aprobacion !== undefined) updatePayload.requiere_aprobacion = requiere_aprobacion
  if (permitir_checkout_invitado !== undefined) updatePayload.permitir_checkout_invitado = permitir_checkout_invitado
  if (email_notificaciones !== undefined) updatePayload.email_notificaciones = email_notificaciones || null
  if (mostrar_stock !== undefined) updatePayload.mostrar_stock = mostrar_stock
  if (mostrar_sku !== undefined) updatePayload.mostrar_sku = mostrar_sku
  if (mostrar_medidas_tabla !== undefined) updatePayload.mostrar_medidas_tabla = mostrar_medidas_tabla
  if (mostrar_variantes_agotadas !== undefined) updatePayload.mostrar_variantes_agotadas = mostrar_variantes_agotadas
  if (campos_contacto_requeridos !== undefined) updatePayload.campos_contacto_requeridos = campos_contacto_requeridos
  if (notificar_whatsapp !== undefined) updatePayload.notificar_whatsapp = notificar_whatsapp
  if (numero_whatsapp !== undefined) updatePayload.numero_whatsapp = numero_whatsapp
  if (updated_by !== undefined) updatePayload.updated_by = updated_by

  const { error } = await supabase
    .from('config_ecommerce')
    .update(updatePayload)
    .eq('id', 1)

  if (error) {
    throw new Error(`Error actualizando config: ${error.message}`)
  }

  revalidateTag('ecommerce-config', 'max')
  revalidatePath('/(store)')
  revalidatePath('/inicio')
  revalidatePath('/')
  revalidatePath('/contactos')
  revalidatePath('/shop')
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
      .select('nombre, descripcion, sku_base, precio_ec')
      .eq('id', data.producto_id)
      .single()

    if (producto) {
      const baseText = producto.nombre || producto.descripcion || `producto-${data.producto_id}`
      slug = slugify(`${baseText}-${producto.sku_base}`)
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

  const precioPublicoFinal = data.precio_publico && Number(data.precio_publico) > 0 ? Number(data.precio_publico) : 1

  const insertPayload: Database['inv-tienda']['Tables']['productos_web']['Insert'] = {
    ...data,
    precio_publico: precioPublicoFinal,
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

  revalidatePath('/ecommerce/productos-web')
  revalidatePath('/shop')

  return { success: true, data: result }
}

export async function togglePublicarProductoWebAction(
  productoId: number,
  actualmentePublicado: boolean,
  productoWebId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    if (productoWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          activo: !actualmentePublicado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoWebId)

      if (error) return { success: false, error: error.message }
    } else {
      const { data: prod } = await (supabase as any)
        .from('productos')
        .select('nombre, descripcion, sku_base, precio_ec')
        .eq('id', productoId)
        .single()

      const precioPublico = prod?.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
      const baseText = prod?.nombre || prod?.descripcion || `producto-${productoId}`
      const baseSlug = slugify(`${baseText}-${prod?.sku_base || ''}`) || `producto-${productoId}`
      let slug = baseSlug

      const { data: existente } = await (supabase as any)
        .from('productos_web')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existente) {
        slug = `${baseSlug}-${Date.now()}`
      }

      const { error } = await (supabase as any)
        .from('productos_web')
        .insert({
          producto_id: productoId,
          slug,
          precio_publico: precioPublico,
          activo: true,
          en_oferta: false,
          destacado: false,
          nuevo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/ecommerce/productos-web')
    revalidatePath('/shop')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar publicación.' }
  }
}

export async function toggleDestacadoProductoWebAction(
  productoId: number,
  actualmenteDestacado: boolean,
  productoWebId: number | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const nuevoDestacado = !actualmenteDestacado

    // 1. Sincronizar en inv-tienda.productos
    await (supabase as any)
      .from('productos')
      .update({ destacado: nuevoDestacado })
      .eq('id', productoId)

    // 2. Sincronizar en inv-tienda.productos_web
    if (productoWebId) {
      const { error } = await (supabase as any)
        .from('productos_web')
        .update({
          destacado: nuevoDestacado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoWebId)

      if (error) return { success: false, error: error.message }
    } else {
      const { data: prod } = await (supabase as any)
        .from('productos')
        .select('nombre, descripcion, sku_base, precio_ec')
        .eq('id', productoId)
        .single()

      const precioPublico = prod?.precio_ec && Number(prod.precio_ec) > 0 ? Number(prod.precio_ec) : 1
      const baseText = prod?.nombre || prod?.descripcion || `producto-${productoId}`
      const baseSlug = slugify(`${baseText}-${prod?.sku_base || ''}`) || `producto-${productoId}`
      let slug = baseSlug

      const { data: existente } = await (supabase as any)
        .from('productos_web')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (existente) {
        slug = `${baseSlug}-${Date.now()}`
      }

      const { error } = await (supabase as any)
        .from('productos_web')
        .insert({
          producto_id: productoId,
          slug,
          precio_publico: precioPublico,
          activo: false,
          en_oferta: false,
          destacado: nuevoDestacado,
          nuevo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/ecommerce/productos-web')
    revalidatePath('/catalogo')
    revalidatePath('/(store)')
    revalidatePath('/shop')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error al cambiar destacado.' }
  }
}


/**
 * Accion Masiva: Publicar lote de productos seleccionados
 */
export async function publicarProductosMasivoAction(
  productoIds: number[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const supabase = await createClient()

    // 1. Obtener productos_web existentes para estos productoIds
    const { data: existentes } = await (supabase as any)
      .from('productos_web')
      .select('id, producto_id')
      .in('producto_id', productoIds)

    const existentesMap = (existentes || []).reduce((acc: Record<number, number>, row: any) => {
      acc[row.producto_id] = row.id
      return acc
    }, {})

    // 2. Para los que ya existen en productos_web, actualizar activo = true
    const idsActualizar = (existentes || []).map((row: any) => row.id)
    if (idsActualizar.length > 0) {
      await (supabase as any)
        .from('productos_web')
        .update({ activo: true, updated_at: new Date().toISOString() })
        .in('id', idsActualizar)
    }

    // 3. Para los que no existen, obtener sus nombres/skus/precio_ec e insertar
    const idsInsertar = productoIds.filter((pid) => !existentesMap[pid])
    if (idsInsertar.length > 0) {
      const { data: prods } = await (supabase as any)
        .from('productos')
        .select('id, nombre, descripcion, sku_base, precio_ec')
        .in('id', idsInsertar)

      const inserts = (prods || []).map((p: any) => {
        const precioPublico = p.precio_ec && Number(p.precio_ec) > 0 ? Number(p.precio_ec) : 1
        const baseText = p.nombre || p.descripcion || `producto-${p.id}`
        const baseSlug = slugify(`${baseText}-${p.sku_base}`) || `producto-${p.id}`
        const slug = `${baseSlug}-${Date.now().toString(36).substring(4)}`

        return {
          producto_id: p.id,
          slug,
          precio_publico: precioPublico,
          activo: true,
          en_oferta: false,
          destacado: false,
          nuevo: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })

      if (inserts.length > 0) {
        await (supabase as any).from('productos_web').insert(inserts)
      }
    }

    revalidatePath('/ecommerce/productos-web')
    revalidatePath('/shop')
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    console.error('Excepción publicarProductosMasivoAction:', err)
    return { success: false, count: 0, error: err?.message || 'Error en publicación masiva.' }
  }
}

/**
 * Accion Masiva: Despublicar / Pausar lote de productos seleccionados
 */
export async function despublicarProductosMasivoAction(
  productoIds: number[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const supabase = await createClient()

    // Actualizar activo = false en productos_web donde producto_id esté en el lote
    const { error } = await (supabase as any)
      .from('productos_web')
      .update({ activo: false, updated_at: new Date().toISOString() })
      .in('producto_id', productoIds)

    if (error) {
      return { success: false, count: 0, error: error.message }
    }

    revalidatePath('/ecommerce/productos-web')
    revalidatePath('/shop')
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Error al despublicar masivo.' }
  }
}

/**
 * Accion Masiva: Actualizar precios en lote para productos seleccionados
 */
export async function actualizarPreciosMasivoAction(
  productoIds: number[],
  precioPublico: number,
  precioOferta?: number | null,
  enOferta?: boolean
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!productoIds || productoIds.length === 0) {
      return { success: false, count: 0, error: 'No hay productos seleccionados.' }
    }

    const supabase = await createClient()

    // 1. Obtener productos_web existentes
    const { data: existentes } = await (supabase as any)
      .from('productos_web')
      .select('id, producto_id')
      .in('producto_id', productoIds)

    const existentesMap = (existentes || []).reduce((acc: Record<number, number>, row: any) => {
      acc[row.producto_id] = row.id
      return acc
    }, {})

    // 2. Para los que ya existen, actualizar precio_publico, precio_oferta, en_oferta
    const idsActualizar = (existentes || []).map((row: any) => row.id)
    if (idsActualizar.length > 0) {
      await (supabase as any)
        .from('productos_web')
        .update({
          precio_publico: precioPublico,
          precio_oferta: precioOferta ?? null,
          en_oferta: enOferta ?? false,
          updated_at: new Date().toISOString(),
        })
        .in('id', idsActualizar)
    }

    // 3. Para los que no existen, crear registro con precios fijados
    const idsInsertar = productoIds.filter((pid) => !existentesMap[pid])
    if (idsInsertar.length > 0) {
      const { data: prods } = await (supabase as any)
        .from('productos')
        .select('id, nombre, sku_base')
        .in('id', idsInsertar)

      const inserts = (prods || []).map((p: any) => ({
        producto_id: p.id,
        slug: slugify(`${p.nombre}-${p.sku_base}-${Date.now().toString(36).substring(4)}`),
        precio_publico: precioPublico,
        precio_oferta: precioOferta ?? null,
        en_oferta: enOferta ?? false,
        activo: false, // Se guarda precio pero queda borrador hasta que se publique
        destacado: false,
        nuevo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      if (inserts.length > 0) {
        await (supabase as any).from('productos_web').insert(inserts)
      }
    }

    revalidatePath('/ecommerce/productos-web')
    revalidatePath('/shop')
    return { success: true, count: productoIds.length }
  } catch (err: any) {
    console.error('Excepción actualizarPreciosMasivoAction:', err)
    return { success: false, count: 0, error: err?.message || 'Error al actualizar precios masivos.' }
  }
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

async function verificarPermisoOrdenes(
  accion: 'puede_editar' | 'puede_eliminar' = 'puede_editar'
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { getCurrentUser } = await import('@/modules/auth/queries')
  const { can } = await import('@/lib/auth/permissions')
  const currentUser = await getCurrentUser().catch(() => null)
  if (!currentUser || !can(currentUser, 'ecommerce_ordenes', accion)) {
    return { ok: false, error: 'Sin permiso para administrar órdenes de venta.' }
  }
  return { ok: true }
}

export async function actualizarEstadoOrden(
  id: number,
  nuevoEstado: string,
  notas?: string
) {
  // Cancelar = borrado lógico: exige puede_eliminar; el resto, puede_editar
  const permiso = await verificarPermisoOrdenes(nuevoEstado === 'cancelado' ? 'puede_eliminar' : 'puede_editar')
  if (!permiso.ok) return { success: false as const, error: permiso.error }

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
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) return { success: false as const, error: permiso.error }

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

// EDICIÓN DE PARTIDAS (editor de cotización en /ecommerce/ordenes-venta/[id])

async function recalcularTotalesOrden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ordenId: number
): Promise<{ success: boolean; error?: string }> {
  const { data: items, error: itemsError } = await supabase
    .from('orden_items')
    .select('subtotal')
    .eq('orden_id', ordenId)

  if (itemsError) {
    return { success: false, error: `Error recalculando: ${itemsError.message}` }
  }

  const subtotal = (items ?? []).reduce((sum: number, i: any) => sum + Number(i.subtotal || 0), 0)

  const { data: orden, error: ordenError } = await supabase
    .from('ordenes_venta')
    .select('envio, impuestos')
    .eq('id', ordenId)
    .single()

  if (ordenError || !orden) {
    return { success: false, error: 'Orden no encontrada al recalcular.' }
  }

  const total = subtotal + Number((orden as any).envio || 0) + Number((orden as any).impuestos || 0)

  const { error: updateError } = await supabase
    .from('ordenes_venta')
    .update({
      subtotal,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ordenId)

  if (updateError) {
    return { success: false, error: `Error guardando totales: ${updateError.message}` }
  }

  return { success: true }
}

export async function actualizarItemOrden(
  ordenId: number,
  itemId: number,
  cantidad: number,
  precioUnitario: number,
  pzPorCaja?: number | null
): Promise<{ success: boolean; error?: string }> {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) return { success: false, error: permiso.error }

  const cant = Math.floor(Number(cantidad))
  const precio = Number(precioUnitario)
  const factor = pzPorCaja === null || pzPorCaja === undefined ? null : Math.floor(Number(pzPorCaja))
  if (!Number.isInteger(ordenId) || !Number.isInteger(itemId)) {
    return { success: false, error: 'Orden o partida inválida.' }
  }
  if (!Number.isInteger(cant) || cant < 1) {
    return { success: false, error: 'La cantidad (pz) debe ser un entero mayor a 0.' }
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { success: false, error: 'El precio debe ser un número mayor o igual a 0.' }
  }
  if (factor !== null && (!Number.isInteger(factor) || factor < 1)) {
    return { success: false, error: 'El pz por caja debe ser un entero mayor a 0.' }
  }

  const supabase = await createClient()

  const { data: item, error: itemError } = await supabase
    .from('orden_items')
    .select('id')
    .eq('id', itemId)
    .eq('orden_id', ordenId)
    .maybeSingle()

  if (itemError || !item) {
    return { success: false, error: 'La partida no pertenece a esta orden.' }
  }

  const { error } = await supabase
    .from('orden_items')
    .update({
      cantidad: cant,
      precio_unitario: precio,
      subtotal: cant * precio,
      pz_por_caja: factor,
    })
    .eq('id', itemId)

  if (error) {
    return { success: false, error: `Error guardando partida: ${error.message}` }
  }

  const recalc = await recalcularTotalesOrden(supabase, ordenId)
  if (!recalc.success) return recalc

  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${ordenId}`)
  revalidatePath('/mis-pedidos')
  return { success: true }
}

export async function eliminarItemOrden(
  ordenId: number,
  itemId: number
): Promise<{ success: boolean; error?: string }> {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) return { success: false, error: permiso.error }

  const supabase = await createClient()

  const { error } = await supabase
    .from('orden_items')
    .delete()
    .eq('id', itemId)
    .eq('orden_id', ordenId)

  if (error) {
    return { success: false, error: `Error eliminando partida: ${error.message}` }
  }

  const recalc = await recalcularTotalesOrden(supabase, ordenId)
  if (!recalc.success) return recalc

  revalidatePath(`/(admin)/ecommerce/ordenes-venta/${ordenId}`)
  revalidatePath('/mis-pedidos')
  return { success: true }
}

// COTIZACION -> ORDEN B2B

export async function convertirCotizacionAOrdenB2B(
  cotizacionId: number,
  preciosFinales?: Record<number, number>
) {
  const permiso = await verificarPermisoOrdenes()
  if (!permiso.ok) throw new Error(permiso.error)

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

  const esEntero = (v: unknown): v is number => Number.isInteger(v)
  const variantIds = (items ?? []).map((item) => item.variante_id).filter(esEntero)
  const webIds = (items ?? []).map((item) => (item as any).producto_web_id).filter(esEntero)

  const { data: variantes, error: variantesError } = variantIds.length > 0
    ? await supabase
        .from('variantes_producto')
        .select('id, producto_id')
        .in('id', variantIds)
    : { data: [], error: null }

  if (variantesError) {
    throw new Error('Error obteniendo variantes para conversion B2B')
  }

  const productoIdByVariante = new Map(
    (variantes ?? []).map((variante) => [variante.id, variante.producto_id])
  )

  // Items sin variante real (referencia web): resolver producto vía publicación
  const productoIdByWeb = new Map<number, number>()
  if (webIds.length > 0) {
    const { data: webs } = await (supabase.from('productos_web') as any)
      .select('id, producto_id')
      .in('id', [...new Set(webIds)])
    for (const w of (webs ?? []) as any[]) {
      productoIdByWeb.set(w.id, w.producto_id)
    }
  }

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
    const precioFinal = (item.variante_id != null ? preciosFinales?.[item.variante_id] : undefined) || item.precio_unitario
    const subtotalItem = item.cantidad * precioFinal
    const productoId =
      (item.variante_id != null ? productoIdByVariante.get(item.variante_id) : undefined) ??
      ((item as any).producto_web_id != null ? productoIdByWeb.get((item as any).producto_web_id) : undefined)

    if (!productoId) {
      throw new Error(`No se encontro producto para la partida ${item.id}`)
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

  // Vincular al usuario en sesión (cliente con cuenta); invitados quedan NULL
  const { getCurrentUser } = await import('@/modules/auth/queries')
  const currentUser = await getCurrentUser().catch(() => null)

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
      usuario_id: currentUser?.id ?? null,
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

  // El carrito mezcla variantes reales e ids web: resolver a variante real
  // conservando la referencia web verdadera + factor inicial para modo cajas.
  const { resolverItemsCotizacion } = await import('@/lib/utils/cotizacion-resolver')
  const idsCarrito = [...new Set(items.map((i) => i.varianteId))]

  const { data: variantesRealesData } = await supabase
    .from('variantes_producto')
    .select('id, producto_id')
    .in('id', idsCarrito)
  const variantesReales = new Map((variantesRealesData ?? []).map((v: any) => [v.id, v.producto_id]))

  const idsWeb = idsCarrito.filter((id) => !variantesReales.has(id))
  const webs = new Map<number, { producto_id: number; pz_en_caja: number | null }>()
  if (idsWeb.length > 0) {
    const { data: websData } = await (supabase.from('productos_web') as any)
      .select('id, producto_id, productos!inner(pz_en_caja)')
      .in('id', idsWeb)
    for (const w of (websData ?? []) as any[]) {
      const pz = Number.isInteger(w.productos?.pz_en_caja) && w.productos.pz_en_caja > 0 ? w.productos.pz_en_caja : null
      webs.set(w.id, { producto_id: w.producto_id, pz_en_caja: pz })
    }
  }

  let resueltos
  try {
    resueltos = resolverItemsCotizacion(items, variantesReales, webs)
  } catch (err) {
    await supabase.from('ordenes_venta').delete().eq('id', orden.id)
    throw err instanceof Error ? err : new Error('Error resolviendo productos de la cotización')
  }

  const ordenItems: Database['inv-tienda']['Tables']['orden_items']['Insert'][] = items.map((item, index) => ({
    orden_id: orden.id,
    variante_id: resueltos[index].varianteId,
    producto_web_id: resueltos[index].productoWebId,
    cantidad: item.cantidad,
    precio_unitario: item.precioUnitario || item.precioOfrecido || 0,
    subtotal: (item.precioUnitario || item.precioOfrecido || 0) * item.cantidad,
    pz_por_caja: resueltos[index].pzPorCaja,
  }))

  const { error: itemsInsertError } = await supabase
    .from('orden_items')
    .insert(ordenItems)

  if (itemsInsertError) {
    // Rollback compensatorio: no dejar órdenes huérfanas sin partidas
    await supabase.from('ordenes_venta').delete().eq('id', orden.id)
    throw new Error(`Error creando items de cotizacion: ${itemsInsertError.message}`)
  }

  revalidatePath('/(admin)/ecommerce/ordenes-venta')

  return {
    success: true,
    ordenId: orden.id,
    numeroOrden: orden.numero_orden,
  }
}
