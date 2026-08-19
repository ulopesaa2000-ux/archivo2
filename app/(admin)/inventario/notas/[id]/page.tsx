// app/(admin)/inventario/notas/[id]/page.tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fetchNotaById, fetchCatalogosInventario, fetchOcrPropuestaById, fetchOcrPropuestaByNotaId } from '@/modules/inventario/queries'
import { getCurrentUser, fetchBodegasUsuario } from '@/modules/auth/queries'
import { redirect } from 'next/navigation'
import { TabSkeleton } from '@/components/admin/PageSkeleton'
import { NotaCabecera } from '@/app/(admin)/inventario/notas/[id]/components/NotaCabecera'
import { NotaProductos } from '@/app/(admin)/inventario/notas/[id]/components/NotaProductos'
import { NotaHistorial } from '@/app/(admin)/inventario/notas/[id]/components/NotaHistorial'
import { NotaAcciones } from '@/app/(admin)/inventario/notas/[id]/components/NotaAcciones'
import { NoteDraftBuilder } from '../nueva/NoteDraftBuilder'
import { Separator } from '@/components/ui/separator'
import { NotaComparadorLayout } from '@/app/(admin)/inventario/notas/[id]/components/NotaComparadorLayout'

import { fetchConfigInventario } from '@/modules/inventario/config-queries'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const p = await params
  const id = parseInt(p.id)
  if (isNaN(id)) return { title: 'Nota no encontrada' }
  const nota = await fetchNotaById(id)
  if (!nota) return { title: 'Nota no encontrada' }
  return { title: `${nota.cabecera.numero_nota} — Inventario` }
}

/**
 * Detalle de nota de inventario.
 *
 * Si la nota está en PEND/PROC → muestra el NoteDraftBuilder en modo edición con visor lateral OCR
 * Si la nota está en CONF/CANC → muestra vista solo lectura
 *
 * Todo se queda en /inventario/notas/[id] — NO navega a otra ruta.
 */
export default async function NotaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ propuesta_id?: string; edit_ocr?: string }>
}) {
  const p = await params
  const sp = searchParams ? await searchParams : {}
  const id = parseInt(p.id)
  if (isNaN(id)) notFound()

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const notaPromise = fetchNotaById(id)
  const ocrProposalPromise = sp.propuesta_id
    ? fetchOcrPropuestaById(sp.propuesta_id)
    : fetchOcrPropuestaByNotaId(id)
  const configPromise = fetchConfigInventario()

  const [nota, ocrProposal, config] = await Promise.all([
    notaPromise,
    ocrProposalPromise,
    configPromise,
  ])

  if (!nota) notFound()

  // Validación de acceso por rol
  const isSuperAdmin = user.rol?.nivel_acceso === 1
  const isAdminInventario = user.rol?.nombre === 'Admin Operativo Inventario'

  if (!isSuperAdmin && !isAdminInventario) {
    const userBodegas = await fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 99)
    const tieneBodegaAsignada = userBodegas.some(
      b => b.id === nota.cabecera.bodega_origen_id || b.id === (nota.cabecera.bodega_destino_id ?? -1)
    )

    if (!tieneBodegaAsignada) {
      notFound()
    }

    if (user.rol?.nombre === 'Bodeguero' && nota.cabecera.usuario_id !== user.id) {
      notFound()
    }
  }

  const esEditable = nota.cabecera.estado_codigo === 'PEND' || nota.cabecera.estado_codigo === 'PROC'

  // Si es editable, cargar catálogos para el draft builder
  if (esEditable) {
    const catalogosPromise = fetchCatalogosInventario()
    const userBodegasPromise = fetchBodegasUsuario(user.id, user.rol?.nivel_acceso ?? 3)
    const [catalogos, userBodegas] = await Promise.all([
      catalogosPromise,
      userBodegasPromise,
    ])

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar Nota {nota.cabecera.numero_nota}
          </h1>
          <p className="text-sm text-muted-foreground">
            Estado: {nota.cabecera.estado_nombre} — Los cambios se guardan al presionar un botón.
          </p>
        </div>

        <NoteDraftBuilder
          catalogos={catalogos}
          usuarioId={user.id}
          mode="edit"
          notaId={id}
          initialData={nota}
          currentUserLevel={user.rol?.nivel_acceso ?? 3}
          userBodegas={userBodegas}
          ocrProposalId={ocrProposal?.id}
          ocrProposal={ocrProposal}
          initialOcrLineas={ocrProposal?.lineas}
          autoOpenOcrSync={sp.edit_ocr === 'true'}
          config={config}
          userRoleId={user.rol_id ?? user.rol?.id}
        />

        <Separator className="my-6" />

        {/* Historial de estados (siempre visible) */}
        <NotaHistorial historial={nota.historial} />
      </div>
    )
  }

  // Vista solo lectura (CONF o CANC)
  return (
    <NotaComparadorLayout comprobanteUrl={nota.cabecera.comprobante_url}>
      <div className="space-y-6">
        {/* Cabecera */}
        <NotaCabecera nota={nota.cabecera} showComprobante={!nota.cabecera.comprobante_url} />

        {/* Acciones (cancelar si procede, duplicar, etc.) */}
        <NotaAcciones nota={nota.cabecera} notaId={id} />

        <Separator />

        {/* Tabla de Productos con exportación Excel */}
        <NotaProductos detalles={nota.detalles} />

        <Separator />

        {/* Historial */}
        <NotaHistorial historial={nota.historial} />
      </div>
    </NotaComparadorLayout>
  )
}
