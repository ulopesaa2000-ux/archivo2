// app/(admin)/inventario/notas/nueva/NoteDraftBuilder.tsx
'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Loader2, Search, Plus, Trash2, Save, CheckCircle2, AlertCircle,
  Package, ArrowLeft, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Scale, RotateCcw, Upload, FileText, Image as ImageIcon, Camera, X,
  ZoomIn, ZoomOut, RotateCw
} from 'lucide-react'
import Link from 'next/link'
import {
  ADMIN_ROUTES, TIPO_MOVIMIENTO_ICONS, TIPO_MOVIMIENTO_COLORS,
} from '@/lib/constants'
import { guardarNotaAction, actualizarNotaAction, subirComprobanteNotaAction } from '@/modules/inventario/actions'
import type {
  CatalogosInventario, DraftNota, DraftProducto,
  ProductoBusqueda, CajaParaSelector, NotaCompleta,
} from '@/modules/inventario/types'
import type { BodegaRow, UsuarioBodegaRow } from '@/lib/types/tables'
import { cn } from '@/lib/utils'

const NO_CAJA_VALUE = '_none'

type Props = {
  catalogos: CatalogosInventario
  usuarioId: number
  mode: 'create' | 'edit'
  notaId?: number
  initialData?: NotaCompleta
  currentUserLevel: number
  userBodegas: (BodegaRow & { permisos_bodega?: UsuarioBodegaRow })[]
  ocrProposalId?: number
}

const TIPO_MOV_ICONS_COMP = {
  ENT: ArrowDownLeft,
  SAL: ArrowUpRight,
  TRF: ArrowLeftRight,
  AJU: Scale,
  DEV: RotateCcw,
}

