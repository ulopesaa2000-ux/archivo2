// app/(admin)/ordenes-b2b/orden-rapida/_components/Step4AuditoriaResumen.tsx
'use client'

import { AlertTriangle, ChevronDown, ChevronUp, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { ColorPorConfirmar, ContainerMock, WizardParsedData, WizardWarning } from '../_hooks/orden-rapida-types'

interface Step4AuditoriaResumenProps {
  selectedContenedor: string
  newContainerCode: string
  newContainerNumber: string
  sortedContenedores: ContainerMock[]
  selectedContenedorObj: ContainerMock | undefined
  selectedContenedorEsSurtido: boolean
  parsedData: WizardParsedData | null
  cajasAgrupadasCount: number
  totalCajasCount: number
  totalPiezasCount: number
  totalCbm: number
  totalPesoBruto: number
  totalPesoNeto: number
  overrideProductos: number | null
  onSetOverrideProductos: (val: number | null) => void
  overrideCajas: number | null
  onSetOverrideCajas: (val: number | null) => void
  overridePiezas: number | null
  onSetOverridePiezas: (val: number | null) => void
  overrideCbm: number | null
  onSetOverrideCbm: (val: number | null) => void
  overridePesoNeto: number | null
  onSetOverridePesoNeto: (val: number | null) => void
  overridePeso: number | null
  onSetOverridePeso: (val: number | null) => void
  warnings: WizardWarning[]
  showWarnings: boolean
  onToggleWarnings: () => void
  coloresNuevos: ColorPorConfirmar[]
  coloresOmitidos: ColorPorConfirmar[]
  coloresPorConfirmar: ColorPorConfirmar[]
  onOpenColoresModal: () => void
  overrideModal: {
    key: 'productos' | 'cajas' | 'piezas' | 'cbm' | 'pesoNeto' | 'peso'
    label: string
  } | null
  onCloseOverrideModal: () => void
  overrideValor: string
  onOverrideValorChange: (val: string) => void
  onAplicarOverride: () => void
}

export function Step4AuditoriaResumen({
  selectedContenedor,
  newContainerCode,
  newContainerNumber,
  sortedContenedores,
  selectedContenedorObj,
  selectedContenedorEsSurtido,
  parsedData,
  cajasAgrupadasCount,
  totalCajasCount,
  totalPiezasCount,
  totalCbm,
  totalPesoBruto,
  totalPesoNeto,
  overrideProductos,
  onSetOverrideProductos,
  overrideCajas,
  onSetOverrideCajas,
  overridePiezas,
  onSetOverridePiezas,
  overrideCbm,
  onSetOverrideCbm,
  overridePesoNeto,
  onSetOverridePesoNeto,
  overridePeso,
  onSetOverridePeso,
  warnings,
  showWarnings,
  onToggleWarnings,
  coloresNuevos,
  coloresOmitidos,
  coloresPorConfirmar,
  onOpenColoresModal,
  overrideModal,
  onCloseOverrideModal,
  overrideValor,
  onOverrideValorChange,
  onAplicarOverride,
}: Step4AuditoriaResumenProps) {
  const ordenExtra = (parsedData?.orden ?? {}) as Record<string, unknown>

  const metricas = [
    {
      key: 'productos',
      label: 'Productos',
      calc: cajasAgrupadasCount,
      target: overrideProductos ?? parsedData?.orden.total_productos,
      fmt: (v: number) => v.toString(),
      sync: () => onSetOverrideProductos(cajasAgrupadasCount),
    },
    {
      key: 'cajas',
      label: 'Cajas Totales',
      calc: totalCajasCount,
      target: overrideCajas ?? parsedData?.orden.total_cajas,
      fmt: (v: number) => v.toString(),
      sync: () => onSetOverrideCajas(totalCajasCount),
    },
    {
      key: 'piezas',
      label: 'Piezas Totales',
      calc: totalPiezasCount,
      target: overridePiezas ?? parsedData?.orden.total_piezas,
      fmt: (v: number) => v.toLocaleString(),
      sync: () => onSetOverridePiezas(totalPiezasCount),
    },
    {
      key: 'cbm',
      label: 'CBM Total (m³)',
      calc: totalCbm,
      target: overrideCbm ?? parsedData?.orden.cbm_estimado,
      fmt: (v: number) => v.toFixed(3),
      sync: () => onSetOverrideCbm(Number(totalCbm.toFixed(3))),
    },
    {
      key: 'pesoNeto',
      label: 'Peso Neto Total (kg)',
      calc: totalPesoNeto,
      target:
        overridePesoNeto ??
        ((ordenExtra.peso_neto_total_kg as number | undefined) ||
          (ordenExtra.peso_neto_estimado as number | undefined)),
      fmt: (v: number) => `${v.toFixed(1)} kg`,
      sync: () => onSetOverridePesoNeto(Number(totalPesoNeto.toFixed(1))),
    },
    {
      key: 'pesoBruto',
      label: 'Peso Bruto Total (kg)',
      calc: totalPesoBruto,
      target: overridePeso ?? parsedData?.orden.peso_bruto_total_kg,
      fmt: (v: number) => `${v.toFixed(1)} kg`,
      sync: () => onSetOverridePeso(Number(totalPesoBruto.toFixed(1))),
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-6 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
        <div className="space-y-1">
          <span className="block text-xs font-bold text-muted-foreground">Contenedor destino</span>
          <p className="font-mono text-base font-bold">
            {selectedContenedor === 'new'
              ? `${newContainerCode || '(sin código)'}${newContainerNumber.trim() ? ` (${newContainerNumber.trim().toUpperCase()})` : ' (S/N)'} (Nuevo contenedor)`
              : sortedContenedores.find((item) => String(item.id) === selectedContenedor)?.codigo_contenedor ?? 'Sin asignar'}
          </p>
          {selectedContenedorEsSurtido && selectedContenedorObj && (
            <Badge
              variant="outline"
              className="mt-1 border-yellow-400 bg-yellow-100 text-xs text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100"
            >
              <AlertTriangle className="mr-1 h-3 w-3" /> Ya surtido ({selectedContenedorObj.estado})
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-bold text-muted-foreground">Estado de la orden interpretada</span>
          <p className="text-sm font-semibold text-foreground">
            <Badge variant="outline" className="border-gray-200 bg-gray-100 text-gray-800">
              {parsedData?.orden.estado ?? 'Pendiente de revision'}
            </Badge>
          </p>
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-bold text-muted-foreground">Total piezas</span>
          <p className="text-sm font-semibold text-foreground">
            {totalPiezasCount.toLocaleString()}
            {parsedData?.orden.total_piezas ? (
              <span className="ml-2 text-[10px] text-muted-foreground">
                (JSON: {parsedData.orden.total_piezas.toLocaleString()})
              </span>
            ) : null}
          </p>
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-bold text-muted-foreground">CBM total</span>
          <p className="text-sm font-semibold text-foreground">
            {totalCbm.toFixed(6)} m3
            {parsedData?.orden.cbm_estimado ? (
              <span className="ml-2 text-[10px] text-muted-foreground">
                (JSON: {parsedData.orden.cbm_estimado.toFixed(6)} m3)
              </span>
            ) : null}
          </p>
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-bold text-muted-foreground">Peso bruto total</span>
          <p className="text-sm font-semibold text-foreground">
            {totalPesoBruto.toFixed(3)} kg
            {parsedData?.orden.peso_bruto_total_kg ? (
              <span className="ml-2 text-[10px] text-muted-foreground">
                (JSON: {parsedData.orden.peso_bruto_total_kg.toFixed(3)} kg)
              </span>
            ) : null}
          </p>
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-bold text-muted-foreground">Guardado final</span>
          <p className="text-sm text-muted-foreground">
            Pendiente para la siguiente fase. Esta pantalla solo confirma la revision.
          </p>
        </div>
      </div>

      {/* Tabla de auditoría */}
      <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">Resumen de Auditoría y Control de Diferencias</h3>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary font-mono text-xs">
            Comparación: Calculado por Cajas vs Nota
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[10px]">
                <th className="py-2.5 px-3 text-left font-bold">Métrica</th>
                <th className="py-2.5 px-3 text-right font-bold">Calculado por Cajas (en vivo)</th>
                <th className="py-2.5 px-3 text-right font-bold">Valor de la Nota (Objetivo)</th>
                <th className="py-2.5 px-3 text-right font-bold">Diferencia</th>
                <th className="py-2.5 px-3 text-center font-bold">Estado</th>
                <th className="py-2.5 px-3 text-center font-bold">Acción Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {metricas.map((m) => {
                const hasTarget = m.target != null
                const diff = hasTarget ? m.calc - m.target! : 0
                const isMatch = !hasTarget || Math.abs(diff) < 0.001

                return (
                  <tr key={m.label} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{m.label}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{m.fmt(m.calc)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{hasTarget ? m.fmt(m.target!) : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {!hasTarget ? (
                        '—'
                      ) : (
                        <span className={isMatch ? 'text-emerald-600 font-medium' : 'text-amber-600 font-bold'}>
                          {diff > 0 ? `+${m.fmt(diff)}` : m.fmt(diff)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {!hasTarget ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Sin nota
                        </Badge>
                      ) : isMatch ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                          ✓ Coincide
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-[10px] font-bold">
                          ⚠️ Discrepancia
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {hasTarget && !isMatch ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-bold"
                          onClick={m.sync}
                        >
                          Alinear a Calculado
                        </Button>
                      ) : isMatch ? (
                        <span className="text-[10px] text-emerald-600 font-medium">✓ Alineado</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/80 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-700" />
            <span className="text-xs font-bold text-yellow-900">
              {warnings.length} aviso{warnings.length !== 1 ? 's' : ''} del sistema
              {warnings.filter((w) => (w as Record<string, unknown>).severidad === 'alta').length > 0 && (
                <span className="ml-1.5 text-destructive">
                  ({warnings.filter((w) => (w as Record<string, unknown>).severidad === 'alta').length} altos)
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-auto"
              onClick={onToggleWarnings}
              title={showWarnings ? 'Ocultar detalle' : 'Ver detalle'}
            >
              {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {showWarnings && (
            <div className="space-y-1 mt-2">
              {warnings.map((warning, index) => (
                <p key={`summary-warning-${index}`} className="text-xs text-yellow-900">
                  {warning.mensaje ?? warning.detalle ?? 'n8n devolvio una advertencia sin detalle.'}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {(coloresNuevos.length > 0 || coloresOmitidos.length > 0) && (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50/70 p-3 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
              🎨 {coloresNuevos.length} color{coloresNuevos.length !== 1 ? 'es' : ''} nuevo
              {coloresNuevos.length !== 1 ? 's' : ''} por crear
              {coloresOmitidos.length > 0 && (
                <span className="ml-1.5 text-destructive">
                  ({coloresOmitidos.length} omitido{coloresOmitidos.length !== 1 ? 's' : ''}: bloquearán el guardado)
                </span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              {coloresPorConfirmar
                .filter((c) => c.estado === 'nuevo')
                .slice(0, 6)
                .map((c) => c.raw)
                .join(' · ')}
            </span>
            <Button type="button" size="sm" className="h-7 text-[11px] font-bold ml-auto" onClick={onOpenColoresModal}>
              Revisar colores
            </Button>
          </div>
        </div>
      )}

      <Dialog open={overrideModal !== null} onOpenChange={(open) => { if (!open) onCloseOverrideModal() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Valor objetivo: {overrideModal?.label}</DialogTitle>
            <DialogDescription>
              Sobrescribe el total de la nota para comparar contra lo calculado. Vacío = quitar override.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            step="any"
            min="0"
            value={overrideValor}
            onChange={(e) => onOverrideValorChange(e.target.value)}
            autoFocus
            className="h-9 tabular-nums"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAplicarOverride()
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCloseOverrideModal}>
              Cancelar
            </Button>
            <Button type="button" onClick={onAplicarOverride} className="font-bold">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
