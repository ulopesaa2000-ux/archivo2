// app/(admin)/contenedores/ContenedoresViewToggle.tsx
'use client'

import { useFilterParams } from '@/components/admin/useFilterParams'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Table } from 'lucide-react'

export function ContenedoresViewToggle() {
  const { updateParam, searchParam } = useFilterParams()
  const vista = searchParam('vista', 'lista')

  return (
    <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/80">
      <Button
        variant={vista === 'lista' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => updateParam('vista', 'lista')}
        className={`h-8 gap-1.5 px-3 ${vista === 'lista' ? 'shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Table className="h-4 w-4" />
        Lista
      </Button>
      <Button
        variant={vista === 'reporte' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => updateParam('vista', 'reporte')}
        className={`h-8 gap-1.5 px-3 ${vista === 'reporte' ? 'shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <LayoutGrid className="h-4 w-4" />
        Reporte YoY
      </Button>
    </div>
  )
}
