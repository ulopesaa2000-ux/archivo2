// app/(admin)/inventario/notas/nueva/_components/NotaProductosTable.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { claveStock, type agregarLineasPorClave } from '@/lib/inventario/validacion-stock'
import type { DraftProducto } from '@/modules/inventario/types'

interface NotaProductosTableProps {
  productos: DraftProducto[]
  bodegaOrigenId: number | null
  esAjuste: boolean
  esMovimientoSalidaOTraslado: boolean
  modoSoloCajas: boolean
  permitirStockNegativo: boolean
  todoBloqueado: boolean
  soloEditaDestino: boolean
  copiedDraft: boolean
  showExtraCols: boolean
  onToggleExtraCols: () => void
  mostrarPiezas: boolean
  onToggleMostrarPiezas: () => void
  agregadoPorClave: ReturnType<typeof agregarLineasPorClave>
  hayRenglonesDuplicados: number
  productosConDeficitCount: number
  totalCajas: number
  totalPositivas: number
  totalNegativas: number
  onOpenPasteExcel: () => void
  onCopyDraftExcel: () => void
  onOpenConciliador: () => void
  onConsolidarRenglones: () => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onOpenSustitutos: (prod: DraftProducto) => void
  onOpenSwapSku: (tempId: string) => void
  onToggleSignCajas: (tempId: string) => void
  onUpdateCajas: (tempId: string, val: number) => void
  onUpdatePiezas: (tempId: string, val: number) => void
  onRemoveProduct: (tempId: string) => void
  addProductForm: React.ReactNode
}

