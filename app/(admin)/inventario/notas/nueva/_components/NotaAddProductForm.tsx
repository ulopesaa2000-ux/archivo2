// app/(admin)/inventario/notas/nueva/_components/NotaAddProductForm.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkuQuickSearchInput } from '@/components/admin/SkuQuickSearchInput'
import { NO_CAJA_VALUE } from '../_hooks/use-nota-buscador'
import type { CajaParaSelector, ProductoBusqueda } from '@/modules/inventario/types'
import type { TipoMovimientoRow } from '@/lib/types/tables'

interface NotaAddProductFormProps {
  bodegaOrigenId: number | null
  disabled: boolean
  searchTerm: string
  selectedProduct: ProductoBusqueda | null
  cajasDisponibles: CajaParaSelector[]
  selectedProductStock: { cajas: number; piezas_sueltas: number } | null
  addCajas: string
  onAddCajasChange: (v: string) => void
  addPiezas: string
  onAddPiezasChange: (v: string) => void
  addCajaId: string
  onAddCajaIdChange: (v: string) => void
  esAjuste: boolean
  modoSoloCajas: boolean
  tipoSeleccionado: TipoMovimientoRow | undefined
  onSelectProduct: (p: ProductoBusqueda) => void
  onSearchValueChange: (val: string, matched?: ProductoBusqueda | null) => void
  onClearSearch: () => void
  onAddProduct: () => void
}

