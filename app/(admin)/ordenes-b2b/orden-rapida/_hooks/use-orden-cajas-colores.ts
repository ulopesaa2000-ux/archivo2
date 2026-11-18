// app/(admin)/ordenes-b2b/orden-rapida/_hooks/use-orden-cajas-colores.ts
'use client'

import { useState, useMemo, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { PersonaRow } from '@/lib/types/tables'
import { createColorAction, resolverHexColorAction } from '@/modules/catalogo/actions'
import {
  verificarSkusEnBDAction,
  type CatalogoColorOrdenRapida,
  type SkuProbable,
} from '@/modules/ordenes-b2b/actions'
import {
  buildColorDraft,
  claveColor,
  normalizeColorKey,
  resolveColor,
  suggestEs,
  type CatalogColor,
} from '@/lib/color-match'
import {
  aplicarEdicionCaja,
  aplicarMapaColoresACajas,
  aplicarRepartoSeparacion,
  agruparCajasPorProducto,
  detallesDesdeMatriz,
  fijarPzMinima,
  type CajaEditPayload,
} from '@/lib/orden-rapida-cajas'
import {
  calcularDestinos,
  dedupSeparaciones,
  mapaNombresResueltos,
  partirRangosCarton,
  siguienteLetraPack,
} from '@/lib/orden-rapida-colores'
import { aplicarDatosDbAProducto } from './orden-rapida-n8n'
import type {
  AlertaN8nLocal,
  CatalogItemOption,
  ColorDraft,
  ColorPorConfirmar,
  SeparacionSugerida,
  WizardCaja,
  WizardParsedData,
  WizardProducto,
  WizardProductoSnapshot,
} from './orden-rapida-types'

interface UseOrdenCajasColoresProps {
  step: number
  parsedData: WizardParsedData | null
  setParsedData: Dispatch<SetStateAction<WizardParsedData | null>>
  editableProductos: WizardProducto[]
  setEditableProductos: Dispatch<SetStateAction<WizardProducto[]>>
  editableCajas: WizardCaja[]
  setEditableCajas: Dispatch<SetStateAction<WizardCaja[]>>
  expandedProducts: Set<string>
  setExpandedProducts: Dispatch<SetStateAction<Set<string>>>
  proveedores: PersonaRow[]
  selectedProveedor: string
  marcas: CatalogItemOption[]
  generos: CatalogItemOption[]
  edades: CatalogItemOption[]
  tipos_prenda: CatalogItemOption[]
  setDbSkusSet: Dispatch<SetStateAction<Set<string>>>
  setProbablesDb: Dispatch<SetStateAction<SkuProbable[]>>
}

function renombrarCodigoCaja(
  codigoViejo: string,
  skuOrigen: string,
  skuDestino: string,
  usados: Set<string>
): string {
  const viejo = String(codigoViejo || '').trim()
  const normDest = String(skuDestino || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const prefOrigen = String(skuOrigen || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  let base: string
  if (prefOrigen && viejo.toUpperCase().startsWith(prefOrigen)) {
    base = normDest + viejo.slice(prefOrigen.length)
  } else if (viejo) {
    base = normDest ? `${normDest}--${viejo}` : viejo
  } else {
    base = normDest || 'CAJA'
  }
  base = base.replace(/\s*\(\d+\)$/, '')
  let candidato = base
  let n = 2
  while (usados.has(candidato.toUpperCase())) {
    candidato = `${base} (${n})`
    n++
  }
  return candidato
}

export function useOrdenCajasColores({
  step,
  parsedData,
  setParsedData,
  editableProductos,
  setEditableProductos,
  editableCajas,
  setEditableCajas,
  setExpandedProducts,
  proveedores,
  selectedProveedor,
  marcas,
  generos,
  edades,
  tipos_prenda,
  setDbSkusSet,
  setProbablesDb,
}: UseOrdenCajasColoresProps) {
  const [overrideProductos, setOverrideProductos] = useState<number | null>(null)
  const [overrideCajas, setOverrideCajas] = useState<number | null>(null)
  const [overridePiezas, setOverridePiezas] = useState<number | null>(null)
  const [overrideCbm, setOverrideCbm] = useState<number | null>(null)
  const [overridePesoNeto, setOverridePesoNeto] = useState<number | null>(null)
  const [overridePeso, setOverridePeso] = useState<number | null>(null)
  const [overrideModal, setOverrideModal] = useState<{
    key: 'productos' | 'cajas' | 'piezas' | 'cbm' | 'pesoNeto' | 'peso'
    label: string
  } | null>(null)
  const [overrideValor, setOverrideValor] = useState('')

  const [editPackNombre, setEditPackNombre] = useState<string | null>(null)
  const [editPackNombreVal, setEditPackNombreVal] = useState('')
  const [principalPorSku, setPrincipalPorSku] = useState<Record<string, string>>({})

  const [modoArrastre, setModoArrastre] = useState(false)
  const [cajaArrastrada, setCajaArrastrada] = useState<string | null>(null)
  const [dragOverProducto, setDragOverProducto] = useState<string | null>(null)
  const [showWarnings, setShowWarnings] = useState(false)
  const [showHuecos, setShowHuecos] = useState(false)

  const [catalogoColores, setCatalogoColores] = useState<CatalogoColorOrdenRapida[]>([])
  const [coloresPorConfirmar, setColoresPorConfirmar] = useState<ColorPorConfirmar[]>([])
  const [separacionIgnorada, setSeparacionIgnorada] = useState(false)
  const [coloresModalOpen, setColoresModalOpen] = useState(false)
  const [colorDrafts, setColorDrafts] = useState<Record<string, ColorDraft>>({})
  const [filtroPendientes, setFiltroPendientes] = useState('')
  const [hexSugiriendo, setHexSugiriendo] = useState<Set<string>>(new Set())
  const [ambarEditando, setAmbarEditando] = useState<Set<string>>(new Set())

  const coloresAutoOpenedRef = useRef(false)

  const abrirOverride = useCallback(
    (key: NonNullable<typeof overrideModal>['key'], label: string, actual: unknown) => {
      setOverrideValor(String(actual ?? ''))
      setOverrideModal({ key, label })
    },
    []
  )

  const aplicarOverride = useCallback(() => {
    if (!overrideModal) return
    const esEntero =
      overrideModal.key === 'productos' || overrideModal.key === 'cajas' || overrideModal.key === 'piezas'
    const parsed = esEntero ? parseInt(overrideValor, 10) : parseFloat(overrideValor)
    const val = overrideValor.trim() === '' || isNaN(parsed) ? null : parsed
    if (overrideModal.key === 'productos') setOverrideProductos(val)
    else if (overrideModal.key === 'cajas') setOverrideCajas(val)
    else if (overrideModal.key === 'piezas') setOverridePiezas(val)
    else if (overrideModal.key === 'cbm') setOverrideCbm(val)
    else if (overrideModal.key === 'pesoNeto') setOverridePesoNeto(val)
    else setOverridePeso(val)
    setOverrideModal(null)
  }, [overrideModal, overrideValor])

  const toggleProduct = useCallback(
    (sku: string) => {
      setExpandedProducts((prev) => {
        const next = new Set(prev)
        if (next.has(sku)) next.delete(sku)
        else next.add(sku)
        return next
      })
    },
    [setExpandedProducts]
  )

  const expandAllProducts = useCallback(() => {
    const allSku = editableCajas.map((c) => c.sku_base || '__sin_sku__')
    setExpandedProducts(new Set(allSku))
  }, [editableCajas, setExpandedProducts])

  const collapseAllProducts = useCallback(() => {
    setExpandedProducts(new Set())
  }, [setExpandedProducts])

  const resetCajasColoresState = useCallback(() => {
    setEditableCajas([])
    setExpandedProducts(new Set())
    setPrincipalPorSku({})
    setModoArrastre(false)
    setCajaArrastrada(null)
    setDragOverProducto(null)
    setShowWarnings(false)
    setShowHuecos(false)
    setCatalogoColores([])
    setColoresPorConfirmar([])
    setSeparacionIgnorada(false)
    setColoresModalOpen(false)
    setColorDrafts({})
    setFiltroPendientes('')
    setOverrideModal(null)
    setOverrideValor('')
    coloresAutoOpenedRef.current = false
  }, [setEditableCajas, setExpandedProducts])

  const cajasAgrupadas = useMemo(
    () => agruparCajasPorProducto(editableCajas, editableProductos),
    [editableCajas, editableProductos]
  )

  const cajasRealesMemo = useMemo(() => editableCajas.filter((c) => c.tipo_caja !== 'padre_resumen'), [editableCajas])

  const totalCajasCount = useMemo(
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.cantidad_cajas || 1), 0),
    [cajasRealesMemo]
  )

  const totalPiezasCount = useMemo(
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.total_piezas || c.piezas_por_caja * (c.cantidad_cajas || 1)), 0),
    [cajasRealesMemo]
  )

  const totalCbm = useMemo(
    () => cajasRealesMemo.reduce((sum, c) => sum + (c.cbm_total_linea || c.cbm * (c.cantidad_cajas || 1)), 0),
    [cajasRealesMemo]
  )

  const totalPesoBruto = useMemo(
    () =>
      cajasRealesMemo.reduce((sum, c) => {
        const pBrutoSingle = Number(c.peso_bruto_kg ?? 0)
        const qty = Number(c.cantidad_cajas || 1)
        const lineTotal = Number(c.peso_bruto_total_kg ?? pBrutoSingle * qty)
        return sum + (isNaN(lineTotal) ? 0 : lineTotal)
      }, 0),
    [cajasRealesMemo]
  )

  const totalPesoNeto = useMemo(
    () =>
      cajasRealesMemo.reduce((sum, c) => {
        const rec = c as Record<string, unknown>
        const pNetoSingle = Number(c.peso_neto_kg ?? rec.peso_neto ?? 0)
        const qty = Number(c.cantidad_cajas || 1)
        const lineTotal = Number(c.peso_neto_total_kg ?? pNetoSingle * qty)
        return sum + (isNaN(lineTotal) ? 0 : lineTotal)
      }, 0),
    [cajasRealesMemo]
  )

  const cajaPrincipalDe = useCallback(
    (skuUpper: string, cajas: WizardCaja[]): WizardCaja | null => {
      const reales = (cajas || []).filter((c) => c.tipo_caja !== 'padre_resumen')
      if (reales.length === 0) return null
      const elegido = principalPorSku[skuUpper]
      if (elegido) {
        const found = reales.find((c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === elegido)
        if (found) return found
      }
      const tieneMatriz = (c: WizardCaja) => {
        try {
          return detallesDesdeMatriz(c as Parameters<typeof detallesDesdeMatriz>[0]).length > 0 ? 1 : 0
        } catch {
          return 0
        }
      }
      return [...reales].sort((a, b) => {
        const ma = tieneMatriz(a)
        const mb = tieneMatriz(b)
        if (mb !== ma) return mb - ma
        const qa = Number(a.cantidad_cajas ?? 0)
        const qb = Number(b.cantidad_cajas ?? 0)
        if (qb !== qa) return qb - qa
        const pa = Number(a.total_piezas || (a.piezas_por_caja || 0) * (a.cantidad_cajas || 0))
        const pb = Number(b.total_piezas || (b.piezas_por_caja || 0) * (b.cantidad_cajas || 0))
        return pb - pa
      })[0]
    },
    [principalPorSku]
  )

  const alertasN8n = useMemo<AlertaN8nLocal[]>(() => {
    const raw = (parsedData as Record<string, unknown> | null)?.warnings
    return Array.isArray(raw) ? (raw as AlertaN8nLocal[]) : []
  }, [parsedData])

  const alertasPorSku = useMemo(() => {
    const map = new Map<string, AlertaN8nLocal[]>()
    for (const a of alertasN8n) {
      const up = String(a.sku_base || '').trim().toUpperCase()
      if (!up) continue
      const list = map.get(up) ?? []
      list.push(a)
      map.set(up, list)
    }
    return map
  }, [alertasN8n])

  const alertasPorCaja = useMemo(() => {
    const map = new Map<string, AlertaN8nLocal[]>()
    for (const a of alertasN8n) {
      const cod = String(a.codigo_caja_temporal || '').trim()
      if (!cod) continue
      const list = map.get(cod) ?? []
      list.push(a)
      map.set(cod, list)
    }
    return map
  }, [alertasN8n])

  const separacionPorSku = useMemo(() => {
    const map = new Map<string, SeparacionSugerida[]>()
    const push = (sku: string | undefined | null, s: SeparacionSugerida) => {
      const up = String(sku || '').trim().toUpperCase()
      if (!up) return
      const list = map.get(up) ?? []
      list.push(s)
      map.set(up, list)
    }
    for (const s of parsedData?.separacion_sugerida || []) push(s.sku_base_original, s)
    for (const a of alertasN8n) {
      if (a.tipo === 'sku_conjoinado_dudoso' || a.tipo === 'pack_duplicado_dudoso') {
        const up = String(a.sku_base || '').trim().toUpperCase()
        if (up && !(map.get(up) || []).length) {
          map.set(up, [{ tipo: a.tipo, sku_base_original: a.sku_base || undefined, motivo: a.detalle }])
        }
      }
    }
    for (const [key, list] of map) {
      if (list.length > 1) map.set(key, dedupSeparaciones(list))
    }
    return map
  }, [parsedData, alertasN8n])

  const auditoriaN8n = useMemo(() => {
    const raw = (parsedData as Record<string, unknown> | null)?.auditoria_n8n
    return (raw as Record<string, unknown> | undefined) ?? null
  }, [parsedData])

  const rellenadosN8n = useMemo(() => {
    const arr = (auditoriaN8n?.rellenados ?? []) as Array<{ sku?: string }>
    return new Set<string>(arr.map((r) => String(r.sku || '').trim().toUpperCase()))
  }, [auditoriaN8n])

  const detallesPorCaja = useMemo(() => {
    const det = parsedData?.detalles
    const map = new Map<string, number>()
    if (Array.isArray(det)) {
      for (const d of det) {
        const cod = String(d?.codigo_caja_temporal || '').trim()
        if (!cod) continue
        map.set(cod, (map.get(cod) ?? 0) + 1)
      }
    }
    return map
  }, [parsedData])

  const coloresNuevos = useMemo(() => coloresPorConfirmar.filter((c) => c.estado === 'nuevo'), [coloresPorConfirmar])
  const coloresOmitidos = useMemo(() => coloresPorConfirmar.filter((c) => c.estado === 'omitido'), [coloresPorConfirmar])
  const coloresSinResolver = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'nuevo' || c.estado === 'omitido'),
    [coloresPorConfirmar]
  )
  const coloresAmbar = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'existente' && c.via === 'parcial'),
    [coloresPorConfirmar]
  )
  const coloresAmbarDobles = useMemo(
    () => coloresPorConfirmar.filter((c) => c.estado === 'existente' && c.via === 'compuesto'),
    [coloresPorConfirmar]
  )

  const mapaColoresResueltos = useMemo(() => {
    const m = new Map<string, { color_id: number; nombre: string; via: string | null; estado: string }>()
    for (const c of coloresPorConfirmar) {
      if ((c.estado === 'existente' || c.estado === 'mapeado' || c.estado === 'creado') && typeof c.color_id === 'number') {
        const cat = catalogoColores.find((cc) => cc.id === c.color_id)
        m.set(claveColor(c.raw), {
          color_id: c.color_id,
          nombre: (cat?.nombre || c.raw).trim().toUpperCase(),
          via: c.via ?? null,
          estado: c.estado,
        })
      }
    }
    return m
  }, [coloresPorConfirmar, catalogoColores])

  const mapaNombres = useMemo(
    () => mapaNombresResueltos(coloresPorConfirmar, catalogoColores),
    [coloresPorConfirmar, catalogoColores]
  )

  // Auto-siembra de colores introducidos tras edición de matrices
  useEffect(() => {
    if (editableCajas.length === 0 || catalogoColores.length === 0) return
    const vistos = new Set<string>()
    const nuevosRaws: string[] = []
    for (const c of editableCajas) {
      for (const col of c.matriz?.colores || []) {
        const raw = String(col || '').trim()
        if (!raw) continue
        const k = claveColor(raw)
        if (vistos.has(k)) continue
        vistos.add(k)
        nuevosRaws.push(raw)
      }
    }
    if (nuevosRaws.length === 0) return
    setColoresPorConfirmar((prev) => {
      const tenidos = new Set(prev.map((c) => claveColor(c.raw)))
      const faltantes = nuevosRaws.filter((r) => !tenidos.has(claveColor(r)))
      if (faltantes.length === 0) return prev
      const tris = new Map((parsedData?.colores_traducidos || []).map((t) => [claveColor(String(t.raw || '')), t]))
      const add = faltantes.map((raw) => {
        const t = tris.get(claveColor(raw))
        const m = resolveColor(raw, catalogoColores as CatalogColor[], t?.en ?? null, t?.es ?? null)
        return {
          raw,
          en: t?.en ?? null,
          es: t?.es ?? null,
          cajas: editableCajas
            .filter((c) => (c.matriz?.colores || []).some((cc) => claveColor(String(cc)) === claveColor(raw)))
            .map((c) => String(c.codigo_caja || c.codigo_caja_temporal || ''))
            .filter(Boolean)
            .slice(0, 25),
          fuente: 'matriz',
          estado: (m.found ? 'existente' : 'nuevo') as ColorPorConfirmar['estado'],
          color_id: m.id ?? null,
          via: m.via,
        }
      })
      return [...prev, ...add]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableCajas, catalogoColores])

  const pendientesFiltrados = useMemo(() => {
    const toks = String(filtroPendientes || '')
      .split(/\s+/)
      .map((t) => normalizeColorKey(t))
      .filter((t) => t.length > 0)
    if (toks.length === 0) return coloresNuevos
    return coloresNuevos.filter((c) => {
      const hay = [c.raw, c.en ?? '', c.es ?? ''].map((s) => normalizeColorKey(s || '')).join(' ')
      return toks.every((t) => hay.includes(t))
    })
  }, [coloresNuevos, filtroPendientes])

  const ensureDrafts = useCallback(
    (nuevos: ColorPorConfirmar[]) => {
      const tris = new Map((parsedData?.colores_traducidos || []).map((t) => [claveColor(String(t.raw || '')), t]))
      setColorDrafts((prev) => {
        const next = { ...prev }
        for (const c of nuevos) {
          const key = claveColor(c.raw)
          if (!next[key]) {
            const t = tris.get(key)
            const d = buildColorDraft(c.raw, t?.en ?? c.en ?? null, t?.es ?? c.es ?? null)
            next[key] = { ...d, mapear_a_id: null }
          }
        }
        return next
      })
    },
    [parsedData]
  )

  useEffect(() => {
    if (step === 4 && !coloresAutoOpenedRef.current && coloresNuevos.length > 0) {
      coloresAutoOpenedRef.current = true
      ensureDrafts(coloresNuevos)
      setColoresModalOpen(true)
    }
  }, [step, coloresNuevos, ensureDrafts])

  const handleCajaEdit = useCallback(
    async (codigo: string, data: CajaEditPayload) => {
      setEditableCajas((prev) =>
        prev.map((caja) => {
          if (String(caja.codigo_caja_temporal || caja.codigo_caja || '') !== codigo) return caja
          return aplicarEdicionCaja(caja, data)
        })
      )
      toast.success('Caja actualizada localmente.')
    },
    [setEditableCajas]
  )

  const handleCajaRemove = useCallback(
    (codigo: string) => {
      setEditableCajas((prev) => prev.filter((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigo))
      toast.success('Caja eliminada de la vista.')
    },
    [setEditableCajas]
  )

  const handleFijarPzMinima = useCallback(() => {
    setEditableCajas((prev) => {
      const { cajas, fijadas } = fijarPzMinima(prev)
      if (fijadas > 0) {
        toast.warning(`${fijadas} caja(s) con 1 pza temporal: corrige el valor real en su tarjeta.`)
      } else {
        toast.info('No hay cajas sin piezas por caja.')
      }
      return cajas
    })
  }, [setEditableCajas])

  const handleToggleArrastrada = useCallback((codigo: string) => {
    setCajaArrastrada((prev) => (prev === codigo ? null : codigo))
  }, [])

  const handleDragStartArrastrada = useCallback((codigo: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', codigo)
    e.dataTransfer.effectAllowed = 'move'
    setCajaArrastrada(codigo)
  }, [])

  const handleDragEndArrastrada = useCallback(() => {
    setCajaArrastrada(null)
  }, [])

  const handleAbrirColores = useCallback(() => {
    setFiltroPendientes('')
    setColoresModalOpen(true)
  }, [])

  const handleAbrirColoresRaw = useCallback((raw?: string) => {
    setFiltroPendientes(raw ? String(raw) : '')
    setColoresModalOpen(true)
  }, [])

  const handleMoverCaja = useCallback(
    (codigoOrigen: string, skuDestino: string) => {
      const upDest = String(skuDestino || '').trim().toUpperCase()
      if (!codigoOrigen || !upDest) return
      const caja = editableCajas.find((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') === codigoOrigen)
      if (!caja) {
        toast.error('Caja no encontrada.')
        return
      }
      const upOrigen = String(caja.sku_base || '').trim().toUpperCase()
      if (upOrigen === upDest) {
        toast.info('La caja ya está en ese producto.')
        return
      }
      const prodDestino = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === upDest)
      if (!prodDestino) {
        toast.error('Producto destino no encontrado.')
        return
      }
      const usados = new Set(
        editableCajas
          .filter((c) => String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigoOrigen)
          .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || '').toUpperCase())
      )
      const nuevoCodigo = renombrarCodigoCaja(codigoOrigen, caja.sku_base || '', prodDestino.sku_base || '', usados)
      setEditableCajas((prev) =>
        prev.map((c) => {
          if (String(c.codigo_caja_temporal || c.codigo_caja || '') !== codigoOrigen) return c
          return {
            ...c,
            sku_base: prodDestino.sku_base,
            producto_temp_id: prodDestino.temp_id,
            codigo_caja_temporal: nuevoCodigo,
            codigo_caja: nuevoCodigo,
          }
        })
      )
      setParsedData((prev) => {
        if (!prev || !Array.isArray(prev.detalles)) return prev
        return {
          ...prev,
          detalles: prev.detalles.map((d) =>
            String(d?.codigo_caja_temporal || '') === codigoOrigen ? { ...d, codigo_caja_temporal: nuevoCodigo } : d
          ),
        }
      })
      setPrincipalPorSku((prev) => {
        let changed = false
        const next: Record<string, string> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (v === codigoOrigen) {
            next[k] = nuevoCodigo
            changed = true
          } else next[k] = v
        }
        return changed ? next : prev
      })
      setCajaArrastrada(null)
      setDragOverProducto(null)
      toast.success(`Caja ${codigoOrigen} → ${nuevoCodigo} en ${prodDestino.sku_base}.`)
    },
    [editableCajas, editableProductos, setEditableCajas, setParsedData]
  )

  const handleRenombrarPack = useCallback(
    (skuBase: string, packViejo: string, packNuevo: string) => {
      const upSku = String(skuBase || '').trim().toUpperCase()
      const upViejo = String(packViejo || 'PACK UNICO').trim().toUpperCase()
      const nuevo = String(packNuevo || '').trim().toUpperCase()
      if (!upSku || !nuevo || nuevo === upViejo) return
      const cods = new Set(
        editableCajas
          .filter(
            (c) =>
              String(c.sku_base || '').trim().toUpperCase() === upSku &&
              String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() === upViejo
          )
          .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || ''))
      )
      setEditableCajas((prev) =>
        prev.map((c) => {
          if (String(c.sku_base || '').trim().toUpperCase() !== upSku) return c
          if (String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() !== upViejo) return c
          return { ...c, nombre_pack: nuevo }
        })
      )
      setParsedData((prev) => {
        if (!prev || !Array.isArray(prev.detalles)) return prev
        return {
          ...prev,
          detalles: prev.detalles.map((d) =>
            cods.has(String(d?.codigo_caja_temporal || '')) ? { ...d, nombre_pack: nuevo } : d
          ),
        }
      })
      setEditPackNombre(null)
      toast.success(`Pack ${packViejo} → ${nuevo} en ${skuBase} (códigos intactos).`)
    },
    [editableCajas, setEditableCajas, setParsedData]
  )

  const handleDividirPack = useCallback(
    (skuBase: string, pack: string, cartonesSugeridos?: string[]) => {
      const upSku = String(skuBase || '').trim().toUpperCase()
      const upPack = String(pack || 'PACK UNICO').trim().toUpperCase()
      const grupo = editableCajas.filter(
        (c) =>
          c.tipo_caja !== 'padre_resumen' &&
          String(c.sku_base || '').trim().toUpperCase() === upSku &&
          String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() === upPack
      )
      if (grupo.length < 2) {
        toast.error('Se necesitan 2+ cajas para dividir el pack.')
        return
      }
      const wCartones = (cartonesSugeridos || []).map((x) => String(x).trim()).filter(Boolean)
      const enOrden =
        wCartones.length >= 2
          ? wCartones
          : Array.from(
              new Set(
                grupo
                  .map((c) => String((c as Record<string, unknown>).carton_no_raw || '').trim())
                  .filter(Boolean)
              )
            )
      const { mover } = partirRangosCarton(enOrden)
      if (mover.length === 0) {
        toast.error('No hay rangos de cartón distintos para dividir.')
        return
      }
      const segundaMitad = new Set(mover)
      const nuevo = siguienteLetraPack(pack)
      const codsSegunda = new Set(
        grupo
          .filter((c) => segundaMitad.has(String((c as Record<string, unknown>).carton_no_raw || '').trim()))
          .map((c) => String(c.codigo_caja_temporal || c.codigo_caja || ''))
      )
      setEditableCajas((prev) =>
        prev.map((c) => {
          if (c.tipo_caja === 'padre_resumen') return c
          if (String(c.sku_base || '').trim().toUpperCase() !== upSku) return c
          if (String(c.nombre_pack || 'PACK UNICO').trim().toUpperCase() !== upPack) return c
          const cod = String(c.codigo_caja_temporal || c.codigo_caja || '')
          if (!codsSegunda.has(cod)) return c
          return { ...c, nombre_pack: nuevo }
        })
      )
      setParsedData((prev) => {
        if (!prev || !Array.isArray(prev.detalles)) return prev
        return {
          ...prev,
          detalles: prev.detalles.map((d) =>
            codsSegunda.has(String(d?.codigo_caja_temporal || '')) ? { ...d, nombre_pack: nuevo } : d
          ),
        }
      })
      toast.success(`Pack ${pack} dividido: ${codsSegunda.size} caja(s) → ${nuevo}. Renómbralo si hace falta.`)
    },
    [editableCajas, setEditableCajas, setParsedData]
  )

  const handleSepararSugerido = useCallback(
    (sep: SeparacionSugerida, opts?: { soloCrear?: boolean }) => {
      const cands = (sep.productos_candidatos || [])
        .map((c) => ({
          sku: String(c.sku_base || '').trim(),
          alias: String(c.alias || '').trim(),
          cartones: (c.cartones || []).map((x) => String(x).trim()).filter(Boolean),
          filas: (c.filas || []).map((x) => Number(x)).filter((x) => Number.isFinite(x)),
        }))
        .filter((c) => c.sku)
      if (cands.length < 2) {
        toast.error('La sugerencia no trae 2+ candidatos: agrega el producto a mano.')
        return
      }
      const originalUp = String(sep.sku_base_original || '').trim().toUpperCase()
      const prodA = editableProductos.find((p) => String(p.sku_base || '').trim().toUpperCase() === originalUp)
      if (!prodA || !prodA.temp_id) {
        toast.error('Producto original no encontrado en la revisión.')
        return
      }
      const skuA = cands[0].sku
      const nuevos: WizardProducto[] = cands.slice(1).map((c, idx) => {
        const snap: WizardProductoSnapshot = {
          sku_base: c.sku,
          nombre: c.sku,
          descripcion: prodA.descripcion,
          marca: prodA.marca,
          marca_id: prodA.marca_id,
          tipo_prenda: prodA.tipo_prenda,
          tipo_prenda_id: prodA.tipo_prenda_id,
          genero: prodA.genero,
          genero_id: prodA.genero_id,
          edad: prodA.edad,
          edad_id: prodA.edad_id,
          precio_unitario_usd: prodA.precio_unitario_usd,
        }
        return {
          temp_id: `temp_split_${Date.now()}_${idx}`,
          producto_id: null,
          sku_base: c.sku,
          sku_raw: [c.sku, c.alias].filter(Boolean).join(' '),
          nombre: c.sku,
          descripcion: prodA.descripcion,
          marca: prodA.marca,
          marca_id: prodA.marca_id,
          tipo_prenda: prodA.tipo_prenda,
          tipo_prenda_id: prodA.tipo_prenda_id,
          genero: prodA.genero,
          genero_id: prodA.genero_id,
          edad: prodA.edad,
          edad_id: prodA.edad_id,
          precio_yuan: prodA.precio_yuan,
          precio_unitario_usd: prodA.precio_unitario_usd,
          estado_temporal: 'separado_sugerido',
          es_nuevo: true,
          packing_original: snap,
        }
      })
      const tempPorSku = new Map<string, string>([[skuA.toUpperCase(), prodA.temp_id]])
      for (const n of nuevos) tempPorSku.set(n.sku_base.toUpperCase(), n.temp_id!)
      const cajasOrigen = editableCajas.filter(
        (cj) => cj.tipo_caja !== 'padre_resumen' && String(cj.sku_base || '').trim().toUpperCase() === originalUp
      )
      const destinoPorCodigo = new Map<string, string>()
      let exactas = 0
      if (!opts?.soloCrear) {
        const { destinos, exactas: ex } = calcularDestinos(
          cajasOrigen.map((cj) => ({
            codigo: String(cj.codigo_caja_temporal || cj.codigo_caja || ''),
            carton: String((cj as Record<string, unknown>).carton_no_raw || '').trim(),
          })),
          parsedData?.staging_por_codigo || {},
          cands.map((c) => ({ sku_base: c.sku, filas: c.filas, cartones: c.cartones })),
          sep.reparto_exacto || [],
          (skuD) => tempPorSku.has(skuD.toUpperCase())
        )
        for (const [cod, skuD] of destinos) destinoPorCodigo.set(cod, skuD)
        exactas = ex
      }
      if (!opts?.soloCrear && destinoPorCodigo.size === 0 && cajasOrigen.length > 0) {
        toast.error(
          'Sin datos de posición para repartir (la sugerencia no trae filas ni cartones). Usa "Crear productos" y arrastra las cajas a mano.'
        )
        return
      }
      const aplicado = aplicarRepartoSeparacion({
        productos: editableProductos,
        cajas: editableCajas,
        detalles: (parsedData?.detalles || []) as Array<Record<string, unknown>>,
        prodATempId: prodA.temp_id,
        skuA,
        skuRawA: [skuA, cands[0].alias].filter(Boolean).join(' '),
        nuevos,
        tempPorSku: Object.fromEntries(tempPorSku),
        destinoPorCodigo,
        originalUp,
        renombrar: (cod, skuD, usadosSet) => renombrarCodigoCaja(cod, sep.sku_base_original || '', skuD, usadosSet),
      })
      const remapSize = aplicado.movidas
      setEditableProductos(aplicado.productos as WizardProducto[])
      setEditableCajas(aplicado.cajas as WizardCaja[])
      setParsedData((prev) => (prev ? { ...prev, detalles: aplicado.detalles } : prev))
      setExpandedProducts((prev) => {
        const next = new Set(prev)
        next.add(skuA)
        for (const n of nuevos) next.add(n.sku_base)
        return next
      })
      setSeparacionIgnorada(true)

      const proveedorActual = proveedores.find((item) => String(item.id) === selectedProveedor)
      void verificarSkusEnBDAction(
        nuevos.map((n) => n.sku_base),
        proveedorActual?.nombre_completo,
        proveedorActual ? Number(proveedorActual.id) : null
      ).then((res) => {
        if (res.success && res.skusExistentes.length > 0) {
          setDbSkusSet((prev) => new Set([...Array.from(prev), ...res.skusExistentes.map((s) => s.toUpperCase())]))
          if (res.productosMap && Object.keys(res.productosMap).length > 0) {
            const pMap = res.productosMap
            setEditableProductos((prev) =>
              prev.map((item) => {
                const dbData = pMap[item.sku_base.toUpperCase()]
                if (dbData && !item.force_new) {
                  return aplicarDatosDbAProducto(item, dbData, { marcas, generos, edades, tipos_prenda })
                }
                return item
              })
            )
          }
        }
        if (res.success && (res.probables ?? []).length > 0) {
          setProbablesDb((prev) => [...prev, ...(res.probables ?? [])])
        }
      })

      const estimadas = remapSize - Math.min(exactas, remapSize)
      if (opts?.soloCrear) {
        setModoArrastre(true)
        toast.info(
          `Productos creados (${[skuA, ...nuevos.map((n) => n.sku_base)].join(' + ')}). Modo arrastre activado: mueve cada caja a su producto.`
        )
      } else {
        toast.success(
          `Separado: ${skuA} conserva sus cajas; ${remapSize} caja(s) movidas` +
            (exactas > 0 ? ` (${exactas} exactas por documento${estimadas > 0 ? `, ${estimadas} por cartón` : ''})` : '') +
            `. Ajusta líneas esperadas${remapSize < cajasOrigen.length ? ' y arrastra el resto a mano' : ''}.`
        )
      }
    },
    [
      editableProductos,
      editableCajas,
      parsedData,
      setEditableProductos,
      setEditableCajas,
      setParsedData,
      setExpandedProducts,
      proveedores,
      selectedProveedor,
      setDbSkusSet,
      marcas,
      generos,
      edades,
      tipos_prenda,
      setProbablesDb,
    ]
  )

  const handleCajaAdd = useCallback(
    (producto: WizardProducto) => {
      const sku = String(producto.sku_base || '').trim()
      if (!sku) {
        toast.error('El producto no tiene SKU.')
        return
      }
      const up = sku.toUpperCase()
      const hermanas = editableCajas.filter(
        (c) => String(c.sku_base || '').trim().toUpperCase() === up && c.tipo_caja !== 'padre_resumen'
      )
      const principal = cajaPrincipalDe(up, hermanas)
      const n = hermanas.length + 1
      const codigo = `${sku.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}-MANUAL-${n}`
      const nueva: WizardCaja = {
        producto_temp_id: producto.temp_id,
        producto_id: producto.producto_id ?? null,
        codigo_caja_temporal: codigo,
        codigo_caja: codigo,
        sku_base: sku,
        sku_raw: sku,
        nombre_pack: principal?.nombre_pack || 'PACK UNICO',
        piezas_por_caja: principal?.piezas_por_caja ?? 0,
        cantidad_cajas: 1,
        total_piezas: principal?.piezas_por_caja ?? 0,
        peso_bruto_kg: principal?.peso_bruto_kg ?? 0,
        peso_bruto_total_kg: principal?.peso_bruto_kg ?? 0,
        peso_neto_kg: principal?.peso_neto_kg ?? 0,
        peso_neto_total_kg: principal?.peso_neto_kg ?? 0,
        largo_cm: principal?.largo_cm ?? 0,
        ancho_cm: principal?.ancho_cm ?? 0,
        alto_cm: principal?.alto_cm ?? 0,
        cbm: principal?.cbm ?? 0,
        cbm_por_caja: principal?.cbm_por_caja ?? principal?.cbm ?? 0,
        cbm_total_linea: principal?.cbm ?? 0,
        tallas: principal?.tallas ? [...principal.tallas] : [],
        colores: principal?.colores ? [...principal.colores] : [],
        matriz: {
          tallas: principal?.tallas ? [...principal.tallas] : [],
          colores: principal?.colores ? [...principal.colores] : [],
          valores: {},
        },
        estado_temporal: 'manual',
        tipo_caja: 'completa',
      }
      setEditableCajas((prev) => [...prev, nueva])
      setExpandedProducts((prev) => new Set(prev).add(sku))
      toast.success(`Caja ${codigo} agregada a ${sku}. Edítala en su tarjeta.`)
    },
    [editableCajas, cajaPrincipalDe, setEditableCajas, setExpandedProducts]
  )

  const handleMapearColor = useCallback(
    (raw: string, colorId: number | null) => {
      const key = claveColor(raw)
      if (colorId == null) {
        setColoresPorConfirmar((prev) =>
          prev.map((c) => (claveColor(c.raw) === key ? { ...c, estado: 'nuevo' as const, color_id: null, via: null } : c))
        )
        return
      }
      setColoresPorConfirmar((prev) =>
        prev.map((c) =>
          claveColor(c.raw) === key ? { ...c, estado: 'mapeado' as const, color_id: colorId, via: 'manual' } : c
        )
      )
      const cat = catalogoColores.find((c) => c.id === colorId)
      const destino = (cat?.nombre || '').trim().toUpperCase()
      if (destino) {
        setEditableCajas((prev) => {
          const { cajas: next, tocadas } = aplicarMapaColoresACajas(
            prev as Parameters<typeof aplicarMapaColoresACajas>[0],
            new Map([[key, { color_id: colorId, nombre: destino }]])
          )
          if (tocadas > 0) toast.success(`"${raw}" mapeado a ${destino}: ${tocadas} caja(s) actualizadas.`)
          else toast.success(`"${raw}" mapeado a ${destino}.`)
          return next as typeof prev
        })
      } else {
        toast.success(`"${raw}" mapeado a ${colorId}.`)
      }
    },
    [catalogoColores, setEditableCajas]
  )

  const handleSugerirHex = useCallback(
    async (raw: string) => {
      const key = claveColor(raw)
      const d = colorDrafts[key]
      if (!d || hexSugiriendo.has(key)) return
      setHexSugiriendo((prev) => new Set(prev).add(key))
      try {
        const r = await resolverHexColorAction(d.nombre, d.nombre_intern)
        setColorDrafts((prev) => ({
          ...prev,
          [key]: { ...(prev[key] ?? d), hex_code: r.hex },
        }))
        if (r.fuente === 'api') toast.success(`HEX ${r.hex} sugerido por API (${r.nombreApi ?? d.nombre_intern}).`)
        else if (r.fuente === 'biblioteca') toast.success(`HEX ${r.hex} desde biblioteca.`)
        else toast.warning('Sin match exacto de HEX: quedó negro, ajústalo manual.')
      } catch {
        toast.error('No se pudo sugerir HEX (red). Quedó el valor actual.')
      } finally {
        setHexSugiriendo((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [colorDrafts, hexSugiriendo]
  )

  const handleCrearColorFila = useCallback(
    async (raw: string): Promise<boolean> => {
      const key = claveColor(raw)
      const tri = (parsedData?.colores_traducidos || []).find((t) => claveColor(String(t.raw || '')) === key)
      const seed = coloresPorConfirmar.find((c) => claveColor(c.raw) === key)
      const d = colorDrafts[key] ?? {
        ...buildColorDraft(raw, tri?.en ?? seed?.en ?? null, tri?.es ?? seed?.es ?? null),
        mapear_a_id: null,
      }
      if (!d.nombre.trim() || !d.codigo.trim()) {
        toast.error(`Completa nombre y código para "${raw}".`)
        return false
      }
      const res = await createColorAction(
        d.nombre.trim(),
        d.codigo.trim(),
        d.hex_code,
        d.tipo_color,
        d.nombre_intern.trim()
      )
      if (!res.success || res.id == null) {
        toast.error(res.error || `No se pudo crear "${raw}".`)
        return false
      }
      const newId = Number(res.id)
      const nombreFinal = d.nombre.trim().toUpperCase()
      setCatalogoColores((prev) =>
        prev.some((c) => c.id === newId)
          ? prev
          : [
              ...prev,
              {
                id: newId,
                nombre: nombreFinal,
                codigo: d.codigo.trim().toUpperCase(),
                nombre_intern: d.nombre_intern.trim().toUpperCase() || null,
              },
            ]
      )
      setColoresPorConfirmar((prev) =>
        prev.map((c) =>
          claveColor(c.raw) === key ? { ...c, estado: 'creado' as const, color_id: newId, via: 'creado' } : c
        )
      )
      setEditableCajas((prev) => {
        const { cajas: next, tocadas } = aplicarMapaColoresACajas(
          prev as Parameters<typeof aplicarMapaColoresACajas>[0],
          new Map([[key, { color_id: newId, nombre: nombreFinal }]])
        )
        if (tocadas > 0) toast.success(`Color "${nombreFinal}" creado (id ${newId}): ${tocadas} caja(s) actualizadas.`)
        else toast.success(`Color "${nombreFinal}" creado (id ${newId}).`)
        return next as typeof prev
      })
      return true
    },
    [parsedData, coloresPorConfirmar, colorDrafts, setEditableCajas]
  )

  const handleCrearTodosColores = useCallback(async () => {
    const pendientes = coloresPorConfirmar.filter((c) => c.estado === 'nuevo')
    let ok = 0
    const fallos: string[] = []
    for (const c of pendientes) {
      const r = await handleCrearColorFila(c.raw)
      if (r) ok++
      else fallos.push(c.raw)
    }
    if (fallos.length === 0) toast.success(`${ok} color(es) creados.`)
    else toast.error(`${ok} creados, fallaron: ${fallos.join(', ')}`)
  }, [coloresPorConfirmar, handleCrearColorFila])

  const abrirEditorAmbar = useCallback(
    (raw: string) => {
      const key = claveColor(raw)
      setColorDrafts((prev) => {
        if (prev[key]) return prev
        const tri = (parsedData?.colores_traducidos || []).find((t) => claveColor(String(t.raw || '')) === key)
        const seed = coloresPorConfirmar.find((c) => claveColor(c.raw) === key)
        return {
          ...prev,
          [key]: { ...buildColorDraft(raw, tri?.en ?? seed?.en ?? null, tri?.es ?? seed?.es ?? null), mapear_a_id: null },
        }
      })
      setAmbarEditando((prev) => new Set(prev).add(key))
    },
    [parsedData, coloresPorConfirmar]
  )

  const cerrarEditorAmbar = useCallback((raw: string) => {
    setAmbarEditando((prev) => {
      const next = new Set(prev)
      next.delete(claveColor(raw))
      return next
    })
  }, [])

  const handleOmitirColor = useCallback((raw: string) => {
    const key = claveColor(raw)
    setColoresPorConfirmar((prev) =>
      prev.map((c) => (claveColor(c.raw) === key ? { ...c, estado: 'omitido' as const } : c))
    )
    toast.warning(`"${raw}" omitido: bloqueará el guardado hasta resolverlo.`)
  }, [])

  const handleReabrirColor = useCallback((raw: string) => {
    const key = claveColor(raw)
    setColoresPorConfirmar((prev) =>
      prev.map((c) => (claveColor(c.raw) === key ? { ...c, estado: 'nuevo' as const } : c))
    )
  }, [])

  const matchColoresPorCaja = useMemo(() => {
    const porCaja = new Map<string, string[]>()
    for (const c of editableCajas) {
      const cod = String(c.codigo_caja_temporal || c.codigo_caja || '')
      if (!cod) continue
      for (const raw of c.matriz?.colores || []) {
        const r = String(raw || '').trim()
        if (!r) continue
        const list = porCaja.get(cod) ?? []
        if (!list.some((x) => claveColor(x) === claveColor(r))) list.push(r)
        porCaja.set(cod, list)
      }
    }
    const map = new Map<string, Array<{ raw: string; found: boolean; via: string | null; nombre: string }>>()
    const tris = new Map((parsedData?.colores_traducidos || []).map((t) => [claveColor(String(t.raw || '')), t]))
    for (const [cod, raws] of porCaja) {
      map.set(
        cod,
        raws.map((raw) => {
          const res = mapaColoresResueltos.get(claveColor(raw))
          if (res) return { raw, found: true, via: res.via, nombre: res.nombre }
          const t = tris.get(claveColor(raw))
          const m = resolveColor(raw, catalogoColores as CatalogColor[], t?.en ?? null, t?.es ?? null)
          return { raw, found: m.found, via: m.via, nombre: m.catalog?.nombre || suggestEs(raw) }
        })
      )
    }
    return map
  }, [editableCajas, catalogoColores, mapaColoresResueltos, parsedData])

  return {
    overrideProductos,
    setOverrideProductos,
    overrideCajas,
    setOverrideCajas,
    overridePiezas,
    setOverridePiezas,
    overrideCbm,
    setOverrideCbm,
    overridePesoNeto,
    setOverridePesoNeto,
    overridePeso,
    setOverridePeso,
    overrideModal,
    setOverrideModal,
    overrideValor,
    setOverrideValor,
    abrirOverride,
    aplicarOverride,
    editPackNombre,
    setEditPackNombre,
    editPackNombreVal,
    setEditPackNombreVal,
    principalPorSku,
    setPrincipalPorSku,
    modoArrastre,
    setModoArrastre,
    cajaArrastrada,
    setCajaArrastrada,
    dragOverProducto,
    setDragOverProducto,
    showWarnings,
    setShowWarnings,
    showHuecos,
    setShowHuecos,
    catalogoColores,
    setCatalogoColores,
    coloresPorConfirmar,
    setColoresPorConfirmar,
    separacionIgnorada,
    setSeparacionIgnorada,
    coloresModalOpen,
    setColoresModalOpen,
    colorDrafts,
    setColorDrafts,
    filtroPendientes,
    setFiltroPendientes,
    hexSugiriendo,
    ambarEditando,
    toggleProduct,
    expandAllProducts,
    collapseAllProducts,
    resetCajasColoresState,
    cajasAgrupadas,
    totalCajasCount,
    totalPiezasCount,
    totalCbm,
    totalPesoBruto,
    totalPesoNeto,
    cajaPrincipalDe,
    alertasN8n,
    alertasPorSku,
    alertasPorCaja,
    separacionPorSku,
    auditoriaN8n,
    rellenadosN8n,
    detallesPorCaja,
    coloresNuevos,
    coloresOmitidos,
    coloresSinResolver,
    coloresAmbar,
    coloresAmbarDobles,
    mapaColoresResueltos,
    mapaNombres,
    pendientesFiltrados,
    ensureDrafts,
    matchColoresPorCaja,
    handleCajaEdit,
    handleCajaRemove,
    handleFijarPzMinima,
    handleToggleArrastrada,
    handleDragStartArrastrada,
    handleDragEndArrastrada,
    handleAbrirColores,
    handleAbrirColoresRaw,
    handleMoverCaja,
    handleRenombrarPack,
    handleDividirPack,
    handleSepararSugerido,
    handleCajaAdd,
    handleMapearColor,
    handleSugerirHex,
    handleCrearColorFila,
    handleCrearTodosColores,
    abrirEditorAmbar,
    cerrarEditorAmbar,
    handleOmitirColor,
    handleReabrirColor,
  }
}
