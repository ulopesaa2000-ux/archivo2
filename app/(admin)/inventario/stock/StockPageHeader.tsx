// app/(admin)/inventario/stock/StockPageHeader.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Package } from 'lucide-react'
import { ImportarAjusteDialog } from './ImportarAjusteDialog'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  title: string
  subtitle: string
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  showImport?: boolean
  totalCajas?: number
}

export function StockPageHeader({ title, subtitle, bodegas, bodegaActivaId, showImport = true, totalCajas }: Props) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {typeof totalCajas === 'number' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-sm">
              <Package className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              {totalCajas.toLocaleString('es-MX')} {totalCajas === 1 ? 'caja' : 'cajas'}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {showImport && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="gap-1.5 shrink-0"
          >
            <Upload className="size-3.5" />
            Importar ajuste
          </Button>
          <ImportarAjusteDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            bodegas={bodegas}
            bodegaActivaId={bodegaActivaId}
          />
        </>
      )}
    </div>
  )
}
