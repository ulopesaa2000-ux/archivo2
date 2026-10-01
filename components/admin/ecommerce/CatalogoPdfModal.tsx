// components/admin/ecommerce/CatalogoPdfModal.tsx
'use client'

import { useState, useEffect, useTransition, useSyncExternalStore } from 'react'
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
  AlertCircle,
  Clock,
  ListChecks,
  X,
  BookOpen
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  fetchProductosParaCatalogoPdfAction,
  type ProductoPdfCatalog,
  type FiltrosPdfCatalog,
} from '@/modules/ecommerce/pdf-catalog-actions'
import { generarCatalogoPdf, type OpcionesGeneracionPdf, type LayoutCatalogoPdf } from '@/lib/utils/pdfCatalogGenerator'
import {
  encolarCatalogoPdf,
  cancelarJobPdf,
  limpiarJobsPdfTerminados,
  suscribirseColaPdf,
  obtenerJobsPdf,
  UMBRAL_COLA_PDF,
} from '@/lib/utils/pdfCatalogQueue'

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

const LAYOUTS: { id: LayoutCatalogoPdf; label: string; desc: string; cols: number; rows: number }[] = [
  { id: '3x3', label: '3 × 3 (9 por hoja)', desc: 'Recomendado · Balance ideal imagen y texto', cols: 3, rows: 3 },
  { id: '4x3', label: '4 × 3 (12 por hoja)', desc: 'Compacto · Mayor densidad de productos', cols: 4, rows: 3 },
  { id: '3x2', label: '3 × 2 (6 por hoja)', desc: 'Detallado · Tarjetas grandes y fotos amplias', cols: 3, rows: 2 },
  { id: '5x3', label: '5 × 3 horizontal (15 por hoja)', desc: 'Catálogo completo · Hoja apaisada, ideal por familias', cols: 5, rows: 3 },
]

