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
