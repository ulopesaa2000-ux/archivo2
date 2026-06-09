// components/admin/cajas/CajaMatriz.tsx
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash, Sparkles, Info, Package, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ColorCombobox } from './ColorCombobox'
import type { SharedCajaContenidoMap } from '@/modules/cajas/types'
import type { CatalogoItem } from '@/modules/catalogo/types'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type DetalleFila = {
  colorId: number
  colorNombre: string
  cantidades: Record<string, number>
}

type TotalesEdicion = {
  totalPorFila: Record<string, number>
  totalPorColumna: Record<string, number>
  totalGeneral: number
}

interface CajaMatrizProps {
  isEditing: boolean
  isVertical: boolean

  // Datos de la caja (para modo vista)
  contenidoMap?: SharedCajaContenidoMap | null

  // Datos de edición
  editTallas: CatalogoItem[]
  editFilas: DetalleFila[]
  totalesEdicion: TotalesEdicion
  selectedTallaId: string
  selectedColorId: string
  tallasDisponibles: CatalogoItem[]
  coloresDisponibles: CatalogoItem[]
  edadNombre?: string | null

  // Handlers
  onAddTallaMatrix: (tallaId: string) => void
  onAddColorMatrix: (colorId: string | number) => void
  onRemoveTalla: (id: number | string) => void
  onRemoveColor: (colorId: number | string) => void
  onCantidadChange: (colorId: number | string, tallaNombre: string, valor: string) => void
  onAutoRecommendTallas: () => void
  onAutoFillFila: (colorId: number) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════════

export function CajaMatriz({
  isEditing,
  isVertical,
  contenidoMap,
  editTallas,
  editFilas,
  totalesEdicion,
  selectedTallaId,
  selectedColorId,
  tallasDisponibles,
  coloresDisponibles,
  edadNombre,
  onAddTallaMatrix,
  onAddColorMatrix,
  onRemoveTalla,
  onRemoveColor,
  onCantidadChange,
  onAutoRecommendTallas,
  onAutoFillFila,
}: CajaMatrizProps) {
  // Mostrar sección solo si hay datos o estamos en edición
  if (!contenidoMap && !isEditing) {
    // Fallback simple con badges
    return null
  }

  return (
    <div
      className={cn(
        'p-5 rounded-xl border-2 shadow-md space-y-4 mt-6 transition-all',
        isEditing
          ? 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-950/40'
          : 'border-muted-foreground/10 bg-transparent'
      )}
    >
      {/* Header de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            {isEditing
              ? 'Matriz de Distribución Talla × Color'
              : `Distribución Talla × Color ${isVertical ? '' : '(por caja)'}`}
          </p>
          {isEditing && editTallas.length > 1 && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
              <Info className="h-3 w-3 text-blue-500" />
              Rellena la primera talla de un color y usa el botón 🪄 en su fila para replicar la cantidad.
            </p>
          )}
        </div>

        {/* Controles de edición */}
        {isEditing && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                Agregar Talla:
              </Label>
              <Select
                value={selectedTallaId}
                onValueChange={(val) => val && onAddTallaMatrix(val)}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {tallasDisponibles
                    .filter((t) => !editTallas.some((et) => et.id === t.id))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {edadNombre && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAutoRecommendTallas}
                  className="h-8 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/20 hover:bg-primary/5"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Sugerir
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-[9px] uppercase font-bold text-muted-foreground">
                Agregar Color:
              </Label>
              <ColorCombobox
                coloresDisponibles={coloresDisponibles}
                selectedColorId={selectedColorId}
                onSelect={onAddColorMatrix}
                disabledFilas={editFilas.map((f) => f.colorId)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      {isEditing ? (
        /* Modo Edición - Tabla Editable */
        <div className="overflow-x-auto rounded-lg border bg-background/50">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr className="bg-muted/40">
                <th className="border px-3 py-3 text-left font-bold text-muted-foreground uppercase w-48">
                  <span className="text-[10px] tracking-widest">COLOR \ TALLA</span>
                </th>
                {editTallas.map((talla) => (
                  <th
                    key={talla.id}
                    className="border px-2 py-3 text-center font-semibold text-foreground min-w-[80px] relative group"
                  >
                    <span className="text-sm">{talla.nombre}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTalla(talla.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                      title="Eliminar talla"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="border px-3 py-3 text-center font-black bg-muted/60 w-20">
                  <span className="text-[10px] tracking-widest">TOTAL</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {editFilas.map((fila) => (
                <tr key={fila.colorId} className="group hover:bg-muted/20 transition-colors">
                  <td className="border px-3 py-2 font-medium text-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{fila.colorNombre}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onAutoFillFila(fila.colorId)}
                        className="h-6 w-6 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title="Autocompletar fila"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveColor(fila.colorId)}
                      className="w-6 h-6 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title="Eliminar color"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </td>
                  {editTallas.map((talla) => (
                    <td key={talla.id} className="border px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        value={fila.cantidades[talla.nombre] || ''}
                        onChange={(e) =>
                          onCantidadChange(fila.colorId, talla.nombre, e.target.value)
                        }
                        className="w-full h-8 text-center text-sm tabular-nums border-0 bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary p-1"
                      />
                    </td>
                  ))}
                  <td className="border px-3 py-2 text-center font-bold tabular-nums bg-muted/20 text-primary">
                    {totalesEdicion.totalPorFila[fila.colorNombre] || 0}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 border-t-2 border-border">
                <td className="border px-3 py-3 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                  TOTALES
                </td>
                {editTallas.map((talla) => (
                  <td
                    key={talla.id}
                    className="border px-2 py-3 text-center font-bold tabular-nums text-foreground"
                  >
                    {totalesEdicion.totalPorColumna[talla.nombre] || 0}
                  </td>
                ))}
                <td className="border px-3 py-3 text-center font-black tabular-nums bg-primary text-primary-foreground text-lg">
                  {totalesEdicion.totalGeneral}
                </td>
              </tr>
            </tfoot>
          </table>

          {editFilas.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Agrega colores y tallas para configurar la distribución</p>
            </div>
          )}
        </div>
      ) : (
        /* Modo Vista - Tabla de solo lectura */
        <div className="overflow-x-auto rounded-lg border bg-background/50">
          <table className="text-[11px] border-collapse w-full">
            <thead>
              <tr className="bg-muted/40">
                <th className="border px-3 py-2 text-left font-bold text-muted-foreground uppercase">
                  Color \ Talla
                </th>
                {contenidoMap!.tallas.map((t) => (
                  <th
                    key={t}
                    className="border px-2 py-2 text-center font-bold text-foreground min-w-[45px]"
                  >
                    {t}
                  </th>
                ))}
                {!isVertical && (
                  <th className="border px-3 py-2 text-center font-black bg-muted/60">Total</th>
                )}
              </tr>
            </thead>
            <tbody>
              {contenidoMap!.colores.map((color) => {
                const fila = contenidoMap!.matriz[color] ?? {}
                const totalFila = Object.values(fila).reduce((a, b) => a + b, 0)
                return (
                  <tr key={color} className="hover:bg-muted/30 transition-colors">
                    <td className="border px-3 py-2 font-bold text-foreground/80">{color}</td>
                    {contenidoMap!.tallas.map((t) => (
                      <td
                        key={t}
                        className={cn(
                          'border px-2 py-2 text-center tabular-nums font-medium',
                          (fila[t] ?? 0) === 0 ? 'text-muted-foreground/30' : 'text-foreground'
                        )}
                      >
                        {fila[t] ?? 0}
                      </td>
                    ))}
                    {!isVertical && (
                      <td className="border px-3 py-2 text-center font-black tabular-nums bg-muted/30 text-primary/80">
                        {totalFila}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50">
                <td className="border px-3 py-2 font-black uppercase">Total</td>
                {contenidoMap!.tallas.map((t) => {
                  const totalCol = contenidoMap!.colores.reduce(
                    (sum, col) => sum + (contenidoMap!.matriz[col]?.[t] ?? 0),
                    0
                  )
                  return (
                    <td
                      key={t}
                      className="border px-2 py-2 text-center font-black tabular-nums text-primary/80"
                    >
                      {totalCol}
                    </td>
                  )
                })}
                {!isVertical && (
                  <td className="border px-3 py-2 text-center font-black tabular-nums bg-primary text-primary-foreground">
                    {contenidoMap!.totalPiezas}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Fallback cuando no hay contenidoMap ────────────────────────────────────────

export function CajaMatrizFallback({
  tallas,
  colores,
}: {
  tallas?: string | null
  colores?: string | null
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest border-b pb-1">
        Distribución Talla / Color
      </p>
      <div className="flex flex-wrap gap-6 pt-2">
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
            Tallas
          </span>
          <div className="flex flex-wrap gap-1">
            {tallas ? (
              tallas
                .split(/[|]|,/)
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] py-0 h-5">
                    {t}
                  </Badge>
                ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No definidas</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">
            Colores
          </span>
          <div className="flex flex-wrap gap-1">
            {colores ? (
              colores
                .split(/[|]|,/)
                .map((cl) => cl.trim())
                .filter(Boolean)
                .map((cl, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] py-0 h-5 font-normal">
                    {cl}
                  </Badge>
                ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No definidos</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
