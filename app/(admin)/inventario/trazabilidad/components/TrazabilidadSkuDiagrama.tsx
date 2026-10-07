// app/(admin)/inventario/trazabilidad/components/TrazabilidadSkuDiagrama.tsx
'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ExternalLink, FileText, MousePointerClick, Warehouse } from 'lucide-react'
import type { TimelineEvento } from '@/modules/inventario/trazabilidad'
import { construirFlujoSku, firmadoEvento, type SkuFlowNode } from '@/lib/inventario/flujo-grafo'
import { Fecha } from '@/components/shared/Fecha'

const EDGE_COLOR: Record<string, string> = {
  traspaso: '#3b82f6',
  venta: '#ef4444',
  entrada: '#10b981',
  ajuste: '#f59e0b',
}

function BodegaNode({ data }: { data: { nodo: SkuFlowNode; selected: boolean } }) {
  const n = data.nodo
  return (
    <div className={`rounded-xl border-2 bg-card px-3 py-2 shadow-sm min-w-[150px] ${data.selected ? 'border-primary' : 'border-border'}`}>
      <Handle type="target" position={Position.Left} />
      <p className="text-xs font-black text-foreground flex items-center gap-1">
        <Warehouse className="w-3 h-3 text-muted-foreground" /> {n.nombre}
      </p>
      {n.ciudad && <p className="text-[10px] text-muted-foreground">{n.ciudad}</p>}
      <div className="mt-1 text-[11px] font-mono flex gap-2">
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{n.entradas}</span>
        <span className="text-red-600 dark:text-red-400 font-bold">−{n.salidas}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function ExtremoNode({ data }: { data: { titulo: string; icono: 'in' | 'out' } }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-center min-w-[120px]">
      {data.icono === 'in' && <Handle type="source" position={Position.Right} />}
      {data.icono === 'out' && <Handle type="target" position={Position.Left} />}
      <p className="text-[11px] font-bold text-muted-foreground">{data.titulo}</p>
    </div>
  )
}

const nodeTypes = { bodega: BodegaNode, extremo: ExtremoNode }

interface Props {
  eventos: TimelineEvento[]
}

export function TrazabilidadSkuDiagrama({ eventos }: Props) {
  const [nodoSel, setNodoSel] = useState<string | null>(null)
  const [edgeSel, setEdgeSel] = useState<string | null>(null)

  const graph = useMemo(() => construirFlujoSku(eventos), [eventos])

  const { rfNodes, rfEdges } = useMemo(() => {
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 80 })
    g.setDefaultEdgeLabel(() => ({}))
    graph.nodes.forEach((n) => g.setNode(n.id, { width: 170, height: 90 }))
    graph.edges.forEach((e) => g.setEdge(e.source, e.target))
    dagre.layout(g)
    const rfNodes: Node[] = graph.nodes.map((n) => {
      const pos = g.node(n.id)
      return {
        id: n.id,
        type: n.tipo === 'bodega' ? 'bodega' : 'extremo',
        position: { x: pos.x - 85, y: pos.y - 45 },
        data: n.tipo === 'bodega'
          ? { nodo: n, selected: nodoSel === n.id }
          : { titulo: n.nombre, icono: n.tipo === 'ext-in' ? 'in' : 'out' },
      }
    })
    const maxCajas = Math.max(1, ...graph.edges.map((e) => e.cajas))
    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: `${e.cajas} cj`,
      animated: e.tipo === 'traspaso',
      style: { stroke: EDGE_COLOR[e.tipo], strokeWidth: 1.5 + (e.cajas / maxCajas) * 3.5 },
      labelStyle: { fontSize: 10, fontWeight: 700, fill: EDGE_COLOR[e.tipo] },
    }))
    return { rfNodes, rfEdges }
  }, [graph, nodoSel])

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    if (node.type === 'bodega') {
      setNodoSel((prev) => (prev === node.id ? null : node.id))
      setEdgeSel(null)
    }
  }, [])

  const onEdgeClick = useCallback((_e: unknown, edge: Edge) => {
    setEdgeSel((prev) => (prev === edge.id ? null : edge.id))
  }, [])

  const nodoData = nodoSel ? graph.nodes.find((n) => n.id === nodoSel) || null : null
  const edgeData = edgeSel ? graph.edges.find((e) => e.id === edgeSel) || null : null
  const nombreSel = nodoData?.tipo === 'bodega' ? nodoData.nombre : null
  const eventosFiltrados = edgeData
    ? edgeData.eventos
    : nombreSel
      ? eventos.filter((ev) => ev.origen_bodega === nombreSel || ev.destino_bodega === nombreSel)
      : []

  if (graph.nodes.filter((n) => n.tipo === 'bodega').length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Sin movimientos para diagramar en el rango.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="md:col-span-3 bg-muted/20 border border-border rounded-xl overflow-hidden">
        <div className="h-[380px]">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
      <div className="md:col-span-2 bg-card border border-border rounded-xl p-3 space-y-2.5 h-fit max-h-[380px] overflow-y-auto">
        {!nodoData && !edgeData && (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <MousePointerClick className="w-4 h-4 shrink-0 mt-0.5" />
            Da clic en una bodega o flecha para ver su resumen y notas.
          </p>
        )}
        {nodoData && nodoData.tipo === 'bodega' && (
          <>
            <p className="text-sm font-black">{nodoData.nombre} <span className="text-[11px] font-normal text-muted-foreground">{nodoData.ciudad}</span></p>
            <div className="rounded-lg border p-2 grid grid-cols-2 gap-2 text-center">
              <div><p className="text-[10px] uppercase text-emerald-700 font-bold">Entradas</p><p className="font-mono font-black text-emerald-600">+{nodoData.entradas}</p></div>
              <div><p className="text-[10px] uppercase text-rose-700 font-bold">Salidas</p><p className="font-mono font-black text-rose-600">−{nodoData.salidas}</p></div>
            </div>
          </>
        )}
        {edgeData && (
          <p className="text-xs font-bold">Tramo: {edgeData.cajas} cj en {edgeData.eventos.length} nota(s)</p>
        )}
        {(nodoData || edgeData) && (
          <div className="space-y-1.5">
            {eventosFiltrados.map((ev, i) => {
              const f = nombreSel ? firmadoEvento(ev, nombreSel) : (ev.tipo_codigo === 'SAL' ? -Math.abs(ev.cajas) : Math.abs(ev.cajas))
              return (
                <div key={`${ev.nota_id}-${ev.detalle_id}-${i}`} className={`flex items-center gap-2 text-xs rounded-md border px-2 py-1.5 ${ev.estado_codigo === 'CANC' ? 'opacity-60' : ev.estado_codigo === 'PEND' || ev.estado_codigo === 'PROC' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border'}`}>
                  <Link href={`/inventario/notas/${ev.nota_id}`} target="_blank" rel="noopener noreferrer" className={`font-mono font-bold hover:underline ${ev.estado_codigo === 'CANC' ? 'line-through text-gray-500' : 'text-primary'}`}>
                    {ev.numero_nota}
                  </Link>
                  <Badge variant="outline" className="text-[9px] px-1">{ev.tipo_codigo}</Badge>
                  <span className={`font-mono font-bold ml-auto ${f > 0 ? 'text-emerald-600' : f < 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>{f > 0 ? `+${f}` : f}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap"><Fecha valor={ev.fecha_nota} formato="fecha" /></span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
              )
            })}
          </div>
        )}
        {(nodoData || edgeData) && eventosFiltrados.length > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Los links abren la nota en pestaña nueva. <ArrowRight className="w-3 h-3" /></p>
        )}
      </div>
    </div>
  )
}
