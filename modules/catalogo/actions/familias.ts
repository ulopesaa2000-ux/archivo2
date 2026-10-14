// modules/catalogo/actions/familias.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type ActionResult, requireCatalogoPermission } from './_shared'

// ─────────────────────────────────────────────────────────────────────────────
// FAMILIAS MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function moverProductosDeFamiliaAction(
  ids: number[],
  nuevaFamilia: string
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  if (!ids || ids.length === 0) {
    return { success: false, error: 'No se especificaron productos para mover' }
  }

  const cleanFamilia =
    nuevaFamilia && nuevaFamilia.trim() !== '' ? nuevaFamilia.trim() : null

  const supabase = await createClient()
  const { error } = await (supabase.from('productos') as any)
    .update({ familia: cleanFamilia })
    .in('id', ids)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo/familias')
  revalidatePath('/catalogo')
  return { success: true }
}

export async function renombrarFamiliaAction(
  familiaActual: string,
  nuevaFamilia: string
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  const cleanActual =
    familiaActual && familiaActual.trim() !== '' ? familiaActual.trim() : null
  const cleanNueva =
    nuevaFamilia && nuevaFamilia.trim() !== '' ? nuevaFamilia.trim() : null

  if (!cleanNueva) {
    return { success: false, error: 'El nuevo nombre de la familia no puede estar vacío.' }
  }

  const supabase = await createClient()
  let query = (supabase.from('productos') as any).update({ familia: cleanNueva })

  if (cleanActual === null) {
    query = query.is('familia', null)
  } else {
    query = query.eq('familia', cleanActual)
  }

  const { error } = await query

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo/familias')
  revalidatePath('/catalogo')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// EDICIÓN RÁPIDA DE DESCRIPCIÓN (inspector de Familias)
// ─────────────────────────────────────────────────────────────────────────────

export interface DescripcionRapidaAtributos {
  descripcion: string | null
  tipo_prenda_id: number | null
  genero_id: number | null
  edad_id: number | null
  marca_id: number | null
}

export async function fetchAtributosDescripcionAction(
  productoId: number
): Promise<{ success: boolean; data?: DescripcionRapidaAtributos; error?: string }> {
  const denied = await requireCatalogoPermission('puede_leer')
  if (denied) return denied

  if (!productoId || !Number.isFinite(productoId)) {
    return { success: false, error: 'ID de producto inválido' }
  }

  const supabase = await createClient()
  const { data, error } = await (supabase.from('productos') as any)
    .select('descripcion, tipo_prenda_id, genero_id, edad_id, marca_id')
    .eq('id', productoId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: 'Producto no encontrado' }

  return {
    success: true,
    data: {
      descripcion: data.descripcion ?? null,
      tipo_prenda_id: data.tipo_prenda_id ?? null,
      genero_id: data.genero_id ?? null,
      edad_id: data.edad_id ?? null,
      marca_id: data.marca_id ?? null,
    },
  }
}

export async function updateDescripcionRapidaAction(
  productoId: number,
  payload: DescripcionRapidaAtributos
): Promise<ActionResult> {
  const denied = await requireCatalogoPermission('puede_editar')
  if (denied) return denied

  if (!productoId || !Number.isFinite(productoId)) {
    return { success: false, error: 'ID de producto inválido' }
  }

  const supabase = await createClient()
  const { error } = await (supabase.from('productos') as any)
    .update({
      descripcion: payload.descripcion,
      tipo_prenda_id: payload.tipo_prenda_id,
      genero_id: payload.genero_id,
      edad_id: payload.edad_id,
      marca_id: payload.marca_id,
    })
    .eq('id', productoId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/catalogo/familias')
  revalidatePath('/catalogo')
  return { success: true }
}
