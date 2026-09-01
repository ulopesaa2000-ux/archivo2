// components/admin/ecommerce/CatalogoPdfModal.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  Sparkles, 
  Check, 
  Layers, 
  Package, 
  Eye, 
  Loader2, 
  LayoutGrid, 
  DollarSign, 
  Boxes,
  Users,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  fetchProductosParaCatalogoPdfAction,
  type ProductoPdfCatalog,
  type FiltrosPdfCatalog,
} from '@/modules/ecommerce/pdf-catalog-actions'
import { generarCatalogoPdf, type OpcionesGeneracionPdf } from '@/lib/utils/pdfCatalogGenerator'

interface Props {
  tiposPrenda: { id: number; nombre: string }[]
  generos: { id: number; nombre: string }[]
}

const OPCIONES_GENERO = [
  { id: 'todos', label: 'Todos los géneros', icon: '🌐' },
  { id: '1', label: '👩 Dama', icon: '👩' },
  { id: '2', label: '👨 Caballero', icon: '👨' },
  { id: 'infantil', label: '👶 Infantil (Todos)', icon: '👶' },
  { id: '4', label: '👦 Niño', icon: '👦' },
  { id: '5', label: '👧 Niña', icon: '👧' },
  { id: '3', label: '🚻 Unisex', icon: '🚻' },
]

const LAYOUTS = [
  { id: '3x3', label: '3 × 3 (9 por hoja)', desc: 'Recomendado · Balance ideal imagen y texto', cols: 3, rows: 3 },
  { id: '4x3', label: '4 × 3 (12 por hoja)', desc: 'Compacto · Mayor densidad de productos', cols: 4, rows: 3 },
  { id: '3x2', label: '3 × 2 (6 por hoja)', desc: 'Detallado · Tarjetas grandes y fotos amplias', cols: 3, rows: 2 },
]

