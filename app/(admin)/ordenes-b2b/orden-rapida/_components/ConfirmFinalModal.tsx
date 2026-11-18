// app/(admin)/ordenes-b2b/orden-rapida/_components/ConfirmFinalModal.tsx
'use client'

import type { Dispatch, SetStateAction } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Package,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import type { PersonaRow } from '@/lib/types/tables'
import type {
  AlertaN8nLocal,
  ColorPorConfirmar,
  ContainerMock,
  ErrorSubida,
  WizardCaja,
  WizardProducto,
} from '../_hooks/orden-rapida-types'

interface VerificacionPreviaSummary {
  matchOk: boolean
  fallasMatch: number
  matchPacksOk: boolean
  fallasPacks: number
  sinPz: string[]
  conPrincipal: number
  totalProductos: number
  totalCajas: number
  coloresPendientes: number
  todoOk: boolean
}

interface ResumenSkuPack {
  pack: string
  linea: number
  armadas: number
  piezas: number
  dif: number
  ok: boolean
  editada: boolean
}

interface ResumenSkuFila {
  sku: string
  pzc: number
  linea: number
  armadas: number
  dif: number
  ok: boolean
  editada: boolean
  principalCodigo: string | null
  packs: ResumenSkuPack[]
}

interface ConfirmFinalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  verificadoOk: boolean
  verificacionManual: { hash: string; ok: boolean; fecha: number } | null
  necesitaReverificar: boolean
  onVerificarLocal: () => void
  erroresBloqueantes: ErrorSubida[]
  advertenciasSubida: ErrorSubida[]
  mostrarErroresSubida: boolean
  onToggleMostrarErrores: () => void
  mostrarAdvertenciasSubida: boolean
  onToggleMostrarAdvertencias: () => void
  verificacionPrevia: VerificacionPreviaSummary
  onFijarPzMinima: () => void
  alertasN8n: AlertaN8nLocal[]
  auditoriaN8n: Record<string, unknown> | null
  coloresAmbar: ColorPorConfirmar[]
  onOpenColoresModal: () => void
  onIrACorregir: (e: ErrorSubida) => void
  codigoRenameDrafts: Record<string, string>
  onSetCodigoRenameDrafts: Dispatch<SetStateAction<Record<string, string>>>
  onRenombrarCodigoEnModal: (viejo: string, nuevo: string) => void
  modalLineaDrafts: Record<string, string>
  onSetModalLineaDrafts: Dispatch<SetStateAction<Record<string, string>>>
  lineaEsperada: (sku: string) => number
  onSetLineaEditadaPorSku: Dispatch<SetStateAction<Record<string, number>>>
  modalPackDrafts: Record<string, string>
  onSetModalPackDrafts: Dispatch<SetStateAction<Record<string, string>>>
  lineaPackEsperada: (sku: string, pack: string) => number
  onSetLineaEditadaPorPack: Dispatch<SetStateAction<Record<string, number>>>
  modalCajaNumDrafts: Record<string, string>
  onSetModalCajaNumDrafts: Dispatch<SetStateAction<Record<string, string>>>
  editableCajas: WizardCaja[]
  onAjustarCajaNumero: (codigo: string, campo: 'cantidad_cajas' | 'piezas_por_caja', val: string) => void
  proveedores: PersonaRow[]
  selectedProveedor: string
  selectedProveedorObj: PersonaRow | undefined
  onProveedorChange: (id: string) => void
  selectedCliente: string
  selectedClienteObj: PersonaRow | undefined
  selectedContenedor: string
  newContainerCode: string
  newContainerNumber: string
  selectedContenedorObj: ContainerMock | undefined
  editableProductos: WizardProducto[]
  totalCajasCount: number
  totalPiezasCount: number
  resumenSku: { filas: ResumenSkuFila[]; totalCajas: number; todoOk: boolean }
  isPending: boolean
  onConfirmGuardar: () => void
}

