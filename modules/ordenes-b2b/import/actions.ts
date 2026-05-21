// modules/ordenes-b2b/import/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import { revalidatePath } from 'next/cache'

// ── Interfaces para la entrada de datos del Excel ───────────────────────────

export interface ExcelCajaRow {
  codigo_caja: string
  nombre_pack?: string
  producto_sku: string
  proveedor_nombre?: string
  piezas_por_caja?: string | number
  tallas?: string
  colores?: string
  costo_total_caja?: string | number
  peso_bruto_kg?: string | number
  largo_cm?: string | number
  ancho_cm?: string | number
  alto_cm?: string | number
  cbm?: string | number
  es_principal?: string | boolean
  activo?: string | boolean
}

export interface ExcelDetalleRow {
  codigo_caja: string
  variante_sku?: string
  talla_codigo?: string
  color_nombre?: string
  cantidad: string | number
}

// ── Interfaces para el resultado de validación (retorno a UI) ────────────────

export interface ImportDetalleItem {
  data: ExcelDetalleRow
  status: 'valido' | 'error'
  errors: string[]
  resolvedData: {
    variante_id: number | null
    talla_id: number | null
    color_id: number | null
    cantidad: number
  }
}

export interface ImportCajaItem {
  id: number // Index temporal
  data: ExcelCajaRow
  codigo_caja: string
  status: 'nuevo' | 'duplicado' | 'error'
  existingId?: number
  errors: string[]
  warnings: string[]
  action: 'crear' | 'omitir' | 'actualizar'
  resolvedData: {
    producto_id: number | null
    proveedor_id: number | null
    cbm: number | null
    piezas_por_caja: number
    costo_total_caja: number | null;
    peso_bruto_kg: number | null;
    largo_cm: number | null;
    ancho_cm: number | null;
    alto_cm: number | null;
    es_principal: boolean
    activo: boolean
  }
  detalles: ImportDetalleItem[]
}

export interface ImportCajasBatchResult {
  creados: number
  omitidos: number
  actualizados: number
  fallidos: number
  errores: { codigo_caja: string; error: string }[]
}

// ── Helper: Normalización y Parsing ──────────────────────────────────────────

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes' || v === 's'
  }
  return false
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''))
  return isNaN(num) ? null : num
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return isNaN(num) ? null : num
}

function cleanString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeLookup(value: unknown): string {
  return cleanString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
}

// ── 1. Validar Excel antes de importar (Paso 2) ──────────────────────────────

