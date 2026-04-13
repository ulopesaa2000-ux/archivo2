// app/(admin)/inventario/notas/nueva/NoteDraftBuilder.tsx
'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Package, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import {
  ADMIN_ROUTES, TIPO_MOVIMIENTO_ICONS, TIPO_MOVIMIENTO_COLORS,
} from '@/lib/constants'
import { guardarNotaAction, actualizarNotaAction } from '@/modules/inventario/actions'
import type {
  CatalogosInventario, DraftNota, DraftProducto,
  ProductoBusqueda, CajaParaSelector, NotaCompleta,
} from '@/modules/inventario/types'

type Props = {
  catalogos: CatalogosInventario
  usuarioId: number
  mode: 'create' | 'edit'
  notaId?: number
  initialData?: NotaCompleta
}

export function NoteDraftBuilder({
  catalogos, usuarioId, mode, notaId, initialData,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
        })),
      }
    }
    return {
      tipo_movimiento_id: null,
      bodega_origen_id: null,
      bodega_destino_id: null,
      nota_referencia: '',
      observaciones: '',
      productos: [],
    }
  })

  // ── Búsqueda de productos ───────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoBusqueda[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductoBusqueda | null>(null)
  const [cajasDisponibles, setCajasDisponibles] = useState<CajaParaSelector[]>([])

  // Formulario de agregar producto
  const [addCajas, setAddCajas] = useState<string>('1')
  const [addPiezas, setAddPiezas] = useState<string>('0')
  const [addCajaId, setAddCajaId] = useState<string>('')

  // Confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // ── Tipo seleccionado ───────────────────────────────────
  const tipoSeleccionado = catalogos.tiposMovimiento.find(
    (t) => t.id === draft.tipo_movimiento_id
  )

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
    setAddCajaId('')

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

    const cajaSeleccionada = addCajaId
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
    }

    setDraft((prev) => ({
      ...prev,
      productos: [...prev.productos, newProduct],
    }))

    // Limpiar
    setSelectedProduct(null)
    setSearchTerm('')
    setCajasDisponibles([])
    setAddCajas('1')
    setAddPiezas('0')
    setAddCajaId('')
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
        result = await guardarNotaAction(draft, confirmar)
      }

      if (!result.success) {
        setError(result.error ?? 'Error desconocido.')
        return
      }

      const destId = result.nota_id ?? notaId
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

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Configuración de la nota ────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tipo Movimiento */}
            <div className="space-y-2">
              <Label>Tipo de Movimiento *</Label>
              <Select
                value={draft.tipo_movimiento_id?.toString() ?? undefined}
                onValueChange={(v) => {
                  if (!v) return
                  const id = parseInt(v)
                  setDraft((prev) => ({
                    ...prev,
                    tipo_movimiento_id: id,
                    bodega_destino_id: null,
                  }))
                }}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogos.tiposMovimiento.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span className="mr-1">
                        {TIPO_MOVIMIENTO_ICONS[t.codigo] ?? ''}
                      </span>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bodega Origen */}
            <div className="space-y-2">
              <Label>Bodega Origen *</Label>
              <Select
                value={draft.bodega_origen_id?.toString() ?? undefined}
                onValueChange={(v) =>
                  v && setDraft((prev) => ({ ...prev, bodega_origen_id: parseInt(v) }))
                }
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogos.bodegas.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.nombre}
                      {b.es_virtual && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">Virtual</Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bodega Destino (condicional) */}
            {tipoSeleccionado?.requiere_destino && (
              <div className="space-y-2">
                <Label>Bodega Destino *</Label>
                <Select
                  value={draft.bodega_destino_id?.toString() ?? undefined}
                  onValueChange={(v) =>
                    v && setDraft((prev) => ({ ...prev, bodega_destino_id: parseInt(v) }))
                  }
                  disabled={mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogos.bodegas
                      .filter((b) => b.id !== draft.bodega_origen_id)
                      .map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Referencia */}
            <div className="space-y-2">
              <Label>Referencia (opcional)</Label>
              <Input
                value={draft.nota_referencia}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, nota_referencia: e.target.value }))
                }
                placeholder="Ej: OC-2026-043"
                maxLength={50}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones (opcional)</Label>
            <Textarea
              value={draft.observaciones}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, observaciones: e.target.value }))
              }
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Agregar productos ────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU o nombre del producto..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Resultados de búsqueda (grid 2×5) */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-auto border rounded-lg p-2">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProduct(p)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                >
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt="" className="object-contain w-full h-full" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs font-medium truncate">{p.sku_base}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.marca_nombre ?? ''} · {p.pz_en_caja ?? '?'} pz/caja
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Formulario para producto seleccionado */}
          {selectedProduct && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedProduct.sku_base}
                </Badge>
                <span className="text-sm">{selectedProduct.nombre}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cajas *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={addCajas}
                    onChange={(e) => setAddCajas(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Piezas sueltas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={addPiezas}
                    onChange={(e) => setAddPiezas(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Caja física (opcional)</Label>
                  <Select
                    value={addCajaId || undefined}
                    onValueChange={(val) => setAddCajaId(val || '')}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sin caja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin caja específica</SelectItem>
                      {cajasDisponibles.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.codigo_caja} {c.nombre_pack ? `(${c.nombre_pack})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddProduct}
                    className="h-9 w-full"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de productos en el draft */}
          {draft.productos.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-2 text-left">SKU</th>
                    <th className="px-4 py-2 text-left">Producto</th>
                    <th className="px-4 py-2 text-left hidden sm:table-cell">Caja</th>
                    <th className="px-4 py-2 text-center">Cajas</th>
                    <th className="px-4 py-2 text-center">Piezas</th>
                    <th className="px-4 py-2 text-right">Total est.</th>
                    <th className="px-4 py-2 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.productos.map((p) => {
                    const totalEst = (p.cajas * (p.producto_pz_en_caja ?? 0)) + p.piezas_sueltas
                    return (
                      <tr key={p.tempId} className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">{p.producto_sku}</td>
                        <td className="px-4 py-2 text-xs truncate max-w-[200px]">
                          {p.producto_nombre ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">
                          {p.caja_codigo ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-center tabular-nums">{p.cajas}</td>
                        <td className="px-4 py-2 text-center tabular-nums">{p.piezas_sueltas}</td>
                        <td className="px-4 py-2 text-right tabular-nums font-medium">
                          {totalEst}
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveProduct(p.tempId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={3} className="px-4 py-2 text-xs font-semibold">
                      {draft.productos.length} producto{draft.productos.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-2 text-center font-bold tabular-nums">
                      {totalCajas}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-8 w-8" />
              <p className="text-sm mt-2">Busca y agrega productos a la nota.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Acciones ─────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Link href={ADMIN_ROUTES.inventario.notas}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={isPending || draft.productos.length === 0}
            onClick={() => handleSave(false)}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Borrador
          </Button>

          <Button
            disabled={isPending || draft.productos.length === 0}
            onClick={() => handleSave(true)}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Confirmar
          </Button>
        </div>
      </div>

      {/* ── Diálogo de confirmación ──────────────────────── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción aplicará los movimientos de inventario.
              {tipoSeleccionado?.afecta_inventario === -1 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  ⚠️ Se descontará stock de la bodega origen.
                </span>
              )}
              {tipoSeleccionado?.codigo === 'TRF' && (
                <span className="block mt-2 text-blue-600 font-medium">
                  ↔ Se transferirá stock de origen a destino.
                </span>
              )}
              <span className="block mt-2">
                {draft.productos.length} producto{draft.productos.length !== 1 ? 's' : ''} · {totalCajas} cajas
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => doSave(true)}>
              Confirmar Nota
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
