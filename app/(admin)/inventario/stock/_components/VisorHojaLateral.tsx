// app/(admin)/inventario/stock/_components/VisorHojaLateral.tsx
'use client'

import type { PointerEvent, RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ImageIcon,
  Maximize2,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

interface VisorHojaLateralProps {
  open: boolean
  hojaNumero?: number
  encabezado?: string
  comprobanteUrl?: string | null
  visorRef: RefObject<HTMLDivElement | null>
  visorTransform: string
  visorDragging: boolean
  onZoomOut: () => void
  onZoomIn: () => void
  onRotate: () => void
  onReset: () => void
  onExpandirModal: (url: string) => void
  onClose: () => void
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void
}

export function VisorHojaLateral({
  open,
  hojaNumero,
  encabezado,
  comprobanteUrl,
  visorRef,
  visorTransform,
  visorDragging,
  onZoomOut,
  onZoomIn,
  onRotate,
  onReset,
  onExpandirModal,
  onClose,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: VisorHojaLateralProps) {
  if (!open) return null

  return (
    <div className="lg:w-[38%] xl:w-[36%] shrink-0 flex flex-col gap-2 border rounded-xl p-2.5 bg-muted/20 min-h-[260px] lg:min-h-0 h-full">
      {/* Header de controles */}
      <div className="flex items-center justify-between gap-1.5 bg-background border rounded-lg px-2 py-1 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
            Hoja {hojaNumero ?? 1}
          </Badge>
          {encabezado && (
            <span className="text-[11px] font-semibold text-muted-foreground truncate max-w-[110px]">
              {encabezado}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onZoomOut} title="Alejar">
            <ZoomOut className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onZoomIn} title="Acercar">
            <ZoomIn className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onRotate} title="Rotar 90°">
            <RotateCw className="size-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={onReset} title="Restaurar">
            <RotateCcw className="size-3.5" />
          </Button>
          {comprobanteUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-blue-600"
              onClick={() => onExpandirModal(comprobanteUrl)}
              title="Abrir visor pantalla completa"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Ocultar panel de foto"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Área de imagen Pan / Zoom */}
      <div className="flex-1 relative border rounded-lg bg-slate-950/90 overflow-hidden flex items-center justify-center min-h-0">
        {comprobanteUrl ? (
          <div
            ref={visorRef}
            className="w-full h-full flex items-center justify-center p-2 select-none overflow-hidden touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerLeave={onPointerUp}
            style={{ cursor: visorDragging ? 'grabbing' : 'grab' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={comprobanteUrl}
              alt={`Foto Hoja ${hojaNumero ?? ''}`}
              draggable={false}
              className="max-w-full max-h-full object-contain rounded select-none shadow-2xl transition-transform duration-75"
              style={{ transform: visorTransform }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <ImageIcon className="size-9 mb-2 opacity-50" />
            <p className="text-xs font-bold">Sin foto adjunta</p>
          </div>
        )}
      </div>
    </div>
  )
}