export async function validateCajasBeforeImportAction(
  cajasRows: ExcelCajaRow[],
  detallesRows: ExcelDetalleRow[],
  matchTallasPor: 'codigo' | 'talla_us' = 'codigo'
): Promise<{
  items: ImportCajaItem[]
  total: number
  duplicados: number
  nuevos: number
  errores: number
}> {
  const user = await getCurrentUser()
  if (!user) {
    return { items: [], total: 0, duplicados: 0, nuevos: 0, errores: 0 }
  }

  const supabase = await createClient()

  // ── A. Extraer valores únicos para consultas en lote ──────────────────────
  const codigosCajas = cajasRows.map(r => cleanString(r.codigo_caja).toUpperCase()).filter(Boolean)
  const skusProductos = cajasRows.map(r => cleanString(r.producto_sku).toUpperCase()).filter(Boolean)
  const nombresProveedores = cajasRows.map(r => cleanString(r.proveedor_nombre)).filter(Boolean)

  const variantesSkus = detallesRows.map(d => cleanString(d.variante_sku).toUpperCase()).filter(Boolean)
  const codigosTallas = detallesRows.map(d => cleanString(d.talla_codigo).toUpperCase()).filter(Boolean)

  // ── B. Consultas en paralelo para resolver FKs y duplicados ────────────────
  const [
    cajasExistentesRes,
    productosRes,
    proveedoresRes,
    variantesRes,
    tallasRes,
    coloresRes
  ] = await Promise.all([
    // Buscar cajas existentes por codigo_caja
    codigosCajas.length > 0
      ? supabase.from('cajas_producto').select('id, codigo_caja').in('codigo_caja', codigosCajas)
      : Promise.resolve({ data: [] }),

    // Buscar productos por SKU
    skusProductos.length > 0
      ? supabase.from('productos').select('id, sku_base').in('sku_base', skusProductos)
      : Promise.resolve({ data: [] }),

    // Buscar proveedores por nombre_completo (tipo_entidad = 'Proveedor')
    nombresProveedores.length > 0
      ? supabase.from('personas').select('id, nombre_completo').eq('tipo_entidad', 'Proveedor').in('nombre_completo', nombresProveedores)
      : Promise.resolve({ data: [] }),

    // Buscar variantes por SKU
    variantesSkus.length > 0
      ? supabase.from('variantes_producto').select('id, sku, talla_id, color_id').in('sku', variantesSkus)
      : Promise.resolve({ data: [] }),

    // Buscar tallas por código o código US
    codigosTallas.length > 0
      ? (matchTallasPor === 'talla_us'
          ? supabase.from('cat_tallas').select('id, codigo, talla_us').in('talla_us', codigosTallas)
          : supabase.from('cat_tallas').select('id, codigo, talla_us').in('codigo', codigosTallas))
      : Promise.resolve({ data: [] }),

    // Buscar todos los colores activos para hacer match flexible
    supabase.from('cat_colores').select('id, nombre, codigo').eq('activo', true),
  ])

  // Crear mapas de resolución rápida en memoria
  const mapCajasExistentes = new Map<string, number>(
    (cajasExistentesRes.data ?? []).map((c: any) => [c.codigo_caja.toUpperCase(), c.id])
  )
  const mapProductos = new Map<string, number>(
    (productosRes.data ?? []).map((p: any) => [p.sku_base.toUpperCase(), p.id])
  )
  const mapProveedores = new Map<string, number>(
    (proveedoresRes.data ?? []).map((pr: any) => [pr.nombre_completo.toLowerCase(), pr.id])
  )
  const mapVariantes = new Map<string, { id: number; talla_id: number | null; color_id: number | null }>(
    (variantesRes.data ?? []).map((v: any) => [
      v.sku.toUpperCase(),
      { id: v.id, talla_id: v.talla_id, color_id: v.color_id }
    ])
  )
  const mapTallas = new Map<string, number>(
    (tallasRes.data ?? []).map((t: any) => [
      String(matchTallasPor === 'talla_us' ? t.talla_us : t.codigo).toUpperCase(),
      t.id
    ])
  )

  const coloresActivos = coloresRes.data ?? []
  const findColorId = (identificador: string): number | null => {
    const cleanId = cleanString(identificador).toUpperCase()
    const normalizedId = normalizeLookup(identificador)
    if (!cleanId) return null

    // 1. Coincidencia por ID numérico
    const idNum = parseInt(cleanId)
    if (!isNaN(idNum)) {
      const match = coloresActivos.find((c: any) => c.id === idNum)
      if (match) return match.id
    }

    // 2. Coincidencia exacta por Código de color
    const matchCod = coloresActivos.find((c: any) => cleanString(c.codigo).toUpperCase() === cleanId)
    if (matchCod) return matchCod.id

    // 3. Coincidencia por Nombre
    const matchNom = coloresActivos.find((c: any) => cleanString(c.nombre).toUpperCase() === cleanId)
    if (matchNom) return matchNom.id

    // 4. Coincidencia normalizada: ignora acentos, espacios, guiones y diagonales
    const matchFlexible = coloresActivos.find((c: any) => {
      return normalizeLookup(c.codigo) === normalizedId || normalizeLookup(c.nombre) === normalizedId
    })
    if (matchFlexible) return matchFlexible.id

    return null
  }

  // ── C. Agrupar filas de detalles por codigo_caja ──────────────────────────
  const detallesPorCaja = new Map<string, ExcelDetalleRow[]>()
  for (const det of detallesRows) {
    const cod = cleanString(det.codigo_caja).toUpperCase()
    if (!cod) continue
    if (!detallesPorCaja.has(cod)) {
      detallesPorCaja.set(cod, [])
    }
    detallesPorCaja.get(cod)!.push(det)
  }

  // ── D. Validar y estructurar cada Caja ─────────────────────────────────────
  const items: ImportCajaItem[] = cajasRows.map((row, idx) => {
    const codigo_caja = cleanString(row.codigo_caja)
    const errors: string[] = []
    const warnings: string[] = []

    if (!codigo_caja) {
      errors.push('El código de caja es obligatorio')
    }

    // Resolver Producto
    const skuProd = cleanString(row.producto_sku).toUpperCase()
    const producto_id = mapProductos.get(skuProd) ?? null
    if (!skuProd) {
      errors.push('El SKU del producto es obligatorio')
    } else if (!producto_id) {
      errors.push(`El SKU de producto "${skuProd}" no existe en la base de datos`)
    }

    // Resolver Proveedor
    const provNom = cleanString(row.proveedor_nombre)
    const proveedor_id = provNom ? (mapProveedores.get(provNom.toLowerCase()) ?? null) : null
    if (provNom && !proveedor_id) {
      warnings.push(`Proveedor "${provNom}" no encontrado. Se guardará sin proveedor asignado`)
    }

    // Dimensiones y peso
    const largo_cm = toNum(row.largo_cm)
    const ancho_cm = toNum(row.ancho_cm)
    const alto_cm = toNum(row.alto_cm)
    const peso_bruto_kg = toNum(row.peso_bruto_kg)
    const costo_total_caja = toNum(row.costo_total_caja)
    const piezas_por_caja = toInt(row.piezas_por_caja) ?? 0

    // Cálculo automático de CBM si está vacío
    let cbm = toNum(row.cbm)
    if (cbm === null && largo_cm !== null && ancho_cm !== null && alto_cm !== null) {
      cbm = parseFloat(((largo_cm * ancho_cm * alto_cm) / 1000000).toFixed(3))
    }

    const es_principal = toBool(row.es_principal)
    const activo = row.activo !== undefined ? toBool(row.activo) : true

    // Validar detalles asociados
    const listDetExcel = detallesPorCaja.get(codigo_caja.toUpperCase()) ?? []
    const resolvedDetalles: ImportDetalleItem[] = listDetExcel.map(d => {
      const detErrors: string[] = []
      const qty = toInt(d.cantidad) ?? 0

      if (qty <= 0) {
        detErrors.push('La cantidad debe ser mayor a 0')
      }

      let resolvedVarId: number | null = null
      let resolvedTallaId: number | null = null
      let resolvedColorId: number | null = null

      const varSku = cleanString(d.variante_sku).toUpperCase()
      const talCod = cleanString(d.talla_codigo).toUpperCase()
      const colNom = cleanString(d.color_nombre)

      if (varSku) {
        const variantInfo = mapVariantes.get(varSku)
        if (!variantInfo) {
          detErrors.push(`SKU Variante "${varSku}" no existe`)
        } else {
          resolvedVarId = variantInfo.id
          resolvedTallaId = variantInfo.talla_id
          resolvedColorId = variantInfo.color_id
        }
      } else {
        if (!talCod || !colNom) {
          detErrors.push('Debe especificar "variante_sku" o la combinación de "talla_codigo" + "color_nombre"')
        } else {
          resolvedTallaId = mapTallas.get(talCod) ?? null
          resolvedColorId = findColorId(colNom)

          if (!resolvedTallaId) {
            detErrors.push(`Talla "${talCod}" no existe en cat_tallas`)
          }
          if (!resolvedColorId) {
            detErrors.push(`Color "${colNom}" no existe en cat_colores`)
          }
        }
      }

      return {
        data: d,
        status: detErrors.length > 0 ? 'error' : 'valido',
        errors: detErrors,
        resolvedData: {
          variante_id: resolvedVarId,
          talla_id: resolvedTallaId,
          color_id: resolvedColorId,
          cantidad: qty
        }
      }
    })

    // Errores globales en base a detalles
    if (resolvedDetalles.some(d => d.status === 'error')) {
      errors.push('Uno o más detalles de la caja contienen errores')
    }

    // Verificar coincidencia de suma de piezas de detalles con piezas_por_caja
    const totalPiezasDetalles = resolvedDetalles.reduce((sum, d) => sum + d.resolvedData.cantidad, 0)
    if (piezas_por_caja > 0 && totalPiezasDetalles > 0 && totalPiezasDetalles !== piezas_por_caja) {
      warnings.push(`La suma de las piezas en los detalles (${totalPiezasDetalles}) no coincide con el total de piezas de la caja (${piezas_por_caja})`)
    }

    // Si piezas_por_caja no se definió pero hay detalles, lo auto-llenamos
    const resolvedPiezasPorCaja = piezas_por_caja > 0 ? piezas_por_caja : totalPiezasDetalles

    const existingId = mapCajasExistentes.get(codigo_caja.toUpperCase())
    const status = errors.length > 0 ? 'error' : existingId ? 'duplicado' : 'nuevo'

    return {
      id: idx,
      data: row,
      codigo_caja,
      status,
      existingId,
      errors,
      warnings,
      action: existingId ? 'omitir' : 'crear',
      resolvedData: {
        producto_id,
        proveedor_id,
        cbm,
        piezas_por_caja: resolvedPiezasPorCaja,
        costo_total_caja,
        peso_bruto_kg,
        largo_cm,
        ancho_cm,
        alto_cm,
        es_principal,
        activo
      },
      detalles: resolvedDetalles
    }
  })

  return {
    items,
    total: items.length,
    duplicados: items.filter(i => i.status === 'duplicado').length,
    nuevos: items.filter(i => i.status === 'nuevo').length,
    errores: items.filter(i => i.status === 'error').length
  }
}

