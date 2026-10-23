// modules/inventario/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/queries'
import { can } from './permissions'
import { fetchStockByBodegaAll, fetchStockMatrixAll, fetchStockPorClaves } from './queries'
import { fetchDescripcionesCanonicasFamilias } from '@/modules/catalogo/queries'
import { fetchConfigInventario } from './config-queries'
import { dateInputToMexicoUTC } from '@/lib/utils'
import type {
  DraftNota,
  DraftProducto,
  NotaOcrCandidatoSku,
  NotaOcrLineaSincronizada,
  NotaOcrPropuestaLineRaw,
  FiltrosStock,
  FiltrosStockMatrix,
  StockListItem,
  StockMatrixItem,
  LineaStock,
  ModoConsumo,
  FaltanteStock,
  ResultadoValidacionNota,
} from './types'
import type { BodegaRow } from '@/lib/types/tables'
import { isModoSoloCajas } from './config-types'
import { construirConsultaSku } from '@/lib/inventario/sku-ocr'
import { evaluarDisponibilidad } from '@/lib/inventario/validacion-stock'
import { calcularFolioConfirmado } from '@/lib/inventario/folio-nota'

export type ActionResult = {
  success: boolean
  error?: string
  nota_id?: number
  numero_nota?: string
  /** Detalle por SKU de los productos que no alcanzan el stock (pre-chequeo). */
  faltantes?: FaltanteStock[]
}

// ════════════════════════════════════════════════════════════
// PRE-CHEQUEO DE STOCK (agregado por producto + caja)
// ════════════════════════════════════════════════════════════

/**
 * POR QUÉ EXISTE
 * --------------
 * El trigger de base de datos `inv-tienda.fn_procesar_nota_inventario()` recorre
 * `nota_detalle_productos` RENGLÓN POR RENGLÓN y nunca agrupa:
 *
 *   FOR v_det IN (SELECT * FROM nota_detalle_productos WHERE nota_id = NEW.id) LOOP
 *     IF v_stock.cajas < v_det.cajas THEN RAISE EXCEPTION 'Stock insuficiente...'
 *
 * Una nota con el mismo producto en dos renglones (p. ej. 6 + 1) con 6 disponibles
 * pasa el renglón 1 (el stock baja a 0) y revienta en el renglón 2 con un mensaje
 * que NO menciona el SKU ("Disponible: 0 cajas...").
 *
 * Estas helpers replican la semántica del trigger (misma clave producto_id + caja_id)
 * pero comparan el TOTAL de la nota contra el stock leído de la base, para avisar
 * antes de procesar y con el detalle por código.
 */

type SupabaseCliente = Awaited<ReturnType<typeof createClient>>

/** Modo de consumo según el tipo de movimiento (mismas ramas que el trigger). */
function modoConsumoPorTipo(tipo: {
  codigo?: string | null
  afecta_inventario?: number | null
  requiere_destino?: boolean | null
} | null): ModoConsumo {
  if (!tipo) return 'entrada'
  if (tipo.codigo === 'SAL' || tipo.afecta_inventario === -1) return 'salida'
  if (tipo.codigo === 'TRF' || (tipo.afecta_inventario === 0 && tipo.requiere_destino === true)) {
    return 'salida'
  }
  if (tipo.codigo === 'AJU') return 'ajuste_negativo'
  return 'entrada'
}

async function fetchTipoMovimientoParaValidacion(
  supabase: SupabaseCliente,
  tipoId: number | null
): Promise<{ codigo: string; afecta_inventario: number; requiere_destino: boolean } | null> {
  if (!tipoId) return null

  const { data } = await supabase
    .from('cat_tipos_movimiento')
    .select('codigo, afecta_inventario, requiere_destino')
    .eq('id', tipoId)
    .maybeSingle()

  return (data as { codigo: string; afecta_inventario: number; requiere_destino: boolean } | null) ?? null
}

/** Convierte el Map de stock a un objeto serializable (las Server Actions solo aceptan JSON). */
function serializarStockPorClave(
  stockPorClave: Map<string, { cajas: number; piezas_sueltas: number }>
): Record<string, { cajas: number; piezas_sueltas: number }> {
  const salida: Record<string, { cajas: number; piezas_sueltas: number }> = {}
  for (const [clave, valor] of stockPorClave) {
    salida[clave] = { cajas: valor.cajas, piezas_sueltas: valor.piezas_sueltas }
  }
  return salida
}

/** Valida el draft de una nota contra el stock real de la bodega origen. */
async function validarDisponibilidadInterno(
  supabase: SupabaseCliente,
  draft: DraftNota
): Promise<ResultadoValidacionNota> {
  const tipo = await fetchTipoMovimientoParaValidacion(supabase, draft.tipo_movimiento_id)
  const modo = modoConsumoPorTipo(tipo)

  const sinConsumo: ResultadoValidacionNota = {
    ok: true,
    faltantes: [],
    advertencias: [],
    modo,
    tipo_movimiento_codigo: tipo?.codigo ?? null,
    bodega_origen_nombre: null,
    disponible_por_clave: {},
  }

  if (modo === 'entrada') return sinConsumo
  if (!draft.bodega_origen_id || !draft.productos?.length) return sinConsumo

  const lineas: LineaStock[] = draft.productos.map((p) => ({
    producto_id: p.producto_id,
    producto_sku: p.producto_sku,
    producto_nombre: p.producto_nombre,
    caja_id: p.caja_id,
    caja_codigo: p.caja_codigo,
    cajas: p.cajas,
    piezas_sueltas: p.piezas_sueltas,
  }))

  const [stockPorClave, bodegaNombre] = await Promise.all([
    fetchStockPorClaves(draft.bodega_origen_id, lineas.map((l) => l.producto_id)),
    (async () => {
      const { data } = await supabase
        .from('bodegas')
        .select('nombre')
        .eq('id', draft.bodega_origen_id!)
        .maybeSingle()
      return (data as { nombre: string } | null)?.nombre ?? null
    })(),
  ])

  const resultado = evaluarDisponibilidad(lineas, stockPorClave, modo)

  return {
    ...resultado,
    tipo_movimiento_codigo: tipo?.codigo ?? null,
    bodega_origen_nombre: bodegaNombre,
    disponible_por_clave: serializarStockPorClave(stockPorClave),
  }
}

