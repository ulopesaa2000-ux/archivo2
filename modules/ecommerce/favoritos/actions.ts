// modules/ecommerce/favoritos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/modules/auth/queries'
import type { Database } from '@/lib/types/database.types'

type FavoritosTable = Database['inv-tienda']['Tables']['producto_favoritos']
type FavoritoInsert = FavoritosTable['Insert']

export interface FavoritoResult {
  success: boolean
  /** false = invitado (solo local); true = persistido en DB */
  synced: boolean
}

export interface SincronizarResult extends FavoritoResult {
  guardados: number
}

function isValidProductoWebId(id: unknown): id is number {
  return Number.isInteger(id) && (id as number) > 0
}

/**
 * Guarda un favorito en DB. Idempotente: si ya existe no duplica.
 * Invitados reciben synced:false para que el hook conserve solo local.
 */
export async function agregarFavorito(productoWebId: number): Promise<FavoritoResult> {
  if (!isValidProductoWebId(productoWebId)) {
    return { success: false, synced: false }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) return { success: true, synced: false }

  const supabase = await createClient()
  const payload: FavoritoInsert = {
    usuario_id: currentUser.id,
    producto_web_id: productoWebId,
  }

  const { error } = await supabase
    .from('producto_favoritos')
    .upsert(payload, { onConflict: 'usuario_id,producto_web_id', ignoreDuplicates: true })

  if (error) {
    console.error('Error agregarFavorito:', error)
    return { success: false, synced: false }
  }

  revalidatePath('/favoritos')
  return { success: true, synced: true }
}

/**
 * Quita un favorito en DB. Idempotente: si no existe igual es éxito.
 */
export async function quitarFavorito(productoWebId: number): Promise<FavoritoResult> {
  if (!isValidProductoWebId(productoWebId)) {
    return { success: false, synced: false }
  }

  const currentUser = await getCurrentUser()
  if (!currentUser) return { success: true, synced: false }

  const supabase = await createClient()

  const { error } = await supabase
    .from('producto_favoritos')
    .delete()
    .eq('usuario_id', currentUser.id)
    .eq('producto_web_id', productoWebId)

  if (error) {
    console.error('Error quitarFavorito:', error)
    return { success: false, synced: false }
  }

  revalidatePath('/favoritos')
  return { success: true, synced: true }
}

/**
 * Vacía todos los favoritos del usuario en DB.
 * Invitados reciben synced:false (solo se limpia local).
 */
export async function limpiarFavoritos(): Promise<FavoritoResult> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { success: true, synced: false }

  const supabase = await createClient()

  const { error } = await supabase
    .from('producto_favoritos')
    .delete()
    .eq('usuario_id', currentUser.id)

  if (error) {
    console.error('Error limpiarFavoritos:', error)
    return { success: false, synced: false }
  }

  revalidatePath('/favoritos')
  return { success: true, synced: true }
}

/**
 * Merge del login: guarda en DB solo los pendientes que falten,
 * sin borrar ni duplicar los que el usuario ya tenía.
 * El cliente debe limpiar el pendiente solo si success=true.
 */
export async function sincronizarFavoritosPendientes(ids: number[]): Promise<SincronizarResult> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return { success: true, synced: false, guardados: 0 }

  const pendientes = [...new Set(ids.filter(isValidProductoWebId))].slice(0, 200)
  if (pendientes.length === 0) return { success: true, synced: true, guardados: 0 }

  const supabase = await createClient()

  const { data: existentes } = await supabase
    .from('producto_favoritos')
    .select('producto_web_id')
    .eq('usuario_id', currentUser.id)

  const yaGuardados = new Set((existentes ?? []).map((row) => row.producto_web_id))
  const faltantes: FavoritoInsert[] = pendientes
    .filter((id) => !yaGuardados.has(id))
    .map((producto_web_id) => ({ usuario_id: currentUser.id, producto_web_id }))

  if (faltantes.length === 0) {
    return { success: true, synced: true, guardados: 0 }
  }

  const { error } = await supabase
    .from('producto_favoritos')
    .upsert(faltantes, { onConflict: 'usuario_id,producto_web_id', ignoreDuplicates: true })

  if (error) {
    console.error('Error sincronizarFavoritosPendientes:', error)
    return { success: false, synced: false, guardados: 0 }
  }

  revalidatePath('/favoritos')
  return { success: true, synced: true, guardados: faltantes.length }
}