// ── 2. Guardar Cajas en Base de Datos (Paso 3) ────────────────────────────────

export async function importCajasBatchAction(
  items: ImportCajaItem[]
): Promise<ImportCajasBatchResult> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      creados: 0,
      omitidos: 0,
      actualizados: 0,
      fallidos: 0,
      errores: [{ codigo_caja: 'GENERAL', error: 'No autenticado' }]
    }
  }

  const supabase = await createClient()

  let creados = 0
  let omitidos = 0
  let actualizados = 0
  let fallidos = 0
  const errores: { codigo_caja: string; error: string }[] = []

  for (const item of items) {
    const row = item.data

    if (item.action === 'omitir') {
      omitidos++
      continue
    }

    const payloadCaja = {
      codigo_caja: item.codigo_caja.trim(),
      nombre_pack: row.nombre_pack?.trim() || null,
      producto_id: item.resolvedData.producto_id,
      proveedor_id: item.resolvedData.proveedor_id,
      piezas_por_caja: item.resolvedData.piezas_por_caja,
      tallas: row.tallas?.trim() || null,
      colores: row.colores?.trim() || null,
      costo_total_caja: item.resolvedData.costo_total_caja,
      peso_bruto_kg: item.resolvedData.peso_bruto_kg,
      largo_cm: item.resolvedData.largo_cm,
      ancho_cm: item.resolvedData.ancho_cm,
      alto_cm: item.resolvedData.alto_cm,
      cbm: item.resolvedData.cbm,
      es_principal: item.resolvedData.es_principal,
      activo: item.resolvedData.activo,
    }

    try {
      let cajaId = item.existingId

      if (item.action === 'actualizar' && cajaId) {
        // 1. Actualizar cabecera de la caja
        const { error: updateError } = await supabase
          .from('cajas_producto')
          .update(payloadCaja as any)
          .eq('id', cajaId)

        if (updateError) {
          fallidos++
          errores.push({ codigo_caja: item.codigo_caja, error: `Error actualizando caja: ${updateError.message}` })
          continue
        }

        // 2. Sobrescribir detalles: Eliminar desgloses anteriores
        const { error: deleteError } = await supabase
          .from('caja_detalles')
          .delete()
          .eq('caja_id', cajaId)

        if (deleteError) {
          fallidos++
          errores.push({ codigo_caja: item.codigo_caja, error: `Error eliminando detalles previos: ${deleteError.message}` })
          continue
        }

        actualizados++
      } else {
        // 3. Crear caja nueva
        const { data: newCaja, error: insertError } = await supabase
          .from('cajas_producto')
          .insert(payloadCaja as any)
          .select('id')
          .single()

        if (insertError) {
          fallidos++
          errores.push({ codigo_caja: item.codigo_caja, error: `Error insertando caja: ${insertError.message}` })
          continue
        }

        cajaId = newCaja.id
        creados++
      }

      // 4. Insertar nuevos detalles
      if (cajaId && item.detalles.length > 0) {
        const payloadDetalles = item.detalles.map(d => ({
          caja_id: cajaId!,
          variante_id: d.resolvedData.variante_id,
          talla_id: d.resolvedData.talla_id,
          color_id: d.resolvedData.color_id,
          cantidad: d.resolvedData.cantidad
        }))

        const { error: detailsError } = await supabase
          .from('caja_detalles')
          .insert(payloadDetalles)

        if (detailsError) {
          errores.push({
            codigo_caja: item.codigo_caja,
            error: `Caja guardada pero fallaron los detalles: ${detailsError.message}`
          })
        }
      }
    } catch (err) {
      fallidos++
      errores.push({
        codigo_caja: item.codigo_caja,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  revalidatePath('/ordenes-b2b/cajas')

  return { creados, omitidos, actualizados, fallidos, errores }
}
