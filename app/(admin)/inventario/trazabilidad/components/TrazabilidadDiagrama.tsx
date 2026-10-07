// app/(admin)/inventario/trazabilidad/components/TrazabilidadDiagrama.tsx
'use client'

import { useMemo, useState, useCallback } from 'react'
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
import { ArrowLeftRight, TrendingUp, TrendingDown, Package } from 'lucide-react'
import type { TrazabilidadCompletaRespuesta } from '@/modules/inventario/trazabilidad'
import { construirFlujo, type ResumenCiudad } from '@/lib/inventario/flujo-grafo'
import { TrazabilidadDiagramaPanel } from './TrazabilidadDiagramaPanel'

const EDGE_COLOR: Record<string, string> = {
  traspaso: '#3b82f6',
  venta: '#ef4444',
  entrada: '#10b981',
}

function CiudadNode({ data }: { data: { resumen: ResumenCiudad; selected: boolean } }) {
  const r = data.resumen
  return (
    <div className={`rounded-xl border-2 bg-card px-3 py-2 shadow-sm min-w-[170px] ${data.selected ? 'border-primary' : 'border-border'} ${r.tienePendiente ? 'border-l-4 border-l-yellow-500' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <p className="text-xs font-black text-foreground">{r.ciudad}</p>
      <div className="mt-1 space-y-0.5 text-[11px] font-mono">
        <p className="text-muted-foreground">Stock <span className="font-bold text-foreground">{r.stock}</span></p>
        <p className="text-emerald-600 dark:text-emerald-400">+{r.entradas} <span className="text-muted-foreground">ent</span></p>
        <p className="text-red-600 dark:text-red-400">−{r.salidas} <span className="text-muted-foreground">sal</span></p>
        {(r.traspasosEnviados > 0 || r.traspasosRecibidos > 0) && (
          <p className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <ArrowLeftRight className="w-3 h-3" />+{r.traspasosRecibidos}/−{r.traspasosEnviados}
          </p>
        )}
        {r.tienePendiente && (
          <Badge className="text-[9px] px-1 py-0 h-4 bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-500/40 font-bold">
            En trámite +{r.pendEntradas} / −{r.pendSalidas}
          </Badge>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function ExtremoNode({ data }: { data: { titulo: string; icono: 'in' | 'out' } }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-center min-w-[130px]">
      {data.icono === 'in' && <Handle type="source" position={Position.Right} />}
      {data.icono === 'out' && <Handle type="target" position={Position.Left} />}
      <p className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1">
        {data.icono === 'in' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
        {data.titulo}
      </p>
    </div>
  )
}

const nodeTypes = { ciudad: CiudadNode, extremo: ExtremoNode }

interface Props {
  data: TrazabilidadCompletaRespuesta
}

export function TrazabilidadDiagrama({ data }: Props) {
  const [ciudadSel, setCiudadSel] = useState<string | null>(null)
  const [edgeSel, setEdgeSel] = useState<string | null>(null)

  const graph = useMemo(() => construirFlujo(data), [data])

  const { rfNodes, rfEdges } = useMemo(() => {
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90 })
    g.setDefaultEdgeLabel(() => ({}))
    graph.nodes.forEach((n) => {
      g.setNode(n.id, { width: n.tipo === 'ciudad' ? 190 : 150, height: n.tipo === 'ciudad' ? 150 : 60 })
    })
    graph.edges.forEach((e) => g.setEdge(e.source, e.target))
    dagre.layout(g)

    const rfNodes: Node[] = graph.nodes.map((n) => {
      const pos = g.node(n.id)
      const w = n.tipo === 'ciudad' ? 190 : 150
      const h = n.tipo === 'ciudad' ? 150 : 60
      return {
        id: n.id,
        type: n.tipo === 'ciudad' ? 'ciudad' : 'extremo',
        position: { x: pos.x - w / 2, y: pos.y - h / 2 },
        data: n.tipo === 'ciudad'
          ? { resumen: n.resumen!, selected: ciudadSel === n.ciudad }
          : { titulo: n.tipo === 'ventas' ? 'Ventas externas' : 'Entradas externas', icono: n.tipo === 'ventas' ? 'out' : 'in' },
      }
    })
    const maxCajas = Math.max(1, ...graph.edges.map((e) => e.cajas))
    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: `${e.cajas} cj`,
      animated: e.tipo === 'traspaso',
      style: {
        stroke: EDGE_COLOR[e.tipo],
        strokeWidth: 1.5 + (e.cajas / maxCajas) * 4,
        opacity: edgeSel && edgeSel !== e.id ? 0.25 : 1,
      },
      labelStyle: { fontSize: 10, fontWeight: 700, fill: EDGE_COLOR[e.tipo] },
    }))
    return { rfNodes, rfEdges }
  }, [graph, ciudadSel, edgeSel])

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    if (node.type === 'ciudad') {
      const cd = (node.data as { resumen: ResumenCiudad }).resumen.ciudad
      setCiudadSel((prev) => (prev === cd ? null : cd))
      setEdgeSel(null)
    }
  }, [])

  const onEdgeClick = useCallback((_e: unknown, edge: Edge) => {
    setEdgeSel((prev) => (prev === edge.id ? null : edge.id))
  }, [])

  if (graph.nodes.length <= 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Sin flujo en el período seleccionado. Amplía el rango de fechas o ajusta los filtros.
      </div>
    )
  }

  const edgeSelData = edgeSel ? graph.edges.find((e) => e.id === edgeSel) || null : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
        <div className="h-[520px]">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <MiniMap pannable zoomable className="!bg-muted" />
            <Controls />
          </ReactFlow>
        </div>
        <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: EDGE_COLOR.entrada }} /> Entradas</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: EDGE_COLOR.venta }} /> Salidas/ventas</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: EDGE_COLOR.traspaso }} /> Traspasos (grosor ∝ cajas)</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block bg-yellow-500" /> En trámite PEND/PROC</span>
        </div>
      </div>
      <TrazabilidadDiagramaPanel
        ciudad={ciudadSel}
        resumen={ciudadSel ? graph.ciudades.find((c) => c.ciudad === ciudadSel) || null : null}
        edge={edgeSelData}
        fechaDesde={data.filtrosAplicados.fechaDesde}
        fechaHasta={data.filtrosAplicados.fechaHasta}
        familia={data.filtrosAplicados.familia}
        verCanceladas={data.filtrosAplicados.incluirCanceladas}
      />
    </div>
  )
}
