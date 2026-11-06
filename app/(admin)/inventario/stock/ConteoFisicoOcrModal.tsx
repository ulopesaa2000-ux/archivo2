// app/(admin)/inventario/stock/ConteoFisicoOcrModal.tsx
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Camera,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Warehouse,
  Layers,
  Sparkles,
  CloudDownload,
  CloudUpload,
  Smartphone,
  Save,
} from 'lucide-react'
import type { BodegaRow } from '@/lib/types/tables'
import type {
  HojaConteoFisico,
  RenglonConteoFisico,
  EstadoConteoFisico,
  CandidatoSkuSimple,
} from '@/modules/inventario/conteo-fisico-types'
import { LOCAL_STORAGE_CONTEO_FISICO_KEY } from '@/modules/inventario/conteo-fisico-types'
import {
  actualizarBorradorHojaConteoAction,
  fetchHojasConteoPendientesAction,
  guardarHojaConteoOcrAction,
} from '@/modules/inventario/conteo-fisico-actions'
import { CandidatosSkuSelectorModal } from './CandidatosSkuSelectorModal'
import { HojasNubeSelectorModal } from './HojasNubeSelectorModal'
import { VisorFotoHojaModal } from './VisorFotoHojaModal'
import type { ImportFilaValida } from '@/modules/inventario/import-actions'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  onIrAConciliacion: (bodegaId: number, filas: ImportFilaValida[], propuestaDbIds?: string[]) => void
}