export function CatalogoPdfModal({ tiposPrenda, generos }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Estados de filtros
  const [generoSeleccionado, setGeneroSeleccionado] = useState<string>('todos')
  const [tiposSeleccionados, setTiposSeleccionados] = useState<number[]>([])
  const [soloConStock, setSoloConStock] = useState<boolean>(true)
  const [soloPublicados, setSoloPublicados] = useState<boolean>(false)
  const [soloConFoto, setSoloConFoto] = useState<boolean>(true)
  const [busqueda, setBusqueda] = useState<string>('')

  // Estados de diseño PDF
  const [tituloCatalogo, setTituloCatalogo] = useState<string>('Catálogo IDOL NAVY Septiembre 2026')
  const [layout, setLayout] = useState<'3x3' | '4x3' | '3x2'>('3x2')
  const [mostrarPrecios, setMostrarPrecios] = useState<boolean>(false)
  const [mostrarStock, setMostrarStock] = useState<boolean>(false)

  // Estado de datos y generación
  const [productos, setProductos] = useState<ProductoPdfCatalog[]>([])
  const [totalProductos, setTotalProductos] = useState<number>(0)
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [progresoTexto, setProgresoTexto] = useState<string>('')
  const [progresoPorcentaje, setProgresoPorcentaje] = useState<number>(0)

  // Actualizar título sugerido según género con Mes y Año
  useEffect(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const d = new Date()
    const mesAnio = `${meses[d.getMonth()]} ${d.getFullYear()}`

    if (generoSeleccionado === '1') setTituloCatalogo(`Catálogo Dama IDOL NAVY ${mesAnio}`)
    else if (generoSeleccionado === '2') setTituloCatalogo(`Catálogo Caballero IDOL NAVY ${mesAnio}`)
    else if (generoSeleccionado === 'infantil' || generoSeleccionado === '4' || generoSeleccionado === '5') {
      setTituloCatalogo(`Catálogo Infantil IDOL NAVY ${mesAnio}`)
    } else {
      setTituloCatalogo(`Catálogo IDOL NAVY ${mesAnio}`)
    }
  }, [generoSeleccionado])

  // Cargar vista previa y conteo en tiempo real
  const cargarVistaPrevia = async () => {
    setIsLoadingPreview(true)
    try {
      const res = await fetchProductosParaCatalogoPdfAction({
        generoId: generoSeleccionado,
        tiposPrendaIds: tiposSeleccionados.length > 0 ? tiposSeleccionados : undefined,
        soloConStock,
        soloPublicados,
        soloConFoto,
        busqueda,
      })
      setProductos(res.productos)
      setTotalProductos(res.total)
    } catch (err) {
      console.error('Error al cargar productos para PDF:', err)
      toast.error('Error al consultar productos para el catálogo.')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      cargarVistaPrevia()
    }
  }, [
    isOpen,
    generoSeleccionado,
    tiposSeleccionados,
    soloConStock,
    soloPublicados,
    soloConFoto,
    busqueda,
  ])

  // Toggle de tipos de prenda
  const toggleTipoPrenda = (id: number) => {
    setTiposSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const selectAllTipos = () => {
    if (tiposSeleccionados.length === tiposPrenda.length) {
      setTiposSeleccionados([])
    } else {
      setTiposSeleccionados(tiposPrenda.map((t) => t.id))
    }
  }

  // Generar y descargar PDF
  const handleDescargarPdf = async () => {
    if (productos.length === 0) {
      toast.warning('No hay productos que coincidan con los filtros seleccionados.')
      return
    }

    setIsGenerating(true)
    setProgresoPorcentaje(0)
    setProgresoTexto('Iniciando generador de catálogo...')

    try {
      await generarCatalogoPdf(productos, {
        tituloCatalogo,
        subtitulo: soloConStock ? 'Productos con existencias disponibles en almacén' : 'Catálogo promocional',
        layout,
        mostrarPrecios,
        mostrarStock,
        mostrarMarca: true,
        onProgress: (porcentaje, texto) => {
          setProgresoPorcentaje(porcentaje)
          setProgresoTexto(texto)
        },
      })
      toast.success('¡Catálogo PDF generado y descargado correctamente!')
    } catch (err: any) {
      console.error('Error generando PDF:', err)
      toast.error(err?.message || 'Ocurrió un error al generar el PDF.')
    } finally {
      setIsGenerating(false)
      setProgresoPorcentaje(0)
      setProgresoTexto('')
    }
  }

  const itemsPorHoja = layout === '4x3' ? 12 : layout === '3x2' ? 6 : 9
  const hojasEstimadas = Math.ceil(totalProductos / itemsPorHoja)

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className="bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-black text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <FileText className="h-4 w-4 text-white shrink-0" />
        <span>CATÁLOGO PDF</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-full sm:max-w-[85vw] md:max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-card border border-border">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>Generar Catálogo PDF Personalizado</span>
                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200">
                  Exportación HD
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Filtra por género, prendas y existencias para descargar un catálogo con fotos nítidas y descripción completa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3 text-xs">
          {/* 1. SELECCIÓN DE GÉNERO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-rose-600" />
              <span>1. Género o Línea</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              {OPCIONES_GENERO.map((g) => {
                const isSelected = generoSeleccionado === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGeneroSeleccionado(g.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl font-semibold text-xs border transition-all text-center",
                      isSelected
                        ? "bg-rose-700 text-white border-rose-700 shadow-xs"
                        : "bg-card hover:bg-muted text-foreground border-border"
                    )}
                  >
                    <span>{g.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. SELECCIÓN DE TIPOS DE PRENDA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-rose-600" />
                <span>2. Tipos de Prenda ({tiposSeleccionados.length === 0 ? 'Todos' : `${tiposSeleccionados.length} seleccionados`})</span>
              </Label>
              <button
                type="button"
                onClick={selectAllTipos}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                {tiposSeleccionados.length === tiposPrenda.length ? 'Desmarcar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-muted/40 border border-border">
              {tiposPrenda.map((t) => {
                const isSelected = tiposSeleccionados.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTipoPrenda(t.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5",
                      isSelected
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-card/80"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    <span>{t.nombre}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. FILTROS DE DISPONIBILIDAD Y FOTOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Stock al menos 1 caja */}
            <div
              onClick={() => setSoloConStock(!soloConStock)}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5",
                soloConStock
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200"
                  : "bg-card border-border hover:bg-muted text-muted-foreground"
              )}
            >
              <Boxes className={cn("h-4 w-4 mt-0.5 shrink-0", soloConStock ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
              <div>
                <span className="font-bold text-xs block">Solo con Stock (≥ 1 caja)</span>
                <span className="text-[11px] opacity-80 block">
                  Excluye modelos agotados en inventario global.
                </span>
              </div>
            </div>

            {/* Solo publicados en e-commerce */}
            <div
              onClick={() => setSoloPublicados(!soloPublicados)}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5",
                soloPublicados
                  ? "bg-violet-500/10 border-violet-500/40 text-violet-950 dark:text-violet-200"
                  : "bg-card border-border hover:bg-muted text-muted-foreground"
              )}
            >
              <Eye className={cn("h-4 w-4 mt-0.5 shrink-0", soloPublicados ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground")} />
              <div>
                <span className="font-bold text-xs block">Solo Publicados en Tienda</span>
                <span className="text-[11px] opacity-80 block">
                  {soloPublicados ? 'Activos en e-commerce' : 'Todos los productos registrados'}
                </span>
              </div>
            </div>

            {/* Solo con fotografía */}
            <div
              onClick={() => setSoloConFoto(!soloConFoto)}
              className={cn(
                "p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5",
                soloConFoto
                  ? "bg-blue-500/10 border-blue-500/40 text-blue-950 dark:text-blue-200"
                  : "bg-card border-border hover:bg-muted text-muted-foreground"
              )}
            >
              <Sparkles className={cn("h-4 w-4 mt-0.5 shrink-0", soloConFoto ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground")} />
              <div>
                <span className="font-bold text-xs block">Solo con Fotografía</span>
                <span className="text-[11px] opacity-80 block">
                  Garantiza catálogo visual de alta calidad.
                </span>
              </div>
            </div>
          </div>

          {/* 4. CONFIGURACIÓN DEL FORMATO Y DISEÑO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border">
            {/* Layout de Cuadrícula */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5 text-rose-600" />
                <span>Distribución de Hoja (Grid)</span>
              </Label>
              <div className="space-y-1.5">
                {LAYOUTS.map((lay) => {
                  const isSelected = layout === lay.id
                  return (
                    <div
                      key={lay.id}
                      onClick={() => setLayout(lay.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                        isSelected
                          ? "bg-rose-500/10 border-rose-500/50 text-foreground font-bold"
                          : "bg-card border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <div>
                        <span className="text-xs block font-bold text-foreground">{lay.label}</span>
                        <span className="text-[10px] text-muted-foreground block">{lay.desc}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-rose-600 shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Título y Opciones de Contenido */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Título del Catálogo en el PDF
                </Label>
                <Input
                  type="text"
                  value={tituloCatalogo}
                  onChange={(e) => setTituloCatalogo(e.target.value)}
                  placeholder="Ej: Catálogo Colección Dama 2026"
                  className="rounded-xl text-xs h-9"
                />
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Elementos a Mostrar
                </Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={mostrarPrecios}
                      onChange={(e) => setMostrarPrecios(e.target.checked)}
                      className="rounded border-border text-rose-600 focus:ring-rose-500"
                    />
                    <span>Mostrar precio público ($ MXN)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={mostrarStock}
                      onChange={(e) => setMostrarStock(e.target.checked)}
                      className="rounded border-border text-rose-600 focus:ring-rose-500"
                    />
                    <span>Mostrar stock disponible (ej. 14 cajas)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 5. RESUMEN Y CONTEO EN VIVO */}
          <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isLoadingPreview ? (
                <Loader2 className="h-5 w-5 text-rose-600 animate-spin" />
              ) : (
                <div className="p-2 rounded-lg bg-rose-600 text-white font-bold text-sm">
                  {totalProductos}
                </div>
              )}
              <div>
                <span className="font-bold text-xs text-foreground block">
                  {isLoadingPreview ? 'Calculando productos coincidentes...' : `${totalProductos} productos encontrados`}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Equivale a aproximadamente <strong>~{hojasEstimadas} hojas</strong> en formato {layout}.
                </span>
              </div>
            </div>

            {totalProductos === 0 && !isLoadingPreview && (
              <Badge variant="destructive" className="text-[11px] gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>0 coincidencias con estos filtros</span>
              </Badge>
            )}
          </div>

          {/* BARRA DE PROGRESO DE DESCARGA */}
          {isGenerating && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900 dark:text-rose-200">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                  <span>{progresoTexto}</span>
                </span>
                <span>{progresoPorcentaje}%</span>
              </div>
              <div className="w-full bg-rose-200 dark:bg-rose-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progresoPorcentaje}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isGenerating}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleDescargarPdf}
            disabled={isGenerating || totalProductos === 0 || isLoadingPreview}
            className="bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 px-5 py-2.5 shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generando PDF ({progresoPorcentaje}%)...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Descargar Catálogo PDF ({totalProductos} prendas)</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
