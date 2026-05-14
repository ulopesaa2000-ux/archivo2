'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SharedCajaData } from './types'
import type { ActionResult } from '@/modules/catalogo/actions'

// ═══════════════════════════════════════════════════════════════
// MARCAR CAJA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export async function marcarCajaPrincipalAction(
  cajaId: number,
  productoId: number
): Promise<ActionResult> {
  const supabase = await createClient()

  // Verificar si la caja tiene detalles válidos antes de marcarla
  const { data: detalles, error: detallesError } = await (supabase
    .from('caja_detalles') as any)
    .select('id, talla_id, color_id, cantidad')
    .eq('caja_id', cajaId)

  if (detallesError) {
    console.error('Error consultando detalles:', detallesError)
  }
  console.log(`[marcarCajaPrincipal] cajaId=${cajaId}, detalles encontrados=${detalles?.length ?? 0}`, detalles)

  const tieneDetalles = detalles?.some((d: any) =>
    d.talla_id != null && d.color_id != null && d.cantidad > 0
  ) ?? false
  console.log(`[marcarCajaPrincipal] tieneDetalles=${tieneDetalles}`)

  // 1. Desmarcar todas las cajas principales del producto
  const { error: clearError } = await (supabase
    .from('cajas_producto') as any)
    .update({ es_principal: false })
    .eq('producto_id', productoId)
    .eq('es_principal', true)

  if (clearError) {
    console.error('Error desmarcando cajas principales:', clearError)
    return { success: false, error: clearError.message }
  }

  // 2. Marcar la caja seleccionada como principal
  const { error: setError } = await (supabase
    .from('cajas_producto') as any)
    .update({ es_principal: true })
    .eq('id', cajaId)

  if (setError) {
    console.error('Error marcando caja principal:', setError)
    return { success: false, error: setError.message }
  }

  revalidatePath('/(admin)/catalogo/[id]', 'page')

  if (!tieneDetalles) {
    return {
      success: true,
      error: '⚠️ Esta caja no tiene un packing completo (tallas × colores con cantidad > 0). Las variantes de ecommerce no se podrán generar hasta que agregues el packing en el tab Cajas.',
    }
  }

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════
// GENERAR VARIANTES DESDE CAJA PRINCIPAL (SINCRONIZACIÓN INCREMENTAL)
// ═══════════════════════════════════════════════════════════════
export async function generarVariantesDesdeCajaPrincipalAction(
  productoId: number
): Promise<ActionResult> {
  const supabase = await createClient()

  // 1. Obtener la caja principal del producto
  const { data: cajaPrincipal, error: cajaError } = await (supabase
    .from('cajas_producto') as any)
    .select('id, codigo_caja')
    .eq('producto_id', productoId)
    .eq('es_principal', true)
    .single()

  if (cajaError || !cajaPrincipal) {
    return { success: false, error: 'No hay caja marcada como principal para este producto.' }
  }

  // 2. Obtener los caja_detalles de esa caja
  const { data: detalles, error: detallesError } = await (supabase
    .from('caja_detalles') as any)
    .select('talla_id, color_id, cantidad')
    .eq('caja_id', cajaPrincipal.id)

  if (detallesError) {
    console.error('Error consultando detalles para variantes:', detallesError)
    return { success: false, error: detallesError.message }
  }

  console.log(`[generarVariantes] cajaId=${cajaPrincipal.id}, detalles encontrados=${detalles?.length ?? 0}`, detalles)

  // Filtrar solo detalles válidos en JS (evita problemas de SQL con IS NOT NULL)
  const detallesValidos = (detalles ?? []).filter((d: any) =>
    d.talla_id != null && d.color_id != null && d.cantidad > 0
  )

  if (detallesValidos.length === 0) {
    return {
      success: false,
      error: `La caja principal «${cajaPrincipal.codigo_caja}» no tiene un packing completo (tallas × colores con cantidad > 0). Agrega el packing en el tab Cajas y luego vuelve aquí para generar variantes.`
    }
  }

  // 3. Obtener sku_base y precio_ec del producto
  const { data: producto } = await (supabase
    .from('productos') as any)
    .select('sku_base, precio_ec')
    .eq('id', productoId)
    .single()

  if (!producto) {
    return { success: false, error: 'Producto no encontrado.' }
  }

  // 4. Extraer combinaciones únicas de talla_id + color_id desde el packing
  const combinacionesEsperadas = new Map<string, { talla_id: number; color_id: number }>()
  for (const d of detallesValidos) {
    const key = `${d.talla_id}-${d.color_id}`
    if (!combinacionesEsperadas.has(key)) {
      combinacionesEsperadas.set(key, { talla_id: d.talla_id, color_id: d.color_id })
    }
  }

  if (combinacionesEsperadas.size === 0) {
    return {
      success: false,
      error: `El packing de la caja «${cajaPrincipal.codigo_caja}» no tiene combinaciones válidas de talla × color. Verifica que los detalles tengan cantidad mayor a 0.`
    }
  }

  // 5. Obtener variantes existentes del producto (con ID para poder actualizarlas)
  const { data: variantesExistentes } = await (supabase
    .from('variantes_producto') as any)
    .select('id, talla_id, color_id, activo')
    .eq('producto_id', productoId)

  const existentesMap = new Map<string, { id: number; activo: boolean }>()
  for (const v of (variantesExistentes ?? [])) {
    const key = `${v.talla_id}-${v.color_id}`
    existentesMap.set(key, { id: v.id, activo: v.activo })
  }

  // 6. Obtener info de tallas y colores para construir SKU
  const { data: tallasData } = await (supabase
    .from('cat_tallas') as any)
    .select('id, codigo')

  const { data: coloresData } = await (supabase
    .from('cat_colores') as any)
    .select('id, codigo')

  const tallaMap = new Map(tallasData?.map((t: any) => [t.id, t.codigo ?? '']) ?? [])
  const colorMap = new Map(coloresData?.map((c: any) => [c.id, c.codigo ?? '']) ?? [])

  // 7. Calcular diferencias: nuevas vs obsoletas
  const nuevasVariantes: any[] = []
  const idsParaReactivar: number[] = []

  for (const [, { talla_id, color_id }] of combinacionesEsperadas) {
    const key = `${talla_id}-${color_id}`
    const existente = existentesMap.get(key)

    if (!existente) {
      // No existe → crear nueva
      const sku_completo = [
        producto.sku_base ?? '',
        tallaMap.get(talla_id) ?? String(talla_id),
        colorMap.get(color_id) ?? String(color_id),
      ].filter(Boolean).join('-')

      nuevasVariantes.push({
        producto_id: productoId,
        talla_id,
        color_id,
        sku_completo,
        costo_promedio: null,
        precio_venta: producto.precio_ec ?? null,
        activo: true,
      })
    } else if (!existente.activo) {
      // Existe pero está inactiva → reactivar
      idsParaReactivar.push(existente.id)
    }
  }

  // 8. Identificar variantes obsoletas (que ya no están en el packing)
  const idsObsoletas: number[] = []
  for (const [key, existente] of existentesMap) {
    if (existente.activo && !combinacionesEsperadas.has(key)) {
      idsObsoletas.push(existente.id)
    }
  }

  // 9. Ejecutar cambios en BD
  let insertadas = 0
  let reactivadas = 0
  let desactivadas = 0

  if (nuevasVariantes.length > 0) {
    const { error: insertError } = await (supabase
      .from('variantes_producto') as any)
      .insert(nuevasVariantes)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
    insertadas = nuevasVariantes.length
  }

  if (idsParaReactivar.length > 0) {
    const { error: reactivarError } = await (supabase
      .from('variantes_producto') as any)
      .update({ activo: true })
      .in('id', idsParaReactivar)

    if (!reactivarError) {
      reactivadas = idsParaReactivar.length
    }
  }

  if (idsObsoletas.length > 0) {
    const { error: desactivarError } = await (supabase
      .from('variantes_producto') as any)
      .update({ activo: false })
      .in('id', idsObsoletas)

    if (!desactivarError) {
      desactivadas = idsObsoletas.length
    }
  }

  revalidatePath('/(admin)/catalogo/[id]', 'page')

  const totalCambios = insertadas + reactivadas + desactivadas
  if (totalCambios === 0) {
    return { success: true, error: 'Las variantes ya están sincronizadas con el packing de la caja principal.' }
  }

  const partes: string[] = []
  if (insertadas > 0) partes.push(`${insertadas} nueva${insertadas !== 1 ? 's' : ''}`)
  if (reactivadas > 0) partes.push(`${reactivadas} reactivada${reactivadas !== 1 ? 's' : ''}`)
  if (desactivadas > 0) partes.push(`${desactivadas} desactivada${desactivadas !== 1 ? 's' : ''}`)

  return {
    success: true,
    id: totalCambios,
    error: `Sincronización completada: ${partes.join(', ')}. Total: ${combinacionesEsperadas.size} variantes activas según el packing de «${cajaPrincipal.codigo_caja}».`
  }
}

export async function desactivarCajaAction(cajaId: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cajas_producto')
    .update({ activo: false })
    .eq('id', cajaId)

  if (error) {
    console.error('Error desactivando caja:', error)
    throw new Error('No se pudo desactivar la caja')
  }

  // Refrescar las rutas afectadas
  revalidatePath('/(admin)/catalogo/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/cajas', 'page')
}

// Tipo para los detalles de caja
export type CajaDetalleInput = {
  talla_id: number
  color_id: number
  cantidad: number
}

/**
 * Actualiza los datos base de una caja (sin detalles)
 */
export async function updateCajaBaseAction(
  cajaId: number,
  data: Partial<SharedCajaData>
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('cajas_producto')
    .update({
      codigo_caja: data.codigo_caja,
      nombre_pack: data.nombre_pack,
      piezas_por_caja: data.piezas_por_caja,
      cbm: data.cbm,
      peso_bruto_kg: data.peso_bruto_kg,
      largo_cm: data.largo_cm,
      ancho_cm: data.ancho_cm,
      alto_cm: data.alto_cm,
      costo_total_caja: data.costo_total_caja,
      tallas: data.tallas,
      colores: data.colores,
    })
    .eq('id', cajaId)

  if (error) {
    console.error('Error actualizando caja:', error)
    throw new Error('No se pudo actualizar la caja')
  }

  // Refrescar rutas
  revalidatePath('/(admin)/catalogo/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/cajas', 'page')
}

/**
 * Actualiza los detalles (tallas × colores) de una caja
 * Elimina los detalles existentes y crea los nuevos
 */
export async function updateCajaDetallesAction(
  cajaId: number,
  detalles: CajaDetalleInput[]
): Promise<void> {
  const supabase = await createClient()

  // 1. Eliminar detalles existentes
  const { error: deleteError } = await supabase
    .from('caja_detalles')
    .delete()
    .eq('caja_id', cajaId)

  if (deleteError) {
    console.error('Error eliminando detalles antiguos:', deleteError)
    throw new Error('No se pudo actualizar los detalles de la caja')
  }

  // 2. Insertar nuevos detalles (solo los que tienen cantidad > 0)
  const detallesValidos = detalles.filter(d => d.cantidad > 0)

  if (detallesValidos.length > 0) {
    const { error: insertError } = await supabase
      .from('caja_detalles')
      .insert(
        detallesValidos.map(d => ({
          caja_id: cajaId,
          talla_id: d.talla_id,
          color_id: d.color_id,
          cantidad: d.cantidad,
        }))
      )

    if (insertError) {
      console.error('Error insertando nuevos detalles:', insertError)
      throw new Error('No se pudo guardar los detalles de la caja')
    }
  }

  // 3. Actualizar campos resumen solo si la matriz contiene detalles válidos
  // Si no hay detalles (totalPiezas = 0), respetamos lo que el usuario guardó manualmente
  const totalPiezas = detallesValidos.reduce((sum, d) => sum + d.cantidad, 0)

  if (totalPiezas > 0) {
    const tallasUnicas = new Set(detallesValidos.map(d => d.talla_id))
    const coloresUnicos = new Set(detallesValidos.map(d => d.color_id))

    const { data: tallasData } = await supabase
      .from('cat_tallas')
      .select('id, nombre, codigo')
      .in('id', Array.from(tallasUnicas))

    const { data: coloresData } = await supabase
      .from('cat_colores')
      .select('id, nombre')
      .in('id', Array.from(coloresUnicos))

    const tallasTexto = tallasData?.map(t => t.codigo || t.nombre).join('|') || ''
    const coloresTexto = coloresData?.map(c => c.nombre).join('|') || ''

    const { error: updateError } = await supabase
      .from('cajas_producto')
      .update({
        tallas: tallasTexto,
        colores: coloresTexto,
        piezas_por_caja: totalPiezas,
      })
      .eq('id', cajaId)

    if (updateError) {
      console.error('Error actualizando resumen de caja:', updateError)
    }
  }

  // Refrescar rutas
  revalidatePath('/(admin)/catalogo/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/cajas', 'page')
}

/**
 * Actualiza una caja completa (datos base + detalles) en una sola operación
 */
export async function updateCajaCompletaAction(
  cajaId: number,
  data: {
    base: Partial<SharedCajaData>
    detalles: CajaDetalleInput[]
  }
): Promise<void> {
  // Actualizar datos base
  await updateCajaBaseAction(cajaId, data.base)
  
  // Actualizar detalles
  await updateCajaDetallesAction(cajaId, data.detalles)
}

/**
 * Crea una nueva caja con sus detalles
 */
export async function createCajaAction(
  productoId: number,
  data: {
    base: Partial<SharedCajaData>
    detalles: CajaDetalleInput[]
  }
): Promise<number> {
  const supabase = await createClient()

  // Calcular totales para campos resumen
  const detallesValidos = data.detalles.filter(d => d.cantidad > 0)
  const totalPiezas = detallesValidos.reduce((sum, d) => sum + d.cantidad, 0)

  // 1. Crear la caja
  if (!data.base.codigo_caja) {
    throw new Error('El código de caja es requerido')
  }

  const { data: newCaja, error: cajaError } = await supabase
    .from('cajas_producto')
    .insert({
      producto_id: productoId,
      codigo_caja: data.base.codigo_caja,
      nombre_pack: data.base.nombre_pack,
      piezas_por_caja: data.base.piezas_por_caja || totalPiezas,
      cbm: data.base.cbm,
      peso_bruto_kg: data.base.peso_bruto_kg,
      largo_cm: data.base.largo_cm,
      ancho_cm: data.base.ancho_cm,
      alto_cm: data.base.alto_cm,
      costo_total_caja: data.base.costo_total_caja,
      tallas: data.base.tallas,
      colores: data.base.colores,
      activo: true,
    } as any)
    .select('id')
    .single()

  if (cajaError || !newCaja) {
    console.error('Error creando caja:', cajaError)
    throw new Error('No se pudo crear la caja')
  }

  const cajaId = newCaja.id

  // 2. Insertar detalles si existen
  if (detallesValidos.length > 0) {
    const { error: detallesError } = await supabase
      .from('caja_detalles')
      .insert(
        detallesValidos.map(d => ({
          caja_id: cajaId,
          talla_id: d.talla_id,
          color_id: d.color_id,
          cantidad: d.cantidad,
        }))
      )

    if (detallesError) {
      console.error('Error insertando detalles:', detallesError)
      // No lanzar error, la caja ya se creó
    }
  }

  // Refrescar rutas
  revalidatePath('/(admin)/catalogo/[id]', 'page')
  revalidatePath('/(admin)/ordenes-b2b/cajas', 'page')

  return cajaId
}
