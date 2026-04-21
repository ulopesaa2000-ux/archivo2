// modules/inventario/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import type { DraftNota, DraftProducto } from './types'

export type ActionResult = {
  success: boolean
  error?: string
  nota_id?: number
  numero_nota?: string
}

// ════════════════════════════════════════════════════════════
// CREAR NOTA (con productos — flujo atómico)
// ════════════════════════════════════════════════════════════

/**
 * Crea una nota completa: cabecera + detalles.
 * Si confirmar=true, además cambia estado a CONF.
 *
 * Flujo:
 * 1. sp_crear_nota → nota_id + numero_nota (estado PEND)
 * 2. sp_agregar_producto_nota × N (por cada producto del draft)
 * 3. Si confirmar → UPDATE estado_id = CONF → trigger hace todo
 */
export async function guardarNotaAction(
  draft: DraftNota,
  confirmar: boolean = false
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // ── Validaciones ────────────────────────────────────────
  if (!draft.tipo_movimiento_id) {
    return { success: false, error: 'Selecciona un tipo de movimiento.' }
  }
  if (!draft.bodega_origen_id) {
    return { success: false, error: 'Selecciona la bodega de origen.' }
  }
  if (draft.productos.length === 0) {
    return { success: false, error: 'Agrega al menos un producto.' }
  }

  // Validar requiere_destino
  const { data: tipoMov } = await supabase
    .from('cat_tipos_movimiento')
    .select('requiere_destino')
    .eq('id', draft.tipo_movimiento_id)
    .single()

  if (tipoMov?.requiere_destino && !draft.bodega_destino_id) {
    return { success: false, error: 'Este tipo de movimiento requiere bodega destino.' }
  }

  if (draft.bodega_destino_id && draft.bodega_origen_id === draft.bodega_destino_id) {
    return { success: false, error: 'La bodega origen y destino no pueden ser la misma.' }
  }

  // ── 1. Crear cabecera ───────────────────────────────────
  const { data: notaData, error: notaError } = await supabase.rpc('sp_crear_nota', {
    p_tipo_movimiento_id: draft.tipo_movimiento_id,
    p_bodega_origen_id: draft.bodega_origen_id,
    p_bodega_destino_id: draft.bodega_destino_id || (null as any),
    p_usuario_id: user.id,
    p_nota_referencia: draft.nota_referencia || (null as any),
    p_observaciones: draft.observaciones || (null as any),
  })

  if (notaError) {
    return { success: false, error: notaError.message }
  }

  // sp_crear_nota retorna TABLE(nota_id, numero_nota)
  const resultado = Array.isArray(notaData) ? notaData[0] : notaData
  const notaId = resultado?.nota_id
  const numeroNota = resultado?.numero_nota

  if (!notaId) {
    return { success: false, error: 'No se pudo crear la nota.' }
  }

  // ── 2. Agregar productos ────────────────────────────────
  for (const prod of draft.productos) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: prod.cajas,
      p_variante_id: undefined,
      p_producto_id: prod.producto_id,
      p_piezas_sueltas: prod.piezas_sueltas,
      p_caja_id: prod.caja_id || undefined,
    })

    if (prodError) {
      // Si falla un producto, la nota ya se creó en PEND
      // El usuario puede editarla después
      return {
        success: false,
        error: `Error al agregar ${prod.producto_sku}: ${prodError.message}`,
        nota_id: notaId,
        numero_nota: numeroNota,
      }
    }
  }

  // ── 3. Confirmar si se solicitó ─────────────────────────
  if (confirmar) {
    const confirmResult = await confirmarNotaAction(notaId)
    if (!confirmResult.success) {
      return {
        success: false,
        error: confirmResult.error,
        nota_id: notaId,
        numero_nota: numeroNota,
      }
    }
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/stock')

  return {
    success: true,
    nota_id: notaId,
    numero_nota: numeroNota,
  }
}

// ════════════════════════════════════════════════════════════
// ACTUALIZAR NOTA EXISTENTE (PEND/PROC)
// ════════════════════════════════════════════════════════════

/**
 * Actualiza una nota existente en PEND o PROC.
 *
 * Flujo:
 * 1. Valida que la nota esté en estado editable
 * 2. Actualiza cabecera (observaciones, referencia)
 * 3. BORRA todos los detalles existentes
 * 4. Re-inserta desde el draft local
 * 5. Si confirmar → UPDATE estado a CONF
 *
 * Los triggers de total_cajas recalculan automáticamente.
 */
