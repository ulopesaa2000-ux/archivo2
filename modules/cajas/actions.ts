'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { SharedCajaData } from './types'

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

  // 3. Actualizar los campos resumen en cajas_producto
  // Calcular totales para actualizar tallas, colores y piezas_por_caja
  const tallasUnicas = new Set(detallesValidos.map(d => d.talla_id))
  const coloresUnicos = new Set(detallesValidos.map(d => d.color_id))
  const totalPiezas = detallesValidos.reduce((sum, d) => sum + d.cantidad, 0)

  // Obtener nombres de tallas y colores para el campo texto
  const { data: tallasData } = await supabase
    .from('cat_tallas')
    .select('id, nombre, codigo')
    .in('id', Array.from(tallasUnicas))

  const { data: coloresData } = await supabase
    .from('cat_colores')
    .select('id, nombre')
    .in('id', Array.from(coloresUnicos))

  // El usuario solicitó guardar el código de las tallas y concatenar con "|"
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
