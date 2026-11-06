// app/(admin)/inventario/stock/VisorFotoHojaModal.tsx
'use client'

import { useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Download,
  Eye,
  X,
  Move,
} from 'lucide-react'
import { usePanZoom, useNativeWheel } from '@/hooks/use-pan-zoom'

interface VisorFotoHojaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fotoUrl: string | null
  titulo?: string
}

export function VisorFotoHojaModal({
  open,
  onOpenChange,
  fotoUrl,
  titulo = 'Auditoría Visual de Hoja de Libreta',
}: VisorFotoHojaModalProps) {
  // Pan + zoom nativo idéntico al visor de notas físicas del ERP
  const visor = usePanZoom({ min: 0.3, max: 4, step: 0.25, wheel: 'always' })
  const visorRef = useRef<HTMLDivElement | null>(null)
  useNativeWheel(visorRef, visor.handleWheel)

  // Resetear encuadre al abrir una nueva foto
  useEffect(() => {
    if (open) {
      visor.reset()
    }
  }, [open, fotoUrl])

  if (!fotoUrl) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl lg:max-w-6xl w-[95vw] max-h-[92vh] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border shadow-2xl">
        {/* BARRA SUPERIOR CON CONTROLES */}
        <DialogHeader className="p-3 px-4 border-b bg-muted/40 shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-blue-600 dark:text-blue-400" />
            <DialogTitle className="text-sm font-bold truncate">{titulo}</DialogTitle>
            <DialogDescription className="sr-only">
              Visor interactivo con zoom, rotación y ajuste a pantalla completa
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={visor.zoomIn}
              title="Acercar (+)"
              className="size-8 rounded-lg"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={visor.zoomOut}
              title="Alejar (-)"
              className="size-8 rounded-lg"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={visor.rotate}
              title="Rotar 90°"
              className="size-8 rounded-lg"
            >
              <RotateCw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={visor.reset}
              title="Ajustar a pantalla (100%)"
              className="size-8 rounded-lg"
            >
              <Maximize2 className="size-4" />
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <a href={fotoUrl} target="_blank" rel="noopener noreferrer" download>
              <Button
                variant="ghost"
                size="icon"
                title="Descargar imagen original"
                className="size-8 rounded-lg"
              >
                <Download className="size-4" />
              </Button>
            </a>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              title="Cerrar"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* ÁREA DE VISUALIZACIÓN PANTALLA COMPLETA SIN RECORTES */}
        <div
          ref={visorRef}
          onPointerDown={visor.onPointerDown}
          onPointerMove={visor.onPointerMove}
          onPointerUp={visor.onPointerUp}
          onPointerCancel={visor.onPointerCancel}
          onPointerLeave={visor.onPointerUp}
          className="flex-1 relative bg-slate-950 overflow-hidden select-none touch-none flex items-center justify-center p-2"
          style={{ cursor: visor.dragging ? 'grabbing' : 'grab' }}
        >
          {/* Contenedor con la transformación fluida de zoom + pan + rotación */}
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-75 ease-out"
            style={{
              transform: visor.transform,
              transformOrigin: 'center center',
            }}
          >
            {/* 
              object-contain garantiza que la imagen se adapte tanto vertical 
              como horizontalmente sin salirse de los límites ni recortar bordes
            */}
            <img
              src={fotoUrl}
              alt={titulo}
              className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl select-none"
              style={{
                width: 'auto',
                height: 'auto',
              }}
            />
          </div>

          {/* HINT VISUAL PARA ARRASTRAR */}
          <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-[11px] text-white/90 font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5 pointer-events-none shadow-md border border-white/10">
            <Move className="size-3" />
            Click o toque + arrastrar para mover libremente
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