export async function actualizarNotaAction(
  notaId: number,
  draft: DraftNota,
  confirmar: boolean = false
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // Verificar que la nota esté en estado editable
  const { data: nota } = await supabase
    .from('notas_inventario')
    .select(`
      id, estado_id,
      estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo )
    `)
    .eq('id', notaId)
    .single()

  if (!nota) return { success: false, error: 'Nota no encontrada.' }

  const estadoCodigo = Array.isArray((nota as any).estado)
    ? (nota as any).estado[0]?.codigo
    : (nota as any).estado?.codigo

  if (estadoCodigo !== 'PEND' && estadoCodigo !== 'PROC') {
    return { success: false, error: 'Solo se pueden editar notas en estado Pendiente o En Proceso.' }
  }

  if (draft.productos.length === 0) {
    return { success: false, error: 'Agrega al menos un producto.' }
  }

  // ── 1. Actualizar cabecera ──────────────────────────────
  const { error: updateError } = await supabase
    .from('notas_inventario')
    .update({
      nota_referencia: draft.nota_referencia || null,
      observaciones: draft.observaciones || null,
    })
    .eq('id', notaId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // ── 2. Borrar detalles existentes ───────────────────────
  const { error: deleteError } = await supabase
    .from('nota_detalle_productos')
    .delete()
    .eq('nota_id', notaId)

  if (deleteError) {
    return { success: false, error: `Error al limpiar detalles: ${deleteError.message}` }
  }

  // ── 3. Re-insertar desde draft ──────────────────────────
  for (const prod of draft.productos) {
    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: prod.cajas,
      p_variante_id: undefined,
      p_producto_id: prod.producto_id,
      p_piezas_sueltas: prod.piezas_sueltas,
      p_caja_id: prod.caja_id || undefined,
    })

    if (prodError) {
      return { success: false, error: `Error al agregar ${prod.producto_sku}: ${prodError.message}` }
    }
  }

  // ── 4. Confirmar si se solicitó ─────────────────────────
  if (confirmar) {
    const confirmResult = await confirmarNotaAction(notaId)
    if (!confirmResult.success) {
      return { success: false, error: confirmResult.error }
    }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)
  revalidatePath('/inventario/stock')

  return { success: true, nota_id: notaId }
}

// ════════════════════════════════════════════════════════════
// CONFIRMAR NOTA
// ════════════════════════════════════════════════════════════

/**
 * Cambia estado a CONF.
 * El trigger fn_procesar_nota_inventario hace todo:
 * - Valida stock para salidas/transferencias
 * - Actualiza inventario_stock
 * - Registra auditoría
 * - Registra historial
 * - Actualiza fecha_confirmacion
 *
 * Si el trigger lanza error (stock insuficiente),
 * capturamos el mensaje y lo retornamos al frontend.
 */
export async function confirmarNotaAction(
  notaId: number
): Promise<ActionResult> {
  const supabase = await createClient()

  // Obtener ID del estado CONF
  const { data: estadoConf } = await supabase
    .from('cat_estados_nota')
    .select('id')
    .eq('codigo', 'CONF')
    .single()

  if (!estadoConf) {
    return { success: false, error: 'No se encontró el estado CONF en catálogo.' }
  }

  const { error } = await supabase
    .from('notas_inventario')
    .update({ estado_id: estadoConf.id })
    .eq('id', notaId)

  if (error) {
    // El trigger puede lanzar "Stock insuficiente para producto X..."
    return { success: false, error: error.message }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)
  revalidatePath('/inventario/stock')

  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CANCELAR NOTA
// ════════════════════════════════════════════════════════════

export async function cancelarNotaAction(
  notaId: number,
  motivo?: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('sp_cancelar_nota', {
    p_nota_id: notaId,
    p_usuario_id: user.id,
    p_motivo: motivo || (null as any),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)

  return { success: true }
}

// ════════════════════════════════════════════════════════════
// CRUD BODEGAS
// ════════════════════════════════════════════════════════════

export async function crearBodegaAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const codigo = (formData.get('codigo') as string)?.trim()
  const nombre = (formData.get('nombre') as string)?.trim()

  if (!codigo || !nombre) {
    return { success: false, error: 'Código y nombre son obligatorios.' }
  }

  const { data, error } = await supabase
    .from('bodegas')
    .insert({
      codigo,
      nombre,
      direccion: (formData.get('direccion') as string)?.trim() || null,
      ciudad: (formData.get('ciudad') as string)?.trim() || null,
      telefono: (formData.get('telefono') as string)?.trim() || null,
      es_virtual: formData.get('es_virtual') === 'true',
      activa: formData.get('activa') !== 'false',
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: `El código "${codigo}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}

export async function actualizarBodegaAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()
  const id = parseInt(formData.get('bodega_id') as string)

  if (!id) return { success: false, error: 'ID de bodega requerido.' }

  const { error } = await supabase
    .from('bodegas')
    .update({
      codigo: (formData.get('codigo') as string)?.trim(),
      nombre: (formData.get('nombre') as string)?.trim(),
      direccion: (formData.get('direccion') as string)?.trim() || null,
      ciudad: (formData.get('ciudad') as string)?.trim() || null,
      telefono: (formData.get('telefono') as string)?.trim() || null,
      es_virtual: formData.get('es_virtual') === 'true',
      activa: formData.get('activa') !== 'false',
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}

// ════════════════════════════════════════════════════════════
// ASIGNACIÓN DE USUARIOS A BODEGAS
// ════════════════════════════════════════════════════════════

export async function asignarUsuarioBodegaAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const bodega_id = parseInt(formData.get('bodega_id') as string)
  const usuario_id = parseInt(formData.get('usuario_id') as string)

  if (!bodega_id || !usuario_id) {
    return { success: false, error: 'Bodega y usuario son requeridos.' }
  }

  const { error } = await supabase
    .from('usuario_bodegas')
    .upsert({
      bodega_id,
      usuario_id,
      puede_consultar: formData.get('puede_consultar') === 'true',
      puede_crear_notas: formData.get('puede_crear_notas') === 'true',
      puede_confirmar_notas: formData.get('puede_confirmar_notas') === 'true',
      puede_transferir: formData.get('puede_transferir') === 'true',
    }, {
      onConflict: 'usuario_id,bodega_id',
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}

export async function eliminarUsuarioBodegaAction(
  asignacionId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('usuario_bodegas')
    .delete()
    .eq('id', asignacionId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}
