// modules/ordenes-b2b/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'

export type ActionResult = {
  success: boolean
  error?: string
  id?: number
}

// ════════════════════════════════════════════════════════════
// CRUD ORDEN B2B
// ════════════════════════════════════════════════════════════

export async function crearOrdenB2BAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
  const proveedor_id = parseInt(formData.get('proveedor_id') as string)
  if (!proveedor_id) return { success: false, error: 'Proveedor obligatorio.' }

  const { data, error } = await supabase
    .from('ordenes_b2b')
    .insert({
      proveedor_id,
      cliente_b2b_id: parseInt(formData.get('cliente_b2b_id') as string) || null,
      contenedor_id: parseInt(formData.get('contenedor_id') as string) || null,
      folio_proveedor: (formData.get('folio_proveedor') as string)?.trim() || null,
      moneda: (formData.get('moneda') as string) || 'USD',
      tipo_cambio: parseFloat(formData.get('tipo_cambio') as string) || null,
      observaciones: (formData.get('observaciones') as string)?.trim() || null,
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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
  const id = parseInt(formData.get('orden_id') as string)
  if (!id) return { success: false, error: 'ID requerido.' }

  const { error } = await supabase
    .from('ordenes_b2b')
    .update({
      proveedor_id: parseInt(formData.get('proveedor_id') as string) || null,
      cliente_b2b_id: parseInt(formData.get('cliente_b2b_id') as string) || null,
      contenedor_id: parseInt(formData.get('contenedor_id') as string) || null,
      folio_proveedor: (formData.get('folio_proveedor') as string)?.trim() || null,
      moneda: (formData.get('moneda') as string) || 'USD',
      tipo_cambio: parseFloat(formData.get('tipo_cambio') as string) || null,
      observaciones: (formData.get('observaciones') as string)?.trim() || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ordenes-b2b')
  revalidatePath(`/ordenes-b2b/${id}`)
  return { success: true }
}

export async function cambiarEstadoOrdenAction(
  ordenId: number,
  nuevoEstado: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
  const orden_id = parseInt(formData.get('orden_id') as string)
  const producto_id = parseInt(formData.get('producto_id') as string)

  if (!orden_id || !producto_id) {
    return { success: false, error: 'Orden y producto requeridos.' }
  }

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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
  const id = parseInt(formData.get('detalle_id') as string)
  if (!id) return { success: false, error: 'ID de detalle requerido.' }

  const orden_id = parseInt(formData.get('orden_id') as string)
  if (!orden_id) return { success: false, error: 'ID de orden requerido.' }

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
// VINCULAR/DESVINCULAR CAJAS
// ════════════════════════════════════════════════════════════

export async function vincularCajaOrdenAction(
  ordenId: number,
  cajaId: number,
  cantidadCajas: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

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

export async function actualizarCantidadCajasOrdenAction(
  ordenId: number,
  cajaId: number,
  cantidadCajas: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

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
