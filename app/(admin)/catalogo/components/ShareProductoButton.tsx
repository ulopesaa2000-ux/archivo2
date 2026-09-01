// app/(admin)/catalogo/components/ShareProductoButton.tsx
'use client'

import { useState, MouseEvent } from 'react'
import { Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductoListItem } from '@/modules/catalogo/types'
import { ShareProductoModal } from './ShareProductoModal'

interface Props {
  producto: ProductoListItem
  className?: string
}

export function ShareProductoButton({ producto, className }: Props) {
  const [open, setOpen] = useState(false)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Compartir ficha / Copiar imagen y datos"
        className={cn(
          'inline-flex items-center justify-center h-7 w-7 rounded-full transition-all duration-200 backdrop-blur-md shadow-md focus:outline-none shrink-0 cursor-pointer',
          'bg-slate-900/60 hover:bg-slate-900/90 text-white hover:text-primary-foreground border border-white/20 hover:scale-110 active:scale-95 hover:border-primary/50',
          className
        )}
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <ShareProductoModal
          producto={producto}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
