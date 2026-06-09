// app/(admin)/inventario/stock/ImportStepUpload.tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, Download } from 'lucide-react'
import type { BodegaRow } from '@/lib/types/tables'

import type { ModoAjuste } from '@/modules/inventario/import-actions'

type Props = {
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  onFileParsed: (filas: Record<string, string>[], fileName: string, bodegaId: number, modo: ModoAjuste) => void
}

const CSV_TEMPLATE_DELTA = `sku,cajas,bodega
SKU-EJEMPLO-001,10,
SKU-EJEMPLO-002,-5,Neza
SKU-EJEMPLO-003,3,`

const CSV_TEMPLATE_ABSOLUTO = `sku,cajas,bodega
SKU-EJEMPLO-001,50,
SKU-EJEMPLO-002,0,Neza
SKU-EJEMPLO-003,12,`

export function ImportStepUpload({ bodegas, bodegaActivaId, onFileParsed }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedBodegaId, setSelectedBodegaId] = useState<number>(
    bodegaActivaId ?? 0
  )
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [modo, setModo] = useState<ModoAjuste>('delta')

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setParseError(null)

    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      if (ext === 'csv' || ext === 'txt') {
        const Papa = (await import('papaparse')).default
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setParseError(`Error en CSV línea ${results.errors[0].row}: ${results.errors[0].message}`)
              return
            }
            const filas = results.data as Record<string, string>[]
            if (filas.length === 0) {
              setParseError('El archivo está vacío.')
              return
            }
            onFileParsed(filas, file.name, selectedBodegaId, modo)
          },
          error: (err: Error) => {
            setParseError(`Error al leer CSV: ${err.message}`)
          },
        })
      } else if (ext === 'xlsx' || ext === 'xls') {
        const ExcelJS = (await import('exceljs')).default
        const arrayBuffer = await file.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(arrayBuffer)
        const sheet = workbook.worksheets[0]
        if (!sheet) {
          setParseError('No se encontró ninguna pestaña en el archivo Excel.')
          return
        }

        const json: Record<string, string>[] = []
        const headers: string[] = []
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              headers[colNumber] = cell.text ? String(cell.text).trim() : ''
            })
          } else {
            const rowObj: Record<string, string> = {}
            let hasValue = false
            for (let i = 1; i < headers.length; i++) {
              const header = headers[i]
              if (!header) continue
              const cell = row.getCell(i)
              let val = cell.value
              if (val !== null && typeof val === 'object') {
                if ('result' in val) {
                  val = (val as any).result
                } else if ('text' in val) {
                  val = (val as any).text
                }
              }
              const stringVal = val !== null && val !== undefined ? String(val).trim() : ''
              rowObj[header] = stringVal
              if (stringVal !== '') {
                hasValue = true
              }
            }
            if (hasValue) {
              json.push(rowObj)
            }
          }
        })

        if (json.length === 0) {
          setParseError('La hoja de cálculo está vacía.')
          return
        }
        onFileParsed(json, file.name, selectedBodegaId, modo)
      } else {
        setParseError('Formato no soportado. Usa .csv, .xlsx o .xls')
      }
    } catch (err: any) {
      setParseError(`Error al procesar archivo: ${err.message}`)
    }
  }, [selectedBodegaId, onFileParsed, modo])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }, [parseFile])

  const downloadTemplate = () => {
    const template = modo === 'absoluto' ? CSV_TEMPLATE_ABSOLUTO : CSV_TEMPLATE_DELTA
    const name = modo === 'absoluto' ? 'template_inventario_total.csv' : 'template_ajuste_delta.csv'
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">1. Subir archivo</h3>
        <p className="text-sm text-muted-foreground">
          Selecciona un archivo CSV o Excel con las columnas: <code className="text-xs bg-muted px-1 py-0.5 rounded">sku</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">cajas</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">bodega</code> (opcional)
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Bodega destino</label>
        <select
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          value={selectedBodegaId}
          onChange={(e) => setSelectedBodegaId(parseInt(e.target.value))}
        >
          <option value={0}>Todas las bodegas (una nota por bodega)</option>
          {bodegas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre} ({b.codigo})
            </option>
          ))}
        </select>
      <p className="text-xs text-muted-foreground mt-1">
        {selectedBodegaId === 0
          ? 'Cada fila se asigna a la bodega del CSV. Se crea una nota AJU por bodega.'
          : 'Todas las filas se asignan a esta bodega, sin importar la columna bodega del CSV.'}
      </p>
    </div>

    <div>
      <label className="text-sm font-medium">Modo de ajuste</label>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setModo('delta')}
          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
            modo === 'delta'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-muted hover:border-muted-foreground/25'
          }`}
        >
          <span className="text-sm font-medium">Ajuste delta</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cajas = cantidad a sumar o restar al stock actual
          </p>
        </button>
        <button
          type="button"
          onClick={() => setModo('absoluto')}
          className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
            modo === 'absoluto'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-muted hover:border-muted-foreground/25'
          }`}
        >
          <span className="text-sm font-medium">Inventario total</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cajas = stock final deseado. Se calcula la diferencia automaticamente
          </p>
        </button>
      </div>
    </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed
          p-8 cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
        `}
      >
        {fileName ? (
          <FileSpreadsheet className="h-10 w-10 text-primary" />
        ) : (
          <Upload className="h-10 w-10 text-muted-foreground" />
        )}
        <p className="text-sm font-medium">
          {fileName ?? 'Arrastra tu archivo aquí o haz clic'}
        </p>
        <p className="text-xs text-muted-foreground">
          .csv, .xlsx, .xls — Máximo 500 filas recomendadas
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {parseError && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {parseError}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
        <Download className="size-3.5" />
        Descargar template CSV
      </Button>
    </div>
  )
}