export function NoteDraftBuilder({
  catalogos, usuarioId, mode, notaId, initialData,
  currentUserLevel, userBodegas, ocrProposalId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [zoomScale, setZoomScale] = useState(1)
  const [rotateDeg, setRotateDeg] = useState(0)

  const handleZoomIn = () => setZoomScale(s => Math.min(s + 0.25, 3))
  const handleZoomOut = () => setZoomScale(s => Math.max(s - 0.25, 0.5))
  const handleRotate = () => setRotateDeg(d => (d + 90) % 360)
  const handleReset = () => {
    setZoomScale(1)
    setRotateDeg(0)
  }

  const esCreador = mode === 'create' || initialData?.cabecera.usuario_id === usuarioId
  const esAdmin = currentUserLevel <= 2
  const esEncargado = currentUserLevel === 3
  const esTransferencia = mode === 'edit' && initialData?.cabecera.bodega_destino_id !== undefined && initialData?.cabecera.bodega_destino_id !== null

  const todoBloqueado = !esAdmin && !esCreador && !(esEncargado && esTransferencia)
  const soloEditaDestino = !esAdmin && !esCreador && esEncargado && esTransferencia

  // ── Draft state ─────────────────────────────────────────
  const [draft, setDraft] = useState<DraftNota>(() => {
    if (mode === 'edit' && initialData) {
      return {
        tipo_movimiento_id: catalogos.tiposMovimiento.find(
          (t) => t.codigo === initialData.cabecera.tipo_codigo
        )?.id ?? null,
        bodega_origen_id: catalogos.bodegas.find(
          (b) => b.codigo === initialData.cabecera.bodega_origen_codigo
        )?.id ?? null,
        bodega_destino_id: initialData.cabecera.bodega_destino_codigo
          ? catalogos.bodegas.find(
              (b) => b.codigo === initialData.cabecera.bodega_destino_codigo
            )?.id ?? null
          : null,
        nota_referencia: initialData.cabecera.nota_referencia ?? '',
        observaciones: initialData.cabecera.observaciones ?? '',
        costo_total: initialData.cabecera.costo_total ?? 0,
        productos: initialData.detalles.map((d) => ({
          tempId: crypto.randomUUID(),
          producto_id: d.producto_id!,
          producto_sku: d.producto_sku ?? '',
          producto_nombre: d.producto_nombre,
          producto_pz_en_caja: d.producto_pz_en_caja,
          cajas: d.cajas,
          piezas_sueltas: d.piezas_sueltas,
          caja_id: d.caja_id,
          caja_codigo: d.caja_codigo,
          caja_nombre_pack: d.caja_nombre_pack,
          stock_origen_cajas: 0,
          stock_origen_piezas: 0,
        })),
      }
    }
    // Si viene de propuesta OCR
    if (initialData && (initialData.cabecera as any).productos_draft) {
      const hc = initialData.cabecera as any
      return {
        tipo_movimiento_id: hc.tipo_movimiento_id ?? null,
        bodega_origen_id: hc.bodega_origen_id ?? null,
        bodega_destino_id: hc.bodega_destino_id ?? null,
        nota_referencia: hc.nota_referencia ?? '',
        observaciones: hc.observaciones ?? '',
        costo_total: 0,
        productos: hc.productos_draft || [],
      }
    }
    return {
      tipo_movimiento_id: null,
      bodega_origen_id: null,
      bodega_destino_id: null,
      nota_referencia: '',
      observaciones: '',
      costo_total: 0,
      productos: [],
    }
  })

  // Bodegas permitidas según el nivel de acceso del usuario (incluyendo siempre las seleccionadas en la nota para evitar ID en Select)
  const allowedBodegas = currentUserLevel <= 2
    ? catalogos.bodegas
    : catalogos.bodegas.filter((b) => 
        userBodegas.some((ub) => ub.id === b.id) || 
        b.id === draft.bodega_origen_id || 
        b.id === draft.bodega_destino_id
      )

  // ── Comprobante Físico ───────────────────────────────────
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(initialData?.cabecera.comprobante_url ?? null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setComprobanteFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setComprobantePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearFile = () => {
    setComprobanteFile(null)
    setComprobantePreview(null)
  }

  // Verificar si puede confirmar en la bodega origen seleccionada
  const selectedBodegaObj = userBodegas.find((b) => b.id === draft.bodega_origen_id)
  const puedeConfirmar = currentUserLevel <= 2 || !!selectedBodegaObj?.permisos_bodega?.puede_confirmar_notas

  // ── Búsqueda de productos ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoBusqueda[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductoBusqueda | null>(null)
  const [cajasDisponibles, setCajasDisponibles] = useState<CajaParaSelector[]>([])

  // Existencias en tiempo real
  const [selectedProductStock, setSelectedProductStock] = useState<{ cajas: number; piezas_sueltas: number } | null>(null)

  // Formulario de agregar producto
  const [addCajas, setAddCajas] = useState<string>('1')
  const [addPiezas, setAddPiezas] = useState<string>('0')
  const [addCajaId, setAddCajaId] = useState<string>(NO_CAJA_VALUE)

  // Confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // ── Tipo seleccionado ───────────────────────────────────
  const tipoSeleccionado = catalogos.tiposMovimiento.find(
    (t) => t.id === draft.tipo_movimiento_id
  )

  // ── Consulta de existencias en bodega origen ──────────────
  const fetchStock = useCallback(async (prodId: number, bodId: number) => {
    try {
      const res = await fetch(`/api/inventario/notas/nueva/stock?producto_id=${prodId}&bodega_id=${bodId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedProductStock(data)
      } else {
        setSelectedProductStock({ cajas: 0, piezas_sueltas: 0 })
      }
    } catch {
      setSelectedProductStock({ cajas: 0, piezas_sueltas: 0 })
    }
  }, [])

  // Re-fetch stock si cambia bodega o producto
  useEffect(() => {
    if (selectedProduct && draft.bodega_origen_id) {
      fetchStock(selectedProduct.id, draft.bodega_origen_id)
    }
  }, [draft.bodega_origen_id, selectedProduct, fetchStock])

  // Cargar existencias de los productos ya guardados al entrar en modo edición
  useEffect(() => {
    if (mode === 'edit' && draft.bodega_origen_id && draft.productos.length > 0) {
      const loadExistingStocks = async () => {
        try {
          const updatedProducts = await Promise.all(
            draft.productos.map(async (p) => {
              const res = await fetch(
                `/api/inventario/notas/nueva/stock?producto_id=${p.producto_id}&bodega_id=${draft.bodega_origen_id}`
              )
              if (res.ok) {
                const stockData = await res.json()
                return {
                  ...p,
                  stock_origen_cajas: stockData.cajas,
                  stock_origen_piezas: stockData.piezas_sueltas,
                }
              }
              return p
            })
          )
          setDraft((prev) => ({
            ...prev,
            productos: updatedProducts,
          }))
        } catch (err) {
          console.error('Error al cargar existencias de productos existentes:', err)
        }
      }
      loadExistingStocks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, draft.bodega_origen_id])

  // ── Búsqueda con debounce ───────────────────────────────
  const doSearch = useDebouncedCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(
        `/api/inventario/notas/nueva/search?q=${encodeURIComponent(term)}`
      )
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      }
    } catch {
      setSearchResults([])
    }
    setIsSearching(false)
  }, 400)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    doSearch(value)
  }

  // ── Seleccionar producto de resultados ──────────────────
  const handleSelectProduct = async (product: ProductoBusqueda) => {
    setSelectedProduct(product)
    setSearchResults([])
    setSearchTerm(product.sku_base)
    setAddCajas('1')
    setAddPiezas('0')
    setAddCajaId(NO_CAJA_VALUE)
    setSelectedProductStock(null)

    if (draft.bodega_origen_id) {
      fetchStock(product.id, draft.bodega_origen_id)
    }

    // Cargar cajas del producto
    try {
      const res = await fetch(
        `/api/inventario/notas/nueva/packs?producto_id=${product.id}`
      )
      if (res.ok) {
        const data = await res.json()
        setCajasDisponibles(data)
      }
    } catch {
      setCajasDisponibles([])
    }
  }

  // ── Agregar producto al draft ───────────────────────────
  const handleAddProduct = () => {
    if (!selectedProduct) return

    const cajasNum = parseFloat(addCajas) || 0
    const piezasNum = parseInt(addPiezas) || 0

    if (cajasNum <= 0 && piezasNum <= 0) {
      setError('Ingresa al menos una caja o pieza.')
      return
    }

    const cajaSeleccionada = addCajaId && addCajaId !== NO_CAJA_VALUE
      ? cajasDisponibles.find((c) => c.id === parseInt(addCajaId))
      : null

    const newProduct: DraftProducto = {
      tempId: crypto.randomUUID(),
      producto_id: selectedProduct.id,
      producto_sku: selectedProduct.sku_base,
      producto_nombre: selectedProduct.nombre,
      producto_pz_en_caja: selectedProduct.pz_en_caja,
      cajas: cajasNum,
      piezas_sueltas: piezasNum,
      caja_id: cajaSeleccionada?.id ?? null,
      caja_codigo: cajaSeleccionada?.codigo_caja ?? null,
      caja_nombre_pack: cajaSeleccionada?.nombre_pack ?? null,
      stock_origen_cajas: selectedProductStock?.cajas ?? 0,
      stock_origen_piezas: selectedProductStock?.piezas_sueltas ?? 0,
    }

    setDraft((prev) => ({
      ...prev,
      productos: [...prev.productos, newProduct],
    }))

    // Limpiar
    setSelectedProduct(null)
    setSearchTerm('')
    setCajasDisponibles([])
    setSelectedProductStock(null)
    setAddCajas('1')
    setAddPiezas('0')
    setAddCajaId(NO_CAJA_VALUE)
    setError(null)
  }

  // ── Eliminar producto del draft ─────────────────────────
  const handleRemoveProduct = (tempId: string) => {
    setDraft((prev) => ({
      ...prev,
      productos: prev.productos.filter((p) => p.tempId !== tempId),
    }))
  }

  // ── Guardar ─────────────────────────────────────────────
  const handleSave = (confirmar: boolean) => {
    if (confirmar) {
      setShowConfirmDialog(true)
      return
    }
    doSave(false)
  }

  const doSave = (confirmar: boolean) => {
    setError(null)
    setSuccess(null)
    setShowConfirmDialog(false)

    startTransition(async () => {
      let result
      if (mode === 'edit' && notaId) {
        result = await actualizarNotaAction(notaId, draft, confirmar)
      } else {
        result = await guardarNotaAction(draft, confirmar, ocrProposalId)
      }

      if (!result.success) {
        setError(result.error ?? 'Error desconocido.')
        return
      }

      const destId = result.nota_id ?? notaId

      // Si hay un comprobante físico para subir
      if (destId && comprobanteFile) {
        const formData = new FormData()
        formData.append('file', comprobanteFile)
        const uploadResult = await subirComprobanteNotaAction(destId, formData)
        if (!uploadResult.success) {
          setError(`Nota guardada, pero falló la subida del comprobante: ${uploadResult.error}`)
          return
        }
      }

      setSuccess(
        confirmar
          ? 'Nota confirmada exitosamente.'
          : `Nota guardada como borrador${result.numero_nota ? ` (${result.numero_nota})` : ''}.`
      )

      // Navegar al detalle después de guardar
      if (destId) {
        setTimeout(() => {
          router.push(ADMIN_ROUTES.inventario.notaDetalle(destId))
          router.refresh()
        }, 800)
      }
    })
  }

  // ── Total estimado de cajas ─────────────────────────────
  const totalCajas = draft.productos.reduce((sum, p) => sum + p.cajas, 0)

  // ── Verificaciones de Stock Negativo en Formulario ────────
  const cajasNum = parseFloat(addCajas) || 0
  const isNegativeStockRisk = selectedProduct && 
    (tipoSeleccionado?.codigo === 'SAL' || tipoSeleccionado?.codigo === 'TRF') && 
    cajasNum > (selectedProductStock?.cajas ?? 0)

  const isEntrada = tipoSeleccionado?.codigo === 'ENT' || tipoSeleccionado?.codigo === 'DEV' || tipoSeleccionado?.afecta_inventario === 1
  const simulatedStock = selectedProductStock ? (
    isEntrada
      ? selectedProductStock.cajas + cajasNum
      : selectedProductStock.cajas - cajasNum
  ) : 0

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="font-bold tracking-tight">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="font-bold tracking-tight">{success}</span>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", ocrProposalId ? "lg:grid-cols-12" : "")}>
        <div className={cn("space-y-6", ocrProposalId ? "lg:col-span-7 xl:col-span-8" : "")}>
          {/* ── Configuración de la nota ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xl shadow-black/5 bg-gradient-to-br from-card to-muted/20 border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-black tracking-tight uppercase text-muted-foreground opacity-80">Detalles Generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo Movimiento Selector Premium */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Movimiento *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {catalogos.tiposMovimiento.map((t) => {
                  const Icon = TIPO_MOV_ICONS_COMP[t.codigo as keyof typeof TIPO_MOV_ICONS_COMP] || Package
                  const isSelected = draft.tipo_movimiento_id === t.id
                  const colorMap = TIPO_MOVIMIENTO_COLORS[t.codigo] || 'bg-primary text-primary-foreground'
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={mode === 'edit' || todoBloqueado || soloEditaDestino}
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          tipo_movimiento_id: t.id,
                          bodega_destino_id: null,
                        }))
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1 group",
                        (mode === 'edit' || todoBloqueado || soloEditaDestino) && "opacity-50 cursor-not-allowed",
                        isSelected 
                          ? cn("border-transparent font-bold shadow-lg shadow-black/5 scale-102", colorMap.split(' ')[0], colorMap.split(' ')[1])
                          : "bg-background hover:bg-muted/80 text-muted-foreground border-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                      <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{t.nombre}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bodega Origen */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bodega Origen *</Label>
                <Select
                  value={draft.bodega_origen_id?.toString() ?? ''}
                  onValueChange={(v) =>
                    v && setDraft((prev) => ({ ...prev, bodega_origen_id: parseInt(v) }))
                  }
                  disabled={mode === 'edit' || todoBloqueado || soloEditaDestino}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Seleccionar origen...">
                      {allowedBodegas.find((b) => String(b.id) === draft.bodega_origen_id?.toString())?.nombre}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allowedBodegas.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.nombre}
                        {b.es_virtual && (
                          <Badge variant="secondary" className="ml-2 text-[9px] font-black uppercase leading-none">Virtual</Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bodega Destino (condicional) */}
              {tipoSeleccionado?.requiere_destino ? (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bodega Destino *</Label>
                  <Select
                    value={draft.bodega_destino_id?.toString() ?? ''}
                    onValueChange={(v) =>
                      v && setDraft((prev) => ({ ...prev, bodega_destino_id: parseInt(v) }))
                    }
                    disabled={todoBloqueado || (mode === 'edit' && (!esTransferencia || (!esAdmin && !esEncargado)))}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Seleccionar destino...">
                        {allowedBodegas.find((b) => String(b.id) === draft.bodega_destino_id?.toString())?.nombre}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allowedBodegas
                        .filter((b) => b.id !== draft.bodega_origen_id)
                        .map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referencia (opcional)</Label>
                  <Input
                    value={draft.nota_referencia}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, nota_referencia: e.target.value }))
                    }
                    placeholder="Ej: OC-2026-043"
                    maxLength={50}
                    className="h-11 rounded-xl"
                    disabled={todoBloqueado || soloEditaDestino}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tipoSeleccionado?.requiere_destino && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referencia (opcional)</Label>
                  <Input
                    value={draft.nota_referencia}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, nota_referencia: e.target.value }))
                    }
                    placeholder="Ej: OC-2026-043"
                    maxLength={50}
                    className="h-11 rounded-xl"
                    disabled={todoBloqueado || soloEditaDestino}
                  />
                </div>
              )}

              {/* Costo Total (solo Salida o Traslado) */}
              {(tipoSeleccionado?.codigo === 'SAL' || tipoSeleccionado?.codigo === 'TRF') && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Costo Total de la Nota ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.costo_total || ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : 0
                      setDraft((prev) => ({ ...prev, costo_total: val }))
                    }}
                    placeholder="Ej: 12500.00"
                    className="h-11 rounded-xl"
                    disabled={todoBloqueado || soloEditaDestino}
                  />
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observaciones (opcional)</Label>
              <Textarea
                value={draft.observaciones}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, observaciones: e.target.value }))
                }
                placeholder="Ingresa notas, chofer, placas, etc..."
                rows={2}
                className="rounded-xl"
                disabled={todoBloqueado || soloEditaDestino}
              />
            </div>
          </CardContent>
        </Card>

        {/* Comprobante Físico Card */}
        <Card className="shadow-xl shadow-black/5 bg-gradient-to-br from-card to-muted/20 border">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight uppercase text-muted-foreground opacity-80">Comprobante Físico</CardTitle>
            <CardDescription className="text-xs">Sube la firma o factura de entrega para auditoría</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[160px] p-6">
            {comprobantePreview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border bg-background group shadow-sm">
                <Image
                  src={comprobantePreview}
                  alt="Vista previa comprobante"
                  fill
                  className="object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Label htmlFor="comprobante-uploader" className="p-2 bg-white text-gray-800 rounded-full cursor-pointer hover:bg-gray-100 shadow-md">
                    <Camera className="h-4 w-4" />
                  </Label>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleClearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <Input
                  type="file"
                  id="comprobante-uploader"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Label
                  htmlFor="comprobante-uploader"
                  className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 cursor-pointer bg-background hover:bg-muted/30 transition-all text-center"
                >
                  <Upload className="h-10 w-10 text-muted-foreground opacity-60 mb-2" />
                  <span className="text-xs font-black uppercase tracking-tight text-foreground/80">Tomar foto o subir archivo</span>
                  <span className="text-[10px] text-muted-foreground mt-1">Cámara de celular o archivo de imagen</span>
                </Label>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Agregar productos ────────────────────────────── */}
      <Card className="shadow-xl shadow-black/5 bg-gradient-to-br from-card to-muted/20 border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-black tracking-tight uppercase text-muted-foreground opacity-80">Productos en la Nota</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU o nombre del producto..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-11 rounded-xl"
              disabled={!draft.bodega_origen_id || todoBloqueado || soloEditaDestino}
            />
            {!draft.bodega_origen_id && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-600 uppercase bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                * Selecciona bodega origen primero
              </span>
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Resultados de búsqueda - grid 2 columnas */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-auto border rounded-xl p-2 bg-background shadow-lg">
              {searchResults.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p)}
                  className="flex flex-col gap-1 p-3 rounded-lg border hover:bg-muted text-left transition-colors text-sm"
                >
                  <span className="font-mono text-xs font-bold tracking-wider text-primary">{p.sku_base}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{p.descripcion ?? p.nombre}</span>
                  <span className="text-[10px] text-muted-foreground">{p.pz_en_caja ?? '?'} piezas por caja</span>
                </button>
              ))}
            </div>
          )}

          {/* Formulario para producto seleccionado con stock en tiempo real */}
          {selectedProduct && (
            <div className={cn(
              "border-2 rounded-2xl p-4 bg-muted/40 space-y-4 transition-all duration-300",
              isNegativeStockRisk ? "border-orange-500/50 bg-orange-500/5" : "border-muted"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold py-1">
                    {selectedProduct.sku_base}
                  </Badge>
                  {selectedProduct.nombre && (
                    <span className="text-sm font-semibold">{selectedProduct.nombre}</span>
                  )}
                </div>
                {/* Stock actual en vivo */}
                {selectedProductStock !== null && (
                  <div className="text-xs bg-background border px-3 py-1 rounded-full flex gap-3 shadow-inner font-semibold">
                    <span className="text-muted-foreground">Stock Bodega: <strong className="text-foreground">{selectedProductStock.cajas}</strong> cajas</span>
                    {selectedProductStock.piezas_sueltas > 0 && (
                      <span className="text-muted-foreground">Pzas: <strong className="text-foreground">{selectedProductStock.piezas_sueltas}</strong> sueltas</span>
                    )}
                  </div>
                )}
              </div>

              {/* Flex Row with highlight on Cajas and reduced Loose Pieces */}
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                {/* Cajas (Highlighted / Wider) */}
                <div className="flex-[2.5] min-w-[140px] space-y-1 w-full">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Cajas *</span>
                    {selectedProductStock !== null && (
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded animate-pulse">
                        Stock: {selectedProductStock.cajas} cajas
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={addCajas}
                    onChange={(e) => setAddCajas(e.target.value)}
                    className={cn(
                      "h-11 rounded-xl font-bold font-mono text-center text-xl border-2 ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isNegativeStockRisk 
                        ? "border-orange-500 focus-visible:ring-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20" 
                        : "border-primary/40 focus:border-primary"
                    )}
                  />
                </div>

                {/* Piezas Sueltas (Reduced / Smaller) */}
                <div className="flex-[1] min-w-[90px] space-y-1 w-full">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block truncate" title="Piezas sueltas">
                    Pz sueltas
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={addPiezas}
                    onChange={(e) => setAddPiezas(e.target.value)}
                    className="h-11 rounded-xl font-mono text-center text-sm border bg-background/50 text-muted-foreground focus:text-foreground"
                  />
                </div>

                {/* Caja física selector */}
                <div className="flex-[1.8] min-w-[160px] space-y-1 w-full">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caja física (opcional)</Label>
                  <Select
                    value={addCajaId}
                    onValueChange={(val) => setAddCajaId(val || NO_CAJA_VALUE)}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Sin caja">
                        {addCajaId === NO_CAJA_VALUE
                          ? "Sin caja específica"
                          : (cajasDisponibles.find((c) => String(c.id) === addCajaId)?.codigo_caja ?? addCajaId)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CAJA_VALUE}>Sin caja específica</SelectItem>
                      {cajasDisponibles.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.codigo_caja} {c.nombre_pack ? `(${c.nombre_pack})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botón Agregar */}
                <div className="w-full sm:w-auto shrink-0">
                  <Button
                    type="button"
                    onClick={handleAddProduct}
                    className="h-11 w-full sm:px-6 rounded-xl font-bold uppercase tracking-wider shadow-md hover:scale-102 transition-transform"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Agregar
                  </Button>
                </div>
              </div>

              {/* Proyecciones de stock e informaciones */}
              {selectedProductStock !== null && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="text-xs flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground">Stock Proyectado tras confirmación:</span>
                    <Badge variant={simulatedStock < 0 ? "destructive" : "secondary"} className="font-mono font-black">
                      {simulatedStock} cajas
                    </Badge>
                  </div>
                  {isNegativeStockRisk && (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-tight animate-pulse shrink-0">
                      <AlertCircle className="h-4 w-4" />
                      <span>Riesgo de stock negativo ({simulatedStock} cajas)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tabla de productos en el draft */}
          {draft.productos.length > 0 ? (
            <div className="rounded-2xl border overflow-hidden shadow-inner">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/70 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3 text-left">SKU</th>
                    <th className="px-4 py-3 text-left">Producto</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Caja</th>
                    <th className="px-4 py-3 text-center">Cajas</th>
                    <th className="px-4 py-3 text-center">Piezas</th>
                    <th className="px-4 py-3 text-right">Total est.</th>
                    <th className="px-4 py-3 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.productos.map((p) => {
                    const totalEst = (p.cajas * (p.producto_pz_en_caja ?? 0)) + p.piezas_sueltas
                    const isRowNegative = (tipoSeleccionado?.codigo === 'SAL' || tipoSeleccionado?.codigo === 'TRF') && 
                      p.cajas > (p.stock_origen_cajas ?? 0)

                    return (
                      <tr 
                        key={p.tempId} 
                        className={cn(
                          "border-t transition-colors",
                          isRowNegative 
                            ? "bg-orange-500/5 hover:bg-orange-500/10 border-l-4 border-l-orange-500" 
                            : "hover:bg-muted/30"
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{p.producto_sku}</td>
                        <td className="px-4 py-3 text-xs truncate max-w-[200px]">
                          <p className="font-semibold text-foreground/80">{p.producto_nombre ?? '—'}</p>
                          {isRowNegative && (
                            <span className="text-[9px] font-black uppercase tracking-tighter text-orange-600 block mt-0.5 animate-pulse">
                              ⚠️ Excede stock actual en bodega ({p.stock_origen_cajas} cajas)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {p.caja_codigo ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold tabular-nums">
                          {p.cajas}
                        </td>
                        <td className="px-4 py-3 text-center font-mono tabular-nums">{p.piezas_sueltas}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-base tabular-nums">
                          {totalEst}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-full"
                            onClick={() => handleRemoveProduct(p.tempId)}
                            disabled={todoBloqueado || soloEditaDestino}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40">
                    <td colSpan={3} className="px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {draft.productos.length} producto{draft.productos.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-center font-black font-mono text-lg tabular-nums">
                      {totalCajas}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-background border rounded-2xl">
              <Package className="h-10 w-10 text-muted-foreground opacity-50" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mt-3">Busca y agrega productos a la nota</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Acciones ─────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Link href={ADMIN_ROUTES.inventario.notas}>
          <Button variant="outline" className="rounded-xl h-11 px-5 border">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          {!todoBloqueado && (
            <Button
              variant="outline"
              disabled={isPending || draft.productos.length === 0}
              onClick={() => handleSave(false)}
              className="rounded-xl h-11 px-5"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Borrador
            </Button>
          )}

          {currentUserLevel <= 2 && !puedeConfirmar && draft.bodega_origen_id && (
            <span className="text-xs text-amber-600 font-bold uppercase tracking-tighter">
              * Sin permiso de confirmación en esta bodega
            </span>
          )}

          {currentUserLevel <= 2 && (
            <Button
              disabled={isPending || draft.productos.length === 0 || !puedeConfirmar}
              onClick={() => handleSave(true)}
              variant={puedeConfirmar ? 'default' : 'secondary'}
              className="rounded-xl h-11 px-6 font-bold uppercase tracking-wider shadow-md"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          )}
        </div>
      </div>

        </div>

        {/* Panel lateral de la imagen (OCR) */}
        {ocrProposalId && (
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 lg:h-[calc(100vh-140px)] flex flex-col gap-4">
            <Card className="flex flex-col h-full shadow-xl bg-gradient-to-br from-card to-muted/20 border overflow-hidden">
              <CardHeader className="pb-2 border-b flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                    Nota Original (OCR)
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Propuesta #{ocrProposalId}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleZoomOut}
                    title="Alejar"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleZoomIn}
                    title="Acercar"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleRotate}
                    title="Rotar 90°"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={handleReset}
                    title="Restaurar"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  {comprobantePreview && (
                    <a
                      href={comprobantePreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                      title="Ver original en pestaña nueva"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-2 bg-zinc-950/5 dark:bg-zinc-950/40 relative overflow-hidden flex items-center justify-center min-h-[300px]">
                {comprobantePreview ? (
                  <div className="w-full h-full overflow-auto flex items-center justify-center relative">
                    <div 
                      className="relative w-full h-full min-h-[350px] transition-transform duration-200 ease-out"
                      style={{
                        transform: `scale(${zoomScale}) rotate(${rotateDeg}deg)`,
                        transformOrigin: 'center center',
                      }}
                    >
                      <Image
                        src={comprobantePreview}
                        alt="Nota escaneada"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-6">
                    <ImageIcon className="h-10 w-10 opacity-30 mb-2" />
                    <span className="text-xs">No hay imagen de comprobante</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Diálogo de confirmación ──────────────────────── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-lg">¿Confirmar nota de movimiento?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Esta acción aplicará de forma definitiva los movimientos de inventario en la base de datos.</span>
              {tipoSeleccionado?.afecta_inventario === -1 && (
                <span className="block p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 font-bold uppercase tracking-tight text-[11px] animate-pulse">
                  ⚠️ SE DESCONTARÁ STOCK de la bodega origen: {catalogos.bodegas.find(b => b.id === draft.bodega_origen_id)?.nombre}.
                </span>
              )}
              {tipoSeleccionado?.codigo === 'TRF' && (
                <span className="block p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold uppercase tracking-tight text-[11px]">
                  ↔ SE TRANSFERIRÁ STOCK de origen a destino de manera automática.
                </span>
              )}
              <span className="block text-xs font-semibold text-muted-foreground pt-1">
                {draft.productos.length} producto{draft.productos.length !== 1 ? 's' : ''} · {totalCajas} cajas en borrador.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => doSave(true)} className="rounded-xl font-bold uppercase tracking-wider">
              Confirmar Nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
