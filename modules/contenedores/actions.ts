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
// SURTIR CONTENEDOR → BODEGA VIRTUAL
// ════════════════════════════════════════════════════════════

/**
 * Convierte las cajas del contenedor en stock de la bodega virtual.
 * 1. Agrupa productos de todas las órdenes del contenedor
 * 2. Crea una NOTA de ENTRADA para la bodega virtual
 * 3. Confirma la nota → trigger suma stock en inventario_stock
 * 4. Cambia estado del contenedor a 'surtido'
 */
export async function surtirContenedorAction(
  contenedorId: number,
  bodegaVirtualId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // 1. Validar contenedor
  const { data: cont } = await supabase
    .from('contenedores')
    .select('estado, codigo_contenedor')
    .eq('id', contenedorId)
    .single()

  if (!cont) return { success: false, error: 'Contenedor no encontrado.' }
  if (cont.estado !== 'en_bodega') {
    return { success: false, error: 'El contenedor debe estar en "En Bodega" para surtir.' }
  }

  // 2. Obtener órdenes del contenedor
  const { data: ordenes } = await supabase
    .from('ordenes_b2b')
    .select('id')
    .eq('contenedor_id', contenedorId)
    .neq('estado', 'Cancelada')

  if (!ordenes || ordenes.length === 0) {
    return { success: false, error: 'El contenedor no tiene órdenes vinculadas.' }
  }

  const ordenIds = ordenes.map(o => o.id)

  // 3. Obtener detalles agrupados por producto_id
  const { data: detalles } = await supabase
    .from('ordenes_b2b_detalles')
    .select('producto_id, cajas_pedidas, piezas_pedidas')
    .in('orden_id', ordenIds)

  if (!detalles || detalles.length === 0) {
    return { success: false, error: 'No se encontraron productos en las órdenes.' }
  }

  const productosMap = new Map<number, { cajas: number; piezas: number }>()
  for (const det of detalles) {
    const pid = det.producto_id
    if (!pid) continue
    const prev = productosMap.get(pid) ?? { cajas: 0, piezas: 0 }
    productosMap.set(pid, {
      cajas: prev.cajas + Number(det.cajas_pedidas ?? 0),
      piezas: prev.piezas + Number(det.piezas_pedidas ?? 0),
    })
  }

  // 4. Obtener tipo movimiento ENT
  const { data: tipoEnt } = await supabase
    .from('cat_tipos_movimiento')
    .select('id')
    .eq('codigo', 'ENT')
    .single()

  if (!tipoEnt) {
    return { success: false, error: 'No se encontró el tipo de movimiento ENT en catálogo.' }
  }

  // 5. Crear nota ENTRADA
  const fechaRef = new Date().toISOString().slice(0, 10)
  const { data: notaData, error: notaError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: tipoEnt.id,
    p_bodega_origen_id: bodegaVirtualId,
    p_bodega_destino_id: null as any,
    p_usuario_id: user.id,
    p_nota_referencia: `Surtido contenedor ${cont.codigo_contenedor}`,
    p_observaciones: `Surtido automático. ${productosMap.size} productos, ${fechaRef}`,
  }) as { data: any; error: any }

  if (notaError) {
    return { success: false, error: `Error al crear nota: ${notaError.message}` }
  }

  const resultado = Array.isArray(notaData) ? notaData[0] : notaData
  const notaId = resultado?.nota_id

  if (!notaId) {
    return { success: false, error: 'No se pudo crear la nota de entrada.' }
  }

  // 6. Agregar productos
  for (const [productoId, prod] of productosMap) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: prod.cajas,
      p_producto_id: productoId,
      p_variante_id: undefined,
      p_piezas_sueltas: prod.piezas,
      p_caja_id: undefined,
    })
    if (prodError) {
      return { success: false, error: `Error al agregar producto ID ${productoId}: ${prodError.message}` }
    }
  }

  // 7. Confirmar nota (CONF) → trigger suma stock
  const { data: estadoConf } = await supabase
    .from('cat_estados_nota')
    .select('id')
    .eq('codigo', 'CONF')
    .single()

  if (estadoConf) {
    const { error: confError } = await supabase
      .from('notas_inventario')
      .update({ estado_id: estadoConf.id })
      .eq('id', notaId)

    if (confError) {
      return { success: false, error: `Nota creada pero error al confirmar: ${confError.message}` }
    }
  }

  // 8. Cambiar estado del contenedor
  const { error: updError } = await supabase
    .from('contenedores')
    .update({ estado: 'surtido' })
    .eq('id', contenedorId)

  if (updError) {
    return { success: false, error: updError.message }
  }

  revalidatePath('/contenedores')
  revalidatePath(`/contenedores/${contenedorId}`)
  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return { success: true, id: contenedorId }
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

// ════════════════════════════════════════════════════════════
// VINCULAR / DESVINCULAR ÓRDENES DEL CONTENEDOR
// ════════════════════════════════════════════════════════════

export async function vincularOrdenContenedorAction(
  contenedorId: number,
  ordenId: number,
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('ordenes_b2b')
    .update({ contenedor_id: contenedorId })
    .eq('id', ordenId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/contenedores/${contenedorId}`)
  revalidatePath('/ordenes-b2b')
  return { success: true }
}

export async function desvincularOrdenContenedorAction(
  ordenId: number,
  contenedorId: number,
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('ordenes_b2b')
    .update({ contenedor_id: null })
    .eq('id', ordenId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/contenedores/${contenedorId}`)
  revalidatePath('/ordenes-b2b')
  return { success: true }
}
