// app/(admin)/ordenes-b2b/orden-rapida/OrdenRapidaWizard.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  FileUp, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, Info,
  Loader2, Plus, Sparkles, Database, FileSpreadsheet, Package, DollarSign,
  Scale, ClipboardCheck, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import type { PersonaRow } from '@/lib/types/tables'
import { ADMIN_ROUTES } from '@/lib/constants'

type ContainerMock = {
  id: number
  codigo_contenedor: string
  numero_contenedor: string | null
  estado: string | null
}

type WizardProps = {
  proveedores: PersonaRow[]
  clientes: PersonaRow[]
  contenedores: ContainerMock[]
}

// Datos de Packing List simulados devueltos por el webhook inteligente
const MOCK_N8N_RESPONSE_A = {
  orden: {
    total_cajas: 120,
    total_piezas: 1440,
    cbm_estimado: 8.64,
    costo_estimado_usd: 4800,
    moneda: 'USD',
  },
  productos: [
    { sku_base: 'K24/BLUE-JAC', descripcion: 'Chaqueta de Mezclilla Azul Premium', tipo_prenda: 'Chaqueta', es_nuevo: false, costo_promedio: 15.5 },
    { sku_base: 'K24/RED-SWE', descripcion: 'Sudadera Algodón Roja con Gorro', tipo_prenda: 'Sudadera', es_nuevo: true, costo_promedio: 12.0 },
    { sku_base: 'K24/BLK-TEE', descripcion: 'Playera Básica Negra Cuello Redondo', tipo_prenda: 'Playera', es_nuevo: false, costo_promedio: 6.5 },
    { sku_base: 'K24/WHT-TEE', descripcion: 'Playera Básica Blanca Cuello Redondo', tipo_prenda: 'Playera', es_nuevo: true, costo_promedio: 6.5 }
  ],
  cajas: [
    {
      codigo_caja: 'CJ-K24-JAC',
      nombre_pack: 'Pack Chaqueta Denim MIX',
      piezas_por_caja: 12,
      peso_bruto_kg: 14.5,
      costo_total_caja: 186.0,
      largo_cm: 60,
      ancho_cm: 40,
      alto_cm: 30,
      cbm: 0.072,
      cantidad_cajas: 40,
      matriz: {
        tallas: ['M', 'G', 'EG'],
        colores: ['Azul Claro', 'Azul Oscuro'],
        valores: {
          'Azul Claro': { 'M': 2, 'G': 3, 'EG': 1 },
          'Azul Oscuro': { 'M': 2, 'G': 2, 'EG': 2 }
        }
      }
    },
    {
      codigo_caja: 'CJ-K24-SWE',
      nombre_pack: 'Pack Sudaderas Invierno',
      piezas_por_caja: 12,
      peso_bruto_kg: 16.0,
      costo_total_caja: 144.0,
      largo_cm: 60,
      ancho_cm: 40,
      alto_cm: 30,
      cbm: 0.072,
      cantidad_cajas: 30,
      matriz: {
        tallas: ['CH', 'M', 'G'],
        colores: ['Rojo Cereza'],
        valores: {
          'Rojo Cereza': { 'CH': 4, 'M': 4, 'G': 4 }
        }
      }
    },
    {
      codigo_caja: 'CJ-K24-TEE',
      nombre_pack: 'Pack Playeras Basic Mix',
      piezas_por_caja: 24,
      peso_bruto_kg: 11.2,
      costo_total_caja: 156.0,
      largo_cm: 50,
      ancho_cm: 35,
      alto_cm: 25,
      cbm: 0.044,
      cantidad_cajas: 50,
      matriz: {
        tallas: ['CH', 'M', 'G', 'EG'],
        colores: ['Negro', 'Blanco'],
        valores: {
          'Negro': { 'CH': 3, 'M': 4, 'G': 3, 'EG': 2 },
          'Blanco': { 'CH': 3, 'M': 4, 'G': 3, 'EG': 2 }
        }
      }
    }
  ]
}

