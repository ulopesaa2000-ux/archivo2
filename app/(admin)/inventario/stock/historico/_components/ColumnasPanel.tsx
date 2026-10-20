// app/(admin)/inventario/stock/historico/_components/ColumnasPanel.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Columns3, Lock, RotateCcw } from 'lucide-react'
import {
  COLUMNAS_HISTORICO,
  useColumnasHistorico,
  type ColumnaHistorico,
} from '../_hooks/use-columnas-historico'

type Props = {
  /** Muestra el toggle de agrupación por familia (solo vista agrupada). */
  mostrarAgrupar?: boolean
}

export function ColumnasPanel({ mostrarAgrupar = true }: Props) {
  const { estado, setColumna, setAgrupar, reset, visible } = useColumnasHistorico()

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Columns3 className="h-3.5 w-3.5" />
            Columnas
          </Button>
        }
      />
      <PopoverContent className="w-[260px] p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Columnas visibles
            </p>
            <Button variant="ghost" size="sm" onClick={reset} className="h-6 px-1.5 text-[11px] text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              Defaults
            </Button>
          </div>

          <div className="space-y-1.5">
            {COLUMNAS_HISTORICO.map((col) => (
              <div key={col.key} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.key}`}
                  checked={visible(col.key as ColumnaHistorico)}
                  onCheckedChange={(checked) => setColumna(col.key as ColumnaHistorico, checked === true)}
                />
                <Label htmlFor={`col-${col.key}`} className="text-xs cursor-pointer">
                  {col.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t pt-2">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              Familia y SKU siempre visibles y fijas al hacer scroll.
            </p>
          </div>

          {mostrarAgrupar && (
            <div className="flex items-center gap-2 border-t pt-2">
              <Checkbox
                id="col-agrupar"
                checked={estado.agrupar}
                onCheckedChange={(checked) => setAgrupar(checked === true)}
              />
              <Label htmlFor="col-agrupar" className="text-xs cursor-pointer">
                Agrupar por familia
              </Label>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
