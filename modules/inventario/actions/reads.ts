// modules/inventario/actions/reads.ts
'use server'

import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { can, isClienteEcommerce } from '@/lib/auth/permissions'
import type { BodegaRow } from '@/lib/types/tables'
import {
  fetchAuditoriaInversaPorProducto,
  fetchAuditoriaInversaPorFamilia,
  fetchNotasPendientesImpactoMultiBodega,
} from '../queries'
import {
  fetchNotasCelda,
  fetchMovimientosPorCiudad,
  fetchProductoTimeline,
  fetchFamiliaSkusConStock,
} from '../trazabilidad'

async function requireInventarioRead() {
  const user = await getCurrentUser()
  if (!user || isClienteEcommerce(user) || !can(user, 'inventario_stock', 'puede_leer')) {
    throw new Error('No autorizado')
  }
  const bodegasAutorizadas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)
  return { user, bodegasAutorizadas }
}

export async function fetchAuditoriaInversaProductoAction(
  productoId: number,
  bodegaIds: number[],
  bodegas: BodegaRow[]
) {
  const { bodegasAutorizadas } = await requireInventarioRead()
  const allowed = new Set(bodegasAutorizadas.map((b) => b.id))
  const safeIds = bodegaIds.filter((id) => allowed.has(id))
  const safeBodegas = bodegas.filter((b) => allowed.has(b.id))
  return fetchAuditoriaInversaPorProducto(productoId, { bodegaIds: safeIds, limiteNotas: 50 }, safeBodegas)
}

export async function fetchAuditoriaInversaFamiliaAction(
  familia: string,
  bodegaIds: number[],
  bodegas: BodegaRow[]
) {
  const { bodegasAutorizadas } = await requireInventarioRead()
  const allowed = new Set(bodegasAutorizadas.map((b) => b.id))
  const safeIds = bodegaIds.filter((id) => allowed.has(id))
  const safeBodegas = bodegas.filter((b) => allowed.has(b.id))
  return fetchAuditoriaInversaPorFamilia(familia, { bodegaIds: safeIds, limiteNotas: 50 }, safeBodegas)
}

export async function fetchPendientesProductoAuditoriaAction(
  bodegaIds: number[],
  productoId: number
) {
  const { bodegasAutorizadas } = await requireInventarioRead()
  const allowed = new Set(bodegasAutorizadas.map((b) => b.id))
  const safeIds = bodegaIds.filter((id) => allowed.has(id))
  const imp = await fetchNotasPendientesImpactoMultiBodega(safeIds)
  const lista: { nota_id: number; numero_nota: string; tipo_codigo: string; delta: number; cajas: number; bodega_id: number }[] = []
  imp.mapImpacto.forEach((v) => {
    if (v.producto_id !== productoId) return
    v.notas.forEach((n) =>
      lista.push({
        nota_id: n.nota_id,
        numero_nota: n.numero_nota,
        tipo_codigo: n.tipo_codigo,
        delta: n.delta,
        cajas: n.cajas,
        bodega_id: v.bodega_id,
      })
    )
  })
  return lista.slice(0, 20)
}

export async function fetchNotasCeldaAction(params: Parameters<typeof fetchNotasCelda>[0]) {
  await requireInventarioRead()
  return fetchNotasCelda(params)
}

export async function fetchMovimientosPorCiudadAction(
  ciudad: string,
  fechaDesde: string,
  fechaHasta: string,
  opts?: Parameters<typeof fetchMovimientosPorCiudad>[3]
) {
  await requireInventarioRead()
  return fetchMovimientosPorCiudad(ciudad, fechaDesde, fechaHasta, opts)
}

export async function fetchProductoTimelineAction(
  productoId: number,
  fechaDesde?: string,
  fechaHasta?: string,
  incluirCanceladas = false
) {
  await requireInventarioRead()
  return fetchProductoTimeline(productoId, fechaDesde, fechaHasta, incluirCanceladas)
}

export async function fetchFamiliaSkusConStockAction(familia: string) {
  await requireInventarioRead()
  return fetchFamiliaSkusConStock(familia)
}
