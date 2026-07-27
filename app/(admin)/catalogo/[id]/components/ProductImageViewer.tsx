// app/(admin)/catalogo/[id]/components/ProductImageViewer.tsx
'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { ZoomIn, ZoomOut, RotateCcw, Package, Maximize2, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ProductImageViewerProps {
  src: string | null
  alt: string
  sku: string
}

export function ProductImageViewer({ src, alt, sku }: ProductImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Estado de zoom inline (al hacer click en la imagen)
  const [isInlineZoomed, setIsInlineZoomed] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  
  // Estado del modal Lightbox (al hacer click en la lupa)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalScale, setModalScale] = useState(1)

  // Seguimiento de posición del mouse para zoom de lupa dentro del cuadro
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    setMousePos({ x, y })
  }

  const toggleInlineZoom = () => {
    setIsInlineZoomed(prev => !prev)
  }

  const handleZoomIn = () => setModalScale(prev => Math.min(3, prev + 0.5))
  const handleZoomOut = () => setModalScale(prev => Math.max(1, prev - 0.5))
  const handleResetZoom = () => setModalScale(1)

  if (!src) {
    return (
      <div className="relative flex items-center justify-center bg-muted/30 rounded-xl aspect-[3/4] sm:aspect-[4/5] border">
        <Package className="h-16 w-16 text-muted-foreground/30" />
      </div>
    )
  }

  return (
    <>
      {/* ── Recuadro de Imagen con Lupa Inline ───────────────────── */}
      <div
        ref={containerRef}
        onClick={toggleInlineZoom}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsInlineZoomed(false)}
        className={cn(
          'group relative flex items-center justify-center bg-muted/30 rounded-xl aspect-[3/4] sm:aspect-[4/5] overflow-hidden border shadow-sm transition-all duration-200 select-none',
          isInlineZoomed ? 'cursor-zoom-out ring-2 ring-primary/60' : 'cursor-zoom-in hover:shadow-md'
        )}
      >
        {/* Imagen principal */}
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-contain transition-transform duration-150 ease-out"
          style={
            isInlineZoomed
              ? {
                  transform: 'scale(2.4)',
                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                }
              : {
                  transform: 'scale(1)',
                  transformOrigin: 'center',
                }
          }
        />

        {/* Botón flotante transparente LUPA (Abre modal fullscreen) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsModalOpen(true)
          }}
          className="absolute top-3 right-3 z-10 flex items-center justify-center h-9 w-9 rounded-full bg-black/45 text-white backdrop-blur-md opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-md hover:bg-black/70"
          title="Ver en pantalla completa"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="sr-only">Ver en pantalla completa</span>
        </button>

        {/* Badges explicativos en hover */}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none transition-opacity duration-200">
          {isInlineZoomed ? (
            <div className="py-1 px-3 rounded-lg bg-black/70 text-white text-[11px] font-medium backdrop-blur-md text-center flex items-center justify-center gap-1.5 shadow-sm">
              <Move className="h-3 w-3 animate-pulse" /> Mueva el cursor para examinar • Clic para salir
            </div>
          ) : (
            <div className="py-1 px-3 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-center flex items-center justify-center gap-1.5 shadow-sm">
              <ZoomIn className="h-3 w-3" /> Clic en la foto para zoom | Clic en la lupa para pantalla completa
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Lightbox Fullscreen con Zoom Ajustable ────────── */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) setModalScale(1)
      }}>
        <DialogContent className="sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] max-h-[95vh] p-4 flex flex-col bg-black/95 border-none text-white overflow-hidden">
          <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-white/10 pb-3">
            <DialogTitle className="text-sm font-mono font-bold text-white flex items-center gap-2">
              <span>{sku}</span>
              <span className="text-xs text-white/60 font-normal">({alt})</span>
            </DialogTitle>

            {/* Controles de Zoom en Modal */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1 mr-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={modalScale <= 1}
                title="Alejar (-)"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-mono px-2 text-white/80 w-12 text-center select-none">
                {Math.round(modalScale * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={modalScale >= 3}
                title="Acercar (+)"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              {modalScale > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={handleResetZoom}
                  title="Restablecer (100%)"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Área de la Imagen en Modal */}
          <div className="relative w-full h-[78vh] flex items-center justify-center overflow-auto p-2">
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
              style={{ transform: `scale(${modalScale})` }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                priority
                sizes="95vw"
                className="object-contain select-none"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
