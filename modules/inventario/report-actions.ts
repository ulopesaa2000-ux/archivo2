// modules/inventario/report-actions.ts
'use server'

import { fetchNotasParaReporte, fetchResumenReporteNotas } from './queries'
import type { FiltrosNotas, NotaListItem } from './types'
import { verifySession } from '@/lib/dal'
import { fetchBodegasUsuario } from '@/modules/auth/queries'

export async function getNotasParaReporteAction(
  filtros: Omit<FiltrosNotas, 'page'>
): Promise<NotaListItem[]> {
  try {
    const { user } = await verifySession()
    const isSuperAdmin = user.rol?.nivel_acceso === 1
    const isAdminInventario = user.rol?.nombre === 'Admin Operativo Inventario'

    const filtrosAplicados: Omit<FiltrosNotas, 'page'> = { ...filtros }

    // Restricciones para Nivel 3+ (Encargado y Bodeguero)
    if (!isSuperAdmin && !isAdminInventario) {
      const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)
      if (userBodegas.length === 0) {
        return []
      }
      filtrosAplicados.limit_bodega_ids = userBodegas.map(b => b.id)
      if (user.rol?.nombre === 'Bodeguero') {
        filtrosAplicados.limit_usuario_id = user.id
      }
    }

    return await fetchNotasParaReporte(filtrosAplicados)
  } catch (error) {
    console.error('Error getNotasParaReporteAction:', error)
    return []
  }
}

export async function getResumenReporteNotasAction(filtros: {
  bodegaIds?: number[]
  fechaDesde?: string
  fechaHasta?: string
}): Promise<{ total: number; porTipo: Record<string, number> }> {
  try {
    const { user } = await verifySession()
    const isSuperAdmin = user.rol?.nivel_acceso === 1
    const isAdminInventario = user.rol?.nombre === 'Admin Operativo Inventario'

    const filtrosAplicados: {
      bodegaIds?: number[]
      fechaDesde?: string
      fechaHasta?: string
      limit_usuario_id?: number
    } = { ...filtros }

    // Restricciones para Nivel 3+ (Encargado y Bodeguero)
    if (!isSuperAdmin && !isAdminInventario) {
      const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)
      if (userBodegas.length === 0) {
        return { total: 0, porTipo: {} }
      }
      
      const userBodegaIds = userBodegas.map(b => b.id)
      // Si el usuario especificó filtros de bodegaIds, filtramos la intersección con sus bodegas permitidas.
      // Si no especificó, le inyectamos todas las que tiene asignadas.
      if (filtros.bodegaIds && filtros.bodegaIds.length > 0) {
        filtrosAplicados.bodegaIds = filtros.bodegaIds.filter(id => userBodegaIds.includes(id))
      } else {
        filtrosAplicados.bodegaIds = userBodegaIds
      }

      if (user.rol?.nombre === 'Bodeguero') {
        filtrosAplicados.limit_usuario_id = user.id
      }
    }

    return await fetchResumenReporteNotas(filtrosAplicados)
  } catch (error) {
    console.error('Error getResumenReporteNotasAction:', error)
    return { total: 0, porTipo: {} }
  }
}
