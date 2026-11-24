// app/(admin)/inventario/stock/StockPageHeader.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Upload, Package, TrendingUp, History, FileSpreadsheet } from 'lucide-react'
import { ImportarAjusteDialog } from './ImportarAjusteDialog'
import { ConteoFisicoOcrModal } from './ConteoFisicoOcrModal'
import { ADMIN_ROUTES } from '@/lib/constants'
import type { BodegaRow } from '@/lib/types/tables'
import type { ImportFilaValida } from '@/modules/inventario/import-actions'
import { marcarHojasConteoAplicadasAction } from '@/modules/inventario/conteo-fisico-actions'
import { prefetchCatalogoOcr } from '@/components/admin/ocr-sync/_hooks/ocr-catalogo-cache'
import { toast } from 'sonner'

type Props = {
  title: string
  subtitle: string
  bodegas: BodegaRow[]
  bodegaActivaId: number | null
  showImport?: boolean
  canConteoOcr?: boolean
  totalCajas?: number
  totalCajasPronosticadas?: number
  isPronostico?: boolean
  /** Muestra el acceso al histórico (stock a una fecha). */
  showHistorico?: boolean
}

export function StockPageHeader({
  title,
  subtitle,
  bodegas,
  bodegaActivaId,
  showImport = true,
  canConteoOcr = true,
  totalCajas,
  totalCajasPronosticadas,
  isPronostico = false,
  showHistorico = false,
}: Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [ocrOpen, setOcrOpen] = useState(false)
  const [reconcileData, setReconcileData] = useState<{
    bodegaId: number
    filasValidas: ImportFilaValida[]
  } | null>(null)
  const [activePropuestaDbIds, setActivePropuestaDbIds] = useState<string[]>([])

  const handleIrAConciliacion = (
    bodegaId: number,
    filas: ImportFilaValida[],
    propuestaDbIds?: string[]
  ) => {
    setReconcileData({ bodegaId, filasValidas: filas })
    if (propuestaDbIds && propuestaDbIds.length > 0) {
      setActivePropuestaDbIds(propuestaDbIds)
    }
    setImportOpen(true)
  }

  const handleAjusteCompletadoExito = async () => {
    if (activePropuestaDbIds.length > 0) {
      try {
        await marcarHojasConteoAplicadasAction(activePropuestaDbIds)
        toast.success(
          `Se cerraron ${activePropuestaDbIds.length} hoja(s) de libreta como CONTEO_APLICADO en la base de datos.`
        )
      } catch (err) {
        console.error('Error al marcar hojas aplicadas:', err)
      } finally {
        setActivePropuestaDbIds([])
      }
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {isPronostico && typeof totalCajasPronosticadas === 'number' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-semibold bg-muted text-muted-foreground border shadow-sm">
                <Package className="h-4 w-4 shrink-0" />
                {totalCajas?.toLocaleString('es-MX')} físicas
              </span>
              <span className="text-muted-foreground text-xs font-bold">→</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-sm">
                <TrendingUp className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                {totalCajasPronosticadas.toLocaleString('es-MX')} pronosticadas
              </span>
            </div>
          ) : (
            typeof totalCajas === 'number' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-sm">
                <Package className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                {totalCajas.toLocaleString('es-MX')} {totalCajas === 1 ? 'caja' : 'cajas'}
              </span>
            )
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {showHistorico && (
          <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
            <Link href={ADMIN_ROUTES.inventario.historico}>
              <History className="size-3.5" />
              Stock a la fecha
            </Link>
          </Button>
        )}

        {canConteoOcr && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOcrOpen(true)}
            onMouseEnter={prefetchCatalogoOcr}
            onFocus={prefetchCatalogoOcr}
            className="gap-1.5 shrink-0 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <FileSpreadsheet className="size-3.5 text-blue-600" />
            Escanear inventario físico
          </Button>
        )}

        {showImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReconcileData(null)
              setActivePropuestaDbIds([])
              setImportOpen(true)
            }}
            className="gap-1.5 shrink-0"
          >
            <Upload className="size-3.5" />
            Importar ajuste
          </Button>
        )}

        {canConteoOcr && (
          <ConteoFisicoOcrModal
            open={ocrOpen}
            onOpenChange={setOcrOpen}
            bodegas={bodegas}
            bodegaActivaId={bodegaActivaId}
            onIrAConciliacion={handleIrAConciliacion}
          />
        )}

        {showImport && (
          <ImportarAjusteDialog
            open={importOpen}
            onOpenChange={(open) => {
              setImportOpen(open)
              if (!open) {
                setReconcileData(null)
                setActivePropuestaDbIds([])
              }
            }}
            bodegas={bodegas}
            bodegaActivaId={bodegaActivaId}
            initialReconcileData={reconcileData}
            onSuccessGlobal={handleAjusteCompletadoExito}
          />
        )}
      </div>
    </div>
  )
}
