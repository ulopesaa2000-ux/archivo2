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

  // Eliminar detalles y cajas vinculadas para evitar errores de integridad referencial
  await supabase.from('ordenes_b2b_detalles').delete().eq('orden_id', id)
  await supabase.from('orden_cajas').delete().eq('orden_id', id)

  const { error } = await supabase
    .from('ordenes_b2b')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ordenes-b2b')
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
    .select('id, sku_base')

  const dbProductsList = (existingProds || []).map((p: any) => ({ id: p.id, sku_base: String(p.sku_base) }))
  const prodIdMap = new Map<string, number>()

  for (const p of payload.productos) {
    const sku = String(p.sku_base).trim()
    if (p.force_new) continue
    const match = findBestDbSkuMatch(sku, dbProductsList, provNombre)
    if (match) {
      prodIdMap.set(sku.toUpperCase(), match.dbId)
      prodIdMap.set(match.dbSku.toUpperCase(), match.dbId)
    }
  }

  for (const p of payload.productos) {
    const sku = String(p.sku_base).trim()
    const skuUpper = sku.toUpperCase()
    let prodId = p.force_new ? null : prodIdMap.get(skuUpper)

    if (prodId) {
      // Actualizar descripción si ya existe
      const { error: updErr } = await supabase
        .from('productos')
        .update({
          descripcion: p.descripcion || null,
          composicion: p.composicion || null,
          nombre: p.nombre || p.descripcion || sku,
          marca_id: p.marca_id || null
        })
        .eq('id', prodId)

      if (updErr) {
        return { success: false, error: `Error al actualizar producto ${sku}: ${updErr.message}` }
      }
    } else {
      // Insertar nuevo producto
      const { data: newProd, error: insErr } = await supabase
        .from('productos')
        .insert({
          sku_base: sku,
          nombre: p.nombre || p.descripcion || sku,
          descripcion: p.descripcion || null,
          composicion: p.composicion || null,
          marca_id: p.marca_id || null,
          cliente_b2b_id: payload.clienteB2bId,
          activo: true,
          estado: 'pendiente'
        })
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
        let colorId = findColorId(stdColor) || findColorId(rawColor)

        if (!colorId) {
          colorId = coloresList[0]?.id || 1 // Fallback al primer id de cat_colores (id: 1 Negro)
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
function findBestDbSkuMatch(
  inputSku: string,
  dbProducts: { id: number; sku_base: string }[],
  proveedorNombre?: string,
): { dbSku: string; dbId: number } | null {
  const inputClean = inputSku.trim()
  if (!inputClean) return null

  const isMoti = isMotiSupplier(proveedorNombre)
  const inputUpper = inputClean.toUpperCase()
  const inputNorm = normalizeSkuKey(inputClean)
  const inputTokens = extractSkuTokens(inputClean)
  const inputAndToken = extractAndToken(inputClean)

  let bestMatch: { dbSku: string; dbId: number } | null = null
  let highestScore = 0

  for (const p of dbProducts) {
    const dbSku = p.sku_base
    const dbUpper = dbSku.toUpperCase()
    const dbNorm = normalizeSkuKey(dbSku)
    const dbAndToken = extractAndToken(dbSku)

    // 1. Coincidencia exacta
    if (inputUpper === dbUpper) {
      return { dbSku, dbId: p.id }
    }

    let score = 0

    if (isMoti) {
      // Regla MOTI 1: Si el SKU de entrada posee un patrón AND#####
      if (inputAndToken) {
        if (dbAndToken && inputAndToken === dbAndToken) {
          // El AND coincide exactamente (ej: AND230012 === AND230012)
          score = 98
        } else {
          // Si el input tiene AND y la entrada de la BD tiene un AND distinto,
          // se trata de un producto NUEVO de MOTI. Previene falso positivo con códigos secundarios (3VT/1AK/3JA).
          continue
        }
      } else {
        // Regla MOTI 2: El SKU de entrada no trae token AND (solo viene 3VT..., 1AK..., 3JA...)
        if (inputNorm === dbNorm) {
          score = 90
        } else {
          const dbTokens = extractSkuTokens(dbSku)
          const hasMatchingToken = inputTokens.some((it) => dbTokens.includes(it))
          if (hasMatchingToken) {
            score = 85
          }
        }
      }
    } else {
      // Proveedores estándar (no MOTI)
      if (inputNorm === dbNorm) {
        score = 90
      } else {
        const dbTokens = extractSkuTokens(dbSku)
        const hasMatchingToken = inputTokens.some((it) => dbTokens.includes(it))
        if (hasMatchingToken) {
          score = 80
        } else if (inputNorm.length >= 4 && dbNorm.length >= 4) {
          if (dbNorm.includes(inputNorm) || inputNorm.includes(dbNorm)) {
            score = 70
          }
        } else if (inputNorm.length >= 5 && dbNorm.length >= 5) {
          const dist = levenshteinDistance(inputNorm, dbNorm)
          if (dist <= 2) {
            score = 60
          }
        }
      }
    }

    if (score > highestScore) {
      highestScore = score
      bestMatch = { dbSku, dbId: p.id }
    }
  }

  return highestScore >= 60 ? bestMatch : null
}

export async function verificarSkusEnBDAction(
  skus: string[],
  proveedorNombre?: string,
): Promise<{
  success: boolean
  skusExistentes: string[]
  skuMap: Record<string, string>
}> {
  if (!skus || skus.length === 0) return { success: true, skusExistentes: [], skuMap: {} }
  const supabase = await createClient()
  const cleanSkus = Array.from(new Set(skus.map((s) => String(s).trim()).filter(Boolean)))
  if (cleanSkus.length === 0) return { success: true, skusExistentes: [], skuMap: {} }

  const { data: dbData, error } = await supabase
    .from('productos')
    .select('id, sku_base')

  if (error || !dbData) {
    console.error('Error al verificar SKUs en BD:', error)
    return { success: false, skusExistentes: [], skuMap: {} }
  }

  const dbProducts = dbData.map((p: any) => ({ id: p.id, sku_base: String(p.sku_base) }))
  const skusExistentes: string[] = []
  const skuMap: Record<string, string> = {}

  for (const inputSku of cleanSkus) {
    const match = findBestDbSkuMatch(inputSku, dbProducts, proveedorNombre)
    if (match) {
      skusExistentes.push(inputSku)
      skuMap[inputSku.toUpperCase()] = match.dbSku
    }
  }

  return { success: true, skusExistentes, skuMap }
}

export async function obtenerDatosProductosDeBDAction(
  skus: string[],
): Promise<{
  success: boolean
  productosMap?: Record<string, {
    id: number
    nombre?: string
    descripcion?: string
    composicion?: string
    precio_usd?: number
    marca_id?: number
    marca_nombre?: string
  }>
  error?: string
}> {
  try {
    if (!skus || skus.length === 0) return { success: true, productosMap: {} }
    const supabase = await createClient()

    const cleanSkus = Array.from(new Set(skus.map((s) => String(s).trim()).filter(Boolean)))
    if (cleanSkus.length === 0) return { success: true, productosMap: {} }

    const { data, error } = await supabase
      .from('productos')
      .select(`
        id,
        sku_base,
        nombre,
        descripcion,
        composicion,
        precio_ec,
        marca_id,
        cat_marcas (
          id,
          nombre
        )
      `)
      .in('sku_base', cleanSkus)

    if (error) throw error

    const productosMap: Record<string, {
      id: number
      nombre?: string
      descripcion?: string
      composicion?: string
      precio_usd?: number
      marca_id?: number
      marca_nombre?: string
    }> = {}

    for (const p of data || []) {
      const skuKey = String(p.sku_base).trim().toUpperCase()
      const marcaObj = p.cat_marcas as any
      productosMap[skuKey] = {
        id: p.id,
        nombre: p.nombre || '',
        descripcion: p.descripcion || p.nombre || '',
        composicion: p.composicion || '',
        precio_usd: Number(p.precio_ec || 0),
        marca_id: p.marca_id || (marcaObj ? marcaObj.id : undefined),
        marca_nombre: marcaObj ? marcaObj.nombre : undefined,
      }
    }

    return { success: true, productosMap }
  } catch (err: any) {
    console.error('Error al consultar datos de productos en BD:', err)
    return { success: false, error: err.message || 'Error al obtener datos de productos en BD' }
  }
}

