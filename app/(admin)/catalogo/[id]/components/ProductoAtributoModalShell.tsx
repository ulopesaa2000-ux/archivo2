// app/(admin)/catalogo/[id]/components/ProductoAtributoModalShell.tsx
'use client'

import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2 } from 'lucide-react'
import { ProductImageViewer } from './ProductImageViewer'

export function ProductoAtributoModalShell({
  open,
  onOpenChange,
  title,
  description,
  icon,
  imagenPrincipalUrl = null,
  skuBase = null,
  tipoPrenda = null,
  productoDescripcion = null,
  assignedTitle,
  assignedCount,
  assignedContent,
  isSaving = false,
  canEdit = true,
  onRequestClearAll,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  icon: ReactNode
  imagenPrincipalUrl?: string | null
  skuBase?: string | null
  tipoPrenda?: string | null
  productoDescripcion?: string | null
  assignedTitle: string
  assignedCount: number
  assignedContent: ReactNode
  isSaving?: boolean
  canEdit?: boolean
  onRequestClearAll?: () => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-[85vw] max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                {icon}
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {description}
              </DialogDescription>
            </div>
            {isSaving && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Columna izquierda fija: imagen 3:4 con zoom + datos + asignados */}
            <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-0 space-y-3 rounded-xl border bg-muted/20 p-3">
              <ProductImageViewer
                src={imagenPrincipalUrl}
                alt={skuBase ?? 'Imagen del producto'}
                sku={skuBase ?? ''}
                className="aspect-[3/4] sm:aspect-[3/4]"
              />
              <div className="space-y-1">
                {skuBase && (
                  <p className="font-mono text-xs font-semibold text-foreground">{skuBase}</p>
                )}
                {tipoPrenda && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {tipoPrenda}
                  </Badge>
                )}
                {productoDescripcion && (
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
                    {productoDescripcion}
                  </p>
                )}
              </div>

              <div className="border-t pt-2.5 space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  {assignedTitle} ({assignedCount})
                </span>
                {assignedContent}
              </div>
            </aside>

            {/* Columna derecha: sugerencias + constructor / catálogo */}
            <div className="flex-1 min-w-0 space-y-4">
              {children}
            </div>
          </div>
        </div>

        {/* Footer: Limpiar todos / Listo */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div>
            {canEdit && assignedCount > 0 && onRequestClearAll && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRequestClearAll}
                className="h-8 px-2.5 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpiar todos
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4"
          >
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
