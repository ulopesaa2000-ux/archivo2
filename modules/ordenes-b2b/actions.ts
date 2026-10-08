// modules/ordenes-b2b/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { B2B_CHAT_ATTACHMENTS_BUCKET } from '@/lib/constants'
import { getCommercialScope } from '@/lib/dal'
import {
  canAccessCommercialOrder,
} from '@/lib/auth/commercial-scope'
import type {
  OrdenB2BUpdate,
  OrdenDetalleEventoTipo,
  UsuarioConRol,
} from '@/lib/types/tables'
import { can, type PermissionAction } from '@/lib/auth/permissions'

export type ActionResult = {
  success: boolean
  error?: string
  id?: number
}

async function requireB2BPermission(action: PermissionAction): Promise<ActionResult | null> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  if (!can(user, 'b2b_ordenes', action)) {
    return { success: false, error: 'No tienes permisos para esta accion de B2B.' }
  }
  return null
}

async function validateCommercialTargets(
  payload: { cliente_b2b_id?: number | null; proveedor_id?: number | null }
): Promise<ActionResult | null> {
  const scope = await getCommercialScope()
  if (scope.is_super_admin) return null

  if (!canAccessCommercialOrder(scope, payload)) {
    return { success: false, error: 'La orden no pertenece al alcance comercial asignado a este usuario.' }
  }

  return null
}

async function fetchOrderForAccess(supabase: any, ordenId: number) {
  const { data, error } = await supabase
    .from('ordenes_b2b')
    .select('id, cliente_b2b_id, proveedor_id')
    .eq('id', ordenId)
    .single()

  if (error || !data) return null
  return data
}

async function requireCommercialOrderAccess(
  supabase: any,
  ordenId: number
): Promise<{ user: UsuarioConRol } | ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const orden = await fetchOrderForAccess(supabase, ordenId)
  if (!orden) return { success: false, error: 'No se encontró la orden.' }

  const denied = await validateCommercialTargets(orden)
  if (denied) return denied

  return { user }
}

async function requireCommercialDetalleAccess(
  supabase: any,
  detalleId: number
): Promise<{ user: UsuarioConRol; ordenId: number } | ActionResult> {
  const { data: detalle, error } = await supabase
    .from('ordenes_b2b_detalles')
    .select('id, orden_id')
    .eq('id', detalleId)
    .single()

  if (error || !detalle?.orden_id) {
    return { success: false, error: 'No se encontró el detalle de la orden.' }
  }

  const access = await requireCommercialOrderAccess(supabase, detalle.orden_id)
  if ('success' in access) return access

  return { ...access, ordenId: detalle.orden_id }
}

async function uploadDetalleChatAttachment(
  supabase: any,
  detalleId: number,
  file: File
): Promise<string> {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`
  const storagePath = `orden-detalle-${detalleId}/${safeName}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from(B2B_CHAT_ATTACHMENTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = supabase.storage
    .from(B2B_CHAT_ATTACHMENTS_BUCKET)
    .getPublicUrl(storagePath)

  return data.publicUrl
}

async function registrarEventoDetalle(
  supabase: any,
  input: {
    orden_detalle_id: number
    usuario_id: number
    tipo_evento: OrdenDetalleEventoTipo
    comentario_id?: number | null
    payload?: Record<string, unknown> | null
  }
) {
  const { error } = await (supabase.from('orden_detalle_eventos') as any)
    .insert({
      orden_detalle_id: input.orden_detalle_id,
      usuario_id: input.usuario_id,
      tipo_evento: input.tipo_evento,
      comentario_id: input.comentario_id ?? null,
      payload: input.payload ?? null,
    })

  if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
    throw new Error(error.message)
  }
}

// ════════════════════════════════════════════════════════════
// CRUD ORDEN B2B
// ════════════════════════════════════════════════════════════

export async function crearOrdenB2BAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_crear')
  if (denied) return denied

  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  const proveedor_id = parseInt(formData.get('proveedor_id') as string)
  if (!proveedor_id) return { success: false, error: 'Proveedor obligatorio.' }

  const cliente_b2b_id = parseInt(formData.get('cliente_b2b_id') as string) || null
  const deniedByScope = await validateCommercialTargets({
    proveedor_id,
    cliente_b2b_id,
  })
  if (deniedByScope) return deniedByScope

  const { data, error } = await supabase
    .from('ordenes_b2b')
    .insert({
      proveedor_id,
      cliente_b2b_id,
      contenedor_id: parseInt(formData.get('contenedor_id') as string) || null,
      folio_proveedor: (formData.get('folio_proveedor') as string)?.trim() || null,
      moneda: (formData.get('moneda') as string) || 'USD',
      tipo_cambio: parseFloat(formData.get('tipo_cambio') as string) || null,
      observaciones: (formData.get('observaciones') as string)?.trim() || null,
      fecha_orden: (formData.get('fecha_orden') as string)?.trim() || null,
      estado: 'Borrador',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/ordenes-b2b')
  return { success: true, id: data.id }
}

export async function actualizarOrdenB2BAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }
  const id = parseInt(formData.get('orden_id') as string)
  if (!id) return { success: false, error: 'ID requerido.' }

  // Solo tocar contenedor_id si viene explícitamente en el formulario
  const contenedorIdRaw = formData.get('contenedor_id')
  const payload: OrdenB2BUpdate = {
    proveedor_id: parseInt(formData.get('proveedor_id') as string) || null,
    cliente_b2b_id: parseInt(formData.get('cliente_b2b_id') as string) || null,
    folio_proveedor: (formData.get('folio_proveedor') as string)?.trim() || null,
    moneda: (formData.get('moneda') as string) || 'USD',
    tipo_cambio: parseFloat(formData.get('tipo_cambio') as string) || null,
    observaciones: (formData.get('observaciones') as string)?.trim() || null,
    fecha_orden: (formData.get('fecha_orden') as string)?.trim() || null,
  }

  if (contenedorIdRaw !== null && contenedorIdRaw !== undefined && (contenedorIdRaw as string) !== '') {
    payload.contenedor_id = parseInt(contenedorIdRaw as string) || null
  }

  const deniedByScope = await validateCommercialTargets({
    proveedor_id: payload.proveedor_id ?? null,
    cliente_b2b_id: payload.cliente_b2b_id ?? null,
  })
  if (deniedByScope) return deniedByScope

  const { error } = await supabase
    .from('ordenes_b2b')
    .update(payload)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ordenes-b2b')
  revalidatePath(`/ordenes-b2b/${id}`)
  revalidatePath('/contenedores')
  return { success: true }
}

export async function cambiarEstadoOrdenAction(
  ordenId: number,
  nuevoEstado: string
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, ordenId)
  if ('success' in access) return access

  const { error } = await supabase
    .from('ordenes_b2b')
    .update({ estado: nuevoEstado })
    .eq('id', ordenId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ordenes-b2b')
  revalidatePath(`/ordenes-b2b/${ordenId}`)
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CRUD DETALLES (PRODUCTOS DE LA ORDEN)
// ════════════════════════════════════════════════════════════

export async function agregarDetalleOrdenAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_crear')
  if (denied) return denied

  const supabase = await createClient()
  const orden_id = parseInt(formData.get('orden_id') as string)
  const producto_id = parseInt(formData.get('producto_id') as string)

  if (!orden_id || !producto_id) {
    return { success: false, error: 'Orden y producto requeridos.' }
  }

  const access = await requireCommercialOrderAccess(supabase, orden_id)
  if ('success' in access) return access

  const { error } = await supabase
    .from('ordenes_b2b_detalles')
    .insert({
      orden_id,
      producto_id,
      cantidad_solicitada: parseInt(formData.get('cantidad_solicitada') as string) || 0,
      cantidad_aprobada: parseInt(formData.get('cantidad_aprobada') as string) || null,
      precio_unitario: parseFloat(formData.get('precio_unitario') as string) || null,
      precio_yuan: parseFloat(formData.get('precio_yuan') as string) || null,
      precio_acordado: parseFloat(formData.get('precio_acordado') as string) || null,
      importe_total: parseFloat(formData.get('importe_total') as string) || null,
      piezas_pedidas: parseInt(formData.get('piezas_pedidas') as string) || 0,
      cajas_pedidas: parseFloat(formData.get('cajas_pedidas') as string) || 0,
      cbm_detalle: parseFloat(formData.get('cbm_detalle') as string) || null,
      peso_bruto_kg: parseFloat(formData.get('peso_bruto_kg') as string) || null,
      estado_producto: 'Pendiente',
    })

  if (error) return { success: false, error: error.message }

  // Recalcular totales
  await recalcularTotalesOrden(orden_id)

  revalidatePath(`/ordenes-b2b/${orden_id}`)
  return { success: true }
}

export async function eliminarDetalleOrdenAction(
  detalleId: number,
  ordenId: number
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_eliminar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, ordenId)
  if ('success' in access) return access
  const { error } = await supabase
    .from('ordenes_b2b_detalles')
    .delete()
    .eq('id', detalleId)

  if (error) return { success: false, error: error.message }

  await recalcularTotalesOrden(ordenId)
  revalidatePath(`/ordenes-b2b/${ordenId}`)
  return { success: true }
}

