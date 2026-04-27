// app/(admin)/inventario/stock/ImportarAjusteDialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle2, Warehouse } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ImportStepUpload } from './ImportStepUpload'
import { ImportStepPreview } from './ImportStepPreview'
import { ImportStepConfirm } from './ImportStepConfirm'
import type { ImportFilaValida, NotaBodegaResult, ModoAjuste } from '@/modules/inventario/import-actions'
import type { BodegaRow } from '@/lib/types/tables'

type Step = 'upload' | 'preview' | 'confirm' | 'success'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
}

export function ImportarAjusteDialog({ open, onOpenChange, bodegas, bodegaActivaId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [parsedFilas, setParsedFilas] = useState<Record<string, string>[]>([])
  const [fileName, setFileName] = useState('')
  const [bodegaDefaultId, setBodegaDefaultId] = useState(bodegaActivaId ?? 0)
  const [filasValidas, setFilasValidas] = useState<ImportFilaValida[]>([])
  const [resultNotas, setResultNotas] = useState<NotaBodegaResult[]>([])
  const [resultTotal, setResultTotal] = useState(0)
  const [modo, setModo] = useState<ModoAjuste>('delta')

  const resetState = () => {
    setStep('upload')
    setParsedFilas([])
    setFileName('')
    setBodegaDefaultId(bodegaActivaId ?? 0)
    setFilasValidas([])
    setResultNotas([])
    setResultTotal(0)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  const handleFileParsed = (filas: Record<string, string>[], name: string, selectedBodegaId: number, selectedModo: ModoAjuste) => {
    setParsedFilas(filas)
    setFileName(name)
    setBodegaDefaultId(selectedBodegaId)
    setModo(selectedModo)
    setStep('preview')
  }

  const handleValidar = (validas: ImportFilaValida[]) => {
    setFilasValidas(validas)
    setStep('confirm')
  }

  const handleSuccess = (notas: NotaBodegaResult[], totalProductos: number) => {
    setResultNotas(notas)
    setResultTotal(totalProductos)
    setStep('success')
  }

  const handleViewNota = (notaId: number) => {
    handleOpenChange(false)
    router.push(`/inventario/notas/${notaId}`)
  }

  const maxW = step === 'preview' ? 'sm:max-w-2xl' : step === 'confirm' ? 'sm:max-w-xl' : 'sm:max-w-lg'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${maxW} max-h-[90vh] overflow-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Importar ajuste de inventario
          </DialogTitle>
          <DialogDescription>
            Sube un archivo CSV o Excel para crear notas de ajuste masivas.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <ImportStepUpload
            bodegas={bodegas}
            bodegaActivaId={bodegaActivaId}
            onFileParsed={handleFileParsed}
          />
        )}

        {step === 'preview' && (
          <ImportStepPreview
            filas={parsedFilas}
            fileName={fileName}
            bodegaDefaultId={bodegaDefaultId}
            bodegas={bodegas}
            onValidar={handleValidar}
            onBack={() => setStep('upload')}
          />
        )}

        {step === 'confirm' && (
        <ImportStepConfirm
          filas={filasValidas}
          modo={modo}
          onSuccess={handleSuccess}
          onBack={() => setStep('preview')}
        />
        )}

        {step === 'success' && resultNotas.length > 0 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Ajuste{resultNotas.length > 1 ? 's' : ''} aplicado{resultNotas.length > 1 ? 's' : ''} exitosamente</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {resultNotas.length} nota{resultNotas.length > 1 ? 's' : ''} — {resultTotal} productos procesados
              </p>
            </div>

            {resultNotas.length > 1 && (
              <div className="w-full space-y-2">
                {resultNotas.map((n) => (
                  <div
                    key={n.nota_id}
                    className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Warehouse className="size-3.5 text-muted-foreground" />
                      <span className="font-medium">{n.bodega_nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {n.numero_nota} — {n.productos_procesados} prod.
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewNota(n.nota_id)}
                      >
                        Ver nota
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resultNotas.length === 1 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => handleViewNota(resultNotas[0].nota_id)}>
                  Ver nota
                </Button>
              </div>
            )}

            {resultNotas.length > 1 && (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
