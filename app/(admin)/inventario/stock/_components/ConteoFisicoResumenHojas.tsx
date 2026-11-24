// app/(admin)/inventario/stock/_components/ConteoFisicoResumenHojas.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Eye, FileText, Layers, Sparkles, AlertTriangle } from 'lucide-react'
import type { HojaConteoFisico } from '@/modules/inventario/conteo-fisico-types'

interface ConteoFisicoResumenHojasProps {
  hojas: HojaConteoFisico[]
  resumenGlobal: {
    totalHojas: number
    totalRenglones: number
    totalCajas: number
    confirmados: number
    propuestas: number
    sinMatch: number
  }
  activeFotoHojaId: string | null
  onSelectHojaFoto: (hojaId: string, url?: string) => void
}

export function ConteoFisicoResumenHojas({
  hojas,
  resumenGlobal,
  activeFotoHojaId,
  onSelectHojaFoto,
}: ConteoFisicoResumenHojasProps) {
  return (
    <div className="space-y-3">
      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Hojas / Renglones</span>
          <div className="text-lg font-bold flex items-center gap-1.5 mt-0.5">
            <FileText className="size-4 text-blue-500" />
            <span>{resumenGlobal.totalHojas}</span>
            <span className="text-xs text-muted-foreground font-normal">
              ({resumenGlobal.totalRenglones} reg.)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 flex flex-col justify-between">
          <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold">Cajas Contadas</span>
          <div className="text-lg font-extrabold text-blue-700 dark:text-blue-300 mt-0.5 flex items-center gap-1.5">
            <Layers className="size-4" />
            {resumenGlobal.totalCajas.toLocaleString('es-MX')}
          </div>
        </div>

        <div className="p-2.5 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">Confirmados</span>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 flex items-center gap-1.5">
            <CheckCircle2 className="size-4" />
            {resumenGlobal.confirmados}
          </div>
        </div>

        <div className="p-2.5 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 flex flex-col justify-between">
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">Propuestas</span>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-1.5">
            <Sparkles className="size-4" />
            {resumenGlobal.propuestas}
          </div>
        </div>

        <div className="p-2.5 rounded-lg border bg-card flex flex-col justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">Sin Coincidencia</span>
          <div
            className={`text-lg font-bold mt-0.5 flex items-center gap-1.5 ${
              resumenGlobal.sinMatch > 0 ? 'text-destructive' : 'text-emerald-600'
            }`}
          >
            <AlertTriangle className="size-4" />
            {resumenGlobal.sinMatch}
          </div>
        </div>
      </div>

      {/* Cotejo rápido por hoja y columna */}
      {hojas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {hojas.map((h) => {
            const url = h.comprobante_url || h.preview_data_url
            const isActiva = activeFotoHojaId === h.id
            return (
              <div
                key={h.id}
                className={`p-2.5 rounded-xl border bg-card text-xs space-y-1.5 transition-colors ${
                  isActiva ? 'border-blue-400 ring-1 ring-blue-400/40' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <Badge variant="outline" className="font-bold text-[10px] bg-muted">
                      Hoja {h.numero_hoja}
                    </Badge>
                    {h.encabezado && (
                      <span className="text-[11px] font-semibold truncate max-w-[110px]">
                        {h.encabezado}
                      </span>
                    )}
                    {h.fecha_detectada && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({h.fecha_detectada})
                      </span>
                    )}
                  </div>

                  {url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-blue-600 shrink-0"
                      onClick={() => onSelectHojaFoto(h.id, url)}
                      title="Ver foto de esta hoja"
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-muted/40 p-1.5 rounded border">
                  <div>
                    <span className="text-muted-foreground">Izq: </span>
                    <strong className="text-foreground">{h.resumen.columna_1.cajas}</strong>
                    <span className="text-muted-foreground"> ({h.resumen.columna_1.renglones})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Der: </span>
                    <strong className="text-foreground">{h.resumen.columna_2.cajas}</strong>
                    <span className="text-muted-foreground"> ({h.resumen.columna_2.renglones})</span>
                  </div>
                  <div className="text-right font-bold text-blue-600 dark:text-blue-400">
                    Total: {h.resumen.total_hoja.cajas} ({h.resumen.total_hoja.renglones})
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
