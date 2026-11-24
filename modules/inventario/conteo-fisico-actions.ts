// modules/inventario/conteo-fisico-actions.ts
'use server'

/**
 * Server Actions para el ciclo de vida de Conteo Físico Manuscrito (OCR Multi-Hoja):
 * - Persistencia de hojas en "inv-tienda".nota_ocr_propuestas (tipo = 'CONTEO_FISICO', estado = 'CONTEO_PENDIENTE')
 * - Guardado de borradores parciales (edición de celdas/cajas en la nube)
 * - Consulta de hojas pendientes en la nube para sincronización Celular -> Computadora
 * - Búsqueda de candidatos de SKU (reciclando fn_buscar_candidatos_sku_ocr)
 * - Cierre y pase a CONTEO_APLICADO tras reconciliación total
 */

import { createClient } from '@/lib/supabase/server'
import { verifySessionOptional } from '@/lib/dal'
import { isSuperAdmin, can, isClienteEcommerce } from '@/lib/auth/permissions'
import { recalcularResumenHoja } from '@/lib/inventario/conteo-fisico-matcher'
import type {
  HojaConteoFisico,
  RenglonConteoFisico,
  CandidatoSkuSimple,
} from './conteo-fisico-types'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

async function requireConteoUser(mode: 'read' | 'write') {
  const { isAuth, user } = await verifySessionOptional()
  if (!isAuth || !user) {
    return { user: null, error: 'No autenticado.' }
  }
  if (isClienteEcommerce(user)) {
    return { user: null, error: 'Sin permisos para conteo físico.' }
  }
  const nivelAcceso = user.rol?.nivel_acceso ?? 99
  const esAutorizado =
    isSuperAdmin(user) ||
    nivelAcceso <= 2 ||
    (mode === 'read'
      ? can(user, 'inventario_stock', 'puede_leer') || can(user, 'inventario_notas', 'puede_leer')
      : can(user, 'inventario_stock', 'puede_editar') || can(user, 'inventario_notas', 'puede_crear'))

  if (!esAutorizado) {
    return { user: null, error: 'Permisos insuficientes para conteo físico.' }
  }
  return { user, error: null }
}

/**
 * Guarda o actualiza una hoja procesada en nota_ocr_propuestas como CONTEO_PENDIENTE
 */
export async function guardarHojaConteoOcrAction(
  hoja: HojaConteoFisico,
  bodegaId?: number | null
): Promise<ActionResult<{ propuestaId: string }>> {
  try {
    const { user, error: authError } = await requireConteoUser('write')
    if (!user || authError) {
      return { success: false, error: authError || 'No autenticado.' }
    }

    const supabase = await createClient()

    // Calcular confianza promedio
    const avgConfianza =
      hoja.renglones.length > 0
        ? hoja.renglones.reduce((acc, r) => acc + (r.confianza || 0.95), 0) /
          hoja.renglones.length
        : 0.95

    let fechaParsed: string | null = null
    if (hoja.fecha_detectada) {
      // Intentar normalizar fecha si viene DD/MM/AA o similar
      const partes = hoja.fecha_detectada.split(/[/ -]/)
      if (partes.length === 3) {
        let dia = partes[0]
        let mes = partes[1]
        let anio = partes[2]
        if (anio.length === 2) anio = '20' + anio
        fechaParsed = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
      }
    }
    if (!fechaParsed || isNaN(Date.parse(fechaParsed))) {
      fechaParsed = new Date().toISOString().slice(0, 10)
    }

    const payload = {
      client_request_id: hoja.id,
      comprobante_url: hoja.comprobante_url || null,
      folio_detectado: `Hoja ${hoja.numero_hoja}${hoja.encabezado ? ' - ' + hoja.encabezado : ''}`,
      fecha_detectada: fechaParsed,
      tipo_movimiento_detectado: 'CONTEO_FISICO',
      origen_detectado: hoja.encabezado || 'Bodega Aux',
      destino_detectado: null,
      bodega_origen_id: bodegaId || null,
      bodega_destino_id: null,
      lineas: hoja.renglones,
      json_crudo: {
        resumen: hoja.resumen,
        numero_hoja: hoja.numero_hoja,
        encabezado: hoja.encabezado,
        fecha_detectada: hoja.fecha_detectada,
      },
      confianza_global: Math.round(avgConfianza * 100) / 100,
      estado: 'CONTEO_PENDIENTE',
      nota_id: null, // Regla inquebrantable: sin crear nota hasta ajuste total
    }

    const { data, error } = await (supabase as any)
      .from('nota_ocr_propuestas')
      .upsert(payload, { onConflict: 'client_request_id' })
      .select('id')
      .single()

    if (error) {
      console.error('Error al guardar propuesta de conteo físico:', error)
      return { success: false, error: error.message || 'Error al persistir en base de datos.' }
    }

    return { success: true, data: { propuestaId: data.id } }
  } catch (err: any) {
    console.error('Error in guardarHojaConteoOcrAction:', err)
    return { success: false, error: err.message || 'Error inesperado.' }
  }
}

/**
 * Guarda cambios parciales (borrador en la nube) de una hoja ya existente
 */
