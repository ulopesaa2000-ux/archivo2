// modules/catalogo/actions/_shared.ts
// Helpers compartidos para los sub-módulos de actions/catalogo.
// No lleva 'use server' aquí; el directive va en cada archivo de acción.

import { getCurrentUser } from '@/modules/auth/queries'
import { can, type PermissionAction } from '@/lib/auth/permissions'

export type ActionResult = {
  success: boolean
  error?: string
  id?: number
}

/** Verifica permisos sobre catálogo_productos antes de ejecutar la acción. */
export async function requireCatalogoPermission(
  action: PermissionAction
): Promise<ActionResult | null> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'No autenticado' }
  if (!can(user, 'catalogo_productos', action)) {
    return { success: false, error: 'No tienes permisos para modificar catalogo.' }
  }
  return null
}

// ── Helpers de saneo de FormData ────────────────────────────────────────

export function toCleanText(fd: FormData, key: string): string | null {
  const val = fd.get(key)
  if (!val || typeof val !== 'string') return null
  const trimmed = val.trim()
  return trimmed === '' ? null : trimmed
}

export function toInteger(fd: FormData, key: string): number | null {
  const val = fd.get(key)
  if (!val) return null
  const num = parseInt(String(val), 10)
  return isNaN(num) ? null : num
}

export function toNumeric(fd: FormData, key: string): number | null {
  const val = fd.get(key)
  if (!val) return null
  const num = parseFloat(String(val))
  return isNaN(num) ? null : num
}

export function toBoolean(fd: FormData, key: string): boolean {
  return fd.get(key) === 'true' || fd.get(key) === 'on'
}