export function NotaProductosTable({
  productos,
  bodegaOrigenId,
  esAjuste,
  esMovimientoSalidaOTraslado,
  modoSoloCajas,
  permitirStockNegativo,
  todoBloqueado,
  soloEditaDestino,
  copiedDraft,
  showExtraCols,
  onToggleExtraCols,
  mostrarPiezas,
  onToggleMostrarPiezas,
  agregadoPorClave,
  hayRenglonesDuplicados,
  productosConDeficitCount,
  totalCajas,
  totalPositivas,
  totalNegativas,
  onOpenPasteExcel,
  onCopyDraftExcel,
  onOpenConciliador,
  onConsolidarRenglones,
  onReorder,
  onMoveUp,
  onMoveDown,
  onOpenSustitutos,
  onOpenSwapSku,
  onToggleSignCajas,
  onUpdateCajas,
  onUpdatePiezas,
  onRemoveProduct,
  addProductForm,
}: NotaProductosTableProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const verPiezas = !modoSoloCajas ? showExtraCols : mostrarPiezas
  const disabledEdit = todoBloqueado || soloEditaDestino

  return (
    <Card className="shadow-xl shadow-black/5 bg-gradient-to-br from-card to-muted/20 border">
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-black tracking-tight uppercase text-muted-foreground opacity-80">
            Productos en la Nota
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-xl border border-muted/80 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 shadow-xs transition-colors"
            onClick={onOpenPasteExcel}
            title="Pegar productos desde Excel / Portapapeles (SKU y Cajas)"
            disabled={disabledEdit}
          >
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {productos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border border-muted shadow-sm hover:bg-accent text-foreground"
              onClick={onCopyDraftExcel}
              title="Copiar contenido de la tabla para pegar en Excel o Google Sheets"
            >
              {copiedDraft ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copiar Tabla (Excel)</span>
                </>
              )}
            </Button>
          )}

          {esMovimientoSalidaOTraslado && productos.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary shadow-xs"
              onClick={onOpenConciliador}
              title="Abrir conciliador ampliado de stock para cotejar códigos y reasignar por familias"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>⚡ Conciliador de Stock (Paso 2)</span>
              {productosConDeficitCount > 0 && (
                <Badge variant="destructive" className="ml-0.5 h-4 px-1 text-[10px] font-black">
                  {productosConDeficitCount}
                </Badge>
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 rounded-xl border border-muted"
            onClick={onToggleExtraCols}
          >
            {showExtraCols ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>{modoSoloCajas ? 'Ocultar Caja' : 'Ocultar Caja / Piezas'}</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>{modoSoloCajas ? 'Mostrar Caja' : 'Mostrar Caja / Piezas'}</span>
              </>
            )}
          </Button>

          {modoSoloCajas && (
            <Button
              type="button"
              variant={mostrarPiezas ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleMostrarPiezas}
              aria-pressed={mostrarPiezas}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl border shadow-xs"
              title={mostrarPiezas ? 'Ocultar columna de piezas sueltas' : 'Mostrar columna de piezas sueltas'}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Pz</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {addProductForm}

        {productosConDeficitCount > 0 && (
          <div
            className={cn(
              'p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300',
              !permitirStockNegativo
                ? 'bg-destructive/10 border-destructive/30 text-destructive dark:text-red-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            )}
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold">
                  {!permitirStockNegativo
                    ? `⚠️ ${productosConDeficitCount} producto(s) en rojo sin existencias suficientes en bodega origen`
                    : `⚠️ ${productosConDeficitCount} producto(s) en ámbar generarán saldo negativo en bodega origen`}
                </p>
                <p className="opacity-90">
                  {!permitirStockNegativo
                    ? 'La política del sistema prohíbe inventario negativo. Usa el Conciliador de Stock (Paso 2) para reasignar automáticamente a modelos de la misma familia.'
                    : 'La política permite stock negativo. Puedes continuar guardando o conciliar salidas vs existencias reales por familias.'}
                </p>
              </div>
            </div>

            {esMovimientoSalidaOTraslado && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenConciliador}
                className="h-8 text-xs font-bold gap-1.5 bg-background hover:bg-muted border shadow-xs rounded-xl shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                ⚡ Abrir Conciliador de Stock (Paso 2)
              </Button>
            )}
          </div>
        )}

        {hayRenglonesDuplicados > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
              <strong>{hayRenglonesDuplicados}</strong> código(s) aparecen en varios renglones. El inventario descuenta la{' '}
              <strong>suma</strong> de todos sus renglones.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onConsolidarRenglones}
              className="h-8 shrink-0 gap-1.5 rounded-xl text-xs font-bold"
            >
              <Layers className="h-3.5 w-3.5" />
              Consolidar renglones
            </Button>
          </div>
        )}

        {productos.length > 0 ? (
          <div className="rounded-2xl border overflow-x-auto shadow-inner">
            <table className="w-full text-sm min-w-[580px] sm:min-w-full">
              <thead>
                <tr className="bg-muted/70 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <th className="px-2 py-3 w-[60px] text-center" title="Arrastrar o usar flechas para reordenar">
                    Orden
                  </th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  {showExtraCols && <th className="px-4 py-3 text-left hidden sm:table-cell">Caja</th>}
                  <th className="px-4 py-3 text-center min-w-[140px]">Cajas</th>
                  {verPiezas && <th className="px-4 py-3 text-center">Piezas</th>}
                  <th className="px-4 py-3 text-right">Total est.</th>
                  <th className="px-4 py-3 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, index) => {
                  const totalEst = p.cajas * (p.producto_pz_en_caja ?? 0) + p.piezas_sueltas
                  const agregado = agregadoPorClave.get(claveStock(p.producto_id, p.caja_id))
                  const cajasAgregadas = agregado?.cajas ?? p.cajas
                  const renglonesSKU = agregado?.renglones ?? 1
                  const isRowNegative =
                    bodegaOrigenId !== null &&
                    ((esMovimientoSalidaOTraslado && cajasAgregadas > (p.stock_origen_cajas ?? 0)) ||
                      (esAjuste && cajasAgregadas < 0 && Math.abs(cajasAgregadas) > (p.stock_origen_cajas ?? 0)))

                  return (
                    <tr
                      key={p.tempId}
                      draggable={!disabledEdit}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(index))
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggedIndex(index)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        if (dragOverIndex !== index) setDragOverIndex(index)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
                        if (!isNaN(sourceIndex) && sourceIndex !== targetIndexSafe(index)) {
                          onReorder(sourceIndex, index)
                        }
                        setDraggedIndex(null)
                        setDragOverIndex(null)
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null)
                        setDragOverIndex(null)
                      }}
                      className={cn(
                        'border-t transition-all cursor-default',
                        draggedIndex === index ? 'opacity-30 bg-primary/10' : '',
                        dragOverIndex === index ? 'border-t-2 border-t-primary bg-primary/10' : '',
                        isRowNegative
                          ? !permitirStockNegativo
                            ? 'bg-destructive/10 hover:bg-destructive/15 border-l-4 border-l-destructive'
                            : 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500'
                          : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="px-2 py-3 text-center select-none">
                        <div className="flex items-center justify-center gap-0.5">
                          <span
                            className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors"
                            title="Mantener presionado y arrastrar para reordenar"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                          <div className="flex flex-col -space-y-0.5">
                            <button
                              type="button"
                              disabled={index === 0 || disabledEdit}
                              onClick={() => onMoveUp(index)}
                              className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                              title="Mover arriba"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === productos.length - 1 || disabledEdit}
                              onClick={() => onMoveDown(index)}
                              className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                              title="Mover abajo"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              isRowNegative &&
                                (!permitirStockNegativo
                                  ? 'text-destructive font-black'
                                  : 'text-amber-700 dark:text-amber-300 font-black')
                            )}
                          >
                            {p.producto_sku}
                          </span>
                          {!disabledEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenSustitutos(p)}
                                className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all shadow-2xs shrink-0',
                                  isRowNegative
                                    ? !permitirStockNegativo
                                      ? 'bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground animate-pulse'
                                      : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-black'
                                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                                )}
                                title="Buscar sustitutos de la misma familia con stock en bodega origen"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span className="hidden sm:inline">Sustituir</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenSwapSku(p.tempId)}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                                title="Buscar manualmente otro SKU"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {p.codigo_original && p.codigo_original !== p.producto_sku && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                              🏷️ Físico: <strong>{p.codigo_original}</strong>
                            </span>
                          </div>
                        )}

                        {renglonesSKU > 1 && (
                          <div className="mt-1">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 border',
                                isRowNegative
                                  ? 'bg-destructive/15 text-destructive border-destructive/30'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              )}
                            >
                              <Boxes className="h-3 w-3" />
                              {renglonesSKU} renglones · {cajasAgregadas} cajas en total
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs truncate max-w-[200px]">
                        <p className="font-semibold text-foreground/80">{p.producto_nombre ?? '—'}</p>
                        {isRowNegative && (
                          <span
                            className={cn(
                              'text-[9px] font-black uppercase tracking-tight block mt-0.5',
                              !permitirStockNegativo ? 'text-destructive animate-pulse' : 'text-amber-700 dark:text-amber-400'
                            )}
                          >
                            {!permitirStockNegativo
                              ? `❌ Sin stock suficiente (${p.stock_origen_cajas ?? 0} cajas disp.)`
                              : `⚠️ Saldo negativo proyectado (${p.stock_origen_cajas ?? 0} cajas disp.)`}
                          </span>
                        )}
                      </td>

                      {showExtraCols && (
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {p.caja_codigo ?? '—'}
                        </td>
                      )}

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {esAjuste && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onToggleSignCajas(p.tempId)}
                              disabled={disabledEdit}
                              className={cn(
                                'h-7 px-1.5 text-[11px] font-black rounded-lg border transition-all shrink-0 font-mono',
                                p.cajas >= 0
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/25'
                              )}
                              title={p.cajas >= 0 ? 'Cambiar a Salida (-) / Restar stock' : 'Cambiar a Entrada (+) / Sumar stock'}
                            >
                              {p.cajas >= 0 ? '+Ent' : '-Sal'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-lg border hover:bg-muted shrink-0"
                            onClick={() => onUpdateCajas(p.tempId, p.cajas - 1)}
                            disabled={disabledEdit || (!esAjuste && p.cajas <= 0)}
                            title="Restar 1 caja"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={esAjuste ? undefined : '0'}
                            value={p.cajas === 0 ? '' : p.cajas}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = e.target.value
                              if (raw === '' || raw === '-') {
                                onUpdateCajas(p.tempId, 0)
                              } else {
                                const val = parseFloat(raw)
                                if (!isNaN(val)) onUpdateCajas(p.tempId, val)
                              }
                            }}
                            className={cn(
                              'h-7 w-16 text-center font-mono font-bold text-xs px-1 rounded-lg border tabular-nums',
                              esAjuste &&
                                (p.cajas < 0
                                  ? 'text-red-600 font-black bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                                  : p.cajas > 0
                                  ? 'text-emerald-600 font-black bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                                  : '')
                            )}
                            disabled={disabledEdit}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-lg border hover:bg-muted shrink-0"
                            onClick={() => onUpdateCajas(p.tempId, p.cajas + 1)}
                            disabled={disabledEdit}
                            title="Sumar 1 caja"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>

                      {verPiezas && (
                        <td className="px-4 py-3 text-center">
                          {modoSoloCajas ? (
                            <span
                              className="font-mono text-xs tabular-nums text-muted-foreground"
                              title="Piezas bloqueadas por modo solo cajas (0)"
                            >
                              {p.piezas_sueltas}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              value={p.piezas_sueltas === 0 ? '' : p.piezas_sueltas}
                              placeholder="0"
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10)
                                onUpdatePiezas(p.tempId, isNaN(val) ? 0 : Math.max(0, val))
                              }}
                              className="h-7 w-14 text-center font-mono text-xs px-1 rounded-lg border tabular-nums mx-auto"
                              disabled={disabledEdit}
                            />
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right font-mono font-bold text-base tabular-nums">{totalEst}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-full"
                          onClick={() => onRemoveProduct(p.tempId)}
                          disabled={disabledEdit}
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
                    {productos.length} producto{productos.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-center font-black font-mono text-base tabular-nums">
                    {esAjuste ? (
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'text-lg',
                            totalCajas > 0 ? 'text-emerald-600' : totalCajas < 0 ? 'text-red-600' : 'text-foreground'
                          )}
                        >
                          {totalCajas > 0 ? `+${totalCajas}` : totalCajas}
                        </span>
                        {(totalPositivas > 0 || totalNegativas < 0) && (
                          <span className="text-[10px] font-bold text-muted-foreground">
                            (+{totalPositivas} / {totalNegativas})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-lg">{totalCajas}</span>
                    )}
                  </td>
                  <td colSpan={2 + (showExtraCols ? 1 : 0) + (verPiezas ? 1 : 0)}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-background border rounded-2xl">
            <Package className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mt-3">
              Busca y agrega productos a la nota
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function targetIndexSafe(idx: number) {
  return idx
}
