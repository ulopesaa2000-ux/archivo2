// modules/ecommerce/actions/public-reads.ts
'use server'

import { z } from 'zod'
import {
  fetchProductosWebByIds,
  fetchProductosFavoritos,
  buscarOrdenInvitado,
} from '../queries'
import type { OrdenVentaDetalle, ProductoWebPublico } from '../types'

const idsSchema = z.array(z.number().int().positive()).max(50)

const guestLookupSchema = z.object({
  folio: z
    .string()
    .trim()
    .min(4)
    .max(40)
    .regex(/^[A-Z0-9-]+$/i, 'Formato de folio inválido'),
  email: z.string().trim().email().max(160),
})

/**
 * Lectura pública acotada para Favoritos y Vistos Recientemente.
 * Los IDs provienen de localStorage y se validan estrictamente con Zod (máx 50).
 */
export async function publicFetchProductosWebByIdsAction(
  ids: unknown
): Promise<ProductoWebPublico[]> {
  const parsed = idsSchema.safeParse(ids)
  if (!parsed.success || parsed.data.length === 0) return []
  return fetchProductosWebByIds(parsed.data)
}

/**
 * Lectura pública acotada para la página /favoritos.
 */
export async function publicFetchProductosFavoritosAction(
  ids: unknown
): Promise<ProductoWebPublico[]> {
  const parsed = idsSchema.safeParse(ids)
  if (!parsed.success || parsed.data.length === 0) return []
  return fetchProductosFavoritos(parsed.data)
}

/**
 * Búsqueda pública de orden para invitados (folio exacto + email coincidente).
 */
export async function publicBuscarOrdenInvitadoAction(
  folio: unknown,
  email: unknown
): Promise<OrdenVentaDetalle | null> {
  const parsed = guestLookupSchema.safeParse({ folio, email })
  if (!parsed.success) return null
  return buscarOrdenInvitado(parsed.data.folio, parsed.data.email)
}
