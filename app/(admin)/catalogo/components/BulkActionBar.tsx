'use client'

import React, { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Trash2, 
  Pencil, 
  Package, 
  ChevronUp, 
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type BulkActionBarProps = {
  selectedCount: number
  onClear: () => void
  onBulkDelete: () => Promise<void>
}

export function BulkActionBar({
  selectedCount,
  onClear,
  onBulkDelete
}: BulkActionBarProps) {
  const [isPending, startTransition] = useTransition()

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border shadow-2xl rounded-2xl px-4 py-3 min-w-[400px] md:min-w-[600px] border-primary/20">
        
        {/* Contador */}
        <div className="flex items-center gap-3 pr-6 border-r">
          <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-8 w-8 font-bold text-sm shadow-sm ring-4 ring-primary/10">
            {selectedCount}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground leading-tight">Items</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">seleccionados</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-1 items-center justify-center gap-2 px-2">
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col h-11 px-3 gap-0.5 hover:bg-primary/5 hover:text-primary transition-all group"
            onClick={() => {
              // Por ahora solo feedback visual, ya que la edición rápida es por celda
              // Pero podríamos abrir un modal general si quisiéramos
            }}
          >
            <Pencil className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-medium">Edición Masiva</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col h-11 px-3 gap-0.5 hover:bg-primary/5 hover:text-primary transition-all group"
            disabled
          >
            <Package className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-medium">Stock</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger 
              render={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex flex-col h-11 px-3 gap-0.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-all group text-muted-foreground"
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 transition-transform group-hover:scale-110" />
                  <span className="text-[10px] font-medium">Eliminar</span>
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  ¿Estás completamente seguro?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Estás a punto de desactivar <span className="font-bold text-foreground">{selectedCount} productos</span> simultáneamente. 
                  Esto ocultará los productos del catálogo activo y de la tienda web.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    startTransition(async () => {
                      await onBulkDelete()
                    })
                  }}
                >
                  Sí, desactivar {selectedCount} productos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>

        {/* Cerrar / Limpiar */}
        <div className="pl-4 border-l">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={onClear}
            title="Limpiar selección"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  )
}
