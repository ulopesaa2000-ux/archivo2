// app/(admin)/inventario/trazabilidad/components/TrazabilidadDiagramaPanel.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, ExternalLink, FileText, Loader2, MousePointerClick } from 'lucide-react'
import type { ResumenCiudad, FlowEdge } from '@/lib/inventario/flujo-grafo'
import { fetchMovimientosPorCiudad, type MovimientoCiudad } from '@/modules/inventario/trazabilidad'
import { Fecha } from '@/components/shared/Fecha'

function firmado(m: MovimientoCiudad): number {
  const t = (m.tipo_codigo || '').toUpperCase()
  if (t === 'SAL') return -Math.abs(m.cajas)
  if (t === 'ENT' || t === 'DEV') return Math.abs(m.cajas)
  if (t === 'TRF') return m.es_origen ? -Math.abs(m.cajas) : Math.abs(m.cajas)
  return m.es_origen ? -Math.abs(m.cajas) : Math.abs(m.cajas)
}

interface Props {
  ciudad: string | null
  resumen: ResumenCiudad | null
  edge: FlowEdge | null
  fechaDesde: string
  fechaHasta: string
  familia?: string
  verCanceladas: boolean
}

export function TrazabilidadDiagramaPanel({ ciudad, resumen, edge, fechaDesde, fechaHasta, familia, verCanceladas }: Props) {
  const [movs, setMovs] = useState<MovimientoCiudad[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ciudad) return
    setLoading(true)
    fetchMovimientosPorCiudad(ciudad, fechaDesde, fechaHasta, { familia, incluirCanceladas: verCanceladas, limite: 60 })
      .then(setMovs)
      .catch(() => setMovs([]))
      .finally(() => setLoading(false))
  }, [ciudad, fechaDesde, fechaHasta, familia, verCanceladas])

  if (edge && !ciudad) {
    const esTraspaso = edge.tipo === 'traspaso'
    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 h-fit">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tramo seleccionado</p>
        <div className="flex items-center gap-1.5 text-sm font-bold flex-wrap">
          <Badge variant="outline">{edge.source.replace('cd-', '').replace('src-entradas', 'Entradas')}</Badge>
          <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
            {edge.target.replace('cd-', '').replace('sink-ventas', 'Ventas')}
          </Badge>
          <span className="font-mono ml-auto">{edge.cajas} cj</span>
        </div>
        {!esTraspaso && <p className="text-[11px] text-muted-foreground">Agregado del período. El detalle por nota está en la matriz y el Kardex.</p>}
        {esTraspaso && (edge.notas || []).length > 0 && (
          <div className="space-y-1.5">
            {(edge.notas || []).slice(0, 15).map((n, i) => (
              <Link key={`${n.numero_nota}-${i}`} href={`/inventario/notas/${n.nota_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline bg-primary/5 rounded-md px-2 py-1">
                <FileText className="w-3 h-3" /> {n.numero_nota} <ExternalLink className="w-2.5 h-2.5 ml-auto" />
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!ciudad || !resumen) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center text-xs text-muted-foreground h-fit">
        <MousePointerClick className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Da clic en una ciudad o en una flecha del diagrama para rastrear sus movimientos y notas.
      </div>
    )
  }

  const r = resumen
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 h-fit max-h-[560px] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black">{r.ciudad}</p>
        <Badge variant="secondary" className="text-[10px]">Stock {r.stock} cj</Badge>
      </div>

      {/* Histórico en color normal */}
      <div className="rounded-lg border p-2.5 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-[10px] uppercase text-emerald-700 font-bold">Entradas</p><p className="font-mono font-black text-emerald-600">+{r.entradas}</p></div>
        <div><p className="text-[10px] uppercase text-rose-700 font-bold">Salidas</p><p className="font-mono font-black text-rose-600">−{r.salidas}</p></div>
        <div><p className="text-[10px] uppercase text-blue-700 font-bold">Traspasos</p><p className="font-mono font-black text-blue-600">+{r.traspasosRecibidos}/−{r.traspasosEnviados}</p></div>
      </div>

      {/* Pronóstico en amarillo: 2 valores */}
      <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-2.5">
        <p className="text-[10px] uppercase font-bold text-yellow-800 dark:text-yellow-300">Pronóstico en trámite</p>
        {r.tienePendiente ? (
          <div className="flex gap-4 mt-1 text-sm font-mono font-black">
            <span className="text-yellow-800 dark:text-yellow-300">+{r.pendEntradas} <span className="text-[10px] font-normal">({r.pendNEntradas} notas)</span></span>
            <span className="text-yellow-800 dark:text-yellow-300">−{r.pendSalidas} <span className="text-[10px] font-normal">({r.pendNSalidas} notas)</span></span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground mt-1">Sin notas pendientes que afecten a esta plaza.</p>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Movimientos ({movs.length})</p>
        {loading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando notas…</p>
        ) : movs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin movimientos en el período.</p>
        ) : (
          <div className="space-y-1.5">
            {movs.map((m) => {
              const f = firmado(m)
              return (
                <div key={`${m.nota_id}-${m.producto_id}`} className={`flex items-center gap-2 text-xs rounded-md border px-2 py-1.5 ${m.estado_codigo === 'CANC' ? 'opacity-60 border-gray-300' : 'border-border'}`}>
                  <Link href={`/inventario/notas/${m.nota_id}`} target="_blank" rel="noopener noreferrer" className={`font-mono font-bold hover:underline ${m.estado_codigo === 'CANC' ? 'line-through text-gray-500' : 'text-primary'}`}>
                    {m.numero_nota}
                  </Link>
                  <Badge variant="outline" className="text-[9px] px-1">{m.tipo_codigo}</Badge>
                  <span className={`font-mono font-bold ml-auto ${f > 0 ? 'text-emerald-600' : f < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                    {f > 0 ? `+${f}` : f}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[90px]" title={m.sku_base}>{m.sku_base}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap"><Fecha valor={m.fecha_nota} formato="fecha" /></span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" asChild className="w-full h-8 text-xs">
        <Link href={`/inventario/trazabilidad?ciudad=${encodeURIComponent(r.ciudad)}&periodo=todo`}>
          Abrir {r.ciudad} en la matriz <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  )
}
