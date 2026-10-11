// modules/catalogo/import/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/types/database.types'

// ── Tipos para el flujo de importación ──────────────────────────────────────

export interface CsvProductoRow {
  sku_base: string
  nombre?: string
  descripcion?: string
  composicion?: string
  familia?: string
  precio_ec?: string | number
  marca_id?: string | number | null
  genero_id?: string | number | null
  tipo_prenda_id?: string | number | null
  edad_id?: string | number | null
  tela_ext_id?: string | number | null
  tela_forro_id?: string | number | null
  persona_id?: string | number | null
  cliente_b2b_id?: string | number | null
  pz_en_caja?: string | number
  activo?: string | boolean
  destacado?: string | boolean
  es_conjunto?: string | boolean
  estado?: string
}

export interface ExistingProductData {
  id: number
  sku_base: string
  nombre: string | null
  descripcion: string | null
  composicion: string | null
  familia: string | null
  precio_ec: number | null
  marca_id: number | null
  genero_id: number | null
  tipo_prenda_id: number | null
  edad_id: number | null
  tela_ext_id: number | null
  tela_forro_id: number | null
  persona_id: number | null
  cliente_b2b_id: number | null
  pz_en_caja: number | null
  activo: boolean | null
  destacado: boolean | null
  es_conjunto: boolean | null
  estado: string | null
}

export interface FieldDiff {
  field: string
  label: string
  oldValue: string | number | boolean | null
  newValue: string | number | boolean | null
}

export interface ImportItem {
  data: CsvProductoRow
  sku: string
  status: 'nuevo' | 'duplicado' | 'omitido' | 'error'
  existingId?: number
  existingData?: ExistingProductData
  diffs?: FieldDiff[]
  errors: string[]
  warnings: string[]
  action: 'crear' | 'omitir' | 'actualizar'
}

export interface ImportBatchResult {
  creados: number
  omitidos: number
  actualizados: number
  fallidos: number
  errores: { sku: string; error: string }[]
}

// ── Helper: normalizar strings a boolean ────────────────────────────────────
function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes') return true
    if (v === 'false' || v === '0' || v === 'no') return false
  }
  return false
}

// ── Helper: parsear número ─────────────────────────────────────────────────
function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''))
  return isNaN(num) ? null : num
}

// ── Helper: parsear entero ──────────────────────────────────────────────────
function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  return isNaN(num) ? null : num
}

// ── Helper: sanitizar SKU ───────────────────────────────────────────────────
function cleanSku(value: string): string {
  return value ? value.trim().toUpperCase() : ''
}