export function ConfirmFinalModal({
  open,
  onOpenChange,
  verificadoOk,
  verificacionManual,
  necesitaReverificar,
  onVerificarLocal,
  erroresBloqueantes,
  advertenciasSubida,
  mostrarErroresSubida,
  onToggleMostrarErrores,
  mostrarAdvertenciasSubida,
  onToggleMostrarAdvertencias,
  verificacionPrevia,
  onFijarPzMinima,
  alertasN8n,
  auditoriaN8n,
  coloresAmbar,
  onOpenColoresModal,
  onIrACorregir,
  codigoRenameDrafts,
  onSetCodigoRenameDrafts,
  onRenombrarCodigoEnModal,
  modalLineaDrafts,
  onSetModalLineaDrafts,
  lineaEsperada,
  onSetLineaEditadaPorSku,
  modalPackDrafts,
  onSetModalPackDrafts,
  lineaPackEsperada,
  onSetLineaEditadaPorPack,
  modalCajaNumDrafts,
  onSetModalCajaNumDrafts,
  editableCajas,
  onAjustarCajaNumero,
  proveedores,
  selectedProveedor,
  selectedProveedorObj,
  onProveedorChange,
  selectedCliente,
  selectedClienteObj,
  selectedContenedor,
  newContainerCode,
  newContainerNumber,
  selectedContenedorObj,
  editableProductos,
  totalCajasCount,
  totalPiezasCount,
  resumenSku,
  isPending,
  onConfirmGuardar,
}: ConfirmFinalModalProps) {
  const rellenadosArr = Array.isArray(auditoriaN8n?.rellenados) ? auditoriaN8n!.rellenados : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Corroborar Proveedor y Guardar Orden B2B
          </DialogTitle>
          <DialogDescription className="text-xs">
            Antes de registrar la orden en Supabase, corrobora la asignación de socios comerciales para los productos,
            cajas y orden de compra.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 py-2 text-xs">
          <div className="space-y-4 min-w-0">
            {/* 0. Verificación pre-guardado */}
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Verificación: cajas correctas y pz por caja
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={verificadoOk ? 'default' : 'outline'}
                  onClick={onVerificarLocal}
                  className="ml-auto h-7 text-[11px] font-bold gap-1.5"
                  title="Escanea restricciones DB (SKU/códigos/pz/cantidades/matriz/colores/match/socios) y habilita la carga final solo si no hay bloqueantes"
                >
                  <ScanSearch className="h-3.5 w-3.5" />{' '}
                  {verificacionManual && !necesitaReverificar ? 'Re-verificar local' : 'Verificar local'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {verificadoOk ? (
                  <Badge className="bg-emerald-600 text-white font-bold gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verificado OK · 0 bloqueantes
                    {advertenciasSubida.length > 0 ? ` · ${advertenciasSubida.length} advertencia(s)` : ''}
                  </Badge>
                ) : verificacionManual && !necesitaReverificar ? (
                  <Badge variant="destructive" className="font-bold gap-1">
                    <AlertTriangle className="h-3 w-3" /> {erroresBloqueantes.length} bloqueo(s) · corrige abajo
                  </Badge>
                ) : verificacionManual && necesitaReverificar ? (
                  <Badge variant="outline" className="font-bold border-amber-500 text-amber-700 gap-1">
                    <RefreshCw className="h-3 w-3" /> Cambios detectados · vuelve a verificar
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-bold gap-1">
                    <ScanSearch className="h-3 w-3" /> Sin verificar · pulsa Verificar local
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  En vivo: {erroresBloqueantes.length} bloqueo(s)
                  {advertenciasSubida.length > 0 ? ` · ${advertenciasSubida.length} advertencia(s)` : ''} ahora mismo.
                </span>
                {(mostrarErroresSubida || erroresBloqueantes.length > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] font-bold underline"
                    onClick={onToggleMostrarErrores}
                  >
                    {mostrarErroresSubida ? 'Ocultar detalle' : `Ver detalle (${erroresBloqueantes.length})`}
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.matchOk ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className={verificacionPrevia.matchOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    Match líneas vs cajas armadas (exacto)
                    {!verificacionPrevia.matchOk && ` — ${verificacionPrevia.fallasMatch} sin match`}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.matchPacksOk ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className={verificacionPrevia.matchPacksOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>
                    Match por pack (PACK A/B del mismo SKU)
                    {!verificacionPrevia.matchPacksOk && ` — ${verificacionPrevia.fallasPacks} sin match`}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.sinPz.length === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={
                      verificacionPrevia.sinPz.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'
                    }
                  >
                    Todas las cajas con pz por caja
                    {verificacionPrevia.sinPz.length > 0 &&
                      ` — sin dato: ${verificacionPrevia.sinPz.slice(0, 5).join(', ')}${verificacionPrevia.sinPz.length > 5 ? ` +${verificacionPrevia.sinPz.length - 5}` : ''}`}
                  </span>
                  {verificacionPrevia.sinPz.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100 ml-auto"
                      onClick={onFijarPzMinima}
                      title="Asigna 1 pza/caja temporal a las cajas sin dato para no romper la lógica (revísalas después en su tarjeta)"
                    >
                      Fijar 1 pza ({verificacionPrevia.sinPz.length})
                    </Button>
                  )}
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {advertenciasSubida.length === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span
                    className={
                      advertenciasSubida.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                    }
                  >
                    {advertenciasSubida.length === 0
                      ? 'Todas las cajas con desglose talla/color'
                      : `${advertenciasSubida.length} caja(s) con matriz vacía (0 detalles talla/color) — no bloquea el guardado`}
                  </span>
                  {advertenciasSubida.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] font-bold text-amber-800 dark:text-amber-300 underline ml-auto"
                      onClick={onToggleMostrarAdvertencias}
                    >
                      {mostrarAdvertenciasSubida ? 'Ocultar advertencias' : `Ver advertencias (${advertenciasSubida.length})`}
                    </Button>
                  )}
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {alertasN8n.length === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className={alertasN8n.length === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}>
                    Alertas n8n: {alertasN8n.length === 0 ? 'ninguna' : `${alertasN8n.length} (informativas)`}
                    {rellenadosArr.length > 0 && ` · 🤖 ${rellenadosArr.length} autocompletada(s) en origen`}
                    {auditoriaN8n && ` · match origen ${auditoriaN8n.match_ok ? 'OK' : 'con diffs'}`}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.totalProductos > 0 && verificacionPrevia.totalCajas > 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={
                      verificacionPrevia.totalProductos > 0 && verificacionPrevia.totalCajas > 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-destructive'
                    }
                  >
                    {verificacionPrevia.totalProductos} productos · {verificacionPrevia.totalCajas} cajas · principal en{' '}
                    {verificacionPrevia.conPrincipal}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[11px] font-semibold">
                  {verificacionPrevia.coloresPendientes === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span
                    className={
                      verificacionPrevia.coloresPendientes === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'
                    }
                  >
                    Colores con id cat_colores (FK)
                    {verificacionPrevia.coloresPendientes === 0
                      ? coloresAmbar.length > 0
                        ? ` — ${coloresAmbar.length} ambar auto (no bloquea)`
                        : ' — todos vinculados'
                      : ` — ${verificacionPrevia.coloresPendientes} sin resolver`}
                  </span>
                  {verificacionPrevia.coloresPendientes > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-bold border-amber-500 text-amber-800 hover:bg-amber-100 ml-auto"
                      onClick={onOpenColoresModal}
                    >
                      Abrir colores ({verificacionPrevia.coloresPendientes})
                    </Button>
                  )}
                </p>
                {!verificacionPrevia.todoOk && (
                  <p className="text-[11px] italic text-muted-foreground">
                    Corrige lo marcado para habilitar el guardado. El match de cajas no admite diferencias.
                  </p>
                )}
              </div>

              {(mostrarErroresSubida || erroresBloqueantes.length > 0) && (
                <div className="space-y-1.5 rounded-md border border-destructive/30 bg-background/80 p-2.5 max-h-[300px] overflow-y-auto">
                  <p className="text-[10px] font-black uppercase tracking-wider text-destructive flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" /> Restricciones DB que bloquean la subida ({erroresBloqueantes.length})
                  </p>
                  {erroresBloqueantes.length === 0 ? (
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Sin bloqueantes. Pulsa Verificar local para habilitar la carga.
                    </p>
                  ) : (
                    erroresBloqueantes.slice(0, 30).map((e) => (
                      <div key={e.id} className="rounded border border-border/60 bg-muted/20 px-2 py-1.5 space-y-1">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold leading-snug">{e.mensaje}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {e.codigo} · paso {e.paso} · Fix: {e.fix}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] font-bold shrink-0"
                            onClick={() => onIrACorregir(e)}
                            title={`Ir a paso ${e.paso} a corregir`}
                          >
                            Ir a corregir
                          </Button>
                        </div>
                        {(e.codigo === 'CODIGO_DUPLICADO' || e.codigo === 'CODIGO_VACIO') && e.codigoCaja && (
                          <div className="flex items-center gap-1.5 pl-5">
                            <Input
                              value={codigoRenameDrafts[e.codigoCaja] ?? e.codigoCaja}
                              onChange={(ev) =>
                                onSetCodigoRenameDrafts((prev) => ({
                                  ...prev,
                                  [e.codigoCaja as string]: ev.target.value.toUpperCase(),
                                }))
                              }
                              className="h-7 font-mono text-[11px] uppercase"
                              placeholder="NUEVO-CODIGO"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px] font-bold"
                              onClick={() =>
                                onRenombrarCodigoEnModal(
                                  e.codigoCaja as string,
                                  codigoRenameDrafts[e.codigoCaja as string] ?? ''
                                )
                              }
                            >
                              Guardar código
                            </Button>
                          </div>
                        )}
                        {e.codigo === 'MATCH_CAJAS_DIF' && e.sku && (
                          <div className="flex items-center gap-1.5 pl-5">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={modalLineaDrafts[e.sku.toUpperCase()] ?? String(lineaEsperada(e.sku))}
                              onChange={(ev) =>
                                onSetModalLineaDrafts((prev) => ({
                                  ...prev,
                                  [String(e.sku).toUpperCase()]: ev.target.value,
                                }))
                              }
                              className="h-7 w-20 text-right font-mono text-[11px]"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px] font-bold"
                              onClick={() => {
                                const v = parseInt(modalLineaDrafts[String(e.sku).toUpperCase()] ?? '', 10)
                                if (isNaN(v) || v < 0) {
                                  toast.error('Ingresa cajas ≥0.')
                                  return
                                }
                                onSetLineaEditadaPorSku((prev) => ({ ...prev, [String(e.sku).toUpperCase()]: v }))
                                toast.success(`Línea ${e.sku} = ${v}. Vuelve a Verificar local.`)
                              }}
                            >
                              Ajustar línea
                            </Button>
                          </div>
                        )}
                        {e.codigo === 'MATCH_PACK_DIF' && e.sku && e.pack && (
                          <div className="flex items-center gap-1.5 pl-5">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={
                                modalPackDrafts[`${String(e.sku).toUpperCase()}||${String(e.pack).toUpperCase()}`] ??
                                String(lineaPackEsperada(e.sku, e.pack))
                              }
                              onChange={(ev) =>
                                onSetModalPackDrafts((prev) => ({
                                  ...prev,
                                  [`${String(e.sku).toUpperCase()}||${String(e.pack).toUpperCase()}`]: ev.target.value,
                                }))
                              }
                              className="h-7 w-20 text-right font-mono text-[11px]"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-[11px] font-bold"
                              onClick={() => {
                                const k = `${String(e.sku).toUpperCase()}||${String(e.pack).toUpperCase()}`
                                const v = parseInt(modalPackDrafts[k] ?? '', 10)
                                if (isNaN(v) || v < 0) {
                                  toast.error('Ingresa cajas ≥0.')
                                  return
                                }
                                onSetLineaEditadaPorPack((prev) => ({ ...prev, [k]: v }))
                                toast.success(`Línea ${e.sku} · ${e.pack} = ${v}. Vuelve a Verificar local.`)
                              }}
                            >
                              Ajustar pack
                            </Button>
                          </div>
                        )}
                        {(e.codigo === 'SIN_PZ' || e.codigo === 'CANTIDAD_INVALIDA') && e.codigoCaja && (
                          <div className="flex flex-wrap items-center gap-1.5 pl-5">
                            <span className="text-[10px] text-muted-foreground font-mono">{e.codigoCaja}</span>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={
                                modalCajaNumDrafts[`${e.codigoCaja}||cantidad_cajas`] ??
                                String(
                                  editableCajas.find(
                                    (c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === e.codigoCaja
                                  )?.cantidad_cajas ?? ''
                                )
                              }
                              onChange={(ev) =>
                                onSetModalCajaNumDrafts((prev) => ({
                                  ...prev,
                                  [`${e.codigoCaja}||cantidad_cajas`]: ev.target.value,
                                }))
                              }
                              className="h-7 w-20 text-right font-mono text-[11px]"
                              placeholder="cjs"
                              title="Cantidad de cajas"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] font-bold"
                              onClick={() =>
                                onAjustarCajaNumero(
                                  e.codigoCaja as string,
                                  'cantidad_cajas',
                                  modalCajaNumDrafts[`${e.codigoCaja}||cantidad_cajas`] ?? ''
                                )
                              }
                            >
                              Cantidad
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={
                                modalCajaNumDrafts[`${e.codigoCaja}||piezas_por_caja`] ??
                                String(
                                  editableCajas.find(
                                    (c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === e.codigoCaja
                                  )?.piezas_por_caja ?? ''
                                )
                              }
                              onChange={(ev) =>
                                onSetModalCajaNumDrafts((prev) => ({
                                  ...prev,
                                  [`${e.codigoCaja}||piezas_por_caja`]: ev.target.value,
                                }))
                              }
                              className="h-7 w-20 text-right font-mono text-[11px]"
                              placeholder="pz"
                              title="Piezas por caja"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] font-bold"
                              onClick={() =>
                                onAjustarCajaNumero(
                                  e.codigoCaja as string,
                                  'piezas_por_caja',
                                  modalCajaNumDrafts[`${e.codigoCaja}||piezas_por_caja`] ?? ''
                                )
                              }
                            >
                              Pz/caja
                            </Button>
                          </div>
                        )}
                        {e.codigo === 'COLOR_SIN_RESOLVER' && (
                          <div className="pl-5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] font-bold"
                              onClick={onOpenColoresModal}
                            >
                              Abrir colores (mapear/crear)
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {erroresBloqueantes.length > 30 && (
                    <p className="text-[10px] text-muted-foreground italic">
                      +{erroresBloqueantes.length - 30} más. Corrige estos primero y re-verifica.
                    </p>
                  )}
                </div>
              )}

              {advertenciasSubida.length > 0 && mostrarAdvertenciasSubida && (
                <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 max-h-[260px] overflow-y-auto">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Advertencias que NO bloquean la subida ({advertenciasSubida.length})
                  </p>
                  {advertenciasSubida.slice(0, 30).map((adv) => (
                    <div key={adv.id} className="rounded border border-amber-500/30 bg-background/80 px-2 py-1.5 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold leading-snug">{adv.mensaje}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {adv.codigo} · paso {adv.paso} · {adv.fix}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] font-bold shrink-0"
                          onClick={() => onIrACorregir(adv)}
                          title={`Ir a paso ${adv.paso} si deseas llenarla ahora`}
                        >
                          Ir a corregir
                        </Button>
                      </div>
                      {adv.codigoCaja && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-5">
                          <span className="text-[10px] text-muted-foreground font-mono">{adv.codigoCaja}</span>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={
                              modalCajaNumDrafts[`${adv.codigoCaja}||cantidad_cajas`] ??
                              String(
                                editableCajas.find(
                                  (c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === adv.codigoCaja
                                )?.cantidad_cajas ?? ''
                              )
                            }
                            onChange={(ev) =>
                              onSetModalCajaNumDrafts((prev) => ({
                                ...prev,
                                [`${adv.codigoCaja}||cantidad_cajas`]: ev.target.value,
                              }))
                            }
                            className="h-7 w-20 text-right font-mono text-[11px]"
                            placeholder="cjs"
                            title="Cantidad de cajas"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold"
                            onClick={() =>
                              onAjustarCajaNumero(
                                adv.codigoCaja as string,
                                'cantidad_cajas',
                                modalCajaNumDrafts[`${adv.codigoCaja}||cantidad_cajas`] ?? ''
                              )
                            }
                          >
                            Cantidad
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={
                              modalCajaNumDrafts[`${adv.codigoCaja}||piezas_por_caja`] ??
                              String(
                                editableCajas.find(
                                  (c) => String(c.codigo_caja || c.codigo_caja_temporal || '') === adv.codigoCaja
                                )?.piezas_por_caja ?? ''
                              )
                            }
                            onChange={(ev) =>
                              onSetModalCajaNumDrafts((prev) => ({
                                ...prev,
                                [`${adv.codigoCaja}||piezas_por_caja`]: ev.target.value,
                              }))
                            }
                            className="h-7 w-20 text-right font-mono text-[11px]"
                            placeholder="pz"
                            title="Piezas por caja"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold"
                            onClick={() =>
                              onAjustarCajaNumero(
                                adv.codigoCaja as string,
                                'piezas_por_caja',
                                modalCajaNumDrafts[`${adv.codigoCaja}||piezas_por_caja`] ?? ''
                              )
                            }
                          >
                            Pz/caja
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {advertenciasSubida.length > 30 && (
                    <p className="text-[10px] text-muted-foreground italic">
                      +{advertenciasSubida.length - 30} advertencia(s) más.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 1. Proveedor Origen */}
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <Label htmlFor="modal-proveedor" className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                <span>🏢 Proveedor Origen (Asignación obligatoria)</span>
              </Label>
              <Select value={selectedProveedor} onValueChange={(val) => onProveedorChange(val || '')}>
                <SelectTrigger id="modal-proveedor" className="h-9 bg-background font-semibold text-xs border-emerald-300">
                  <span className="truncate text-left flex-1">
                    {selectedProveedorObj?.nombre_completo || 'Selecciona el proveedor...'}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs font-medium">
                      {p.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1 text-[11px] text-emerald-900/90 dark:text-emerald-300/90 pt-1">
                <p>
                  ✓ <strong>Productos (`persona_id`):</strong> Los <strong>{editableProductos.length}</strong> productos nuevos
                  o actualizados se asociarán a <strong>{selectedProveedorObj?.nombre_completo}</strong> como su
                  proveedor/fabricante.
                </p>
                <p>
                  ✓ <strong>Cajas (`proveedor_id`):</strong> Las <strong>{totalCajasCount}</strong> cajas quedarán registradas
                  para este proveedor.
                </p>
                <p>
                  ✓ <strong>Orden B2B (`proveedor_id`):</strong> La cabecera de la orden quedará registrada a nombre de este
                  proveedor.
                </p>
              </div>
            </div>

            {/* 2. Cliente B2B y Contenedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente B2B Destino</span>
                <p className="font-semibold text-foreground truncate">{selectedClienteObj?.nombre_completo || 'No seleccionado'}</p>
                <p className="text-[10px] text-muted-foreground">
                  Guardado como <code className="font-mono">cliente_b2b_id</code> en la orden
                </p>
              </div>

              <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Contenedor Asignado</span>
                <p className="font-mono font-bold text-foreground truncate">
                  {selectedContenedor === 'new'
                    ? `${newContainerCode || '(sin código)'}${newContainerNumber.trim() ? ` (${newContainerNumber.trim().toUpperCase()})` : ' (S/N)'} (Nuevo)`
                    : selectedContenedorObj
                      ? `${selectedContenedorObj.codigo_contenedor} (${selectedContenedorObj.numero_contenedor ?? 'S/N'}) - ${selectedContenedorObj.estado ?? ''}`
                      : 'Sin asignar'}
                </p>
                <p className="text-[10px] text-muted-foreground">Unidad de transporte físico (multi-proveedor)</p>
              </div>
            </div>

            {/* 3. Resumen de Totales */}
            <div className="rounded-lg border bg-card p-3 space-y-2 shadow-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Resumen de carga a registrar</span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="rounded bg-muted/50 p-2">
                  <span className="block text-[10px] text-muted-foreground">SKUs</span>
                  <span className="font-mono font-bold text-sm text-primary">{editableProductos.length}</span>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <span className="block text-[10px] text-muted-foreground">Cajas Físicas</span>
                  <span className="font-mono font-bold text-sm text-primary">{totalCajasCount}</span>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <span className="block text-[10px] text-muted-foreground">Piezas Totales</span>
                  <span className="font-mono font-bold text-sm text-primary">{totalPiezasCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Apartado lateral: resumen por SKU */}
          <aside
            className={`rounded-xl border p-3 space-y-2 h-fit lg:sticky lg:top-0 ${resumenSku.todoOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border bg-muted/20'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" /> Resumen por SKU
              </p>
              {resumenSku.todoOk ? (
                <Badge className="bg-emerald-600 text-white font-bold text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Confirmado
                </Badge>
              ) : (
                <Badge variant="outline" className="font-bold text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-300">
                  Por confirmar
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Lo que irá a la tabla detalles: SKU y sus cajas.</p>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-0.5">
              {resumenSku.filas.map((f) => (
                <div
                  key={f.sku}
                  className={`rounded-lg border px-2.5 py-2 ${f.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold truncate" title={f.sku}>
                      {f.sku}
                    </span>
                    {f.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-black text-destructive shrink-0">{f.dif > 0 ? `+${f.dif}` : f.dif}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    <span>{f.pzc} pz/caja</span>
                    <span>
                      línea <strong className="text-foreground">{f.linea}</strong>
                      {f.editada ? '*' : ''}
                    </span>
                    <span>
                      suma <strong className={f.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}>{f.armadas}</strong>
                    </span>
                  </div>
                  {!f.ok && (
                    <div className="mt-1.5 flex items-center gap-1.5 rounded border border-dashed border-destructive/30 bg-background/70 px-1.5 py-1">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={modalLineaDrafts[f.sku.toUpperCase()] ?? String(f.linea)}
                        onChange={(e) => onSetModalLineaDrafts((prev) => ({ ...prev, [f.sku.toUpperCase()]: e.target.value }))}
                        className="h-6 w-16 text-right font-mono text-[10px]"
                        title="Corregir línea esperada de este SKU"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-6 text-[10px] font-bold px-2"
                        onClick={() => {
                          const v = parseInt(modalLineaDrafts[f.sku.toUpperCase()] ?? '', 10)
                          if (isNaN(v) || v < 0) {
                            toast.error('Ingresa cajas ≥0.')
                            return
                          }
                          onSetLineaEditadaPorSku((prev) => ({ ...prev, [f.sku.toUpperCase()]: v }))
                          onSetModalLineaDrafts((prev) => {
                            const nx = { ...prev }
                            delete nx[f.sku.toUpperCase()]
                            return nx
                          })
                          toast.success(`Línea ${f.sku} = ${v}. Vuelve a Verificar local.`)
                        }}
                      >
                        Línea
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] font-bold"
                        onClick={() =>
                          onIrACorregir({
                            id: `go-${f.sku}`,
                            codigo: 'MATCH_CAJAS_DIF',
                            mensaje: '',
                            paso: 4,
                            sku: f.sku,
                            fix: '',
                          })
                        }
                        title="Abrir este SKU en paso 4 para mover/agregar cajas"
                      >
                        Cajas
                      </Button>
                    </div>
                  )}
                  {f.packs.length > 1 && (
                    <div className="mt-1.5 space-y-1 border-t border-border/50 pt-1.5">
                      {f.packs.map((g) => (
                        <div key={g.pack} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums">
                            <Badge variant="outline" className="font-mono font-bold text-[9px] px-1.5 py-0 h-4">
                              {g.pack}
                            </Badge>
                            <span className="text-muted-foreground">
                              lín <strong className="text-foreground">{g.linea}</strong>
                              {g.editada ? '*' : ''}
                            </span>
                            <span className={g.ok ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'text-destructive font-bold'}>
                              Σ {g.armadas}
                              {g.ok ? ' ✓' : ` (${g.dif > 0 ? `+${g.dif}` : g.dif})`}
                            </span>
                          </div>
                          {!g.ok && (
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={modalPackDrafts[`${f.sku.toUpperCase()}||${g.pack.toUpperCase()}`] ?? String(g.linea)}
                                onChange={(e) =>
                                  onSetModalPackDrafts((prev) => ({
                                    ...prev,
                                    [`${f.sku.toUpperCase()}||${g.pack.toUpperCase()}`]: e.target.value,
                                  }))
                                }
                                className="h-6 w-16 text-right font-mono text-[10px]"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-6 text-[10px] font-bold px-2"
                                onClick={() => {
                                  const k = `${f.sku.toUpperCase()}||${g.pack.toUpperCase()}`
                                  const v = parseInt(modalPackDrafts[k] ?? '', 10)
                                  if (isNaN(v) || v < 0) {
                                    toast.error('Ingresa cajas ≥0.')
                                    return
                                  }
                                  onSetLineaEditadaPorPack((prev) => ({ ...prev, [k]: v }))
                                  onSetModalPackDrafts((prev) => {
                                    const nx = { ...prev }
                                    delete nx[k]
                                    return nx
                                  })
                                  toast.success(`Línea ${f.sku} · ${g.pack} = ${v}. Vuelve a Verificar local.`)
                                }}
                              >
                                Pack
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {resumenSku.filas.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sin productos.</p>}
            </div>
            <div className="border-t border-border/60 pt-2 text-[11px] font-bold flex items-center justify-between tabular-nums">
              <span>{resumenSku.filas.length} productos</span>
              <span>{resumenSku.totalCajas} cajas</span>
            </div>
          </aside>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <div className="mr-auto flex flex-wrap items-center gap-2 text-[10px]">
            {verificadoOk ? (
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Listo para subir a DB
              </span>
            ) : necesitaReverificar && verificacionManual ? (
              <span className="font-bold text-amber-700">Corregiste datos: pulsa Verificar local de nuevo.</span>
            ) : erroresBloqueantes.length > 0 ? (
              <span className="font-bold text-destructive">{erroresBloqueantes.length} bloqueo(s): verifica y corrige.</span>
            ) : (
              <span className="text-muted-foreground">Pulsa Verificar local para habilitar la carga final.</span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Regresar a revisar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onConfirmGuardar()
            }}
            disabled={isPending || !selectedProveedor || !selectedCliente || !verificadoOk}
            title={
              !verificadoOk
                ? necesitaReverificar
                  ? 'Pulsa Verificar local tras cada corrección para habilitar la subida'
                  : `Hay ${erroresBloqueantes.length} bloqueo(s): corrígelos y verifica`
                : 'Subida real a Supabase'
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar y Guardar en Supabase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
