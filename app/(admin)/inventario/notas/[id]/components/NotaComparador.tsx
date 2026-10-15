// app/(admin)/inventario/notas/[id]/components/NotaComparador.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Download, 
  Eye, 
  EyeOff,
  Move
} from 'lucide-react'
import { usePanZoom, useNativeWheel } from '@/hooks/use-pan-zoom'
import Image from 'next/image'

interface NotaComparadorProps {
  comprobanteUrl: string
  onCollapseToggle?: (isCollapsed: boolean) => void
}

export function NotaComparador({ comprobanteUrl, onCollapseToggle }: NotaComparadorProps) {
  // Pan + zoom unificado (mouse y táctil); la rueda siempre hace zoom aquí
  const visor = usePanZoom({ max: 4, wheel: 'always' })
  const visorRef = useRef<HTMLDivElement | null>(null)
  useNativeWheel(visorRef, visor.handleWheel)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Notify parent on collapse toggle
  useEffect(() => {
    if (onCollapseToggle) {
      onCollapseToggle(isCollapsed)
    }
  }, [isCollapsed, onCollapseToggle])

  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 left-4 z-40 lg:sticky lg:top-24 lg:left-0 lg:bottom-0">
        <Button 
          onClick={() => setIsCollapsed(false)}
          className="rounded-full shadow-lg font-bold uppercase tracking-wider gap-2 flex items-center h-12 px-6"
        >
          <Eye className="h-5 w-5" />
          Ver Nota Física
        </Button>
      </div>
    )
  }

  return (
    <Card className="border shadow-xl shadow-black/5 bg-card overflow-hidden flex flex-col h-[40vh] lg:h-[calc(100vh-140px)] z-30">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={visor.zoomIn} title="Acercar" className="h-8 w-8 rounded-lg">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={visor.zoomOut} title="Alejar" className="h-8 w-8 rounded-lg">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={visor.rotate} title="Rotar 90°" className="h-8 w-8 rounded-lg">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={visor.reset} title="Restablecer" className="h-8 w-8 rounded-lg">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer" download>
            <Button variant="ghost" size="icon" title="Descargar original" className="h-8 w-8 rounded-lg">
              <Download className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} title="Ocultar" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Viewer Area */}
      <CardContent
        ref={visorRef}
        onPointerDown={visor.onPointerDown}
        onPointerMove={visor.onPointerMove}
        onPointerUp={visor.onPointerUp}
        onPointerCancel={visor.onPointerCancel}
        onPointerLeave={visor.onPointerUp}
        className="p-0 flex-1 relative bg-black overflow-hidden select-none touch-none flex items-center justify-center"
        style={{ cursor: visor.dragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute transition-transform duration-75 ease-out w-full h-full flex items-center justify-center"
          style={{
            transform: visor.transform,
            transformOrigin: 'center center'
          }}
        >
          <div className="relative w-[90%] h-[90%] pointer-events-none">
            <Image
              src={comprobanteUrl}
              alt="Comprobante Físico de Nota de Inventario"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Drag Hint Overlay */}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-[10px] text-white/80 font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1.5 pointer-events-none shadow-sm">
          <Move className="h-3 w-3" />
          Click + Arrastrar para mover
        </div>
      </CardContent>
    </Card>
  )
}
