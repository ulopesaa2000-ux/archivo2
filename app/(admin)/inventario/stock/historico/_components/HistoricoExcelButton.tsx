// app/(admin)/inventario/stock/historico/_components/HistoricoExcelButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getReporteKardexHistoricoAction,
  getReporteStockHistoricoAction,
} from '@/modules/inventario/report-actions'
import {
  construirExcelCorte,
  construirExcelKardex,
  type DatosExcelCorte,
  type DatosExcelKardex,
} from '@/lib/inventario/excel-historico'

type Props = {
  vista: 'corte' | 'kardex'
  fechaCorte: string
  desde: string
  hasta: string
  bodegaId?: number | null
  ciudad?: string | null
}

export function HistoricoExcelButton({ vista, fechaCorte, desde, hasta, bodegaId, ciudad }: Props) {
  const [isExporting, setIsExporting] = useState(false)

  const descargar = async () => {
    setIsExporting(true)
    try {
      toast.info('Consultando datos del histórico...')
      const alcance = { bodegaId: bodegaId ?? null, ciudad: ciudad ?? null }

      let buffer: ArrayBuffer
      let nombre: string

      if (vista === 'corte') {
        const res = await getReporteStockHistoricoAction({ fechaCorte, alcance })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        const d = res.corte
        const metaProd = new Map<number, { sku: string; desc: string }>()
        for (const f of d.filas) {
          if (!metaProd.has(f.producto_id)) {
            metaProd.set(f.producto_id, { sku: f.producto_sku, desc: f.producto_descripcion ?? '' })
          }
        }
        const nombreBodega = new Map(d.porBodega.map((b) => [b.bodega_id, b.bodega_nombre]))

        const datos: DatosExcelCorte = {
          fechaCorte: d.fechaCorte,
          filas: d.filas.map((f) => ({
            producto_familia: f.producto_familia,
            producto_sku: f.producto_sku,
            producto_descripcion: f.producto_descripcion,
            marca_nombre: f.marca_nombre,
            pz_en_caja: f.pz_en_caja,
            bodega_nombre: f.bodega_nombre,
            ciudad: f.ciudad,
            cajas_hoy: f.cajas_hoy,
            ajuste: f.ajuste,
            cajas_historicas: f.cajas_historicas,
            n_notas: f.n_notas,
            valor_inconsistente: f.valor_inconsistente,
          })),
          totales: d.totales,
          porBodega: d.porBodega,
          porCiudad: d.porCiudad,
          ajustesDirectos: d.ajustesDirectos,
          notasRevertidas: d.notasRevertidas,
          movimientosRevertidos: d.movimientosRevertidos.map((m) => {
            const p = metaProd.get(m.producto_id)
            const bodegaNombre = nombreBodega.get(m.bodega_origen_id) ?? `Bodega ${m.bodega_origen_id}`
            return {
              fecha_nota: m.fecha_nota,
              fecha_confirmacion: m.fecha_confirmacion,
              numero_nota: m.numero_nota,
              tipo_codigo: m.tipo_codigo,
              estado_codigo: m.estado_codigo,
              bodega_origen_nombre: bodegaNombre,
              bodega_destino_nombre: m.bodega_destino_id != null ? (nombreBodega.get(m.bodega_destino_id) ?? null) : null,
              bodega_nombre: bodegaNombre,
              producto_sku: p?.sku ?? String(m.producto_id),
              producto_descripcion: p?.desc ?? '',
              cajas: m.cajas,
              efecto: m.efecto,
            }
          }),
        }
        buffer = await construirExcelCorte(datos)
        nombre = `Stock_Historico_${fechaCorte}.xlsx`
      } else {
        const res = await getReporteKardexHistoricoAction({ desde, hasta, alcance })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        const k = res.kardex
        const datos: DatosExcelKardex = {
          desde: k.desde,
          hasta: k.hasta,
          filas: k.filas.map((f) => ({
            fecha_nota: f.fecha_nota,
            fecha_confirmacion: f.fecha_confirmacion,
            numero_nota: f.numero_nota,
            tipo_codigo: f.tipo_codigo,
            estado_codigo: f.estado_codigo,
            bodega_origen_nombre: f.bodega_origen_nombre,
            bodega_destino_nombre: f.bodega_destino_nombre,
            bodega_nombre: f.bodega_nombre,
            producto_sku: f.producto_sku,
            producto_descripcion: f.producto_descripcion,
            cajas: f.cajas,
            efecto: f.efecto,
            saldo: f.saldo,
          })),
          totales: k.totales,
          notasDistintas: k.notasDistintas,
          totalFilas: k.totalFilas,
        }
        buffer = await construirExcelKardex(datos)
        nombre = `Movimientos_${desde}_a_${hasta}.xlsx`
      }

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', nombre)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Reporte Excel generado correctamente')
    } catch (e) {
      console.error(e)
      toast.error('Ocurrió un error inesperado al generar el reporte.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={descargar}
      disabled={isExporting}
      className="h-9 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Descargar Excel
        </>
      )}
    </Button>
  )
}