const MOCK_N8N_RESPONSE_B = {
  orden: {
    total_cajas: 85,
    total_piezas: 1020,
    cbm_estimado: 6.12,
    costo_estimado_usd: 3950,
    moneda: 'USD',
  },
  productos: [
    { sku_base: 'K24/GRY-JOG', descripcion: 'Jogger Deportivo Gris Felpa', tipo_prenda: 'Pantalón', es_nuevo: true, costo_promedio: 14.0 },
    { sku_base: 'K24/BLK-TEE', descripcion: 'Playera Básica Negra Cuello Redondo', tipo_prenda: 'Playera', es_nuevo: false, costo_promedio: 6.5 }
  ],
  cajas: [
    {
      codigo_caja: 'CJ-K24-JOG',
      nombre_pack: 'Pack Jogger Fit MIX',
      piezas_por_caja: 12,
      peso_bruto_kg: 13.8,
      costo_total_caja: 168.0,
      largo_cm: 60,
      ancho_cm: 40,
      alto_cm: 30,
      cbm: 0.072,
      cantidad_cajas: 50,
      matriz: {
        tallas: ['CH', 'M', 'G'],
        colores: ['Gris Oxford', 'Negro'],
        valores: {
          'Gris Oxford': { 'CH': 2, 'M': 2, 'G': 2 },
          'Negro': { 'CH': 2, 'M': 2, 'G': 2 }
        }
      }
    },
    {
      codigo_caja: 'CJ-K24-TEE-B',
      nombre_pack: 'Pack Playeras Negro Solo',
      piezas_por_caja: 24,
      peso_bruto_kg: 10.8,
      costo_total_caja: 156.0,
      largo_cm: 50,
      ancho_cm: 35,
      alto_cm: 25,
      cbm: 0.044,
      cantidad_cajas: 35,
      matriz: {
        tallas: ['M', 'G', 'EG'],
        colores: ['Negro'],
        valores: {
          'Negro': { 'M': 8, 'G': 10, 'EG': 6 }
        }
      }
    }
  ]
}

