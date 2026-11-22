// components/admin/ocr-sync/_components/OcrVisorBuscadorPanel.tsx
'use client'

import type { RefObject, PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, X, Loader2, ZoomOut, ZoomIn, RotateCw, RotateCcw, ArrowUpRight, ImageIcon,
} from 'lucide-react'
import type { ProductoBusqueda } from '@/modules/inventario/types'

interface OcrVisorBuscadorPanelProps {
  selectedIndex: number | null
  searchInputRef: RefObject<HTMLInputElement | null>
  searchTerm: string
  searchResults: ProductoBusqueda[]
  isSearching: boolean
  isCatalogoReady: boolean
  comprobanteUrl?: string | null
  visorRef: RefObject<HTMLDivElement | null>
  visorTransform: string
  visorDragging: boolean
  onSearchChange: (value: string) => void
  onSelectSearchResult: (prod: ProductoBusqueda) => void
  onZoomOut: () => void
  onZoomIn: () => void
  onRotate: () => void
  onResetVisor: () => void
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (e: PointerEvent<HTMLDivElement>) => void
}

export function OcrVisorBuscadorPanel({
  selectedIndex,
  searchInputRef,
  searchTerm,
  searchResults,
  isSearching,
  isCatalogoReady,
  comprobanteUrl,
  visorRef,
  visorTransform,
  visorDragging,
  onSearchChange,
  onSelectSearchResult,
  onZoomOut,
  onZoomIn,
  onRotate,
  onResetVisor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: OcrVisorBuscadorPanelProps) {
  return (
    <div className="lg:col-span-4 flex flex-col gap-2 overflow-hidden border rounded-xl p-3 bg-muted/20 relative">
      {/* Buscador Rápido Inteligente */}
      <div className="relative z-30 space-y-1.5 bg-background/95 backdrop-blur-sm p-2.5 rounded-xl border shadow-sm shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Search className="h-3.5 w-3.5 text-primary" />
            Buscador Rápido de Catálogo
            {isCatalogoReady && (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                (0ms)
              </span>
            )}
          </span>
          {selectedIndex !== null && (
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30">
              Reemplazando #{selectedIndex + 1}
            </Badge>
          )}
        </div>

        <div className="relative">
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por SKU, serie (ej. J219/) o descripción..."
            className="h-9 pl-8 pr-14 text-xs font-mono font-bold rounded-xl bg-background"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onSearchChange('')
                  searchInputRef.current?.focus()
                }}
                className="h-6 w-6 rounded-full text-muted-foreground hover:text-foreground"
                title="Borrar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-1 bg-popover border rounded-xl shadow-xl max-h-[210px] overflow-auto p-1 divide-y divide-border/50">
            {searchResults.slice(0, 12).map((prod) => (
              <Button
                key={prod.id}
                type="button"
                variant="ghost"
                onClick={() => onSelectSearchResult(prod)}
                className="w-full h-auto justify-between p-2 rounded-lg text-left text-xs font-normal group"
              >
                <div className="flex flex-col truncate pr-2 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-primary group-hover:underline">
                      {prod.sku_base}
                    </span>
                    {prod.marca_nombre && (
                      <span className="text-[9px] uppercase font-semibold text-muted-foreground">
                        · {prod.marca_nombre}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {prod.descripcion ?? prod.nombre}
                  </span>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px] font-mono">
                  {prod.pz_en_caja ?? '?'} pz
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {searchTerm.trim().length >= 1 && !isSearching && searchResults.length === 0 && (
          <div className="p-2 text-center text-xs text-muted-foreground bg-muted/40 rounded-xl mt-1">
            Sin coincidencias para &quot;{searchTerm}&quot;
          </div>
        )}
      </div>

      {/* Barra de controles de imagen */}
      <div className="flex items-center justify-between bg-background border rounded-lg px-2 py-1 z-10 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Foto Física de Nota
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut} title="Alejar">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn} title="Acercar">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRotate} title="Rotar 90°">
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onResetVisor} title="Restaurar">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {comprobanteUrl && (
            <a
              href={comprobanteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              title="Ver en pestaña nueva"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Visor de imagen con Zoom / Pan */}
      <div className="flex-1 relative border rounded-lg bg-muted/60 overflow-hidden flex items-center justify-center min-h-[220px]">
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
              alt="Comprobante OCR"
              draggable={false}
              className="max-w-full max-h-full object-contain rounded select-none shadow-2xl transition-transform duration-75"
              style={{ transform: visorTransform }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-xs font-bold">Sin foto adjunta</p>
            <p className="text-[10px] opacity-70">No se proporcionó imagen de la nota física</p>
          </div>
        )}
      </div>
    </div>
  )
}
