// app/(admin)/inventario/notas/nueva/_hooks/use-nota-validacion.ts
'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ADMIN_ROUTES } from '@/lib/constants'
import { todayMX } from '@/lib/utils'
import {
  guardarNotaAction,
  actualizarNotaAction,
  subirComprobanteNotaAction,
  validarDisponibilidadNotaAction,
} from '@/modules/inventario/actions'
import {
  crearDespachoDesdeNotaAction,
  sincronizarDespachoDesdeNotaAction,
} from '@/modules/despachos/actions'
import { extractDespachoIdFromReferencia } from '@/modules/despachos/types'
import {
  ajustarLineasADisponible,
  claveStock,
  consolidarLineas,
  type LineaStock,
} from '@/lib/inventario/validacion-stock'
import type {
  DraftNota,
  DraftProducto,
  FaltanteStock,
  ResultadoValidacionNota,
} from '@/modules/inventario/types'

export const BODEGA_DURAZNO_ID = 5
export const BODEGA_COCINA_ID = 10

interface UseNotaValidacionParams {
  mode: 'create' | 'edit'
  notaId?: number
  ocrProposalId?: string
  draft: DraftNota
  setDraft: React.Dispatch<React.SetStateAction<DraftNota>>
  comprobanteFile: File | null
  hayDeficitStock: boolean
  permitirStockNegativo: boolean
  applyBodegaOrigenChange: (newBodegaId: number) => Promise<void>
}