// ── Helper: calcular diferencias entre producto existente y fila CSV ────────
function computeFieldDiffs(row: CsvProductoRow, existing: ExistingProductData): FieldDiff[] {
  const diffs: FieldDiff[] = []

  const checkText = (field: keyof ExistingProductData, label: string, csvVal?: string) => {
    if (csvVal !== undefined && csvVal !== '') {
      const cleanNew = csvVal.trim()
      const old = (existing[field] as string) || ''
      if (cleanNew !== old) {
        diffs.push({ field: String(field), label, oldValue: old || null, newValue: cleanNew })
      }
    }
  }

  const checkNumber = (field: keyof ExistingProductData, label: string, csvVal?: string | number) => {
    if (csvVal !== undefined && csvVal !== '') {
      const cleanNew = toNum(csvVal)
      const old = existing[field] as number | null
      if (cleanNew !== old && !(cleanNew === null && old === null)) {
        diffs.push({ field: String(field), label, oldValue: old, newValue: cleanNew })
      }
    }
  }

  const checkInt = (field: keyof ExistingProductData, label: string, csvVal?: string | number | null) => {
    if (csvVal !== undefined && csvVal !== null && csvVal !== '') {
      const cleanNew = toInt(csvVal)
      const old = existing[field] as number | null
      if (cleanNew !== old && !(cleanNew === null && old === null)) {
        diffs.push({ field: String(field), label, oldValue: old, newValue: cleanNew })
      }
    }
  }

  const checkBool = (field: keyof ExistingProductData, label: string, csvVal?: string | boolean) => {
    if (csvVal !== undefined && csvVal !== '') {
      const cleanNew = toBool(csvVal)
      const old = existing[field] as boolean | null
      if (cleanNew !== null && cleanNew !== old) {
        diffs.push({ field: String(field), label, oldValue: old, newValue: cleanNew })
      }
    }
  }

  checkText('nombre', 'Nombre', row.nombre)
  checkText('descripcion', 'Descripción', row.descripcion)
  checkText('composicion', 'Composición', row.composicion)
  checkText('familia', 'Familia', row.familia)
  checkText('estado', 'Estado', row.estado)
  checkNumber('precio_ec', 'Precio EC', row.precio_ec)
  checkInt('marca_id', 'Marca ID', row.marca_id)
  checkInt('genero_id', 'Género ID', row.genero_id)
  checkInt('tipo_prenda_id', 'Tipo Prenda ID', row.tipo_prenda_id)
  checkInt('edad_id', 'Edad ID', row.edad_id)
  checkInt('tela_ext_id', 'Tela Ext ID', row.tela_ext_id)
  checkInt('tela_forro_id', 'Tela Forro ID', row.tela_forro_id)
  checkInt('persona_id', 'Persona ID', row.persona_id)
  checkInt('cliente_b2b_id', 'Cliente B2B ID', row.cliente_b2b_id)
  checkInt('pz_en_caja', 'Pz en Caja', row.pz_en_caja)
  checkBool('activo', 'Activo', row.activo)
  checkBool('destacado', 'Destacado', row.destacado)
  checkBool('es_conjunto', 'Es Conjunto', row.es_conjunto)

  return diffs
}

