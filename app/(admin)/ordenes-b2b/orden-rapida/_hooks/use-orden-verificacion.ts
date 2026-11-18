// app/(admin)/ordenes-b2b/orden-rapida/_hooks/use-orden-verificacion.ts
'use client'

import { useState, useMemo, useCallback, useTransition, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { guardarOrdenRapidaB2BAction, type CatalogoColorOrdenRapida } from '@/modules/ordenes-b2b/actions'
import { compararCajasLineasVsFisico } from '@/modules/contenedores/match-cajas'
import { claveColor, esColorIgnorable, resolveColor, type CatalogColor } from '@/lib/color-match'
import { detallesDesdeMatriz, enriquecerDetallesConMapa } from '@/lib/orden-rapida-cajas'
import type {
  ColorPorConfirmar,
  ErrorSubida,
  PackMatchDif,
  WizardCaja,
  WizardParsedData,
  WizardProducto,
} from './orden-rapida-types'

interface UseOrdenVerificacionProps {
  step: number
  setStep: Dispatch<SetStateAction<number>>
  selectedProveedor: string
  selectedCliente: string
  selectedContenedor: string
  newContainerCode: string
  newContainerNumber: string
  parsedData: WizardParsedData | null
  setParsedData: Dispatch<SetStateAction<WizardParsedData | null>>
  editableProductos: WizardProducto[]
  editableCajas: WizardCaja[]
  setEditableCajas: Dispatch<SetStateAction<WizardCaja[]>>
  setExpandedProducts: Dispatch<SetStateAction<Set<string>>>
  setEditandoSku: Dispatch<SetStateAction<string | null>>
  vinculosDb: Record<string, { dbId: number; dbSku: string }>
  probablesSinResolverCount: number
  setAlertaAmbarOpen: Dispatch<SetStateAction<boolean>>
  principalPorSku: Record<string, string>
  setPrincipalPorSku: Dispatch<SetStateAction<Record<string, string>>>
  catalogoColores: CatalogoColorOrdenRapida[]
  coloresPorConfirmar: ColorPorConfirmar[]
  setColoresModalOpen: Dispatch<SetStateAction<boolean>>
  totalCajasCount: number
  cajaPrincipalDe: (skuUpper: string, cajas: WizardCaja[]) => WizardCaja | null
}

export function packKeyOf(skuBase: string, pack: string): string {
  return `${String(skuBase || '').trim().toUpperCase()}||${String(pack || 'PACK UNICO').trim().toUpperCase() || 'PACK UNICO'}`
}

export function useOrdenVerificacion({
  step,
  setStep,
  selectedProveedor,
  selectedCliente,
  selectedContenedor,
  newContainerCode,
  newContainerNumber,
  parsedData,
  setParsedData,
  editableProductos,
  editableCajas,
  setEditableCajas,
  setExpandedProducts,
  setEditandoSku,
  vinculosDb,
  probablesSinResolverCount,
  setAlertaAmbarOpen,
  principalPorSku,
  setPrincipalPorSku,
  catalogoColores,
  coloresPorConfirmar,
  setColoresModalOpen,
  totalCajasCount,
  cajaPrincipalDe,
}: UseOrdenVerificacionProps) {
  const [isPending, startTransition] = useTransition()

  const [discrepancyModal, setDiscrepancyModal] = useState<{
    open: boolean
    items: Array<{ sku: string; piezasProducto: number; piezasCajas: number; diferencia: number }>
  } | null>(null)
  const [cajasBlockModal, setCajasBlockModal] = useState<{
    open: boolean
    blocking: boolean
    items: Array<{ sku: string; cajasEsperadas: number; cajasArmadas: number; diferencia: number }>
  } | null>(null)

  const [huecosRellenados, setHuecosRellenados] = useState<string[]>([])
  const [lineaEditadaPorSku, setLineaEditadaPorSku] = useState<Record<string, number>>({})
  const [editLineaSku, setEditLineaSku] = useState<string | null>(null)
  const [editLineaVal, setEditLineaVal] = useState('')

  const [lineaEditadaPorPack, setLineaEditadaPorPack] = useState<Record<string, number>>({})
  const [editPackSku, setEditPackSku] = useState<string | null>(null)
  const [editPackVal, setEditPackVal] = useState('')

  const [isConfirmFinalModalOpen, setIsConfirmFinalModalOpen] = useState(false)
  const [verificacionManual, setVerificacionManual] = useState<{ hash: string; ok: boolean; fecha: number } | null>(
    null
  )
  const [mostrarErroresSubida, setMostrarErroresSubida] = useState(false)
  const [mostrarAdvertenciasSubida, setMostrarAdvertenciasSubida] = useState(true)
  const [codigoRenameDrafts, setCodigoRenameDrafts] = useState<Record<string, string>>({})
  const [modalLineaDrafts, setModalLineaDrafts] = useState<Record<string, string>>({})
  const [modalPackDrafts, setModalPackDrafts] = useState<Record<string, string>>({})
  const [modalCajaNumDrafts, setModalCajaNumDrafts] = useState<Record<string, string>>({})

  const resetVerificacionState = useCallback(() => {
    setHuecosRellenados([])
    setLineaEditadaPorSku({})
    setEditLineaSku(null)
    setLineaEditadaPorPack({})
    setEditPackSku(null)
    setEditPackVal('')
    setVerificacionManual(null)
    setMostrarErroresSubida(false)
    setCodigoRenameDrafts({})
    setModalLineaDrafts({})
    setModalPackDrafts({})
    setModalCajaNumDrafts({})
    setCajasBlockModal(null)
    setDiscrepancyModal(null)
    setIsConfirmFinalModalOpen(false)
  }, [])

  const jsonTotalesPorSku = useMemo(() => {
    const map = new Map<string, { piezas: number; cajas: number; cbm: number; peso: number; pesoNeto?: number }>()
    if (parsedData?.orden.orden_productos) {
      for (const op of parsedData.orden.orden_productos) {
        const rec = op as Record<string, unknown>
        map.set(op.sku, {
          piezas: op.cantidad_total,
          cajas: op.numero_cajas_reales,
          cbm: op.cbm_total,
          peso: op.peso_bruto_total,
          pesoNeto: (rec.peso_neto_total as number | undefined) || (rec.peso_neto as number | undefined),
        })
      }
    }
    return map
  }, [parsedData])

  const jsonPackPorSkuPack = useMemo(() => {
    const map = new Map<string, { cajas: number; piezas: number; fuente: string }>()
    const arr = parsedData?.orden_productos_pack
    if (Array.isArray(arr)) {
      for (const op of arr) {
        const up = String(op?.sku_base || '').trim().toUpperCase()
        const pp = String(op?.nombre_pack || 'PACK UNICO').trim().toUpperCase() || 'PACK UNICO'
        if (!up) continue
        map.set(`${up}||${pp}`, {
          cajas: Number(op?.cajas_pedidas) || 0,
          piezas: Number(op?.piezas_pedidas) || 0,
          fuente: String(op?.fuente || ''),
        })
      }
    }
    return map
  }, [parsedData])

  // Mapeo SKU actual (sincronizado o editado) -> SKU original del archivo n8n/Excel
  const skuOriginalPorActual = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of editableProductos) {
      const actualUp = String(p.sku_base || '').trim().toUpperCase()
      const origUp = String(p.packing_original?.sku_base || '').trim().toUpperCase()
      if (actualUp && origUp && actualUp !== origUp) {
        map.set(actualUp, origUp)
      }
    }
    for (const [origKey, v] of Object.entries(vinculosDb)) {
      const dbUp = String(v.dbSku || '').trim().toUpperCase()
      const origUp = String(origKey || '').trim().toUpperCase()
      if (dbUp && origUp && dbUp !== origUp && !map.has(dbUp)) {
        map.set(dbUp, origUp)
      }
    }
    return map
  }, [editableProductos, vinculosDb])

  // Mapeo producto_temp_id -> sku_base actual (mantiene consistencia tras sincronizar o separar productos)
  const skuPorTempId = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of editableProductos) {
      if (p.temp_id && p.sku_base) {
        map.set(p.temp_id, String(p.sku_base).trim())
      }
    }
    return map
  }, [editableProductos])

  const buscarEsperadasJson = useCallback(
    (skuBase: string): number => {
      const direct = jsonTotalesPorSku.get(skuBase)?.cajas
      if (typeof direct === 'number') return direct
      const up = String(skuBase || '').trim().toUpperCase()
      for (const [k, v] of jsonTotalesPorSku) {
        if (String(k || '').trim().toUpperCase() === up) return Number(v.cajas) || 0
      }
      const origUp = skuOriginalPorActual.get(up)
      if (origUp) {
        for (const [k, v] of jsonTotalesPorSku) {
          if (String(k || '').trim().toUpperCase() === origUp) return Number(v.cajas) || 0
        }
      }
      return 0
    },
    [jsonTotalesPorSku, skuOriginalPorActual]
  )

  const lineaEsperada = useCallback(
    (skuBase: string): number => {
      const up = String(skuBase || '').trim().toUpperCase()
      if (lineaEditadaPorSku[up] != null) return lineaEditadaPorSku[up]
      const origUp = skuOriginalPorActual.get(up)
      if (origUp && lineaEditadaPorSku[origUp] != null) return lineaEditadaPorSku[origUp]
      return buscarEsperadasJson(skuBase)
    },
    [lineaEditadaPorSku, skuOriginalPorActual, buscarEsperadasJson]
  )

  const lineaPackEsperada = useCallback(
    (skuBase: string, pack: string): number => {
      const k = packKeyOf(skuBase, pack)
      if (lineaEditadaPorPack[k] != null) return lineaEditadaPorPack[k]
      return jsonPackPorSkuPack.get(k)?.cajas ?? 0
    },
    [lineaEditadaPorPack, jsonPackPorSkuPack]
  )

  const jsonPackTieneSku = useCallback(
    (skuBase: string): boolean => {
      const up = String(skuBase || '').trim().toUpperCase() + '||'
      for (const k of jsonPackPorSkuPack.keys()) if (k.startsWith(up)) return true
      return false
    },
    [jsonPackPorSkuPack]
  )

  const calcularMatchPacks = useCallback((): { ok: boolean; diffs: PackMatchDif[] } => {
    const armados = new Map<string, { sku: string; pack: string; cajas: number; piezas: number }>()
    for (const c of editableCajas) {
      if (c.tipo_caja === 'padre_resumen') continue
      const sku = String(c.sku_base || '').trim()
      if (!sku) continue
      const pack = String(c.nombre_pack || 'PACK UNICO')
      const k = packKeyOf(sku, pack)
      const prev = armados.get(k) ?? { sku, pack, cajas: 0, piezas: 0 }
      prev.cajas += Number(c.cantidad_cajas ?? 0) || 0
      prev.piezas += Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0))
      armados.set(k, prev)
    }
    const keys = new Set<string>([...armados.keys()])
    for (const k of jsonPackPorSkuPack.keys()) keys.add(k)
    for (const k of Object.keys(lineaEditadaPorPack)) keys.add(k)
    const diffs: PackMatchDif[] = []
    for (const k of keys) {
      const sep = k.indexOf('||')
      const up = k.slice(0, sep)
      const packUp = k.slice(sep + 2)
      const arm = armados.get(k)
      const armadas = arm?.cajas ?? 0
      const piezas = arm?.piezas ?? 0
      const skuLabel = arm?.sku || up
      const packLabel = arm?.pack || packUp
      const linea = lineaPackEsperada(skuLabel, packLabel)
      if (linea <= 0 && !jsonPackTieneSku(skuLabel)) continue
      const dif = linea - armadas
      diffs.push({
        sku: skuLabel,
        pack: packLabel,
        linea,
        armadas,
        piezas,
        dif,
        estado: dif === 0 ? 'OK' : armadas === 0 && linea > 0 ? 'SIN_CAJAS' : linea === 0 ? 'SIN_LINEA' : 'DIF',
      })
    }
    diffs.sort(
      (a, b) => (a.estado === 'OK' ? 1 : 0) - (b.estado === 'OK' ? 1 : 0) || String(a.sku).localeCompare(String(b.sku))
    )
    return { ok: diffs.every((d) => d.estado === 'OK'), diffs }
  }, [editableCajas, jsonPackPorSkuPack, lineaEditadaPorPack, lineaPackEsperada, jsonPackTieneSku])

  const calcularMatchCajasOrdenRapida = useCallback(() => {
    const lineas = editableProductos
      .map((p) => ({ sku: String(p.sku_base || '').trim(), cajas: lineaEsperada(String(p.sku_base || '')) }))
      .filter((l) => l.sku && l.cajas > 0)
    const fisicos = editableCajas
      .filter((c) => c.tipo_caja !== 'padre_resumen')
      .map((c) => ({
        sku: (c.producto_temp_id && skuPorTempId.get(c.producto_temp_id)) || String(c.sku_base || ''),
        cajas: Number(c.cantidad_cajas ?? 0),
      }))
    return compararCajasLineasVsFisico(lineas, fisicos)
  }, [editableProductos, editableCajas, lineaEsperada, skuPorTempId])

  const huecosFisico = useMemo(() => {
    const porSku = new Map<string, { sku: string; cajas: number; piezas: number }>()
    for (const c of editableCajas) {
      if (c.tipo_caja === 'padre_resumen') continue
      const resolvedSku = (c.producto_temp_id && skuPorTempId.get(c.producto_temp_id)) || String(c.sku_base || '').trim()
      const up = resolvedSku.toUpperCase()
      if (!up) continue
      const prev = porSku.get(up) ?? { sku: resolvedSku, cajas: 0, piezas: 0 }
      prev.cajas += Number(c.cantidad_cajas ?? 0) || 0
      prev.piezas += Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0))
      porSku.set(up, prev)
    }
    return Array.from(porSku.entries())
      .filter(([up, g]) => g.cajas > 0 && lineaEsperada(g.sku) <= 0 && !huecosRellenados.includes(up))
      .map(([up, g]) => ({ key: up, ...g }))
  }, [editableCajas, skuPorTempId, lineaEsperada, huecosRellenados])

  const handleRellenarHuecos = useCallback(() => {
    if (huecosFisico.length === 0 || !parsedData) return
    const nuevos = huecosFisico.map((h) => ({
      sku: h.sku,
      nombre: '',
      marca: '',
      cantidad_total: h.piezas,
      numero_cajas_reales: h.cajas,
      cbm_total: 0,
      peso_bruto_total: 0,
    }))
    setLineaEditadaPorSku((prev) => {
      const next = { ...prev }
      for (const h of huecosFisico) next[h.key] = h.cajas
      return next
    })
    setParsedData((prev) => {
      if (!prev) return prev
      const existingUps = new Set(
        (prev.orden?.orden_productos ?? []).map((op) => String(op.sku || '').trim().toUpperCase())
      )
      const soloNuevos = nuevos.filter((n) => !existingUps.has(n.sku.toUpperCase()))
      const actualizados = (prev.orden?.orden_productos ?? []).map((op) => {
        const match = huecosFisico.find((h) => h.key === String(op.sku || '').trim().toUpperCase())
        return match ? { ...op, numero_cajas_reales: match.cajas, cantidad_total: match.piezas } : op
      })
      return {
        ...prev,
        orden: {
          ...prev.orden,
          orden_productos: [...actualizados, ...soloNuevos],
        },
      }
    })
    setHuecosRellenados((prev) => [...prev, ...huecosFisico.map((h) => h.key)])
    toast.success(`Se rellenaron ${huecosFisico.length} líneas desde el físico. Verifica el match antes de guardar.`)
  }, [huecosFisico, parsedData, setParsedData])

  const handleRellenarDesdeAviso = useCallback(() => {
    const ups = new Set(huecosFisico.map((h) => h.key))
    if (ups.size === 0) return
    handleRellenarHuecos()
    const restantes = calcularMatchCajasOrdenRapida().diffs.filter(
      (d) => d.estado !== 'OK' && !ups.has(d.sku.trim().toUpperCase())
    )
    if (restantes.length === 0) {
      setCajasBlockModal(null)
      setStep(4)
    } else {
      setCajasBlockModal({
        open: true,
        blocking: false,
        items: restantes.map((d) => ({
          sku: d.sku,
          cajasEsperadas: d.cajasLinea,
          cajasArmadas: d.cajasFisicas,
          diferencia: d.dif,
        })),
      })
      toast.error('Aún quedan diferencias reales: corrígelas en el paso 4.')
    }
  }, [huecosFisico, handleRellenarHuecos, calcularMatchCajasOrdenRapida, setStep])

  const verificacionPrevia = useMemo(() => {
    const match = calcularMatchCajasOrdenRapida()
    const matchPacks = calcularMatchPacks()
    const sinPz = editableCajas
      .filter((c) => c.tipo_caja !== 'padre_resumen' && !(Number(c.piezas_por_caja ?? 0) > 0))
      .map((c) => String(c.codigo_caja || c.codigo_caja_temporal || 's/código'))
    const conPrincipal = editableProductos.filter((p) => {
      const up = String(p.sku_base || '').trim().toUpperCase()
      const reales = editableCajas.filter(
        (c) => c.tipo_caja !== 'padre_resumen' && String(c.sku_base || '').trim().toUpperCase() === up
      )
      return reales.length > 0 && cajaPrincipalDe(up, reales) !== null
    }).length
    const fallasPacks = matchPacks.diffs.filter((d) => d.estado !== 'OK')
    const coloresPendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido').length
    return {
      matchOk: match.ok,
      fallasMatch: match.diffs.filter((d) => d.estado !== 'OK').length,
      matchPacksOk: matchPacks.ok,
      fallasPacks: fallasPacks.length,
      sinPz,
      conPrincipal,
      totalProductos: editableProductos.length,
      totalCajas: totalCajasCount,
      coloresPendientes,
      todoOk:
        match.ok &&
        matchPacks.ok &&
        sinPz.length === 0 &&
        editableProductos.length > 0 &&
        totalCajasCount > 0 &&
        coloresPendientes === 0,
    }
  }, [editableProductos, editableCajas, calcularMatchCajasOrdenRapida, calcularMatchPacks, cajaPrincipalDe, totalCajasCount, coloresPorConfirmar])

  const resumenSku = useMemo(() => {
    const filas = editableProductos.map((p) => {
      const sku = String(p.sku_base || '').trim()
      const up = sku.toUpperCase()
      const reales = editableCajas.filter(
        (c) => c.tipo_caja !== 'padre_resumen' && String(c.sku_base || '').trim().toUpperCase() === up
      )
      const armadas = reales.reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
      const linea = lineaEsperada(sku)
      const principal = cajaPrincipalDe(up, reales)
      const pzc = principal ? Number(principal.piezas_por_caja ?? 0) : 0
      const porPack = new Map<string, { pack: string; armadas: number; piezas: number }>()
      for (const c of reales) {
        const pack = String(c.nombre_pack || 'PACK UNICO')
        const prev = porPack.get(pack) ?? { pack, armadas: 0, piezas: 0 }
        prev.armadas += Number(c.cantidad_cajas ?? 0) || 0
        prev.piezas += Number(c.total_piezas || (c.piezas_por_caja || 0) * (c.cantidad_cajas || 0))
        porPack.set(pack, prev)
      }
      const packs = [...porPack.values()].map((g) => {
        const lineaP = lineaPackEsperada(sku, g.pack)
        const tieneLinea = lineaP > 0 || jsonPackTieneSku(sku)
        return {
          pack: g.pack,
          linea: lineaP,
          armadas: g.armadas,
          piezas: g.piezas,
          dif: lineaP - g.armadas,
          ok: !tieneLinea || lineaP === g.armadas,
          editada: lineaEditadaPorPack[packKeyOf(sku, g.pack)] != null,
        }
      })
      return {
        sku,
        pzc,
        linea,
        armadas,
        dif: linea - armadas,
        ok: linea === armadas,
        editada: lineaEditadaPorSku[up] != null,
        principalCodigo: principal ? String(principal.codigo_caja || principal.codigo_caja_temporal || '') : null,
        packs,
      }
    })
    const totalCajas = filas.reduce((s, f) => s + f.armadas, 0)
    const todoOk = filas.length > 0 && filas.every((f) => f.ok)
    return { filas, totalCajas, todoOk }
  }, [
    editableProductos,
    editableCajas,
    lineaEsperada,
    lineaEditadaPorSku,
    lineaPackEsperada,
    lineaEditadaPorPack,
    jsonPackTieneSku,
    cajaPrincipalDe,
  ])

  const erroresSubida = useMemo<ErrorSubida[]>(() => {
    const out: ErrorSubida[] = []
    if (!selectedProveedor)
      out.push({
        id: 'soc-prov',
        codigo: 'SOCIO_PROVEEDOR_FALTANTE',
        mensaje: 'Falta proveedor origen (persona_id / proveedor_id).',
        paso: 1,
        fix: 'Elige proveedor en paso 1 o en el modal.',
      })
    if (!selectedCliente)
      out.push({
        id: 'soc-cli',
        codigo: 'SOCIO_CLIENTE_FALTANTE',
        mensaje: 'Falta cliente B2B destino (cliente_b2b_id).',
        paso: 1,
        fix: 'Elige cliente en paso 1.',
      })
    if (selectedContenedor === 'new' && !newContainerCode.trim())
      out.push({
        id: 'cont-cod',
        codigo: 'CONTENEDOR_CODIGO_VACIO',
        mensaje: 'Contenedor nuevo sin código (codigo_contenedor UNIQUE NOT NULL).',
        paso: 1,
        fix: 'Escribe el código del contenedor.',
      })
    if (editableProductos.length === 0)
      out.push({
        id: 'ord-sin-prod',
        codigo: 'ORDEN_SIN_PRODUCTOS',
        mensaje: 'La orden no tiene productos (ordenes_b2b_detalles quedaría vacía).',
        paso: 3,
        fix: 'Agrega al menos un producto.',
      })

    const vistosSku = new Map<string, number>()
    editableProductos.forEach((p) => {
      const sku = String(p.sku_base || '').trim()
      const up = sku.toUpperCase()
      if (!sku)
        out.push({
          id: `sku-vacio-${p.temp_id || sku}`,
          codigo: 'SKU_VACIO',
          mensaje: 'Producto con SKU vacío (NOT NULL).',
          paso: 3,
          fix: 'Edita el SKU en paso 3.',
        })
      else vistosSku.set(up, (vistosSku.get(up) || 0) + 1)
    })
    for (const [up, n] of vistosSku) {
      if (n > 1)
        out.push({
          id: `sku-dup-${up}`,
          codigo: 'SKU_DUPLICADO',
          mensaje: `SKU duplicado "${up}" ×${n} (UNIQUE). Solo se insertaría uno y fallaría el 2do.`,
          sku: up,
          paso: 3,
          fix: 'Unifica o renombra el SKU en paso 3.',
        })
    }
    for (const p of editableProductos) {
      const sku = String(p.sku_base || '').trim()
      const up = sku.toUpperCase()
      if (!up) continue
      const armadas = editableCajas
        .filter((c) => c.tipo_caja !== 'padre_resumen' && String(c.sku_base || '').trim().toUpperCase() === up)
        .reduce((s, c) => s + (Number(c.cantidad_cajas ?? 0) || 0), 0)
      if (armadas <= 0)
        out.push({
          id: `prod-sin-caja-${up}`,
          codigo: 'PRODUCTO_SIN_CAJAS',
          mensaje: `Producto "${sku}" sin cajas armadas (bloqueo modo cajas).`,
          sku,
          paso: 4,
          fix: 'Agrega/mueve cajas a este SKU en paso 4.',
        })
    }

    const vistosCod = new Map<string, string[]>()
    const reales = editableCajas.filter((c) => c.tipo_caja !== 'padre_resumen')
    reales.forEach((c, idx) => {
      const cod = String(c.codigo_caja || c.codigo_caja_temporal || '').trim()
      const up = cod.toUpperCase()
      if (!cod) {
        out.push({
          id: `cod-vacio-${String(c.sku_base || 'sinsku')}-${idx}`,
          codigo: 'CODIGO_VACIO',
          mensaje: `Caja sin código en SKU "${String(c.sku_base || '').trim()}" (NOT NULL).`,
          sku: String(c.sku_base || '').trim(),
          paso: 4,
          fix: 'Renombra el código de la caja.',
        })
      } else {
        const l = vistosCod.get(up) || []
        l.push(cod)
        vistosCod.set(up, l)
      }
      if (!(Number(c.piezas_por_caja ?? 0) > 0))
        out.push({
          id: `sinpz-${cod || c.sku_base}`,
          codigo: 'SIN_PZ',
          mensaje: `Caja "${cod || '(s/código)'}" sin piezas por caja (>0 requerido).`,
          sku: String(c.sku_base || '').trim(),
          codigoCaja: cod,
          paso: 4,
          fix: 'Edita pz/caja en su tarjeta o usa Fijar 1 pza.',
        })
      if (!(Number(c.cantidad_cajas ?? 0) > 0))
        out.push({
          id: `cant-${cod || c.sku_base}`,
          codigo: 'CANTIDAD_INVALIDA',
          mensaje: `Caja "${cod || '(s/código)'}" con cantidad ${String(c.cantidad_cajas ?? 0)} (debe ser >0).`,
          sku: String(c.sku_base || '').trim(),
          codigoCaja: cod,
          paso: 4,
          fix: 'Corrige cantidad de cajas en su tarjeta.',
        })
    })
    for (const [, lista] of vistosCod) {
      if (lista.length > 1)
        out.push({
          id: `cod-dup-${lista[0]}`,
          codigo: 'CODIGO_DUPLICADO',
          mensaje: `Código duplicado "${lista[0]}" ×${lista.length} (UNIQUE: haría upsert y mezclaría cajas).`,
          codigoCaja: lista[0],
          paso: 4,
          fix: 'Renómbralo aquí mismo con el editor inline.',
        })
    }
    if (editableProductos.length > 0 && reales.length === 0)
      out.push({
        id: 'ord-sin-caja',
        codigo: 'ORDEN_SIN_CAJAS',
        mensaje: 'La orden no tiene cajas físicas (totalCajas<=0).',
        paso: 4,
        fix: 'Agrega cajas en paso 4.',
      })

    const pendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido')
    if (pendientes.length > 0)
      out.push({
        id: 'col-pend',
        codigo: 'COLOR_SIN_RESOLVER',
        mensaje: `${pendientes.length} color(es) sin resolver: ${pendientes
          .slice(0, 4)
          .map((c) => c.raw)
          .join(', ')}${pendientes.length > 4 ? ` +${pendientes.length - 4}` : ''} (FK cat_colores).`,
        paso: 4,
        fix: 'Mapea a existente o créalos en el panel de colores.',
      })

    try {
      const resueltos = new Map<string, number>()
      for (const c of coloresPorConfirmar) {
        if ((c.estado === 'existente' || c.estado === 'mapeado' || c.estado === 'creado') && typeof c.color_id === 'number') {
          resueltos.set(claveColor(c.raw), c.color_id)
        }
      }
      const sinId = new Map<string, Set<string>>()
      for (const c of reales) {
        const cod = String(c.codigo_caja || c.codigo_caja_temporal || 's/código')
        for (const col of c.matriz?.colores || []) {
          const raw = String(col || '').trim()
          if (!raw) continue
          const k = claveColor(raw)
          if (resueltos.has(k)) continue
          if (esColorIgnorable(raw)) continue
          const seed = coloresPorConfirmar.find((cItem) => claveColor(cItem.raw) === k)
          const m = resolveColor(raw, catalogoColores as CatalogColor[], seed?.en ?? null, seed?.es ?? null)
          if (m.found && typeof m.id === 'number') {
            resueltos.set(k, m.id)
            continue
          }
          if (!sinId.has(raw)) sinId.set(raw, new Set())
          sinId.get(raw)!.add(cod)
        }
      }
      if (sinId.size > 0) {
        const lista = [...sinId.entries()]
          .map(([raw, cods]) => `"${raw}" (${cods.size} caja(s): ${[...cods].slice(0, 3).join(', ')})`)
          .join(', ')
        out.push({
          id: 'col-detalle',
          codigo: 'COLOR_SIN_RESOLVER',
          mensaje: `Detalles sin color_id: ${lista} (FK cat_colores).`,
          paso: 4,
          fix: 'Mapea a existente o créalos en el panel de colores.',
        })
      }
    } catch {
      /* sin catalogo */
    }

    try {
      const m = calcularMatchCajasOrdenRapida()
      for (const d of m.diffs.filter((x) => x.estado !== 'OK')) {
        out.push({
          id: `match-${d.sku}`,
          codigo: 'MATCH_CAJAS_DIF',
          mensaje: `"${d.sku}": línea ${d.cajasLinea} vs armadas ${d.cajasFisicas} (dif ${d.dif > 0 ? `+${d.dif}` : d.dif}).`,
          sku: d.sku,
          paso: 4,
          fix: 'Ajusta línea esperada o mueve/agrega cajas.',
        })
      }
    } catch {
      /* match */
    }
    try {
      const mp = calcularMatchPacks()
      for (const d of mp.diffs.filter((x) => x.estado !== 'OK')) {
        out.push({
          id: `pack-${d.sku}-${d.pack}`,
          codigo: 'MATCH_PACK_DIF',
          mensaje: `"${d.sku} · ${d.pack}": línea ${d.linea} vs armadas ${d.armadas} (dif ${d.dif > 0 ? `+${d.dif}` : d.dif}).`,
          sku: d.sku,
          pack: d.pack,
          paso: 4,
          fix: 'Ajusta línea del pack o renombra/divide packs.',
        })
      }
    } catch {
      /* sin packs */
    }
    return out
  }, [
    selectedProveedor,
    selectedCliente,
    selectedContenedor,
    newContainerCode,
    editableProductos,
    editableCajas,
    coloresPorConfirmar,
    catalogoColores,
    calcularMatchCajasOrdenRapida,
    calcularMatchPacks,
  ])

  const erroresBloqueantes = erroresSubida

  const advertenciasSubida = useMemo<ErrorSubida[]>(() => {
    const out: ErrorSubida[] = []
    const reales = editableCajas.filter((c) => c.tipo_caja !== 'padre_resumen')
    reales.forEach((c) => {
      const cod = String(c.codigo_caja || c.codigo_caja_temporal || '').trim()
      try {
        const dets = detallesDesdeMatriz(c as Parameters<typeof detallesDesdeMatriz>[0])
        if (dets.length === 0) {
          out.push({
            id: `matriz-${cod || c.sku_base}`,
            codigo: 'MATRIZ_VACIA',
            mensaje: `Caja "${cod || '(s/código)'}" con matriz vacía (0 detalles talla/color). Se guardará con ${Number(c.piezas_por_caja ?? 0)} pz/caja para editar después.`,
            sku: String(c.sku_base || '').trim(),
            codigoCaja: cod,
            paso: 4,
            fix: 'Opcional: edita la matriz ahora o guárdala así y edítala después en la orden.',
          })
        }
      } catch {
        /* matriz inválida */
      }
    })
    return out
  }, [editableCajas])

  const hashVerificacion = useMemo(() => {
    try {
      return JSON.stringify({
        p: editableProductos.map((p) => [p.temp_id || p.sku_base, p.sku_base]),
        c: editableCajas.map((c) => {
          let nDets = 0
          try {
            nDets = detallesDesdeMatriz(c as Parameters<typeof detallesDesdeMatriz>[0]).length
          } catch {
            nDets = 0
          }
          return [c.codigo_caja || c.codigo_caja_temporal, c.sku_base, c.cantidad_cajas, c.piezas_por_caja, c.nombre_pack, nDets]
        }),
        le: lineaEditadaPorSku,
        lp: lineaEditadaPorPack,
        pr: principalPorSku,
        s: [selectedProveedor, selectedCliente, selectedContenedor, newContainerCode, newContainerNumber],
        col: coloresPorConfirmar.map((c) => [c.raw, c.estado, c.color_id]),
      })
    } catch {
      return 'hash-error'
    }
  }, [
    editableProductos,
    editableCajas,
    lineaEditadaPorSku,
    lineaEditadaPorPack,
    principalPorSku,
    selectedProveedor,
    selectedCliente,
    selectedContenedor,
    newContainerCode,
    newContainerNumber,
    coloresPorConfirmar,
  ])

  const necesitaReverificar = !verificacionManual || verificacionManual.hash !== hashVerificacion
  const verificadoOk = !!verificacionManual?.ok && !necesitaReverificar && erroresBloqueantes.length === 0

  const handleVerificarLocal = useCallback(() => {
    if (erroresBloqueantes.length === 0) {
      setVerificacionManual({ hash: hashVerificacion, ok: true, fecha: Date.now() })
      setMostrarErroresSubida(false)
      if (advertenciasSubida.length > 0) {
        toast.success(
          `Verificación local OK (${advertenciasSubida.length} caja(s) con matriz vacía en advertencia). Ya puedes guardar en Supabase.`
        )
      } else {
        toast.success('Verificación local OK: sin bloqueantes. Ya puedes cargar a DB.')
      }
    } else {
      setVerificacionManual({ hash: hashVerificacion, ok: false, fecha: Date.now() })
      setMostrarErroresSubida(true)
      toast.error(`${erroresBloqueantes.length} bloqueo(s): corrígelos aquí mismo o con Ir a corregir.`)
    }
  }, [erroresBloqueantes.length, hashVerificacion, advertenciasSubida.length])

  const handleIrACorregir = useCallback(
    (e: ErrorSubida) => {
      setIsConfirmFinalModalOpen(false)
      setMostrarErroresSubida(true)
      if (e.paso === 1) {
        setStep(1)
        return
      }
      if (e.paso === 3) {
        setStep(3)
        if (e.sku) {
          const prod = editableProductos.find(
            (p) => String(p.sku_base || '').trim().toUpperCase() === String(e.sku || '').trim().toUpperCase()
          )
          if (prod?.sku_base) setExpandedProducts((prev) => new Set(prev).add(String(prod.sku_base)))
          if (prod?.temp_id) setEditandoSku(prod.temp_id)
        }
        return
      }
      setStep(4)
      if (e.sku) {
        setExpandedProducts((prev) => new Set(prev).add(String(e.sku)))
        const up = String(e.sku || '').trim().toUpperCase()
        const prod = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === up)
        if (prod?.sku_base) setExpandedProducts((prev) => new Set(prev).add(String(prod.sku_base)))
      }
    },
    [setStep, editableProductos, setExpandedProducts, setEditandoSku]
  )

  const handleRenombrarCodigoEnModal = useCallback(
    (viejo: string, nuevoRaw: string) => {
      const nuevo = String(nuevoRaw || '').trim()
      if (!viejo || !nuevo) {
        toast.error('Escribe el nuevo código.')
        return
      }
      if (nuevo.toUpperCase() === String(viejo).trim().toUpperCase()) return
      const usados = new Set(
        editableCajas
          .filter((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') !== viejo)
          .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '').toUpperCase())
      )
      if (usados.has(nuevo.toUpperCase())) {
        toast.error(`"${nuevo}" ya existe: elige otro.`)
        return
      }
      setEditableCajas((prev) =>
        prev.map((c) =>
          String(c.codigo_caja_temporal || c.codigo_caja || '') === viejo
            ? { ...c, codigo_caja_temporal: nuevo, codigo_caja: nuevo }
            : c
        )
      )
      setParsedData((prev) => {
        if (!prev || !Array.isArray(prev.detalles)) return prev
        return {
          ...prev,
          detalles: prev.detalles.map((d) =>
            String(d?.codigo_caja_temporal || '') === viejo ? { ...d, codigo_caja_temporal: nuevo } : d
          ),
        }
      })
      setPrincipalPorSku((prev) => {
        let ch = false
        const nx: Record<string, string> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (v === viejo) {
            nx[k] = nuevo
            ch = true
          } else nx[k] = v
        }
        return ch ? nx : prev
      })
      setCodigoRenameDrafts((prev) => {
        const nx = { ...prev }
        delete nx[viejo]
        return nx
      })
      toast.success(`Código ${viejo} → ${nuevo}. Vuelve a Verificar local.`)
    },
    [editableCajas, setEditableCajas, setParsedData, setPrincipalPorSku]
  )

  const handleAjustarCajaNumero = useCallback(
    (codigo: string, campo: 'cantidad_cajas' | 'piezas_por_caja', valorRaw: string) => {
      const v = campo === 'cantidad_cajas' ? parseInt(valorRaw, 10) : Number(valorRaw)
      if (!codigo || isNaN(v) || v < 0 || (campo === 'cantidad_cajas' && !Number.isInteger(v))) {
        toast.error('Ingresa un número válido (entero ≥0 para cajas).')
        return
      }
      if (campo === 'cantidad_cajas' && v === 0) {
        toast.error('La cantidad debe ser >0 (CHECK DB + bloqueo modo cajas).')
        return
      }
      if (campo === 'piezas_por_caja' && !(v > 0)) {
        toast.error('Piezas por caja debe ser >0.')
        return
      }
      setEditableCajas((prev) =>
        prev.map((c) => {
          if (String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigo) return c
          if (campo === 'cantidad_cajas') {
            const pz = Number(c.piezas_por_caja || 0)
            const rec = c as Record<string, unknown>
            return {
              ...c,
              cantidad_cajas: v,
              total_piezas: pz * v,
              cbm_total_linea: Number(c.cbm_por_caja ?? c.cbm ?? 0) * v,
              peso_bruto_total_kg: Number(c.peso_bruto_kg ?? 0) * v,
              peso_neto_total_kg: Number(rec.peso_neto_kg ?? rec.peso_neto ?? 0) * v,
              piezas_estimadas: false,
            } as WizardCaja
          }
          const qty = Number(c.cantidad_cajas || 0)
          return {
            ...c,
            piezas_por_caja: v,
            total_piezas: v * qty,
            piezas_estimadas: false,
            piezas_heredadas: false,
          } as unknown as WizardCaja
        })
      )
      setModalCajaNumDrafts((prev) => {
        const nx = { ...prev }
        delete nx[`${codigo}||${campo}`]
        return nx
      })
      toast.success(`Caja ${codigo}: ${campo === 'cantidad_cajas' ? 'cantidad' : 'pz/caja'} = ${v}. Vuelve a Verificar local.`)
    },
    [setEditableCajas]
  )

  const doGuardarOrden = useCallback(() => {
    if (erroresBloqueantes.length > 0) {
      setMostrarErroresSubida(true)
      setIsConfirmFinalModalOpen(true)
      toast.error(`${erroresBloqueantes.length} bloqueo(s) pendientes: verifica en local y corrígelos antes de subir.`)
      return
    }
    const coloresPendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido')
    if (coloresPendientes.length > 0) {
      setColoresModalOpen(true)
      toast.error(
        `${coloresPendientes.length} color(es) sin resolver (${coloresPendientes
          .slice(0, 5)
          .map((c) => c.raw)
          .join(', ')}): mapea a existente o créalos antes de guardar.`
      )
      return
    }
    const matchFinal = calcularMatchCajasOrdenRapida()
    const matchPacksFinal = calcularMatchPacks()
    const fallasPacksFinal = matchPacksFinal.diffs.filter((d) => d.estado !== 'OK')
    if (!matchFinal.ok || !matchPacksFinal.ok) {
      setCajasBlockModal({
        open: true,
        blocking: true,
        items: [
          ...matchFinal.diffs
            .filter((d) => d.estado !== 'OK')
            .map((d) => ({
              sku: d.sku,
              cajasEsperadas: d.cajasLinea,
              cajasArmadas: d.cajasFisicas,
              diferencia: d.dif,
            })),
          ...fallasPacksFinal.map((d) => ({
            sku: `${d.sku} · ${d.pack}`,
            cajasEsperadas: d.linea,
            cajasArmadas: d.armadas,
            diferencia: d.dif,
          })),
        ],
      })
      toast.error('Bloqueo modo cajas: hay líneas sin match con las cajas armadas (SKU o pack).')
      return
    }
    startTransition(async () => {
      try {
        if (!selectedProveedor || !selectedCliente) {
          toast.error('Faltan socios comerciales.')
          return
        }

        const baseDetalles = editableCajas.flatMap((c) => detallesDesdeMatriz(c))
        const mapaIds = new Map<string, number>()
        for (const cc of coloresPorConfirmar) {
          if ((cc.estado === 'existente' || cc.estado === 'mapeado' || cc.estado === 'creado') && typeof cc.color_id === 'number') {
            mapaIds.set(claveColor(cc.raw), cc.color_id)
          }
        }
        for (const dd of baseDetalles) {
          const k = claveColor(String(dd?.color_raw || ''))
          if (!mapaIds.has(k)) {
            const seed = coloresPorConfirmar.find((cc) => claveColor(cc.raw) === k)
            const mm = resolveColor(
              String(dd?.color_raw || ''),
              catalogoColores as CatalogColor[],
              seed?.en ?? null,
              seed?.es ?? null
            )
            if (mm.found && typeof mm.id === 'number') mapaIds.set(k, mm.id)
          }
        }
        const detallesEditados = enriquecerDetallesConMapa(baseDetalles, mapaIds)
        const res = await guardarOrdenRapidaB2BAction({
          proveedorId: Number(selectedProveedor),
          clienteB2bId: Number(selectedCliente),
          contenedorId: selectedContenedor === 'new' ? null : Number(selectedContenedor),
          newContainerCode: selectedContenedor === 'new' ? newContainerCode : null,
          newContainerNumber:
            selectedContenedor === 'new'
              ? newContainerNumber.trim()
                ? newContainerNumber.trim().toUpperCase()
                : null
              : null,
          productos: editableProductos,
          cajas: editableCajas,
          detalles: detallesEditados,
          vinculosDb: Object.fromEntries(Object.entries(vinculosDb).map(([k, v]) => [k, v.dbId])),
          principalPorSku,
        })

        if (!res.success) {
          toast.error(res.error || 'Error al guardar la orden.')
          return
        }

        if (res.warnings && res.warnings.length > 0) {
          for (const w of res.warnings) toast.warning(w, { duration: 9000 })
        }
        toast.success('Orden guardada exitosamente en Supabase.')
        setStep(5)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error al guardar la orden.')
      }
    })
  }, [
    erroresBloqueantes.length,
    coloresPorConfirmar,
    setColoresModalOpen,
    calcularMatchCajasOrdenRapida,
    calcularMatchPacks,
    selectedProveedor,
    selectedCliente,
    editableCajas,
    catalogoColores,
    selectedContenedor,
    newContainerCode,
    newContainerNumber,
    editableProductos,
    vinculosDb,
    principalPorSku,
    setStep,
  ])

  const handleConfirmReview = useCallback(() => {
    if (probablesSinResolverCount > 0) {
      setAlertaAmbarOpen(true)
      return
    }
    doGuardarOrden()
  }, [probablesSinResolverCount, setAlertaAmbarOpen, doGuardarOrden])

  const handleNext = useCallback(() => {
    if (step === 1) {
      if (!selectedProveedor || !selectedCliente) {
        toast.error('Selecciona proveedor y cliente B2B.')
        return
      }
      if (selectedContenedor === 'new' && !newContainerCode.trim()) {
        toast.error('Escribe un codigo para el nuevo contenedor.')
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!parsedData || parsedData.productos.length === 0) {
        toast.error('Procesa un Packing List antes de continuar.')
        return
      }
      setStep(3)
      return
    }

    if (step === 3) {
      if (editableProductos.length === 0) {
        toast.error('Debe haber al menos un producto en la lista para continuar.')
        return
      }

      const discrepancias: Array<{ sku: string; piezasProducto: number; piezasCajas: number; diferencia: number }> = []
      for (const prod of editableProductos) {
        const skuUpper = prod.sku_base.trim().toUpperCase()
        const cajasDelSku = editableCajas.filter(
          (c) => String(c.sku_base || '').trim().toUpperCase() === skuUpper && c.tipo_caja !== 'padre_resumen'
        )
        const piezasEnCajas = cajasDelSku.reduce(
          (sum, c) => sum + (c.total_piezas || (c.cantidad_cajas || 0) * (c.piezas_por_caja || 0)),
          0
        )

        const jsonInfo = jsonTotalesPorSku.get(prod.sku_base)
        const piezasEsperadas = jsonInfo?.piezas || Number((prod as Record<string, unknown>).piezas_pedidas || 0) || 0

        if (piezasEsperadas > 0 && piezasEnCajas > 0 && Math.abs(piezasEsperadas - piezasEnCajas) > 0.01) {
          discrepancias.push({
            sku: prod.sku_base,
            piezasProducto: piezasEsperadas,
            piezasCajas: piezasEnCajas,
            diferencia: piezasEnCajas - piezasEsperadas,
          })
        }
      }

      if (discrepancias.length > 0) {
        setDiscrepancyModal({ open: true, items: discrepancias })
        return
      }

      const matchCajas = calcularMatchCajasOrdenRapida()
      if (!matchCajas.ok) {
        setCajasBlockModal({
          open: true,
          blocking: false,
          items: matchCajas.diffs
            .filter((d) => d.estado !== 'OK')
            .map((d) => ({
              sku: d.sku,
              cajasEsperadas: d.cajasLinea,
              cajasArmadas: d.cajasFisicas,
              diferencia: d.dif,
            })),
        })
        return
      }

      setStep(4)
      return
    }

    if (step === 4) {
      setIsConfirmFinalModalOpen(true)
    }
  }, [
    step,
    selectedProveedor,
    selectedCliente,
    selectedContenedor,
    newContainerCode,
    parsedData,
    editableProductos,
    editableCajas,
    jsonTotalesPorSku,
    calcularMatchCajasOrdenRapida,
    setStep,
  ])

  const handleBack = useCallback(() => {
    if (step > 1 && step < 5) {
      setStep(step - 1)
    }
  }, [step, setStep])

  return {
    isPending,
    discrepancyModal,
    setDiscrepancyModal,
    cajasBlockModal,
    setCajasBlockModal,
    huecosRellenados,
    lineaEditadaPorSku,
    setLineaEditadaPorSku,
    editLineaSku,
    setEditLineaSku,
    editLineaVal,
    setEditLineaVal,
    lineaEditadaPorPack,
    setLineaEditadaPorPack,
    editPackSku,
    setEditPackSku,
    editPackVal,
    setEditPackVal,
    isConfirmFinalModalOpen,
    setIsConfirmFinalModalOpen,
    verificacionManual,
    mostrarErroresSubida,
    setMostrarErroresSubida,
    mostrarAdvertenciasSubida,
    setMostrarAdvertenciasSubida,
    codigoRenameDrafts,
    setCodigoRenameDrafts,
    modalLineaDrafts,
    setModalLineaDrafts,
    modalPackDrafts,
    setModalPackDrafts,
    modalCajaNumDrafts,
    setModalCajaNumDrafts,
    resetVerificacionState,
    jsonTotalesPorSku,
    jsonPackPorSkuPack,
    lineaEsperada,
    lineaPackEsperada,
    jsonPackTieneSku,
    calcularMatchPacks,
    calcularMatchCajasOrdenRapida,
    huecosFisico,
    handleRellenarHuecos,
    handleRellenarDesdeAviso,
    verificacionPrevia,
    resumenSku,
    erroresSubida,
    erroresBloqueantes,
    advertenciasSubida,
    hashVerificacion,
    necesitaReverificar,
    verificadoOk,
    handleVerificarLocal,
    handleIrACorregir,
    handleRenombrarCodigoEnModal,
    handleAjustarCajaNumero,
    doGuardarOrden,
    handleConfirmReview,
    handleNext,
    handleBack,
  }
}