/** Valida una nota YA GUARDADA (lee sus detalles de la base). */
async function validarDisponibilidadPorIdInterno(
  supabase: SupabaseCliente,
  notaId: number
): Promise<ResultadoValidacionNota> {
  const { data: nota } = await supabase
    .from('notas_inventario')
    .select('tipo_movimiento_id, bodega_origen_id')
    .eq('id', notaId)
    .maybeSingle()

  const tipo = await fetchTipoMovimientoParaValidacion(supabase, nota?.tipo_movimiento_id ?? null)
  const modo = modoConsumoPorTipo(tipo)

  const sinConsumo: ResultadoValidacionNota = {
    ok: true,
    faltantes: [],
    advertencias: [],
    modo,
    tipo_movimiento_codigo: tipo?.codigo ?? null,
    bodega_origen_nombre: null,
    disponible_por_clave: {},
  }

  if (!nota) return sinConsumo
  if (modo === 'entrada' || !nota.bodega_origen_id) return sinConsumo

  const { data: detalles } = await supabase
    .from('nota_detalle_productos')
    .select(
      'producto_id, cajas, piezas_sueltas, caja_id, producto:productos!nota_detalle_productos_producto_id_fkey ( sku_base, descripcion, nombre )'
    )
    .eq('nota_id', notaId)

  const lineas: LineaStock[] = ((detalles ?? []) as any[]).map((d) => {
    const prod = Array.isArray(d.producto) ? d.producto[0] : d.producto
    return {
      producto_id: d.producto_id,
      producto_sku: prod?.sku_base ?? '',
      producto_nombre: prod?.descripcion ?? prod?.nombre ?? null,
      caja_id: d.caja_id,
      caja_codigo: null,
      cajas: Number(d.cajas) || 0,
      piezas_sueltas: Number(d.piezas_sueltas) || 0,
    }
  })

  if (lineas.length === 0) return sinConsumo

  const [stockPorClave, bodegaNombre] = await Promise.all([
    fetchStockPorClaves(nota.bodega_origen_id, lineas.map((l) => l.producto_id)),
    (async () => {
      const { data } = await supabase
        .from('bodegas')
        .select('nombre')
        .eq('id', nota.bodega_origen_id!)
        .maybeSingle()
      return (data as { nombre: string } | null)?.nombre ?? null
    })(),
  ])

  const resultado = evaluarDisponibilidad(lineas, stockPorClave, modo)

  return {
    ...resultado,
    tipo_movimiento_codigo: tipo?.codigo ?? null,
    bodega_origen_nombre: bodegaNombre,
    disponible_por_clave: serializarStockPorClave(stockPorClave),
  }
}

/**
 * Pre-chequeo tolerante a fallos: si la lectura de stock falla por cualquier
 * motivo (red, RLS, etc.) NO se bloquea la operación — el trigger de la base
 * sigue siendo la red de seguridad del inventario.
 */
async function validarDisponibilidadSeguro(
  supabase: SupabaseCliente,
  draft: DraftNota
): Promise<ResultadoValidacionNota | null> {
  try {
    return await validarDisponibilidadInterno(supabase, draft)
  } catch (e) {
    console.error('Error en el pre-chequeo de stock:', e)
    return null
  }
}

/** Igual que `validarDisponibilidadSeguro`, pero sobre una nota ya guardada. */
async function validarDisponibilidadPorIdSeguro(
  supabase: SupabaseCliente,
  notaId: number
): Promise<ResultadoValidacionNota | null> {
  try {
    return await validarDisponibilidadPorIdInterno(supabase, notaId)
  } catch (e) {
    console.error('Error en el pre-chequeo de stock (nota guardada):', e)
    return null
  }
}

/** Mensaje legible con el detalle por SKU (reemplaza el error críptico del trigger). */
function construirErrorStockInsuficiente(validacion: ResultadoValidacionNota): string {
  const detalle = validacion.faltantes
    .map(
      (f) =>
        `${f.producto_sku}: necesita ${f.solicitado_cajas} cajas, hay ${f.disponible_cajas} (faltan ${f.faltan_cajas})`
    )
    .join(' · ')

  const bodega = validacion.bodega_origen_nombre ? ` en ${validacion.bodega_origen_nombre}` : ''

  return `Stock insuficiente en ${validacion.faltantes.length} producto(s)${bodega}. ${detalle}`
}

/**
 * Pre-chequeo de disponibilidad para el draft de una nota.
 * Lee la base de datos y devuelve el detalle por SKU de lo que NO alcanza.
 */
export async function validarDisponibilidadNotaAction(
  draft: DraftNota
): Promise<ResultadoValidacionNota> {
  const supabase = await createClient()
  return validarDisponibilidadInterno(supabase, draft)
}

/**
 * Pre-chequeo de disponibilidad sobre una nota ya guardada
 * (los detalles se leen de `nota_detalle_productos`).
 */