// ── 1. Validar CSV antes de importar (sin tocar BD aún) ─────────────────────
export async function validateCsvBeforeImportAction(
  rows: CsvProductoRow[]
): Promise<{
  items: ImportItem[]
  total: number
  duplicados: number
  nuevos: number
  errores: number
}> {
  const result = await getCurrentUser()
  if (!result) {
    return { items: [], total: 0, duplicados: 0, nuevos: 0, errores: 0 }
  }

  const supabase = await createClient()

  // 1. Extraer todos los SKUs del CSV
  const csvSkus = rows.map(r => cleanSku(r.sku_base)).filter(Boolean)

  // 2. Verificar existencia en BD con datos completos
  const existingMap = new Map<string, ExistingProductData>()
  if (csvSkus.length > 0) {
    const { data } = await (supabase.from('productos') as any)
      .select('id, sku_base, nombre, descripcion, composicion, familia, precio_ec, marca_id, genero_id, tipo_prenda_id, edad_id, tela_ext_id, tela_forro_id, persona_id, cliente_b2b_id, pz_en_caja, activo, destacado, es_conjunto, estado')
      .in('sku_base', csvSkus)

    for (const item of (data ?? []) as ExistingProductData[]) {
      existingMap.set(item.sku_base.toUpperCase(), item)
    }
  }

  // 2b. Búsqueda parcial para SKUs con "AND" (proveedor MOTI)
  //     Ej: CSV "3JA2132 AND260023" → busca "AND260023" vía ilike
  const andTokenRegex = /\b(AND\d+)/i
  const andEntries: Array<{ csvSku: string; andToken: string }> = []
  for (const sku of csvSkus) {
    const match = sku.match(andTokenRegex)
    if (match && !existingMap.has(sku)) {
      andEntries.push({ csvSku: sku, andToken: match[1].toUpperCase() })
    }
  }

  if (andEntries.length > 0) {
    const uniqueTokens = [...new Set(andEntries.map(e => e.andToken))]
    const tokenToDbProduct = new Map<string, ExistingProductData>()

    for (const token of uniqueTokens) {
      const { data } = await (supabase.from('productos') as any)
        .select('id, sku_base, nombre, descripcion, composicion, familia, precio_ec, marca_id, genero_id, tipo_prenda_id, edad_id, tela_ext_id, tela_forro_id, persona_id, cliente_b2b_id, pz_en_caja, activo, destacado, es_conjunto, estado')
        .ilike('sku_base', `%${token}%`)
        .limit(5)

      for (const item of (data ?? []) as ExistingProductData[]) {
        if (!tokenToDbProduct.has(token)) {
          tokenToDbProduct.set(token, item)
        }
      }
    }

    for (const { csvSku, andToken } of andEntries) {
      const dbProd = tokenToDbProduct.get(andToken)
      if (dbProd && !existingMap.has(csvSku)) {
        existingMap.set(csvSku, dbProd)
      }
    }
  }

  // 2c. Detectar SKUs con "ADN" (posible typo de "AND") que no matchearon
  const adnTokenRegex = /\bADN\d+/i
  const adnSuggestions = new Map<string, string>() // sku original → sugerencia AND
  for (const sku of csvSkus) {
    if (existingMap.has(sku)) continue
    const match = sku.match(adnTokenRegex)
    if (match) {
      const suggestion = sku.replace(/ADN/i, 'AND')
      adnSuggestions.set(sku, suggestion)
    }
  }

  // 3. Construir items con estado
  const items: ImportItem[] = rows.map(row => {
    const sku = cleanSku(row.sku_base)
    const errors: string[] = []
    const warnings: string[] = []

    if (!sku) errors.push('SKU vacío')

    const existingProduct = existingMap.get(sku)
    let diffs: FieldDiff[] = []

    if (existingProduct) {
      diffs = computeFieldDiffs(row, existingProduct)
      if (diffs.length > 0) {
        warnings.push(`${diffs.length} campo(s) con valores distintos al existente en base de datos`)
      } else {
        warnings.push('El producto ya existe y no presenta cambios detectados en las columnas del CSV')
      }
    } else {
      if (!row.descripcion && !row.nombre) {
        errors.push('Debe especificar al menos nombre o descripción para productos nuevos')
      }
    }

    // Advertencia ADN: posible error de digitación
    if (!existingProduct && adnSuggestions.has(sku)) {
      const suggestion = adnSuggestions.get(sku)!
      warnings.push(
        `Posible error de digitación: "${sku}" contiene "ADN". ¿Quiso decir "${suggestion}"? Use el botón "Probar AND" para verificar.`
      )
    }

    const status: ImportItem['status'] = errors.length > 0 ? 'error' : existingProduct ? 'duplicado' : 'nuevo'
    const defaultAction: ImportItem['action'] = existingProduct ? 'actualizar' : 'crear'

    return {
      data: row,
      sku,
      status,
      existingId: existingProduct?.id,
      existingData: existingProduct,
      diffs,
      errors,
      warnings,
      action: defaultAction,
    }
  })

  return {
    items,
    total: items.length,
    duplicados: items.filter(i => i.status === 'duplicado').length,
    nuevos: items.filter(i => i.status === 'nuevo').length,
    errores: items.filter(i => i.status === 'error').length,
  }
}

