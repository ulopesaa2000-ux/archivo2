// app/(admin)/ordenes-b2b/orden-rapida/_components/Step2Upload.tsx
'use client'

import { AlertTriangle, FileSpreadsheet, FileUp, HelpCircle, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PARSER_FORMATS, type N8nDebugInfo, type WizardWarning } from '../_hooks/orden-rapida-types'

interface Step2UploadProps {
  selectedParserFormat: string
  onParserFormatChange: (val: string) => void
  onOpenParserGuide: () => void
  selectedFile: File | null
  fileName: string | null
  processing: boolean
  progress: number
  progressMsg: string
  warnings: WizardWarning[]
  rawN8nResponse: unknown
  debugInfo: N8nDebugInfo | null
  onFileSelected: (file: File | null) => void
  onProcessFile: () => void
}

export function Step2Upload({
  selectedParserFormat,
  onParserFormatChange,
  onOpenParserGuide,
  selectedFile,
  fileName,
  processing,
  progress,
  progressMsg,
  warnings,
  rawN8nResponse,
  debugInfo,
  onFileSelected,
  onProcessFile,
}: Step2UploadProps) {
  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center gap-2">
        <FileUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">2. Subida y analisis inteligente</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-muted-foreground">Formato n8n:</span>
              <Badge variant="outline" className={PARSER_FORMATS.find((f) => f.id === selectedParserFormat)?.badgeColor || ''}>
                {PARSER_FORMATS.find((f) => f.id === selectedParserFormat)?.label || selectedParserFormat}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedParserFormat} onValueChange={(val) => onParserFormatChange(val || 'auto')}>
                <SelectTrigger className="h-7 text-xs w-[190px]">
                  <SelectValue placeholder="Cambiar formato..." />
                </SelectTrigger>
                <SelectContent>
                  {PARSER_FORMATS.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onOpenParserGuide}
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                title="Ver guía visual de formatos"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-8 text-center transition-colors hover:border-primary/50">
            <FileSpreadsheet className="mb-4 h-12 w-12 animate-bounce text-muted-foreground/60 duration-1000" />
            <p className="text-sm font-semibold">Selecciona tu archivo Packing List</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Soporta archivos .xls y .xlsx. PDF se agregara en una fase posterior.
            </p>

            <input
              id="packing-file-input"
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                onFileSelected(file)
              }}
            />

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => document.getElementById('packing-file-input')?.click()}
                disabled={processing}
              >
                Examinar archivos
              </Button>
              <Button type="button" size="sm" onClick={onProcessFile} disabled={processing || !selectedFile}>
                {processing ? 'Procesando...' : 'Procesar con n8n'}
              </Button>
            </div>
          </div>

          {fileName && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-green-600" />
                <span className="font-mono text-xs font-medium">{fileName}</span>
              </div>
              {!processing && (
                <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">
                  Archivo listo
                </Badge>
              )}
            </div>
          )}

          {processing && (
            <div className="space-y-2.5 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {progressMsg}
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {!processing && warnings.length > 0 && (
            <div className="space-y-2 rounded-lg border border-yellow-200 bg-yellow-50/80 p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="text-sm font-semibold">Warnings de validacion</p>
              </div>
              {warnings.map((warning, index) => (
                <p key={`${warning.codigo ?? 'warning'}-${index}`} className="text-xs text-yellow-900">
                  {warning.mensaje ?? warning.detalle ?? 'n8n devolvio una advertencia sin detalle.'}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-3.5 rounded-xl border border-border/80 bg-muted/40 p-4">
            <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Conexion real a n8n
            </h3>
            <p className="text-xs text-muted-foreground">
              El archivo se envia desde el servidor por <code className="font-mono">/api/packing/parse</code> y solo el
              backend conoce <code className="font-mono">N8N_PACKING_WEBHOOK_URL</code>.
            </p>
            <p className="text-xs text-muted-foreground">
              La respuesta se conserva en memoria para revisar productos, cajas y resumen sin insertar todavia en
              Supabase.
            </p>
            {Boolean(rawN8nResponse) && (
              <div className="space-y-2">
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  Respuesta real recibida desde n8n
                </Badge>
                {debugInfo && (
                  <div className="rounded-lg border border-green-200 bg-green-50/70 p-3 text-xs text-green-900">
                    <p>Tipo recibido: {debugInfo.topLevelType}</p>
                    <p>Productos detectados: {debugInfo.productosCount}</p>
                    <p>Cajas detectadas: {debugInfo.cajasCount}</p>
                    <p>Detalles detectados: {debugInfo.detallesCount}</p>
                    <p>Warnings detectados: {debugInfo.warningsCount}</p>
                    <p className="break-all">Llaves: {debugInfo.topLevelKeys.join(', ') || 'sin llaves'}</p>
                    <div className="space-y-1">
                      <p className="font-semibold">Preview crudo de Next.js:</p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-green-200 bg-white/70 p-2 text-[10px] leading-4">
                        {debugInfo.rawPreview || 'sin preview'}
                      </pre>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold">Preview desenvuelto para adaptar:</p>
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-green-200 bg-white/70 p-2 text-[10px] leading-4">
                        {debugInfo.unwrappedPreview || 'sin preview'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
