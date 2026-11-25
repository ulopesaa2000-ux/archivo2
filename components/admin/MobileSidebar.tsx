// components/admin/MobileSidebar.tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { buttonVariants } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { SidebarContent } from './SidebarContent'
import type { UsuarioConRol } from '@/lib/types/tables'
import type { DocRegistryItem } from '@/lib/docs/types'
import { cn } from '@/lib/utils'

/**
 * Sidebar para mobile.
 * Se muestra como un drawer (Sheet) que se abre
 * con el botón hamburguesa del Header.
 * Al hacer click en un link, se cierra automáticamente.
 */
export function MobileSidebar({
  user,
  docItems,
}: {
  user: UsuarioConRol
  docItems?: DocRegistryItem[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'lg:hidden'
        )}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SidebarContent
          user={user}
          docItems={docItems}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