// ── 2. Importar productos desde CSV (confirmados por usuario) ─────────────
export async function importProductsFromCsvAction(
  items: ImportItem[]
): Promise<ImportBatchResult> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      creados: 0,
      omitidos: 0,
      actualizados: 0,
      fallidos: 0,
      errores: [{ sku: 'GENERAL', error: 'No autenticado' }],
    }
  }

  const supabase = await createClient()

  let creados = 0
  let omitidos = 0
  let actualizados = 0
  let fallidos = 0
  const errores: { sku: string; error: string }[] = []

  for (const item of items) {
    const row = item.data

    if (item.action === 'omitir') {
      omitidos++
      continue
    }

    // ── Actualizar producto existente
    if (item.action === 'actualizar' && item.existingId) {
      try {
        const updatePayload: Database['inv-tienda']['Tables']['productos']['Update'] = {
          updated_at: new Date().toISOString(),
        }

        if (row.nombre !== undefined && row.nombre !== '') updatePayload.nombre = row.nombre.trim()
        if (row.descripcion !== undefined && row.descripcion !== '') updatePayload.descripcion = row.descripcion.trim()
        if (row.composicion !== undefined && row.composicion !== '') updatePayload.composicion = row.composicion.trim()
        if (row.familia !== undefined && row.familia !== '') updatePayload.familia = row.familia.trim()
        if (row.precio_ec !== undefined && row.precio_ec !== '') updatePayload.precio_ec = toNum(row.precio_ec)
        if (row.marca_id !== undefined && row.marca_id !== '') updatePayload.marca_id = toInt(row.marca_id)
        if (row.genero_id !== undefined && row.genero_id !== '') updatePayload.genero_id = toInt(row.genero_id)
        if (row.tipo_prenda_id !== undefined && row.tipo_prenda_id !== '') updatePayload.tipo_prenda_id = toInt(row.tipo_prenda_id)
        if (row.edad_id !== undefined && row.edad_id !== '') updatePayload.edad_id = toInt(row.edad_id)
        if (row.tela_ext_id !== undefined && row.tela_ext_id !== '') updatePayload.tela_ext_id = toInt(row.tela_ext_id)
        if (row.tela_forro_id !== undefined && row.tela_forro_id !== '') updatePayload.tela_forro_id = toInt(row.tela_forro_id)
        if (row.persona_id !== undefined && row.persona_id !== '') updatePayload.persona_id = toInt(row.persona_id)
        if (row.cliente_b2b_id !== undefined && row.cliente_b2b_id !== '') updatePayload.cliente_b2b_id = toInt(row.cliente_b2b_id)
        if (row.pz_en_caja !== undefined && row.pz_en_caja !== '') updatePayload.pz_en_caja = toInt(row.pz_en_caja)
        
        const boolActivo = toBool(row.activo)
        if (boolActivo !== null) updatePayload.activo = boolActivo

        const boolDestacado = toBool(row.destacado)
        if (boolDestacado !== null) updatePayload.destacado = boolDestacado

        const boolConjunto = toBool(row.es_conjunto)
        if (boolConjunto !== null) updatePayload.es_conjunto = boolConjunto

        if (row.estado !== undefined && row.estado !== '') updatePayload.estado = row.estado.trim()

        const { error } = await (supabase.from('productos') as any)
          .update(updatePayload)
          .eq('id', item.existingId)

        if (error) {
          fallidos++
          errores.push({ sku: item.sku || row.sku_base, error: error.message })
        } else {
          actualizados++
        }
      } catch (err) {
        fallidos++
        errores.push({ sku: item.sku || row.sku_base, error: err instanceof Error ? err.message : String(err) })
      }
      continue
    }

    // ── Crear nuevo producto (o forzar creación)
    if (item.action === 'crear') {
      try {
        const payload: Database['inv-tienda']['Tables']['productos']['Insert'] = {
          sku_base: cleanSku(row.sku_base),
          nombre: row.nombre?.trim() || null,
          descripcion: row.descripcion?.trim() || null,
          composicion: row.composicion?.trim() || null,
          familia: row.familia?.trim() || 'F000-000C',
          precio_ec: toNum(row.precio_ec),
          marca_id: toInt(row.marca_id),
          genero_id: toInt(row.genero_id),
          tipo_prenda_id: toInt(row.tipo_prenda_id),
          edad_id: toInt(row.edad_id),
          tela_ext_id: toInt(row.tela_ext_id),
          tela_forro_id: toInt(row.tela_forro_id),
          persona_id: toInt(row.persona_id),
          cliente_b2b_id: toInt(row.cliente_b2b_id),
          pz_en_caja: toInt(row.pz_en_caja) ?? 1,
          activo: toBool(row.activo) ?? true,
          destacado: toBool(row.destacado) ?? false,
          es_conjunto: toBool(row.es_conjunto) ?? false,
          estado: row.estado?.trim() || 'borrador',
        }

        const { error } = await (supabase.from('productos') as any)
          .insert(payload)

        if (error) {
          fallidos++
          errores.push({ sku: row.sku_base, error: error.message })
        } else {
          creados++
        }
      } catch (err) {
        fallidos++
        errores.push({ sku: row.sku_base, error: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  revalidatePath('/catalogo')

  return { creados, omitidos, actualizados, fallidos, errores }
}