export function NotaAddProductForm({
  bodegaOrigenId,
  disabled,
  searchTerm,
  selectedProduct,
  cajasDisponibles,
  selectedProductStock,
  addCajas,
  onAddCajasChange,
  addPiezas,
  onAddPiezasChange,
  addCajaId,
  onAddCajaIdChange,
  esAjuste,
  modoSoloCajas,
  tipoSeleccionado,
  onSelectProduct,
  onSearchValueChange,
  onClearSearch,
  onAddProduct,
}: NotaAddProductFormProps) {
  const cajasNum = parseFloat(addCajas) || 0
  const isNegativeStockRisk =
    selectedProduct &&
    (((tipoSeleccionado?.codigo === 'SAL' || tipoSeleccionado?.codigo === 'TRF') &&
      cajasNum > (selectedProductStock?.cajas ?? 0)) ||
      (esAjuste && cajasNum < 0 && Math.abs(cajasNum) > (selectedProductStock?.cajas ?? 0)))

  const isEntrada =
    tipoSeleccionado?.codigo === 'ENT' ||
    tipoSeleccionado?.codigo === 'DEV' ||
    tipoSeleccionado?.afecta_inventario === 1

  const simulatedStock = selectedProductStock
    ? isEntrada || esAjuste
      ? selectedProductStock.cajas + cajasNum
      : selectedProductStock.cajas - cajasNum
    : 0

  return (
    <>
      <div className="relative">
        <SkuQuickSearchInput
          value={searchTerm}
          placeholder="Buscar por SKU o nombre del producto..."
          disabled={!bodegaOrigenId || disabled}
          inputClassName="h-11 rounded-xl text-sm"
          layout="grid"
          limit={10}
          delay={280}
          onSelectProduct={(p) =>
            onSelectProduct({
              id: p.id,
              sku_base: p.sku_base,
              nombre: p.nombre,
              descripcion: p.descripcion ?? null,
              pz_en_caja: p.pz_en_caja ?? null,
              marca_nombre: null,
              imagen_url: null,
            })
          }
          onValueChange={(val, matched) =>
            onSearchValueChange(
              val,
              matched
                ? {
                    id: matched.id,
                    sku_base: matched.sku_base,
                    nombre: matched.nombre,
                    descripcion: matched.descripcion ?? null,
                    pz_en_caja: matched.pz_en_caja ?? null,
                    marca_nombre: null,
                    imagen_url: null,
                  }
                : null
            )
          }
          onClear={onClearSearch}
        />
        {!bodegaOrigenId && (
          <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-600 uppercase bg-orange-50 border border-orange-200 px-2 py-0.5 rounded pointer-events-none">
            * Selecciona bodega origen primero
          </span>
        )}
      </div>

      {selectedProduct && (
        <div
          className={cn(
            'border-2 rounded-2xl p-4 bg-muted/40 space-y-4 transition-all duration-300',
            isNegativeStockRisk ? 'border-orange-500/50 bg-orange-500/5' : 'border-muted'
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold py-1">
                {selectedProduct.sku_base}
              </Badge>
              {selectedProduct.nombre && <span className="text-sm font-semibold">{selectedProduct.nombre}</span>}
            </div>
            {selectedProductStock !== null && (
              <div className="text-xs bg-background border px-3 py-1 rounded-full flex gap-3 shadow-inner font-semibold">
                <span className="text-muted-foreground">
                  Stock Bodega: <strong className="text-foreground">{selectedProductStock.cajas}</strong> cajas
                </span>
                {selectedProductStock.piezas_sueltas > 0 && (
                  <span className="text-muted-foreground">
                    Pzas: <strong className="text-foreground">{selectedProductStock.piezas_sueltas}</strong> sueltas
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-[2.5] min-w-[160px] space-y-1 w-full">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Cajas *</span>
                  {esAjuste && (
                    <span className="text-[10px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Híbrido (+ / -)
                    </span>
                  )}
                </Label>
                {selectedProductStock !== null && (
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded animate-pulse">
                    Stock: {selectedProductStock.cajas} cajas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {esAjuste && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseFloat(addCajas) || 0
                      onAddCajasChange(String(current === 0 ? -1 : -current))
                    }}
                    className={cn(
                      'h-11 px-2.5 rounded-xl font-mono font-black text-xs border-2 shrink-0 transition-all',
                      cajasNum < 0
                        ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40 hover:bg-red-500/25'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                    )}
                    title={cajasNum < 0 ? 'Cambiar a positivo (+ Sumar stock)' : 'Cambiar a negativo (- Restar stock)'}
                  >
                    {cajasNum < 0 ? '- Restar' : '+ Sumar'}
                  </Button>
                )}
                <Input
                  type="number"
                  step="1"
                  min={esAjuste ? undefined : '0'}
                  value={addCajas}
                  onChange={(e) => onAddCajasChange(e.target.value)}
                  className={cn(
                    'h-11 rounded-xl font-bold font-mono text-center text-xl border-2 ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isNegativeStockRisk
                      ? 'border-orange-500 focus-visible:ring-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/20'
                      : esAjuste && cajasNum < 0
                      ? 'border-red-500/60 text-red-600 bg-red-50/40 dark:bg-red-950/20'
                      : esAjuste && cajasNum > 0
                      ? 'border-emerald-500/60 text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-primary/40 focus:border-primary'
                  )}
                />
              </div>
            </div>

            {!modoSoloCajas && (
              <div className="flex-[1] min-w-[90px] space-y-1 w-full">
                <Label
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block truncate"
                  title="Piezas sueltas"
                >
                  Pz sueltas
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={addPiezas}
                  onChange={(e) => onAddPiezasChange(e.target.value)}
                  className="h-11 rounded-xl font-mono text-center text-sm border bg-background/50 text-muted-foreground focus:text-foreground"
                />
              </div>
            )}

            <div className="flex-[1.8] min-w-[160px] space-y-1 w-full">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Caja física (opcional)
              </Label>
              <Select value={addCajaId} onValueChange={(val) => onAddCajaIdChange(val || NO_CAJA_VALUE)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sin caja">
                    {addCajaId === NO_CAJA_VALUE
                      ? 'Sin caja específica'
                      : cajasDisponibles.find((c) => String(c.id) === addCajaId)?.codigo_caja ?? addCajaId}
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

            <div className="w-full sm:w-auto shrink-0">
              <Button
                type="button"
                onClick={onAddProduct}
                className="h-11 w-full sm:px-6 rounded-xl font-bold uppercase tracking-wider shadow-md hover:scale-102 transition-transform"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Agregar
              </Button>
            </div>
          </div>

          {modoSoloCajas && (
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <span aria-hidden>📦</span> Modo solo cajas activo: las piezas sueltas están bloqueadas (0).
            </p>
          )}

          {selectedProductStock !== null && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="text-xs flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Stock Proyectado tras confirmación:</span>
                <Badge variant={simulatedStock < 0 ? 'destructive' : 'secondary'} className="font-mono font-black">
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
    </>
  )
}