export async function validarDisponibilidadNotaPorIdAction(
  notaId: number
): Promise<ResultadoValidacionNota> {
  const supabase = await createClient()
  return validarDisponibilidadPorIdInterno(supabase, notaId)
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

  const config = await fetchConfigInventario()

  // Validar requiere_destino y restricción de tipo para roles no-admin
  const { data: tipoMov } = await supabase
    .from('cat_tipos_movimiento')
    .select('codigo, requiere_destino')
    .eq('id', draft.tipo_movimiento_id)
    .single()

  const isTraspaso = tipoMov?.codigo === 'TRF'

  // Si se solicitó confirmar pero es traspaso con aprobación requerida y el creador no administra el destino:
  let delegarEnProceso = false
  if (confirmar) {
    const permConfirmar = await can(user, 'confirmar_nota', {
      bodegaOrigenId: draft.bodega_origen_id,
      bodegaDestinoId: draft.bodega_destino_id || undefined,
    })

    if (!permConfirmar.ok) {
      if (isTraspaso && config.requiere_aprobacion_traspaso) {
        // En traspasos con aprobación de destino, el envío desde origen pasa a estado PROC (En Proceso / Tránsito)
        delegarEnProceso = true
      } else {
        return { success: false, error: permConfirmar.motivo }
      }
    }
  }

  if (draft.productos.length === 0) {
    return { success: false, error: 'Agrega al menos un producto.' }
  }

  // ── Pre-chequeo de stock (agregado) ─────────────────────────
  // El trigger procesa renglón por renglón y su error no trae el SKU: aquí se
  // compara el TOTAL de la nota contra el stock real y se devuelve el detalle.
  // Si la nota va a quedar En Proceso (traspaso con aprobación) no se bloquea:
  // el stock todavía no se mueve y el control real ocurre al confirmar.
  if (confirmar && !delegarEnProceso) {
    const validacion = await validarDisponibilidadSeguro(supabase, draft)
    if (validacion && !validacion.ok) {
      return {
        success: false,
        error: construirErrorStockInsuficiente(validacion),
        faltantes: validacion.faltantes,
      }
    }
  }

  // ── Modo solo cajas: bloquear piezas sueltas ──────────────
  // Lee la columna real modo_solo_cajas (con fallback legacy).
  const modoSoloCajas = isModoSoloCajas(config)
  if (modoSoloCajas && draft.productos.some((p) => Number(p.piezas_sueltas ?? 0) !== 0)) {
    return { success: false, error: 'El modo solo cajas está activo: las piezas sueltas deben ser 0 en todos los productos.' }
  }

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
    updateCabeceraPayload.fecha_nota = dateInputToMexicoUTC(draft.fecha_nota)
  }
  if (Object.keys(updateCabeceraPayload).length > 0) {
    await supabase
      .from('notas_inventario')
      .update(updateCabeceraPayload as any)
      .eq('id', notaId)
  }

  // ── 2. Agregar productos ────────────────────────────────
  for (const prod of draft.productos) {
    if (prod.cajas === 0 && (prod.piezas_sueltas ?? 0) === 0) continue

    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: prod.cajas,
      p_variante_id: undefined,
      p_producto_id: prod.producto_id,
      p_piezas_sueltas: modoSoloCajas ? 0 : prod.piezas_sueltas || 0,
      p_caja_id: prod.caja_id || undefined,
      p_codigo_original: prod.codigo_original || undefined,
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

  // ── 3. Confirmar o Marcar En Proceso si se solicitó ─────────────────────────
  if (confirmar) {
    if (delegarEnProceso) {
      // Pasar a estado PROC (En Proceso / Tránsito / Enviada a Destino)
      const { data: estadoProc } = await supabase
        .from('cat_estados_nota')
        .select('id')
        .eq('codigo', 'PROC')
        .single()

      if (estadoProc) {
        await supabase
          .from('notas_inventario')
          .update({ estado_id: estadoProc.id })
          .eq('id', notaId)
      }
    } else {
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
  confirmar: boolean = false,
  ocrProposalId?: string
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

  // ── Validar permisos de confirmación si se solicitó ───────────
  if (confirmar) {
    const permConfirmar = await can(user, 'confirmar_nota', {
      notaId,
      bodegaOrigenId: draft.bodega_origen_id || nota.bodega_origen_id,
      bodegaDestinoId: draft.bodega_destino_id || nota.bodega_destino_id || undefined,
    })
    if (!permConfirmar.ok) {
      return { success: false, error: permConfirmar.motivo || 'No tienes permisos para confirmar esta nota.' }
    }
  }

  // ── Validar permisos de bodega si es nivel 3+ ───────────
  if (user.rol && user.rol.nivel_acceso >= 3) {
    const esCreador = nota.usuario_id === user.id
    const esTransferencia = nota.bodega_destino_id !== null

    const origenAValidar = draft.bodega_origen_id || (nota as any).bodega_origen_id
    const { data: permOrigen } = await supabase
      .from('usuario_bodegas')
      .select('puede_crear_notas, puede_confirmar_notas, puede_consultar')
      .eq('usuario_id', user.id)
      .eq('bodega_id', origenAValidar)
      .single()

    const tienePermisoOrigen = permOrigen?.puede_crear_notas || permOrigen?.puede_confirmar_notas

    if (!esCreador && !tienePermisoOrigen) {
      if (esTransferencia && draft.bodega_destino_id) {
        // En transferencias, validar si tiene acceso al destino
        const { data: permDest } = await supabase
          .from('usuario_bodegas')
          .select('puede_crear_notas, puede_consultar')
          .eq('usuario_id', user.id)
          .eq('bodega_id', draft.bodega_destino_id)
          .single()

        if (!permDest) {
          return { success: false, error: 'No tienes permisos asignados sobre la bodega de origen ni de destino seleccionada.' }
        }
      } else {
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
    return { success: false, error: 'Agrega al menos un producto a la nota.' }
  }

  // ── Pre-chequeo de stock (agregado) ─────────────────────────
  // Se valida ANTES de borrar y reinsertar los detalles: si el total no alcanza,
  // la nota se queda intacta y el error trae el detalle por SKU.
  if (confirmar) {
    const validacion = await validarDisponibilidadSeguro(supabase, draft)
    if (validacion && !validacion.ok) {
      return {
        success: false,
        error: construirErrorStockInsuficiente(validacion),
        faltantes: validacion.faltantes,
      }
    }
  }

  // ── Modo solo cajas: bloquear piezas sueltas ──────────────
  const configEdit = await fetchConfigInventario()
  const modoSoloCajasEdit = isModoSoloCajas(configEdit)
  if (modoSoloCajasEdit && draft.productos.some((p) => Number(p.piezas_sueltas ?? 0) !== 0)) {
    return { success: false, error: 'El modo solo cajas está activo: las piezas sueltas deben ser 0 en todos los productos.' }
  }

  // ── 1. Actualizar cabecera ──────────────────────────────
  const updateCabPayload: Record<string, any> = {
    nota_referencia: draft.nota_referencia || null,
    observaciones: draft.observaciones || null,
    costo_total: draft.costo_total || 0,
    bodega_destino_id: draft.bodega_destino_id || null,
  }
  if (draft.tipo_movimiento_id) {
    updateCabPayload.tipo_movimiento_id = draft.tipo_movimiento_id
  }
  if (draft.bodega_origen_id) {
    updateCabPayload.bodega_origen_id = draft.bodega_origen_id
  }
  if (draft.fecha_nota) {
    updateCabPayload.fecha_nota = dateInputToMexicoUTC(draft.fecha_nota)
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
    return { success: false, error: `Error al limpiar detalles anteriores: ${deleteError.message}` }
  }

  // ── 3. Re-insertar desde draft ──────────────────────────
  for (const prod of draft.productos) {
    if (prod.cajas === 0 && (prod.piezas_sueltas ?? 0) === 0) continue

    const { error: prodError } = await supabase.rpc('sp_agregar_producto_nota', {
      p_nota_id: notaId,
      p_cajas: prod.cajas,
      p_variante_id: undefined,
      p_producto_id: prod.producto_id,
      p_piezas_sueltas: modoSoloCajasEdit ? 0 : prod.piezas_sueltas || 0,
      p_caja_id: prod.caja_id || undefined,
      p_codigo_original: prod.codigo_original || undefined,
    })

    if (prodError) {
      return { success: false, error: `Error al guardar producto ${prod.producto_sku}: ${prodError.message}` }
    }
  }

  // ── 4. Confirmar si se solicitó ─────────────────────────
  if (confirmar) {
    const confirmResult = await confirmarNotaAction(notaId)
    if (!confirmResult.success) {
      return { success: false, error: confirmResult.error }
    }
  }

  // ── 5. Actualizar estado de la propuesta OCR si aplica ───
  if (ocrProposalId) {
    const ocrUpdatePayload: Record<string, any> = {
      estado: 'REVISADO',
      revisado_por: user.id,
      revisado_en: new Date().toISOString(),
      nota_id: notaId,
    }
    if (draft.bodega_origen_id) {
      ocrUpdatePayload.bodega_origen_id = draft.bodega_origen_id
    }
    await (supabase as any)
      .from('nota_ocr_propuestas')
      .update(ocrUpdatePayload)
      .eq('id', ocrProposalId)
  }

  revalidatePath('/inventario/notas')
  revalidatePath('/inventario/notas/propuestas')
  revalidatePath(`/inventario/notas/${notaId}`)
  revalidatePath('/inventario/stock')
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

  // ── Pre-chequeo de stock (agregado) ─────────────────────────
  // El trigger `fn_procesar_nota_inventario` no agrupa renglones y su mensaje
  // no menciona el SKU. Aquí se compara el total de la nota (leída de la base)
  // contra el stock de la bodega origen y se devuelve el detalle por código.
  const validacion = await validarDisponibilidadPorIdSeguro(supabase, notaId)
  if (validacion && !validacion.ok) {
    return {
      success: false,
      error: construirErrorStockInsuficiente(validacion),
      faltantes: validacion.faltantes,
    }
  }

  // ── Obtener tipo y folio actual para asignar folio definitivo ──
  const { data: notaInfo } = await supabase
    .from('notas_inventario')
    .select(`
      numero_nota,
      cat_tipos_movimiento:tipo_movimiento_id ( codigo )
    `)
    .eq('id', notaId)
    .single()

  const tipoCodigo = Array.isArray((notaInfo as any)?.cat_tipos_movimiento)
    ? (notaInfo as any)?.cat_tipos_movimiento[0]?.codigo
    : (notaInfo as any)?.cat_tipos_movimiento?.codigo

  const nuevoNumeroNota = calcularFolioConfirmado(notaInfo?.numero_nota, tipoCodigo)

  const updatePayload: { estado_id: number; numero_nota?: string } = {
    estado_id: estadoConf.id,
  }
  if (nuevoNumeroNota && nuevoNumeroNota !== notaInfo?.numero_nota) {
    updatePayload.numero_nota = nuevoNumeroNota
  }

  const { error } = await supabase
    .from('notas_inventario')
    .update(updatePayload)
    .eq('id', notaId)

  if (error) {
    // Carrera: el stock cambió entre el pre-chequeo y el UPDATE. Se re-valida
    // para devolver el detalle por SKU en vez del error crudo del trigger.
    const revalidacion = await validarDisponibilidadPorIdSeguro(supabase, notaId)
    if (revalidacion && !revalidacion.ok) {
      return {
        success: false,
        error: construirErrorStockInsuficiente(revalidacion),
        faltantes: revalidacion.faltantes,
      }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)
  revalidatePath('/inventario/stock')

  return {
    success: true,
    nota_id: notaId,
    numero_nota: nuevoNumeroNota || notaInfo?.numero_nota || undefined,
  }
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

  // Obtener código del nuevo estado
  const { data: nuevoEstado } = await supabase
    .from('cat_estados_nota')
    .select('codigo')
    .eq('id', nuevoEstadoId)
    .single()

  // Si se solicita cambiar a CONF, delegar a confirmarNotaAction (que ejecuta triggers y valida permisos de destino/admin)
  if (nuevoEstado?.codigo === 'CONF') {
    return confirmarNotaAction(notaId)
  }

  // ── Validar permisos de nivel 3+ para estados intermedios (PEND / PROC) ───────────
  if (user.rol && user.rol.nivel_acceso >= 3) {
    const { data: nota } = await supabase
      .from('notas_inventario')
      .select('usuario_id, bodega_origen_id, bodega_destino_id, estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo )')
      .eq('id', notaId)
      .single()

    if (!nota) return { success: false, error: 'Nota no encontrada.' }

    const estadoCodigo = Array.isArray((nota as any).estado)
      ? (nota as any).estado[0]?.codigo
      : (nota as any).estado?.codigo

    if (estadoCodigo !== 'PEND' && estadoCodigo !== 'PROC') {
      return { success: false, error: 'Solo puedes modificar notas que estén en estado Pendiente o En Proceso.' }
    }
  }

  const { error } = await supabase
    .from('notas_inventario')
    .update({ 
      estado_id: nuevoEstadoId,
      usuario_id: user.id
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

  const cleanNum = numNota.replace(/[^a-zA-Z0-9_\-]/g, '_')
  const cleanBod = bodCodigo.replace(/[^a-zA-Z0-9_\-]/g, '_')
  
  // Guardar con formato estructurado por Mes y Año siempre como .jpg optimizado
  const storagePath = `Notas/${yyyy}-${mm}/${cleanNum}-${cleanBod}-${dd}.jpg`

  // 3. Optimizar y subir a Supabase Storage
  const fileArrayBuffer = await file.arrayBuffer()
  let uploadBuffer: Buffer = Buffer.from(fileArrayBuffer)

  try {
    const sharp = (await import('sharp')).default
    uploadBuffer = await sharp(Buffer.from(fileArrayBuffer))
      .rotate() // auto-orientar
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        mozjpeg: true,
      })
      .toBuffer()
  } catch (sharpErr) {
    console.warn('Fallo optimización sharp en subirComprobante, subiendo original:', sharpErr)
  }

  const { error: uploadError } = await supabase.storage
    .from('product_images')
    .upload(storagePath, uploadBuffer, {
      contentType: 'image/jpeg',
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

// ════════════════════════════════════════════════════════════
// SINCRONIZAR Y EDITAR LÍNEAS OCR (notas_ocr_propuestas.lineas)
// ════════════════════════════════════════════════════════════

export async function sincronizarLineasOcrAction(
  lineas: Array<{
    index: number
    estilo_raw: string
    cantidad_cajas: number
    piezas_por_caja?: number | null
    confianza?: number
    descripcion_texto?: string | null
    descripcion_raw?: string | null
    sku?: string | null
    posibles_variantes?: string[] | null
  }>
): Promise<{ success: boolean; data?: NotaOcrLineaSincronizada[]; error?: string }> {
  const supabase = await createClient()
  const resultados: NotaOcrLineaSincronizada[] = []

  const consultas = lineas.map((item, idx) => ({
    item,
    itemIndex: item.index ?? idx,
    consulta: construirConsultaSku(item.estilo_raw, item.sku, item.posibles_variantes),
  }))

  const aLista = (data: unknown): any[] => (Array.isArray(data) ? data : [])

  const descripcion = (item: (typeof lineas)[number]) =>
    item.descripcion_texto || item.descripcion_raw || ''

  // Pasada 1: código canónico/raw + variantes de sufijo/confusión.
  const payloadPrincipal = consultas.flatMap(({ item, itemIndex, consulta }) =>
    consulta.principales.map((sku, posicion) => ({
      index: itemIndex,
      sku,
      estilo_raw: consulta.raw,
      descripcion_texto: descripcion(item),
      descripcion_raw: item.descripcion_raw || item.descripcion_texto || '',
      ...(posicion === 0 && consulta.variantes.length > 0
        ? { posibles_variantes: consulta.variantes }
        : {}),
    }))
  )

  const { data: principalData, error: principalError } = await (supabase as any).rpc(
    'fn_buscar_candidatos_sku_ocr',
    { p_lineas: payloadPrincipal }
  )
  if (principalError) {
    return { success: false, error: principalError.message }
  }

  let candList = aLista(principalData)

  const candidatosPorLinea = (index: number) =>
    candList.filter((c: any) => Number(c.linea_index) === index)

  // Pasada 2: solo para líneas sin candidato útil, probar secuencia ±1.
  const lineasSinCandidato = consultas.filter(({ itemIndex, consulta }) => {
    if (consulta.vecinos.length === 0) return false
    const cands = candidatosPorLinea(itemIndex)
    return !cands.some((c: any) => Number(c.score) >= 0.70)
  })

  const indicesFallback = new Set<number>()

  if (lineasSinCandidato.length > 0) {
    const payloadVecinos = lineasSinCandidato.flatMap(({ item, itemIndex, consulta }) => {
      indicesFallback.add(itemIndex)
      return consulta.principales.slice(0, 1).map((sku) => ({
        index: itemIndex,
        sku,
        estilo_raw: consulta.raw,
        descripcion_texto: descripcion(item),
        descripcion_raw: item.descripcion_raw || item.descripcion_texto || '',
        posibles_variantes: consulta.vecinos,
      }))
    })

    const { data: vecinosData, error: vecinosError } = await (supabase as any).rpc(
      'fn_buscar_candidatos_sku_ocr',
      { p_lineas: payloadVecinos }
    )
    if (!vecinosError) {
      candList = [...candList, ...aLista(vecinosData)]
    }
  }

  const dedupeCandidatos = (index: number): NotaOcrCandidatoSku[] => {
    const porProducto = new Map<number, any>()

    for (const candidato of candidatosPorLinea(index)) {
      const productoId = Number(candidato.producto_id)
      if (!Number.isFinite(productoId)) continue

      const score = Number(candidato.score) || 0
      const previo = porProducto.get(productoId)
      const scorePrevio = previo ? Number(previo.score) || 0 : -1

      if (!previo || score > scorePrevio || (score === scorePrevio && candidato.metodo === 'EXACTO')) {
        porProducto.set(productoId, candidato)
      }
    }

    return Array.from(porProducto.values())
      .sort((a: any, b: any) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .map((c: any) => ({
        producto_id: Number(c.producto_id),
        sku_base: String(c.sku_base ?? ''),
        descripcion: c.descripcion ?? null,
        pz_en_caja: c.pz_en_caja ?? null,
        score: Number(c.score) || 0,
        metodo: c.metodo ?? null,
        origen: c.sku_buscado ?? null,
      }))
  }

  for (const { item, itemIndex, consulta } of consultas) {
    const rawText = consulta.raw
    const cajas = item.cantidad_cajas ?? 0

    if (!rawText) {
      resultados.push({
        index: itemIndex,
        estilo_raw: '',
        cantidad_cajas: cajas,
        confianza: 0,
        encontrado: false,
      })
      continue
    }

    const candidatos = dedupeCandidatos(itemIndex)
    const topCand = candidatos[0] ?? null
    const topScore = topCand?.score ?? 0
    const exactos = candidatos.filter((c) => c.score >= 0.99)
    const elegibles = candidatos.filter((c) => c.score >= 0.85)

    // Auto si hay un único exacto, o un único candidato >= 0.85.
    // Si hay dos o más >= 0.85, queda como propuesta para elegir.
    const auto =
      !!topCand &&
      !indicesFallback.has(itemIndex) &&
      ((topScore >= 0.99 && exactos.length === 1) ||
        (topScore >= 0.85 && elegibles.length === 1))

    if (auto && topCand) {
      resultados.push({
        index: itemIndex,
        estilo_raw: rawText,
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_por_caja: item.piezas_por_caja ?? topCand.pz_en_caja,
        confianza: Number(item.confianza ?? 0.85),
        producto_id: topCand.producto_id,
        producto_sku: topCand.sku_base,
        producto_nombre: topCand.descripcion,
        producto_pz_en_caja: topCand.pz_en_caja,
        encontrado: true,
        es_propuesta: false,
        score: topScore,
        metodo: topCand.metodo,
        candidatos_sku: candidatos,
      })
    } else if (topCand && topScore >= 0.70) {
      resultados.push({
        index: itemIndex,
        estilo_raw: rawText,
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_por_caja: item.piezas_por_caja ?? topCand.pz_en_caja,
        confianza: Number(item.confianza ?? 0.85),
        producto_id: null,
        producto_sku: null,
        producto_nombre: null,
        producto_pz_en_caja: null,
        encontrado: false,
        es_propuesta: true,
        propuesta_producto_id: topCand.producto_id,
        propuesta_producto_sku: topCand.sku_base,
        propuesta_producto_nombre: topCand.descripcion,
        propuesta_producto_pz_en_caja: topCand.pz_en_caja,
        score: topScore,
        metodo: topCand.metodo,
        candidatos_sku: candidatos,
      })
    } else {
      resultados.push({
        index: itemIndex,
        estilo_raw: rawText,
        descripcion_raw: item.descripcion_raw ?? null,
        cantidad_cajas: cajas,
        piezas_por_caja: item.piezas_por_caja ?? null,
        confianza: Number(item.confianza ?? 0.5),
        producto_id: null,
        producto_sku: null,
        producto_nombre: null,
        producto_pz_en_caja: null,
        encontrado: false,
        es_propuesta: false,
        score: topScore,
        metodo: null,
        candidatos_sku: candidatos.length > 0 ? candidatos : undefined,
      })
    }
  }

  return { success: true, data: resultados }
}


export async function actualizarPropuestaOcrLineasAction(
  propuestaId: string,
  lineas: NotaOcrPropuestaLineRaw[]
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('nota_ocr_propuestas')
    .update({ lineas })
    .eq('id', propuestaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/inventario/notas/nueva')
  revalidatePath('/inventario/notas/propuestas')
  return { success: true }
}

export async function exportStockByBodegaAction(
  bodegaId: number,
  filtros?: FiltrosStock
): Promise<{ success: boolean; data?: StockListItem[]; descripcionesCanonicas?: Record<string, string>; error?: string }> {
  try {
    const [items, descripcionesCanonicas] = await Promise.all([
      fetchStockByBodegaAll(bodegaId, filtros),
      fetchDescripcionesCanonicasFamilias(),
    ])
    return { success: true, data: items, descripcionesCanonicas }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Error al exportar stock' }
  }
}

export async function exportStockMatrixAction(
  filtros: FiltrosStockMatrix,
  bodegas: BodegaRow[]
): Promise<{ success: boolean; data?: StockMatrixItem[]; descripcionesCanonicas?: Record<string, string>; error?: string }> {
  try {
    const [items, descripcionesCanonicas] = await Promise.all([
      fetchStockMatrixAll(filtros, bodegas),
      fetchDescripcionesCanonicasFamilias(),
    ])
    return { success: true, data: items, descripcionesCanonicas }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Error al exportar matriz de stock' }
  }
}

/**
 * Gestiona la eliminación o cancelación de una nota según el rol del usuario y la configuración:
 * - Para Administradores / Encargados (eliminar_soft):
 *   - Si la nota NO está confirmada (PEND/PROC): se marca inactiva (activo = false) y pasa a estado Cancelada (CANC / 3).
 *   - Si la nota SÍ está confirmada (CONF): se marca inactiva (activo = false) sin alterar su estado para no afectar el historial de stock.
 * - Para Bodegueros (solo_cancelar):
 *   - Solo en sus notas creadas: pasa a estado Cancelada (CANC) manteniendo activo = true para que el administrador pueda revisarla o borrarla.
 */
export async function eliminarNotaAction(
  notaId: number,
  motivo?: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'No autenticado.' }
  }

  const supabase = await createClient()

  // 1. Obtener la nota para verificar estado, creador y bodegas
  const { data: nota, error: errorFetch } = await supabase
    .from('notas_inventario')
    .select(`
      id, numero_nota, estado_id, usuario_id, bodega_origen_id, bodega_destino_id,
      estado:cat_estados_nota!notas_inventario_estado_id_fkey ( codigo )
    `)
    .eq('id', notaId)
    .single()

  if (errorFetch || !nota) {
    return { success: false, error: 'Nota no encontrada.' }
  }

  const estadoCodigo = Array.isArray((nota as any).estado)
    ? (nota as any).estado[0]?.codigo
    : (nota as any).estado?.codigo

  // 2. Obtener configuración de inventario para este rol
  const config = await fetchConfigInventario()
  const rolKey = user.rol?.id ? String(user.rol.id) : ''
  const nivelKey = String(user.rol?.nivel_acceso ?? 99)

  const accionPermitida =
    (rolKey && config.accion_eliminar_nota_por_rol?.[rolKey]) ||
    config.accion_eliminar_nota_por_rol?.[nivelKey] ||
    (user.rol?.id === 18 ? 'solo_cancelar' : 'eliminar_soft')

  // 3. Evaluar permisos
  if (accionPermitida === 'ninguno') {
    return { success: false, error: 'Tu rol no tiene permisos para eliminar ni cancelar notas.' }
  }

  // ── Caso A: Rol configurado como 'solo_cancelar' (ej. Bodeguero) ──
  if (accionPermitida === 'solo_cancelar') {
    // Si es nivel 3+, verificar que la nota haya sido creada por él
    if (user.rol && user.rol.nivel_acceso >= 3 && nota.usuario_id !== user.id) {
      return { success: false, error: 'Solo puedes cancelar notas creadas por ti mismo.' }
    }

    if (estadoCodigo === 'CONF') {
      return {
        success: false,
        error: 'Esta nota ya fue confirmada. Solo un administrador puede gestionarla.',
      }
    }

    if (estadoCodigo === 'CANC') {
      return { success: false, error: 'Esta nota ya se encuentra cancelada.' }
    }

    // Cancelar administrativamente (sp_cancelar_nota o update a CANC con activo = true)
    const { error: errorCancelar } = await supabase.rpc('sp_cancelar_nota', {
      p_nota_id: notaId,
      p_usuario_id: user.id,
      p_motivo: motivo || 'Cancelada por el usuario',
    })

    if (errorCancelar) {
      console.error('Error en sp_cancelar_nota:', errorCancelar)
      return { success: false, error: `Error al cancelar nota: ${errorCancelar.message}` }
    }

    revalidatePath('/inventario/notas')
    revalidatePath(`/inventario/notas/${notaId}`)
    revalidatePath('/inventario/stock')

    return {
      success: true,
      numero_nota: nota.numero_nota,
    }
  }

  // ── Caso B: Rol configurado como 'eliminar_soft' (ej. Admin / Encargado) ──
  const perm = await can(user, 'editar_nota', {
    bodegaOrigenId: nota.bodega_origen_id,
    bodegaDestinoId: nota.bodega_destino_id || undefined,
  })

  if (!perm.ok) {
    return { success: false, error: perm.motivo || 'No tienes permisos para eliminar esta nota.' }
  }

  // Preparar payload de actualización:
  // - Si no está confirmada (PEND / PROC / CANC), pasa a activo = false y estado CANC (3).
  // - Si ya está confirmada (CONF), solo se oculta (activo = false) sin alterar estado ni stock.
  const updatePayload: { activo: boolean; estado_id?: number } = { activo: false }

  if (estadoCodigo !== 'CONF') {
    updatePayload.estado_id = 3 // CANC
  }

  const { error: errorUpdate } = await supabase
    .from('notas_inventario')
    .update(updatePayload as any)
    .eq('id', notaId)

  if (errorUpdate) {
    console.error('Error al eliminar nota:', errorUpdate)
    return { success: false, error: `Error al eliminar la nota: ${errorUpdate.message}` }
  }

  revalidatePath('/inventario/notas')
  revalidatePath(`/inventario/notas/${notaId}`)
  revalidatePath('/inventario/stock')

  return {
    success: true,
    numero_nota: nota.numero_nota,
  }
}

// ════════════════════════════════════════════════════════════
// RESOLVER PRODUCTOS PEGADOS DESDE EXCEL / PORTAPAPELES
// ════════════════════════════════════════════════════════════

export type ResolvedProductoPegado = {
  producto_id: number
  sku_base: string
  sku_ingresado: string
  nombre: string | null
  pz_en_caja: number | null
  cajas: number
  stock_origen_cajas: number
  stock_origen_piezas: number
}

export type ResultadoResolverPegados = {
  encontrados: ResolvedProductoPegado[]
  noEncontrados: Array<{ sku: string; cajas: number }>
}

export async function resolverProductosPegadosAction(
  items: Array<{ sku: string; cajas: number }>,
  bodegaOrigenId?: number | null
): Promise<ResultadoResolverPegados> {
  const supabase = await createClient()

  if (!items || items.length === 0) {
    return { encontrados: [], noEncontrados: [] }
  }

  // Filtrar y normalizar SKUs válidos
  const cleanedItems = items
    .map((it) => ({
      sku: (it.sku || '').trim(),
      cajas: Number(it.cajas) || 0,
    }))
    .filter((it) => it.sku.length > 0)

  if (cleanedItems.length === 0) {
    return { encontrados: [], noEncontrados: [] }
  }

  // Mapear SKU normalizado (mayúsculas y trim) a los items pegados
  const uniqueSkusUpper = Array.from(new Set(cleanedItems.map((it) => it.sku.toUpperCase())))

  // 1. Búsqueda directa en tabla productos por sku_base
  const { data: directProducts, error: prodError } = await supabase
    .from('productos')
    .select('id, sku_base, nombre, descripcion, pz_en_caja')
    .in('sku_base', uniqueSkusUpper)
    .eq('activo', true)

  if (prodError) {
    console.error('Error al buscar productos directos:', prodError)
  }

  // Mapa de productos encontrados por sku_base en mayúsculas
  const foundMap = new Map<string, {
    id: number
    sku_base: string
    nombre: string | null
    pz_en_caja: number | null
  }>()

  if (directProducts) {
    for (const p of directProducts) {
      foundMap.set(p.sku_base.toUpperCase(), {
        id: p.id,
        sku_base: p.sku_base,
        nombre: p.descripcion || p.nombre || null,
        pz_en_caja: p.pz_en_caja ?? null,
      })
    }
  }

  // 2. Si quedaron SKUs sin encontrar, intentar búsqueda inteligente por import-queries
  const pendingSkus = uniqueSkusUpper.filter((s) => !foundMap.has(s))
  if (pendingSkus.length > 0) {
    try {
      const { buscarProductosPorSkuBatch } = await import('./import-queries')
      const batchMatches = await buscarProductosPorSkuBatch(pendingSkus)
      for (const [searchedSku, match] of batchMatches.entries()) {
        if (match && match.producto_id) {
          foundMap.set(searchedSku.toUpperCase(), {
            id: match.producto_id,
            sku_base: match.sku_base,
            nombre: match.nombre,
            pz_en_caja: match.pz_en_caja ?? null,
          })
        }
      }
    } catch (err) {
      console.error('Error en búsqueda fallback de productos:', err)
    }
  }

  // 3. Consultar existencias de todos los productos encontrados en la bodega origen seleccionada
  const resolvedProductIds = Array.from(new Set(Array.from(foundMap.values()).map((p) => p.id)))
  const stockMap = new Map<number, { cajas: number; piezas_sueltas: number }>()

  if (bodegaOrigenId && resolvedProductIds.length > 0) {
    const { data: stockRows, error: stockErr } = await supabase
      .from('inventario_stock')
      .select('producto_id, cajas, piezas_sueltas')
      .eq('bodega_id', bodegaOrigenId)
      .in('producto_id', resolvedProductIds)
      .is('caja_id', null)

    if (!stockErr && stockRows) {
      for (const s of stockRows) {
        stockMap.set(s.producto_id, {
          cajas: Number(s.cajas) || 0,
          piezas_sueltas: Number(s.piezas_sueltas) || 0,
        })
      }
    }
  }

  // 4. Construir resultado ordenado manteniendo la secuencia pegada
  const encontrados: ResolvedProductoPegado[] = []
  const noEncontrados: Array<{ sku: string; cajas: number }> = []

  for (const item of cleanedItems) {
    const matched = foundMap.get(item.sku.toUpperCase())
    if (matched) {
      const stock = stockMap.get(matched.id) || { cajas: 0, piezas_sueltas: 0 }
      encontrados.push({
        producto_id: matched.id,
        sku_base: matched.sku_base,
        sku_ingresado: item.sku,
        nombre: matched.nombre,
        pz_en_caja: matched.pz_en_caja,
        cajas: item.cajas,
        stock_origen_cajas: stock.cajas,
        stock_origen_piezas: stock.piezas_sueltas,
      })
    } else {
      noEncontrados.push(item)
    }
  }

  return {
    encontrados,
    noEncontrados,
  }
}