export function useNotaValidacion({
  mode,
  notaId,
  ocrProposalId,
  draft,
  setDraft,
  comprobanteFile,
  hayDeficitStock,
  permitirStockNegativo,
  applyBodegaOrigenChange,
}: UseNotaValidacionParams) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingConfirmState, setPendingConfirmState] = useState<boolean>(false)
  const [showRevisionDialog, setShowRevisionDialog] = useState(false)

  const [showStockModal, setShowStockModal] = useState(false)
  const [stockFaltantes, setStockFaltantes] = useState<FaltanteStock[]>([])
  const [stockAvisoModo, setStockAvisoModo] = useState<'confirmar' | 'borrador'>('confirmar')
  const [pendienteConfirmar, setPendienteConfirmar] = useState(false)
  const [isValidandoStock, setIsValidandoStock] = useState(false)

  const fechaAdvertidaRef = useRef<string | null>(null)

  const ladoDurazno = (): 'origen' | 'destino' | 'ambos' | null => {
    const o = draft.bodega_origen_id === BODEGA_DURAZNO_ID
    const d = draft.bodega_destino_id === BODEGA_DURAZNO_ID
    if (o && d) return 'ambos'
    if (o) return 'origen'
    if (d) return 'destino'
    return null
  }

  const hayAvisoFecha = (): boolean => {
    const f = (draft.fecha_nota ?? '').trim()
    return !!f && f > todayMX() && fechaAdvertidaRef.current !== f
  }

  const hayAvisosRevision = (): boolean =>
    (hayDeficitStock && permitirStockNegativo) || hayAvisoFecha() || !!ladoDurazno()

  const doSave = (
    confirmar: boolean,
    draftOverride?: DraftNota,
    despachoOpts?: { vehiculo?: string; chofer?: string }
  ) => {
    setError(null)
    setSuccess(null)
    setShowConfirmDialog(false)

    const draftAGuardar = draftOverride ?? draft

    startTransition(async () => {
      const result =
        mode === 'edit' && notaId
          ? await actualizarNotaAction(notaId, draftAGuardar, confirmar, ocrProposalId)
          : await guardarNotaAction(draftAGuardar, confirmar, ocrProposalId)

      if (!result.success) {
        const errorMsg = result.error ?? 'Error desconocido al guardar la nota.'
        setError(errorMsg)
        toast.error(errorMsg)

        if (result.faltantes?.length) {
          setStockFaltantes(result.faltantes)
          setStockAvisoModo(confirmar ? 'confirmar' : 'borrador')
          setPendienteConfirmar(confirmar)
          setShowStockModal(true)
        }
        return
      }

      const destId = result.nota_id ?? notaId

      if (destId && comprobanteFile) {
        const formData = new FormData()
        formData.append('file', comprobanteFile)
        const uploadResult = await subirComprobanteNotaAction(destId, formData)
        if (!uploadResult.success) {
          const warnMsg = `Nota guardada, pero falló la subida del comprobante: ${uploadResult.error}`
          setError(warnMsg)
          toast.warning(warnMsg)
          return
        }
      }

      let despachoSuffix = ''
      if (confirmar && destId) {
        const despachoYaVinculado = extractDespachoIdFromReferencia(draftAGuardar.nota_referencia)
        if (despachoYaVinculado) {
          await sincronizarDespachoDesdeNotaAction(destId).catch(() => null)
        } else if (despachoOpts) {
          const despRes = await crearDespachoDesdeNotaAction({
            notaId: destId,
            vehiculo_info: despachoOpts.vehiculo,
            chofer: despachoOpts.chofer,
          })
          if (despRes.success && despRes.despacho_id) {
            despachoSuffix = ` y Despacho #${despRes.despacho_id} generado`
          } else {
            toast.warning(`Nota confirmada, pero no se pudo crear el despacho: ${despRes.error ?? 'Error'}`)
          }
        }
      }

      const successMsg = confirmar
        ? `Nota confirmada exitosamente${result.numero_nota ? ` (${result.numero_nota})` : ''}${despachoSuffix}.`
        : `Nota guardada como borrador${result.numero_nota ? ` (${result.numero_nota})` : ''}.`

      setSuccess(successMsg)
      toast.success(successMsg)

      if (destId) {
        router.refresh()
        if (mode === 'create') {
          setTimeout(() => {
            router.push(ADMIN_ROUTES.inventario.notaDetalle(destId))
          }, 300)
        }
      }
    })
  }

  const finalizarAdvertencias = (confirmar: boolean) => {
    if (confirmar) {
      setShowConfirmDialog(true)
      return
    }
    doSave(false)
  }

  const confirmarRevision = () => {
    fechaAdvertidaRef.current = (draft.fecha_nota ?? '').trim()
    setShowRevisionDialog(false)
    finalizarAdvertencias(pendingConfirmState)
  }

  const handleCambiarACocina = async () => {
    const lado = ladoDurazno()
    setShowRevisionDialog(false)
    if (!lado) return

    if (lado === 'destino' || lado === 'ambos') {
      setDraft((prev) => ({
        ...prev,
        bodega_destino_id: prev.bodega_destino_id === BODEGA_DURAZNO_ID ? BODEGA_COCINA_ID : prev.bodega_destino_id,
      }))
    }
    if (lado === 'origen' || lado === 'ambos') {
      await applyBodegaOrigenChange(BODEGA_COCINA_ID)
    } else {
      toast.success('Bodega destino actualizada a "Cocina".')
    }
    toast.info('Revisa los datos y vuelve a guardar la nota.')
  }

  const ejecutarPreChequeoStock = async (aEvaluar: DraftNota): Promise<ResultadoValidacionNota | null> => {
    try {
      setIsValidandoStock(true)
      return await validarDisponibilidadNotaAction(aEvaluar)
    } catch {
      return null
    } finally {
      setIsValidandoStock(false)
    }
  }

  const aplicarStockFresco = (validacion: ResultadoValidacionNota) => {
    const disponibles = validacion.disponible_por_clave
    if (!disponibles || Object.keys(disponibles).length === 0) return
    setDraft((prev) => ({
      ...prev,
      productos: prev.productos.map((p) => {
        const d = disponibles[claveStock(p.producto_id, p.caja_id)]
        if (!d) return p
        return { ...p, stock_origen_cajas: d.cajas, stock_origen_piezas: d.piezas_sueltas }
      }),
    }))
  }

  const handleSave = async (confirmar: boolean) => {
    const validacion = await ejecutarPreChequeoStock(draft)

    if (validacion) {
      aplicarStockFresco(validacion)

      if (!validacion.ok) {
        setStockFaltantes(validacion.faltantes)
        setStockAvisoModo(confirmar ? 'confirmar' : 'borrador')
        setPendienteConfirmar(confirmar)
        setShowStockModal(true)
        return
      }
    }

    if (hayAvisosRevision()) {
      setPendingConfirmState(confirmar)
      setShowRevisionDialog(true)
      return
    }

    if (confirmar) {
      setShowConfirmDialog(true)
      return
    }
    doSave(false)
  }

  const ajustarYContinuar = async () => {
    const lineas: LineaStock[] = draft.productos.map((p) => ({
      producto_id: p.producto_id,
      producto_sku: p.producto_sku,
      producto_nombre: p.producto_nombre,
      caja_id: p.caja_id,
      caja_codigo: p.caja_codigo,
      cajas: p.cajas,
      piezas_sueltas: p.piezas_sueltas,
    }))

    const ajustadas = ajustarLineasADisponible(lineas, stockFaltantes)

    const productosAjustados = ajustadas
      .map((a, i) => ({
        ...draft.productos[i],
        cajas: a.cajas,
        piezas_sueltas: a.piezas_sueltas ?? 0,
      }))
      .filter((p) => p.cajas !== 0 || (p.piezas_sueltas ?? 0) !== 0)

    const nuevoDraft: DraftNota = { ...draft, productos: productosAjustados }
    setDraft(nuevoDraft)

    const revalidacion = await ejecutarPreChequeoStock(nuevoDraft)

    if (revalidacion && !revalidacion.ok) {
      setStockFaltantes(revalidacion.faltantes)
      setShowStockModal(true)
      return
    }

    setShowStockModal(false)
    doSave(pendienteConfirmar, nuevoDraft)
  }

  const consolidarRenglones = () => {
    const lineas: LineaStock[] = draft.productos.map((p) => ({
      producto_id: p.producto_id,
      producto_sku: p.producto_sku,
      producto_nombre: p.producto_nombre,
      caja_id: p.caja_id,
      caja_codigo: p.caja_codigo,
      cajas: p.cajas,
      piezas_sueltas: p.piezas_sueltas,
    }))

    const porClave = new Map<string, DraftProducto[]>()
    for (const p of draft.productos) {
      const clave = claveStock(p.producto_id, p.caja_id)
      porClave.set(clave, [...(porClave.get(clave) ?? []), p])
    }

    const productos = consolidarLineas(lineas).map((c) => {
      const original = porClave.get(`${c.producto_id}:${c.caja_id ?? 0}`)?.[0]
      return {
        ...(original as DraftProducto),
        tempId: original?.tempId ?? crypto.randomUUID(),
        cajas: c.cajas,
        piezas_sueltas: c.piezas_sueltas ?? 0,
      } as DraftProducto
    })

    setDraft((prev) => ({ ...prev, productos }))
    toast.success('Renglones consolidados por código y caja.')
  }

  return {
    isPending,
    error,
    setError,
    success,
    setSuccess,
    showConfirmDialog,
    setShowConfirmDialog,
    showRevisionDialog,
    setShowRevisionDialog,
    showStockModal,
    setShowStockModal,
    stockFaltantes,
    stockAvisoModo,
    isValidandoStock,
    ladoDurazno,
    hayAvisoFecha,
    handleCambiarACocina,
    confirmarRevision,
    handleSave,
    ajustarYContinuar,
    consolidarRenglones,
    doSave,
  }
}
