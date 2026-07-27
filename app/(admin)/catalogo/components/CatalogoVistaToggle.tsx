// app/(admin)/catalogo/components/CatalogoVistaToggle.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, Table } from 'lucide-react'

export function CatalogoVistaToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentVista = searchParams.get('vista') ?? 'grid'

  const setVista = (vista: 'grid' | 'tabla') => {
    const params = new URLSearchParams(searchParams.toString())
    if (vista === 'grid') {
      params.delete('vista')
    } else {
      params.set('vista', vista)
    }
    router.push(`/catalogo?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex rounded-md border overflow-hidden">
      <button
        type="button"
        className={`px-3 py-1.5 flex items-center gap-1.5 text-sm ${
          currentVista === 'tabla' ? 'bg-muted font-medium' : 'hover:bg-muted/50'
        }`}
        onClick={() => setVista('tabla')}
        title="Vista tabla"
      >
        <Table className="h-4 w-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
      <button
        type="button"
        className={`px-3 py-1.5 flex items-center gap-1.5 text-sm border-l ${
          currentVista === 'grid' ? 'bg-muted font-medium' : 'hover:bg-muted/50'
        }`}
        onClick={() => setVista('grid')}
        title="Vista grid"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
    </div>
  )
}
