// app/(admin)/inventario/notas/nueva/_components/NotaOcrMismatchBanner.tsx
'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatForDateInput } from '@/lib/utils'
import type { TipoMovimientoRow, BodegaRow } from '@/lib/types/tables'

interface NotaOcrMismatchBannerProps {
  visible: boolean
  hasTipoMismatch: boolean
  hasOriginMismatch: boolean
  hasDestinoMismatch: boolean
  hasFechaMismatch: boolean
  hasFolioMismatch: boolean
  detectedTipoObj: TipoMovimientoRow | null | undefined
  detectedOrigenRaw: string
  detectedBodega: BodegaRow | null | undefined
  detectedDestinoRaw: string
  detectedDestinoBodega: BodegaRow | null | undefined
  detectedFechaRaw: string
  detectedFolioRaw: string
  tipoSeleccionadoNombre: string | undefined
  currentBodegaNombre: string | undefined
  currentDestinoNombre: string | undefined
  draftFechaNota: string
  draftNotaReferencia: string
  canApplyOrigen: boolean
  onDismiss: () => void
  onApplyAll: () => void
  onApplyTipo: () => void
  onApplyOrigen: () => void
  onApplyDestino: () => void
  onApplyFecha: () => void
  onApplyFolio: () => void
}

export function NotaOcrMismatchBanner({
  visible,
  hasTipoMismatch,
  hasOriginMismatch,
  hasDestinoMismatch,
  hasFechaMismatch,
  hasFolioMismatch,
  detectedTipoObj,
  detectedOrigenRaw,
  detectedBodega,
  detectedDestinoRaw,
  detectedDestinoBodega,
  detectedFechaRaw,
  detectedFolioRaw,
  tipoSeleccionadoNombre,
  currentBodegaNombre,
  currentDestinoNombre,
  draftFechaNota,
  draftNotaReferencia,
  canApplyOrigen,
  onDismiss,
  onApplyAll,
  onApplyTipo,
  onApplyOrigen,
  onApplyDestino,
  onApplyFecha,
  onApplyFolio,
}: NotaOcrMismatchBannerProps) {
  if (!visible) return null

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-muted/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase tracking-wider text-foreground">
                Comparación de Encabezado: Seleccionado vs Detectado en Nota Física
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30"
              >
                OCR / Escáner
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se detectaron diferencias entre los valores seleccionados y los escritos en el documento físico. Puedes aplicar los datos individuales o sincronizar todos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDismiss}
            className="h-8 rounded-xl text-xs font-semibold"
          >
            Mantener Selección
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onApplyAll}
            className="h-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs gap-1.5 shadow-md shadow-orange-500/20 border-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-white" />
            <span>Aplicar Todo lo Detectado</span>
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-background/80 overflow-hidden divide-y text-xs">
        {hasTipoMismatch && detectedTipoObj && (
          <div className="flex items-center justify-between p-2.5 gap-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Tipo Movimiento</span>
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono">
                Seleccionado: <strong>{tipoSeleccionadoNombre || 'Sin tipo'}</strong>
              </span>
              <span className="text-muted-foreground">➔</span>
              <Badge className="bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30 font-bold text-[11px]">
                Papel: {detectedTipoObj.nombre} ({detectedTipoObj.codigo})
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onApplyTipo}
              className="h-7 text-xs font-bold gap-1 text-sky-700 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg"
            >
              <Sparkles className="h-3 w-3" />
              <span>Aplicar Tipo</span>
            </Button>
          </div>
        )}

        {hasOriginMismatch && (
          <div className="flex items-center justify-between p-2.5 gap-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Bodega Origen</span>
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono">
                Seleccionada: <strong>{currentBodegaNombre || 'Sin bodega'}</strong>
              </span>
              <span className="text-muted-foreground">➔</span>
              <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold text-[11px]">
                Papel: &quot;{detectedOrigenRaw}&quot; {detectedBodega ? `(${detectedBodega.nombre})` : ''}
              </Badge>
            </div>
            {canApplyOrigen && detectedBodega ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onApplyOrigen}
                className="h-7 text-xs font-bold gap-1 text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg"
              >
                <Sparkles className="h-3 w-3" />
                <span>Aplicar Origen</span>
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground italic">No asignada o no identificada</span>
            )}
          </div>
        )}

        {hasDestinoMismatch && detectedDestinoBodega && (
          <div className="flex items-center justify-between p-2.5 gap-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Bodega Destino</span>
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono">
                Seleccionada: <strong>{currentDestinoNombre || 'Sin destino'}</strong>
              </span>
              <span className="text-muted-foreground">➔</span>
              <Badge className="bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 font-bold text-[11px]">
                Papel: &quot;{detectedDestinoRaw}&quot; ({detectedDestinoBodega.nombre})
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onApplyDestino}
              className="h-7 text-xs font-bold gap-1 text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg"
            >
              <Sparkles className="h-3 w-3" />
              <span>Aplicar Destino</span>
            </Button>
          </div>
        )}

        {hasFechaMismatch && (
          <div className="flex items-center justify-between p-2.5 gap-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Fecha del Movimiento</span>
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono">
                En Borrador: <strong>{draftFechaNota}</strong>
              </span>
              <span className="text-muted-foreground">➔</span>
              <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-bold text-[11px]">
                Papel: {formatForDateInput(detectedFechaRaw)}
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onApplyFecha}
              className="h-7 text-xs font-bold gap-1 text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg"
            >
              <Sparkles className="h-3 w-3" />
              <span>Aplicar Fecha</span>
            </Button>
          </div>
        )}

        {hasFolioMismatch && (
          <div className="flex items-center justify-between p-2.5 gap-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 min-w-[140px]">
              <span className="font-bold text-muted-foreground uppercase text-[10px]">Folio / Referencia</span>
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-mono">
                En Borrador: <strong>{draftNotaReferencia || '(Vacío)'}</strong>
              </span>
              <span className="text-muted-foreground">➔</span>
              <Badge className="bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 font-bold text-[11px]">
                Papel: {detectedFolioRaw}
              </Badge>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onApplyFolio}
              className="h-7 text-xs font-bold gap-1 text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg"
            >
              <Sparkles className="h-3 w-3" />
              <span>Aplicar Folio</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
