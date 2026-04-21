'use client'

// components/admin/DataTable/BulkActionBar.tsx

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/alert-dialog'
import { X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDataTableContext } from './DataTableProvider'
import type { BulkAction } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  /** Acciones a mostrar. Si no se provee, usa las del provider */
  actions?: BulkAction[]
  /** Label plural para el contador, ej. 'productos' | 'notas' */
  label?: string
}

export function BulkActionBar({ actions, label = 'items' }: Props) {
  const ctx = useDataTableContext()
  const [isPending, startTransition] = useTransition()
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const selectedCount = ctx.selectedIds.size
  const displayActions = actions ?? ctx.features.bulkActions ?? []

  if (selectedCount === 0 || displayActions.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 bg-background border shadow-2xl rounded-2xl px-4 py-3 min-w-[400px] md:min-w-[500px] border-primary/20">

        {/* Contador */}
        <div className="flex items-center gap-3 pr-6 border-r">
          <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-8 w-8 font-bold text-sm shadow-sm ring-4 ring-primary/10">
            {selectedCount}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground leading-tight capitalize">
              {label}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              seleccionados
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-1 items-center justify-center gap-1 px-2">
          {displayActions.map((action) => (
            <AlertDialog key={action.id}>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex flex-col h-11 px-3 gap-0.5 transition-all group',
                      action.variant === 'destructive'
                        ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30'
                        : 'hover:bg-primary/5 hover:text-primary'
                    )}
                    disabled={isPending}
                  >
                    {action.icon && <action.icon className="h-4 w-4 transition-transform group-hover:scale-110" />}
                    <span className="text-[10px] font-medium">{action.label}</span>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {action.variant === 'destructive' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    {action.label}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción afecta a{' '}
                    <span className="font-bold text-foreground">{selectedCount}</span>{' '}
                    {label}. Esta operación no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className={cn(
                      action.variant === 'destructive' && 'bg-red-600 hover:bg-red-700'
                    )}
                    onClick={() => {
                      setPendingActionId(action.id)
                      startTransition(async () => {
                        const ids = Array.from(ctx.selectedIds).map(Number)
                        const result = await action.onClick(ids)
                        if (result !== false) {
                          ctx.clearSelection()
                        }
                        setPendingActionId(null)
                      })
                    }}
                  >
                    {isPending && pendingActionId === action.id && (
                      <span className="mr-2 animate-spin">⟳</span>
                    )}
                    {action.label} ({selectedCount})
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}
        </div>

        {/* Cerrar */}
        <div className="pl-4 border-l">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={ctx.clearSelection}
            title="Limpiar selección"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}