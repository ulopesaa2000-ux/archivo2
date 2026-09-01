// app/(admin)/contenedores/[id]/components/ResumenContenedorModal.tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileSpreadsheet,
  Download,
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchContenedorReporteResumen } from '@/modules/contenedores/queries'
import { guardarResumenContenedorAction } from '@/modules/contenedores/actions'
import { generarExcelResumenContenedor } from '@/modules/contenedores/exportarResumenExcel'
import type { ResumenContenedorData, ResumenItemData } from '@/modules/contenedores/types'

const IMPORTADORES_SUGERIDOS = ['VARDIT', 'ABRAHAM', 'ILAN', 'ARIEL']

export function ResumenContenedorModal({
  contenedorId,
  codigoContenedor,
}: {
  contenedorId: number
  codigoContenedor: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, startSaving] = useTransition()
  const [exporting, setExporting] = useState(false)
  const [data, setData] = useState<ResumenContenedorData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchContenedorReporteResumen(contenedorId)
      if (!res) {
        setError('No se pudo cargar la información del contenedor.')
        return
      }
      setData(res)
    } catch (err: any) {
      setError(err?.message || 'Error cargando datos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, contenedorId])

  // Actualizar campo de cabecera
  const handleHeaderChange = (field: keyof ResumenContenedorData, value: any) => {
    if (!data) return
    setData({
      ...data,
      [field]: value,
    })
  }

  // Actualizar campo de un item
  const handleItemChange = (itemId: string, field: keyof ResumenItemData, value: any) => {
    if (!data) return
    const updatedItems = data.items.map((it) => {
      if (it.id !== itemId) return it
      const updated = { ...it, [field]: value }

      // Recalcular piezas totales e importe si cambian cajas, pz/caja, precio o piezasTotales
      let piezasTotales = it.piezasTotales
      if (field === 'piezasTotales') {
        piezasTotales = Number(value) || 0
      } else if (field === 'totalCajas' || field === 'piezasPorCaja') {
        const totalCajas = field === 'totalCajas' ? Number(value) || 0 : it.totalCajas
        const pzCaja = field === 'piezasPorCaja' ? Number(value) || 0 : it.piezasPorCaja
        piezasTotales = totalCajas * pzCaja
      }

      const precio = field === 'precioUsd' ? Number(value) || 0 : it.precioUsd
      const importeTotal = Number((piezasTotales * precio).toFixed(2))

      return {
        ...updated,
        piezasTotales,
        importeTotal,
      }
    })

    setData({
      ...data,
      items: updatedItems,
    })
  }

  // Guardar en Base de Datos
  const handleSave = () => {
    if (!data) return
    startSaving(async () => {
      const res = await guardarResumenContenedorAction({
        contenedorId: data.contenedorId,
        numeroContenedor: data.numeroContenedor,
        fechaSalidaBl: data.fechaSalidaBl,
        naviera: data.naviera,
        buque: data.buque,
        importador: data.importador,
        pagador: data.pagador,
        puertoOrigen: data.puertoOrigen,
        puertoDestino: data.puertoDestino,
        costoDesaduanamiento: data.costoDesaduanamiento,
        costoIsf: data.costoIsf,
        costoFleteMaritimo: data.costoFleteMaritimo,
        balance: data.balance,
        demoras: data.demoras,
        almacenajes: data.almacenajes,
        fechaLlegadaAlmacen: data.fechaLlegadaAlmacen,
        items: data.items.map((it) => ({
          productoId: it.productoId,
          ordenDetalleId: it.ordenDetalleId,
          composicion: it.composicion,
          precioUsd: it.precioUsd,
          piezasPorCaja: it.piezasPorCaja,
          totalCajas: it.totalCajas,
          cbm: it.cbm,
        })),
      })

      if (res.success) {
        toast.success('Información guardada exitosamente en la base de datos.')
      } else {
        toast.error(res.error || 'Error al guardar los cambios.')
      }
    })
  }

  // Descargar Excel
  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    try {
      await generarExcelResumenContenedor(data)
      toast.success('Archivo Excel generado y descargado correctamente.')
    } catch (err: any) {
      console.error(err)
      toast.error('Error al generar el archivo Excel: ' + (err?.message || ''))
    } finally {
      setExporting(false)
    }
  }

  // Cálculos de totales
  const totalPiezas = (data?.items || []).reduce((acc, it) => acc + (it.piezasTotales || 0), 0)
  const totalCajas = (data?.items || []).reduce((acc, it) => acc + (it.totalCajas || 0), 0)
  const totalUsd = (data?.items || []).reduce((acc, it) => acc + (it.importeTotal || 0), 0)
  const diferencia = totalUsd - (data?.balance || 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="h-9 gap-1.5 font-medium">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Resumen Packing / Excel</span>
          </Button>
        }
      />

      <DialogContent className="w-full sm:max-w-[94vw] max-w-7xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Encabezado del Modal */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Resumen de Contenedor & Packing List
                <Badge variant="secondary" className="font-mono text-xs">
                  {codigoContenedor}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Previsualiza, edita datos faltantes (precios, composición, importador, fletes) y descarga el formato Excel oficial.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-8 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Recargar
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Consolidando información del contenedor, órdenes y packs...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* SECCIÓN 1: DATOS DE CABECERA LOGÍSTICA / BL */}
              <div className="bg-card border rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    1. Información de Cabecera B/L y Logística
                  </h4>
                  <span className="text-xs text-muted-foreground italic">
                    Corresponde a las filas 1 y 2 del Excel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* B1: N° Contenedor */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">N° Contenedor (B1)</Label>
                    <Input
                      value={data.numeroContenedor || ''}
                      onChange={(e) => handleHeaderChange('numeroContenedor', e.target.value)}
                      placeholder="ej. HAMU1553617"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* C2: Fecha Salida BL */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Fecha de Salida BL (C2)</Label>
                    <Input
                      type="date"
                      value={data.fechaSalidaBl ? data.fechaSalidaBl.slice(0, 10) : ''}
                      onChange={(e) => handleHeaderChange('fechaSalidaBl', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Importador (D2) */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Importador / Agente</Label>
                    <Input
                      list="importadores-list"
                      value={data.importador || ''}
                      onChange={(e) => handleHeaderChange('importador', e.target.value)}
                      placeholder="ej. VARDIT, ABRAHAM, ILAN..."
                      className="h-8 text-xs"
                    />
                    <datalist id="importadores-list">
                      {IMPORTADORES_SUGERIDOS.map((imp) => (
                        <option key={imp} value={imp} />
                      ))}
                    </datalist>
                  </div>

                  {/* Pagador */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pagador</Label>
                    <Input
                      list="pagadores-list"
                      value={data.pagador || ''}
                      onChange={(e) => handleHeaderChange('pagador', e.target.value)}
                      placeholder="ej. VARDIT, ABRAHAM..."
                      className="h-8 text-xs"
                    />
                    <datalist id="pagadores-list">
                      {IMPORTADORES_SUGERIDOS.map((imp) => (
                        <option key={imp} value={imp} />
                      ))}
                    </datalist>
                  </div>

                  {/* Naviera / Agente */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Naviera / Forwarder</Label>
                    <Input
                      value={data.naviera || ''}
                      onChange={(e) => handleHeaderChange('naviera', e.target.value)}
                      placeholder="ej. SHENZHEN HYT CO., LTD"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Puerto Destino */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Puerto Destino (D2)</Label>
                    <Input
                      value={data.puertoDestino || ''}
                      onChange={(e) => handleHeaderChange('puertoDestino', e.target.value)}
                      placeholder="ej. PUERTO LAREDO / LAZARO CARDENAS"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* E2: Desaduanamiento */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Desaduanamiento / Pasada (E2)
                    </Label>
                    <Input
                      type="number"
                      value={data.costoDesaduanamiento ?? ''}
                      onChange={(e) =>
                        handleHeaderChange(
                          'costoDesaduanamiento',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="ej. 20000 o 515000"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* F2: ISF */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      ISF USD (F2)
                    </Label>
                    <Input
                      type="number"
                      value={data.costoIsf ?? ''}
                      onChange={(e) =>
                        handleHeaderChange(
                          'costoIsf',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="ej. 350"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* G2: Flete Marítimo */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Flete Marítimo USD (G2)
                    </Label>
                    <Input
                      type="number"
                      value={data.costoFleteMaritimo ?? ''}
                      onChange={(e) =>
                        handleHeaderChange(
                          'costoFleteMaritimo',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="ej. 5950"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {/* Buque / Viaje */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Buque / Viaje</Label>
                    <Input
                      value={data.buque || ''}
                      onChange={(e) => handleHeaderChange('buque', e.target.value)}
                      placeholder="ej. NAVIOS JASMINE/614N"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Puerto Origen */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Puerto Origen</Label>
                    <Input
                      value={data.puertoOrigen || ''}
                      onChange={(e) => handleHeaderChange('puertoOrigen', e.target.value)}
                      placeholder="ej. XIAMEN, CHINA"
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Resumen Prendas (Col B Header) */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Resumen de Prendas (Encabezado B)</Label>
                    <Input
                      value={data.resumenPrendasTitulo || ''}
                      onChange={(e) => handleHeaderChange('resumenPrendasTitulo', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: TABLA EDITABLE DE PRODUCTOS Y PACKS */}
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm space-y-2">
                <div className="p-4 bg-muted/40 border-b flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      2. Desglose de Modelos, Cajas, Precios y Totales
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Puedes modificar los precios unitarios o la composición; se recalcularán los importes automáticamente.
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {data.items.length} Renglones
                  </Badge>
                </div>

                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-secondary text-secondary-foreground font-semibold border-b z-10">
                      <tr>
                        <th className="p-2 w-12 text-center">#</th>
                        <th className="p-2 w-16 text-center">Foto</th>
                        <th className="p-2 w-44">Modelo</th>
                        <th className="p-2 min-w-[200px]">Descripción</th>
                        <th className="p-2 w-48">Composición</th>
                        <th className="p-2 w-24 text-right">Cajas</th>
                        <th className="p-2 w-24 text-right">Pz/Caja</th>
                        <th className="p-2 w-28 text-right bg-muted/50">Piezas Tot.</th>
                        <th className="p-2 w-28 text-right">Precio USD</th>
                        <th className="p-2 w-32 text-right bg-muted/50 font-bold">Importe USD</th>
                        <th className="p-2 w-24 text-right">CBM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-muted-foreground">
                            No se encontraron productos u órdenes asociadas a este contenedor.
                          </td>
                        </tr>
                      ) : (
                        data.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            {/* Control */}
                            <td className="p-2 text-center text-muted-foreground font-mono">
                              {idx + 1}
                            </td>

                            {/* Foto Thumbnail */}
                            <td className="p-2 text-center">
                              {item.imagenUrl ? (
                                <img
                                  src={item.imagenUrl}
                                  alt={item.modelo}
                                  className="h-10 w-10 object-cover rounded border mx-auto"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded border border-dashed flex items-center justify-center text-muted-foreground mx-auto bg-muted/20">
                                  <ImageIcon className="h-4 w-4 opacity-40" />
                                </div>
                              )}
                            </td>

                            {/* Modelo */}
                            <td className="p-2 font-bold font-mono text-foreground">
                              {item.modelo}
                            </td>

                            {/* Descripción */}
                            <td className="p-2 text-muted-foreground line-clamp-2 max-w-[250px]" title={item.descripcion}>
                              {item.descripcion}
                            </td>

                            {/* Composición editable */}
                            <td className="p-2">
                              <Input
                                value={item.composicion || ''}
                                onChange={(e) => handleItemChange(item.id, 'composicion', e.target.value)}
                                placeholder="ej. 100% POLIESTER"
                                className="h-7 text-xs"
                              />
                            </td>

                            {/* Total Cajas editable */}
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                value={item.totalCajas}
                                onChange={(e) => handleItemChange(item.id, 'totalCajas', e.target.value)}
                                className="h-7 w-20 text-right text-xs font-mono ml-auto"
                              />
                            </td>

                            {/* Pz/Caja editable */}
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                value={item.piezasPorCaja}
                                onChange={(e) => handleItemChange(item.id, 'piezasPorCaja', e.target.value)}
                                className="h-7 w-20 text-right text-xs font-mono ml-auto"
                              />
                            </td>

                            {/* Piezas Totales */}
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                value={item.piezasTotales}
                                onChange={(e) => handleItemChange(item.id, 'piezasTotales', e.target.value)}
                                className="h-7 w-24 text-right text-xs font-mono font-semibold ml-auto bg-muted/40"
                              />
                            </td>

                            {/* Precio USD editable */}
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.precioUsd}
                                onChange={(e) => handleItemChange(item.id, 'precioUsd', e.target.value)}
                                className="h-7 w-24 text-right text-xs font-mono ml-auto font-semibold"
                              />
                            </td>

                            {/* Importe Total USD */}
                            <td className="p-2 text-right font-mono font-bold text-foreground bg-muted/30">
                              ${item.importeTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* CBM */}
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                step="0.001"
                                value={item.cbm}
                                onChange={(e) => handleItemChange(item.id, 'cbm', Number(e.target.value))}
                                className="h-7 w-20 text-right text-xs font-mono ml-auto"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECCIÓN 3: TOTALES, BALANCE Y DIFERENCIA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extras Imprimibles */}
                <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    3. Notas Logísticas Adicionales (Extras)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Demoras</Label>
                      <Input
                        value={data.demoras || ''}
                        onChange={(e) => handleHeaderChange('demoras', e.target.value)}
                        placeholder="Notas demoras"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Almacenajes</Label>
                      <Input
                        value={data.almacenajes || ''}
                        onChange={(e) => handleHeaderChange('almacenajes', e.target.value)}
                        placeholder="Notas almacén"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fecha Llegada Almacén</Label>
                      <Input
                        type="date"
                        value={data.fechaLlegadaAlmacen ? data.fechaLlegadaAlmacen.slice(0, 10) : ''}
                        onChange={(e) => handleHeaderChange('fechaLlegadaAlmacen', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen de Totales y Balance */}
                <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    4. Resumen de Totales y Balance
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-muted/40 p-2.5 rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Cajas</div>
                      <div className="text-base font-bold font-mono">{totalCajas.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/40 p-2.5 rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Piezas</div>
                      <div className="text-base font-bold font-mono">{totalPiezas.toLocaleString()}</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-700 dark:text-emerald-400">
                      <div className="text-xs font-semibold">Total Importe USD</div>
                      <div className="text-base font-bold font-mono">
                        ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Balance Registrado (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={data.balance ?? ''}
                        onChange={(e) =>
                          handleHeaderChange(
                            'balance',
                            e.target.value === '' ? 0 : Number(e.target.value)
                          )
                        }
                        placeholder="0.00"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Diferencia (Total - Balance)</Label>
                      <div className={`h-8 flex items-center px-3 rounded-md font-mono text-xs font-bold border ${
                        diferencia < 0 ? 'text-destructive bg-destructive/10 border-destructive/20' : 'text-foreground bg-muted/40'
                      }`}>
                        ${diferencia.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer con Acciones */}
        <DialogFooter className="p-4 border-t bg-muted/30 shrink-0 flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cerrar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || !data}
              className="gap-1.5"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Guardar en Base de Datos</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={exporting || loading || !data}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>Descargar Excel (.xlsx)</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
