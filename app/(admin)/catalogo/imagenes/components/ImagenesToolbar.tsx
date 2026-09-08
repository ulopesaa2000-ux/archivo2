// app/(admin)/catalogo/imagenes/components/ImagenesToolbar.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { LayoutGrid, Table, Upload, FileSpreadsheet, HardDrive, FolderOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Carga perezosa (code-splitting) del modal pesado (42KB) solo cuando el usuario lo solicita
const ImportarMasivoModal = dynamic(
  () => import('./ImportarMasivoModal').then((m) => m.ImportarMasivoModal),
  { ssr: false }
)

export function ImagenesToolbar({ total }: { total: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importMode, setImportMode] = useState<'files' | 'excel'>('files')
  const [showImportMenu, setShowImportMenu] = useState(false)

  const currentVista = searchParams.get('vista') ?? 'grid'

  const setVista = (vista: 'grid' | 'agrupado' | 'tabla') => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (vista === 'grid') {
        params.delete('vista')
      } else {
        params.set('vista', vista)
      }
      params.delete('page')
      router.push(`/catalogo/imagenes?${params.toString()}`, { scroll: false })
    })
  }

  const handleImportOption = (mode: 'files' | 'excel') => {
    setImportMode(mode)
    setShowImportMenu(false)
    setImportModalOpen(true)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Toggle vista con transiciones concurrentes */}
      <div className={`flex rounded-md border overflow-hidden transition-opacity ${isPending ? 'opacity-70' : ''}`}>
        <button
          type="button"
          disabled={isPending}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm transition-colors ${
            currentVista === 'grid' ? 'bg-muted font-medium text-foreground' : 'hover:bg-muted/50 text-muted-foreground'
          }`}
          onClick={() => setVista('grid')}
          title="Vista individual"
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Individual</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm border-l transition-colors ${
            currentVista === 'agrupado' ? 'bg-muted font-medium text-foreground' : 'hover:bg-muted/50 text-muted-foreground'
          }`}
          onClick={() => setVista('agrupado')}
          title="Vista agrupada por producto/SKU"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Agrupado</span>
        </button>
        <button
          type="button"
          disabled={isPending}
          className={`px-3 py-1.5 flex items-center gap-1.5 text-sm border-l transition-colors ${
            currentVista === 'tabla' ? 'bg-muted font-medium text-foreground' : 'hover:bg-muted/50 text-muted-foreground'
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

      {/* Modal import - solo se renderiza cuando está abierto para evitar consumo de memoria */}
      {importModalOpen && (
        <ImportarMasivoModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          mode={importMode}
        />
      )}
    </div>
  )
}