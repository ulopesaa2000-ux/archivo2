// components/admin/LogoutButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/modules/auth/actions'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
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

export function LogoutButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await signOut()
      router.push('/login')
      router.refresh()
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-9 w-9 p-0 sm:w-auto sm:px-3 rounded-lg shrink-0"
            disabled={isPending}
            title="Cerrar sesión"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="ml-2 hidden md:inline text-xs font-semibold">Salir</span>
          </Button>
        }
      />

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            Se cerrará tu sesión actual y tendrás que volver a iniciar sesión
            para acceder al panel de administración.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleLogout}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cerrando...
              </>
            ) : (
              'Cerrar sesión'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