export async function actualizarDetalleOrdenAction(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const id = parseInt(formData.get('detalle_id') as string)
  if (!id) return { success: false, error: 'ID de detalle requerido.' }

  const orden_id = parseInt(formData.get('orden_id') as string)
  if (!orden_id) return { success: false, error: 'ID de orden requerido.' }

  const access = await requireCommercialOrderAccess(supabase, orden_id)
  if ('success' in access) return access

  const { error } = await supabase
    .from('ordenes_b2b_detalles')
    .update({
      cantidad_solicitada: parseInt(formData.get('cantidad_solicitada') as string) || 0,
      piezas_pedidas: parseInt(formData.get('piezas_pedidas') as string) || 0,
      cajas_pedidas: parseFloat(formData.get('cajas_pedidas') as string) || 0,
      precio_unitario: parseFloat(formData.get('precio_unitario') as string) || null,
      precio_yuan: parseFloat(formData.get('precio_yuan') as string) || null,
      cbm_detalle: parseFloat(formData.get('cbm_detalle') as string) || null,
      peso_bruto_kg: parseFloat(formData.get('peso_bruto_kg') as string) || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  await recalcularTotalesOrden(orden_id)
  revalidatePath(`/ordenes-b2b/${orden_id}`)
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CAMBIAR SKU DE LÍNEA + REASIGNACIÓN OPCIONAL DE CAJAS
// ════════════════════════════════════════════════════════════

export type CambiarProductoLineaPayload = {
  detalleId: number
  nuevoProductoId: number
  piezas_pedidas?: number | null
  cajas_pedidas?: number | null
  precio_unitario?: number | null
  precio_yuan?: number | null
  cbm_detalle?: number | null
  peso_bruto_kg?: number | null
  incluirCajas?: boolean
  /** ids de cajas_producto a reasignar (solo las marcadas en el preview) */
  cajaIds?: number[]
}

export type CambiarProductoLineaResult = ActionResult & {
  cajasActualizadas?: number
  cajasBloqueadas?: number
  contenedorId?: number | null
}

/**
 * Cambia el producto (SKU) de una línea de orden B2B.
 * - Bloquea duplicados: no permite dos líneas con el mismo producto en la orden.
 * - Opcionalmente reasigna el producto_id de las cajas vinculadas marcadas.
 * - Las cajas divergentes compartidas con otra orden se bloquean (no se tocan).
 * - No mueve stock: si la mercancía ya fue surtida a bodega virtual, el stock
 *   debe corregirse con nota de AJUSTE (AJU) en inventario, no aquí.
 */
export async function actualizarProductoLineaConCajasAction(
  payload: CambiarProductoLineaPayload,
): Promise<CambiarProductoLineaResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const { detalleId, nuevoProductoId } = payload
  if (!detalleId || !nuevoProductoId) {
    return { success: false, error: 'Detalle y producto nuevo requeridos.' }
  }

  const supabase = await createClient()
  const access = await requireCommercialDetalleAccess(supabase, detalleId)
  if ('success' in access) return access
  const ordenId = access.ordenId

  // 1. Detalle actual
  const { data: actual, error: actualError } = await supabase
    .from('ordenes_b2b_detalles')
    .select('id, orden_id, producto_id, piezas_pedidas, cajas_pedidas, precio_unitario, precio_yuan, cbm_detalle, peso_bruto_kg')
    .eq('id', detalleId)
    .single()

  if (actualError || !actual) {
    return { success: false, error: 'No se encontró la línea de producto.' }
  }

  // 2. Producto destino existe
  const { data: nuevoProd } = await supabase
    .from('productos')
    .select('id, sku_base')
    .eq('id', nuevoProductoId)
    .single()

  if (!nuevoProd) {
    return { success: false, error: 'El producto nuevo no existe.' }
  }

  // 3. Bloquear duplicados en la misma orden
  if (nuevoProductoId !== actual.producto_id) {
    const { data: duplicado } = await supabase
      .from('ordenes_b2b_detalles')
      .select('id')
      .eq('orden_id', ordenId)
      .eq('producto_id', nuevoProductoId)
      .neq('id', detalleId)
      .limit(1)

    if (duplicado && duplicado.length > 0) {
      return {
        success: false,
        error: 'Ya existe otra línea con ese SKU en esta orden. Edita esa línea en vez de duplicar.',
      }
    }
  }

  // 4. Resolver campos (los no enviados conservan su valor actual)
  const piezas = payload.piezas_pedidas !== undefined
    ? payload.piezas_pedidas
    : (actual.piezas_pedidas as number | null)
  const cajas = payload.cajas_pedidas !== undefined
    ? payload.cajas_pedidas
    : (actual.cajas_pedidas as number | null)
  const precioUnit = payload.precio_unitario !== undefined
    ? payload.precio_unitario
    : (actual.precio_unitario as number | null)

  const importeTotal = piezas != null && precioUnit != null
    ? Number((Number(piezas) * Number(precioUnit)).toFixed(2))
    : null

  const { error: updError } = await supabase
    .from('ordenes_b2b_detalles')
    .update({
      producto_id: nuevoProductoId,
      piezas_pedidas: piezas ?? 0,
      cajas_pedidas: cajas ?? 0,
      precio_unitario: payload.precio_unitario !== undefined ? payload.precio_unitario : actual.precio_unitario,
      precio_yuan: payload.precio_yuan !== undefined ? payload.precio_yuan : actual.precio_yuan,
      cbm_detalle: payload.cbm_detalle !== undefined ? payload.cbm_detalle : actual.cbm_detalle,
      peso_bruto_kg: payload.peso_bruto_kg !== undefined ? payload.peso_bruto_kg : actual.peso_bruto_kg,
      importe_total: importeTotal,
    })
    .eq('id', detalleId)

  if (updError) return { success: false, error: updError.message }

  // 5. Reasignación opcional de cajas
  let cajasActualizadas = 0
  let cajasBloqueadas = 0

  if (payload.incluirCajas && payload.cajaIds && payload.cajaIds.length > 0) {
    const user = await getCurrentUser()
    if (!user || !can(user, 'b2b_cajas', 'puede_editar')) {
      return { success: false, error: 'No tienes permiso para reasignar cajas (b2b_cajas / puede_editar).' }
    }

    // Solo cajas vinculadas a ESTA orden
    const { data: vinculos } = await supabase
      .from('orden_cajas')
      .select('caja_id')
      .eq('orden_id', ordenId)
      .in('caja_id', payload.cajaIds)

    const vinculadas = new Set((vinculos ?? []).map((v: any) => v.caja_id))
    const candidatas = payload.cajaIds.filter((id) => vinculadas.has(id))
    if (candidatas.length === 0) {
      return { success: false, error: 'Ninguna de las cajas marcadas pertenece a esta orden.' }
    }

    // Detectar compartidas con otras órdenes → bloquear
    const { data: usos } = await supabase
      .from('orden_cajas')
      .select('caja_id, orden_id')
      .in('caja_id', candidatas)

    const ordenesPorCaja = new Map<number, Set<number>>()
    for (const u of (usos ?? []) as any[]) {
      if (!ordenesPorCaja.has(u.caja_id)) ordenesPorCaja.set(u.caja_id, new Set())
      ordenesPorCaja.get(u.caja_id)!.add(u.orden_id)
    }

    const permitidas: number[] = []
    for (const cid of candidatas) {
      const ordenes = ordenesPorCaja.get(cid) ?? new Set<number>()
      const otras = Array.from(ordenes).filter((oid) => oid !== ordenId).length
      if (otras > 0) {
        cajasBloqueadas += 1
      } else {
        permitidas.push(cid)
      }
    }

    if (permitidas.length > 0) {
      // Comparar por SKU (no por id): puede haber filas de producto
      // duplicadas con el mismo sku_base y no hay nada que cambiar.
      const nuevoSkuNorm = String((nuevoProd as any).sku_base ?? '').trim().toUpperCase()
      const { data: cajasActuales } = await supabase
        .from('cajas_producto')
        .select('id, producto_id, producto:productos!cajas_producto_producto_id_fkey ( sku_base )')
        .in('id', permitidas)

      const porCambiar = (cajasActuales ?? [])
        .filter((c: any) => {
          const prod = Array.isArray(c.producto) ? c.producto[0] : c.producto
          return String(prod?.sku_base ?? '').trim().toUpperCase() !== nuevoSkuNorm
        })
        .map((c: any) => c.id)

      if (porCambiar.length > 0) {
        const { error: cajasError } = await supabase
          .from('cajas_producto')
          .update({ producto_id: nuevoProductoId })
          .in('id', porCambiar)

        if (cajasError) return { success: false, error: `Línea actualizada, pero falló reasignar cajas: ${cajasError.message}` }
        cajasActualizadas = porCambiar.length
      }
    }
  }

  await recalcularTotalesOrden(ordenId)

  // Contenedor vinculado (para revalidar packing/surtido)
  const { data: ordenRow } = await supabase
    .from('ordenes_b2b')
    .select('contenedor_id')
    .eq('id', ordenId)
    .single()

  revalidatePath(`/ordenes-b2b/${ordenId}`)
  revalidatePath('/ordenes-b2b')
  revalidatePath('/contenedores')
  if (ordenRow?.contenedor_id) {
    revalidatePath(`/contenedores/${ordenRow.contenedor_id}`)
  }

  return {
    success: true,
    cajasActualizadas,
    cajasBloqueadas,
    contenedorId: ordenRow?.contenedor_id ?? null,
  }
}

export async function crearComentarioDetalleOrdenAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_leer')
  if (denied) return denied

  const supabase = await createClient()
  const detalleId = parseInt(formData.get('detalle_id') as string)
  const mensaje = (formData.get('mensaje') as string | null)?.trim() ?? ''

  if (!detalleId || !mensaje) {
    return { success: false, error: 'Detalle y mensaje son obligatorios.' }
  }

  const access = await requireCommercialDetalleAccess(supabase, detalleId)
  if ('success' in access) return access

  let archivoAdjuntoUrl: string | null = null
  const archivo = formData.get('adjunto')
  if (archivo instanceof File && archivo.size > 0) {
    try {
      archivoAdjuntoUrl = await uploadDetalleChatAttachment(supabase, detalleId, archivo)
    } catch (error) {
      return { success: false, error: `No se pudo subir el adjunto: ${(error as Error).message}` }
    }
  }

  const { data, error } = await (((supabase as any).from('orden_detalles_comentarios')) as any)
    .insert({
      orden_detalle_id: detalleId,
      usuario_id: access.user.id,
      mensaje,
      archivo_adjunto_url: archivoAdjuntoUrl,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return { success: false, error: 'La tabla de comentarios B2B aun no existe en Supabase. Falta aprobar y crear la estructura aditiva.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath(`/ordenes-b2b/${access.ordenId}`)
  return { success: true, id: data?.id }
}

export async function registrarEventoDetalleOrdenAction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const detalleId = parseInt(formData.get('detalle_id') as string)
  const tipoEvento = (formData.get('tipo_evento') as OrdenDetalleEventoTipo | null) ?? null
  const comentarioId = parseInt(formData.get('comentario_id') as string) || null

  if (!detalleId || !tipoEvento) {
    return { success: false, error: 'Detalle y tipo de evento son obligatorios.' }
  }

  const access = await requireCommercialDetalleAccess(supabase, detalleId)
  if ('success' in access) return access

  const payload: Record<string, unknown> = {}
  let updatePayload: Record<string, unknown> | null = null

  if (tipoEvento === 'cambio_estado') {
    const nuevoEstado = (formData.get('estado_producto') as string | null)?.trim() ?? ''
    if (!nuevoEstado) return { success: false, error: 'Selecciona el nuevo estado del producto.' }

    const { data: detalleActual } = await supabase
      .from('ordenes_b2b_detalles')
      .select('estado_producto')
      .eq('id', detalleId)
      .single()

    payload.estado_anterior = detalleActual?.estado_producto ?? null
    payload.estado_nuevo = nuevoEstado
    updatePayload = { estado_producto: nuevoEstado }
  }

  if (tipoEvento === 'cambio_precio') {
    const precio_unitario = formData.get('precio_unitario')
    const precio_yuan = formData.get('precio_yuan')
    const precio_acordado = formData.get('precio_acordado')

    const { data: detalleActual } = await supabase
      .from('ordenes_b2b_detalles')
      .select('precio_unitario, precio_yuan, precio_acordado')
      .eq('id', detalleId)
      .single()

    const nextPayload = {
      precio_unitario: precio_unitario ? parseFloat(precio_unitario as string) || null : detalleActual?.precio_unitario ?? null,
      precio_yuan: precio_yuan ? parseFloat(precio_yuan as string) || null : detalleActual?.precio_yuan ?? null,
      precio_acordado: precio_acordado ? parseFloat(precio_acordado as string) || null : detalleActual?.precio_acordado ?? null,
    }

    payload.anterior = {
      precio_unitario: detalleActual?.precio_unitario ?? null,
      precio_yuan: detalleActual?.precio_yuan ?? null,
      precio_acordado: detalleActual?.precio_acordado ?? null,
    }
    payload.nuevo = nextPayload
    updatePayload = nextPayload
  }

  if (updatePayload) {
    const { error: updateError } = await supabase
      .from('ordenes_b2b_detalles')
      .update(updatePayload as any)
      .eq('id', detalleId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  try {
    await registrarEventoDetalle(supabase, {
      orden_detalle_id: detalleId,
      usuario_id: access.user.id,
      tipo_evento: tipoEvento,
      comentario_id: comentarioId,
      payload,
    })
  } catch (error) {
    return { success: false, error: `No se pudo registrar el evento formal: ${(error as Error).message}` }
  }

  await recalcularTotalesOrden(access.ordenId)
  revalidatePath(`/ordenes-b2b/${access.ordenId}`)
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// VINCULAR/DESVINCULAR CAJAS
// ════════════════════════════════════════════════════════════

export async function vincularCajaOrdenAction(
  ordenId: number,
  cajaId: number,
  cantidadCajas: number
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, ordenId)
  if ('success' in access) return access

  const { error } = await supabase
    .from('orden_cajas')
    .upsert(
      { orden_id: ordenId, caja_id: cajaId, cantidad_cajas: cantidadCajas },
      { onConflict: 'orden_id,caja_id', ignoreDuplicates: false }
    )

  if (error) return { success: false, error: error.message }

  await recalcularTotalesOrden(ordenId)
  revalidatePath(`/ordenes-b2b/${ordenId}`)
  return { success: true }
}

export async function vincularMultiplesCajasOrdenAction(
  ordenId: number,
  cajas: { caja_id: number; cantidad_cajas: number }[]
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, ordenId)
  if ('success' in access) return access

  const payload = cajas
    .filter((item) => item.caja_id > 0 && item.cantidad_cajas > 0)
    .map((item) => ({
      orden_id: ordenId,
      caja_id: item.caja_id,
      cantidad_cajas: item.cantidad_cajas,
    }))

  if (payload.length === 0) {
    return { success: false, error: 'Selecciona al menos una caja con cantidad mayor a 0.' }
  }

  const { error } = await supabase
    .from('orden_cajas')
    .upsert(payload, { onConflict: 'orden_id,caja_id', ignoreDuplicates: false })

  if (error) return { success: false, error: error.message }

  await recalcularTotalesOrden(ordenId)
  revalidatePath(`/ordenes-b2b/${ordenId}`)
  return { success: true }
}

export async function actualizarCantidadCajasOrdenAction(
  ordenId: number,
  cajaId: number,
  cantidadCajas: number
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_editar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, ordenId)
  if ('success' in access) return access

  const { data, error } = await supabase
    .from('orden_cajas')
    .update({ cantidad_cajas: cantidadCajas })
    .match({ orden_id: ordenId, caja_id: cajaId })
    .select()

  if (error) return { success: false, error: error.message }
  if (!data || data.length === 0) {
    return { success: false, error: 'No se encontró el vínculo caja-orden para actualizar.' }
  }

  await recalcularTotalesOrden(ordenId)
  revalidatePath(`/ordenes-b2b/${ordenId}`)
  return { success: true }
}

export async function desvincularCajaOrdenAction(
  ordenCajaId: number,
  ordenId: number
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_eliminar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, ordenId)
  if ('success' in access) return access
  const { error } = await supabase
    .from('orden_cajas')
    .delete()
    .eq('id', ordenCajaId)

  if (error) return { success: false, error: error.message }

  await recalcularTotalesOrden(ordenId)
  revalidatePath(`/ordenes-b2b/${ordenId}`)
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// RECALCULAR TOTALES (sin trigger — manual)
// ════════════════════════════════════════════════════════════

async function recalcularTotalesOrden(ordenId: number): Promise<void> {
  const supabase = await createClient()

  const { data: detalles } = await supabase
    .from('ordenes_b2b_detalles')
    .select('cajas_pedidas, piezas_pedidas, cbm_detalle')
    .eq('orden_id', ordenId)

  if (!detalles) return

  const total_cajas = detalles.reduce((s, d) => s + (d.cajas_pedidas ?? 0), 0)
  const total_piezas = detalles.reduce((s, d) => s + (d.piezas_pedidas ?? 0), 0)
  const cbm_orden = detalles.reduce((s, d) => s + (d.cbm_detalle ?? 0), 0)

  await supabase
    .from('ordenes_b2b')
    .update({
      total_cajas: Math.round(total_cajas),
      total_piezas,
      cbm_orden: cbm_orden || null,
    })
    .eq('id', ordenId)
}

export async function eliminarOrdenB2BAction(
  id: number
): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_eliminar')
  if (denied) return denied

  const supabase = await createClient()
  const access = await requireCommercialOrderAccess(supabase, id)
  if ('success' in access) return access

  // Borrado lógico (soft delete): marcar activo = false y desvincular del contenedor (contenedor_id = null) sin destruir historial de detalles o cajas
  const { error } = await supabase
    .from('ordenes_b2b')
    .update({ 
      activo: false,
      contenedor_id: null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ordenes-b2b')
  revalidatePath(`/ordenes-b2b/${id}`)
  revalidatePath('/contenedores')
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// GUARDAR ORDEN RÁPIDA B2B (IMPORTACIÓN DE PACKING LIST)
// ════════════════════════════════════════════════════════════

export async function guardarOrdenRapidaB2BAction(payload: {
  proveedorId: number
  clienteB2bId: number
  contenedorId: number | null
  newContainerCode?: string | null
  observaciones?: string | null
  productos: any[]
  cajas: any[]
  detalles: any[]
  /** Vínculos manuales ámbar sincronizados por el usuario (skuUpper -> producto_id) */
  vinculosDb?: Record<string, number>
  /** Caja principal seleccionada por producto (skuUpper -> codigo_caja) para pz_en_caja */
  principalPorSku?: Record<string, string>
}): Promise<ActionResult> {
  const denied = await requireB2BPermission('puede_crear')
  if (denied) return denied

  const supabase = await createClient()

  // 1. Resolver o Crear Contenedor
  let contenedorId = payload.contenedorId
  if (contenedorId) {
    const { data: checkId } = await supabase
      .from('contenedores')
      .select('id')
      .eq('id', contenedorId)
      .maybeSingle()

    if (!checkId) {
      contenedorId = null
    }
  }

  if (!contenedorId && payload.newContainerCode?.trim()) {
    const code = payload.newContainerCode.trim()
    const { data: existingCont } = await supabase
      .from('contenedores')
      .select('id')
      .eq('codigo_contenedor', code)
      .maybeSingle()

    if (existingCont) {
      contenedorId = existingCont.id
    } else {
      const { data: newCont, error: contErr } = await supabase
        .from('contenedores')
        .insert({
          codigo_contenedor: code,
          estado: 'borrador'
        })
        .select('id')
        .single()

      if (contErr) {
        // En caso de conflicto secundario, intentar recuperar por codigo
        const { data: retryCont } = await supabase
          .from('contenedores')
          .select('id')
          .eq('codigo_contenedor', code)
          .maybeSingle()

        if (retryCont) {
          contenedorId = retryCont.id
        } else {
          return { success: false, error: `Error al crear contenedor: ${contErr.message}` }
        }
      } else {
        contenedorId = newCont.id
      }
    }
  }

  // 2. Resolver o Crear/Actualizar Productos
  const { data: provData } = await supabase
    .from('personas')
    .select('nombre_completo')
    .eq('id', payload.proveedorId)
    .single()

  const provNombre = provData?.nombre_completo ?? ''

  const { data: existingProds } = await supabase
    .from('productos')
    .select('id, sku_base, nombre, descripcion, composicion, marca_id, tipo_prenda_id, genero_id, edad_id')

  const dbProductsList = (existingProds || []).map((p: any) => ({ id: p.id, sku_base: String(p.sku_base) }))
  const dbProductsById = new Map<number, any>((existingProds || []).map((p: any) => [p.id, p]))
  const prodIdMap = new Map<string, number>()
  // Vínculos explícitos sincronizados por el usuario en ámbar (skuUpper -> producto_id)
  const vinculos = payload.vinculosDb ?? {}

  for (const p of payload.productos) {
    const sku = String(p.sku_base).trim()
    if (p.force_new) continue
    // 1. Vínculo explícito del usuario (sincronizado manualmente)
    const vinculoId = vinculos[sku.toUpperCase()]
    if (vinculoId != null && dbProductsList.some((d) => d.id === vinculoId)) {
      prodIdMap.set(sku.toUpperCase(), vinculoId)
      continue
    }
    // 2. Solo match 100 (exacto insensible a mayúsculas/separadores); lo demás nace nuevo
    const match = findBestDbSkuMatch(sku, dbProductsList, provNombre)
    if (match && match.exacto) {
      prodIdMap.set(sku.toUpperCase(), match.dbId)
      prodIdMap.set(match.dbSku.toUpperCase(), match.dbId)
    }
  }

  for (const p of payload.productos) {
    const sku = String(p.sku_base).trim()
    const skuUpper = sku.toUpperCase()
    let prodId = p.force_new ? null : prodIdMap.get(skuUpper)
    // pz_en_caja desde la caja principal seleccionada (o la de mayor cantidad)
    const pzPrincipal = resolverPiezasPrincipal(skuUpper, payload.cajas, payload.principalPorSku)

    if (prodId) {
      // Match en BD: prevalecen los valores actuales; el JSON solo rellena vacíos.
      // pz_en_caja siempre desde la principal; persona_id se reasigna al proveedor.
      const dbRow = dbProductsById.get(prodId) ?? null
      const merged = mezclarProductoDbJson(dbRow, p)
      const updPayload: any = {
        ...merged,
        nombre: merged.nombre ?? sku,
        persona_id: p.persona_id || payload.proveedorId || null,
      }
      if (pzPrincipal != null) updPayload.pz_en_caja = pzPrincipal
      const { error: updErr } = await supabase
        .from('productos')
        .update(updPayload)
        .eq('id', prodId)

      if (updErr) {
        return { success: false, error: `Error al actualizar producto ${sku}: ${updErr.message}` }
      }
    } else {
      // Producto nuevo: valores del JSON + pz_en_caja de su principal
      const insertPayload: any = {
        sku_base: sku,
        nombre: p.nombre || p.descripcion || sku,
        descripcion: p.descripcion || null,
        composicion: p.composicion || null,
        marca_id: p.marca_id || null,
        tipo_prenda_id: p.tipo_prenda_id || null,
        genero_id: p.genero_id || null,
        edad_id: p.edad_id || null,
        persona_id: p.persona_id || payload.proveedorId || null,
        cliente_b2b_id: payload.clienteB2bId,
        activo: true,
        estado: 'pendiente'
      }
      if (pzPrincipal != null) insertPayload.pz_en_caja = pzPrincipal
      // Insertar nuevo producto con persona_id (proveedor seleccionado)
      const { data: newProd, error: insErr } = await supabase
        .from('productos')
        .insert(insertPayload)
        .select('id')
        .single()

      if (insErr) {
        return { success: false, error: `Error al crear producto ${sku}: ${insErr.message}` }
      }
      prodId = newProd.id
      prodIdMap.set(skuUpper, prodId)
    }
  }

  // 3. Cargar Catálogos de Tallas y Colores para desgloses
  const [coloresRes, tallasRes] = await Promise.all([
    supabase.from('cat_colores').select('id, nombre, codigo').eq('activo', true),
    supabase.from('cat_tallas').select('id, codigo, talla_us')
  ])

  const tallasMap = new Map<string, number>()
  if (tallasRes.data) {
    tallasRes.data.forEach((t: any) => {
      if (t.codigo) tallasMap.set(t.codigo.trim().toUpperCase(), t.id)
      if (t.talla_us) tallasMap.set(t.talla_us.trim().toUpperCase(), t.id)
    })
  }

  const coloresList = coloresRes.data || []
  function findColorId(identificador: string | null): number | null {
    if (!identificador) return null
    const cleanId = identificador.trim().toUpperCase()

    // Coincidencia exacta por ID
    const idNum = parseInt(cleanId)
    if (!isNaN(idNum)) {
      const match = coloresList.find((c: any) => c.id === idNum)
      if (match) return match.id
    }

    // Coincidencia exacta por código
    const matchCod = coloresList.find((c: any) => c.codigo?.trim().toUpperCase() === cleanId)
    if (matchCod) return matchCod.id

    // Coincidencia exacta por nombre
    const matchNom = coloresList.find((c: any) => c.nombre?.trim().toUpperCase() === cleanId)
    if (matchNom) return matchNom.id

    // Coincidencia normalizada
    function normalize(str: string) {
      return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
    }
    const normId = normalize(identificador)
    const matchFlex = coloresList.find((c: any) => normalize(c.nombre || '') === normId || normalize(c.codigo || '') === normId)
    if (matchFlex) return matchFlex.id

    return null
  }

  const TALLA_EN_ES_MAP_ACTION: Record<string, string> = {
    XS: 'ECH',
    'EXTRA SMALL': 'ECH',
    S: 'CH',
    SMALL: 'CH',
    M: 'M',
    MEDIUM: 'M',
    L: 'G',
    LARGE: 'G',
    XL: 'EG',
    'EXTRA LARGE': 'EG',
    '2XL': '2EG',
    XXL: '2EG',
    '2X EXTRA GRANDE': '2EG',
    '3XL': '3EG',
    XXXL: '3EG',
    '3X EXTRA GRANDE': '3EG',
    '4XL': '4EG',
    '5XL': '5EG',
    'ONE SIZE': 'UNITALLA',
    OS: 'UNITALLA',
    'CH-M': 'CH-M',
    'CH/M': 'CH-M',
    'S-M': 'CH-M',
    'S/M': 'CH-M',
    SM: 'CH-M',
    'M-G': 'M-G',
    'M/G': 'M-G',
    'M-L': 'M-G',
    'M/L': 'M-G',
    ML: 'M-G',
    'G-EG': 'G-EG',
    'G/EG': 'G-EG',
    'L-XL': 'G-EG',
    'L/XL': 'G-EG',
    LXL: 'G-EG',
    'EG-2EG': 'EG-2EG',
    'EG/2EG': 'EG-2EG',
    'XL-2XL': 'EG-2EG',
    'XL/2XL': 'EG-2EG',
    'XL-XXL': 'EG-2EG',
    'XL/XXL': 'EG-2EG',
  }

  function standardizeTallaNameAction(rawTalla: string): string {
    if (!rawTalla) return ''
    const trimmed = rawTalla.trim().toUpperCase()
    return TALLA_EN_ES_MAP_ACTION[trimmed] || trimmed
  }

  const COLOR_EN_ES_MAP_ACTION: Record<string, string> = {
    BLACK: 'NEGRO',
    WHITE: 'BLANCO',
    RED: 'ROJO',
    NAVY: 'MARINO',
    'NAVY BLUE': 'MARINO',
    BLUE: 'AZUL',
    GREY: 'GRIS',
    GRAY: 'GRIS',
    ROSE: 'ROSA',
    PINK: 'ROSA',
    CHOCOLATE: 'CHOCOLATE',
    BROWN: 'CAFÉ',
    GREEN: 'VERDE',
    BEIGE: 'BEIGE',
  }

  function standardizeColorNameAction(rawColor: string): string {
    if (!rawColor) return ''
    const trimmed = rawColor.trim().toUpperCase()
    return COLOR_EN_ES_MAP_ACTION[trimmed] || trimmed
  }

  // 4. Crear/Actualizar Cajas y sus Detalles
  // Defensa en fondo (el wizard ya bloquea sinPz): ninguna caja sin piezas.
  const sinPzServidor = Array.from(new Set(
    payload.cajas
      .filter((c: any) => c.tipo_caja !== 'padre_resumen')
      .filter((c: any) => !(Number(c.piezas_por_caja ?? 0) > 0))
      .map((c: any) => String(c.codigo_caja || c.codigo_caja_temporal || 's/código')),
  ))
  if (sinPzServidor.length > 0) {
    return { success: false, error: `Bloqueo servidor: cajas sin piezas por caja: ${sinPzServidor.join(', ')}` }
  }
  // Fase 2: sin fallback silencioso a Negro. Todo color_raw debe resolver a
  // cat_colores (el wizard lo garantiza vía match preview + modal paso 4).
  const coloresSinMatch = new Map<string, Set<string>>()
  for (const d of (payload.detalles || []) as Array<{ codigo_caja_temporal?: string; color_raw?: string }>) {
    const rawColorCheck = String(d.color_raw || '').trim()
    const stdColorCheck = standardizeColorNameAction(rawColorCheck)
    const colorIdCheck = findColorId(stdColorCheck) || findColorId(rawColorCheck)
    if (!colorIdCheck) {
      const cod = String(d.codigo_caja_temporal || 's/código')
      const key = rawColorCheck || '(sin color)'
      if (!coloresSinMatch.has(key)) coloresSinMatch.set(key, new Set())
      coloresSinMatch.get(key)!.add(cod)
    }
  }
  if (coloresSinMatch.size > 0) {
    const lista = [...coloresSinMatch.entries()]
      .map(([raw, cods]) => `"${raw}" (${cods.size} caja(s): ${[...cods].slice(0, 4).join(', ')})`)
      .join(', ')
    return { success: false, error: `Colores sin match en catálogo: ${lista}. Resuélvelos en el paso 4 (mapear a existente o crear nuevo).` }
  }
  const cajaMap = new Map<string, number>()
  for (const c of payload.cajas) {
    const code = String(c.codigo_caja || c.codigo_caja_temporal).trim()
    const prodId = prodIdMap.get(c.sku_base.toUpperCase()) || null

    const payloadCaja = {
      codigo_caja: code,
      nombre_pack: c.nombre_pack || 'PACK UNICO',
      producto_id: prodId,
      proveedor_id: payload.proveedorId,
      piezas_por_caja: c.piezas_por_caja || 0,
      largo_cm: c.largo_cm || null,
      ancho_cm: c.ancho_cm || null,
      alto_cm: c.alto_cm || null,
      cbm: c.cbm || c.cbm_por_caja || null,
      peso_bruto_kg: c.peso_bruto_kg || null,
      peso_neto: c.peso_neto_kg || null,
      tallas: Array.isArray(c.tallas) ? c.tallas.join('|') : (c.tallas || null),
      colores: Array.isArray(c.colores) ? c.colores.join('|') : (c.colores || null),
      activo: true
    }

    const { data: cajaRes, error: cajaErr } = await supabase
      .from('cajas_producto')
      .upsert(payloadCaja as any, { onConflict: 'codigo_caja' })
      .select('id')
      .single()

    if (cajaErr) {
      return { success: false, error: `Error al registrar caja ${code}: ${cajaErr.message}` }
    }
    const cajaId = cajaRes.id
    cajaMap.set(code.toUpperCase(), cajaId)

    // Sobrescribir caja_detalles
    await supabase.from('caja_detalles').delete().eq('caja_id', cajaId)

    const boxDetails = payload.detalles.filter(
      (d: any) => String(d.codigo_caja_temporal).toUpperCase() === code.toUpperCase()
    )

    if (boxDetails.length > 0) {
      const payloadDetails = boxDetails.map((d: any) => {
        const rawTalla = String(d.talla_codigo || '').trim().toUpperCase()
        const stdTalla = standardizeTallaNameAction(rawTalla)
        let tallaId = tallasMap.get(stdTalla) || tallasMap.get(rawTalla) || null

        if (!tallaId) {
          if (rawTalla === 'UNITALLA' || rawTalla === 'OS' || rawTalla === 'ONE SIZE') tallaId = 21
          else if (rawTalla.includes('CH') || rawTalla === 'S') tallaId = 3
          else if (rawTalla.includes('G') || rawTalla === 'L') tallaId = 5
          else if (rawTalla.includes('EG') || rawTalla === 'XL') tallaId = 6
          else if (rawTalla.includes('M')) tallaId = 4
          else tallaId = 21 // Fallback a UNITALLA (id: 21) si no coincide
        }

        const rawColor = String(d.color_raw || '').trim()
        const stdColor = standardizeColorNameAction(rawColor)
        // Pre-validado arriba (coloresSinMatch). Sin fallback a Negro: si algo
        // cambió entre validación e inserción, fallar explícito en vez de Negro.
        const colorId = findColorId(stdColor) || findColorId(rawColor)
        if (!colorId) {
          throw new Error(`Color "${rawColor || '(sin color)'}" perdió su match en catálogo durante el guardado. Reintenta desde el paso 4.`)
        }

        return {
          caja_id: cajaId,
          cantidad: d.cantidad_por_caja || 0,
          talla_id: tallaId,
          color_id: colorId
        }
      })

      const { error: detErr } = await supabase
        .from('caja_detalles')
        .insert(payloadDetails)

      if (detErr) {
        return { success: false, error: `Error al registrar desglose de caja ${code}: ${detErr.message}` }
      }
    }
  }

  // 5. Crear la Cabecera de la Orden B2B
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = Math.random().toString(36).slice(2, 6).toUpperCase()
  const autoFolio = `B2B-PL-${dateStr}-${randomStr}`

  const totalCajas = payload.cajas.reduce((sum: number, c: any) => sum + (c.cantidad_cajas || 0), 0)
  const totalPiezas = payload.cajas.reduce((sum: number, c: any) => sum + ((c.cantidad_cajas || 0) * (c.piezas_por_caja || 0)), 0)
  const totalCbm = payload.cajas.reduce((sum: number, c: any) => sum + ((c.cantidad_cajas || 0) * (c.cbm_por_caja || c.cbm || 0)), 0)

  // Bloqueo absoluto modo solo cajas: cada producto debe tener cajas físicas armadas.
  // Solo cuentan filas físicas reales (se excluyen resúmenes padre).
  const sinCajasArmadas: string[] = []
  for (const p of (payload.productos || [])) {
    const skuUpper = String(p.sku_base || '').trim().toUpperCase()
    if (!skuUpper) continue
    const armadas = (payload.cajas || [])
      .filter((c: any) => String(c.sku_base || '').trim().toUpperCase() === skuUpper && c.tipo_caja !== 'padre_resumen')
      .reduce((sum: number, c: any) => sum + (Number(c.cantidad_cajas ?? 0) || 0), 0)
    if (armadas <= 0) sinCajasArmadas.push(String(p.sku_base))
  }
  if (sinCajasArmadas.length > 0) {
    return { success: false, error: `Bloqueo modo cajas: productos sin cajas armadas: ${sinCajasArmadas.join(', ')}` }
  }
  if (totalCajas <= 0) {
    return { success: false, error: 'Bloqueo modo cajas: la orden no tiene cajas.' }
  }

  const { data: newOrder, error: orderErr } = await supabase
    .from('ordenes_b2b')
    .insert({
      proveedor_id: payload.proveedorId,
      cliente_b2b_id: payload.clienteB2bId,
      contenedor_id: contenedorId,
      folio_proveedor: autoFolio,
      estado: 'Borrador',
      moneda: 'USD',
      total_cajas: totalCajas,
      total_piezas: totalPiezas,
      cbm_orden: totalCbm,
      observaciones: payload.observaciones || `Importado vía Packing List. Folio automático: ${autoFolio}`
    })
    .select('id')
    .single()

  if (orderErr) {
    return { success: false, error: `Error al crear orden B2B: ${orderErr.message}` }
  }
  const ordenId = newOrder.id

  // 6. Crear los Detalles de la Orden B2B
  const orderDetailsPayload = payload.productos.map((p: any) => {
    const prodId = prodIdMap.get(p.sku_base.toUpperCase()) || null
    const prodBoxes = payload.cajas
      .filter((c: any) => c.sku_base.toUpperCase() === p.sku_base.toUpperCase())
      .reduce((sum: number, c: any) => sum + (c.cantidad_cajas || 0), 0)
    const prodPieces = payload.cajas
      .filter((c: any) => c.sku_base.toUpperCase() === p.sku_base.toUpperCase())
      .reduce((sum: number, c: any) => sum + ((c.cantidad_cajas || 0) * (c.piezas_por_caja || 0)), 0)
    const prodCbm = payload.cajas
      .filter((c: any) => c.sku_base.toUpperCase() === p.sku_base.toUpperCase())
      .reduce((sum: number, c: any) => sum + ((c.cantidad_cajas || 0) * (c.cbm_por_caja || c.cbm || 0)), 0)
    const prodWeight = payload.cajas
      .filter((c: any) => c.sku_base.toUpperCase() === p.sku_base.toUpperCase())
      .reduce((sum: number, c: any) => sum + ((c.cantidad_cajas || 0) * (c.peso_bruto_kg || 0)), 0)

    return {
      orden_id: ordenId,
      producto_id: prodId,
      cantidad_solicitada: prodPieces,
      piezas_pedidas: prodPieces,
      cajas_pedidas: prodBoxes,
      cbm_detalle: prodCbm || null,
      peso_bruto_kg: prodWeight || null,
      precio_unitario: p.precio_unitario_usd || null,
      precio_yuan: p.precio_yuan || null,
      estado_producto: 'Pendiente'
    }
  })

  const { error: detErr } = await supabase
    .from('ordenes_b2b_detalles')
    .insert(orderDetailsPayload)

  if (detErr) {
    return { success: false, error: `Error al crear detalles de la orden B2B: ${detErr.message}` }
  }

  // 7. Crear la relación de Cajas de la Orden (orden_cajas)
  const orderCajasPayload = []
  for (const c of payload.cajas) {
    const codeUpper = String(c.codigo_caja || c.codigo_caja_temporal).trim().toUpperCase()
    const dbCajaId = cajaMap.get(codeUpper)
    if (dbCajaId) {
      orderCajasPayload.push({
        orden_id: ordenId,
        caja_id: dbCajaId,
        cantidad_cajas: c.cantidad_cajas || 0
      })
    }
  }

  if (orderCajasPayload.length > 0) {
    const { error: linkErr } = await supabase
      .from('orden_cajas')
      .insert(orderCajasPayload)

    if (linkErr) {
      return { success: false, error: `Error al vincular cajas a la orden: ${linkErr.message}` }
    }
  }

  revalidatePath('/ordenes-b2b')
  return { success: true, id: ordenId }
}

/** Normaliza un SKU para comparación estricta (sin separadores - _ / espacio y sin diacríticos) */
function normalizeSkuKey(s: string): string {
  return s
    .toUpperCase()
    .replace(/[ÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛ]/g, c => {
      return { 'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','À':'A','È':'E','Ì':'I','Ò':'O','Ù':'U','Ä':'A','Ë':'E','Ï':'I','Ö':'O','Ü':'U','Â':'A','Ê':'E','Î':'I','Ô':'O','Û':'U' }[c] ?? c
    })
    .replace(/[-_/\s]+/g, '')
    .trim()
}

/** Extrae sub-tokens/modelos individuales de un SKU compuesto (ej: AND230012/3VT3423 -> ['AND230012', '3VT3423']) */
function extractSkuTokens(s: string): string[] {
  const parts = s
    .toUpperCase()
    .split(/[-_/\s]+/)
    .map(p => p.trim())
    .filter(p => p.length >= 2)
  return Array.from(new Set(parts))
}

/** Extrae el código de modelo MOTI con patrón AND+números (ej: AND230012, AND250029, AND20002) */
function extractAndToken(s: string): string | null {
  const match = s.toUpperCase().match(/AND\d+/i)
  return match ? match[0].trim() : null
}

const MOTI_MODEL_PREFIXES = ['1AK', '3VT', '3JA', '1VT']

/** Extrae el token de modelo secundario de MOTI (ej: 1AK7986, 3VT3423, 3JA8811, 1VT552) */
function extractMotiModelToken(s: string): string | null {
  const upper = s.toUpperCase()
  for (const prefix of MOTI_MODEL_PREFIXES) {
    const reg = new RegExp(`${prefix}\\d+`, 'i')
    const match = upper.match(reg)
    if (match) return match[0].trim()
  }
  return null
}

/** Mezcla fila DB (prevalece si tiene valor) con JSON (rellena vacíos). */
function mezclarProductoDbJson(
  db: { nombre?: string | null; descripcion?: string | null; composicion?: string | null; marca_id?: number | null; tipo_prenda_id?: number | null; genero_id?: number | null; edad_id?: number | null } | null,
  json: { nombre?: string | null; descripcion?: string | null; composicion?: string | null; marca_id?: number | null; tipo_prenda_id?: number | null; genero_id?: number | null; edad_id?: number | null },
): { nombre: string | null; descripcion: string | null; composicion: string | null; marca_id: number | null; tipo_prenda_id: number | null; genero_id: number | null; edad_id: number | null } {
  const texto = (dbV: unknown, jsonV: unknown): string | null => {
    if (typeof dbV === 'string' && dbV.trim()) return dbV
    if (dbV != null && typeof dbV !== 'string') return dbV as string
    if (typeof jsonV === 'string' && jsonV.trim()) return jsonV
    return null
  }
  const fk = (dbV: unknown, jsonV: unknown): number | null => {
    if (typeof dbV === 'number' && Number.isInteger(dbV)) return dbV
    if (typeof jsonV === 'number' && Number.isInteger(jsonV)) return jsonV
    return null
  }
  return {
    nombre: texto(db?.nombre, json?.nombre),
    descripcion: texto(db?.descripcion, json?.descripcion),
    composicion: texto(db?.composicion, json?.composicion),
    marca_id: fk(db?.marca_id, json?.marca_id),
    tipo_prenda_id: fk(db?.tipo_prenda_id, json?.tipo_prenda_id),
    genero_id: fk(db?.genero_id, json?.genero_id),
    edad_id: fk(db?.edad_id, json?.edad_id),
  }
}

/** Piezas de la caja principal (selección explícita o mayor cantidad) para pz_en_caja. */
function resolverPiezasPrincipal(
  skuUpper: string,
  cajas: any[],
  principalPorSku?: Record<string, string>,
): number | null {
  const reales = (cajas || []).filter(
    (c: any) => String(c.sku_base || '').trim().toUpperCase() === skuUpper && c.tipo_caja !== 'padre_resumen',
  )
  if (reales.length === 0) return null
  const codigo = principalPorSku?.[skuUpper]
  const elegida = (codigo
    ? reales.find((c: any) => String(c.codigo_caja || c.codigo_caja_temporal || '') === codigo)
    : undefined)
    ?? [...reales].sort((a: any, b: any) =>
      (Number(b.cantidad_cajas ?? 0) - Number(a.cantidad_cajas ?? 0))
      || (Number(b.piezas_por_caja ?? 0) - Number(a.piezas_por_caja ?? 0)),
    )[0]
  const pz = Number(elegida?.piezas_por_caja ?? 0)
  return pz > 0 ? pz : null
}

/** Extrae el prefijo de proveedor (ej: HO para Honor, JA para Jacky, TY para Tianyi) */
function extractSupplierPrefix(s: string): string | null {
  const clean = s.toUpperCase().trim()
  const match = clean.match(/^([A-Z]{2,3})/i)
  return match ? match[1] : null
}

/** Determina si el proveedor corresponde a MOTI */
function isMotiSupplier(supplierName?: string): boolean {
  if (!supplierName) return false
  return supplierName.toLowerCase().includes('moti')
}

/** Distancia de Levenshtein para tolerancia de pequeños errores tipográficos */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Busca la mejor coincidencia en la base de datos para un SKU de n8n/Excel.
 * Para proveedor MOTI, respeta la identidad única del token AND#####.
 * Si viene un AND nuevo (ej. AND260021 3VT3423), evita falsos positivos con ítems viejos (AND230012 3VT3423).
 */
/**
 * Resultado rico de coincidencia SKU (cero falsos positivos en auto-vínculo).
 * Solo `exacto === true` (100: idéntico insensible a mayúsculas y separadores)
 * permite conexión automática. Lo demás es probable y requiere revisión humana.
 */
export type SkuMatchResult = {
  dbSku: string
  dbId: number
  score: number
  metodo: 'exacta' | 'normalizada' | 'and-moti' | 'token' | 'contiene' | 'similar'
  exacto: boolean
  /** true = mismo proveedor, false = otro proveedor, null = sin contexto de proveedor */
  mismaPersona: boolean | null
}

/** Rango de preferencia por proveedor: mismo (2) > sin proveedor (1) > otro (0). Sin contexto, todos valen 1. */
function personaRank(personaIdRow: number | null | undefined, personaId?: number | null): number {
  if (personaId == null) return 1
  if (personaIdRow === personaId) return 2
  if (personaIdRow == null) return 1
  return 0
}

/**
 * Patrones ilike dirigidos para un SKU (evita el escaneo total de la tabla,
 * que se trunca a 1000 filas en la API REST). Incluye variantes de separador
 * (- ↔ /) y tokens individuales para alias y tolerancia.
 */
function skuSearchPatterns(inputSku: string): string[] {
  const clean = String(inputSku || '').trim().replace(/,/g, '')
  if (!clean) return []
  const set = new Set<string>()
  set.add(`%${clean}%`)
  const slash = clean.replace(/-/g, '/')
  const hyphen = clean.replace(/\//g, '-')
  if (slash !== clean) set.add(`%${slash}%`)
  if (hyphen !== clean && hyphen !== slash) set.add(`%${hyphen}%`)
  const tokens = extractSkuTokens(clean)
  for (const t of tokens) {
    if (t.length >= 3) set.add(`%${t}%`)
  }
  if (tokens.length >= 2 && tokens[0].length >= 2) set.add(`%${tokens[0]}%`)
  return Array.from(set).slice(0, 10)
}

function findBestDbSkuMatch(
  inputSku: string,
  dbProducts: { id: number; sku_base: string; persona_id?: number | null }[],
  proveedorNombre?: string,
  personaId?: number | null,
): SkuMatchResult | null {
  const inputClean = inputSku.trim()
  if (!inputClean) return null

  const isMoti = isMotiSupplier(proveedorNombre)
  const inputUpper = inputClean.toUpperCase()
  const inputNorm = normalizeSkuKey(inputClean)
  const inputTokens = extractSkuTokens(inputClean)
  const inputAndToken = extractAndToken(inputClean)

  let bestMatch: (SkuMatchResult & { rank: number }) | null = null
  let highestScore = 0
  // Exactos acumulados: mismo proveedor > sin proveedor > otro (nunca se ocultan).
  const exactos: { dbSku: string; dbId: number; metodo: 'exacta' | 'normalizada'; rank: number; personaIdRow: number | null | undefined }[] = []

  for (const p of dbProducts) {
    const dbSku = p.sku_base
    const dbUpper = dbSku.toUpperCase()
    const dbNorm = normalizeSkuKey(dbSku)
    const dbAndToken = extractAndToken(dbSku)
    const rank = personaRank(p.persona_id, personaId)

    // 1. Coincidencia exacta (100, auto-vínculo permitido)
    if (inputUpper === dbUpper) {
      exactos.push({ dbSku, dbId: p.id, metodo: 'exacta', rank, personaIdRow: p.persona_id })
      continue
    }

    // 1b. Normalizada: mismo código insensible a separadores (100, auto-vínculo)
    if (inputNorm !== '' && inputNorm === dbNorm) {
      exactos.push({ dbSku, dbId: p.id, metodo: 'normalizada', rank, personaIdRow: p.persona_id })
      continue
    }

    let score = 0
    let metodo: SkuMatchResult['metodo'] = 'similar'

    if (isMoti) {
      // Regla MOTI 1: Si el SKU de entrada posee un patrón AND#####
      if (inputAndToken) {
        if (dbAndToken && inputAndToken === dbAndToken) {
          // El AND coincide exactamente (ej: AND230012 === AND230012)
          score = 98
          metodo = 'and-moti'
        } else {
          // Si el input tiene AND y la entrada de la BD tiene un AND distinto,
          // se trata de un producto NUEVO de MOTI. Previene falso positivo con códigos secundarios (3VT/1AK/3JA).
          continue
        }
      } else {
        // Regla MOTI 2: El SKU de entrada no trae token AND (solo viene 3VT..., 1AK..., 3JA...)
        if (inputNorm === dbNorm) {
          score = 90
          metodo = 'token'
        } else {
          const dbTokens = extractSkuTokens(dbSku)
          const hasMatchingToken = inputTokens.some((it) => dbTokens.includes(it))
          if (hasMatchingToken) {
            score = 85
            metodo = 'token'
          }
        }
      }
    } else {
      // Proveedores estándar (no MOTI)
      // Exigir estricta coincidencia de prefijo de proveedor (ej: AL no puede coincidir con FK o TY)
      const inputPrefix = extractSupplierPrefix(inputClean)
      const dbPrefix = extractSupplierPrefix(dbSku)
      if (inputPrefix && dbPrefix && inputPrefix !== dbPrefix) {
        continue
      }

      if (inputNorm === dbNorm) {
        score = 90
        metodo = 'token'
      } else {
        const dbTokens = extractSkuTokens(dbSku)
        const hasMatchingToken = inputTokens.some((it) => dbTokens.includes(it))
        if (hasMatchingToken) {
          score = 80
          metodo = 'token'
        } else if (inputNorm.length >= 5 && dbNorm.length >= 5) {
          const dist = levenshteinDistance(inputNorm, dbNorm)
          if (dist <= 2) {
            score = 60
            metodo = 'similar'
          }
        } else if (inputNorm.length >= 4 && dbNorm.length >= 4) {
          if (dbNorm.includes(inputNorm) || inputNorm.includes(dbNorm)) {
            score = 70
            metodo = 'contiene'
          }
        }
      }
    }

    if (score > highestScore || (score === highestScore && bestMatch != null && rank > bestMatch.rank)) {
      highestScore = score
      bestMatch = { dbSku, dbId: p.id, score, metodo, exacto: false, mismaPersona: personaId != null ? p.persona_id === personaId : null, rank }
    }
  }

  if (exactos.length > 0) {
    exactos.sort((a, b) => b.rank - a.rank)
    const e = exactos[0]
    return { dbSku: e.dbSku, dbId: e.dbId, score: 100, metodo: e.metodo, exacto: true, mismaPersona: personaId != null ? e.personaIdRow === personaId : null }
  }

  if (bestMatch == null) return null
  const { rank: _rank, ...out } = bestMatch
  return highestScore >= 60 ? out : null
}

export type SkuProbable = {
  inputSku: string
  dbSku: string
  dbId: number
  score: number
  metodo: SkuMatchResult['metodo']
}

type DbSkuRow = { id: number; sku_base: string; persona_id: number | null }

/**
 * Trae candidatos de productos por patrones ilike (una query por lote de
 * patrones). Nunca escanea la tabla completa: evita el truncado a 1000 filas.
 */
async function fetchSkuCandidates(
  supabase: any,
  patterns: string[],
  selectCols: string,
): Promise<DbSkuRow[]> {
  const out = new Map<number, DbSkuRow>()
  const CHUNK = 30
  for (let i = 0; i < patterns.length; i += CHUNK) {
    const orExpr = patterns.slice(i, i + CHUNK).map((p) => `sku_base.ilike.${p}`).join(',')
    if (!orExpr) continue
    const { data, error } = await supabase.from('productos').select(selectCols).or(orExpr).limit(100)
    if (error) throw error
    for (const r of (data ?? []) as any[]) {
      out.set(r.id, { id: r.id, sku_base: String(r.sku_base), persona_id: r.persona_id ?? null, ...r })
    }
  }
  return Array.from(out.values())
}

export async function verificarSkusEnBDAction(
  skus: string[],
  proveedorNombre?: string,
  personaId?: number | null,
): Promise<{
  success: boolean
  skusExistentes: string[]
  skuMap: Record<string, string>
  probables: SkuProbable[]
}> {
  if (!skus || skus.length === 0) return { success: true, skusExistentes: [], skuMap: {}, probables: [] }
  const supabase = await createClient()
  const cleanSkus = Array.from(new Set(skus.map((s) => String(s).trim()).filter(Boolean)))
  if (cleanSkus.length === 0) return { success: true, skusExistentes: [], skuMap: {}, probables: [] }

  let dbProducts: DbSkuRow[] = []
  try {
    const patterns = Array.from(new Set(cleanSkus.flatMap((s) => skuSearchPatterns(s)))).slice(0, 300)
    dbProducts = await fetchSkuCandidates(supabase, patterns, 'id, sku_base, persona_id')
  } catch (error) {
    console.error('Error al verificar SKUs en BD:', error)
    return { success: false, skusExistentes: [], skuMap: {}, probables: [] }
  }

  const skusExistentes: string[] = []
  const skuMap: Record<string, string> = {}
  const probables: SkuProbable[] = []

  for (const inputSku of cleanSkus) {
    const match = findBestDbSkuMatch(inputSku, dbProducts, proveedorNombre, personaId)
    if (!match) continue
    if (match.exacto) {
      // Único caso con conexión automática (100 insensible a mayúsculas/separadores)
      skusExistentes.push(inputSku)
      skuMap[inputSku.toUpperCase()] = match.dbSku
    } else {
      // Probable: nace como nuevo, con opción de sincronizar manualmente
      probables.push({
        inputSku,
        dbSku: match.dbSku,
        dbId: match.dbId,
        score: match.score,
        metodo: match.metodo,
      })
    }
  }

  return { success: true, skusExistentes, skuMap, probables }
}

export type SkuBusquedaMotivo = 'SIN_CANDIDATOS' | 'VACIO'

/**
 * Búsqueda bajo demanda de UN sku (lápiz 🔍 por fila). Usa el mismo algoritmo
 * dirigido que verificarSkusEnBDAction: encuentra el código exista o no el
 * proveedor, venga del proveedor que venga.
 */
export async function buscarSkuEnBDAction(
  sku: string,
  proveedorNombre?: string,
  personaId?: number | null,
): Promise<{
  success: boolean
  inputSku: string
  exacto?: {
    id: number
    dbSku: string
    metodo: 'exacta' | 'normalizada'
    nombre?: string
    descripcion?: string
    composicion?: string
    precio_usd?: number
    marca_id?: number
    marca_nombre?: string
    persona_id?: number | null
    mismaPersona: boolean | null
  }
  probables: SkuProbable[]
  motivo?: SkuBusquedaMotivo
  error?: string
}> {
  const inputSku = String(sku || '').trim()
  if (!inputSku) return { success: true, inputSku, probables: [], motivo: 'VACIO' }
  try {
    const supabase = await createClient()
    const patterns = skuSearchPatterns(inputSku)
    const rows = await fetchSkuCandidates(
      supabase,
      patterns,
      'id, sku_base, nombre, descripcion, composicion, precio_ec, marca_id, persona_id, cat_marcas ( id, nombre )',
    )
    if (rows.length === 0) return { success: true, inputSku, probables: [], motivo: 'SIN_CANDIDATOS' }

    const match = findBestDbSkuMatch(inputSku, rows, proveedorNombre, personaId)
    const probables: SkuProbable[] = []
    for (const r of rows as any[]) {
      if (match && r.id === match.dbId) continue
      const m2 = findBestDbSkuMatch(inputSku, [r], proveedorNombre, personaId)
      if (m2 && !m2.exacto && m2.score >= 60 && probables.length < 3) {
        probables.push({ inputSku, dbSku: m2.dbSku, dbId: m2.dbId, score: m2.score, metodo: m2.metodo })
      }
    }
    probables.sort((a, b) => b.score - a.score)

    if (match && match.exacto) {
      const row = (rows as any[]).find((r) => r.id === match.dbId) as any
      const marcaObj = row?.cat_marcas as any
      return {
        success: true,
        inputSku,
        exacto: {
          id: row.id,
          dbSku: row.sku_base,
          metodo: match.metodo as 'exacta' | 'normalizada',
          nombre: row.nombre || '',
          descripcion: row.descripcion || row.nombre || '',
          composicion: row.composicion || '',
          precio_usd: Number(row.precio_ec || 0),
          marca_id: row.marca_id || (marcaObj ? marcaObj.id : undefined),
          marca_nombre: marcaObj ? marcaObj.nombre : undefined,
          persona_id: row.persona_id ?? null,
          mismaPersona: match.mismaPersona,
        },
        probables,
      }
    }
    if (match && !match.exacto) {
      probables.unshift({ inputSku, dbSku: match.dbSku, dbId: match.dbId, score: match.score, metodo: match.metodo })
    }
    return { success: true, inputSku, probables: probables.slice(0, 4) }
  } catch (err: any) {
    console.error('Error en buscarSkuEnBDAction:', err)
    return { success: true, inputSku, probables: [], motivo: 'SIN_CANDIDATOS', error: err.message }
  }
}

export async function obtenerDatosProductosDeBDAction(
  skus: string[],
  personaId?: number,
  proveedorNombre?: string,
): Promise<{
  success: boolean
  productosMap?: Record<string, {
    id?: number
    nombre?: string
    descripcion?: string
    composicion?: string
    precio_usd?: number
    marca_id?: number
    marca_nombre?: string
    esNuevoLoteMoti?: boolean
    esVersionAnterior?: boolean
    skuHeredado?: string
  }>
  error?: string
}> {
  try {
    if (!skus || skus.length === 0) return { success: true, productosMap: {} }
    const supabase = await createClient()

    const cleanSkus = Array.from(new Set(skus.map((s) => String(s).trim()).filter(Boolean)))
    if (cleanSkus.length === 0) return { success: true, productosMap: {} }

    // Candidatos dirigidos por patrones (sin escaneo total: evita el truncado
    // a 1000 filas). La pertenencia al proveedor solo ordena, nunca filtra:
    // un SKU global (persona_id null) u otro proveedor también matchea.
    const patterns = Array.from(new Set(cleanSkus.flatMap((s) => skuSearchPatterns(s)))).slice(0, 300)
    let allProducts: any[] = []
    try {
      allProducts = await fetchSkuCandidates(
        supabase,
        patterns,
        `id, sku_base, nombre, descripcion, composicion, precio_ec, marca_id, persona_id, cat_marcas ( id, nombre )`,
      )
    } catch (e) {
      throw e
    }

    const productosMap: Record<string, {
      id?: number
      nombre?: string
      descripcion?: string
      composicion?: string
      precio_usd?: number
      marca_id?: number
      marca_nombre?: string
      esNuevoLoteMoti?: boolean
      esVersionAnterior?: boolean
      skuHeredado?: string
    }> = {}

    const isMoti = isMotiSupplier(proveedorNombre)

    for (const inputSku of cleanSkus) {
      const inputUpper = inputSku.trim().toUpperCase()

      // 1. Búsqueda exacta (mismo proveedor > sin proveedor > otro; nunca se oculta)
      const best = findBestDbSkuMatch(inputSku, allProducts, proveedorNombre, personaId)
      const exactMatch = best && best.exacto ? allProducts.find((p) => p.id === best.dbId) : undefined
      if (exactMatch) {
        const marcaObj = exactMatch.cat_marcas as any
        productosMap[inputUpper] = {
          id: exactMatch.id,
          nombre: exactMatch.nombre || '',
          descripcion: exactMatch.descripcion || exactMatch.nombre || '',
          composicion: exactMatch.composicion || '',
          precio_usd: Number(exactMatch.precio_ec || 0),
          marca_id: exactMatch.marca_id || (marcaObj ? marcaObj.id : undefined),
          marca_nombre: marcaObj ? marcaObj.nombre : undefined,
        }
        continue
      }

      // 2. Búsqueda por Aliasing Especial de MOTI (1AK, 3VT, 3JA, 1VT)
      if (isMoti) {
        const modelToken = extractMotiModelToken(inputSku)
        if (modelToken) {
          const modelMatch = allProducts.find((p) => {
            const dbSkuUpper = String(p.sku_base).toUpperCase()
            return dbSkuUpper.includes(modelToken)
          })

          if (modelMatch) {
            const marcaObj = modelMatch.cat_marcas as any
            productosMap[inputUpper] = {
              nombre: modelMatch.nombre || '',
              descripcion: modelMatch.descripcion || modelMatch.nombre || '',
              composicion: modelMatch.composicion || '',
              precio_usd: Number(modelMatch.precio_ec || 0),
              marca_id: modelMatch.marca_id || (marcaObj ? marcaObj.id : undefined),
              marca_nombre: marcaObj ? marcaObj.nombre : undefined,
              esNuevoLoteMoti: true,
              skuHeredado: modelMatch.sku_base,
            }
            continue
          }
        }
      }

      // 3. Coincidencia por Versión Anterior del Mismo Proveedor (ej. HO26/09HC -> HO25/09HC)
      const inputPrefix = extractSupplierPrefix(inputSku)
      if (inputPrefix && inputPrefix.length >= 2) {
        const versionMatch = allProducts.find((p) => {
          const dbSkuUpper = String(p.sku_base).toUpperCase()
          const dbPrefix = extractSupplierPrefix(p.sku_base)
          if (dbPrefix !== inputPrefix) return false

          // Mismo prefijo (ej: HO == HO). Comparar similitud estructural de la clave
          const inputNorm = normalizeSkuKey(inputSku)
          const dbNorm = normalizeSkuKey(p.sku_base)
          return levenshteinDistance(inputNorm, dbNorm) <= 3
        })

        if (versionMatch) {
          const marcaObj = versionMatch.cat_marcas as any
          productosMap[inputUpper] = {
            nombre: versionMatch.nombre || '',
            descripcion: versionMatch.descripcion || versionMatch.nombre || '',
            composicion: versionMatch.composicion || '',
            precio_usd: Number(versionMatch.precio_ec || 0),
            marca_id: versionMatch.marca_id || (marcaObj ? marcaObj.id : undefined),
            marca_nombre: marcaObj ? marcaObj.nombre : undefined,
            esVersionAnterior: true,
            skuHeredado: versionMatch.sku_base,
          }
        }
      }
    }

    return { success: true, productosMap }
  } catch (err: any) {
    console.error('Error al consultar datos de productos en BD:', err)
    return { success: false, error: err.message || 'Error al obtener datos de productos en BD' }
  }
}

// ═══════════════════════════════════════════════════════════════
// ASIGNAR PRODUCTO A CAJAS (EDITOR RÁPIDO)
// ═══════════════════════════════════════════════════════════════

export async function asignarProductoCajasAction(
  cajaIds: number[],
  productoId: number | null
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  if (
    !can(user, 'b2b_cajas', 'puede_editar') &&
    !can(user, 'b2b_cajas', 'puede_crear') &&
    !can(user, 'b2b_ordenes', 'puede_editar')
  ) {
    return { success: false, error: 'No tienes permisos para modificar cajas de producto.' }
  }

  if (!cajaIds || cajaIds.length === 0) {
    return { success: false, error: 'No se especificaron cajas para actualizar.' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('cajas_producto') as any)
    .update({ producto_id: productoId })
    .in('id', cajaIds)

  if (error) {
    console.error('Error en asignarProductoCajasAction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/(admin)/ordenes-b2b/cajas', 'page')
  revalidatePath('/(admin)/catalogo/[id]', 'page')

  return { success: true }
}

export async function buscarProductosParaCajaAction(
  query: string,
  limit = 25
): Promise<Array<{ id: number; sku_base: string; nombre: string | null; descripcion: string | null }>> {
  const supabase = await createClient()
  const cleanQ = query.trim()

  let q = supabase
    .from('productos')
    .select('id, sku_base, nombre, descripcion')
    .eq('activo', true)
    .limit(limit)

  if (cleanQ) {
    const term = `%${cleanQ}%`
    const termSlash = `%${cleanQ.replace(/-/g, '/')}%`
    const termHyphen = `%${cleanQ.replace(/\//g, '-')}%`
    q = q.or(
      `sku_base.ilike.${term},nombre.ilike.${term},sku_base.ilike.${termSlash},sku_base.ilike.${termHyphen}`
    )
  }

  const { data, error } = await q.order('sku_base', { ascending: true })

  if (error) {
    console.error('Error en buscarProductosParaCajaAction:', error)
    return []
  }

  return (data ?? []) as Array<{ id: number; sku_base: string; nombre: string | null; descripcion: string | null }>
}

export interface CatalogoColorOrdenRapida {
  id: number
  nombre: string
  codigo: string | null
  nombre_intern: string | null
}

/**
 * Catálogo de colores activos para el wizard de orden rápida (Fase 2):
 * match preview + modal de colores nuevos. Solo lectura.
 */
export async function obtenerColoresActivosAction(): Promise<{
  success: boolean
  colores: CatalogoColorOrdenRapida[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cat_colores')
      .select('id, nombre, codigo, nombre_intern')
      .eq('activo', true)
      .order('nombre', { ascending: true })
    if (error) {
      console.error('Error al obtener cat_colores:', error)
      return { success: false, colores: [], error: error.message }
    }
    return { success: true, colores: (data ?? []) as CatalogoColorOrdenRapida[] }
  } catch (error) {
    console.error('Error al obtener cat_colores:', error)
    return { success: false, colores: [], error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}


