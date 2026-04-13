// modules/contenedores/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { TRANSICIONES_CONTENEDOR } from '@/lib/constants'

export type ActionResult = {
  success: boolean
  error?: string
  id?: number
}

// ════════════════════════════════════════════════════════════
// CRUD CONTENEDORES
// ════════════════════════════════════════════════════════════

export async function crearContenedorAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const codigo = (formData.get('codigo_contenedor') as string)?.trim()
  if (!codigo) return { success: false, error: 'Código de contenedor obligatorio.' }

  const { data, error } = await supabase
    .from('contenedores')
    .insert({
      codigo_contenedor: codigo,
      numero_contenedor: (formData.get('numero_contenedor') as string)?.trim() || null,
      naviera: (formData.get('naviera') as string)?.trim() || null,
      numero_bl: (formData.get('numero_bl') as string)?.trim() || null,
      buque: (formData.get('buque') as string)?.trim() || null,
      puerto_origen: (formData.get('puerto_origen') as string)?.trim() || null,
      puerto_destino: (formData.get('puerto_destino') as string)?.trim() || null,
      fecha_etd: (formData.get('fecha_etd') as string) || null,
      fecha_eta: (formData.get('fecha_eta') as string) || null,
      peso_total_kg: parseFloat(formData.get('peso_total_kg') as string) || null,
      cbm_total: parseFloat(formData.get('cbm_total') as string) || null,
      estado: 'borrador',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El código "${codigo}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/contenedores')
  return { success: true, id: data.id }
}

export async function actualizarContenedorAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
  const id = parseInt(formData.get('contenedor_id') as string)
  if (!id) return { success: false, error: 'ID requerido.' }

  const { error } = await supabase
    .from('contenedores')
    .update({
      codigo_contenedor: (formData.get('codigo_contenedor') as string)?.trim(),
      numero_contenedor: (formData.get('numero_contenedor') as string)?.trim() || null,
      naviera: (formData.get('naviera') as string)?.trim() || null,
      numero_bl: (formData.get('numero_bl') as string)?.trim() || null,
      buque: (formData.get('buque') as string)?.trim() || null,
      puerto_origen: (formData.get('puerto_origen') as string)?.trim() || null,
      puerto_destino: (formData.get('puerto_destino') as string)?.trim() || null,
      fecha_etd: (formData.get('fecha_etd') as string) || null,
      fecha_eta: (formData.get('fecha_eta') as string) || null,
      peso_total_kg: parseFloat(formData.get('peso_total_kg') as string) || null,
      cbm_total: parseFloat(formData.get('cbm_total') as string) || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/contenedores')
  revalidatePath(`/contenedores/${id}`)
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CAMBIO DE ESTADO
// ════════════════════════════════════════════════════════════

export async function cambiarEstadoContenedorAction(
  contenedorId: number,
  nuevoEstado: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // Obtener estado actual
  const { data: cont } = await supabase
    .from('contenedores')
    .select('estado')
    .eq('id', contenedorId)
    .single()

  if (!cont) return { success: false, error: 'Contenedor no encontrado.' }

  const estadoActual = cont.estado as keyof typeof TRANSICIONES_CONTENEDOR
  const permitidas = estadoActual ? (TRANSICIONES_CONTENEDOR[estadoActual] ?? []) : []
  if (!permitidas.includes(nuevoEstado)) {
    return {
      success: false,
      error: `No se puede cambiar de "${cont.estado}" a "${nuevoEstado}".`,
    }
  }

  // Actualizar contenedor
  const { error } = await supabase
    .from('contenedores')
    .update({ estado: nuevoEstado })
    .eq('id', contenedorId)

  if (error) return { success: false, error: error.message }

  // Si cambia a en_bodega → marcar órdenes como Recibida
  if (nuevoEstado === 'en_bodega') {
    await supabase
      .from('ordenes_b2b')
      .update({ estado: 'Recibida' })
      .eq('contenedor_id', contenedorId)
      .neq('estado', 'Cancelada')
  }

  revalidatePath('/contenedores')
  revalidatePath(`/contenedores/${contenedorId}`)
  revalidatePath('/ordenes-b2b')
  return { success: true }
}