export function ConteoFisicoOcrModal({
  open,
  onOpenChange,
  bodegas,
  bodegaActivaId,
  onIrAConciliacion,
}: Props) {
  const [hojas, setHojas] = useState<HojaConteoFisico[]>([])
  const [procesando, setProcesando] = useState(false)
  const [progresoTexto, setProgresoTexto] = useState('')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroHoja, setFiltroHoja] = useState<number | 'todas'>('todas')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'sin_match' | 'con_formula'>('todos')
  const [fotoVisorUrl, setFotoVisorUrl] = useState<string | null>(null)
  const [zoomNivel, setZoomNivel] = useState(1)
  const [bodegaDestinoId, setBodegaDestinoId] = useState<number>(() => {
    if (bodegaActivaId && bodegaActivaId > 0) return bodegaActivaId
    return bodegas[0]?.id ?? 0
  })

  // Estado para candidatos SKU modal
  const [candidatoModalOpen, setCandidatoModalOpen] = useState(false)
  const [candidatoTarget, setCandidatoTarget] = useState<{
    hojaId: string
    renglonId: string
    skuOriginal: string
    estiloRaw: string
  } | null>(null)

  // Estado para sincronización en la nube (Celular <-> PC)
  const [nubeSelectorOpen, setNubeSelectorOpen] = useState(false)
  const [guardandoNube, setGuardandoNube] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // 1. Cargar borrador de localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CONTEO_FISICO_KEY)
      if (raw) {
        const parsed: EstadoConteoFisico = JSON.parse(raw)
        if (parsed.version === 'v1' && Array.isArray(parsed.hojas) && parsed.hojas.length > 0) {
          setHojas(parsed.hojas)
        }
      }
    } catch (e) {
      console.warn('Error al cargar borrador de conteo físico:', e)
    }
  }, [])

  // 2. Guardar en localStorage ante cambios
  const guardarBorrador = (nuevasHojas: HojaConteoFisico[]) => {
    setHojas(nuevasHojas)
    try {
      if (nuevasHojas.length === 0) {
        localStorage.removeItem(LOCAL_STORAGE_CONTEO_FISICO_KEY)
      } else {
        const estado: EstadoConteoFisico = {
          version: 'v1',
          fecha_actualizacion: new Date().toISOString(),
          hojas: nuevasHojas,
        }
        localStorage.setItem(LOCAL_STORAGE_CONTEO_FISICO_KEY, JSON.stringify(estado))
      }
    } catch (e) {
      console.warn('Error al guardar en localStorage:', e)
    }
  }

  const limpiarTodo = () => {
    if (hojas.length === 0) return
    if (confirm('¿Deseas vaciar la mesa de trabajo de este conteo?')) {
      guardarBorrador([])
      toast.info('Borrador local limpiado')
    }
  }

  // 3. Recepción de hojas seleccionadas desde el submodal de la nube
  const handleHojasSeleccionadasFromNube = (seleccionadas: HojaConteoFisico[]) => {
    const idsExistentes = new Set(hojas.map((h) => h.propuesta_db_id || h.id))
    const nuevas = seleccionadas.filter((h) => !idsExistentes.has(h.propuesta_db_id || h.id))
    if (nuevas.length === 0) {
      toast.info('Las hojas seleccionadas ya estaban en la mesa de trabajo.')
      return
    }
    const combinadas = [...hojas, ...nuevas].map((h, idx) => {
      const numHoja = idx + 1
      return {
        ...h,
        numero_hoja: numHoja,
        renglones: (h.renglones || []).map((r) => ({
          ...r,
          numero_hoja: numHoja,
        })),
      }
    })
    guardarBorrador(combinadas)
    setFiltroHoja('todas')
    toast.success(`Se agregaron ${nuevas.length} hoja(s) desde la nube (${combinadas.length} hojas en mesa de trabajo).`)
  }

  // 4. Guardar cambios parciales en la base de datos (Borrador en la nube)
  const handleGuardarBorradorNube = async () => {
    if (hojas.length === 0) return
    setGuardandoNube(true)

    try {
      let guardadas = 0
      const hojasActualizadas = [...hojas]

      for (let i = 0; i < hojasActualizadas.length; i++) {
        const h = hojasActualizadas[i]
        if (h.propuesta_db_id) {
          const res = await actualizarBorradorHojaConteoAction(
            h.propuesta_db_id,
            h.renglones,
            h.resumen
          )
          if (res.success) guardadas++
        } else {
          const res = await guardarHojaConteoOcrAction(h, bodegaDestinoId)
          if (res.success) {
            h.propuesta_db_id = res.data.propuestaId
            guardadas++
          }
        }
      }

      guardarBorrador(hojasActualizadas)
      toast.success(`Borrador guardado en la nube con éxito (${guardadas} hojas actualizadas).`)
    } catch (err: any) {
      console.error('Error al guardar borrador en la nube:', err)
      toast.error('Error al guardar en la nube: ' + err.message)
    } finally {
      setGuardandoNube(false)
    }
  }

  // 5. Procesar archivos de imagen con la API
  const procesarArchivos = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return
    const listaArchivos = Array.from(archivos)
    setProcesando(true)

    const numHojaInicial = hojas.length + 1
    const totalNuevas = listaArchivos.length
    const acumuladorHojas: HojaConteoFisico[] = [...hojas]

    for (let i = 0; i < listaArchivos.length; i++) {
      const file = listaArchivos[i]
      const numActual = numHojaInicial + i
      setProgresoTexto(`Digitalizando Hoja ${i + 1} de ${totalNuevas}: ${file.name}...`)

      const formData = new FormData()
      formData.append('foto', file)
      formData.append('numero_hoja', String(numActual))
      formData.append('total_hojas', String(numHojaInicial + totalNuevas - 1))
      if (bodegaDestinoId) {
        formData.append('bodega_id', String(bodegaDestinoId))
      }

      try {
        const res = await fetch('/api/inventario/conteo-fisico/ocr', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `Error en servidor (${res.status})`)
        }

        const hoja: HojaConteoFisico = data.hoja
        hoja.preview_data_url = URL.createObjectURL(file)
        hoja.numero_hoja = numActual
        hoja.renglones = (hoja.renglones || []).map((r) => ({
          ...r,
          numero_hoja: numActual,
        }))

        acumuladorHojas.push(hoja)
      } catch (err: any) {
        console.error('Error procesando hoja:', err)
        toast.error(`Error en Hoja ${numActual}: ${err.message}`)
      }
    }

    // Consolidar de golpe todas las hojas al terminar el lote
    guardarBorrador(acumuladorHojas)
    setFiltroHoja('todas')
    setProcesando(false)
    setProgresoTexto('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    toast.success(`Se procesaron y consolidaron ${acumuladorHojas.length} hojas en la mesa de trabajo.`)
  }

  // 6. Modificar renglón
  const handleCambiarCajas = (hojaId: string, renglonId: string, nuevasCajas: number) => {
    const nextHojas = hojas.map((h) => {
      if (h.id !== hojaId) return h
      const nextRenglones = h.renglones.map((r) => {
        if (r.id !== renglonId) return r
        return {
          ...r,
          cajas: isNaN(nuevasCajas) ? 0 : nuevasCajas,
          modificado_manualmente: true,
        }
      })
      let c1 = 0,
        c2 = 0
      nextRenglones.forEach((r) => {
        if (r.columna === 1) c1 += r.cajas
        else c2 += r.cajas
      })
      return {
        ...h,
        resumen: {
          columna_1: { ...h.resumen.columna_1, cajas: c1 },
          columna_2: { ...h.resumen.columna_2, cajas: c2 },
          total_hoja: { ...h.resumen.total_hoja, cajas: c1 + c2 },
        },
        renglones: nextRenglones,
      }
    })
    guardarBorrador(nextHojas)
  }

  const handleCambiarSku = (hojaId: string, renglonId: string, nuevoSku: string) => {
    const nextHojas = hojas.map((h) => {
      if (h.id !== hojaId) return h
      return {
        ...h,
        renglones: h.renglones.map((r) => {
          if (r.id !== renglonId) return r
          return {
            ...r,
            sku_candidato: nuevoSku.toUpperCase().trim(),
            sku_match: nuevoSku.toUpperCase().trim(),
            modificado_manualmente: true,
          }
        }),
      }
    })
    guardarBorrador(nextHojas)
  }

  // Al seleccionar un candidato desde el modal reciclado
  const handleSelectCandidatoFromModal = (c: CandidatoSkuSimple) => {
    if (!candidatoTarget) return
    const { hojaId, renglonId } = candidatoTarget

    const nextHojas = hojas.map((h) => {
      if (h.id !== hojaId) return h
      return {
        ...h,
        renglones: h.renglones.map((r) => {
          if (r.id !== renglonId) return r
          return {
            ...r,
            producto_id: c.producto_id,
            sku_candidato: c.sku,
            sku_match: c.sku,
            descripcion: c.nombre,
            match_score: c.score,
            modificado_manualmente: true,
          }
        }),
      }
    })

    guardarBorrador(nextHojas)
    toast.success(`Producto vinculado: ${c.sku}`)
  }

  const handleEliminarRenglon = (hojaId: string, renglonId: string) => {
    const nextHojas = hojas.map((h) => {
      if (h.id !== hojaId) return h
      const filtered = h.renglones.filter((r) => r.id !== renglonId)
      let c1 = 0,
        c2 = 0,
        r1 = 0,
        r2 = 0
      filtered.forEach((r) => {
        if (r.columna === 1) {
          c1 += r.cajas
          r1++
        } else {
          c2 += r.cajas
          r2++
        }
      })
      return {
        ...h,
        resumen: {
          columna_1: { renglones: r1, cajas: c1 },
          columna_2: { renglones: r2, cajas: c2 },
          total_hoja: { renglones: r1 + r2, cajas: c1 + c2 },
        },
        renglones: filtered,
      }
    })
    guardarBorrador(nextHojas)
    toast.info('Renglón eliminado')
  }

  const handleAgregarRenglonManual = (hojaId: string, columna: 1 | 2 = 1) => {
    const targetHoja = hojas.find((h) => h.id === hojaId) || hojas[0]
    if (!targetHoja) return

    const nuevoRenglon: RenglonConteoFisico = {
      id: `manual_${Date.now()}`,
      numero_hoja: targetHoja.numero_hoja,
      columna,
      renglon: targetHoja.renglones.length + 1,
      estilo_raw: '',
      sku_candidato: '',
      cajas_raw: '1',
      cajas: 1,
      confianza: 1,
      modificado_manualmente: true,
    }

    const nextHojas = hojas.map((h) => {
      if (h.id !== targetHoja.id) return h
      const nextRenglones = [...h.renglones, nuevoRenglon]
      let c1 = 0,
        c2 = 0,
        r1 = 0,
        r2 = 0
      nextRenglones.forEach((r) => {
        if (r.columna === 1) {
          c1 += r.cajas
          r1++
        } else {
          c2 += r.cajas
          r2++
        }
      })
      return {
        ...h,
        resumen: {
          columna_1: { renglones: r1, cajas: c1 },
          columna_2: { renglones: r2, cajas: c2 },
          total_hoja: { renglones: r1 + r2, cajas: c1 + c2 },
        },
        renglones: nextRenglones,
      }
    })

    guardarBorrador(nextHojas)
    toast.success('Renglón manual agregado')
  }

  // 7. Renglones aplanados y filtrados
  const todosLosRenglones = useMemo(() => {
    return hojas.flatMap((h) =>
      (h.renglones || []).map((r) => ({
        ...r,
        hoja_id: h.id,
        hoja_numero: Number(r.numero_hoja || h.numero_hoja || 1),
        hoja_comprobante_url: h.comprobante_url || h.preview_data_url,
      }))
    )
  }, [hojas])

  // Renglones pertenecientes a la hoja seleccionada (o todos) para los contadores de los botones
  const renglonesBaseFiltroHoja = useMemo(() => {
    if (filtroHoja === 'todas') return todosLosRenglones
    return todosLosRenglones.filter((r) => Number(r.hoja_numero) === Number(filtroHoja))
  }, [todosLosRenglones, filtroHoja])

  // Contadores reactivos que respetan la hoja seleccionada
  const contadoresFiltro = useMemo(() => {
    let sinMatch = 0
    let conFormula = 0
    renglonesBaseFiltroHoja.forEach((r) => {
      if (!r.producto_id) sinMatch++
      const raw = String(r.cajas_raw || '')
      if (raw.includes('+') || raw.includes('.')) conFormula++
    })
    return {
      total: renglonesBaseFiltroHoja.length,
      sinMatch,
      conFormula,
    }
  }, [renglonesBaseFiltroHoja])

  const renglonesFiltrados = useMemo(() => {
    return renglonesBaseFiltroHoja.filter((r) => {
      if (filtroEstado === 'sin_match' && r.producto_id) return false
      if (filtroEstado === 'con_formula' && !r.cajas_raw.includes('+') && !r.cajas_raw.includes('.'))
        return false

      if (filtroTexto.trim()) {
        const query = filtroTexto.toLowerCase()
        const matchSku = r.sku_candidato.toLowerCase().includes(query)
        const matchRaw = r.estilo_raw.toLowerCase().includes(query)
        const matchDesc = (r.descripcion || '').toLowerCase().includes(query)
        if (!matchSku && !matchRaw && !matchDesc) return false
      }
      return true
    })
  }, [renglonesBaseFiltroHoja, filtroEstado, filtroTexto])

  // 8. Totales globales
  const resumenGlobal = useMemo(() => {
    let totalCajas = 0
    let totalRenglones = 0
    let sinMatch = 0
    hojas.forEach((h) => {
      h.renglones.forEach((r) => {
        totalCajas += r.cajas
        totalRenglones++
        if (!r.producto_id) sinMatch++
      })
    })
    return { totalCajas, totalRenglones, totalHojas: hojas.length, sinMatch }
  }, [hojas])

  // 9. Consolidación por SKU para exportar o pasar a Reconciliación
  const consolidadoPorSku = useMemo(() => {
    const map = new Map<
      string,
      {
        sku: string
        producto_id: number | null
        descripcion: string | null
        familia: string | null
        cajas: number
        apariciones: number
      }
    >()

    todosLosRenglones.forEach((r) => {
      const key = (r.sku_match || r.sku_candidato || r.estilo_raw || '').trim().toUpperCase()
      if (!key) return
      const existing = map.get(key)
      if (existing) {
        existing.cajas += r.cajas
        existing.apariciones += 1
      } else {
        map.set(key, {
          sku: key,
          producto_id: r.producto_id || null,
          descripcion: r.descripcion || null,
          familia: r.familia || null,
          cajas: r.cajas,
          apariciones: 1,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.sku.localeCompare(b.sku))
  }, [todosLosRenglones])

  // 10. Descargar Excel con ExcelJS
  const descargarReporteExcel = async () => {
    if (hojas.length === 0) return

    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'inv-tienda ERP'
      wb.created = new Date()

      // Hoja 1: Consolidado SKU
      const ws1 = wb.addWorksheet('Consolidado SKU')
      ws1.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'SKU / Código', key: 'sku', width: 20 },
        { header: 'Descripción', key: 'descripcion', width: 35 },
        { header: 'Familia', key: 'familia', width: 18 },
        { header: 'Total Cajas Físicas', key: 'cajas', width: 18 },
        { header: 'Apariciones en Libreta', key: 'apariciones', width: 22 },
        { header: 'Estado Catálogo', key: 'estado', width: 18 },
      ]

      consolidadoPorSku.forEach((c, idx) => {
        ws1.addRow({
          idx: idx + 1,
          sku: c.sku,
          descripcion: c.descripcion || 'Sin match',
          familia: c.familia || '—',
          cajas: c.cajas,
          apariciones: c.apariciones,
          estado: c.producto_id ? 'EN CATÁLOGO' : 'NO ENCONTRADO',
        })
      })

      // Hoja 2: Detalle por Hoja
      const ws2 = wb.addWorksheet('Detalle de Hojas')
      ws2.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'Hoja', key: 'hoja', width: 12 },
        { header: 'Columna', key: 'columna', width: 14 },
        { header: 'Renglón', key: 'renglon', width: 10 },
        { header: 'Escrito en Hoja (Raw)', key: 'estilo_raw', width: 22 },
        { header: 'SKU Normalizado', key: 'sku_candidato', width: 20 },
        { header: 'Cajas Anotadas', key: 'cajas_raw', width: 16 },
        { header: 'Cajas Calculadas', key: 'cajas', width: 16 },
        { header: 'Confianza IA', key: 'confianza', width: 14 },
        { header: 'SKU Sistema', key: 'sku_match', width: 20 },
        { header: 'Descripción Sistema', key: 'descripcion', width: 35 },
      ]

      todosLosRenglones.forEach((r, idx) => {
        ws2.addRow({
          idx: idx + 1,
          hoja: `Hoja ${r.hoja_numero}`,
          columna: r.columna === 1 ? 'Izquierda' : 'Derecha',
          renglon: r.renglon,
          estilo_raw: r.estilo_raw,
          sku_candidato: r.sku_candidato,
          cajas_raw: r.cajas_raw,
          cajas: r.cajas,
          confianza: `${Math.round(r.confianza * 100)}%`,
          sku_match: r.sku_match || '—',
          descripcion: r.descripcion || '—',
        })
      })

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const fechaStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `Conteo_Fisico_Libreta_${fechaStr}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Reporte Excel descargado correctamente')
    } catch (err: any) {
      console.error('Error generando Excel:', err)
      toast.error('Error al generar archivo Excel: ' + err.message)
    }
  }

  // 11. Enviar directo a Conciliación Total de Bodega
  const handleContinuarConciliacion = () => {
    if (hojas.length === 0) {
      toast.error('No hay hojas escaneadas para conciliar')
      return
    }

    const bodegaSel = bodegas.find((b) => b.id === bodegaDestinoId)
    const itemsValidos: ImportFilaValida[] = []
    let omitidosSinMatch = 0

    consolidadoPorSku.forEach((c) => {
      if (c.producto_id && c.cajas > 0) {
        itemsValidos.push({
          producto_id: c.producto_id,
          sku: c.sku,
          producto_nombre: c.descripcion || null,
          cajas: c.cajas,
          bodega_id: bodegaDestinoId,
          bodega_nombre: bodegaSel?.nombre || 'Bodega',
        })
      } else {
        omitidosSinMatch++
      }
    })

    if (itemsValidos.length === 0) {
      toast.error(
        'Ningún producto escaneado coincide con el catálogo de la base de datos. Asigna los SKUs antes de continuar.'
      )
      return
    }

    if (omitidosSinMatch > 0) {
      toast.warning(
        `Se enviaron ${itemsValidos.length} productos válidos. ${omitidosSinMatch} productos no tienen coincidencia en catálogo y fueron excluidos del ajuste de bodega.`
      )
    }

    // Extraer los IDs de las propuestas de la base de datos para cerrarlas tras el ajuste
    const propuestaDbIds = hojas.map((h) => h.propuesta_db_id).filter(Boolean) as string[]

    onOpenChange(false)
    onIrAConciliacion(bodegaDestinoId, itemsValidos, propuestaDbIds)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl lg:max-w-7xl w-full max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* HEADER */}
          <div className="p-5 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold">
                <FileSpreadsheet className="size-6 text-blue-600 dark:text-blue-400" />
                Digitalizar Conteo Físico Manuscrito (Multi-Hoja)
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Escanea hojas cuadriculadas (2 columnas, operaciones aritméticas 1.1 / 4+2), sincroniza
                con celular en la nube y concilia stock con un clic.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botón Cargar de la nube */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNubeSelectorOpen(true)}
                className="gap-1.5 text-xs h-8 bg-background border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
              >
                <CloudDownload className="size-3.5 text-blue-600" />
                Sincronizar Celular (Nube)
              </Button>

              {/* Botón Guardar en Nube */}
              {hojas.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={guardandoNube}
                  onClick={handleGuardarBorradorNube}
                  className="gap-1.5 text-xs h-8 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 hover:bg-emerald-100"
                >
                  {guardandoNube ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="size-3.5 text-emerald-600" />
                  )}
                  Guardar Borrador en Nube
                </Button>
              )}

              {/* Botón Limpiar */}
              {hojas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiarTodo}
                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs h-8"
                >
                  <Trash2 className="size-3.5" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* CONTENIDO PRINCIPAL SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* BARRA SUPERIOR DE ACCIONES DE SUBIDA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tarjeta de Carga de Archivos */}
              <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col items-center justify-center text-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => procesarArchivos(e.target.files)}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => procesarArchivos(e.target.files)}
                />

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Button
                    size="sm"
                    disabled={procesando}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 text-xs"
                  >
                    <Upload className="size-3.5" />
                    Subir hojas (Galería)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={procesando}
                    onClick={() => cameraInputRef.current?.click()}
                    className="gap-1.5 border-blue-300 dark:border-blue-800 h-8 text-xs bg-background"
                  >
                    <Camera className="size-3.5 text-blue-600" />
                    Cámara
                  </Button>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Detección en 2 columnas. Las hojas se guardan automáticamente en la nube.
                </span>
              </div>

              {/* Tarjetas de Resumen Global */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Hojas Leídas</span>
                  <div className="text-2xl font-bold flex items-center gap-1.5 mt-1">
                    <FileText className="size-5 text-blue-500" />
                    {resumenGlobal.totalHojas}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Renglones Totales</span>
                  <div className="text-2xl font-bold flex items-center gap-1.5 mt-1">
                    <Layers className="size-5 text-slate-500" />
                    {resumenGlobal.totalRenglones}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 flex flex-col justify-between">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    Cajas Contadas
                  </span>
                  <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">
                    {resumenGlobal.totalCajas.toLocaleString('es-MX')}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Sin Coincidencia</span>
                  <div
                    className={`text-2xl font-bold mt-1 ${
                      resumenGlobal.sinMatch > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {resumenGlobal.sinMatch}
                  </div>
                </div>
              </div>
            </div>

            {/* BANNER DE PROGRESO SI ESTÁ PROCESANDO */}
            {procesando && (
              <div className="p-4 rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-950/40 flex items-center gap-3 animate-pulse">
                <RefreshCw className="size-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    {progresoTexto || 'Procesando hojas de libreta con IA...'}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400">
                    Extrayendo renglones de columna izquierda y derecha, resolviendo sumas manuscritas.
                  </div>
                </div>
              </div>
            )}

            {/* TARJETAS RESUMEN POR HOJA Y COLUMNA (COTEJO RÁPIDO CON LIBRETA EN MANO) */}
            {hojas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Cotejo Rápido por Hoja y Columna (Libreta)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Compara estos subtotales con los que sumaste al final de tu hoja
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hojas.map((h) => (
                    <div
                      key={h.id}
                      className="p-3.5 rounded-xl border bg-card shadow-sm space-y-2.5 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-bold text-xs bg-muted">
                            Hoja {h.numero_hoja}
                          </Badge>
                          {h.encabezado && (
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                              {h.encabezado}
                            </span>
                          )}
                          {h.fecha_detectada && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ({h.fecha_detectada})
                            </span>
                          )}
                        </div>

                        {(h.comprobante_url || h.preview_data_url) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-blue-600"
                            onClick={() => {
                              setFotoVisorUrl(h.comprobante_url || h.preview_data_url || null)
                              setZoomNivel(1)
                            }}
                            title="Ver foto de la hoja"
                          >
                            <Eye className="size-4" />
                          </Button>
                        )}
                      </div>

                      {/* Subtotales Izquierda y Derecha */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-muted/40 border">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase">
                            Col. Izquierda
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            {h.resumen.columna_1.cajas} cajas
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {h.resumen.columna_1.renglones} renglones
                          </div>
                        </div>

                        <div className="p-2 rounded bg-muted/40 border">
                          <div className="text-[10px] text-muted-foreground font-medium uppercase">
                            Col. Derecha
                          </div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            {h.resumen.columna_2.cajas} cajas
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {h.resumen.columna_2.renglones} renglones
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 border-t flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Subtotal Hoja:</span>
                        <span className="font-extrabold text-blue-600 dark:text-blue-400">
                          {h.resumen.total_hoja.cajas} cajas ({h.resumen.total_hoja.renglones} renglones)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABLA INTERACTIVA TIPO EXCEL */}
            {hojas.length > 0 ? (
              <div className="space-y-3">
                {/* FILTROS Y CONTROLES DE LA TABLA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {/* Buscador */}
                    <div className="relative min-w-[200px] flex-1 max-w-sm">
                      <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por SKU o descripción..."
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        className="pl-8 h-8 text-xs bg-background"
                      />
                    </div>

                    {/* Filtro Hoja */}
                    <select
                      value={filtroHoja}
                      onChange={(e) =>
                        setFiltroHoja(e.target.value === 'todas' ? 'todas' : Number(e.target.value))
                      }
                      className="h-8 text-xs rounded-md border border-input bg-background px-2.5 font-medium"
                    >
                      <option value="todas">Todas las hojas ({hojas.length})</option>
                      {hojas.map((h) => (
                        <option key={h.id} value={h.numero_hoja}>
                          Hoja {h.numero_hoja} ({h.resumen.total_hoja.renglones} reg.)
                        </option>
                      ))}
                    </select>

                    {/* Filtro Estatus */}
                    <div className="flex items-center gap-1 bg-background rounded-md p-0.5 border text-xs">
                      <button
                        onClick={() => setFiltroEstado('todos')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          filtroEstado === 'todos'
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Todos ({contadoresFiltro.total})
                      </button>
                      <button
                        onClick={() => setFiltroEstado('sin_match')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          filtroEstado === 'sin_match'
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Sin match ({contadoresFiltro.sinMatch})
                      </button>
                      <button
                        onClick={() => setFiltroEstado('con_formula')}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          filtroEstado === 'con_formula'
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Con fórmulas ({contadoresFiltro.conFormula})
                      </button>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAgregarRenglonManual(hojas[0]?.id || '')}
                    className="gap-1 h-8 text-xs shrink-0"
                  >
                    <Plus className="size-3.5" />
                    Agregar renglón manual
                  </Button>
                </div>

                {/* TABLA CON ENCABEZADOS 100% SÓLIDOS */}
                <div className="border rounded-xl overflow-hidden shadow-sm max-h-[440px] overflow-y-auto">
                  <table className="w-full text-xs border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-900 shadow-sm border-b">
                      <tr className="text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 w-24">Posición</th>
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 min-w-[130px]">
                          Escrito en Hoja
                        </th>
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 min-w-[170px]">
                          SKU Sistema (Match)
                        </th>
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 min-w-[200px]">
                          Descripción de Catálogo
                        </th>
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 text-center w-28">
                          Fórmula / Raw
                        </th>
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 text-right w-24">
                          Cajas
                        </th>
                        <th className="py-2.5 px-3 bg-slate-200 dark:bg-slate-900 text-center w-20">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {renglonesFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground">
                            No se encontraron renglones con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        renglonesFiltrados.map((r) => {
                          const tieneMatch = Boolean(r.producto_id)
                          const tieneFormula = r.cajas_raw.includes('+') || r.cajas_raw.includes('.')

                          return (
                            <tr
                              key={r.id}
                              className={`hover:bg-muted/40 transition-colors ${
                                !tieneMatch ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                              }`}
                            >
                              {/* Posición */}
                              <td className="py-2 px-3 font-mono">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted border">
                                  H{r.hoja_numero}-{r.columna === 1 ? 'Izq' : 'Der'} R{r.renglon}
                                </span>
                              </td>

                              {/* Escrito en Hoja */}
                              <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                                {r.estilo_raw || '—'}
                              </td>

                              {/* SKU Sistema con botón de Candidatos (Reciclado) */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={r.sku_match || r.sku_candidato}
                                    onChange={(e) =>
                                      handleCambiarSku(r.hoja_id, r.id, e.target.value)
                                    }
                                    className={`h-7 px-2 font-mono text-xs font-semibold rounded border w-full max-w-[125px] ${
                                      tieneMatch
                                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                                        : 'border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                                    }`}
                                    placeholder="SKU..."
                                  />

                                  {/* Botón de Candidatos SKU */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCandidatoTarget({
                                        hojaId: r.hoja_id,
                                        renglonId: r.id,
                                        skuOriginal: r.sku_candidato,
                                        estiloRaw: r.estilo_raw,
                                      })
                                      setCandidatoModalOpen(true)
                                    }}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-600 transition-colors"
                                    title="Ver candidatos similares de catálogo"
                                  >
                                    <Sparkles className="size-3.5 text-amber-500" />
                                  </button>

                                  {tieneMatch ? (
                                    <span title="Coincidencia en catálogo" className="inline-flex">
                                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                    </span>
                                  ) : (
                                    <span title="No encontrado en catálogo" className="inline-flex">
                                      <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Descripción */}
                              <td className="py-2 px-3">
                                {r.descripcion ? (
                                  <div className="truncate max-w-xs text-muted-foreground text-[11px]">
                                    {r.descripcion}
                                  </div>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 text-[11px] italic">
                                    Sin producto asignado
                                  </span>
                                )}
                              </td>

                              {/* Fórmula / Raw */}
                              <td className="py-2 px-3 text-center font-mono">
                                {tieneFormula ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                                    title={`Operación detectada en libreta: ${r.cajas_raw}`}
                                  >
                                    f(x) {r.cajas_raw}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">
                                    {r.cajas_raw}
                                  </span>
                                )}
                              </td>

                              {/* Cajas */}
                              <td className="py-2 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={r.cajas}
                                  onChange={(e) =>
                                    handleCambiarCajas(
                                      r.hoja_id,
                                      r.id,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-7 w-20 px-2 text-right font-bold text-xs rounded border bg-background font-mono focus:ring-1 focus:ring-blue-500"
                                />
                              </td>

                              {/* Acciones */}
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {r.hoja_comprobante_url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-6 text-muted-foreground hover:text-blue-600"
                                      onClick={() => {
                                        setFotoVisorUrl(r.hoja_comprobante_url || null)
                                        setZoomNivel(1.5)
                                      }}
                                      title="Ver foto de la hoja"
                                    >
                                      <Eye className="size-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6 text-muted-foreground hover:text-red-600"
                                    onClick={() => handleEliminarRenglon(r.hoja_id, r.id)}
                                    title="Eliminar renglón"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <FileSpreadsheet className="size-12 text-muted-foreground/30" />
                <div className="space-y-1">
                  <p className="font-semibold text-base text-foreground">
                    Aún no has cargado ninguna hoja
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Toma una foto con tu cámara, sube fotos de tu libreta o presiona{' '}
                    <strong className="text-blue-600">"Sincronizar Celular (Nube)"</strong> para traer
                    las hojas que subiste desde tu teléfono.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER CON SALIDAS (EXCEL O COMPARAR CON BODEGA) */}
          <div className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={hojas.length === 0}
                onClick={descargarReporteExcel}
                className="gap-1.5 h-9 text-xs font-semibold"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                Descargar Reporte Excel (.xlsx)
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 shrink-0">
                  <Warehouse className="size-3.5" />
                  Bodega a comparar:
                </span>
                <select
                  value={bodegaDestinoId}
                  onChange={(e) => setBodegaDestinoId(Number(e.target.value))}
                  className="h-9 text-xs rounded-md border border-input bg-background px-3 font-semibold text-foreground min-w-[180px] w-full sm:w-auto"
                >
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre} {b.ciudad ? `(${b.ciudad})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                size="sm"
                disabled={hojas.length === 0}
                onClick={handleContinuarConciliacion}
                className="gap-1.5 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md w-full sm:w-auto"
              >
                Comparar con Bodega
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUBMODAL SELECTOR DE HOJAS EN LA NUBE */}
      <HojasNubeSelectorModal
        open={nubeSelectorOpen}
        onOpenChange={setNubeSelectorOpen}
        bodegas={bodegas}
        bodegaDefaultId={bodegaDestinoId}
        onHojasSeleccionadas={handleHojasSeleccionadasFromNube}
      />

      {/* MODAL RECICLADO DE CANDIDATOS SKU */}
      {candidatoTarget && (
        <CandidatosSkuSelectorModal
          open={candidatoModalOpen}
          onOpenChange={setCandidatoModalOpen}
          skuOriginal={candidatoTarget.skuOriginal}
          estiloRaw={candidatoTarget.estiloRaw}
          onSelectCandidato={handleSelectCandidatoFromModal}
        />
      )}

      {/* MODAL VISOR DE FOTO CON ZOOM Y AJUSTE PANTALLA COMPLETA */}
      <VisorFotoHojaModal
        open={Boolean(fotoVisorUrl)}
        onOpenChange={(op) => {
          if (!op) setFotoVisorUrl(null)
        }}
        fotoUrl={fotoVisorUrl}
      />
    </>
  )
}
