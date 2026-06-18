// modules/catalogo/import/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '../actions'

// ── Tipos para el flujo de importación

export interface CsvProductoRow {
  sku_base: string
  nombre: string
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


export interface ImportItem {
  data: CsvProductoRow
  sku: string
  status: 'nuevo' | 'duplicado' | 'omitido' | 'error'
  existingId?: number
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
function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'si' || v === 'sí' || v === 'yes'
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
  return value.trim().toUpperCase()
}

// ── 1. Validar CSV antes de importar (sin tocar BD aun) ─────────────────────
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

  // 2. Verificar existencia en BD (una sola query exacta)
  const existingMap = new Map<string, number>()
  if (csvSkus.length > 0) {
    const { data } = await (supabase.from('productos') as any)
      .select('id, sku_base')
      .in('sku_base', csvSkus)
    for (const item of data ?? []) {
      existingMap.set(item.sku_base.toUpperCase(), item.id)
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
    const tokenToDbId = new Map<string, number>()

    for (const token of uniqueTokens) {
      const { data } = await (supabase.from('productos') as any)
        .select('id, sku_base')
        .ilike('sku_base', `%${token}%`)
        .limit(5)
      for (const item of data ?? []) {
        if (!tokenToDbId.has(token)) {
          tokenToDbId.set(token, item.id)
        }
      }
    }

    for (const { csvSku, andToken } of andEntries) {
      const dbId = tokenToDbId.get(andToken)
      if (dbId && !existingMap.has(csvSku)) {
        existingMap.set(csvSku, dbId)
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
    if (!row.descripcion) errors.push('Descripción vacía')

    const existingId = existingMap.get(sku)
    if (existingId) {
      errors.push(`SKU "${sku}" ya existe en la base de datos (ID: ${existingId})`)
    }

    // Advertencia ADN: posible error de digitación
    if (!existingId && adnSuggestions.has(sku)) {
      const suggestion = adnSuggestions.get(sku)!
      warnings.push(
        `Posible error de digitación: "${sku}" contiene "ADN". ¿Quiso decir "${suggestion}"? Use el botón "Probar AND" para verificar.`
      )
    }

    return {
      data: row,
      sku,
      status: existingId ? 'duplicado' : errors.length > 0 ? 'error' : 'nuevo',
      existingId,
      errors,
      warnings,
      action: existingId ? 'omitir' : 'crear',
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
  if (!user) return { creados: 0, omitidos: 0, actualizados: 0, fallidos: 0, errores: [{ sku: 'GENERAL', error: 'No autenticado' }] }

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

    if (item.action === 'actualizar' && item.existingId) {
      // Aquí se podría implementar actualización de campos
      // Por ahora se omite para simplificar
      // actualizados++
      omitidos++
      continue
    }

    if (item.action === 'crear') {
      try {
        const payload = {
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
          activo: toBool(row.activo),
          destacado: toBool(row.destacado),
          es_conjunto: toBool(row.es_conjunto),
          estado: row.estado ?? 'borrador',
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


