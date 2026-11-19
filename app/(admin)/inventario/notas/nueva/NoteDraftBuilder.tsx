// app/(admin)/inventario/notas/nueva/NoteDraftBuilder.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ADMIN_ROUTES } from '@/lib/constants'
import { formatForDateInput } from '@/lib/utils'
import { agregarLineasPorClave } from '@/lib/inventario/validacion-stock'
import { isModoSoloCajas, type ConfigInventario } from '@/modules/inventario/config-types'
import type { ResolvedProductoPegado } from '@/modules/inventario/actions'
import type { BodegaRow, UsuarioBodegaRow } from '@/lib/types/tables'
import type {
  CatalogosInventario,
  DraftNota,
  DraftProducto,
  NotaCompleta,
  NotaOcrPropuesta,
  NotaOcrPropuestaLineRaw,
  ProductoBusqueda,
  ProductoSustitutoAmpliado,
  ProductoSustitutoFamilia,
} from '@/modules/inventario/types'
import { useNotaComprobante } from './_hooks/use-nota-comprobante'
import { useNotaBuscador } from './_hooks/use-nota-buscador'
import { useNotaValidacion } from './_hooks/use-nota-validacion'
import { buildInitialDraft, computeOcrHeaderDiffs } from './_hooks/nota-draft-helpers'
import { NotaOcrMismatchBanner } from './_components/NotaOcrMismatchBanner'
import { NotaHeaderCard } from './_components/NotaHeaderCard'
import { NotaAddProductForm } from './_components/NotaAddProductForm'
import { NotaProductosTable } from './_components/NotaProductosTable'
import { NotaVisorPanel } from './_components/NotaVisorPanel'
import { NotaModales } from './_components/NotaModales'

type Props = {
  catalogos: CatalogosInventario
  usuarioId: number
  mode: 'create' | 'edit'
  notaId?: number
  initialData?: NotaCompleta
  currentUserLevel: number
  userBodegas: (BodegaRow & { permisos_bodega?: UsuarioBodegaRow })[]
  ocrProposalId?: string
  ocrProposal?: NotaOcrPropuesta | null
  defaultBodegaOrigenId?: number
  initialOcrLineas?: NotaOcrPropuestaLineRaw[]
  autoOpenOcrSync?: boolean
  config?: ConfigInventario
  userRoleId?: number
}

