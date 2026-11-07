// app/(admin)/catalogo/components/CatalogoVistaToggle.tsx
'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, Table } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Selector de vista (Grid / Tabla) reutilizable en cualquier ruta de catálogo.
 * Usa `usePathname()` y `useTransition()` para cambiar de vista sin perder filtros ni hacer scroll.
 */
export function CatalogoVistaToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentVista = searchParams.get('vista') === 'tabla' ? 'tabla' : 'grid'

  const setVista = (vista: 'grid' | 'tabla') => {
    if (vista === currentVista) return
    const params = new URLSearchParams(searchParams.toString())
    if (vista === 'grid') {
      params.delete('vista')
    } else {
      params.set('vista', vista)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div
      className={cn(
        'flex rounded-md border overflow-hidden transition-opacity',
        isPending && 'opacity-70'
      )}
    >
      <button
        type="button"
        className={cn(
          'px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors',
          currentVista === 'tabla' ? 'bg-muted font-medium text-foreground' : 'hover:bg-muted/50 text-muted-foreground'
        )}
        onClick={() => setVista('tabla')}
        title="Vista tabla"
      >
        <Table className="h-4 w-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
      <button
        type="button"
        className={cn(
          'px-3 py-1.5 flex items-center gap-1.5 text-sm border-l transition-colors',
          currentVista === 'grid' ? 'bg-muted font-medium text-foreground' : 'hover:bg-muted/50 text-muted-foreground'
        )}
        onClick={() => setVista('grid')}
        title="Vista grid"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
    </div>
  )
}
