// components/admin/inventario/ModalStockInsuficiente.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Boxes, Package, Sparkles, TrendingDown } from 'lucide-react'
import type { FaltanteStock } from '@/modules/inventario/types'
import { cn } from '@/lib/utils'

type ModoAviso = 'confirmar' | 'borrador'

interface ModalStockInsuficienteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Productos que no alcanzan el stock (ya agregados por producto + caja). */
  faltantes: FaltanteStock[]
  /** Nombre de la bodega origen contra la que se validó. */
  bodegaOrigenNombre?: string | null
  /** `confirmar` bloquea la confirmación; `borrador` permite seguir guardando. */
  modo?: ModoAviso
  /** Recorta los renglones al stock disponible (y re-valida). */
  onAjustar?: () => void
  /** Continuar guardando el borrador pese al faltante. */
  onGuardarBorrador?: () => void
  /** Abre el conciliador de sustitutos para un SKU concreto. */
  onVerSustitutos?: (productoId: number, sku: string) => void
  isBusy?: boolean
}

/**
 * Aviso previo a guardar/confirmar: el total de la nota (sumando TODOS los
 * renglones del mismo producto) supera el stock de la bodega origen.
 *
 * Sustituye al error crudo del trigger `fn_procesar_nota_inventario`, que
 * decía "Disponible: 0 cajas" sin mencionar el SKU que falló.
 *
 * Usa `Dialog` (y no `AlertDialog`) porque el ancho del `AlertDialog` base está
 * fijado con la variante `data-[size=default]:max-w-xs`, que no se puede
 * sobreescribir desde el consumidor (AGENTS.md 3.6).
 */
export function ModalStockInsuficiente({
  open,
  onOpenChange,
  faltantes,
  bodegaOrigenNombre,
  modo = 'confirmar',
  onAjustar,
  onGuardarBorrador,
  onVerSustitutos,
  isBusy = false,
}: ModalStockInsuficienteProps) {
  if (!faltantes?.length) return null

  const totalCajasPedidas = faltantes.reduce((s, f) => s + f.solicitado_cajas, 0)
  const totalCajasFaltan = faltantes.reduce((s, f) => s + f.faltan_cajas, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl rounded-2xl bg-card border shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            Stock insuficiente en {faltantes.length} producto{faltantes.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            El total de la nota supera el stock disponible
            {bodegaOrigenNombre ? (
              <>
                {' '}en <strong className="text-foreground">{bodegaOrigenNombre}</strong>
              </>
            ) : (
              ' en la bodega origen'
            )}
            . Se suman todos los renglones del mismo SKU.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              Faltan {totalCajasFaltan} de {totalCajasPedidas} cajas
            </span>
          </div>

          <div className="rounded-xl border border-destructive/20 overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-bold uppercase tracking-wider px-3 py-2">Código</th>
                  <th className="text-center font-bold uppercase tracking-wider px-3 py-2">Renglones</th>
                  <th className="text-right font-bold uppercase tracking-wider px-3 py-2">Necesario</th>
                  <th className="text-right font-bold uppercase tracking-wider px-3 py-2">Disponible</th>
                  <th className="text-right font-bold uppercase tracking-wider px-3 py-2">Falta</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faltantes.map((f) => (
                  <tr key={`${f.producto_id}-${f.caja_id ?? 0}`} className="bg-card">
                    <td className="px-3 py-2">
                      <div className="font-mono font-bold text-foreground">{f.producto_sku}</div>
                      {f.producto_nombre && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                          {f.producto_nombre}
                        </div>
                      )}
                      {f.caja_codigo && (
                        <div className="text-[10px] text-muted-foreground">Caja: {f.caja_codigo}</div>
                      )}
                    </td>
                    <td className="text-center px-3 py-2">
                      {f.renglones > 1 ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
                        >
                          <Boxes className="h-3 w-3" />
                          {f.renglones}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">1</span>
                      )}
                    </td>
                    <td className="text-right px-3 py-2 font-mono font-bold text-foreground">
                      {f.solicitado_cajas}
                    </td>
                    <td className="text-right px-3 py-2 font-mono text-muted-foreground">
                      {f.disponible_cajas}
                    </td>
                    <td className="text-right px-3 py-2 font-mono font-black text-destructive">
                      −{f.faltan_cajas}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {onVerSustitutos && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          onClick={() => onVerSustitutos(f.producto_id, f.producto_sku)}
                        >
                          <Sparkles className="h-3 w-3" />
                          Sustituto
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {faltantes.some((f) => f.renglones > 1) && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Package className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Los códigos con más de un renglón suman todas sus filas: el total es el que se
              descuenta del inventario, por eso el consumo se compara contra la suma y no
              contra cada fila por separado.
            </p>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2">
          {modo === 'borrador' && onGuardarBorrador && (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={() => {
                onGuardarBorrador()
                onOpenChange(false)
              }}
              className="rounded-xl font-bold uppercase text-xs tracking-wider"
            >
              Guardar borrador igual
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold uppercase text-xs tracking-wider"
          >
            Volver a corregir
          </Button>

          {onAjustar && (
            <Button
              type="button"
              disabled={isBusy}
              onClick={onAjustar}
              className={cn(
                'rounded-xl font-bold uppercase text-xs tracking-wider shadow-md',
                'bg-amber-600 hover:bg-amber-700 text-white'
              )}
            >
              Ajustar a disponible
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
