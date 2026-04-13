// components/admin/cajas/CajaCard.tsx
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Package, X, Check, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { SharedCajaData } from '@/modules/cajas/types'
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal'

interface CajaCardProps {
  caja: SharedCajaData
  layout?: 'horizontal' | 'vertical'
  onRemove?: (id: number) => void
  onDeactivate?: (id: number) => Promise<void>
  onEdit?: (id: number, data: any) => Promise<void>
  isPending?: boolean
  canEdit?: boolean
}

export function CajaCard({
  caja,
  layout = 'horizontal',
  onRemove,
  onDeactivate,
  onEdit,
  isPending = false,
  canEdit = true
}: CajaCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const isVertical = layout === 'vertical'

  // Si es modo orden, calculamos el total real de piezas
  const totalPiezasCalculado = caja.cantidad_cajas 
    ? (caja.contenidoMap?.totalPiezas || caja.piezas_por_caja || 0) * caja.cantidad_cajas
    : (caja.contenidoMap?.totalPiezas || caja.piezas_por_caja || 0)

  return (
    <Card className={cn("overflow-hidden transition-all border-l-4", isEditing ? "border-l-primary" : "border-l-transparent")}>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span className="font-mono text-primary font-bold">📦 {caja.codigo_caja}</span>
              {caja.nombre_pack && (
                <Badge variant="secondary" className="font-medium">{caja.nombre_pack}</Badge>
              )}
              {caja.producto_sku && (
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">{caja.producto_sku}</Badge>
              )}
            </CardTitle>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canEdit && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  onClick={() => setIsEditing(true)}
                  title="Editar configuración">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(caja.id)}
                    disabled={isPending}
                    title="Eliminar vinculación">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {onDeactivate && !onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeactivateModal(true)}
                    disabled={isPending}
                    title="Desactivar caja (Eliminar)">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </>
            )}
            
            {isEditing && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => setIsEditing(false)}
                  title="Cancelar">
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-primary"
                  onClick={() => setIsEditing(false)} // Placeholder
                  title="Guardar cambios">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-6">
        {/* KPIs Logísticos */}
        <div className={cn(
          "grid gap-6",
          isVertical ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6"
        )}>
          {caja.cantidad_cajas !== undefined && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Cantidad cajas</span>
              <p className="font-black text-xl tabular-nums leading-none">{caja.cantidad_cajas ?? 1}</p>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Pz / caja</span>
            <p className="font-semibold text-foreground text-sm tabular-nums">{caja.piezas_por_caja ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">CBM / caja</span>
            <p className="font-semibold text-foreground text-sm tabular-nums">{caja.cbm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Peso bruto/caja</span>
            <p className="font-semibold text-foreground text-sm tabular-nums">
              {caja.peso_bruto_kg ? `${caja.peso_bruto_kg} kg` : '—'}
            </p>
          </div>
          {caja.costo_total_caja !== undefined && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Costo Caja</span>
              <p className="font-semibold text-foreground text-sm tabular-nums">
                {formatCurrency(caja.costo_total_caja)}
              </p>
            </div>
          )}
          {caja.largo_cm && caja.ancho_cm && caja.alto_cm && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Dimensiones</span>
              <p className="font-semibold text-foreground text-[11px] tabular-nums leading-tight">
                {caja.largo_cm}×{caja.ancho_cm}×{caja.alto_cm} cm
              </p>
            </div>
          )}
          <div className={cn(
            "space-y-1 p-2 rounded-md border",
            isVertical ? "bg-primary/10 border-primary/20 col-span-2" : "bg-primary/5 border-primary/10"
          )}>
            <span className={cn(
              "uppercase font-black tracking-widest block",
              isVertical ? "text-[8px] text-primary" : "text-[9px] text-primary/70"
            )}>Total Pz (est.)</span>
            <p className="font-black text-xl text-primary tabular-nums leading-none">{totalPiezasCalculado}</p>
          </div>
        </div>

        {/* Matriz de contenido (solo si existe y no es vertical extremo si queremos ahorrar espacio) */}
        {caja.contenidoMap ? (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest border-b pb-1">
              Distribución Talla × Color {isVertical ? '' : '(por caja)'}
            </p>
            <div className="overflow-x-auto rounded-lg border bg-background/50">
              <table className="text-[11px] border-collapse w-full">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="border px-3 py-2 text-left font-bold text-muted-foreground uppercase">Color \ Talla</th>
                    {caja.contenidoMap.tallas.map((t) => (
                      <th key={t} className="border px-2 py-2 text-center font-bold text-foreground min-w-[45px]">
                        {t}
                      </th>
                    ))}
                    {!isVertical && <th className="border px-3 py-2 text-center font-black bg-muted/60">Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {caja.contenidoMap.colores.map((color) => {
                    const fila = caja.contenidoMap!.matriz[color] ?? {}
                    const totalFila = Object.values(fila).reduce((a, b) => a + b, 0)
                    return (
                      <tr key={color} className="hover:bg-muted/30 transition-colors">
                        <td className="border px-3 py-2 font-bold text-foreground/80">{color}</td>
                        {caja.contenidoMap!.tallas.map((t) => (
                          <td key={t} className={cn("border px-2 py-2 text-center tabular-nums font-medium", (fila[t] ?? 0) === 0 ? "text-muted-foreground/30" : "text-foreground")}>
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
                    {caja.contenidoMap.tallas.map((t) => {
                      const totalCol = caja.contenidoMap!.colores.reduce(
                        (sum, col) => sum + (caja.contenidoMap!.matriz[col]?.[t] ?? 0), 0
                      )
                      return (
                        <td key={t} className="border px-2 py-2 text-center font-black tabular-nums text-primary/80">
                          {totalCol}
                        </td>
                      )
                    })}
                    {!isVertical && (
                      <td className="border px-3 py-2 text-center font-black tabular-nums bg-primary text-primary-foreground">
                        {caja.contenidoMap.totalPiezas}
                      </td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          /* Fallback simple */
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest border-b pb-1">
              Distribución Talla / Color
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">Tallas</span>
                <div className="flex flex-wrap gap-1">
                  {caja.tallas ? caja.tallas.split(/[|]|,/).map((t) => t.trim()).filter(Boolean).map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] py-0 h-5">{t}</Badge>
                  )) : <span className="text-xs text-muted-foreground italic">No definidas</span>}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight block">Colores</span>
                <div className="flex flex-wrap gap-1">
                  {caja.colores ? caja.colores.split(/[|]|,/).map((cl) => cl.trim()).filter(Boolean).map((cl, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] py-0 h-5 font-normal">{cl}</Badge>
                  )) : <span className="text-xs text-muted-foreground italic">No definidos</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmDeleteModal 
        isOpen={showDeactivateModal}
        onOpenChange={setShowDeactivateModal}
        title="¿Desactivar caja?"
        elementName={`Caja: ${caja.codigo_caja} ${caja.nombre_pack ? `(${caja.nombre_pack})` : ''}`}
        onConfirm={async () => {
          if (onDeactivate) {
            await onDeactivate(caja.id)
          }
        }}
      />
    </Card>
  )
}