export function NoteDraftBuilder({
  catalogos,
  usuarioId,
  mode,
  notaId,
  initialData,
  currentUserLevel,
  userBodegas,
  ocrProposalId,
  ocrProposal,
  defaultBodegaOrigenId,
  initialOcrLineas,
  autoOpenOcrSync,
  config,
  userRoleId,
}: Props) {
  const [draft, setDraft] = useState<DraftNota>(() =>
    buildInitialDraft({ mode, initialData, catalogos, defaultBodegaOrigenId, config, currentUserLevel, userRoleId })
  )

  const [showOcrSyncModal, setShowOcrSyncModal] = useState<boolean>(!!autoOpenOcrSync)
  const [ocrRawLineas, setOcrRawLineas] = useState<NotaOcrPropuestaLineRaw[]>(
    initialOcrLineas ?? (initialData?.cabecera as any)?.ocr_lineas ?? []
  )
  const [pendingBodegaOrigenId, setPendingBodegaOrigenId] = useState<number | null>(null)
  const [showChangeBodegaDialog, setShowChangeBodegaDialog] = useState(false)
  const [isChangingBodega, setIsChangingBodega] = useState(false)
  const [pendingTipoMovimientoId, setPendingTipoMovimientoId] = useState<number | null>(null)
  const [showChangeTipoDialog, setShowChangeTipoDialog] = useState(false)
  const [dismissedHeaderMismatch, setDismissedHeaderMismatch] = useState(false)
  const [showOpcionesOpcionales, setShowOpcionesOpcionales] = useState(
    !!ocrProposalId || !!initialData?.cabecera.comprobante_url
  )
  const [copiedDraft, setCopiedDraft] = useState(false)
  const [showExtraCols, setShowExtraCols] = useState(false)
  const [mostrarPiezas, setMostrarPiezas] = useState(false)
  const [showPasteExcelModal, setShowPasteExcelModal] = useState(false)
  const [showConciliadorModal, setShowConciliadorModal] = useState(false)
  const [sustitutoModalOpen, setSustitutoModalOpen] = useState(false)
  const [sustitutoTargetProduct, setSustitutoTargetProduct] = useState<{
    tempId: string
    productoId: number
    sku: string
    nombre: string | null
  } | null>(null)

  const esCreador = mode === 'create' || initialData?.cabecera.usuario_id === usuarioId
  const esAdmin = currentUserLevel <= 2
  const esEncargado = currentUserLevel === 3
  const esTransferencia =
    mode === 'edit' &&
    initialData?.cabecera.bodega_destino_id !== undefined &&
    initialData?.cabecera.bodega_destino_id !== null
  const todoBloqueado = !esAdmin && !esCreador && !(esEncargado && esTransferencia)
  const soloEditaDestino = !esAdmin && !esCreador && esEncargado && esTransferencia

  const allowedBodegas =
    currentUserLevel <= 2
      ? catalogos.bodegas
      : catalogos.bodegas.filter(
          (b) =>
            userBodegas.some((ub) => ub.id === b.id) ||
            b.id === draft.bodega_origen_id ||
            b.id === draft.bodega_destino_id
        )

  const rolKey = userRoleId ? String(userRoleId) : ''
  const nivelKey = String(currentUserLevel)
  const allowedCodigos =
    (rolKey && config?.permisos_tipos_movimiento?.[rolKey]) ||
    config?.permisos_tipos_movimiento?.[nivelKey] ||
    (currentUserLevel <= 2 ? ['ENT', 'SAL', 'TRF', 'AJU', 'DEV'] : ['ENT', 'SAL', 'TRF'])

  const tiposMovimientoVisibles = catalogos.tiposMovimiento.filter((t) => {
    if (currentUserLevel === 1) return true
    if (t.codigo === 'DEV' && currentUserLevel > 2) {
      const hasDev = userBodegas.some((ub) => config?.permisos_devolucion_usuario_bodega?.[`${usuarioId}_${ub.id}`])
      if (!allowedCodigos.includes('DEV') && !hasDev) return false
    } else if (!allowedCodigos.includes(t.codigo as any)) {
      return false
    }
    if (t.codigo === 'TRF' && currentUserLevel > 2) {
      return userBodegas.some((ub) => (ub.permisos_bodega?.puede_transferir ?? (ub as any).puede_transferir) === true)
    }
    return true
  })

  const tipoSeleccionado = catalogos.tiposMovimiento.find((t) => t.id === draft.tipo_movimiento_id)
  const esAjuste = tipoSeleccionado?.codigo === 'AJU'
  const modoSoloCajas = isModoSoloCajas(config)
  const esMovimientoSalidaOTraslado =
    tipoSeleccionado?.codigo === 'SAL' || tipoSeleccionado?.codigo === 'TRF' || tipoSeleccionado?.afecta_inventario === -1
  const permitirStockNegativo = config?.permitir_stock_negativo === true

  const agregadoPorClave = agregarLineasPorClave(
    draft.productos.map((p) => ({
      producto_id: p.producto_id,
      producto_sku: p.producto_sku,
      producto_nombre: p.producto_nombre,
      caja_id: p.caja_id,
      caja_codigo: p.caja_codigo,
      cajas: p.cajas,
      piezas_sueltas: p.piezas_sueltas,
    }))
  )
  const hayRenglonesDuplicados = Array.from(agregadoPorClave.values()).filter((a) => a.renglones > 1).length
  const productosConDeficit = draft.bodega_origen_id
    ? draft.productos.filter((p) =>
        esMovimientoSalidaOTraslado
          ? p.cajas > (p.stock_origen_cajas ?? 0)
          : esAjuste && p.cajas < 0
          ? Math.abs(p.cajas) > (p.stock_origen_cajas ?? 0)
          : false
      )
    : []

  const comprobante = useNotaComprobante(initialData?.cabecera.comprobante_url)
  const [validacionErrorSetter, setValidacionErrorSetter] = useState<((msg: string | null) => void) | null>(null)

  const buscador = useNotaBuscador({
    bodegaOrigenId: draft.bodega_origen_id,
    esAjuste,
    modoSoloCajas,
    setDraft,
    setError: (m) => validacionErrorSetter?.(m),
  })

  const applyBodegaOrigenChange = async (newBodegaId: number) => {
    setShowChangeBodegaDialog(false)
    setIsChangingBodega(true)
    const targetBodega = catalogos.bodegas.find((b) => b.id === newBodegaId)
    setDraft((prev) => ({
      ...prev,
      bodega_origen_id: newBodegaId,
      bodega_destino_id: prev.bodega_destino_id === newBodegaId ? null : prev.bodega_destino_id,
    }))

    if (draft.productos.length > 0) {
      try {
        const updatedProducts = await Promise.all(
          draft.productos.map(async (p) => {
            const res = await fetch(
              `/api/inventario/notas/nueva/stock?producto_id=${p.producto_id}&bodega_id=${newBodegaId}`
            )
            if (!res.ok) return p
            const stockData = await res.json()
            return { ...p, stock_origen_cajas: stockData.cajas ?? 0, stock_origen_piezas: stockData.piezas_sueltas ?? 0 }
          })
        )
        setDraft((prev) => ({ ...prev, productos: updatedProducts }))
      } catch (err) {
        console.error('Error al actualizar existencias de la bodega de origen:', err)
      }
    }
    if (buscador.selectedProduct) buscador.fetchStock(buscador.selectedProduct.id, newBodegaId)
    toast.success(`Bodega de origen actualizada a "${targetBodega?.nombre || 'nueva bodega'}".`)
    setPendingBodegaOrigenId(null)
    setIsChangingBodega(false)
  }

  const validacion = useNotaValidacion({
    mode,
    notaId,
    ocrProposalId,
    draft,
    setDraft,
    comprobanteFile: comprobante.comprobanteFile,
    hayDeficitStock: productosConDeficit.length > 0,
    permitirStockNegativo,
    applyBodegaOrigenChange,
  })

  useEffect(() => {
    setValidacionErrorSetter(() => validacion.setError)
  }, [validacion.setError])

  useEffect(() => {
    if (mode === 'create' && !draft.bodega_origen_id && allowedBodegas.length > 0) {
      const cookieBodegaId =
        typeof document !== 'undefined'
          ? parseInt(document.cookie.split('; ').find((row) => row.startsWith('bodega_activa_id='))?.split('=')[1] || '0', 10)
          : 0
      const headerBodega = cookieBodegaId > 0 && allowedBodegas.find((b) => b.id === cookieBodegaId)
      const sugerida = headerBodega
        ? headerBodega.id
        : defaultBodegaOrigenId && allowedBodegas.some((b) => b.id === defaultBodegaOrigenId)
        ? defaultBodegaOrigenId
        : userBodegas[0]?.id ?? allowedBodegas[0]?.id
      if (sugerida) setDraft((prev) => ({ ...prev, bodega_origen_id: sugerida }))
    }
  }, [mode, defaultBodegaOrigenId, allowedBodegas, userBodegas, draft.bodega_origen_id])

  useEffect(() => {
    if (mode === 'edit' && draft.bodega_origen_id && draft.productos.length > 0) {
      Promise.all(
        draft.productos.map(async (p) => {
          const res = await fetch(
            `/api/inventario/notas/nueva/stock?producto_id=${p.producto_id}&bodega_id=${draft.bodega_origen_id}`
          )
          if (!res.ok) return p
          const stockData = await res.json()
          return { ...p, stock_origen_cajas: stockData.cajas, stock_origen_piezas: stockData.piezas_sueltas }
        })
      )
        .then((updated) => setDraft((prev) => ({ ...prev, productos: updated })))
        .catch((err) => console.error('Error al cargar existencias:', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, draft.bodega_origen_id])

  const ocrDiffs = computeOcrHeaderDiffs({
    draft,
    catalogos,
    ocrProposalId,
    ocrProposal,
    initialData,
    dismissed: dismissedHeaderMismatch,
  })

  const totalCajas = draft.productos.reduce((sum, p) => sum + p.cajas, 0)
  const totalPositivas = draft.productos.filter((p) => p.cajas > 0).reduce((sum, p) => sum + p.cajas, 0)
  const totalNegativas = draft.productos.filter((p) => p.cajas < 0).reduce((sum, p) => sum + p.cajas, 0)
  const hasViewer = !!(ocrProposalId || comprobante.comprobantePreview)
  const selectedBodegaObj = userBodegas.find((b) => b.id === draft.bodega_origen_id)
  const puedeConfirmar = currentUserLevel <= 2 || !!selectedBodegaObj?.permisos_bodega?.puede_confirmar_notas

  return (
    <div className="space-y-6">
      {validacion.error && (
        <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-bold tracking-tight">{validacion.error}</span>
        </div>
      )}
      {validacion.success && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-bold tracking-tight">{validacion.success}</span>
        </div>
      )}

      <div className={hasViewer ? 'w-full max-w-[110rem] mx-auto' : 'w-full max-w-4xl mx-auto space-y-6'}>
        <div className={hasViewer ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start' : 'space-y-6 min-w-0'}>
          <div className={hasViewer ? 'order-1 lg:order-2 lg:col-span-7 xl:col-span-8 space-y-6 min-w-0' : 'space-y-6 min-w-0'}>
            <NotaHeaderCard
              mode={mode}
              draft={draft}
              tiposMovimientoVisibles={tiposMovimientoVisibles}
              allTiposMovimiento={catalogos.tiposMovimiento}
              allowedBodegas={allowedBodegas}
              allBodegas={catalogos.bodegas}
              tipoSeleccionado={tipoSeleccionado}
              currentBodegaNombre={ocrDiffs.currentBodegaObj?.nombre}
              puedeEditarTipo={mode === 'create' || (config?.permitir_editar_tipo_movimiento !== false && !todoBloqueado && !soloEditaDestino)}
              puedeEditarBodegaOrigen={mode === 'create' || (config?.permitir_editar_bodega_origen !== false && !isChangingBodega && (esAdmin || esCreador))}
              puedeEditarBodegaDestino={mode === 'create' || (config?.permitir_editar_bodega_origen !== false && (esAdmin || esCreador || esEncargado))}
              todoBloqueado={todoBloqueado}
              soloEditaDestino={soloEditaDestino}
              esAdmin={esAdmin}
              config={config}
              showOpcionesOpcionales={showOpcionesOpcionales}
              onToggleOpcionesOpcionales={() => setShowOpcionesOpcionales((v) => !v)}
              comprobantePreview={comprobante.comprobantePreview}
              isDraggingComprobante={comprobante.isDraggingComprobante}
              onRequestTipoChange={(id) => {
                if (id === draft.tipo_movimiento_id) return
                if (draft.productos.length > 0 || mode === 'edit') {
                  setPendingTipoMovimientoId(id)
                  setShowChangeTipoDialog(true)
                } else {
                  const t = catalogos.tiposMovimiento.find((x) => x.id === id)
                  setDraft((prev) => ({ ...prev, tipo_movimiento_id: id, bodega_destino_id: t?.requiere_destino ? prev.bodega_destino_id : null }))
                  toast.success(`Tipo de movimiento actualizado a "${t?.nombre || 'nuevo tipo'}".`)
                }
              }}
              onRequestBodegaOrigenChange={(id) => {
                if (id === draft.bodega_origen_id) return
                if (draft.productos.length > 0 || mode === 'edit') {
                  setPendingBodegaOrigenId(id)
                  setShowChangeBodegaDialog(true)
                } else {
                  applyBodegaOrigenChange(id)
                }
              }}
              onUpdateDraftField={(field, val) => setDraft((prev) => ({ ...prev, [field]: val }))}
              onFileChange={comprobante.handleFileChange}
              onClearFile={comprobante.handleClearFile}
              onPasteClipboard={comprobante.handlePasteComprobanteFromClipboard}
              onDragOver={comprobante.handleComprobanteDragOver}
              onDragLeave={comprobante.handleComprobanteDragLeave}
              onDrop={comprobante.handleComprobanteDrop}
              mismatchBanner={
                <NotaOcrMismatchBanner
                  visible={ocrDiffs.hasAnyHeaderMismatch}
                  {...ocrDiffs}
                  tipoSeleccionadoNombre={tipoSeleccionado?.nombre}
                  currentBodegaNombre={ocrDiffs.currentBodegaObj?.nombre}
                  currentDestinoNombre={ocrDiffs.currentDestinoObj?.nombre}
                  draftFechaNota={draft.fecha_nota ?? ''}
                  draftNotaReferencia={draft.nota_referencia}
                  canApplyOrigen={Boolean(ocrDiffs.detectedBodega && allowedBodegas.some((b) => b.id === ocrDiffs.detectedBodega!.id))}
                  onDismiss={() => setDismissedHeaderMismatch(true)}
                  onApplyAll={() => {
                    setDraft((prev) => ({
                      ...prev,
                      tipo_movimiento_id: ocrDiffs.detectedTipoObj ? ocrDiffs.detectedTipoObj.id : prev.tipo_movimiento_id,
                      bodega_origen_id:
                        ocrDiffs.detectedBodega && allowedBodegas.some((b) => b.id === ocrDiffs.detectedBodega!.id)
                          ? ocrDiffs.detectedBodega.id
                          : prev.bodega_origen_id,
                      bodega_destino_id: ocrDiffs.detectedDestinoBodega
                        ? ocrDiffs.detectedDestinoBodega.id
                        : ocrDiffs.detectedTipoObj && !ocrDiffs.detectedTipoObj.requiere_destino
                        ? null
                        : prev.bodega_destino_id,
                      fecha_nota: ocrDiffs.detectedFechaRaw ? formatForDateInput(ocrDiffs.detectedFechaRaw) : prev.fecha_nota,
                      nota_referencia: ocrDiffs.detectedFolioRaw || prev.nota_referencia,
                    }))
                    setDismissedHeaderMismatch(true)
                    toast.success('¡Se aplicaron todos los datos detectados en la nota física!')
                  }}
                  onApplyTipo={() => {
                    if (!ocrDiffs.detectedTipoObj) return
                    setDraft((prev) => ({
                      ...prev,
                      tipo_movimiento_id: ocrDiffs.detectedTipoObj!.id,
                      bodega_destino_id: ocrDiffs.detectedTipoObj!.requiere_destino ? prev.bodega_destino_id : null,
                    }))
                    toast.success(`Tipo actualizado a "${ocrDiffs.detectedTipoObj.nombre}".`)
                  }}
                  onApplyOrigen={() => ocrDiffs.detectedBodega && applyBodegaOrigenChange(ocrDiffs.detectedBodega.id)}
                  onApplyDestino={() => {
                    if (!ocrDiffs.detectedDestinoBodega) return
                    setDraft((prev) => ({ ...prev, bodega_destino_id: ocrDiffs.detectedDestinoBodega!.id }))
                    toast.success(`Destino actualizado a "${ocrDiffs.detectedDestinoBodega.nombre}".`)
                  }}
                  onApplyFecha={() => {
                    const f = formatForDateInput(ocrDiffs.detectedFechaRaw)
                    setDraft((prev) => ({ ...prev, fecha_nota: f }))
                    toast.success(`Fecha actualizada a ${f}.`)
                  }}
                  onApplyFolio={() => {
                    setDraft((prev) => ({ ...prev, nota_referencia: ocrDiffs.detectedFolioRaw }))
                    toast.success(`Folio actualizado a "${ocrDiffs.detectedFolioRaw}".`)
                  }}
                />
              }
            />

            <NotaProductosTable
              productos={draft.productos}
              bodegaOrigenId={draft.bodega_origen_id}
              esAjuste={esAjuste}
              esMovimientoSalidaOTraslado={esMovimientoSalidaOTraslado}
              modoSoloCajas={modoSoloCajas}
              permitirStockNegativo={permitirStockNegativo}
              todoBloqueado={todoBloqueado}
              soloEditaDestino={soloEditaDestino}
              copiedDraft={copiedDraft}
              showExtraCols={showExtraCols}
              onToggleExtraCols={() => setShowExtraCols((v) => !v)}
              mostrarPiezas={mostrarPiezas}
              onToggleMostrarPiezas={() => setMostrarPiezas((v) => !v)}
              agregadoPorClave={agregadoPorClave}
              hayRenglonesDuplicados={hayRenglonesDuplicados}
              productosConDeficitCount={productosConDeficit.length}
              totalCajas={totalCajas}
              totalPositivas={totalPositivas}
              totalNegativas={totalNegativas}
              onOpenPasteExcel={() => setShowPasteExcelModal(true)}
              onCopyDraftExcel={async () => {
                if (draft.productos.length === 0) return toast.error('No hay productos en la nota para copiar.')
                try {
                  const header = modoSoloCajas
                    ? ['SKU', 'Descripción', 'Cajas'].join('\t')
                    : ['SKU', 'Producto', 'Caja', 'Cajas', 'Piezas', 'Total est.'].join('\t')
                  const rows = draft.productos.map((p) => {
                    const sku = p.producto_sku ?? '—'
                    const nombre = p.producto_nombre ?? '—'

                    if (modoSoloCajas) {
                      return [sku, nombre, p.cajas].join('\t')
                    }

                    const caja = p.caja_codigo ? `${p.caja_codigo}${p.caja_nombre_pack ? ` (${p.caja_nombre_pack})` : ''}` : '—'
                    const totalEst = p.cajas * (p.producto_pz_en_caja ?? 0) + p.piezas_sueltas
                    return [sku, nombre, caja, p.cajas, p.piezas_sueltas, totalEst].join('\t')
                  })
                  await navigator.clipboard.writeText([header, ...rows].join('\n'))
                  setCopiedDraft(true)
                  toast.success(
                    modoSoloCajas
                      ? 'Tabla copiada al portapapeles (SKU, Descripción, Cajas)'
                      : 'Tabla copiada al portapapeles en formato Excel (TSV)'
                  )
                  setTimeout(() => setCopiedDraft(false), 2000)
                } catch {
                  toast.error('No se pudo copiar la tabla.')
                }
              }}
              onOpenConciliador={() => setShowConciliadorModal(true)}
              onConsolidarRenglones={validacion.consolidarRenglones}
              onReorder={(from, to) =>
                setDraft((prev) => {
                  const list = [...prev.productos]
                  const [moved] = list.splice(from, 1)
                  list.splice(to, 0, moved)
                  return { ...prev, productos: list }
                })
              }
              onMoveUp={(i) =>
                i > 0 &&
                setDraft((prev) => {
                  const list = [...prev.productos]
                  ;[list[i - 1], list[i]] = [list[i], list[i - 1]]
                  return { ...prev, productos: list }
                })
              }
              onMoveDown={(i) =>
                i < draft.productos.length - 1 &&
                setDraft((prev) => {
                  const list = [...prev.productos]
                  ;[list[i + 1], list[i]] = [list[i], list[i + 1]]
                  return { ...prev, productos: list }
                })
              }
              onOpenSustitutos={(p) => {
                setSustitutoTargetProduct({ tempId: p.tempId, productoId: p.producto_id, sku: p.producto_sku, nombre: p.producto_nombre })
                setSustitutoModalOpen(true)
              }}
              onOpenSwapSku={(tempId) => {
                buscador.setSwapProductTempId(tempId)
                buscador.setSwapSearchTerm('')
              }}
              onToggleSignCajas={(tempId) =>
                setDraft((prev) => ({
                  ...prev,
                  productos: prev.productos.map((p) => (p.tempId === tempId ? { ...p, cajas: -(p.cajas === 0 ? 1 : p.cajas) } : p)),
                }))
              }
              onUpdateCajas={(tempId, val) =>
                setDraft((prev) => ({
                  ...prev,
                  productos: prev.productos.map((p) => (p.tempId === tempId ? { ...p, cajas: esAjuste ? val : Math.max(0, val) } : p)),
                }))
              }
              onUpdatePiezas={(tempId, val) =>
                setDraft((prev) => ({
                  ...prev,
                  productos: prev.productos.map((p) => (p.tempId === tempId ? { ...p, piezas_sueltas: val } : p)),
                }))
              }
              onRemoveProduct={(tempId) =>
                setDraft((prev) => ({ ...prev, productos: prev.productos.filter((p) => p.tempId !== tempId) }))
              }
              addProductForm={
                <NotaAddProductForm
                  bodegaOrigenId={draft.bodega_origen_id}
                  disabled={todoBloqueado || soloEditaDestino}
                  searchTerm={buscador.searchTerm}
                  selectedProduct={buscador.selectedProduct}
                  cajasDisponibles={buscador.cajasDisponibles}
                  selectedProductStock={buscador.selectedProductStock}
                  addCajas={buscador.addCajas}
                  onAddCajasChange={buscador.setAddCajas}
                  addPiezas={buscador.addPiezas}
                  onAddPiezasChange={buscador.setAddPiezas}
                  addCajaId={buscador.addCajaId}
                  onAddCajaIdChange={buscador.setAddCajaId}
                  esAjuste={esAjuste}
                  modoSoloCajas={modoSoloCajas}
                  tipoSeleccionado={tipoSeleccionado}
                  onSelectProduct={buscador.handleSelectProduct}
                  onSearchValueChange={buscador.handleSearchValueChange}
                  onClearSearch={buscador.handleClearSearch}
                  onAddProduct={buscador.handleAddProduct}
                />
              }
            />
          </div>

          <NotaVisorPanel
            ocrProposalId={ocrProposalId}
            hasOcrLineas={ocrRawLineas.length > 0}
            comprobantePreview={comprobante.comprobantePreview}
            onOpenOcrSync={() => setShowOcrSyncModal(true)}
          />
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t">
          <div className="flex items-center gap-3">
            <Link href={ADMIN_ROUTES.inventario.notas} className="shrink-0">
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0 border-muted hover:bg-muted" title="Volver a Notas de Inventario">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            {!todoBloqueado && (
              <Button
                type="button"
                variant="outline"
                disabled={validacion.isPending || validacion.isValidandoStock || draft.productos.length === 0}
                onClick={() => validacion.handleSave(false)}
                className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2 border-muted-foreground/30 hover:bg-muted/80 shadow-xs"
              >
                {validacion.isPending || validacion.isValidandoStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Borrador
              </Button>
            )}
          </div>

          {puedeConfirmar ? (
            <Button
              type="button"
              disabled={validacion.isPending || validacion.isValidandoStock || draft.productos.length === 0}
              onClick={() => validacion.handleSave(true)}
              className="w-full h-12 sm:h-14 rounded-xl text-sm sm:text-base font-extrabold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2 transition-all active:scale-[0.99]"
            >
              {validacion.isPending || validacion.isValidandoStock ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Confirmar Nota de Inventario
            </Button>
          ) : (
            <div className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-700 dark:text-amber-300 font-medium">
              * Nota en modo borrador. La confirmación definitiva requiere autorización de un Encargado o Admin.
            </div>
          )}
        </div>
      </div>

      <NotaModales
        draft={draft}
        bodegas={catalogos.bodegas}
        tiposMovimiento={catalogos.tiposMovimiento}
        tipoSeleccionado={tipoSeleccionado}
        totalCajas={totalCajas}
        permitirStockNegativo={permitirStockNegativo}
        hayDeficitStock={productosConDeficit.length > 0}
        productosConDeficitCount={productosConDeficit.length}
        showConfirmDialog={validacion.showConfirmDialog}
        onShowConfirmDialogChange={validacion.setShowConfirmDialog}
        onConfirmSave={() => validacion.doSave(true)}
        swapProductTempId={buscador.swapProductTempId}
        swapSearchTerm={buscador.swapSearchTerm}
        onCloseSwap={() => buscador.setSwapProductTempId(null)}
        onSwapSearchTermChange={buscador.setSwapSearchTerm}
        onSwapProduct={buscador.handleSwapProduct}
        showOcrSyncModal={showOcrSyncModal}
        onShowOcrSyncModalChange={setShowOcrSyncModal}
        ocrProposalId={ocrProposalId}
        ocrRawLineas={ocrRawLineas}
        comprobanteUrl={comprobante.comprobantePreview || initialData?.cabecera.comprobante_url}
        onApplyOcrLines={(newProducts, updatedRawLineas) => {
          setOcrRawLineas(updatedRawLineas)
          if (newProducts.length > 0) {
            setDraft((prev) => ({ ...prev, productos: newProducts }))
            const msg = `Se sincronizaron ${newProducts.length} productos del OCR en la nota.`
            validacion.setSuccess(msg)
            toast.success(msg)
          }
        }}
        showPasteExcelModal={showPasteExcelModal}
        onShowPasteExcelModalChange={setShowPasteExcelModal}
        onApplyPastedProducts={(items: ResolvedProductoPegado[], modoFusion: 'sumar' | 'anexar') => {
          setDraft((prev) => {
            const existingList = [...prev.productos]
            const itemsToAdd: DraftProducto[] = []
            for (const item of items) {
              if (modoFusion === 'sumar') {
                const idx = existingList.findIndex((p) => p.producto_id === item.producto_id && !p.caja_id)
                if (idx >= 0) {
                  existingList[idx] = { ...existingList[idx], cajas: existingList[idx].cajas + item.cajas }
                  continue
                }
              }
              itemsToAdd.push({
                tempId: crypto.randomUUID(),
                producto_id: item.producto_id,
                producto_sku: item.sku_base,
                producto_nombre: item.nombre,
                producto_pz_en_caja: item.pz_en_caja,
                cajas: item.cajas,
                piezas_sueltas: 0,
                caja_id: null,
                caja_codigo: null,
                caja_nombre_pack: null,
                stock_origen_cajas: item.stock_origen_cajas,
                stock_origen_piezas: item.stock_origen_piezas,
                codigo_original: item.sku_ingresado !== item.sku_base ? item.sku_ingresado : null,
              })
            }
            return { ...prev, productos: [...existingList, ...itemsToAdd] }
          })
          toast.success(`Se agregaron ${items.length} productos a la nota con éxito.`)
        }}
        showChangeBodegaDialog={showChangeBodegaDialog}
        onShowChangeBodegaDialogChange={setShowChangeBodegaDialog}
        pendingBodegaOrigenId={pendingBodegaOrigenId}
        onCancelBodegaChange={() => setPendingBodegaOrigenId(null)}
        onConfirmBodegaChange={() => pendingBodegaOrigenId && applyBodegaOrigenChange(pendingBodegaOrigenId)}
        showChangeTipoDialog={showChangeTipoDialog}
        onShowChangeTipoDialogChange={setShowChangeTipoDialog}
        pendingTipoMovimientoId={pendingTipoMovimientoId}
        onCancelTipoChange={() => setPendingTipoMovimientoId(null)}
        onConfirmTipoChange={() => {
          if (!pendingTipoMovimientoId) return
          const targetTipo = catalogos.tiposMovimiento.find((t) => t.id === pendingTipoMovimientoId)
          setShowChangeTipoDialog(false)
          setDraft((prev) => ({
            ...prev,
            tipo_movimiento_id: pendingTipoMovimientoId,
            bodega_destino_id: targetTipo?.requiere_destino ? prev.bodega_destino_id : null,
          }))
          toast.success(`Tipo de movimiento actualizado a "${targetTipo?.nombre || 'nuevo tipo'}".`)
          setPendingTipoMovimientoId(null)
        }}
        sustitutoModalOpen={sustitutoModalOpen}
        onSustitutoModalOpenChange={setSustitutoModalOpen}
        sustitutoTargetProduct={sustitutoTargetProduct}
        onSelectSustituto={(sustituto: ProductoSustitutoFamilia, originalSku: string, familia: string | null) => {
          if (!sustitutoTargetProduct) return
          const targetTempId = sustitutoTargetProduct.tempId
          setDraft((prev) => {
            const logEntry = `[Auto-ajuste: Se sustituyó '${originalSku}' por '${sustituto.sku_base}'${familia ? ` de la familia '${familia}'` : ''} con existencias en bodega origen]`
            return {
              ...prev,
              productos: prev.productos.map((p) =>
                p.tempId !== targetTempId
                  ? p
                  : {
                      ...p,
                      producto_id: sustituto.id,
                      producto_sku: sustituto.sku_base,
                      producto_nombre: sustituto.descripcion || sustituto.nombre || '',
                      producto_pz_en_caja: sustituto.pz_en_caja,
                      stock_origen_cajas: sustituto.cajas_disponibles,
                      stock_origen_piezas: sustituto.piezas_disponibles,
                    }
              ),
              observaciones: prev.observaciones ? `${prev.observaciones.trim()}\n${logEntry}` : logEntry,
            }
          })
          toast.success(`Producto sustituido por '${sustituto.sku_base}' con existencias y registrado en observaciones.`)
          setSustitutoTargetProduct(null)
        }}
        showConciliadorModal={showConciliadorModal}
        onShowConciliadorModalChange={setShowConciliadorModal}
        onReasignarProducto={(tempId: string, nuevo: ProductoSustitutoAmpliado | ProductoBusqueda, codFisico: string) => {
          setDraft((prev) => {
            const logEntry = `[Reasignación: Se descontará stock de '${nuevo.sku_base}' correspondiente al modelo físico '${codFisico}']`
            return {
              ...prev,
              productos: prev.productos.map((p) =>
                p.tempId !== tempId
                  ? p
                  : {
                      ...p,
                      producto_id: nuevo.id,
                      producto_sku: nuevo.sku_base,
                      producto_nombre: nuevo.descripcion || nuevo.nombre || '',
                      producto_pz_en_caja: ('pz_en_caja' in nuevo ? nuevo.pz_en_caja : null) ?? p.producto_pz_en_caja,
                      stock_origen_cajas: ('cajas_disponibles' in nuevo ? nuevo.cajas_disponibles : null) ?? p.stock_origen_cajas,
                      stock_origen_piezas: ('piezas_disponibles' in nuevo ? nuevo.piezas_disponibles : null) ?? p.stock_origen_piezas,
                      codigo_original: codFisico,
                    }
              ),
              observaciones: prev.observaciones ? `${prev.observaciones.trim()}\n${logEntry}` : logEntry,
            }
          })
          toast.success(`Salida reasignada a '${nuevo.sku_base}' (Físico: ${codFisico})`)
        }}
        showRevisionDialog={validacion.showRevisionDialog}
        onShowRevisionDialogChange={validacion.setShowRevisionDialog}
        hayAvisoFecha={validacion.hayAvisoFecha()}
        ladoDurazno={validacion.ladoDurazno()}
        onChangeFechaNota={(date) => setDraft((prev) => ({ ...prev, fecha_nota: date }))}
        onCambiarACocina={validacion.handleCambiarACocina}
        onConfirmRevision={validacion.confirmarRevision}
        showStockModal={validacion.showStockModal}
        onShowStockModalChange={validacion.setShowStockModal}
        stockFaltantes={validacion.stockFaltantes}
        stockAvisoModo={validacion.stockAvisoModo}
        isValidandoStock={validacion.isValidandoStock}
        onAjustarYContinuar={validacion.ajustarYContinuar}
        onGuardarBorrador={() => validacion.doSave(false)}
        onVerSustitutosPorProducto={(productoId) => {
          const linea = draft.productos.find((p) => p.producto_id === productoId)
          validacion.setShowStockModal(false)
          if (linea) {
            setSustitutoTargetProduct({ tempId: linea.tempId, productoId: linea.producto_id, sku: linea.producto_sku, nombre: linea.producto_nombre })
            setSustitutoModalOpen(true)
          }
        }}
      />
    </div>
  )
}
