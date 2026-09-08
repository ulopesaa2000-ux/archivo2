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
  const { data: detalles, error: detallesError } = await supabase
    .from('caja_detalles')
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
  const { data: detalles, error: detallesError } = await supabase
    .from('caja_detalles')
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
  const { data: producto } = await supabase
    .from('productos')
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
      combinacionesEsperadas.set(key, { talla_id: d.talla_id as number, color_id: d.color_id as number })
    }
  }

  if (combinacionesEsperadas.size === 0) {
    return {
      success: false,
      error: `El packing de la caja «${cajaPrincipal.codigo_caja}» no tiene combinaciones válidas de talla × color. Verifica que los detalles tengan cantidad mayor a 0.`
    }
  }

  // 5. Obtener variantes existentes del producto (con ID para poder actualizarlas)
  const { data: variantesExistentes } = await supabase
    .from('variantes_producto')
    .select('id, talla_id, color_id, activo')
    .eq('producto_id', productoId)

  const existentesMap = new Map<string, { id: number; activo: boolean }>()
  for (const v of (variantesExistentes ?? [])) {
    const key = `${v.talla_id}-${v.color_id}`
    existentesMap.set(key, { id: v.id, activo: v.activo ?? false })
  }

  // 6. Obtener info de tallas y colores para construir SKU
  const { data: tallasData } = await supabase
    .from('cat_tallas')
    .select('id, codigo')

  const { data: coloresData } = await supabase
    .from('cat_colores')
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
    const { error: insertError } = await supabase
      .from('variantes_producto')
      .insert(nuevasVariantes)

    if (insertError) {
      return { success: false, error: insertError.message }
    }
    insertadas = nuevasVariantes.length
  }

  if (idsParaReactivar.length > 0) {
    const { error: reactivarError } = await supabase
      .from('variantes_producto')
      .update({ activo: true })
      .in('id', idsParaReactivar)

    if (!reactivarError) {
      reactivadas = idsParaReactivar.length
    }
  }

  if (idsObsoletas.length > 0) {
    const { error: desactivarError } = await supabase
      .from('variantes_producto')
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
  talla_id?: number | null
  color_id?: number | null
  talla_codigo?: string | null
  talla_nombre?: string | null
  color_nombre?: string | null
  cantidad: number
}

const COLOR_ALIAS_MAP: Record<string, string> = {
  LATTE: 'BEIGE',
  OXFORD: 'GRIS',
  'GRIS OXFORD': 'GRIS',
  MILITARY: 'VERDE',
  ARMY: 'VERDE',
  CAMO: 'VERDE',
  CAMEL: 'BEIGE',
  CREAM: 'BEIGE',
  ARENA: 'BEIGE',
  HUESO: 'BLANCO',
  BLACK: 'NEGRO',
  WHITE: 'BLANCO',
  NAVY: 'MARINO',
  'NAVY BLUE': 'AZUL MARINO',
  GRAY: 'GRIS',
  GREY: 'GRIS',
  BROWN: 'CAFÉ',
  COFFEE: 'CAFÉ',
  PINK: 'ROSA',
  ROSE: 'ROSA',
  RED: 'ROJO',
  BLUE: 'AZUL',
  YELLOW: 'AMARILLO',
  GREEN: 'VERDE',
  '黑色': 'NEGRO',
  '白色': 'BLANCO',
  '红色': 'ROJO',
  '藏青': 'MARINO',
  '藏青色': 'MARINO',
  '灰色': 'GRIS',
  '咖啡': 'CAFÉ',
  '咖啡色': 'CAFÉ',
}

const TALLA_ALIAS_MAP: Record<string, string> = {
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
  XXXXL: '4EG',
  '4X EXTRA GRANDE': '4EG',
  '5XL': '5EG',
  '5X EXTRA GRANDE': '5EG',
  OS: 'UNITALLA',
  'ONE SIZE': 'UNITALLA',
  'CH-M': 'CH-M',
  'CH/M': 'CH-M',
  'S-M': 'CH-M',
  'S/M': 'CH-M',
  SM: 'CH-M',
  'M-G': 'M-G',
  'M/G': 'M-G',
  'M-L': 'M-G',
  'M/L': 'M-G',
  ML: 'M-G',
  'G-EG': 'G-EG',
  'G/EG': 'G-EG',
  'L-XL': 'G-EG',
  'L/XL': 'G-EG',
  LXL: 'G-EG',
  'EG-2EG': 'EG-2EG',
  'EG/2EG': 'EG-2EG',
  'XL-2XL': 'EG-2EG',
  'XL/2XL': 'EG-2EG',
  'XL-XXL': 'EG-2EG',
  'XL/XXL': 'EG-2EG',
}

