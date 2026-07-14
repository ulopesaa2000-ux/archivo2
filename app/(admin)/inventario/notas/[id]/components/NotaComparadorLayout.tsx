// app/(admin)/inventario/notas/[id]/components/NotaComparadorLayout.tsx
'use client'

import { useState } from 'react'
import { NotaComparador } from './NotaComparador'
import { cn } from '@/lib/utils'

interface NotaComparadorLayoutProps {
  comprobanteUrl: string | null
  children: React.ReactNode
}

export function NotaComparadorLayout({ comprobanteUrl, children }: NotaComparadorLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!comprobanteUrl) {
    return <div className="max-w-5xl mx-auto w-full">{children}</div>
  }

  return (
    <div className={cn(
      "w-full transition-all duration-300",
      isCollapsed 
        ? "max-w-5xl mx-auto" 
        : "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    )}>
      {/* Left panel: Sticky Image Comparador */}
      <div className={cn(
        "transition-all duration-300",
        isCollapsed 
          ? "w-0 h-0 overflow-hidden lg:hidden" 
          : "lg:col-span-5 xl:col-span-5 w-full"
      )}>
        <NotaComparador 
          comprobanteUrl={comprobanteUrl} 
          onCollapseToggle={setIsCollapsed} 
        />
      </div>

      {/* Right panel: Note Details Form / Read-only details */}
      <div className={cn(
        "transition-all duration-300 w-full",
        isCollapsed 
          ? "lg:col-span-12" 
          : "lg:col-span-7 xl:col-span-7"
      )}>
        {children}
      </div>
    </div>
  )
}