export function OrdenRapidaWizard({ proveedores, clientes, contenedores }: WizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Paso 1 State
  const [selectedProveedor, setSelectedProveedor] = useState('')
  const [selectedCliente, setSelectedCliente] = useState('')
  const [selectedContenedor, setSelectedContenedor] = useState('new')
  const [newContainerCode, setNewContainerCode] = useState('')

  // Paso 2 State (Carga & Simulación)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [parsedData, setParsedData] = useState<any | null>(null)

  // Paso 3 State (Edición local)
  const [editableProductos, setEditableProductos] = useState<any[]>([])
  const [editableCajas, setEditableCajas] = useState<any[]>([])

  // Fases del cargador
  const startSimulation = (mockType: 'A' | 'B') => {
    setProcessing(true)
    setProgress(0)
    setParsedData(null)
    setFileName(mockType === 'A' ? 'PackingList_Zhejiang_Corp.xlsx' : 'PL_Guangzhou_Fashion.xlsx')

    const phases = [
      { p: 15, msg: 'Estableciendo conexión segura con n8n...' },
      { p: 40, msg: 'Leyendo estructura del Packing List (Multipart Stream)...' },
      { p: 65, msg: 'IA extrayendo SKUs y detectando dimensiones de empaque...' },
      { p: 85, msg: 'Comparando productos con base de datos inv-tienda...' },
      { p: 100, msg: 'Procesamiento finalizado. Construyendo matriz de cajas.' }
    ]

    let currentPhase = 0
    const interval = setInterval(() => {
      if (currentPhase < phases.length) {
        setProgress(phases[currentPhase].p)
        setProgressMsg(phases[currentPhase].msg)
        currentPhase++
      } else {
        clearInterval(interval)
        setProcessing(false)
        const responseData = mockType === 'A' ? MOCK_N8N_RESPONSE_A : MOCK_N8N_RESPONSE_B
        setParsedData(responseData)
        setEditableProductos(JSON.parse(JSON.stringify(responseData.productos)))
        setEditableCajas(JSON.parse(JSON.stringify(responseData.cajas)))
        toast.success('Packing List procesado exitosamente por n8n.')
      }
    }, 450)
  }

  // Guardado final simulado
  const handleGenerateOrder = () => {
    startTransition(async () => {
      // Simula el guardado de ordenes, cajas y opcionalmente contenedor
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast.success('¡Orden y Contenedor creados con éxito en Supabase!')
      setStep(5)
    })
  }

  const handleNext = () => {
    if (step === 1) {
      if (!selectedProveedor || !selectedCliente) {
        toast.error('Por favor selecciona Proveedor y Cliente.')
        return
      }
      if (selectedContenedor === 'new' && !newContainerCode.trim()) {
        toast.error('Por favor escribe un código para el nuevo contenedor.')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!parsedData) {
        toast.error('Por favor carga y procesa un Packing List primero.')
        return
      }
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    } else if (step === 4) {
      handleGenerateOrder()
    }
  }

  const handleBack = () => {
    if (step > 1 && step < 5) {
      setStep(step - 1)
    }
  }

  const renderStepsIndicator = () => {
    const steps = [
      { number: 1, label: 'Config' },
      { number: 2, label: 'Carga' },
      { number: 3, label: 'Matriz' },
      { number: 4, label: 'Logística' },
      { number: 5, label: 'Confirmado' }
    ]

    return (
      <div className="flex items-center justify-between max-w-2xl mx-auto mb-8 bg-muted/30 p-4 rounded-xl border border-border/60">
        {steps.map((s, idx) => (
          <div key={s.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 z-10">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s.number
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-md'
                  : step > s.number
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground border border-border/80'
              }`}>
                {step > s.number ? '✓' : s.number}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                step === s.number ? 'text-primary font-bold' : 'text-muted-foreground/80'
              }`}>{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 rounded transition-colors ${
                step > s.number ? 'bg-green-600' : 'bg-border/60'
              }`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderStepsIndicator()}

      <Card className="border-border/60 overflow-hidden bg-card/65 shadow-md">
        <CardContent className="p-6">
          {/* STEP 1: CONFIGURATION */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">1. Configuración de Socios Comerciales y Destino</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="proveedor" className="text-sm font-semibold">Proveedor Origen</Label>
                  <Select value={selectedProveedor} onValueChange={(val) => setSelectedProveedor(val || '')}>
                    <SelectTrigger id="proveedor" className="h-10">
                      <SelectValue placeholder="Selecciona el proveedor extranjero..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nombre_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Entidad emisora del Packing List y mercadería.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente" className="text-sm font-semibold">Cliente B2B Destino</Label>
                  <Select value={selectedCliente} onValueChange={(val) => setSelectedCliente(val || '')}>
                    <SelectTrigger id="cliente" className="h-10">
                      <SelectValue placeholder="Selecciona el comprador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nombre_completo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Empresa o filial nacional que adquiere las piezas.</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-semibold block">Asignación de Contenedor de Importación</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-muted/20 p-4 rounded-lg border">
                  <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="contenedor-sel" className="text-xs">Destino de Carga</Label>
                    <Select value={selectedContenedor} onValueChange={(val) => setSelectedContenedor(val || '')}>
                      <SelectTrigger id="contenedor-sel" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Crear Nuevo Contenedor</SelectItem>
                        {contenedores.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.codigo_contenedor} ({c.numero_contenedor ?? 'S/N'}) - {c.estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedContenedor === 'new' ? (
                    <div className="md:col-span-2 space-y-2 animate-in fade-in slide-in-from-left-2 duration-150">
                      <Label htmlFor="nuevo-cont-cod" className="text-xs">Código de Identificación del Contenedor</Label>
                      <Input
                        id="nuevo-cont-cod"
                        placeholder="Ej. CONT-K24-MX01"
                        value={newContainerCode}
                        onChange={(e) => setNewContainerCode(e.target.value)}
                        className="h-9 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2 p-3 bg-muted/40 rounded border flex items-center gap-2.5 text-xs text-muted-foreground animate-in fade-in duration-150">
                      <Info className="h-4 w-4 text-primary shrink-0" />
                      <span>Las cajas de esta orden se sumarán y asociarán al contenedor seleccionado existente.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOAD & SIMULATION */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2">
                <FileUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">2. Subida y Análisis Inteligente (n8n Webhook Connection)</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10">
                    <FileSpreadsheet className="h-12 w-12 text-muted-foreground/60 mb-4 animate-bounce duration-1000" />
                    <p className="font-semibold text-sm">Arrastra tu archivo Packing List aquí</p>
                    <p className="text-xs text-muted-foreground mt-1">Soporta .xlsx, .xls, .pdf (Máx. 10MB)</p>
                    
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" type="button">
                        Examinar Archivos
                      </Button>
                    </div>
                  </div>

                  {fileName && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border text-sm">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                        <span className="font-medium font-mono text-xs">{fileName}</span>
                      </div>
                      {!processing && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Cargado
                        </Badge>
                      )}
                    </div>
                  )}

                  {processing && (
                    <div className="space-y-2.5 p-4 bg-muted/30 rounded-lg border animate-pulse">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-primary flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {progressMsg}
                        </span>
                        <span className="font-mono">{progress}%</span>
                      </div>
                      <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-300 rounded-full" 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-xl border border-border/80 space-y-3.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Simulador de Webhook n8n
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Usa uno de nuestros formatos pre-analizados por n8n para simular la subida y procesar los SKUs y empaques en la base de datos de inmediato.
                    </p>

                    <div className="space-y-2 pt-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 h-11 text-xs"
                        onClick={() => startSimulation('A')}
                        disabled={processing}
                      >
                        <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
                        Packing List A (Zhejiang Corp - 3 Cajas)
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 h-11 text-xs"
                        onClick={() => startSimulation('B')}
                        disabled={processing}
                      >
                        <FileSpreadsheet className="h-4 w-4 text-purple-600 shrink-0" />
                        Packing List B (Guangzhou Fashion - 2 Cajas)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SKU VERIFICATION & MATRIX */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">3. Verificación de Catálogo y Matrices</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-100/50 text-yellow-800 border border-yellow-200/50 px-3 py-1 rounded-md text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Se detectaron productos no registrados en el catálogo.</span>
                </div>
              </div>

              {/* Tab 1: Productos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-1">
                  <Package className="h-4 w-4 text-primary" /> Mapeo de SKUs a Insertar / Asociar
                </h3>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b text-left text-muted-foreground font-semibold">
                        <th className="p-3">SKU Base</th>
                        <th className="p-3">Descripción Extraída</th>
                        <th className="p-3">Tipo Prenda</th>
                        <th className="p-3">Costo Base</th>
                        <th className="p-3">Estado Catálogo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {editableProductos.map((p, idx) => (
                        <tr key={idx} className="hover:bg-accent/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-xs">{p.sku_base}</td>
                          <td className="p-3 font-medium">
                            <Input
                              value={p.descripcion}
                              onChange={(e) => {
                                const val = e.target.value
                                setEditableProductos((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, descripcion: val } : item))
                                )
                              }}
                              className="h-8 text-xs max-w-sm"
                            />
                          </td>
                          <td className="p-3 font-semibold text-xs">{p.tipo_prenda}</td>
                          <td className="p-3 font-mono text-xs">${p.costo_promedio} USD</td>
                          <td className="p-3">
                            {p.es_nuevo ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-bold border border-green-200">
                                Nuevo SKU (Se creará)
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-bold border border-blue-200">
                                Existente en Catálogo
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              {/* Tab 2: Matrices Cajas */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-primary" /> Cajas y Distribución de Tallas/Colores (Matrices)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editableCajas.map((c, idx) => (
                    <Card key={idx} className="overflow-hidden border border-border/85 shadow-sm">
                      <div className="bg-muted/40 p-4 border-b flex justify-between items-center">
                        <div>
                          <h4 className="font-mono text-xs font-bold text-primary">📦 {c.codigo_caja}</h4>
                          <p className="text-sm font-bold mt-0.5">{c.nombre_pack}</p>
                        </div>
                        <Badge variant="outline" className="font-mono font-bold bg-background text-xs">
                          {c.cantidad_cajas} Cajas
                        </Badge>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground uppercase font-bold text-center">
                          <div className="bg-muted/20 p-2 rounded">
                            <span className="block font-black text-foreground text-sm tabular-nums">{c.piezas_por_caja}</span>
                            Pz/Caja
                          </div>
                          <div className="bg-muted/20 p-2 rounded">
                            <span className="block font-black text-foreground text-sm tabular-nums">{c.peso_bruto_kg} kg</span>
                            Peso Bruto
                          </div>
                          <div className="bg-muted/20 p-2 rounded">
                            <span className="block font-black text-foreground text-sm italic tabular-nums">{c.cbm} m³</span>
                            CBM
                          </div>
                        </div>

                        {/* Matriz interactiva de tallas */}
                        <div className="border rounded overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-muted/20 border-b text-[10px] uppercase font-bold text-muted-foreground">
                                <th className="p-2">Color</th>
                                {c.matriz.tallas.map((t: string) => (
                                  <th key={t} className="p-2 text-center">{t}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {c.matriz.colores.map((color: string) => (
                                <tr key={color}>
                                  <td className="p-2 font-medium">{color}</td>
                                  {c.matriz.tallas.map((t: string) => {
                                    const qty = c.matriz.valores[color]?.[t] ?? 0
                                    return (
                                      <td key={t} className="p-2 text-center font-bold font-mono">
                                        <Input
                                          type="number"
                                          defaultValue={qty}
                                          className="h-7 w-12 text-center text-xs p-1 font-mono font-bold mx-auto"
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0
                                            setEditableCajas((prev) =>
                                              prev.map((box, bIdx) => {
                                                if (bIdx === idx) {
                                                  const newVals = { ...box.matriz.valores }
                                                  if (!newVals[color]) newVals[color] = {}
                                                  newVals[color][t] = val
                                                  return { ...box, matriz: { ...box.matriz, valores: newVals } }
                                                }
                                                return box
                                              })
                                            )
                                          }}
                                        />
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-muted-foreground">Medidas: {c.largo_cm}x{c.ancho_cm}x{c.alto_cm} cm</span>
                          <span className="font-bold">Total: {c.piezas_por_caja * c.cantidad_cajas} Piezas</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: LOGISTICS & SUMMARY */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">4. Métricas de Logística e Importación</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Cajas Totales</span>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-1">
                      {editableCajas.reduce((sum, c) => sum + c.cantidad_cajas, 0)}
                    </p>
                    <span className="text-xs text-muted-foreground">Distribuidas en packs</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Piezas Totales</span>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-1 text-primary">
                      {editableCajas.reduce((sum, c) => sum + (c.piezas_por_caja * c.cantidad_cajas), 0)}
                    </p>
                    <span className="text-xs text-muted-foreground">Sujetas a resurtido</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">CBM Total Estimado</span>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-1 italic">
                      {editableCajas.reduce((sum, c) => sum + (c.cbm * c.cantidad_cajas), 0).toFixed(3)} m³
                    </p>
                    <span className="text-xs text-muted-foreground">Volumen de transporte</span>
                  </CardContent>
                </Card>

                <Card className="border border-border/80 bg-muted/10">
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Costo Mercadería</span>
                    <p className="text-3xl font-black tabular-nums tracking-tight mt-1 text-green-700">
                      ${parsedData?.orden.costo_estimado_usd} USD
                    </p>
                    <span className="text-xs text-muted-foreground">FOB Estimado</span>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Destino Final de la Carga</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg border">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block font-bold">Contenedor Destino</span>
                    <p className="text-base font-bold font-mono">
                      {selectedContenedor === 'new' ? `${newContainerCode} (Nuevo Contenedor)` : contenedores.find(c => String(c.id) === selectedContenedor)?.codigo_contenedor}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block font-bold">Fase de Importación Inicial</span>
                    <p className="text-sm font-semibold text-foreground">
                      El contenedor se iniciará en estado <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">borrador</Badge>. Podrás completar el flete y desaduanamiento desde la sección de contenedores.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMED / SUCCESS */}
          {step === 5 && (
            <div className="space-y-6 text-center py-8 animate-in fade-in duration-300">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="h-10 w-10 animate-bounce" />
                </div>
              </div>
              
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-foreground">¡Orden B2B Importada con Éxito!</h2>
                <p className="text-sm text-muted-foreground">
                  El Packing List ha sido parseado, los nuevos SKUs se insertaron en el catálogo base y las cajas/variantes se vincularon exitosamente.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto pt-4">
                <Button 
                  variant="outline" 
                  className="gap-1.5 h-10 w-full"
                  onClick={() => router.push(ADMIN_ROUTES.ordenesB2B.lista)}
                >
                  Ir a Órdenes B2B <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  className="gap-1.5 h-10 w-full"
                  onClick={() => router.push(ADMIN_ROUTES.contenedores.lista)}
                >
                  Ir a Contenedores <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navegación Footer */}
      {step < 5 && (
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={step === 1 || isPending}
            className="h-9 gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            disabled={isPending || (step === 2 && !parsedData) || processing}
            className="h-9 gap-1 font-semibold"
          >
            {isPending || processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                {step === 4 ? 'Confirmar y Crear Orden' : 'Siguiente'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
