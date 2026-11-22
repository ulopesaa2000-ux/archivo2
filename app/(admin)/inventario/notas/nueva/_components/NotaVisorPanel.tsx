// app/(admin)/inventario/notas/nueva/_components/NotaVisorPanel.tsx
'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { usePanZoom, useNativeWheel } from '@/hooks/use-pan-zoom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowUpRight,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { prefetchCatalogoOcr } from '@/components/admin/ocr-sync/_hooks/ocr-catalogo-cache'

interface NotaVisorPanelProps {
  ocrProposalId?: string
  hasOcrLineas: boolean
  comprobantePreview: string | null
  onOpenOcrSync: () => void
}

export function NotaVisorPanel({
  ocrProposalId,
  hasOcrLineas,
  comprobantePreview,
  onOpenOcrSync,
}: NotaVisorPanelProps) {
  const visor = usePanZoom({ max: 3, wheel: 'ctrl' })
  const visorRef = useRef<HTMLDivElement | null>(null)
  useNativeWheel(visorRef, visor.handleWheel)

  if (!ocrProposalId && !comprobantePreview) return null

  return (
    <Card className="w-full shadow-xl bg-gradient-to-br from-card to-muted/20 border overflow-hidden order-2 lg:order-1 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 lg:self-start lg:z-10 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <CardHeader className="pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
            Nota Original Escaneada (OCR)
          </CardTitle>
          <CardDescription className="text-[10px]">
            {ocrProposalId ? `Propuesta #${ocrProposalId}` : 'Comprobante adjunto'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(ocrProposalId || hasOcrLineas) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenOcrSync}
              onMouseEnter={prefetchCatalogoOcr}
              onFocus={prefetchCatalogoOcr}
              className="h-8 text-xs font-bold gap-1 rounded-lg border shadow-sm text-primary hover:text-primary bg-background"
              title="Editar cadenas de texto escaneadas y re-sincronizar SKUs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Editar / Sincronizar OCR</span>
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={visor.zoomOut} title="Alejar">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={visor.zoomIn} title="Acercar">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={visor.rotate} title="Rotar 90°">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={visor.reset} title="Restaurar">
            <RotateCcw className="h-4 w-4" />
          </Button>
          {comprobantePreview && (
            <a
              href={comprobantePreview}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              title="Ver original en pestaña nueva"
            >
              <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent
        ref={visorRef}
        onPointerDown={visor.onPointerDown}
        onPointerMove={visor.onPointerMove}
        onPointerUp={visor.onPointerUp}
        onPointerCancel={visor.onPointerCancel}
        onPointerLeave={visor.onPointerUp}
        className="p-2 bg-zinc-950/5 dark:bg-zinc-950/40 relative overflow-hidden flex items-center justify-center min-h-[250px] max-h-[480px] touch-none select-none"
        style={{ cursor: visor.dragging ? 'grabbing' : 'grab' }}
      >
        {comprobantePreview ? (
          <div className="w-full h-full overflow-auto flex items-center justify-center relative min-h-[250px] max-h-[450px]">
            <div
              className="relative w-full h-[400px] transition-transform duration-75 ease-out"
              style={{
                transform: visor.transform,
                transformOrigin: 'center center',
              }}
            >
              <Image
                src={comprobantePreview}
                alt="Nota escaneada"
                fill
                className="object-contain"
                unoptimized
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-6">
            <ImageIcon className="h-10 w-10 opacity-30 mb-2" />
            <span className="text-xs">No hay imagen de comprobante</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
