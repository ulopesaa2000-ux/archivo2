// modules/admin-table/config/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import { revalidatePath } from 'next/cache'
import type { TableFeatures } from '@/components/admin/DataTable/types'
import type { SaveTableConfigPayload } from './types'

export type ActionResult = {
  success: boolean
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardar config de una tabla para el usuario actual (upsert)
// ─────────────────────────────────────────────────────────────────────────────
export async function saveTableConfigAction(
  payload: SaveTableConfigPayload
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('user_table_configs' as any)
    .upsert(
      {
        user_id: user.id,
        route: payload.route,
        features: payload.features,
        columnas_visibles: payload.columnas_visibles ?? null,
        is_default: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,route' }
    ))

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracion/tablas')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Marcar una config como "usar default" (elimina la config del usuario)
// ─────────────────────────────────────────────────────────────────────────────
export async function resetTableConfigAction(
  route: string
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const supabase = await createClient()

  // Opción 1: eliminar el registro (volverá a usar default)
  const { error } = await (supabase
    .from('user_table_configs' as any)
    .delete()
    .eq('user_id', user.id)
    .eq('route', route))

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracion/tablas')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Guardar varias configs de una vez (batch)
// ─────────────────────────────────────────────────────────────────────────────
export async function saveTableConfigsBatchAction(
  configs: SaveTableConfigPayload[]
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  if (!configs.length) return { success: true }

  const supabase = await createClient()

  const rows = configs.map((c) => ({
    user_id: user.id,
    route: c.route,
    features: c.features,
    columnas_visibles: c.columnas_visibles ?? null,
    is_default: false,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await (supabase
    .from('user_table_configs' as any)
    .upsert(rows, { onConflict: 'user_id,route' }))

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracion/tablas')
  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar un default global (solo admins)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateTableConfigDefaultAction(
  route: string,
  features: TableFeatures
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Verificar que sea admin (nivel acceso bajo)
  if ((user.rol?.nivel_acceso ?? 99) > 2) {
    return { success: false, error: 'Solo admins pueden modificar defaults' }
  }

  const supabase = await createClient()

  const { error } = await (supabase
    .from('table_config_defaults' as any)
    .upsert(
      {
        route,
        features,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'route' }
    ))

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/configuracion/tablas')
  return { success: true }
}