// app/(admin)/catalogo/[id]/components/ProductImageViewer.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
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
  
  // Estado de zoom inline (al hacer click/tap en la foto)
  const [isInlineZoomed, setIsInlineZoomed] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  
  // Estado del modal Lightbox (al hacer click/tap en la lupa)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalScale, setModalScale] = useState(1)
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 })
  const [isDraggingModal, setIsDraggingModal] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // Actualizar posición del puntero (mouse o touch) en el contenedor inline
  const updatePointerPos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    setMousePos({ x, y })
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updatePointerPos(e.clientX, e.clientY)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      updatePointerPos(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const toggleInlineZoom = () => {
    setIsInlineZoomed(prev => !prev)
  }

  // Controles de zoom en Modal
  const handleZoomIn = () => setModalScale(prev => Math.min(3.5, prev + 0.5))
  const handleZoomOut = () => {
    setModalScale(prev => {
      const next = Math.max(1, prev - 0.5)
      if (next === 1) setModalPan({ x: 0, y: 0 })
      return next
    })
  }

  const handleResetZoom = () => {
    setModalScale(1)
    setModalPan({ x: 0, y: 0 })
  }

  // Arrastre / Drag en Modal cuando modalScale > 1
  const handleModalMouseDown = (e: React.MouseEvent) => {
    if (modalScale <= 1) return
    setIsDraggingModal(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: modalPan.x,
      panY: modalPan.y,
    }
  }

  const handleModalMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingModal || modalScale <= 1) return
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y
    setModalPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    })
  }

  const handleModalMouseUp = () => {
    setIsDraggingModal(false)
  }

  // Touch drag en Modal
  const handleModalTouchStart = (e: React.TouchEvent) => {
    if (modalScale <= 1 || e.touches.length === 0) return
    setIsDraggingModal(true)
    dragStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      panX: modalPan.x,
      panY: modalPan.y,
    }
  }

  const handleModalTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingModal || modalScale <= 1 || e.touches.length === 0) return
    const deltaX = e.touches[0].clientX - dragStartRef.current.x
    const deltaY = e.touches[0].clientY - dragStartRef.current.y
    setModalPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    })
  }

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
        onTouchStart={(e) => {
          if (e.touches.length > 0) updatePointerPos(e.touches[0].clientX, e.touches[0].clientY)
        }}
        onTouchMove={handleTouchMove}
        onMouseLeave={() => setIsInlineZoomed(false)}
        className={cn(
          'group relative flex items-center justify-center bg-muted/30 rounded-xl aspect-[3/4] sm:aspect-[4/5] overflow-hidden border shadow-sm transition-all duration-200 select-none',
          isInlineZoomed ? 'cursor-zoom-out ring-2 ring-primary/60 touch-none' : 'cursor-zoom-in hover:shadow-md'
        )}
      >
        {/* Imagen principal */}
        <Image
          src={src}
          alt={alt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-contain transition-transform duration-150 ease-out pointer-events-none will-change-transform"
          style={
            isInlineZoomed
              ? {
                  transform: 'scale(2.5)',
                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                }
              : {
                  transform: 'scale(1)',
                  transformOrigin: 'center',
                }
          }
        />

        {/* Botón flotante LUPA (Abre modal fullscreen) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsModalOpen(true)
          }}
          className="absolute top-3 right-3 z-10 flex items-center justify-center h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-md opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-lg hover:bg-black/75 active:scale-95"
          title="Ver en pantalla completa"
        >
          <Maximize2 className="h-4.5 w-4.5" />
          <span className="sr-only">Ver en pantalla completa</span>
        </button>

        {/* Indicador de ayuda */}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none transition-opacity duration-200">
          {isInlineZoomed ? (
            <div className="py-1.5 px-3 rounded-lg bg-black/75 text-white text-[11px] font-medium backdrop-blur-md text-center flex items-center justify-center gap-1.5 shadow-sm">
              <Move className="h-3 w-3 animate-pulse text-amber-300" /> Deslice para explorar • Clic para salir
            </div>
          ) : (
            <div className="py-1.5 px-3 rounded-lg bg-black/60 text-white text-[11px] font-medium backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-center flex items-center justify-center gap-1.5 shadow-sm">
              <ZoomIn className="h-3 w-3" /> Clic en la foto para zoom | Clic en la lupa para pantalla completa
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Lightbox Fullscreen con Zoom Ajustable ────────── */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) {
          setModalScale(1)
          setModalPan({ x: 0, y: 0 })
        }
      }}>
        <DialogContent className="sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] max-h-[95vh] h-[92vh] p-3 sm:p-4 flex flex-col bg-black/95 border-none text-white overflow-hidden">
          <DialogHeader className="w-full flex flex-row items-center justify-between border-b border-white/10 pb-3 shrink-0">
            <DialogTitle className="text-sm font-mono font-bold text-white flex items-center gap-2 truncate pr-2">
              <span className="truncate">{sku}</span>
              <span className="text-xs text-white/60 font-normal hidden sm:inline truncate">({alt})</span>
            </DialogTitle>

            {/* Controles de Zoom en Modal */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-lg p-1 mr-6 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={modalScale <= 1}
                title="Alejar (-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono px-2 text-white/80 w-12 text-center select-none">
                {Math.round(modalScale * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={modalScale >= 3.5}
                title="Acercar (+)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              {modalScale > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white hover:bg-white/20"
                  onClick={handleResetZoom}
                  title="Restablecer (100%)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Área de la Imagen en Modal con Soporte para Drag/Pan */}
          <div
            onMouseDown={handleModalMouseDown}
            onMouseMove={handleModalMouseMove}
            onMouseUp={handleModalMouseUp}
            onMouseLeave={handleModalMouseUp}
            onTouchStart={handleModalTouchStart}
            onTouchMove={handleModalTouchMove}
            onTouchEnd={handleModalMouseUp}
            className={cn(
              'relative w-full flex-1 flex items-center justify-center overflow-hidden p-2 select-none touch-none',
              modalScale > 1 ? (isDraggingModal ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
            )}
          >
            <div
              className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
              style={{
                transform: `scale(${modalScale}) translate(${modalPan.x / modalScale}px, ${modalPan.y / modalScale}px)`,
              }}
            >
              <Image
                src={src}
                alt={alt}
                fill
                priority
                sizes="95vw"
                className="object-contain select-none pointer-events-none"
              />
            </div>

            {modalScale > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md pointer-events-none shadow flex items-center gap-1.5">
                <Move className="h-3.5 w-3.5 text-amber-300" /> Arrastre o deslice para mover la imagen
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
