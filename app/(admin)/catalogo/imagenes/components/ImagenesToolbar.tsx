// app/(admin)/catalogo/imagenes/components/ImagenesToolbar.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, Table, Upload, FileSpreadsheet, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportarMasivoModal } from './ImportarMasivoModal'

export function ImagenesToolbar({ total }: { total: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importMode, setImportMode] = useState<'files' | 'excel'>('files')
  const [showImportMenu, setShowImportMenu] = useState(false)

  const currentVista = searchParams.get('vista') ?? 'grid'

  const setVista = (vista: 'grid' | 'tabla') => {
    const params = new URLSearchParams(searchParams.toString())
    if (vista === 'grid') {
      params.delete('vista')
    } else {
      params.set('vista', vista)
    }
    router.push(`/catalogo/imagenes?${params.toString()}`, { scroll: false })
  }

  const handleImportOption = (mode: 'files' | 'excel') => {
    setImportMode(mode)
    setShowImportMenu(false)
    setImportModalOpen(true)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Toggle vista */}
      <div className="flex rounded-md border overflow-hidden">
        <button
          type="button"
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm ${
            currentVista === 'grid' ? 'bg-muted font-medium' : 'hover:bg-muted/50'
          }`}
          onClick={() => setVista('grid')}
          title="Vista grid"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Grid</span>
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm border-l ${
            currentVista === 'tabla' ? 'bg-muted font-medium' : 'hover:bg-muted/50'
          }`}
          onClick={() => setVista('tabla')}
          title="Vista tabla"
        >
          <Table className="h-4 w-4" />
          <span className="hidden sm:inline">Tabla</span>
        </button>
      </div>

      {/* Importar con dropdown */}
      <div className="relative">
        <Button size="sm" onClick={() => setShowImportMenu(!showImportMenu)}>
          <Upload className="h-4 w-4 mr-1.5" />
          Importar
        </Button>
        {showImportMenu && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left transition-colors"
              onClick={() => handleImportOption('files')}
            >
              <div className="bg-primary/10 p-2 rounded-md">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">Subir archivos</div>
                <div className="text-xs text-muted-foreground">Desde tu PC (hasta 20)</div>
              </div>
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left transition-colors border-t"
              onClick={() => handleImportOption('excel')}
            >
              <div className="bg-green-100 p-2 rounded-md">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Importar desde Excel</div>
                <div className="text-xs text-muted-foreground">Desde URLs públicas</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Click fuera cierra el menú */}
      {showImportMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowImportMenu(false)} />
      )}

      {/* Modal import */}
      <ImportarMasivoModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        mode={importMode}
      />
    </div>
  )
}