function normalizeStr(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Normaliza y resuelve talla_id y color_id válidos contra la base de datos,
 * evitando violaciones de foreign key en caja_detalles.
 */
async function resolveAndAggregateDetalles(
  supabase: any,
  cajaId: number,
  detalles: CajaDetalleInput[]
): Promise<{
  payloadRows: { caja_id: number; talla_id: number; color_id: number; cantidad: number }[]
  tallaIds: number[]
  colorIds: number[]
  totalPiezas: number
}> {
  const detallesValidos = detalles.filter(d => (d.cantidad || 0) > 0)
  if (detallesValidos.length === 0) {
    return { payloadRows: [], tallaIds: [], colorIds: [], totalPiezas: 0 }
  }

  const [tallasRes, coloresRes] = await Promise.all([
    supabase.from('cat_tallas').select('id, codigo, nombre, talla_us'),
    supabase.from('cat_colores').select('id, codigo, nombre').eq('activo', true)
  ])

  const tallasList = tallasRes.data || []
  const coloresList = coloresRes.data || []

  const validTallaIds = new Set<number>(tallasList.map((t: any) => t.id))
  const validColorIds = new Set<number>(coloresList.map((c: any) => c.id))

  const tallaMapByCodigo = new Map<string, number>()
  const tallaMapByNombre = new Map<string, number>()
  tallasList.forEach((t: any) => {
    if (t.codigo) tallaMapByCodigo.set(t.codigo.trim().toUpperCase(), t.id)
    if (t.nombre) tallaMapByNombre.set(t.nombre.trim().toUpperCase(), t.id)
    if (t.talla_us) tallaMapByCodigo.set(t.talla_us.trim().toUpperCase(), t.id)
  })

  function resolveTalla(d: CajaDetalleInput): number {
    const tallaKey = (d.talla_codigo || d.talla_nombre || '').trim().toUpperCase()
    const stdTalla = TALLA_ALIAS_MAP[tallaKey] || tallaKey

    if (stdTalla && tallaMapByCodigo.has(stdTalla)) return tallaMapByCodigo.get(stdTalla)!
    if (stdTalla && tallaMapByNombre.has(stdTalla)) return tallaMapByNombre.get(stdTalla)!
    if (tallaKey && tallaMapByCodigo.has(tallaKey)) return tallaMapByCodigo.get(tallaKey)!
    if (tallaKey && tallaMapByNombre.has(tallaKey)) return tallaMapByNombre.get(tallaKey)!

    if (stdTalla) {
      const norm = normalizeStr(stdTalla)
      const match = tallasList.find((t: any) => 
        normalizeStr(t.codigo) === norm || 
        normalizeStr(t.nombre) === norm || 
        normalizeStr(t.talla_us || '') === norm
      )
      if (match) return match.id
    }

    if (d.talla_id && validTallaIds.has(d.talla_id)) return d.talla_id

    return tallaMapByCodigo.get('CH') || tallasList[0]?.id || 1
  }

  function resolveColor(d: CajaDetalleInput): number {
    const rawColor = (d.color_nombre || '').trim().toUpperCase()
    const stdColor = COLOR_ALIAS_MAP[rawColor] || rawColor

    if (d.color_id && d.color_id < 10000 && validColorIds.has(d.color_id)) {
      return d.color_id
    }

    const matchExact = coloresList.find((c: any) => 
      c.nombre.trim().toUpperCase() === stdColor || 
      c.nombre.trim().toUpperCase() === rawColor ||
      c.codigo?.trim().toUpperCase() === stdColor ||
      c.codigo?.trim().toUpperCase() === rawColor
    )
    if (matchExact) return matchExact.id

    const normRaw = normalizeStr(rawColor)
    const normStd = normalizeStr(stdColor)
    const matchNorm = coloresList.find((c: any) => {
      const n = normalizeStr(c.nombre)
      return n === normStd || n === normRaw
    })
    if (matchNorm) return matchNorm.id

    if (normStd.length >= 3) {
      const matchPartial = coloresList.find((c: any) => {
        const n = normalizeStr(c.nombre)
        return n.includes(normStd) || normStd.includes(n)
      })
      if (matchPartial) return matchPartial.id
    }

    return coloresList.find((c: any) => c.id === 1)?.id || coloresList[0]?.id || 1
  }

  const aggregated = new Map<string, { caja_id: number; talla_id: number; color_id: number; cantidad: number }>()
  let totalPiezas = 0

  for (const d of detallesValidos) {
    const tallaId = resolveTalla(d)
    const colorId = resolveColor(d)
    const key = `${tallaId}_${colorId}`
    const cant = Number(d.cantidad) || 0
    totalPiezas += cant

    if (aggregated.has(key)) {
      aggregated.get(key)!.cantidad += cant
    } else {
      aggregated.set(key, {
        caja_id: cajaId,
        talla_id: tallaId,
        color_id: colorId,
        cantidad: cant,
      })
    }
  }

  const payloadRows = Array.from(aggregated.values())
  const tallaIds = Array.from(new Set(payloadRows.map(r => r.talla_id)))
  const colorIds = Array.from(new Set(payloadRows.map(r => r.color_id)))

  return { payloadRows, tallaIds, colorIds, totalPiezas }
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
      peso_neto: data.peso_neto,
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
    if (error.code === '23505') {
      if (error.message?.includes('codigo_caja') || error.message?.includes('cajas_producto_codigo_caja_key')) {
        throw new Error('El código de caja ya está registrado en el sistema por otro producto (los códigos deben ser únicos a nivel global).')
      } else {
        throw new Error('Error de duplicidad de llave primaria/índice en la base de datos (código 23505).')
      }
    }
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

  // 2. Normalizar e insertar nuevos detalles
  const { payloadRows, tallaIds, colorIds, totalPiezas } = await resolveAndAggregateDetalles(
    supabase,
    cajaId,
    detalles
  )

  if (payloadRows.length > 0) {
    const { error: insertError } = await supabase
      .from('caja_detalles')
      .insert(payloadRows)

    if (insertError) {
      console.error('Error insertando nuevos detalles:', insertError)
      throw new Error(`No se pudo guardar los detalles de la caja: ${insertError.message || 'Error de base de datos'}`)
    }
  }

  // 3. Actualizar campos resumen solo si la matriz contiene detalles válidos
  if (totalPiezas > 0) {
    const { data: tallasData } = await supabase
      .from('cat_tallas')
      .select('id, nombre, codigo')
      .in('id', tallaIds)

    const { data: coloresData } = await supabase
      .from('cat_colores')
      .select('id, nombre')
      .in('id', colorIds)

    const tallasTexto = tallasData?.map((t: any) => t.codigo || t.nombre).join('|') || ''
    const coloresTexto = coloresData?.map((c: any) => c.nombre).join('|') || ''

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
      peso_neto: data.base.peso_neto,
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
    if (cajaError?.code === '23505') {
      if (cajaError.message?.includes('codigo_caja') || cajaError.message?.includes('cajas_producto_codigo_caja_key')) {
        throw new Error('El código de caja ya está registrado en el sistema por otro producto (los códigos deben ser únicos a nivel global).')
      } else {
        throw new Error('Error de duplicidad de llave primaria/índice en la base de datos (código 23505).')
      }
    }
    throw new Error('No se pudo crear la caja')
  }

  const cajaId = newCaja.id

  // 2. Insertar detalles si existen
  // 2. Normalizar e insertar detalles si existen
  const { payloadRows } = await resolveAndAggregateDetalles(
    supabase,
    cajaId,
    data.detalles
  )

  if (payloadRows.length > 0) {
    const { error: detallesError } = await supabase
      .from('caja_detalles')
      .insert(payloadRows)

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
