// modules/inventario/report-actions.ts
'use server'

import { fetchNotasParaReporte, fetchResumenReporteNotas } from './queries'
import { fetchKardexHistorico, fetchStockHistorico } from './historico-queries'
import { fetchDescripcionesCanonicasFamilias } from '@/modules/catalogo/queries'
import { fetchCatalogosInventario } from './queries'
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

// ─────────────────────────────────────────────────────────────────────────────
// Reporte de Stock Histórico (Excel) — sin paginar, con el mismo scoping por rol
// ─────────────────────────────────────────────────────────────────────────────

export type AlcanceReporte = {
  bodegaId?: number | null
  ciudad?: string | null
}

/** Bodegas del usuario dentro del alcance pedido (respeta la matriz de permisos). */
async function resolverBodegasDelAlcance(alcance: AlcanceReporte) {
  const { user } = await verifySession()
  const permitidas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)
  if (alcance.bodegaId) {
    return permitidas.filter((b) => b.id === alcance.bodegaId)
  }
  if (alcance.ciudad) {
    const cd = alcance.ciudad.trim().toUpperCase()
    return permitidas.filter((b) => (b.ciudad || 'VIRTUAL').trim().toUpperCase() === cd)
  }
  return permitidas
}

export async function getReporteStockHistoricoAction(opts: {
  fechaCorte: string
  alcance?: AlcanceReporte
}): Promise<
  | {
      ok: true
      corte: Awaited<ReturnType<typeof fetchStockHistorico>>
      descripcionesCanonicas: Record<string, string>
      /** Nombres de todas las bodegas activas (para el origen/destino de los movimientos). */
      nombresBodega: Record<number, string>
    }
  | { ok: false; error: string }
> {
  try {
    const bodegas = await resolverBodegasDelAlcance(opts.alcance ?? {})
    if (bodegas.length === 0) {
      return { ok: false, error: 'No tienes bodegas disponibles en ese alcance.' }
    }
    // Modo y tipo de columna según el alcance (misma regla que la vista).
    const modo: 'individual' | 'agrupado' = bodegas.length > 1 ? 'agrupado' : 'individual'
    const columnasPor: 'bodega' | 'ciudad' = opts.alcance?.ciudad ? 'bodega' : 'ciudad'

    const [corte, descripcionesCanonicas, catalogos] = await Promise.all([
      fetchStockHistorico({
        fechaCorte: opts.fechaCorte,
        bodegaIds: bodegas.map((b) => b.id),
        bodegas,
        page: 1,
        limit: 100000,
        modo,
        columnasPor,
      }),
      fetchDescripcionesCanonicasFamilias(),
      fetchCatalogosInventario(),
    ])
    const nombresBodega: Record<number, string> = {}
    for (const b of catalogos.bodegas) nombresBodega[b.id] = b.nombre
    for (const b of bodegas) nombresBodega[b.id] = b.nombre
    return { ok: true, corte, descripcionesCanonicas, nombresBodega }
  } catch (error) {
    console.error('Error getReporteStockHistoricoAction:', error)
    return { ok: false, error: 'Error al generar el reporte de stock histórico.' }
  }
}

export async function getReporteKardexHistoricoAction(opts: {
  desde: string
  hasta: string
  alcance?: AlcanceReporte
}): Promise<
  | {
      ok: true
      kardex: Awaited<ReturnType<typeof fetchKardexHistorico>>
    }
  | { ok: false; error: string }
> {
  try {
    const bodegas = await resolverBodegasDelAlcance(opts.alcance ?? {})
    if (bodegas.length === 0) {
      return { ok: false, error: 'No tienes bodegas disponibles en ese alcance.' }
    }
    const kardex = await fetchKardexHistorico({
      desde: opts.desde,
      hasta: opts.hasta,
      bodegaIds: bodegas.map((b) => b.id),
      bodegas,
      page: 1,
      limit: 100000,
    })
    return { ok: true, kardex }
  } catch (error) {
    console.error('Error getReporteKardexHistoricoAction:', error)
    return { ok: false, error: 'Error al generar el reporte de movimientos.' }
  }
}
