'use client'

import React, { useTransition } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

interface ConfirmDeleteModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  title?: string
  elementName: string
  description?: string
}

export function ConfirmDeleteModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title = '¿Eliminar elemento?',
  elementName,
  description = 'Esta acción marcará este elemento como inactivo y ya no será visible en el sistema. Puedes recuperarlo contactando al administrador.'
}: ConfirmDeleteModalProps) {
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await onConfirm()
        onOpenChange(false)
      } catch (error) {
        console.error('Error deleting item', error)
      }
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={isPending ? undefined : onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span>{description}</span>
            <div className="bg-muted p-2 rounded-md font-mono text-foreground font-medium text-sm border">
              {elementName}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          {/* Note: In shadcn/base-ui, AlertDialogAction is a Button by default */}
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