export async function actualizarBorradorHojaConteoAction(
  propuestaId: string,
  renglones: RenglonConteoFisico[],
  resumen?: any
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    const { user, error: authError } = await requireConteoUser('write')
    if (!user || authError) {
      return { success: false, error: authError || 'No autenticado.' }
    }

    const supabase = await createClient()

    const { data: existingRow } = await (supabase as any)
      .from('nota_ocr_propuestas')
      .select('json_crudo')
      .eq('id', propuestaId)
      .single()

    const prevCrudo =
      existingRow?.json_crudo && typeof existingRow.json_crudo === 'object'
        ? existingRow.json_crudo
        : {}

    const resumenCalculado = recalcularResumenHoja(renglones)

    const updatePayload: Record<string, any> = {
      lineas: renglones,
      revisado_por: user.id,
      revisado_en: new Date().toISOString(),
      json_crudo: {
        ...prevCrudo,
        resumen: resumen ?? resumenCalculado,
      },
    }

    const { error } = await (supabase as any)
      .from('nota_ocr_propuestas')
      .update(updatePayload)
      .eq('id', propuestaId)

    if (error) {
      console.error('Error al actualizar borrador de hoja de conteo:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: { updated: true } }
  } catch (err: any) {
    console.error('Error in actualizarBorradorHojaConteoAction:', err)
    return { success: false, error: err.message || 'Error inesperado.' }
  }
}

/**
 * Consulta todas las hojas de conteo físico pendientes de revisión en la nube
 */
export async function fetchHojasConteoPendientesAction(
  bodegaId?: number | null
): Promise<ActionResult<{ hojas: HojaConteoFisico[] }>> {
  try {
    const { user, error: authError } = await requireConteoUser('read')
    if (!user || authError) {
      return { success: false, error: authError || 'No autenticado.' }
    }

    const supabase = await createClient()

    let query = (supabase as any)
      .from('nota_ocr_propuestas')
      .select('*')
      .eq('tipo_movimiento_detectado', 'CONTEO_FISICO')
      .eq('estado', 'CONTEO_PENDIENTE')
      .order('creado_en', { ascending: true })

    if (bodegaId && bodegaId > 0) {
      query = query.eq('bodega_origen_id', bodegaId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al consultar hojas de conteo pendientes:', error)
      return { success: false, error: error.message }
    }

    const hojasFormateadas: HojaConteoFisico[] = (data || []).map((row: any, idx: number) => {
      const crudo = row.json_crudo && typeof row.json_crudo === 'object' ? row.json_crudo : {}
      const numHoja = Number(crudo.numero_hoja || idx + 1)
      const rawLineas = Array.isArray(row.lineas) ? row.lineas : []
      const renglones: RenglonConteoFisico[] = rawLineas.map((r: any) => ({
        ...r,
        numero_hoja: Number(r.numero_hoja || numHoja),
      }))
      const resumen = recalcularResumenHoja(renglones)

      return {
        id: row.client_request_id || `propuesta_${row.id}`,
        propuesta_db_id: row.id,
        numero_hoja: numHoja,
        comprobante_url: row.comprobante_url || undefined,
        encabezado: row.origen_detectado || crudo.encabezado || '',
        fecha_detectada: row.fecha_detectada || crudo.fecha_detectada || '',
        creado_en: row.creado_en || undefined,
        bodega_origen_id: row.bodega_origen_id || null,
        resumen,
        renglones,
      }
    })

    return { success: true, data: { hojas: hojasFormateadas } }
  } catch (err: any) {
    console.error('Error in fetchHojasConteoPendientesAction:', err)
    return { success: false, error: err.message || 'Error inesperado.' }
  }
}

/**
 * Marca una lista de hojas como CONTEO_APLICADO tras confirmarse el ajuste total
 */
export async function marcarHojasConteoAplicadasAction(
  propuestaIds: string[]
): Promise<ActionResult<{ count: number }>> {
  try {
    if (!propuestaIds || propuestaIds.length === 0) {
      return { success: true, data: { count: 0 } }
    }

    const { user, error: authError } = await requireConteoUser('write')
    if (!user || authError) {
      return { success: false, error: authError || 'No autenticado.' }
    }

    const supabase = await createClient()

    const { error } = await (supabase as any)
      .from('nota_ocr_propuestas')
      .update({
        estado: 'CONTEO_APLICADO',
        revisado_por: user.id,
        revisado_en: new Date().toISOString(),
      })
      .in('id', propuestaIds)

    if (error) {
      console.error('Error al marcar hojas como aplicadas:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: { count: propuestaIds.length } }
  } catch (err: any) {
    console.error('Error in marcarHojasConteoAplicadasAction:', err)
    return { success: false, error: err.message || 'Error inesperado.' }
  }
}

/**
 * Busca candidatos alternativos de SKU llamando a fn_buscar_candidatos_sku_ocr
 */
export async function buscarCandidatosSkuIndividualAction(
  sku: string
): Promise<ActionResult<{ candidatos: CandidatoSkuSimple[] }>> {
  try {
    const { user, error: authError } = await requireConteoUser('read')
    if (!user || authError) {
      return { success: false, error: authError || 'No autenticado.' }
    }

    const cleanSku = (sku || '').trim()
    if (!cleanSku) {
      return { success: true, data: { candidatos: [] } }
    }

    const supabase = await createClient()

    const payload = [{ index: 0, sku: cleanSku, estilo_raw: cleanSku }]
    const { data, error } = await (supabase as any).rpc('fn_buscar_candidatos_sku_ocr', {
      p_lineas: payload,
    })

    if (error) {
      console.error('Error en fn_buscar_candidatos_sku_ocr:', error)
      return { success: false, error: error.message }
    }

    const cands: CandidatoSkuSimple[] = (data || [])
      .map((c: any) => ({
        producto_id: c.producto_id,
        sku: c.sku_base,
        nombre: c.descripcion || null,
        score: Number(c.score) || 0,
        metodo: c.metodo,
      }))
      .sort((a: CandidatoSkuSimple, b: CandidatoSkuSimple) => b.score - a.score)
      .slice(0, 8)

    return { success: true, data: { candidatos: cands } }
  } catch (err: any) {
    console.error('Error in buscarCandidatosSkuIndividualAction:', err)
    return { success: false, error: err.message || 'Error inesperado.' }
  }
}

