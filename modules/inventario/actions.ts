// modules/inventario/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from './permissions'
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
  confirmar: boolean = false,
  propuestaId?: string
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

  // ── Validar permisos dinámicos ───────────────────────────
  const permCrear = await can(user, 'crear_nota', { bodegaOrigenId: draft.bodega_origen_id })
  if (!permCrear.ok) {
    return { success: false, error: permCrear.motivo }
  }

  if (confirmar) {
    const permConfirmar = await can(user, 'confirmar_nota', {
      bodegaOrigenId: draft.bodega_origen_id,
      bodegaDestinoId: draft.bodega_destino_id || undefined,
    })
    if (!permConfirmar.ok) {
      return { success: false, error: permConfirmar.motivo }
    }
  }

  if (draft.productos.length === 0) {
    return { success: false, error: 'Agrega al menos un producto.' }
  }

  // Validar requiere_destino y restricción de tipo para roles no-admin
  const { data: tipoMov } = await supabase
    .from('cat_tipos_movimiento')
    .select('codigo, requiere_destino')
    .eq('id', draft.tipo_movimiento_id)
    .single()

  if (user.rol && user.rol.nivel_acceso > 2) {
    if (tipoMov?.codigo === 'AJU' || tipoMov?.codigo === 'DEV') {
      return {
        success: false,
        error: 'Los tipos de movimiento Ajuste y Devolución están reservados exclusivamente para administradores.',
      }
    }
  }

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

  // Guardar costo total y fecha_nota
  const updateCabeceraPayload: Record<string, any> = {}
  if (draft.costo_total !== undefined && draft.costo_total !== null) {
    updateCabeceraPayload.costo_total = draft.costo_total
  }
  if (draft.fecha_nota) {
    updateCabeceraPayload.fecha_nota = draft.fecha_nota.includes('T')
      ? draft.fecha_nota
      : `${draft.fecha_nota}T00:00:00.000Z`
  }
  if (Object.keys(updateCabeceraPayload).length > 0) {
    await supabase
      .from('notas_inventario')
      .update(updateCabeceraPayload as any)
      .eq('id', notaId)
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

  // Vincular propuesta de OCR
  if (propuestaId) {
    const { error: linkError } = await (supabase as any)
      .from('nota_ocr_propuestas')
      .update({
        estado: 'REVISADO',
        nota_id: notaId,
        revisado_por: user.id,
        revisado_en: new Date().toISOString(),
      })
      .eq('id', propuestaId)
    if (linkError) {
      console.error('Error linking proposal:', linkError)
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
      id, estado_id, bodega_origen_id, bodega_destino_id, usuario_id,
      nota_referencia, observaciones, costo_total,
      estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo )
    `)
    .eq('id', notaId)
    .single()

  if (!nota) return { success: false, error: 'Nota no encontrada.' }

  // ── Validar permisos de bodega si es nivel 3+ ───────────
  if (user.rol && user.rol.nivel_acceso >= 3) {
    if (confirmar) {
      return { success: false, error: 'No tienes permisos para confirmar notas. Esta acción está reservada para administradores.' }
    }

    const esCreador = nota.usuario_id === user.id
    const esEncargado = user.rol?.nombre === 'Encargado de Bodega'
    const esTransferencia = nota.bodega_destino_id !== null

    if (!esCreador) {
      if (esEncargado && esTransferencia) {
        // En notas ajenas de transferencia, el Encargado sólo puede editar la bodega destino.
        // Validar que no se modifiquen otros campos de la cabecera.
        if (
          draft.nota_referencia !== (nota.nota_referencia || '') ||
          draft.observaciones !== (nota.observaciones || '')
        ) {
          return { success: false, error: 'Como Encargado, en notas ajenas solo puedes modificar la bodega de destino.' }
        }

        // Comprobar que los productos/cantidades del draft coincidan exactamente con los detalles originales
        const { data: detallesOriginales } = await supabase
          .from('nota_detalle_productos')
          .select('producto_id, variante_id, cajas, piezas_sueltas, caja_id')
          .eq('nota_id', notaId)

        const originalKeyMap = new Map(
          detallesOriginales?.map(d => [
            `${d.producto_id}-${d.caja_id}`,
            { cajas: d.cajas, piezas_sueltas: d.piezas_sueltas }
          ]) || []
        )

        if (draft.productos.length !== (detallesOriginales?.length ?? 0)) {
          return { success: false, error: 'Como Encargado, en notas ajenas no puedes alterar los productos de la nota.' }
        }

        for (const p of draft.productos) {
          const key = `${p.producto_id}-${p.caja_id}`
          const orig = originalKeyMap.get(key)
          if (!orig || orig.cajas !== p.cajas || orig.piezas_sueltas !== p.piezas_sueltas) {
            return { success: false, error: 'Como Encargado, en notas ajenas no puedes alterar las cantidades de productos.' }
          }
        }

        // Validar que el Encargado tenga acceso a la nueva bodega de destino (draft.bodega_destino_id)
        if (draft.bodega_destino_id) {
          const { data: permDest } = await supabase
            .from('usuario_bodegas')
            .select('puede_crear_notas, puede_consultar')
            .eq('usuario_id', user.id)
            .eq('bodega_id', draft.bodega_destino_id)
            .single()

          if (!permDest) {
            return { success: false, error: 'No tienes permisos asignados sobre la bodega de destino seleccionada.' }
          }
        }
      } else {
        return { success: false, error: 'Solo puedes editar notas creadas por ti mismo.' }
      }
    } else {
      // Si es el creador, validar que tenga permisos para crear notas en la bodega de origen
      const { data: perm } = await supabase
        .from('usuario_bodegas')
        .select('puede_crear_notas')
        .eq('usuario_id', user.id)
        .eq('bodega_id', (nota as any).bodega_origen_id)
        .single()

      if (!perm || !perm.puede_crear_notas) {
        return { success: false, error: 'No tienes permiso para editar notas en esta bodega.' }
      }
    }
  }

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
  const updateCabPayload: Record<string, any> = {
    nota_referencia: draft.nota_referencia || null,
    observaciones: draft.observaciones || null,
    costo_total: draft.costo_total || 0,
    bodega_destino_id: draft.bodega_destino_id || null,
  }
  if (draft.fecha_nota) {
    updateCabPayload.fecha_nota = draft.fecha_nota.includes('T')
      ? draft.fecha_nota
      : `${draft.fecha_nota}T00:00:00.000Z`
  }

  const { error: updateError } = await supabase
    .from('notas_inventario')
    .update(updateCabPayload as any)
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
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // ── Validar permisos dinámicos ───────────────────────────
  const permCheck = await can(user, 'confirmar_nota', { notaId })
  if (!permCheck.ok) {
    return { success: false, error: permCheck.motivo ?? 'No tienes permisos para confirmar esta nota.' }
  }

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

  // ── Validar permisos de nivel 3+ en cancelación ───────────
  if (user.rol && user.rol.nivel_acceso >= 3) {
    const { data: nota } = await supabase
      .from('notas_inventario')
      .select('usuario_id, estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo )')
      .eq('id', notaId)
      .single()

    if (!nota) return { success: false, error: 'Nota no encontrada.' }

    if (nota.usuario_id !== user.id) {
      return { success: false, error: 'Solo puedes cancelar notas creadas por ti mismo.' }
    }

    const estadoCodigo = Array.isArray((nota as any).estado)
      ? (nota as any).estado[0]?.codigo
      : (nota as any).estado?.codigo

    if (estadoCodigo !== 'PEND' && estadoCodigo !== 'PROC') {
      return { success: false, error: 'Solo puedes cancelar notas que estén en estado Pendiente o En Proceso.' }
    }
  }

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
  revalidatePath('/inventario/stock')

  return { success: true }
}

/**
 * Cambia el estado de una nota de forma atómica.
 * No intenta procesar stock a menos que el estado sea CONF.
 */
export async function cambiarEstadoNotaAction(
  notaId: number,
  nuevoEstadoId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // ── Validar permisos de nivel 3+ en cambio de estado ───────────
  if (user.rol && user.rol.nivel_acceso >= 3) {
    const { data: nota } = await supabase
      .from('notas_inventario')
      .select('usuario_id, estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo )')
      .eq('id', notaId)
      .single()

    if (!nota) return { success: false, error: 'Nota no encontrada.' }

    if (nota.usuario_id !== user.id) {
      return { success: false, error: 'Solo puedes cambiar el estado de notas creadas por ti mismo.' }
    }

    const estadoCodigo = Array.isArray((nota as any).estado)
      ? (nota as any).estado[0]?.codigo
      : (nota as any).estado?.codigo

    if (estadoCodigo !== 'PEND' && estadoCodigo !== 'PROC') {
      return { success: false, error: 'Solo puedes modificar notas que estén en estado Pendiente o En Proceso.' }
    }

    // Verificar que el nuevo estado no sea CONF
    const { data: nuevoEstado } = await supabase
      .from('cat_estados_nota')
      .select('codigo')
      .eq('id', nuevoEstadoId)
      .single()

    if (nuevoEstado?.codigo === 'CONF') {
      return { success: false, error: 'No tienes permisos para confirmar notas. Esta acción está reservada para administradores.' }
    }
  }

  const { error } = await supabase
    .from('notas_inventario')
    .update({ 
      estado_id: nuevoEstadoId,
      usuario_id: user.id // Opcional: registrar quién hizo el último cambio
    })
    .eq('id', notaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)
  revalidatePath('/inventario/stock')

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

  const { data: nuevaBodega, error } = await (supabase.from('bodegas') as any)
    .insert({
      codigo,
      nombre,
      direccion: (formData.get('direccion') as string)?.trim() || null,
      ciudad: (formData.get('ciudad') as string)?.trim() || null,
      telefono: (formData.get('telefono') as string)?.trim() || null,
      es_virtual: formData.get('es_virtual') === 'true',
      es_matriz: formData.get('es_matriz') === 'true',
      activa: formData.get('activa') !== 'false',
    })
    .select('id, ciudad, es_matriz')
    .single()

  if (error) {
    if (error.code === '23505') {
      const errorStr = `${error.message || ''} ${error.details || ''}`.toLowerCase()
      const isCodeDup = errorStr.includes('codigo') || errorStr.includes('key (codigo)')
      if (isCodeDup) {
        return { success: false, error: `El código "${codigo}" ya existe.` }
      }
      return { success: false, error: `Error de duplicidad (Llave primaria desincronizada): ${error.message}` }
    }
    return { success: false, error: error.message }
  }

  // Si se marcó como matriz y tiene ciudad, desmarcar otras bodegas en la misma ciudad
  if (nuevaBodega?.es_matriz && nuevaBodega.ciudad) {
    await (supabase.from('bodegas') as any)
      .update({ es_matriz: false })
      .eq('ciudad', nuevaBodega.ciudad)
      .neq('id', nuevaBodega.id)
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
  const es_matriz = formData.get('es_matriz') === 'true'
  const ciudad = (formData.get('ciudad') as string)?.trim() || null

  if (!id) return { success: false, error: 'ID de bodega requerido.' }

  const { error } = await (supabase.from('bodegas') as any)
    .update({
      codigo: (formData.get('codigo') as string)?.trim(),
      nombre: (formData.get('nombre') as string)?.trim(),
      direccion: (formData.get('direccion') as string)?.trim() || null,
      ciudad,
      telefono: (formData.get('telefono') as string)?.trim() || null,
      es_virtual: formData.get('es_virtual') === 'true',
      es_matriz,
      activa: formData.get('activa') !== 'false',
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      const codigo = (formData.get('codigo') as string)?.trim()
      return { success: false, error: `El código "${codigo}" ya existe.` }
    }
    return { success: false, error: error.message }
  }

  // Si se marcó como matriz y tiene ciudad, desmarcar cualquier otra bodega en la misma ciudad
  if (es_matriz && ciudad) {
    await (supabase.from('bodegas') as any)
      .update({ es_matriz: false })
      .eq('ciudad', ciudad)
      .neq('id', id)
  }

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

  // ── Validaciones de seguridad por Rol ────────────────────
  if (user.rol?.nombre === 'Bodeguero') {
    return { success: false, error: 'Los bodegueros no tienen permiso para asignar usuarios.' }
  }

  if (user.rol?.nombre === 'Encargado de Bodega') {
    // 1. Validar que la bodega a asignar sea una de sus bodegas autorizadas
    const { data: permisoPropio } = await supabase
      .from('usuario_bodegas')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('bodega_id', bodega_id)
      .maybeSingle()

    if (!permisoPropio) {
      return { success: false, error: 'Solo tienes permiso para administrar usuarios en las bodegas que tienes asignadas.' }
    }

    // 2. Validar que el usuario a asociar sea de rol Bodeguero
    const { data: usuarioAsociado, error: userErr } = await supabase
      .from('usuarios')
      .select(`
        id,
        rol:roles!usuarios_rol_id_fkey ( nombre )
      `)
      .eq('id', usuario_id)
      .single()

    if (userErr || !usuarioAsociado) {
      return { success: false, error: 'Usuario a asociar no encontrado.' }
    }

    const rolNombreAsociado = Array.isArray((usuarioAsociado as any).rol)
      ? (usuarioAsociado as any).rol[0]?.nombre
      : (usuarioAsociado as any).rol?.nombre

    if (rolNombreAsociado !== 'Bodeguero') {
      return { success: false, error: 'Como Encargado de Bodega, solo tienes permiso para asignar usuarios con el rol Bodeguero.' }
    }
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

  // Evitar auto-eliminación de permisos de bodega propia
  const { data: targetAsignacion } = await supabase
    .from('usuario_bodegas')
    .select('usuario_id')
    .eq('id', asignacionId)
    .maybeSingle()

  if (targetAsignacion && targetAsignacion.usuario_id === user.id) {
    return { success: false, error: 'No puedes eliminar tus propios permisos de esta bodega.' }
  }

  const { error } = await supabase
    .from('usuario_bodegas')
    .delete()
    .eq('id', asignacionId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}

/**
 * Asigna un usuario a TODAS las bodegas de una ciudad/zona específica en lote.
 */
export async function asignarUsuarioZonaAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const ciudad = (formData.get('ciudad') as string)?.trim()
  const usuario_id = parseInt(formData.get('usuario_id') as string)
  const puede_consultar = formData.get('puede_consultar') === 'true'
  const puede_crear_notas = formData.get('puede_crear_notas') === 'true'
  const puede_confirmar_notas = formData.get('puede_confirmar_notas') === 'true'
  const puede_transferir = formData.get('puede_transferir') === 'true'

  if (!ciudad || !usuario_id) {
    return { success: false, error: 'Ciudad/Zona y usuario son requeridos.' }
  }

  // Obtener todas las bodegas activas de esa ciudad
  const { data: bodegasZona, error: fetchErr } = await supabase
    .from('bodegas')
    .select('id')
    .eq('ciudad', ciudad)
    .eq('activa', true)

  if (fetchErr || !bodegasZona || bodegasZona.length === 0) {
    return { success: false, error: `No se encontraron bodegas activas en la ciudad/zona "${ciudad}".` }
  }

  const upserts = bodegasZona.map((b) => ({
    bodega_id: b.id,
    usuario_id,
    puede_consultar,
    puede_crear_notas,
    puede_confirmar_notas,
    puede_transferir,
  }))

  const { error } = await supabase
    .from('usuario_bodegas')
    .upsert(upserts, { onConflict: 'usuario_id,bodega_id' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  revalidatePath('/inventario/bodegas/matriz')
  return { success: true }
}

export async function guardarAsignacionBodegaJSONAction(payload: {
  usuario_id: number
  bodega_id: number
  puede_consultar: boolean
  puede_crear_notas: boolean
  puede_confirmar_notas: boolean
  puede_transferir: boolean
}): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // Validación de seguridad para Bodeguero
  if (user.rol?.nombre === 'Bodeguero') {
    const { data: usuarioAsociado, error: userErr } = await supabase
      .from('usuarios')
      .select(`
        id,
        rol:roles!usuarios_rol_id_fkey ( nombre )
      `)
      .eq('id', payload.usuario_id)
      .single()

    if (userErr || !usuarioAsociado) {
      return { success: false, error: 'Usuario a asociar no encontrado.' }
    }

    const rolNombreAsociado = Array.isArray((usuarioAsociado as any).rol)
      ? (usuarioAsociado as any).rol[0]?.nombre
      : (usuarioAsociado as any).rol?.nombre

    if (rolNombreAsociado !== 'Bodeguero') {
      return { success: false, error: 'Como Bodeguero, solo tienes permisos para asignar bodegas a otros usuarios con rol Bodeguero.' }
    }
  }

  const { error } = await supabase
    .from('usuario_bodegas')
    .upsert({
      usuario_id: payload.usuario_id,
      bodega_id: payload.bodega_id,
      puede_consultar: payload.puede_consultar,
      puede_crear_notas: payload.puede_crear_notas,
      puede_confirmar_notas: payload.puede_confirmar_notas,
      puede_transferir: payload.puede_transferir,
    }, {
      onConflict: 'usuario_id,bodega_id',
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}

export async function eliminarAsignacionBodegaJSONAction(
  usuarioId: number,
  bodegaId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('usuario_bodegas')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('bodega_id', bodegaId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/inventario/bodegas')
  return { success: true }
}

export async function subirComprobanteNotaAction(
  notaId: number,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // 1. Obtener la nota para estructurar el path de forma limpia
  const { data: nota, error: fetchError } = await supabase
    .from('notas_inventario')
    .select(`
      numero_nota,
      fecha_nota,
      bodega_origen:bodegas!notas_inventario_bodega_origen_id_fkey (codigo)
    `)
    .eq('id', notaId)
    .single()

  if (fetchError || !nota) {
    return { success: false, error: 'Nota no encontrada.' }
  }

  const n: any = nota
  const numNota = n.numero_nota
  const bodCodigo = n.bodega_origen?.codigo || 'BOD'
  const fecha = n.fecha_nota ? new Date(n.fecha_nota) : new Date()

  const yyyy = fecha.getFullYear()
  const mm = String(fecha.getMonth() + 1).padStart(2, '0')
  const dd = String(fecha.getDate()).padStart(2, '0')

  // 2. Extraer archivo de formData
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { success: false, error: 'No se recibió ningún archivo.' }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const cleanNum = numNota.replace(/[^a-zA-Z0-9_\-]/g, '_')
  const cleanBod = bodCodigo.replace(/[^a-zA-Z0-9_\-]/g, '_')
  
  // Guardar con formato estructurado por Mes y Año
  const storagePath = `Notas/${yyyy}-${mm}/${cleanNum}-${cleanBod}-${dd}.${ext}`

  // 3. Subir a Supabase Storage
  const fileArrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('product_images')
    .upload(storagePath, Buffer.from(fileArrayBuffer), {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    return { success: false, error: `Error al subir comprobante: ${uploadError.message}` }
  }

  // 4. Obtener URL pública
  const { data: urlData } = supabase.storage
    .from('product_images')
    .getPublicUrl(storagePath)

  if (!urlData?.publicUrl) {
    return { success: false, error: 'No se pudo obtener la URL pública del comprobante.' }
  }

  const publicUrl = urlData.publicUrl

  // 5. Guardar URL en la nota
  const { error: updateError } = await supabase
    .from('notas_inventario')
    .update({ comprobante_url: publicUrl })
    .eq('id', notaId)

  if (updateError) {
    return { success: false, error: `Error al registrar URL en BD: ${updateError.message}` }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)

  return { success: true }
}

export async function eliminarComprobanteNotaAction(
  notaId: number
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // 1. Obtener la URL del comprobante de la nota
  const { data: nota, error: fetchError } = await supabase
    .from('notas_inventario')
    .select('comprobante_url')
    .eq('id', notaId)
    .single()

  if (fetchError || !nota) {
    return { success: false, error: 'Nota no encontrada.' }
  }

  const publicUrl = nota.comprobante_url
  if (!publicUrl) {
    return { success: true } // Ya no tiene comprobante
  }

  // 2. Extraer el storagePath de la URL
  const bucketPrefix = `/object/public/product_images/`
  const idx = publicUrl.indexOf(bucketPrefix)
  if (idx !== -1) {
    const storagePath = publicUrl.slice(idx + bucketPrefix.length)
    const { error: storageError } = await supabase.storage
      .from('product_images')
      .remove([storagePath])

    if (storageError) {
      console.warn('[eliminarComprobanteNotaAction] Warning removing from storage:', storageError.message)
    }
  }

  // 3. Limpiar URL en la nota
  const { error: updateError } = await supabase
    .from('notas_inventario')
    .update({ comprobante_url: null })
    .eq('id', notaId)

  if (updateError) {
    return { success: false, error: `Error al limpiar URL en la BD: ${updateError.message}` }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)

  return { success: true }
}

export async function eliminarOcrPropuestaAction(
  id: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado.' }

  const supabase = await createClient()

  // Obtener propuesta para eliminar su imagen si existiera en storage
  const { data: prop, error: fetchError } = await (supabase as any)
    .from('nota_ocr_propuestas')
    .select('storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !prop) {
    return { success: false, error: 'Propuesta no encontrada.' }
  }

  // Eliminar la imagen del storage si tiene storage_path
  if (prop.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('comprobantes')
      .remove([prop.storage_path])
    if (storageError) {
      console.warn('[eliminarOcrPropuestaAction] Warning removing from storage:', storageError.message)
    }
  }

  const { error: deleteError } = await (supabase as any)
    .from('nota_ocr_propuestas')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return { success: false, error: `Error al eliminar propuesta de la BD: ${deleteError.message}` }
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/notas/propuestas')

  return { success: true }
}

/**
 * Obtiene los detalles de productos para el despliegue FastCheck de una nota.
 */
export async function getNotaDetallesAction(notaId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nota_detalle_productos')
    .select(`
      id, producto_id, cajas, piezas_sueltas,
      producto:productos (
        id, sku_base, descripcion
      )
    `)
    .eq('nota_id', notaId)

  if (error || !data) {
    return []
  }

  return data.map((d: any) => {
    const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto
    return {
      id: d.id,
      producto_id: d.producto_id,
      sku_base: prod?.sku_base ?? '—',
      descripcion: prod?.descripcion ?? '—',
      cajas: d.cajas ?? 0,
      piezas_sueltas: d.piezas_sueltas ?? 0,
    }
  })
}


