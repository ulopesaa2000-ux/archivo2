// app/(admin)/inventario/stock/historico/_components/HistoricoExcelButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getReporteKardexHistoricoAction,
  getReporteStockHistoricoAction,
} from '@/modules/inventario/report-actions'
import { construirReporteHistorico } from '@/lib/inventario/excel-reporte-historico'
import type {
  ColumnaExcel,
  DatosExcelHistorico,
  MovimientoExcel,
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

      if (vista === 'kardex') {
        const res = await getReporteKardexHistoricoAction({ desde, hasta, alcance })
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        const k = res.kardex
        const buffer = await construirReporteHistorico({
          modo: 'individual',
          fechaCorte: hasta,
          alcanceLabel: `Movimientos del ${desde} al ${hasta}`,
          tipoColumna: 'bodega',
          columnas: [],
          bodegaAColumna: {},
          filas: [],
          totales: { hoy: 0, ajuste: 0, historicas: k.totales.saldoFinal, entradas: k.totales.entradas, salidas: k.totales.salidas },
          porBodega: [],
          porCiudad: [],
          movimientos: k.filas.map((f) => ({
            fecha_nota: f.fecha_nota,
            fecha_confirmacion: f.fecha_confirmacion,
            numero_nota: f.numero_nota,
            tipo_codigo: f.tipo_codigo,
            estado_codigo: f.estado_codigo,
            bodega_origen_id: f.bodega_origen_id,
            bodega_origen_nombre: f.bodega_origen_nombre,
            bodega_destino_id: f.bodega_destino_id,
            bodega_destino_nombre: f.bodega_destino_nombre,
            producto_id: f.producto_id,
            cajas: f.cajas,
            efecto: f.efecto,
          })),
          ajustesDirectos: [],
          descuadres: [],
          notasRevertidas: k.notasDistintas,
          negativos: 0,
          descripcionesCanonicas: {},
        })
        descargarBuffer(buffer, `Movimientos_${desde}_a_${hasta}.xlsx`)
        toast.success('Reporte Excel generado correctamente')
        return
      }

      const res = await getReporteStockHistoricoAction({ fechaCorte, alcance })
      if (!res.ok) {
        toast.error(res.error)
        return
      }

      const d = res.corte
      const matriz = d.matriz
      let columnas: ColumnaExcel[] = (matriz?.columnas ?? []).map((c) => ({
        key: c.key,
        tipo: c.tipo,
        id: c.id,
        nombre: c.nombre,
        ciudad: c.ciudad,
      }))

      // Nombres de bodega (para la hoja de Movimientos)
      const nombreBodega = new Map<number, string>()
      for (const [id, nombre] of Object.entries(res.nombresBodega ?? {})) {
        nombreBodega.set(Number(id), nombre)
      }
      for (const b of d.porBodega) nombreBodega.set(b.bodega_id, b.bodega_nombre)

      // En vista individual la columna es la propia bodega (para ubicar movimientos).
      if (columnas.length === 0 && d.porBodega.length === 1) {
        const b = d.porBodega[0]
        columnas = [
          {
            key: `b:${b.bodega_id}`,
            tipo: 'bodega',
            id: b.bodega_id,
            nombre: b.bodega_nombre,
            ciudad: b.ciudad,
          },
        ]
      }

      // mapa bodega_id → key de columna (para ubicar cada movimiento).
      const bodegaAColumna: Record<number, string> = {}
      if (columnas.length === 0) {
        for (const b of d.porBodega) bodegaAColumna[b.bodega_id] = `b:${b.bodega_id}`
      } else if (columnas[0].tipo === 'ciudad') {
        for (const b of d.porBodega) {
          const key = `c:${b.ciudad}`
          if (columnas.some((c) => c.key === key)) bodegaAColumna[b.bodega_id] = key
        }
      } else {
        for (const b of d.porBodega) {
          const key = `b:${b.bodega_id}`
          if (columnas.some((c) => c.key === key)) bodegaAColumna[b.bodega_id] = key
        }
      }

      // Entradas / salidas / notas por bodega y por ciudad (para el Resumen)
      const porBodegaExtra = new Map<number, { entradas: number; salidas: number; notas: number }>()
      const porCiudadExtra = new Map<string, { entradas: number; salidas: number; notas: number }>()
      for (const f of d.filas) {
        const pb = porBodegaExtra.get(f.bodega_id) ?? { entradas: 0, salidas: 0, notas: 0 }
        pb.entradas += f.entradas_posteriores
        pb.salidas += f.salidas_posteriores
        pb.notas += f.n_notas
        porBodegaExtra.set(f.bodega_id, pb)

        const pc = porCiudadExtra.get(f.ciudad) ?? { entradas: 0, salidas: 0, notas: 0 }
        pc.entradas += f.entradas_posteriores
        pc.salidas += f.salidas_posteriores
        pc.notas += f.n_notas
        porCiudadExtra.set(f.ciudad, pc)
      }

      // Descripción canónica por familia (mismo criterio que el reporte de Stock)
      const descripcionesCanonicas: Record<string, string> = res.descripcionesCanonicas ?? {}

      const movimientos: MovimientoExcel[] = d.movimientosRevertidos.map((m) => ({
        fecha_nota: m.fecha_nota,
        fecha_confirmacion: m.fecha_confirmacion,
        numero_nota: m.numero_nota,
        tipo_codigo: m.tipo_codigo,
        estado_codigo: m.estado_codigo,
        bodega_origen_id: m.bodega_origen_id,
        bodega_origen_nombre: nombreBodega.get(m.bodega_origen_id) ?? `Bodega ${m.bodega_origen_id}`,
        bodega_destino_id: m.bodega_destino_id,
        bodega_destino_nombre:
          m.bodega_destino_id != null
            ? (nombreBodega.get(m.bodega_destino_id) ?? `Bodega ${m.bodega_destino_id}`)
            : null,
        producto_id: m.producto_id,
        cajas: m.cajas,
        efecto: m.efecto,
      }))

      // Etiqueta del alcance (y del nombre de archivo)
      const alcanceLabel =
        d.modo === 'individual'
          ? (d.porBodega[0]?.bodega_nombre ?? 'Bodega')
          : columnas.length > 0 && columnas[0].tipo === 'ciudad'
            ? columnas.map((c) => c.nombre).join(' + ')
            : (ciudad?.trim() || `Bodegas: ${columnas.map((c) => c.nombre).join(', ')}`)

      const datos: DatosExcelHistorico = {
        modo: d.modo,
        fechaCorte: d.fechaCorte,
        alcanceLabel,
        tipoColumna: columnas[0]?.tipo ?? 'bodega',
        columnas,
        bodegaAColumna,
        filas: d.filas.map((f) => ({
          producto_id: f.producto_id,
          bodega_id: f.bodega_id,
          familia: f.producto_familia,
          sku: f.producto_sku,
          descripcion: f.producto_descripcion,
          descripcion_general:
            (f.producto_familia ? descripcionesCanonicas[f.producto_familia] : null) ?? f.producto_descripcion,
          marca: f.marca_nombre,
          pz_en_caja: f.pz_en_caja,
          bodega_nombre: f.bodega_nombre,
          ciudad: f.ciudad,
          cajas_hoy: f.cajas_hoy,
          ajuste: f.ajuste,
          cajas_corte: f.cajas_historicas,
          entradas_posteriores: f.entradas_posteriores,
          salidas_posteriores: f.salidas_posteriores,
          n_notas: f.n_notas,
          valor_inconsistente: f.valor_inconsistente,
        })),
        totales: {
          hoy: d.totales.hoy,
          ajuste: d.totales.ajuste,
          historicas: d.totales.historico,
          entradas: d.filas.reduce((s, f) => s + f.entradas_posteriores, 0),
          salidas: d.filas.reduce((s, f) => s + f.salidas_posteriores, 0),
        },
        porBodega: d.porBodega.map((b) => {
          const extra = porBodegaExtra.get(b.bodega_id) ?? { entradas: 0, salidas: 0, notas: 0 }
          return {
            bodega_id: b.bodega_id,
            bodega_nombre: b.bodega_nombre,
            ciudad: b.ciudad,
            hoy: b.hoy,
            ajuste: b.ajuste,
            historico: b.historico,
            entradas: extra.entradas,
            salidas: extra.salidas,
            n_notas: extra.notas,
          }
        }),
        porCiudad: d.porCiudad.map((c) => {
          const extra = porCiudadExtra.get(c.ciudad) ?? { entradas: 0, salidas: 0, notas: 0 }
          return {
            bodega_id: 0,
            bodega_nombre: c.ciudad,
            ciudad: c.ciudad,
            hoy: c.hoy,
            ajuste: c.ajuste,
            historico: c.historico,
            entradas: extra.entradas,
            salidas: extra.salidas,
            n_notas: extra.notas,
          }
        }),
        movimientos,
        ajustesDirectos: d.ajustesDirectos.map((a) => ({
          bodega_nombre: a.bodega_nombre,
          fecha: a.fecha,
          filas_afectadas: a.filas_afectadas,
          usuario_id: a.usuario_id,
        })),
        descuadres: d.descuadres.map((x) => ({
          bodega_nombre: x.bodega_nombre,
          dif: x.dif,
          claves: x.claves_descuadradas,
          tiene_ajuste_directo_post_corte: x.tieneAjusteDirectoPostCorte,
        })),
        notasRevertidas: d.notasRevertidas,
        negativos: d.negativos,
        descripcionesCanonicas,
      }

      const buffer = await construirReporteHistorico(datos)
      const sufijo =
        d.modo === 'individual'
          ? (d.porBodega[0]?.bodega_nombre ?? 'Bodega')
          : (ciudad?.trim() || 'General')
      const nombre = `Stock_Impresion_${sufijo.replace(/\s+/g, '_')}_${fechaCorte}.xlsx`
      descargarBuffer(buffer, nombre)
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
          <Printer className="h-3.5 w-3.5" />
          Impresión / Reporte
        </>
      )}
    </Button>
  )
}

function descargarBuffer(buffer: ArrayBuffer, nombre: string) {
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
}
