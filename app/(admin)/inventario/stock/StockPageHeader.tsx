// app/(admin)/inventario/stock/StockPageHeader.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { ImportarAjusteDialog } from './ImportarAjusteDialog'
import type { BodegaRow } from '@/lib/types/tables'

type Props = {
  title: string
  subtitle: string
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  showImport?: boolean
}

export function StockPageHeader({ title, subtitle, bodegas, bodegaActivaId, showImport = true }: Props) {
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
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
