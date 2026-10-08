// modules/ecommerce/favoritos/queries.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'

/**
 * IDs de productos_web marcados como favoritos por el usuario en sesión.
 * Retorna `null` si no hay sesión (invitado: la fuente es localStorage).
 */
export async function fetchFavoritosUsuario(): Promise<number[] | null> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return null

  const supabase = await createClient()

  // Solo publicados: lo despublicado se conserva en DB pero no se muestra
  const { data, error } = await (supabase
    .from('producto_favoritos') as any)
    .select('producto_web_id, productos_web!inner(activo)')
    .eq('usuario_id', currentUser.id)
    .eq('productos_web.activo', true)

  if (error) {
    console.error('Error fetchFavoritosUsuario:', error)
    return []
  }

  return ((data ?? []) as { producto_web_id: number }[])
    .map((row) => row.producto_web_id)
    .filter((id): id is number => Number.isInteger(id) && (id as number) > 0)
}