export function CatalogoPdfModal({ tiposPrenda, generos }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Estados de filtros
  const [modoCatalogo, setModoCatalogo] = useState<'selectivo' | 'completo'>('selectivo')
  const [generoSeleccionado, setGeneroSeleccionado] = useState<string>('todos')
  const [tiposSeleccionados, setTiposSeleccionados] = useState<number[]>([])
  const [soloConStock, setSoloConStock] = useState<boolean>(true)
  const [soloPublicados, setSoloPublicados] = useState<boolean>(false)
  const [soloConFoto, setSoloConFoto] = useState<boolean>(true)
  const [busqueda, setBusqueda] = useState<string>('')

  // Estados de diseño PDF
  const [tituloCatalogo, setTituloCatalogo] = useState<string>('Catálogo IDOL NAVY Septiembre 2026')
  const [layout, setLayout] = useState<LayoutCatalogoPdf>('3x2')
  const [mostrarPrecios, setMostrarPrecios] = useState<boolean>(false)
  const [mostrarStock, setMostrarStock] = useState<boolean>(false)

  // Cola de generación en segundo plano (sobrevive al cierre del modal)
  const jobs = useSyncExternalStore(suscribirseColaPdf, obtenerJobsPdf)
  const esModoCompleto = modoCatalogo === 'completo'

  // Estado de datos y generación
  const [productos, setProductos] = useState<ProductoPdfCatalog[]>([])
  const [totalProductos, setTotalProductos] = useState<number>(0)
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [progresoTexto, setProgresoTexto] = useState<string>('')
  const [progresoPorcentaje, setProgresoPorcentaje] = useState<number>(0)

  // Orden en modo completo: 'familia' = solo familia A→Z sin importar género
  // (igual que /catalogo/familias, por defecto); 'genero' = línea → familia → SKU.
  const [ordenFamilia, setOrdenFamilia] = useState<'familia' | 'genero'>('familia')

  // Cambiar entre modo selectivo y catálogo completo por familias
  const cambiarModo = (modo: 'selectivo' | 'completo') => {
    setModoCatalogo(modo)
    if (modo === 'completo') {
      // Catálogo completo: hoja horizontal densa, agrupado por familia
      setLayout('5x3')
    } else {
      setLayout('3x2')
    }
  }

  // Actualizar título sugerido según género con Mes y Año
  useEffect(() => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const d = new Date()
    const mesAnio = `${meses[d.getMonth()]} ${d.getFullYear()}`

    if (esModoCompleto) {
      setTituloCatalogo(`Catálogo Completo IDOL NAVY ${mesAnio}`)
      return
    }
    if (generoSeleccionado === '1') setTituloCatalogo(`Catálogo Dama IDOL NAVY ${mesAnio}`)
    else if (generoSeleccionado === '2') setTituloCatalogo(`Catálogo Caballero IDOL NAVY ${mesAnio}`)
    else if (generoSeleccionado === 'infantil' || generoSeleccionado === '4' || generoSeleccionado === '5') {
      setTituloCatalogo(`Catálogo Infantil IDOL NAVY ${mesAnio}`)
    } else {
      setTituloCatalogo(`Catálogo IDOL NAVY ${mesAnio}`)
    }
  }, [generoSeleccionado, esModoCompleto])

  // Cargar vista previa y conteo en tiempo real
  // En modo completo se traen TODOS los activos con y sin foto/stock, ordenados por familia.
  const cargarVistaPrevia = async () => {
    setIsLoadingPreview(true)
    try {
      const res = await fetchProductosParaCatalogoPdfAction({
        generoId: generoSeleccionado,
        tiposPrendaIds: !esModoCompleto && tiposSeleccionados.length > 0 ? tiposSeleccionados : undefined,
        soloConStock: esModoCompleto ? false : soloConStock,
        soloPublicados: esModoCompleto ? false : soloPublicados,
        soloConFoto: esModoCompleto ? false : soloConFoto,
        busqueda: esModoCompleto ? '' : busqueda,
        modoCompleto: esModoCompleto,
        ordenarPorFamilia: esModoCompleto,
        ordenFamilia: esModoCompleto ? ordenFamilia : 'genero',
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
    modoCatalogo,
    ordenFamilia,
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

  // Generar y descargar PDF (directo si es ligero, en cola si es pesado)
  const handleDescargarPdf = async () => {
    if (productos.length === 0) {
      toast.warning('No hay productos que coincidan con los filtros seleccionados.')
      return
    }

    const opcionesBase: Omit<OpcionesGeneracionPdf, 'onProgress' | 'shouldCancel'> = {
      tituloCatalogo,
      subtitulo: esModoCompleto
        ? 'Catálogo completo por familias · Con y sin fotografía'
        : soloConStock
          ? 'Productos con existencias disponibles en almacén'
          : 'Catálogo promocional',
      layout,
      mostrarPrecios,
      mostrarStock,
      mostrarMarca: true,
      agruparPor: esModoCompleto ? 'familia' : 'categoria',
      ordenFamilia: esModoCompleto ? ordenFamilia : 'genero',
    }

    // Catálogos pesados → cola en segundo plano con notificación persistente.
    // El trabajo sobrevive al cierre del modal; el toast avisa al terminar.
    if (productos.length > UMBRAL_COLA_PDF) {
      encolarCatalogoPdf(productos, opcionesBase)
      toast.info(`Catálogo encolado (${productos.length} productos). Te avisaremos al terminar.`)
      return
    }

    setIsGenerating(true)
    setProgresoPorcentaje(0)
    setProgresoTexto('Iniciando generador de catálogo...')

    try {
      const resultado = await generarCatalogoPdf(productos, {
        ...opcionesBase,
        onProgress: (porcentaje, texto) => {
          setProgresoPorcentaje(porcentaje)
          setProgresoTexto(texto)
        },
      })
      if (resultado.sinFoto > 0) {
        toast.warning(
          `PDF descargado, pero ${resultado.sinFoto} de ${resultado.total} fotos no se pudieron optimizar (revisa la consola para ver los SKUs).`
        )
      } else {
        toast.success('¡Catálogo PDF generado y descargado correctamente!')
      }
    } catch (err: any) {
      console.error('Error generando PDF:', err)
      toast.error(err?.message || 'Ocurrió un error al generar el PDF.')
    } finally {
      setIsGenerating(false)
      setProgresoPorcentaje(0)
      setProgresoTexto('')
    }
  }

  const itemsPorHoja = layout === '5x3' ? 15 : layout === '4x3' ? 12 : layout === '3x2' ? 6 : 9
  const hojasEstimadas = Math.ceil(totalProductos / itemsPorHoja)
  const vaACola = totalProductos > UMBRAL_COLA_PDF
  const jobsActivos = jobs.filter((j) => j.estado === 'en-cola' || j.estado === 'procesando')

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
                Modo selectivo con filtros finos, o catálogo completo por familias con y sin foto en hoja horizontal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3 text-xs">
          {/* 0. MODO DE CATÁLOGO */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-rose-600" />
              <span>0. Modo de Catálogo</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => cambiarModo('selectivo')}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all",
                  !esModoCompleto
                    ? "bg-rose-500/10 border-rose-500/50"
                    : "bg-card border-border hover:bg-muted"
                )}
              >
                <span className="text-xs block font-bold text-foreground">Selectivo con filtros</span>
                <span className="text-[10px] text-muted-foreground block">Género, prendas, stock, foto y publicados. Agrupa por categoría.</span>
              </button>
              <button
                type="button"
                onClick={() => cambiarModo('completo')}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all",
                  esModoCompleto
                    ? "bg-rose-500/10 border-rose-500/50"
                    : "bg-card border-border hover:bg-muted"
                )}
              >
                <span className="text-xs block font-bold text-foreground">Completo por familias</span>
                <span className="text-[10px] text-muted-foreground block">Todos los activos, con y sin foto. Orden por familia o por línea (tú eliges). Solo pides título, precio y stock.</span>
              </button>
            </div>
          </div>

          {/* Orden de familias (solo modo completo) */}
          {esModoCompleto && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5 text-rose-600" />
                <span>Orden de las familias</span>
              </Label>
              <div className="flex bg-muted p-0.5 rounded-xl text-xs gap-0.5">
                <button
                  type="button"
                  onClick={() => setOrdenFamilia('familia')}
                  className={cn(
                    "flex-1 px-2.5 py-2 rounded-lg transition-all font-semibold text-center",
                    ordenFamilia === 'familia'
                      ? "bg-rose-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Por familia A→Z (como en Familias)
                </button>
                <button
                  type="button"
                  onClick={() => setOrdenFamilia('genero')}
                  className={cn(
                    "flex-1 px-2.5 py-2 rounded-lg transition-all font-semibold text-center",
                    ordenFamilia === 'genero'
                      ? "bg-rose-700 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Por línea → familia → SKU
                </button>
              </div>
            </div>
          )}

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

          {/* 2. SELECCIÓN DE TIPOS DE PRENDA (solo modo selectivo) */}
          {!esModoCompleto && (
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
          )}

          {/* 3. FILTROS DE DISPONIBILIDAD Y FOTOS (solo modo selectivo; el completo incluye todo) */}
          {!esModoCompleto && (
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
          )}

          {esModoCompleto && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/40 text-blue-950 dark:text-blue-200 text-[11px] flex items-start gap-2">
              <ListChecks className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>Modo completo:</strong> incluye todos los productos activos de la línea elegida,
                <strong> con y sin fotografía y con y sin stock</strong>, agrupados por familia.
                Solo configura título, precio y stock.
              </span>
            </div>
          )}

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
                      onClick={() => setLayout(lay.id)}
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
                  Equivale a aproximadamente <strong>~{hojasEstimadas} hojas</strong> en formato {layout}
                  {layout === '5x3' ? ' horizontal' : ''}{esModoCompleto ? (ordenFamilia === 'familia' ? ' · por familia A→Z' : ' · por línea → familia') : ''}.
                </span>
                {vaACola && !isLoadingPreview && totalProductos > 0 && (
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Catálogo pesado (+{UMBRAL_COLA_PDF}): se generará en cola en segundo plano con aviso al terminar.</span>
                  </span>
                )}
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

          {/* COLA DE GENERACIÓN EN SEGUNDO PLANO */}
          {jobs.length > 0 && (
            <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-rose-600" />
                  <span>Cola de generación ({jobsActivos.length} activos)</span>
                </span>
                <button
                  type="button"
                  onClick={limpiarJobsPdfTerminados}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Limpiar terminados
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Los trabajos siguen aunque cierres este diálogo. No recargues ni cierres la pestaña hasta que terminen.
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {jobs.map((job) => (
                  <div key={job.id} className="p-2 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-foreground truncate">{job.titulo}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            job.estado === 'procesando' && "bg-blue-500/10 text-blue-700 border-blue-500/40",
                            job.estado === 'en-cola' && "bg-amber-500/10 text-amber-700 border-amber-500/40",
                            job.estado === 'completado' && "bg-emerald-500/10 text-emerald-700 border-emerald-500/40",
                            job.estado === 'fallido' && "bg-red-500/10 text-red-700 border-red-500/40",
                            job.estado === 'cancelado' && "bg-muted text-muted-foreground"
                          )}
                        >
                          {job.estado === 'en-cola' ? 'En cola' : job.estado === 'procesando' ? `${job.progreso}%` : job.estado}
                        </Badge>
                        {(job.estado === 'en-cola' || job.estado === 'procesando') && (
                          <button
                            type="button"
                            onClick={() => cancelarJobPdf(job.id)}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Cancelar trabajo"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {job.total} productos · {job.layout}{job.layout === '5x3' ? ' horizontal' : ''} · {job.texto}
                      {job.estado === 'completado' && job.resultado && ` · ${job.resultado.paginas} páginas`}
                    </div>
                    {(job.estado === 'en-cola' || job.estado === 'procesando') && (
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className="bg-rose-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${job.progreso}%` }}
                        />
                      </div>
                    )}
                    {job.estado === 'fallido' && job.error && (
                      <div className="text-[10px] text-red-600 mt-0.5">{job.error}</div>
                    )}
                  </div>
                ))}
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
            ) : vaACola ? (
              <>
                <Clock className="h-4 w-4" />
                <span>Encolar catálogo ({totalProductos} prendas)</span>
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
